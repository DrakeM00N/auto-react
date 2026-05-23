const express = require('express')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')
const { HOLD_MINUTES } = require('../services/seats')

const router = express.Router()

const tripValidators = [
  body('routeId').isInt({ min: 1 }).withMessage('routeId must be a positive integer'),
  body('date').isISO8601({ strict: true }).withMessage('date must be ISO 8601 (YYYY-MM-DD)'),
  body('time').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('time must be HH:MM'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('seats').isInt({ min: 1, max: 100 }).withMessage('seats must be between 1 and 100'),
]

function rejectInvalid(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return true
  }
  return false
}

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
      bookedCount: Number(trip.booked_count),
    }))

    res.json(trips)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/trips  (тільки адмін)
router.post('/', adminMiddleware, tripValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const { routeId, date, time, price, seats } = req.body
    const result = await db.execute({
      sql: 'INSERT INTO trips (route_id, date, time, price, seats) VALUES (?, ?, ?, ?, ?)',
      args: [routeId, date, time, price, seats],
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
      bookedCount: Number(trip.booked_count),
    })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/trips/:id  (тільки адмін)
router.put('/:id', adminMiddleware, tripValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
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
      bookedCount: Number(trip.booked_count),
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
