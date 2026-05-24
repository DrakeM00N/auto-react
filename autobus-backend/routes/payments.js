const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { getOccupiedSeats, HOLD_MINUTES } = require('../services/seats')
const { createInvoice, verifyWebhookSignature } = require('../services/monobank')
const { issueTicket } = require('../services/ticketing')
const { logger } = require('../logger')

const router = express.Router()
const log = logger('payments')

// server.js already exits on missing JWT_SECRET, so no fallback here.
const JWT_SECRET = process.env.JWT_SECRET

if (!process.env.MONOBANK_TOKEN) {
  log.warn('MONOBANK_TOKEN not set — payments will not work until you add it to autobus-backend/.env')
}

// Resolve the logged-in user from a Bearer token, if one is present.
function resolveUserId(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  try {
    return jwt.verify(header.slice(7), JWT_SECRET).id
  } catch {
    return null
  }
}

// POST /api/payments/checkout — reserve a seat hold and create a monobank invoice.
router.post('/checkout',
  [
    body('tripId').isInt({ min: 1 }).withMessage('tripId must be a positive integer'),
    body('passengerName').isString().trim().notEmpty().withMessage('Passenger name is required'),
    body('passengerPhone').isString().trim().notEmpty().withMessage('Passenger phone is required'),
    body('boardingPoint').optional({ nullable: true }).isString(),
    body('alightingPoint').optional({ nullable: true }).isString(),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const safe = (v) => (typeof v === 'string' ? v.trim() : '')
    const tripId = Number(req.body.tripId)
    const passengerName = safe(req.body.passengerName)
    const passengerPhone = safe(req.body.passengerPhone)
    const boardingPoint = safe(req.body.boardingPoint)
    const alightingPoint = safe(req.body.alightingPoint)

    const tripRes = await db.execute({ sql: 'SELECT * FROM trips WHERE id = ?', args: [tripId] })
    const trip = tripRes.rows[0]
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

    // Decision 3: a seat is held the moment checkout starts.
    const occupied = await getOccupiedSeats(tripId)
    if (occupied >= trip.seats) {
      return res.status(400).json({ error: 'Місць немає' })
    }

    const routeRes = await db.execute({ sql: 'SELECT * FROM routes WHERE id = ?', args: [trip.route_id] })
    const route = routeRes.rows[0]

    // Random suffix — the order_id is the only thing protecting the
    // unauthenticated /status endpoint from PII enumeration. (Same High-1
    // fix as the retired LiqPay flow.)
    const orderId = `order_${tripId}_${crypto.randomBytes(16).toString('hex')}`
    const destination = `Квиток BusTour: ${boardingPoint || route.from_city} → ${alightingPoint || route.to_city}, ${trip.date} ${trip.time}`
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

    const invoice = await createInvoice({
      amountUah: trip.price,
      reference: orderId,
      destination,
      redirectUrl: `${frontendUrl}/booking/success?order_id=${encodeURIComponent(orderId)}`,
      // webHookUrl only helps when the backend is reachable from the internet.
      webHookUrl: process.env.BACKEND_PUBLIC_URL
        ? `${process.env.BACKEND_PUBLIC_URL}/api/payments/webhook`
        : undefined,
      validitySeconds: HOLD_MINUTES * 60,
    })

    await db.execute({
      sql: `INSERT INTO pending_bookings
              (order_id, invoice_id, trip_id, user_id, passenger_name, passenger_phone, boarding_point, alighting_point)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderId,
        invoice.invoiceId,
        tripId,
        resolveUserId(req),
        passengerName,
        passengerPhone,
        boardingPoint,
        alightingPoint,
      ],
    })

    res.json({ pageUrl: invoice.pageUrl, orderId })
  } catch (e) {
    log.error('POST /api/payments/checkout:', e)
    res.status(500).json({ error: e.message || 'Помилка сервера' })
  }
})

// POST /api/payments/webhook — monobank server-to-server status notification.
// Dormant on localhost (monobank can't reach it); a safety net in production.
router.post('/webhook', async (req, res) => {
  try {
    const valid = await verifyWebhookSignature(req.rawBody, req.headers['x-sign'])
    if (!valid) return res.status(400).send('Invalid signature')

    const invoiceId = req.body && req.body.invoiceId
    if (invoiceId) {
      const found = await db.execute({
        sql: 'SELECT order_id FROM pending_bookings WHERE invoice_id = ?',
        args: [invoiceId],
      })
      if (found.rows[0]) await issueTicket(found.rows[0].order_id)
    }
    res.send('OK')
  } catch (e) {
    log.error('POST /api/payments/webhook:', e)
    res.status(500).send('Error')
  }
})

// GET /api/payments/status/:orderId — frontend polls this after returning
// from monobank. It asks monobank directly and issues the ticket on success.
router.get('/status/:orderId', async (req, res) => {
  try {
    const result = await issueTicket(req.params.orderId)
    if (result.state === 'paid') {
      return res.json({ paid: true, status: 'paid', ticket: result.ticket })
    }
    res.json({ paid: false, status: result.state })
  } catch (e) {
    log.error('GET /api/payments/status:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
