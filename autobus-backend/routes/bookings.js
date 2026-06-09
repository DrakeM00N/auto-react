const express = require('express')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { authMiddleware, adminMiddleware } = require('../middleware')
const { logger } = require('../logger')

const router = express.Router()
const log = logger('bookings')

// POST /api/bookings  (admin only — public bookings go through /api/payments/checkout)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { tripId, userId, passengerName, passengerPhone, boardingPoint, alightingPoint } = req.body

    if (!tripId || !passengerName || !passengerPhone) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    const tripRes = await db.execute({ sql: 'SELECT seats FROM trips WHERE id = ?', args: [tripId] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    const bookingsRes = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM bookings WHERE trip_id = ?', args: [tripId] })
    if (bookingsRes.rows[0].cnt >= trip.seats) {
      return res.status(400).json({ error: 'Місць немає' })
    }

    const safe = (v) => (typeof v === 'string' ? v.trim() : '')
    const result = await db.execute({
      sql: 'INSERT INTO bookings (trip_id, user_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?, ?)',
      args: [tripId, Number.isInteger(userId) ? userId : null, safe(passengerName), safe(passengerPhone), safe(boardingPoint), safe(alightingPoint)]
    })
    const bookingId = Number(result.lastInsertRowid)

    // Defensive seat re-count: shrinks the race window when two admins
    // create the last booking concurrently. Not race-free.
    const recheck = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM bookings WHERE trip_id = ?', args: [tripId] })
    if (recheck.rows[0].cnt > trip.seats) {
      await db.execute({ sql: 'DELETE FROM bookings WHERE id = ?', args: [bookingId] })
      return res.status(400).json({ error: 'Місць немає' })
    }

    res.json({ success: true, booking: { id: bookingId } })
  } catch (e) {
    log.error('POST /api/bookings:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// GET /api/bookings/my  (auth required)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.id]
    })
    res.json(result.rows.map(b => ({
      id: b.id,
      tripId: b.trip_id,
      userId: b.user_id,
      passengerName: b.passenger_name,
      passengerPhone: b.passenger_phone,
      boardingPoint: b.boarding_point,
      alightingPoint: b.alighting_point,
      ticketCode: b.ticket_code,
      createdAt: b.created_at,
      status: b.status,
    })))
  } catch (e) {
    log.error('GET /api/bookings/my:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// GET /api/bookings  (admin — all bookings)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM bookings ORDER BY created_at DESC')
    res.json(result.rows.map(b => ({
      id: b.id,
      tripId: b.trip_id,
      userId: b.user_id,
      passengerName: b.passenger_name,
      passengerPhone: b.passenger_phone,
      boardingPoint: b.boarding_point,
      alightingPoint: b.alighting_point,
      ticketCode: b.ticket_code,
      createdAt: b.created_at,
      status: b.status,
    })))
  } catch (e) {
    log.error('GET /api/bookings:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/bookings/:id  (edit own booking)
router.put('/:id',
  authMiddleware,
  [
    body('passengerName').isString().trim().notEmpty().withMessage('Passenger name is required'),
    body('passengerPhone').isString().trim().notEmpty().withMessage('Passenger phone is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const { passengerName, passengerPhone } = req.body
      const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [req.params.id] })
      const booking = bookingRes.rows[0]
      if (!booking) return res.status(404).json({ error: 'Бронювання не знайдено' })

      if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Немає доступу' })
      }

      await db.execute({
        sql: 'UPDATE bookings SET passenger_name=?, passenger_phone=? WHERE id=?',
        args: [passengerName.trim(), passengerPhone.trim(), req.params.id]
      })
      res.json({ success: true })
    } catch (e) {
      log.error('PUT /api/bookings/:id:', e)
      res.status(500).json({ error: 'Помилка сервера' })
    }
  })

// DELETE /api/bookings/:id  (cancellation)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [req.params.id] })
    const booking = bookingRes.rows[0]
    if (!booking) return res.status(404).json({ error: 'Бронювання не знайдено' })

    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Немає доступу' })
    }

    // Get trip details to check departure time
    const tripRes = await db.execute({ sql: 'SELECT date, time FROM trips WHERE id = ?', args: [booking.trip_id] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    const now = new Date()
    const departure = new Date(`${trip.date}T${trip.time}`)
    const diffHours = (departure - now) / (1000 * 60 * 60)
    if (diffHours < 24 && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Скасування можливе не пізніше ніж за 24 години до відправлення' })
    }

    // Update status to cancelled instead of deleting
    await db.execute({ sql: 'UPDATE bookings SET status = ? WHERE id = ?', args: ['cancelled', req.params.id] })
    res.json({ success: true })
  } catch (e) {
    log.error('DELETE /api/bookings/:id:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
