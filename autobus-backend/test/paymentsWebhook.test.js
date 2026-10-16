const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')
const express = require('express')
const test = require('node:test')

process.env.DATABASE_URL = 'file::memory:?cache=shared'
process.env.JWT_SECRET = 'webhook-test-secret'
process.env.WAYFORPAY_SECRET_KEY = 'webhook-signature-test-secret'

const { db, initDB } = require('../db')
const paymentsRouter = require('../routes/payments')
const webhookBodyParser = require('../middleware/wayforpayWebhookBody')

const ORDER_ID = 'order_webhook_parser_test'
const merchantAccount = 'test-merchant'
const secret = process.env.WAYFORPAY_SECRET_KEY
let server
let baseUrl

function sign(fields) {
  return crypto.createHmac('md5', secret).update(fields.join(';')).digest('hex')
}

function createPayload(orderReference) {
  const payload = {
    merchantAccount,
    orderReference,
    amount: '100.00',
    currency: 'UAH',
    authCode: '123456',
    cardPan: '411111******1111',
    transactionStatus: 'InProcessing',
    reasonCode: '1100',
  }
  payload.merchantSignature = sign([
    payload.merchantAccount,
    payload.orderReference,
    payload.amount,
    payload.currency,
    payload.authCode,
    payload.cardPan,
    payload.transactionStatus,
    payload.reasonCode,
  ])
  return payload
}

function sendWebhook(payload, contentType) {
  const body = contentType === 'application/x-www-form-urlencoded'
    ? new URLSearchParams(payload).toString()
    : JSON.stringify(payload)

  return sendBody(body, contentType)
}

function sendBody(body, contentType) {
  return new Promise((resolve, reject) => {
    const target = new URL('/api/payments/webhook', baseUrl)
    const headers = { 'content-length': Buffer.byteLength(body) }
    if (contentType) headers['content-type'] = contentType
    const request = http.request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method: 'POST',
      headers,
    }, response => {
      let responseBody = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { responseBody += chunk })
      response.on('end', () => resolve({ statusCode: response.statusCode, body: responseBody }))
    })
    request.on('error', reject)
    request.end(body)
  })
}

test.before(async () => {
  await initDB({ seed: false })
  const route = await db.execute({
    sql: `INSERT INTO routes (from_city, to_city, distance, duration, stops)
          VALUES (?, ?, ?, ?, ?)`,
    args: ['Webhook origin', 'Webhook destination', '', '', '[]'],
  })
  const trip = await db.execute({
    sql: 'INSERT INTO trips (route_id, date, time, price, seats) VALUES (?, ?, ?, ?, ?)',
    args: [Number(route.lastInsertRowid), '2026-10-20', '10:00', 100, 40],
  })
  await db.execute({
    sql: `INSERT INTO pending_bookings
            (order_id, invoice_id, trip_id, passenger_name, passenger_phone, original_price, final_price)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [ORDER_ID, ORDER_ID, Number(trip.lastInsertRowid), 'Webhook Passenger', '000', 100, 100],
  })

  const app = express()
  app.use('/api/payments/webhook', ...webhookBodyParser)
  app.use('/api/payments', paymentsRouter)
  server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

for (const contentType of [
  'application/json',
  'application/x-www-form-urlencoded',
  'text/plain',
  undefined,
]) {
  test(`accepts signed webhook with ${contentType || 'no Content-Type'}`, async () => {
    const response = await sendWebhook(createPayload(ORDER_ID), contentType)
    assert.equal(response.statusCode, 200)
    const reply = JSON.parse(response.body)
    assert.equal(reply.orderReference, ORDER_ID)
    assert.equal(reply.status, 'accept')
    assert.equal(reply.signature, sign([reply.orderReference, reply.status, reply.time]))

    const booking = await db.execute({
      sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ?',
      args: [ORDER_ID],
    })
    assert.equal(booking.rows.length, 1)
  })
}

test('does not acknowledge a validly signed webhook for an unknown order', async () => {
  const response = await sendWebhook(createPayload('missing_webhook_order'), 'application/json')
  assert.equal(response.statusCode, 404)
  assert.equal(response.body, 'Order not found')
})

test('parses a JSON payload stored as the sole URL-encoded key', async () => {
  const payload = createPayload(ORDER_ID)
  const body = new URLSearchParams([[JSON.stringify(payload), '']]).toString()
  const response = await sendBody(body, 'application/x-www-form-urlencoded')
  assert.equal(response.statusCode, 200)
  assert.equal(JSON.parse(response.body).orderReference, ORDER_ID)
})
