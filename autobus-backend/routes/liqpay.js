const express = require('express')
const crypto = require('crypto')
const { db } = require('../db')

const router = express.Router()

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY
const LIQPAY_SANDBOX = process.env.LIQPAY_SANDBOX === '1'
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL

function liqpaySign(data) {
  return crypto
    .createHash('sha1')
    .update(LIQPAY_PRIVATE_KEY + data + LIQPAY_PRIVATE_KEY)
    .digest('base64')
}

function liqpayData(params) {
  return Buffer.from(JSON.stringify(params)).toString('base64')
}

// POST /api/liqpay/checkout
// Генерує форму для оплати
router.post('/checkout', async (req, res) => {
  try {
    const { tripId, passengerName, passengerPhone, boardingPoint, alightingPoint } = req.body

    const safe = (v) => (typeof v === 'string' ? v.trim() : '')
    const safeName = safe(passengerName)
    const safePhone = safe(passengerPhone)
    const safeBoarding = safe(boardingPoint)
    const safeAlighting = safe(alightingPoint)

    if (!Number.isInteger(tripId) || !safeName || !safePhone) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    const tripRes = await db.execute({ sql: 'SELECT * FROM trips WHERE id = ?', args: [tripId] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    const routeRes = await db.execute({ sql: 'SELECT * FROM routes WHERE id = ?', args: [trip.route_id] })
    const route = routeRes.rows[0]

    // Random suffix — order_id is the only thing protecting PII on the
    // unauthenticated /status endpoint, so it must not be guessable.
    const orderId = `trip_${tripId}_${crypto.randomBytes(16).toString('hex')}`
    const description = `Квиток: ${safeBoarding || route.from_city} → ${safeAlighting || route.to_city} • ${trip.date} ${trip.time} • ${safeName}`

    const params = {
      public_key: LIQPAY_PUBLIC_KEY,
      version: '3',
      action: 'pay',
      amount: trip.price,
      currency: 'UAH',
      description,
      order_id: orderId,
      language: 'uk',
      sandbox: LIQPAY_SANDBOX ? '1' : '0',
      result_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking/success`,
      // Server-to-server webhook. Without this, LiqPay never calls our
      // callback and bookings are never created. Must be publicly reachable.
      ...(PUBLIC_BACKEND_URL ? { server_url: `${PUBLIC_BACKEND_URL}/api/liqpay/callback` } : {}),
    }

    const data = liqpayData(params)
    const signature = liqpaySign(data)

    await db.execute({
      sql: 'INSERT OR REPLACE INTO pending_bookings (order_id, trip_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?, ?)',
      args: [orderId, tripId, safeName, safePhone, safeBoarding, safeAlighting]
    })

    res.json({ data, signature, orderId })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/liqpay/callback
// LiqPay викликає цей URL після оплати
router.post('/callback', async (req, res) => {
  try {
    const { data, signature } = req.body
    const expectedSig = liqpaySign(data)

    if (signature !== expectedSig) {
      return res.status(400).send('Invalid signature')
    }

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
    const { order_id, status, amount, currency } = decoded

    if (status === 'success' || status === 'sandbox') {
      // Idempotency: if we already created a booking for this order, stop.
      const existingBookingRes = await db.execute({
        sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ? AND booking_id IS NOT NULL',
        args: [order_id]
      })
      if (existingBookingRes.rows.length > 0) {
        return res.send('OK')
      }

      const pendingRes = await db.execute({
        sql: 'SELECT * FROM pending_bookings WHERE order_id = ?',
        args: [order_id]
      })
      const pending = pendingRes.rows[0]
      if (!pending) {
        // Signature was valid but we have no record of this order — refuse.
        console.error('LiqPay callback for unknown order:', order_id)
        return res.status(400).send('Unknown order')
      }

      // Re-fetch the trip and assert that the paid amount + currency match
      // what we intended to charge. Without this, a valid-signature callback
      // with an attacker-chosen amount would still produce a booking.
      const tripRes = await db.execute({
        sql: 'SELECT price, seats FROM trips WHERE id = ?',
        args: [pending.trip_id]
      })
      const trip = tripRes.rows[0]
      if (!trip) {
        console.error('LiqPay callback for missing trip:', pending.trip_id)
        return res.status(400).send('Trip not found')
      }
      if (Number(amount) !== Number(trip.price) || currency !== 'UAH') {
        console.error('LiqPay amount/currency mismatch', { order_id, paid: amount, currency, expected: trip.price })
        return res.status(400).send('Amount mismatch')
      }

      // INSERT booking and link it from pending_bookings in one batch.
      // libsql runs batch statements in a single transaction, so either
      // both writes land or neither does — no ghost bookings on crash.
      const batchResult = await db.batch([
        {
          sql: 'INSERT INTO bookings (trip_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?)',
          args: [pending.trip_id, pending.passenger_name, pending.passenger_phone, pending.boarding_point, pending.alighting_point],
        },
        {
          sql: 'UPDATE pending_bookings SET booking_id = last_insert_rowid() WHERE order_id = ?',
          args: [order_id],
        },
      ])
      const bookingId = Number(batchResult[0].lastInsertRowid)

      // Defensive overbooking check — see bookings.js POST for context.
      // If two payments completed concurrently for the last seat, the
      // second one gets refunded out-of-band (booking + link both undone).
      const recheck = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM bookings WHERE trip_id = ?', args: [pending.trip_id] })
      if (recheck.rows[0].cnt > trip.seats) {
        await db.batch([
          { sql: 'DELETE FROM bookings WHERE id = ?', args: [bookingId] },
          { sql: 'UPDATE pending_bookings SET booking_id = NULL WHERE order_id = ?', args: [order_id] },
        ])
        console.error('Overbooking detected after LiqPay callback; booking rolled back', { order_id, trip_id: pending.trip_id })
        return res.status(409).send('Overbooked')
      }
    }

    res.send('OK')
  } catch (e) {
    console.error(e)
    res.status(500).send('Error')
  }
})

// GET /api/liqpay/status/:orderId
// Фронтенд перевіряє статус після повернення з LiqPay
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params

    // Простий підхід: якщо booking_id EXISTS в pending_bookings для цього order_id - оплата пройшла
    const pendingRes = await db.execute({
      sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ?',
      args: [orderId]
    })

    if (pendingRes.rows.length > 0 && pendingRes.rows[0].booking_id !== null) {
      const bookingId = pendingRes.rows[0].booking_id
      // Отримуємо дані бронювання
      const bookingRes = await db.execute({
        sql: 'SELECT b.*, t.date as trip_date, t.time as trip_time, t.price, r.from_city, r.to_city ' +
             'FROM bookings b ' +
             'JOIN trips t ON b.trip_id = t.id ' +
             'JOIN routes r ON t.route_id = r.id ' +
             'WHERE b.id = ?',
        args: [bookingId]
      })

      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0]
        res.json({
          paid: true,
          bookingId: booking.id,
          tripId: booking.trip_id,
          passengerName: booking.passenger_name,
          passengerPhone: booking.passenger_phone,
          boardingPoint: booking.boarding_point,
          alightingPoint: booking.alighting_point,
          tripDate: booking.trip_date,
          tripTime: booking.trip_time,
          tripPrice: booking.price,
          fromCity: booking.from_city,
          toCity: booking.to_city
        })
      } else {
        // Fallback if booking data not found (shouldn't happen)
        res.json({ paid: true })
      }
    } else {
      // Оплата ще не завершена або pending запис не існує
      res.json({ paid: false })
    }
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router