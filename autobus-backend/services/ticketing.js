const crypto = require('crypto')
const { db } = require('../db')
const { requestInvoiceStatus } = require('./monobank')
const { logger } = require('../logger')

const log = logger('ticketing')

// monobank invoice statuses that mean the money is secured / not secured.
const PAID_STATUSES = ['success', 'hold']
const FAILED_STATUSES = ['failure', 'reversed', 'expired']

// --- Ticket codes ---

// No ambiguous characters (0/O, 1/I) so the code is easy to read off a screen.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateTicketCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  }
  return `AR-${code}`
}

async function uniqueTicketCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateTicketCode()
    const existing = await db.execute({
      sql: 'SELECT 1 FROM bookings WHERE ticket_code = ?',
      args: [code],
    })
    if (existing.rows.length === 0) return code
  }
  throw new Error('Could not generate a unique ticket code')
}

// --- Ticket loading ---

const TICKET_SQL = `
  SELECT b.id, b.ticket_code, b.trip_id,
         b.passenger_name, b.passenger_phone, b.boarding_point, b.alighting_point, b.created_at,
         t.date AS trip_date, t.time AS trip_time, t.price AS trip_price,
         r.from_city, r.to_city, r.stops, r.duration
  FROM bookings b
  JOIN trips t ON b.trip_id = t.id
  JOIN routes r ON t.route_id = r.id
`

function mapTicket(row) {
  let stops = []
  try { stops = JSON.parse(row.stops || '[]') } catch { stops = [] }
  return {
    bookingId: Number(row.id),
    ticketCode: row.ticket_code,
    tripId: Number(row.trip_id),
    passengerName: row.passenger_name,
    passengerPhone: row.passenger_phone,
    boardingPoint: row.boarding_point,
    alightingPoint: row.alighting_point,
    createdAt: row.created_at,
    tripDate: row.trip_date,
    tripTime: row.trip_time,
    tripPrice: row.trip_price,
    fromCity: row.from_city,
    toCity: row.to_city,
    stops,
    duration: row.duration,
  }
}

async function loadTicketByCode(code) {
  const res = await db.execute({ sql: `${TICKET_SQL} WHERE b.ticket_code = ?`, args: [code] })
  return res.rows[0] ? mapTicket(res.rows[0]) : null
}

async function loadTicketByBookingId(bookingId) {
  const res = await db.execute({ sql: `${TICKET_SQL} WHERE b.id = ?`, args: [bookingId] })
  return res.rows[0] ? mapTicket(res.rows[0]) : null
}

// --- Ticket issuance ---

// Turns a paid pending_bookings row into a real booking + ticket.
// Idempotent: safe to call repeatedly for the same order (poll + webhook both
// land here). Returns { state, ticket }, state ∈ paid | pending | failed | not_found.
async function issueTicket(orderId) {
  const pendingRes = await db.execute({
    sql: 'SELECT * FROM pending_bookings WHERE order_id = ?',
    args: [orderId],
  })
  const pending = pendingRes.rows[0]
  if (!pending) return { state: 'not_found' }

  // Already issued — return the existing ticket.
  if (pending.booking_id != null) {
    return { state: 'paid', ticket: await loadTicketByBookingId(Number(pending.booking_id)) }
  }

  const status = await requestInvoiceStatus(pending.invoice_id)
  if (FAILED_STATUSES.includes(status)) return { state: 'failed' }
  if (!PAID_STATUSES.includes(status)) return { state: 'pending' }

  // Payment confirmed — mint the ticket inside a transaction.
  // db.transaction() works on both the local file and Turso (remote libsql);
  // raw BEGIN/COMMIT strings do not work on remote.
  const ticketCode = await uniqueTicketCode()
  const tx = await db.transaction('write')
  let bookingId
  try {
    // Re-check inside the transaction in case a concurrent call already issued it.
    const recheck = await tx.execute({
      sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ?',
      args: [orderId],
    })
    const existingId = recheck.rows[0] && recheck.rows[0].booking_id
    if (existingId != null) {
      await tx.rollback()
      return { state: 'paid', ticket: await loadTicketByBookingId(Number(existingId)) }
    }

    // Decision 5: a paid customer always gets a ticket. If the 15-min hold
    // expired and the seat was resold, we honour the payment and log the overbook.
    const tripRes = await tx.execute({ sql: 'SELECT seats FROM trips WHERE id = ?', args: [pending.trip_id] })
    const confirmedRes = await tx.execute({
      sql: 'SELECT COUNT(*) AS cnt FROM bookings WHERE trip_id = ?',
      args: [pending.trip_id],
    })
    const seats = tripRes.rows[0] ? tripRes.rows[0].seats : 0
    const confirmed = confirmedRes.rows[0].cnt
    if (confirmed >= seats) {
      log.warn(`[OVERBOOK] order ${orderId}: trip ${pending.trip_id} at ${confirmed}/${seats} — issuing anyway (payment received)`)
    }

    const inserted = await tx.execute({
      sql: `INSERT INTO bookings
              (trip_id, user_id, passenger_name, passenger_phone, boarding_point, alighting_point, ticket_code)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pending.trip_id,
        pending.user_id,
        pending.passenger_name,
        pending.passenger_phone,
        pending.boarding_point,
        pending.alighting_point,
        ticketCode,
      ],
    })
    bookingId = Number(inserted.lastInsertRowid)

    await tx.execute({
      sql: 'UPDATE pending_bookings SET booking_id = ? WHERE order_id = ?',
      args: [bookingId, orderId],
    })

    await tx.commit()
  } catch (e) {
    try { await tx.rollback() } catch { /* transaction already finalized */ }
    throw e
  }

  return { state: 'paid', ticket: await loadTicketByBookingId(bookingId) }
}

module.exports = {
  issueTicket,
  loadTicketByCode,
  loadTicketByBookingId,
}
