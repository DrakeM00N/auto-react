require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), quiet: true })

const fs = require('node:fs')
const path = require('node:path')

const backendDir = path.resolve(__dirname, '..')
const scheduleDir = path.join(backendDir, 'route-schedules')

// Match db.js's relative SQLite URL regardless of the directory used to launch this script.
process.chdir(backendDir)
const { db } = require('../db')

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function formatStops(raw) {
  const stops = parseJson(raw, [])
  if (!Array.isArray(stops) || stops.length === 0) return '—'
  return stops.map(stop => {
    if (typeof stop === 'string') return stop
    if (!stop || typeof stop !== 'object') return String(stop)
    const name = stop.name || stop.city || 'зупинка'
    const details = [stop.address, stop.time].filter(Boolean).join(', ')
    return details ? `${name} (${details})` : name
  }).join(' → ')
}

function normalizedText(value) {
  return String(value ?? '').trim().toLocaleLowerCase()
}

function identityPart(value) {
  return String(value ?? '').trim()
}

function canonicalDays(value) {
  const parsed = parseJson(value, [])
  if (!Array.isArray(parsed)) return String(value ?? '')
  return [...new Set(parsed.map(day => String(day).trim().toLowerCase()))].sort().join(',')
}

function routeKey(from, to) {
  return `${normalizedText(from)}\u0000${normalizedText(to)}`
}

function duplicateKey(from, to, date, time) {
  return `${routeKey(from, to)}\u0000${identityPart(date)}\u0000${identityPart(time)}`
}

function addToGroups(groups, key, item) {
  const group = groups.get(key) || []
  group.push(item)
  groups.set(key, group)
}

function displayRoute(from, to) {
  return `${valueOrDash(from)} → ${valueOrDash(to)}`
}

async function tableColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`)
  return new Set(result.rows.map(row => row.name))
}

async function tableExists(table) {
  const result = await db.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table],
  })
  return result.rows.length > 0
}

function selectedColumn(columns, alias, name, outputName = name) {
  return columns.has(name) ? `${alias}.${name} AS ${outputName}` : `NULL AS ${outputName}`
}

async function readTrips() {
  if (!(await tableExists('trips')) || !(await tableExists('routes'))) return []
  const tripColumns = await tableColumns('trips')
  const routeColumns = await tableColumns('routes')
  const optionalTripFields = [
    'schedule_id', 'departure_point', 'arrival_point', 'intermediate_stops',
  ].map(name => selectedColumn(tripColumns, 't', name))
  const routeStops = selectedColumn(routeColumns, 'r', 'stops', 'route_stops')
  const result = await db.execute(`
    SELECT t.id, t.route_id, t.date, t.time, t.price, t.seats,
      ${optionalTripFields.join(',\n      ')},
      ${routeStops},
      r.from_city, r.to_city
    FROM trips t
    LEFT JOIN routes r ON r.id = t.route_id
    ORDER BY t.date, t.time, t.id
  `)
  return result.rows
}

async function readSchedules() {
  if (!(await tableExists('route_schedules')) || !(await tableExists('routes'))) return []
  const scheduleColumns = await tableColumns('route_schedules')
  const result = await db.execute(`
    SELECT s.id, s.route_id, s.days_of_week, s.departure_time, s.price, s.seats,
      ${selectedColumn(scheduleColumns, 's', 'active')},
      ${selectedColumn(scheduleColumns, 's', 'valid_from')},
      ${selectedColumn(scheduleColumns, 's', 'valid_until')},
      ${selectedColumn(scheduleColumns, 's', 'stops')},
      r.from_city, r.to_city
    FROM route_schedules s
    LEFT JOIN routes r ON r.id = s.route_id
    ORDER BY r.from_city, r.to_city, s.departure_time, s.id
  `)
  return result.rows
}

function printTrips(trips) {
  console.log('\n=== Рейсы ===')
  if (!trips.length) {
    console.log('Записей нет.')
    return
  }
  for (const trip of trips) {
    const kind = trip.schedule_id === null || trip.schedule_id === undefined
      ? 'ручной'
      : `из расписания #${trip.schedule_id}`
    const stops = trip.intermediate_stops || trip.route_stops
    console.log(
      `#${trip.id} | ${displayRoute(trip.from_city, trip.to_city)} | ` +
      `${valueOrDash(trip.date)} ${valueOrDash(trip.time)} | ` +
      `${valueOrDash(trip.price)} грн | ${valueOrDash(trip.seats)} мест | ` +
      `${kind} | остановки: ${formatStops(stops)}`,
    )
  }
}

function printSchedules(schedules) {
  console.log('\n=== route_schedules ===')
  if (!schedules.length) {
    console.log('Записей нет.')
    return
  }
  for (const schedule of schedules) {
    console.log(
      `#${schedule.id} | ${displayRoute(schedule.from_city, schedule.to_city)} | ` +
      `дни: ${valueOrDash(schedule.days_of_week)} | выезд: ${valueOrDash(schedule.departure_time)} | ` +
      `${valueOrDash(schedule.price)} грн | ${valueOrDash(schedule.seats)} мест | ` +
      `active: ${valueOrDash(schedule.active)} | ` +
      `validFrom: ${valueOrDash(schedule.valid_from)} | ` +
      `validUntil: ${valueOrDash(schedule.valid_until)} | ` +
      `остановки: ${formatStops(schedule.stops)}`,
    )
  }
}

