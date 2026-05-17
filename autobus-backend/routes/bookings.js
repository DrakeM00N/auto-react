const express = require('express')
const { db } = require('../db')
const { authMiddleware, adminMiddleware } = require('../middleware')

const router = express.Router()

// POST /api/bookings  (можна без авторизації)
router.post('/', async (req, res) => {
  try {
    const { tripId, passengerName, passengerPhone, boardingPoint = '', alightingPoint = '' } = req.body

    if (!tripId || !passengerName || !passengerPhone) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    // Перевіряємо чи є вільні місця
    const tripRes = await db.execute({ sql: 'SELECT * FROM trips WHERE id = ?', args: [tripId] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    const bookingsRes = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM bookings WHERE trip_id = ?', args: [tripId] })
    const booked = bookingsRes.rows[0].cnt
    if (booked >= trip.seats) {
      return res.status(400).json({ error: 'Місць немає' })
    }

    // Визначаємо userId з токена якщо є
    let resolvedUserId = null
    const header = req.headers.authorization
    if (header && header.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken')
        const user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'autobus-secret-key')
        resolvedUserId = user.id
      } catch (err) {
        console.warn('JWT verification failed:', err.message)
        // Continue with resolvedUserId = null (guest booking)
      }
    }

    // Ensure string values for text fields to avoid .trim() errors
    const safePassengerName = String(passengerName).trim()
    const safePassengerPhone = String(passengerPhone).trim()
    const safeBoardingPoint = String(boardingPoint).trim()
    const safeAlightingPoint = String(alightingPoint).trim()

    const result = await db.execute({
      sql: 'INSERT INTO bookings (trip_id, user_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?, ?)',
      args: [tripId, resolvedUserId, safePassengerName, safePassengerPhone, safeBoardingPoint, safeAlightingPoint]
    })

    res.json({ success: true, booking: { id: Number(result.lastInsertRowid) } })
  } catch (e) {
    console.error('Error in POST /api/bookings:', e)
    res.status(500).json({ error: 'Помилка сервера', message: e.message })
  }
})

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
