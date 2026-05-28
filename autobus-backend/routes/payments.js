const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { getOccupiedSeats, HOLD_MINUTES } = require('../services/seats')
const {
  createInvoice,
  verifyWebhookSignature,
  buildWebhookReply,
} = require('../services/wayforpay')
const { issueTicket } = require('../services/ticketing')
const { logger } = require('../logger')

const router = express.Router()
const log = logger('payments')

// server.js already exits on missing JWT_SECRET, so no fallback here.
const JWT_SECRET = process.env.JWT_SECRET

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

// POST /api/payments/create — reserve a seat hold and return WayForPay form data.
router.post('/create',
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

    // Random suffix — orderReference is the only thing protecting the
    // unauthenticated /status endpoint from PII enumeration.
    const orderId = `order_${tripId}_${crypto.randomBytes(16).toString('hex')}`
    const destination = `Квиток BusTour: ${boardingPoint || route.from_city} → ${alightingPoint || route.to_city}, ${trip.date} ${trip.time}`
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')[0].trim()

    const invoice = createInvoice({
      amountUah: trip.price,
      reference: orderId,
      destination,
      redirectUrl: `${frontendUrl}/booking/success?order_id=${encodeURIComponent(orderId)}`,
      // serviceUrl only helps when the backend is reachable from the internet.
      webHookUrl: process.env.BACKEND_PUBLIC_URL
        ? `${process.env.BACKEND_PUBLIC_URL}/api/payments/webhook`
        : undefined,
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

    res.json({
      orderId,
      formUrl: invoice.formUrl,
      fields: invoice.fields,
      // pageUrl kept for compatibility with the older redirect-style frontend.
      pageUrl: invoice.formUrl,
    })
  } catch (e) {
    log.error('POST /api/payments/create:', e)
    res.status(500).json({ error: e.message || 'Помилка сервера' })
  }
})

// POST /api/payments/webhook — WayForPay server-to-server notification.
// Dormant on localhost (WayForPay can't reach it); a safety net in production.
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body || {}
    if (!verifyWebhookSignature(payload)) {
      log.warn('webhook: invalid signature for order', payload.orderReference)
      return res.status(400).send('Invalid signature')
    }

    if (payload.orderReference) {
      await issueTicket(payload.orderReference)
    }

    // WayForPay keeps retrying until it receives a properly-signed accept.
    res.json(buildWebhookReply(payload.orderReference, 'accept'))
  } catch (e) {
    log.error('POST /api/payments/webhook:', e)
    res.status(500).send('Error')
  }
})

// GET /api/payments/status/:orderId — frontend polls this after returning
// from WayForPay. It asks WayForPay directly and issues the ticket on success.
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
