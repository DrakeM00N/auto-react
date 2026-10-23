const assert = require('node:assert/strict')
const Module = require('node:module')
const { once } = require('node:events')
const { test } = require('node:test')
const express = require('express')
const { createClient } = require('@libsql/client')
const jwt = require('jsonwebtoken')

function installMock(modulePath, exports, previousModules) {
  const filename = require.resolve(modulePath)
  previousModules.set(filename, require.cache[filename])
  const mock = new Module(filename)
  mock.filename = filename
  mock.loaded = true
  mock.exports = exports
  require.cache[filename] = mock
}

async function createTestDatabase() {
  const db = createClient({ url: 'file::memory:' })
  await db.batch([
    `CREATE TABLE trips (
      id INTEGER PRIMARY KEY, route_id INTEGER, date TEXT, time TEXT, price REAL, seats INTEGER,
      arrival_date TEXT, arrival_time TEXT, departure_point TEXT, arrival_point TEXT
    )`,
    `CREATE TABLE routes (
      id INTEGER PRIMARY KEY, from_city TEXT, to_city TEXT, distance TEXT, duration TEXT, stops TEXT
    )`,
    `CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)`,
    `CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER, user_id INTEGER, passenger_name TEXT,
      passenger_phone TEXT, boarding_point TEXT, alighting_point TEXT, ticket_code TEXT,
      created_at TEXT DEFAULT (datetime('now')), status TEXT DEFAULT 'active',
      promo_code TEXT, final_price REAL
    )`,
    `CREATE TABLE pending_bookings (
      order_id TEXT PRIMARY KEY, invoice_id TEXT, trip_id INTEGER, user_id INTEGER,
      passenger_name TEXT, passenger_phone TEXT, boarding_point TEXT, alighting_point TEXT,
      contact_email TEXT, booking_id INTEGER, promo_code TEXT, original_price REAL, final_price REAL
    )`,
    `INSERT INTO routes VALUES (1, 'Київ', 'Львів', '540 км', '7 год', '[]')`,
    `INSERT INTO trips (id, route_id, date, time, price, seats) VALUES (1, 1, '2030-01-01', '09:00', 500, 40)`,
  ])
  return db
}

