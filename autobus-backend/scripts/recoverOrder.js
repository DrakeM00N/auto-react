require('dotenv').config()

const { db, initDB } = require('../db')
const { requestInvoiceStatus } = require('../services/wayforpay')
const { issueTicket, loadTicketByBookingId } = require('../services/ticketing')

function parseArgs(args) {
  const positional = []
  const options = { dryRun: false, boardingPoint: null, alightingPoint: null }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--boarding-point' || arg === '--alighting-point') {
      const value = args[++index]
      if (!value) throw new Error(`${arg} requires a value`)
      options[arg === '--boarding-point' ? 'boardingPoint' : 'alightingPoint'] = value
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  if (positional.length !== 6) {
    throw new Error(
      'Usage: node scripts/recoverOrder.js <order_id> <trip_id> <passenger_name> <passenger_phone> <contact_email> <final_price> [--boarding-point <value>] [--alighting-point <value>] [--dry-run]',
    )
  }
  const [orderId, tripIdValue, passengerName, passengerPhone, contactEmail, priceValue] = positional
  const tripId = Number(tripIdValue)
  const finalPrice = Number(priceValue)
  if (!Number.isInteger(tripId) || tripId <= 0) throw new Error('trip_id must be a positive integer')
  if (!Number.isFinite(finalPrice) || finalPrice < 0) throw new Error('final_price must be a non-negative number')
  if (!orderId || !passengerName || !passengerPhone || !contactEmail) {
    throw new Error('order_id, passenger_name, passenger_phone, and contact_email are required')
  }
  return { ...options, orderId, tripId, passengerName, passengerPhone, contactEmail, finalPrice }
}

async function main() {
  const input = parseArgs(process.argv.slice(2))
  await initDB({ seed: false })

  const existing = await db.execute({
    sql: 'SELECT booking_id FROM pending_bookings WHERE order_id = ?',
    args: [input.orderId],
  })
  if (existing.rows[0]?.booking_id != null) {
    const ticket = await loadTicketByBookingId(Number(existing.rows[0].booking_id))
    console.log(JSON.stringify({ existing: true, ticket }, null, 2))
    return
  }

  const tripResult = await db.execute({
    sql: 'SELECT price FROM trips WHERE id = ?',
    args: [input.tripId],
  })
  const trip = tripResult.rows[0]
  if (!trip) throw new Error(`Trip ${input.tripId} was not found`)

  // createInvoice returns invoiceId=reference, and CHECK_STATUS sends that
  // value as WayForPay's orderReference; for recovery it must equal order_id.
  const pendingBooking = {
    order_id: input.orderId,
    invoice_id: input.orderId,
    trip_id: input.tripId,
    passenger_name: input.passengerName,
    passenger_phone: input.passengerPhone,
    boarding_point: input.boardingPoint,
    alighting_point: input.alightingPoint,
    contact_email: input.contactEmail,
    original_price: Number(trip.price),
    final_price: input.finalPrice,
  }

  if (input.dryRun) {
    const status = await requestInvoiceStatus(input.orderId)
    console.log(JSON.stringify({ dryRun: true, wouldInsert: pendingBooking, wayForPayStatus: status }, null, 2))
    return
  }

  await db.execute({
    sql: `INSERT INTO pending_bookings
            (order_id, invoice_id, trip_id, passenger_name, passenger_phone,
             boarding_point, alighting_point, contact_email, original_price, final_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(order_id) DO UPDATE SET
            invoice_id = excluded.invoice_id,
            trip_id = excluded.trip_id,
            passenger_name = excluded.passenger_name,
            passenger_phone = excluded.passenger_phone,
            boarding_point = excluded.boarding_point,
            alighting_point = excluded.alighting_point,
            contact_email = excluded.contact_email,
            original_price = excluded.original_price,
            final_price = excluded.final_price
          WHERE pending_bookings.booking_id IS NULL`,
    args: [
      pendingBooking.order_id,
      pendingBooking.invoice_id,
      pendingBooking.trip_id,
      pendingBooking.passenger_name,
      pendingBooking.passenger_phone,
      pendingBooking.boarding_point,
      pendingBooking.alighting_point,
      pendingBooking.contact_email,
      pendingBooking.original_price,
      pendingBooking.final_price,
    ],
  })

  const result = await issueTicket(input.orderId)
  console.log(JSON.stringify({
    state: result.state,
    ticketCode: result.ticket?.ticketCode || null,
    ticket: result.ticket || null,
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
