const assert = require('node:assert/strict')
const test = require('node:test')

process.env.DATABASE_URL = 'file::memory:?cache=shared'
process.env.JWT_SECRET = 'schedule-sync-test-secret'

const { db, initDB } = require('../db')
const { generateUpcomingTrips, todayInKyiv } = require('../services/scheduleGenerator')

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

test('preserves manual bus model and skips past trips during schedule sync', async () => {
  await initDB({ seed: false })

  const today = todayInKyiv()
  const pastDate = formatDate(addDays(today, -1))
  const futureDate = formatDate(addDays(today, 1))

  const route = await db.execute({
    sql: `INSERT INTO routes (from_city, to_city, distance, duration, stops)
      VALUES (?, ?, ?, ?, ?)`,
    args: ['Тестове місто', 'Інше місто', '', '', '[]'],
  })
  const routeId = Number(route.lastInsertRowid)

  const schedule = await db.execute({
    sql: `INSERT INTO route_schedules
      (route_id, days_of_week, departure_time, seats, price, departure_point,
       arrival_point, bus_model, carrier, amenities, stops, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      routeId,
      JSON.stringify(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
      '10:00',
      40,
      100,
      'Оновлена точка',
      'Точка прибуття',
      'Нова модель з розкладу',
      'Тестовий перевізник',
      '[]',
      JSON.stringify([
        { name: 'Тестове місто', address: 'Стара адреса', offsetMin: 0 },
        { name: 'Інше місто', address: 'Кінцева адреса', offsetMin: 60 },
      ]),
      1,
    ],
  })
  const scheduleId = Number(schedule.lastInsertRowid)

  const insertTrip = async (date, busModel, departurePoint) => {
    await db.execute({
      sql: `INSERT INTO trips
        (route_id, date, time, price, seats, departure_point, arrival_point,
         bus_model, carrier, amenities, intermediate_stops, schedule_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        routeId,
        date,
        '10:00',
        100,
        40,
        departurePoint,
        'Стара точка прибуття',
        busModel,
        'Старий перевізник',
        '[]',
        '[]',
        scheduleId,
      ],
    })
  }

  await insertTrip(pastDate, 'Модель минулого рейсу', 'Стара точка минулого рейсу')
  await insertTrip(futureDate, 'Модель, встановлена вручну', 'Стара точка майбутнього рейсу')

  await generateUpcomingTrips(60)

  const trips = await db.execute({
    sql: `SELECT date, bus_model, departure_point
      FROM trips
      WHERE schedule_id = ? AND date IN (?, ?)
      ORDER BY date`,
    args: [scheduleId, pastDate, futureDate],
  })

  assert.equal(trips.rows.length, 2)
  assert.deepEqual(trips.rows[0], {
    date: pastDate,
    bus_model: 'Модель минулого рейсу',
    departure_point: 'Стара точка минулого рейсу',
  })
  assert.deepEqual(trips.rows[1], {
    date: futureDate,
    bus_model: 'Модель, встановлена вручну',
    departure_point: 'Оновлена точка',
  })
})
