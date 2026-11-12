const { db } = require('../db')

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MINUTES_PER_DAY = 24 * 60
const BATCH_SIZE = 100

// formatDate, todayInKyiv, addDays, calculateTimeline, parseJson — без изменений

async function runBatched(statements) {
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await db.batch(statements.slice(i, i + BATCH_SIZE), 'write')
  }
}

function buildTripData(schedule, stops, date) {
  const { timeline, arrivalDate, arrivalTime } = calculateTimeline(date, schedule.departure_time, stops)
  const intermediateStops = stops.map((stop, index) => ({
    name: stop.name || stop.city,
    address: stop.address || '',
    time: timeline[index].time,
  }))
  return {
    arrivalDate,
    arrivalTime,
    departurePoint: schedule.departure_point || null,
    arrivalPoint: schedule.arrival_point || null,
    carrier: schedule.carrier || null,
    amenities: JSON.stringify(parseJson(schedule.amenities, [])),
    intermediateStops: JSON.stringify(intermediateStops),
    stopsTimeline: JSON.stringify(timeline),
  }
}

// Возвращает UPDATE только для рейсов, у которых данные реально отличаются
function buildSyncStatements(schedule, stops, trips) {
  const statements = []
  for (const trip of trips) {
    if (trip.time !== schedule.departure_time) continue // рейс, сдвинутый админом
    const d = buildTripData(schedule, stops, new Date(`${trip.date}T00:00:00Z`))
    const unchanged =
      trip.arrival_date === d.arrivalDate &&
      trip.arrival_time === d.arrivalTime &&
      (trip.departure_point ?? null) === d.departurePoint &&
      (trip.arrival_point ?? null) === d.arrivalPoint &&
      (trip.carrier ?? null) === d.carrier &&
      trip.amenities === d.amenities &&
      trip.intermediate_stops === d.intermediateStops &&
      trip.stops_timeline === d.stopsTimeline
    if (unchanged) continue

    statements.push({
      sql: `UPDATE trips
        SET arrival_date = ?, arrival_time = ?,
          departure_point = ?, arrival_point = ?, carrier = ?,
          amenities = ?, intermediate_stops = ?, stops_timeline = ?
        WHERE id = ? AND schedule_id = ?`,
      args: [
        d.arrivalDate, d.arrivalTime, d.departurePoint, d.arrivalPoint, d.carrier,
        d.amenities, d.intermediateStops, d.stopsTimeline,
        trip.id, schedule.id,
      ],
    })
  }
  return statements
}

async function generateUpcomingTrips(daysAhead = 60) {
  if (!Number.isInteger(daysAhead) || daysAhead < 0) {
    throw new Error('daysAhead must be a non-negative integer')
  }

  const today = formatDate(todayInKyiv())

  // 4 запроса вместо тысяч
  const [schedulesResult, exceptionsResult, futureTripsResult, latestResult] = await Promise.all([
    db.execute(`
      SELECT id, route_id, days_of_week, departure_time, seats, price, departure_point,
        arrival_point, bus_model, carrier, amenities, stops, valid_from, valid_until
      FROM route_schedules WHERE active = 1
    `),
    db.execute(`SELECT schedule_id, date FROM schedule_exceptions WHERE action = 'cancel'`),
    db.execute({
      sql: `SELECT id, schedule_id, date, time, arrival_date, arrival_time, departure_point,
              arrival_point, carrier, amenities, intermediate_stops, stops_timeline
            FROM trips WHERE schedule_id IS NOT NULL AND date >= ?`,
      args: [today],
    }),
    db.execute(`SELECT schedule_id, MAX(date) AS latest_date FROM trips
                WHERE schedule_id IS NOT NULL GROUP BY schedule_id`),
  ])

  const cancelled = new Set(exceptionsResult.rows.map(r => `${r.schedule_id}:${r.date}`))
  const latestBySchedule = new Map(latestResult.rows.map(r => [r.schedule_id, r.latest_date]))
  const tripsBySchedule = new Map()
  for (const trip of futureTripsResult.rows) {
    if (!tripsBySchedule.has(trip.schedule_id)) tripsBySchedule.set(trip.schedule_id, [])
    tripsBySchedule.get(trip.schedule_id).push(trip)
  }

  const horizonDate = addDays(todayInKyiv(), daysAhead)
  const statements = []
  let created = 0

  for (const schedule of schedulesResult.rows) {
    const days = parseJson(schedule.days_of_week, [])
    const stops = parseJson(schedule.stops, [])
    if (!Array.isArray(days) || !Array.isArray(stops) || stops.length === 0) continue

    statements.push(...buildSyncStatements(schedule, stops, tripsBySchedule.get(schedule.id) || []))

    const latestDate = latestBySchedule.get(schedule.id)
    const startDate = latestDate ? addDays(new Date(`${latestDate}T00:00:00Z`), 1) : todayInKyiv()

    for (let date = startDate; date <= horizonDate; date = addDays(date, 1)) {
      const dateString = formatDate(date)
      if (!days.includes(DAY_NAMES[date.getUTCDay()])) continue
      if (schedule.valid_from && dateString < schedule.valid_from) continue
      if (schedule.valid_until && dateString > schedule.valid_until) continue
      if (cancelled.has(`${schedule.id}:${dateString}`)) continue

      const d = buildTripData(schedule, stops, date)
      statements.push({
        sql: `INSERT INTO trips
          (route_id, date, time, price, seats, arrival_date, arrival_time,
           departure_point, arrival_point, bus_model, carrier, amenities,
           intermediate_stops, schedule_id, stops_timeline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          schedule.route_id, dateString, schedule.departure_time, schedule.price, schedule.seats,
          d.arrivalDate, d.arrivalTime, d.departurePoint, d.arrivalPoint,
          schedule.bus_model || null, d.carrier, d.amenities,
          d.intermediateStops, schedule.id, d.stopsTimeline,
        ],
      })
      created += 1
    }
  }

  await runBatched(statements)
  return created
}

module.exports = { generateUpcomingTrips, calculateTimeline, todayInKyiv }