function printExceptions(exceptions, exists) {
  console.log('\n=== schedule_exceptions ===')
  if (!exists) {
    console.log('Таблица отсутствует.')
    return
  }
  if (!exceptions.length) {
    console.log('Записей нет.')
    return
  }
  for (const exception of exceptions) {
    console.log(
      `#${exception.id} | расписание #${exception.schedule_id} | ` +
      `${valueOrDash(exception.date)} | действие: ${valueOrDash(exception.action)}`,
    )
  }
}

function printDuplicates(trips, schedules) {
  console.log('\n=== Возможные дубли ===')

  const tripGroups = new Map()
  for (const trip of trips) {
    addToGroups(
      tripGroups,
      duplicateKey(trip.from_city, trip.to_city, trip.date, trip.time),
      trip,
    )
  }
  const duplicateTrips = [...tripGroups.values()].filter(group => group.length > 1)
  console.log('Рейсы с одинаковыми направлением, датой и временем:')
  if (!duplicateTrips.length) console.log('  Не найдены.')
  for (const group of duplicateTrips) {
    console.log(
      `  ${displayRoute(group[0].from_city, group[0].to_city)} ${group[0].date} ${group[0].time}: ` +
      group.map(trip => `#${trip.id}`).join(', '),
    )
  }

  const scheduleGroups = new Map()
  for (const schedule of schedules) {
    const key = [
      routeKey(schedule.from_city, schedule.to_city),
      identityPart(schedule.departure_time),
      canonicalDays(schedule.days_of_week),
    ].join('\u0000')
    addToGroups(scheduleGroups, key, schedule)
  }
  const duplicateSchedules = [...scheduleGroups.values()].filter(group => group.length > 1)
  console.log('Расписания с одинаковыми направлением, временем и днями:')
  if (!duplicateSchedules.length) console.log('  Не найдены.')
  for (const group of duplicateSchedules) {
    console.log(
      `  ${displayRoute(group[0].from_city, group[0].to_city)} ${group[0].departure_time} ` +
      `[${group[0].days_of_week}]: ${group.map(schedule => `#${schedule.id}`).join(', ')}`,
    )
  }

  const manualGenerated = []
  for (const group of tripGroups.values()) {
    const manual = group.filter(trip => trip.schedule_id === null || trip.schedule_id === undefined)
    const generated = group.filter(trip => trip.schedule_id !== null && trip.schedule_id !== undefined)
    if (manual.length && generated.length) manualGenerated.push({ manual, generated })
  }
  console.log('Ручные рейсы, совпадающие с рейсами из расписаний:')
  if (!manualGenerated.length) console.log('  Не найдены.')
  for (const match of manualGenerated) {
    const trip = match.manual[0]
    console.log(
      `  ${displayRoute(trip.from_city, trip.to_city)} ${trip.date} ${trip.time}: ` +
      `ручные ${match.manual.map(item => `#${item.id}`).join(', ')}; ` +
      `из расписания ${match.generated.map(item => `#${item.id} (schedule #${item.schedule_id})`).join(', ')}`,
    )
  }
}

function getScheduleIdentity(schedule) {
  if (!schedule || typeof schedule !== 'object') return null
  const days = Array.isArray(schedule.days)
    ? canonicalDays(JSON.stringify(schedule.days))
    : ''
  return `${identityPart(schedule.departure)}\u0000${days}`
}

function printScheduleFiles(schedules) {
  console.log('\n=== Файлы route-schedules/ и совпадения с БД ===')
  if (!fs.existsSync(scheduleDir)) {
    console.log('Папка route-schedules/ отсутствует.')
    return
  }
  const files = fs.readdirSync(scheduleDir).filter(file => file.endsWith('.json')).sort()
  if (!files.length) {
    console.log('JSON-файлов нет.')
    return
  }

  for (const file of files) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(scheduleDir, file), 'utf8'))
      const routeSchedules = schedules.filter(schedule =>
        normalizedText(schedule.from_city) === normalizedText(config.from) &&
        normalizedText(schedule.to_city) === normalizedText(config.to),
      )
      const matchedIds = []
      for (const definition of Array.isArray(config.schedules) ? config.schedules : []) {
        const identity = getScheduleIdentity(definition)
        const match = routeSchedules.find(schedule =>
          `${identityPart(schedule.departure_time)}\u0000${canonicalDays(schedule.days_of_week)}` === identity,
        )
        if (match) matchedIds.push(match.id)
      }
      const total = Array.isArray(config.schedules) ? config.schedules.length : 0
      const uniqueIds = [...new Set(matchedIds)]
      console.log(
        `${file}: совпало ${matchedIds.length}/${total} расписаний` +
        (uniqueIds.length ? ` (route_schedules id: ${uniqueIds.join(', ')})` : ''),
      )
    } catch (error) {
      console.log(`${file}: не удалось прочитать JSON (${error.message})`)
    }
  }
  console.log('Совпадение определяется по направлению, времени и дням; источник записи в БД отдельно не сохраняется.')
}

async function main() {
  const trips = await readTrips()
  const schedules = await readSchedules()
  const hasExceptions = await tableExists('schedule_exceptions')
  const exceptions = hasExceptions
    ? (await db.execute(`
      SELECT id, schedule_id, date, action
      FROM schedule_exceptions
      ORDER BY date, schedule_id, id
    `)).rows
    : []

  console.log('Отчёт сформирован только чтением; скрипт не запускает миграции и не пишет в БД.')
  printTrips(trips)
  printSchedules(schedules)
  printExceptions(exceptions, hasExceptions)
  printDuplicates(trips, schedules)
  printScheduleFiles(schedules)
}

main().catch(error => {
  console.error(`Не удалось прочитать расписания: ${error.message}`)
  process.exitCode = 1
}).finally(async () => {
  await db.close()
})
