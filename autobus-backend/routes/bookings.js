const express = require('express')
const { db } = require('../db')
const { authMiddleware, adminMiddleware } = require('../middleware')

const router = express.Router()

// Bookings are created only by a confirmed monobank payment — see
// services/ticketing.js (issueTicket). There is no direct create endpoint.

// GET /api/bookings/my  (тільки авторизований)
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
    })))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/bookings  (тільки адмін — всі бронювання)
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
    })))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/bookings/:id  (редагування власного бронювання)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
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
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /api/bookings/:id  (скасування)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingRes = await db.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [req.params.id] })
    const booking = bookingRes.rows[0]
    if (!booking) return res.status(404).json({ error: 'Бронювання не знайдено' })

    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Немає доступу' })
    }

    await db.execute({ sql: 'DELETE FROM bookings WHERE id = ?', args: [req.params.id] })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router