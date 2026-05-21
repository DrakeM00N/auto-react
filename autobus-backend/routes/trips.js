const express = require('express')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')
const { HOLD_MINUTES } = require('../services/seats')

const router = express.Router()

// Occupied seats = confirmed bookings + still-valid payment holds.
const OCCUPIED_EXPR = `
  (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id) +
  (SELECT COUNT(*) FROM pending_bookings p
     WHERE p.trip_id = t.id AND p.booking_id IS NULL
       AND p.created_at > datetime('now', '-${HOLD_MINUTES} minutes'))
`

function mapTrip(trip) {
  return {
    id: trip.id,
    routeId: trip.route_id,
    date: trip.date,
    time: trip.time,
    price: trip.price,
    seats: trip.seats,
    // Array of placeholder ids kept for frontend compatibility (length = seats taken).
    bookedSeats: Array(Number(trip.booked_count)).fill(0).map((_, i) => i + 1),
  }
}

async function getTripById(id) {
  const res = await db.execute({
    sql: `SELECT t.*, (${OCCUPIED_EXPR}) AS booked_count FROM trips t WHERE t.id = ?`,
    args: [id],
  })
  return res.rows[0] ? mapTrip(res.rows[0]) : null
}

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const tripsRes = await db.execute(
      `SELECT t.*, (${OCCUPIED_EXPR}) AS booked_count FROM trips t ORDER BY t.date, t.time`
    )
    res.json(tripsRes.rows.map(mapTrip))
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
      args: [routeId, date, time, price, seats],
    })
    res.json(await getTripById(Number(result.lastInsertRowid)))
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
      args: [routeId, date, time, price, seats, req.params.id],
    })
    res.json(await getTripById(req.params.id))
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
