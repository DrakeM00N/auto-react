require('dotenv').config()

const fs = require('node:fs')
const path = require('node:path')
const { db, initDB } = require('../db')

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const SCHEDULE_DIR = path.resolve(__dirname, '..', 'route-schedules')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function normalizeDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    throw new Error('days must be a non-empty array')
  }
  const unique = [...new Set(days)]
  if (unique.some(day => !DAYS.includes(day))) {
    throw new Error(`days must contain only: ${DAYS.join(', ')}`)
  }
  return DAYS.filter(day => unique.includes(day))
}

function normalizeTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('departure must use HH:MM format')
  }
  return value
}

function normalizeDate(value, fieldName) {
  if (value == null) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`)
  }
  return value
}

function normalizeActive(value) {
  if (value === undefined) return 1
  if (typeof value !== 'boolean') {
    throw new Error('active must be a boolean when provided')
  }
  return value ? 1 : 0
}

function normalizeStops(schedule, from, to) {
  if (!Array.isArray(schedule.stops) || schedule.stops.length === 0) {
    throw new Error('stops must be a non-empty array')
  }
  const stops = [
    { name: from, address: '', offsetMin: 0 },
    ...schedule.stops.slice(1, -1).map(stop => ({
      name: String(stop.name || stop.city || '').trim(),
      address: String(stop.address || '').trim(),
      offsetMin: Number(stop.offsetMin),
    })),
    { name: to, address: String(schedule.stops.at(-1).address || '').trim(), offsetMin: Number(schedule.stops.at(-1).offsetMin) },
  ]
  if (stops.some(stop => !stop.name || !Number.isInteger(stop.offsetMin) || stop.offsetMin < 0)) {
    throw new Error('each stop must have a name and non-negative integer offsetMin')
  }
  if (stops.at(-1).offsetMin <= 0) {
    throw new Error('the final stop offsetMin must be greater than zero')
  }
  for (let index = 1; index < stops.length; index += 1) {
    if (stops[index].offsetMin <= stops[index - 1].offsetMin) {
      throw new Error('stop offsetMin values must be strictly ascending')
    }
  }
  return stops
}

async function findOrCreateRoute(from, to) {
  const existing = await db.execute({
    sql: 'SELECT id FROM routes WHERE from_city = ? AND to_city = ? LIMIT 1',
    args: [from, to],
  })
  if (existing.rows[0]) return Number(existing.rows[0].id)

  const created = await db.execute({
    sql: 'INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES (?, ?, ?, ?, ?)',
    args: [from, to, '', '', '[]'],
  })
  return Number(created.lastInsertRowid)
}

async function upsertSchedule(routeId, schedule, from, to) {
  const days = normalizeDays(schedule.days)
  const daysJson = JSON.stringify(days)
  const departureTime = normalizeTime(schedule.departure)
  const seats = Number(schedule.seats)
  const price = Number(schedule.price)
  const active = normalizeActive(schedule.active)
  const amenities = Array.isArray(schedule.amenities) ? schedule.amenities : []
  const allowedAmenities = new Set(['Кондиціонер', 'Wi-Fi', 'Туалет', 'Розетки USB', 'Клімат-контроль', 'Місце для багажу'])
  if (amenities.some(amenity => !allowedAmenities.has(amenity))) {
    throw new Error('amenities contains a value outside AMENITY_CATALOGUE')
  }
  if (!Number.isInteger(seats) || seats < 1) throw new Error('seats must be a positive integer')
  if (!Number.isFinite(price) || price <= 0) throw new Error('price must be positive')
  const stops = normalizeStops(schedule, from, to)
  const validFrom = normalizeDate(schedule.validFrom, 'validFrom')
  const validUntil = normalizeDate(schedule.validUntil, 'validUntil')
  if (validFrom && validUntil && validFrom > validUntil) throw new Error('validFrom cannot be after validUntil')

  const existing = await db.execute({
    sql: 'SELECT id FROM route_schedules WHERE route_id = ? AND departure_time = ? AND days_of_week = ? LIMIT 1',
    args: [routeId, departureTime, daysJson],
  })
  let scheduleId
  if (existing.rows[0]) {
    scheduleId = Number(existing.rows[0].id)
    await db.execute({
      sql: `UPDATE route_schedules
        SET seats = ?, price = ?, departure_point = ?, arrival_point = ?, bus_model = ?,
          carrier = ?, amenities = ?, stops = ?, valid_from = ?, valid_until = ?, active = ?
        WHERE id = ?`,
      args: [
        seats, price, schedule.departurePoint || null, schedule.arrivalPoint || null,
        schedule.busModel || null, schedule.carrier || null, JSON.stringify(amenities),
        JSON.stringify(stops), validFrom, validUntil, active, scheduleId,
      ],
    })
  } else {
    const created = await db.execute({
      sql: `INSERT INTO route_schedules
        (route_id, days_of_week, departure_time, seats, price, departure_point, arrival_point,
         bus_model, carrier, amenities, stops, valid_from, valid_until, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        routeId, daysJson, departureTime, seats, price, schedule.departurePoint || null,
        schedule.arrivalPoint || null, schedule.busModel || null, schedule.carrier || null,
        JSON.stringify(amenities), JSON.stringify(stops), validFrom, validUntil, active,
      ],
    })
    scheduleId = Number(created.lastInsertRowid)
  }

  for (const exception of schedule.exceptions || []) {
    const date = normalizeDate(exception.date, 'exception date')
    if (exception.action !== 'cancel') throw new Error('only cancel exceptions are supported')
    await db.execute({
      sql: `INSERT INTO schedule_exceptions (schedule_id, date, action)
        VALUES (?, ?, ?)
        ON CONFLICT(schedule_id, date) DO UPDATE SET action = excluded.action`,
      args: [scheduleId, date, exception.action],
    })
  }
  return scheduleId
}

async function main() {
  await initDB({ seed: false })
  const files = fs.readdirSync(SCHEDULE_DIR).filter(file => file.endsWith('.json')).sort()
  let importedSchedules = 0
  let importedExceptions = 0

  for (const file of files) {
    const config = readJson(path.join(SCHEDULE_DIR, file))
    if (!config.from || !config.to || !Array.isArray(config.schedules)) {
      throw new Error(`${file}: expected from, to and schedules[]`)
    }
    const routeId = await findOrCreateRoute(config.from, config.to)
    for (const schedule of config.schedules) {
      await upsertSchedule(routeId, schedule, config.from, config.to)
      importedSchedules += 1
      importedExceptions += (schedule.exceptions || []).length
    }
  }

  console.log(`Imported ${importedSchedules} schedule definitions and ${importedExceptions} exceptions from ${files.length} files.`)
}

main().catch(error => {
  console.error(`Schedule import failed: ${error.message}`)
  process.exitCode = 1
})
