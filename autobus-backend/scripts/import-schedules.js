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

function normalizeStops(schedule, from, to) {
  if (!Array.isArray(schedule.stops) || schedule.stops.length === 0) {
    throw new Error('stops must be a non-empty array')
  }
  const stops = [
    { city: from, offsetMin: 0 },
    ...schedule.stops.slice(1, -1).map(stop => ({
      city: String(stop.name || stop.city || '').trim(),
      offsetMin: Number(stop.offsetMin),
    })),
    { city: to, offsetMin: Number(schedule.stops.at(-1).offsetMin) },
  ]
  if (stops.some(stop => !stop.city || !Number.isInteger(stop.offsetMin) || stop.offsetMin < 0)) {
    throw new Error('each stop must have a city/name and non-negative integer offsetMin')
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
        SET seats = ?, price = ?, stops = ?, valid_from = ?, valid_until = ?, active = 1
        WHERE id = ?`,
      args: [seats, price, JSON.stringify(stops), validFrom, validUntil, scheduleId],
    })
  } else {
    const created = await db.execute({
      sql: `INSERT INTO route_schedules
        (route_id, days_of_week, departure_time, seats, price, stops, valid_from, valid_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [routeId, daysJson, departureTime, seats, price, JSON.stringify(stops), validFrom, validUntil],
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