test('payment endpoints preserve guest email and retry webhook delivery safely', async t => {
  const db = await createTestDatabase()
  // Keep one in-memory connection; this suite exercises issuance idempotency, not transaction semantics.
  db.transaction = async () => ({
    execute: statement => db.execute(statement),
    commit: async () => {},
    rollback: async () => {},
  })
  const previousModules = new Map()
  const previousSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = 'test-only-jwt-secret'
  const sentEmails = []
  const logs = []

  installMock('../db', { db }, previousModules)
  installMock('../services/seats', {
    getOccupiedSeats: async () => 0,
    HOLD_MINUTES: 15,
  }, previousModules)
  installMock('../services/wayforpay', {
    createInvoice: () => ({ invoiceId: 'invoice-test', formUrl: 'https://payments.example.test', fields: {} }),
    verifyWebhookSignature: () => true,
    buildWebhookReply: (orderReference, status) => ({ orderReference, status }),
    requestInvoiceStatus: async () => 'Approved',
  }, previousModules)
  installMock('../services/email', {
    sendTicketEmail: async (recipient, ticket) => {
      sentEmails.push({ recipient, ticket })
      return { delivered: true }
    },
  }, previousModules)
  installMock('../services/promo', {
    validatePromo: async () => ({ valid: false }),
    incrementPromoUsage: async () => {},
  }, previousModules)
  installMock('../logger', {
    logger: () => Object.fromEntries(['info', 'warn', 'error'].map(level => [
      level,
      (...args) => logs.push({
        level,
        args: args.map(arg => arg instanceof Error ? { message: arg.message, stack: arg.stack } : arg),
      }),
    ])),
  }, previousModules)

  const paymentsPath = require.resolve('../routes/payments')
  const ticketingPath = require.resolve('../services/ticketing')
  previousModules.set(paymentsPath, require.cache[paymentsPath])
  previousModules.set(ticketingPath, require.cache[ticketingPath])
  delete require.cache[paymentsPath]
  delete require.cache[ticketingPath]

  const router = require('../routes/payments')
  const { issueTicket } = require('../services/ticketing')
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/api/payments', router)
  const server = app.listen(0)
  await once(server, 'listening')
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/payments`
  const guestData = {
    tripId: 1,
    passengerName: 'Test Passenger',
    passengerPhone: '+380501234567',
    boardingPoint: 'Київ',
    alightingPoint: 'Львів',
  }

  async function postJson(path, body, token) {
    const headers = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  }

  async function postWebhook(body) {
    return fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
  }

  try {
    await t.test('rejects a guest checkout without contactEmail', async () => {
      const response = await postJson('/create', guestData)
      assert.equal(response.status, 400)
    })

    await t.test('stores guest contactEmail from the booking form', async () => {
      const response = await postJson('/create', { ...guestData, contactEmail: ' Guest@Example.com ' })
      assert.equal(response.status, 200, await response.clone().text())
      const pending = await db.execute({
        sql: 'SELECT contact_email FROM pending_bookings WHERE order_id = ?',
        args: [(await response.json()).orderId],
      })
      assert.equal(pending.rows[0].contact_email, 'guest@example.com')
      const createLog = logs.find(entry => entry.level === 'info'
        && entry.args[0].startsWith('POST /api/payments/create'))
      assert.match(createLog.args[0], /contactEmail type=string/)
      assert.equal(createLog.args[0].includes('Guest@Example.com'), false)
    })

    await t.test('allows an authenticated customer to omit contactEmail', async () => {
      const token = jwt.sign({ id: 17 }, process.env.JWT_SECRET)
      const response = await postJson('/create', guestData, token)
      assert.equal(response.status, 200, `${await response.clone().text()}; ${JSON.stringify(logs)}`)
      const orderId = (await response.json()).orderId
      const pending = await db.execute({
        sql: 'SELECT user_id, contact_email FROM pending_bookings WHERE order_id = ?',
        args: [orderId],
      })
      assert.equal(Number(pending.rows[0].user_id), 17)
      assert.equal(pending.rows[0].contact_email, null)
    })

    await t.test('uses WayForPay email for ticket delivery and stays idempotent', async () => {
      const orderId = 'order_webhook_email'
      await db.execute({
        sql: `INSERT INTO pending_bookings
                (order_id, invoice_id, trip_id, passenger_name, passenger_phone, contact_email, final_price)
              VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        args: [orderId, 'invoice-webhook', 1, 'Webhook Passenger', '+380501234567', 500],
      })

      const response = await postWebhook({
        orderReference: orderId,
        transactionStatus: 'Approved',
        email: ' WEBHOOK@EXAMPLE.COM ',
      })
      assert.equal(response.status, 200, `${await response.clone().text()}; ${JSON.stringify(logs)}`)
      assert.equal((await response.json()).status, 'accept')

      const pending = await db.execute({
        sql: 'SELECT contact_email, booking_id FROM pending_bookings WHERE order_id = ?',
        args: [orderId],
      })
      assert.equal(pending.rows[0].contact_email, 'webhook@example.com')
      assert.ok(pending.rows[0].booking_id)
      assert.equal(sentEmails.length, 1)
      assert.equal(sentEmails[0].recipient, 'webhook@example.com')
      assert.ok(logs.some(entry => entry.level === 'info'
        && entry.args[0].includes('content-type=application/x-www-form-urlencoded')))

      const retry = await postWebhook({
        orderReference: orderId,
        transactionStatus: 'Approved',
        email: 'webhook@example.com',
      })
      assert.equal(retry.status, 200)
      await issueTicket(orderId, 'Approved')
      assert.equal(sentEmails.length, 1)
    })

    await t.test('does not accept a webhook for an unknown order', async () => {
      const response = await postWebhook({
        orderReference: 'order_unknown',
        transactionStatus: 'Approved',
      })
      assert.equal(response.status, 404)
      assert.equal(await response.text(), 'Order not found')
      assert.ok(logs.some(entry => entry.level === 'error'
        && entry.args.join(' ').includes('order_unknown')))
    })

    await t.test('keeps pending and failed webhook callbacks accepted', async () => {
      for (const [orderId, status] of [
        ['order_pending', 'InProcessing'],
        ['order_failed', 'Declined'],
      ]) {
        await db.execute({
          sql: `INSERT INTO pending_bookings
                  (order_id, invoice_id, trip_id, passenger_name, passenger_phone)
                VALUES (?, ?, ?, ?, ?)`,
          args: [orderId, `invoice-${orderId}`, 1, 'Status Passenger', '+380501234567'],
        })
        const response = await postWebhook({ orderReference: orderId, transactionStatus: status })
        assert.equal(response.status, 200, `${await response.clone().text()}; ${JSON.stringify(logs)}`)
        assert.equal((await response.json()).status, 'accept')
      }
    })
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })
    await db.close()
    for (const [filename, priorModule] of previousModules) {
      if (priorModule) require.cache[filename] = priorModule
      else delete require.cache[filename]
    }
    if (previousSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = previousSecret
  }
})
