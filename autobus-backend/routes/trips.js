const express = require('express')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    // Single query to get all trips with booked count using LEFT JOIN and GROUP BY
    const tripsRes = await db.execute({
      sql: `
        SELECT t.*, COUNT(b.id) as booked_count
        FROM trips t
        LEFT JOIN bookings b ON b.trip_id = t.id
        GROUP BY t.id
        ORDER BY t.date, t.time
      `
    })

    const trips = tripsRes.rows.map(trip => ({
      id: trip.id,
      routeId: trip.route_id,
      date: trip.date,
      time: trip.time,
      price: trip.price,
      seats: trip.seats,
      bookedSeats: Array(trip.booked_count).fill(0).map((_, i) => i + 1), // Create array of booked seat IDs for compatibility
    }))

    res.json(trips)
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

    // Get the created trip with booked count
    const tripRes = await db.execute({
      sql: `
        SELECT t.*, COUNT(b.id) as booked_count
        FROM trips t
        LEFT JOIN bookings b ON b.trip_id = t.id
        WHERE t.id = ?
        GROUP BY t.id
      `,
      args: [result.lastInsertRowid]
    })

    const trip = tripRes.rows[0]
    res.json({
      id: trip.id,
      routeId: trip.route_id,
      date: trip.date,
      time: trip.time,
      price: trip.price,
      seats: trip.seats,
      bookedSeats: Array(trip.booked_count).fill(0).map((_, i) => i + 1),
    })
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

    // Get the updated trip with booked count
    const tripRes = await db.execute({
      sql: `
        SELECT t.*, COUNT(b.id) as booked_count
        FROM trips t
        LEFT JOIN bookings b ON b.trip_id = t.id
        WHERE t.id = ?
        GROUP BY t.id
      `,
      args: [req.params.id]
    })

    const trip = tripRes.rows[0]
    res.json({
      id: trip.id,
      routeId: trip.route_id,
      date: trip.date,
      time: trip.time,
      price: trip.price,
      seats: trip.seats,
      bookedSeats: Array(trip.booked_count).fill(0).map((_, i) => i + 1),
    })
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
