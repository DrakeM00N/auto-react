const { db } = require('../db')

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MINUTES_PER_DAY = 24 * 60

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function todayInKyiv() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(part => [part.type, part.value]))
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function calculateTimeline(date, departureTime, stops) {
  const [hours, minutes] = departureTime.split(':').map(Number)
  const departureMinutes = hours * 60 + minutes
  const timeline = stops.map(stop => {
    const totalMinutes = departureMinutes + Number(stop.offsetMin)
    const dayOffset = Math.floor(totalMinutes / MINUTES_PER_DAY)
    const minuteOfDay = totalMinutes % MINUTES_PER_DAY
    const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`
    return {
      city: stop.city,
      time,
      date: formatDate(addDays(date, dayOffset)),
    }
  })
  const finalStop = timeline.at(-1)
  return { timeline, arrivalDate: finalStop.date, arrivalTime: finalStop.time }
}

function parseJson(raw, fallback) {
  try {
    const value = JSON.parse(raw)
    return value == null ? fallback : value
  } catch {
    return fallback
  }
}

async function generateUpcomingTrips(daysAhead = 60) {
  if (!Number.isInteger(daysAhead) || daysAhead < 0) {
    throw new Error('daysAhead must be a non-negative integer')
  }

  const schedulesResult = await db.execute(`
    SELECT id, route_id, days_of_week, departure_time, seats, price, stops, valid_from, valid_until
    FROM route_schedules
    WHERE active = 1
  `)
  const exceptionsResult = await db.execute(`
    SELECT schedule_id, date
    FROM schedule_exceptions
    WHERE action = 'cancel'
  `)
  const cancelled = new Set(exceptionsResult.rows.map(row => `${row.schedule_id}:${row.date}`))
  const startDate = todayInKyiv()
  let created = 0

  for (const schedule of schedulesResult.rows) {
    const days = parseJson(schedule.days_of_week, [])
    const stops = parseJson(schedule.stops, [])
    if (!Array.isArray(days) || !Array.isArray(stops) || stops.length === 0) continue

    for (let offset = 0; offset <= daysAhead; offset += 1) {
      const date = addDays(startDate, offset)
      const dateString = formatDate(date)
      const weekday = DAY_NAMES[date.getUTCDay()]
      if (!days.includes(weekday)) continue
      if (schedule.valid_from && dateString < schedule.valid_from) continue
      if (schedule.valid_until && dateString > schedule.valid_until) continue
      if (cancelled.has(`${schedule.id}:${dateString}`)) continue

      const existing = await db.execute({
        sql: 'SELECT id FROM trips WHERE schedule_id = ? AND date = ? LIMIT 1',
        args: [schedule.id, dateString],
      })
      if (existing.rows.length > 0) continue

      const { timeline, arrivalDate, arrivalTime } = calculateTimeline(date, schedule.departure_time, stops)
      await db.execute({
        sql: `INSERT INTO trips
          (route_id, date, time, price, seats, arrival_date, arrival_time, schedule_id, stops_timeline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          schedule.route_id,
          dateString,
          schedule.departure_time,
          schedule.price,
          schedule.seats,
          arrivalDate,
          arrivalTime,
          schedule.id,
          JSON.stringify(timeline),
        ],
      })
      created += 1
    }
  }

  return created
}

module.exports = { generateUpcomingTrips, calculateTimeline, todayInKyiv }
