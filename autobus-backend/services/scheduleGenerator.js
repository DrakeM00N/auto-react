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
      city: stop.name || stop.city,
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

async function syncGeneratedTrips(schedule, stops) {
  const existingTrips = await db.execute({
    sql: 'SELECT id, date FROM trips WHERE schedule_id = ?',
    args: [schedule.id],
  })
  const amenities = parseJson(schedule.amenities, [])

  for (const trip of existingTrips.rows) {
    const tripDate = new Date(`${trip.date}T00:00:00Z`)
    const { timeline, arrivalDate, arrivalTime } = calculateTimeline(
      tripDate,
      schedule.departure_time,
      stops,
    )
    const intermediateStops = stops.map((stop, index) => ({
      name: stop.name || stop.city,
      address: stop.address || '',
      time: timeline[index].time,
    }))

    await db.execute({
      sql: `UPDATE trips
        SET arrival_date = ?, arrival_time = ?,
          departure_point = ?, arrival_point = ?, bus_model = ?, carrier = ?,
          amenities = ?, intermediate_stops = ?, stops_timeline = ?
        WHERE id = ? AND schedule_id = ?`,
      args: [
        arrivalDate,
        arrivalTime,
        schedule.departure_point || null,
        schedule.arrival_point || null,
        schedule.bus_model || null,
        schedule.carrier || null,
        JSON.stringify(amenities),
        JSON.stringify(intermediateStops),
        JSON.stringify(timeline),
        trip.id,
        schedule.id,
      ],
    })
  }
}

async function generateUpcomingTrips(daysAhead = 60) {
  if (!Number.isInteger(daysAhead) || daysAhead < 0) {
    throw new Error('daysAhead must be a non-negative integer')
  }

  const schedulesResult = await db.execute(`
    SELECT id, route_id, days_of_week, departure_time, seats, price, departure_point,
      arrival_point, bus_model, carrier, amenities, stops, valid_from, valid_until
    FROM route_schedules
    WHERE active = 1
  `)
  const exceptionsResult = await db.execute(`
    SELECT schedule_id, date
    FROM schedule_exceptions
    WHERE action = 'cancel'
  `)
  const cancelled = new Set(exceptionsResult.rows.map(row => `${row.schedule_id}:${row.date}`))
  const horizonDate = addDays(todayInKyiv(), daysAhead)
  let created = 0

  for (const schedule of schedulesResult.rows) {
    const days = parseJson(schedule.days_of_week, [])
    const stops = parseJson(schedule.stops, [])
    if (!Array.isArray(days) || !Array.isArray(stops) || stops.length === 0) continue
    await syncGeneratedTrips(schedule, stops)
    const latestResult = await db.execute({
      sql: 'SELECT MAX(date) AS latest_date FROM trips WHERE schedule_id = ?',
      args: [schedule.id],
    })
    const latestDate = latestResult.rows[0]?.latest_date
    const startDate = latestDate ? addDays(new Date(`${latestDate}T00:00:00Z`), 1) : todayInKyiv()
    if (startDate > horizonDate) continue

    for (let date = startDate; date <= horizonDate; date = addDays(date, 1)) {
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
      const intermediateStops = stops.map((stop, index) => ({
        name: stop.name || stop.city,
        address: stop.address || '',
        time: timeline[index].time,
      }))
      const amenities = parseJson(schedule.amenities, [])
      await db.execute({
        sql: `INSERT INTO trips
          (route_id, date, time, price, seats, arrival_date, arrival_time,
           departure_point, arrival_point, bus_model, carrier, amenities,
           intermediate_stops, schedule_id, stops_timeline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          schedule.route_id,
          dateString,
          schedule.departure_time,
          schedule.price,
          schedule.seats,
          arrivalDate,
          arrivalTime,
          schedule.departure_point || null,
          schedule.arrival_point || null,
          schedule.bus_model || null,
          schedule.carrier || null,
          JSON.stringify(amenities),
          JSON.stringify(intermediateStops),
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
