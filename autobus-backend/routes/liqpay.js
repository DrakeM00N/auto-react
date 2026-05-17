const express = require('express')
const crypto = require('crypto')
const { db } = require('../db')

const router = express.Router()

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY

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

    if (!tripId || !passengerName || !passengerPhone) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    const tripRes = await db.execute({ sql: 'SELECT * FROM trips WHERE id = ?', args: [tripId] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    const routeRes = await db.execute({ sql: 'SELECT * FROM routes WHERE id = ?', args: [trip.route_id] })
    const route = routeRes.rows[0]

    const orderId = `trip_${tripId}_${Date.now()}`
    const description = `Квиток: ${boardingPoint || route.from_city} → ${alightingPoint || route.to_city} • ${trip.date} ${trip.time} • ${passengerName}`

    const params = {
      public_key: LIQPAY_PUBLIC_KEY,
      version: '3',
      action: 'pay',
      amount: trip.price,
      currency: 'UAH',
      description,
      order_id: orderId,
      language: 'uk',
      sandbox: '1',
      result_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking/success`,
      //server_url: 'https://www.liqpay.ua',
    }

    const data = liqpayData(params)
    const signature = liqpaySign(data)

    // Зберігаємо pending бронювання (без booking_id наразі)
    await db.execute({
      sql: 'INSERT OR REPLACE INTO pending_bookings (order_id, trip_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?, ?)',
      args: [orderId, tripId, passengerName, passengerPhone, boardingPoint || '', alightingPoint || '']
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
    const { order_id, status } = decoded

    if (status === 'success' || status === 'sandbox') {
      // Знаходимо pending бронювання
      const pendingRes = await db.execute({
        sql: 'SELECT * FROM pending_bookings WHERE order_id = ?',
        args: [order_id]
      })
      const pending = pendingRes.rows[0]

      if (pending) {
        // Створюємо реальне бронювання
        const bookingResult = await db.execute({
          sql: 'INSERT INTO bookings (trip_id, passenger_name, passenger_phone, boarding_point, alighting_point) VALUES (?, ?, ?, ?, ?)',
          args: [pending.trip_id, pending.passenger_name, pending.passenger_phone, pending.boarding_point, pending.alighting_point]
        })
        const bookingId = Number(bookingResult.lastInsertRowid)

        // Оновлюємо pending бронювання ID реального бронювання (не видаляємо)
        await db.execute({
          sql: 'UPDATE pending_bookings SET booking_id = ? WHERE order_id = ?',
          args: [bookingId, order_id]
        })
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

    // Шукаємо чи є вже бронювання (значить оплата пройшла)
    const pendingRes = await db.execute({
      sql: 'SELECT * FROM pending_bookings WHERE order_id = ?',
      args: [orderId]
    })

    if (pendingRes.rows.length === 0) {
      // pending видалено (або був обновлений з booking_id) — значить callback спрацював і бронювання створено
      // Шукаємо реальне бронювання через booking_id в pending_bookings (якщо там збережено)
      const pendingWithBookingIdRes = await db.execute({
        sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ?',
        args: [orderId]
      })

      if (pendingWithBookingIdRes.rows.length > 0 && pendingWithBookingIdRes.rows[0].booking_id) {
        const bookingId = pendingWithBookingIdRes.rows[0].booking_id
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
          res.json({ paid: true })
        }
      } else {
        // Якщо немає booking_id в pending, просто повертаємо paid: true
        res.json({ paid: true })
      }
    } else {
      // У pending ще є запис — оплата не завершена
      res.json({ paid: false })
    }
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router