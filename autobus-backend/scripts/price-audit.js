const { createClient } = require('@libsql/client')
const fs = require('node:fs')
const path = require('node:path')

const db = createClient({
  url: process.env.DATABASE_URL || 'file:autobus.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

function distanceKm(value) {
  const match = String(value || '').replace(',', '.').match(/[\d.]+/)
  return match ? Number(match[0]) : null
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function money(value) {
  return `${Number(value).toFixed(2)} грн`
}

async function main() {
  const result = await db.execute(`
    SELECT
      t.id AS trip_id,
      t.date,
      t.time,
      t.price,
      r.id AS route_id,
      r.from_city,
      r.to_city,
      r.distance
    FROM trips t
    JOIN routes r ON r.id = t.route_id
    ORDER BY r.from_city, r.to_city, t.date, t.time
  `)

  const trips = result.rows.map(row => ({
    ...row,
    distanceKm: distanceKm(row.distance),
    pricePerKm: Number(row.price) / distanceKm(row.distance),
    direction: `${row.from_city} → ${row.to_city}`,
  }))
  const globalMedian = median(trips.map(trip => trip.pricePerKm))
  const byDirection = new Map()

  for (const trip of trips) {
    const list = byDirection.get(trip.direction) || []
    list.push(trip)
    byDirection.set(trip.direction, list)
  }

  const anomalies = trips.filter(trip => {
    if (!Number.isFinite(trip.pricePerKm) || !globalMedian) return true
    const directionMedian = median((byDirection.get(trip.direction) || []).map(item => item.price))
    const outsideGlobalCorridor = trip.pricePerKm < globalMedian / 2 || trip.pricePerKm > globalMedian * 2
    const differsFromDirection = directionMedian && (
      trip.price < directionMedian * 0.5 || trip.price > directionMedian * 1.5
    )
    return outsideGlobalCorridor || differsFromDirection
  })

  const lines = [
    '# Аудит цін',
    '',
    `Дата формування: ${new Date().toISOString()}`,
    '',
    'Дані отримані тільки для читання з таблиць `trips` і `routes`. Скрипт не змінює БД.',
    '',
    `Перевірено рейсів: **${trips.length}**`,
    `Медіана ціни за кілометр: **${globalMedian ? `${globalMedian.toFixed(4)} грн/км` : 'н/д'}**`,
    '',
    'Коридор аномалії: менше 50% або більше 200% від загальної медіани ціни/км; для одного напрямку — відхилення ціни більше ніж на 50% від медіани напрямку.',
    '',
    '## Підозрілі рейси',
    '',
  ]

  if (!anomalies.length) {
    lines.push('Аномальних цін за заданими правилами не знайдено.')
  } else {
    lines.push('| Рейс | Дата | Ціна | Відстань | Ціна/км | Причина |')
    lines.push('|---|---:|---:|---:|---:|---|')
    for (const trip of anomalies) {
      const directionMedian = median((byDirection.get(trip.direction) || []).map(item => item.price))
      const reasons = []
      if (trip.pricePerKm < globalMedian / 2 || trip.pricePerKm > globalMedian * 2) reasons.push('ціна/км поза глобальним коридором')
      if (directionMedian && (trip.price < directionMedian * 0.5 || trip.price > directionMedian * 1.5)) reasons.push('розбіжність із напрямком')
      lines.push(`| ${trip.direction} | ${trip.date} ${trip.time} | ${money(trip.price)} | ${trip.distance} | ${trip.pricePerKm.toFixed(4)} | ${reasons.join('; ')} |`)
    }
  }

  const reportPath = path.resolve(__dirname, '..', '..', 'reports', 'price-audit.md')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')
  console.log(`Price audit written to ${reportPath}`)
  for (const trip of anomalies) {
    console.log(`${trip.direction}: ${money(trip.price)} / ${trip.distance} = ${trip.pricePerKm.toFixed(4)} грн/км`)
  }
}

main().catch(error => {
  console.error(`Price audit failed: ${error.message}`)
  process.exitCode = 1
})
