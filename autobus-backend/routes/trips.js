const express = require('express')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

async function getTripWithSeats(tripId) {
  const tripRes = await db.execute({ sql: 'SELECT * FROM trips WHERE id = ?', args: [tripId] })
  const trip = tripRes.rows[0]
  if (!trip) return null
  const bookingsRes = await db.execute({ sql: 'SELECT id FROM bookings WHERE trip_id = ?', args: [tripId] })
  return {
    id: trip.id,
    routeId: trip.route_id,
    date: trip.date,
    time: trip.time,
    price: trip.price,
    seats: trip.seats,
    bookedSeats: bookingsRes.rows.map(b => b.id),
  }
}

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const tripsRes = await db.execute('SELECT * FROM trips ORDER BY date, time')
    const trips = await Promise.all(tripsRes.rows.map(t => getTripWithSeats(t.id)))
    res.json(trips.filter(Boolean))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/trips  (тільки адмін)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { routeId, date, time, price, seats } = req.body
    if (!routeId || !date || !time || !price || !seats) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }
    const result = await db.execute({
      sql: 'INSERT INTO trips (route_id, date, time, price, seats) VALUES (?, ?, ?, ?, ?)',
      args: [routeId, date, time, price, seats]
    })
    const trip = await getTripWithSeats(Number(result.lastInsertRowid))
    res.json(trip)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/trips/:id  (тільки адмін)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { routeId, date, time, price, seats } = req.body
    await db.execute({
      sql: 'UPDATE trips SET route_id=?, date=?, time=?, price=?, seats=? WHERE id=?',
      args: [routeId, date, time, price, seats, req.params.id]
    })
    const trip = await getTripWithSeats(Number(req.params.id))
    res.json(trip)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /api/trips/:id  (тільки адмін)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM trips WHERE id = ?', args: [req.params.id] })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
