require('dotenv').config()

const { db, initDB } = require('../db')
const { loadTicketByBookingId, loadTicketByCode } = require('../services/ticketing')
const { sendTicketEmail } = require('../services/email')

async function main() {
  const [identifier, suppliedEmail, ...extra] = process.argv.slice(2)
  if (!identifier || extra.length) {
    throw new Error('Usage: node scripts/resendTicketEmail.js <ticket_code|booking_id> [email]')
  }
  await initDB({ seed: false })

  const ticket = /^\d+$/.test(identifier)
    ? await loadTicketByBookingId(Number(identifier))
    : await loadTicketByCode(identifier)
  if (!ticket) throw new Error(`Ticket ${identifier} was not found`)

  const emailResult = await db.execute({
    sql: 'SELECT contact_email FROM pending_bookings WHERE booking_id = ?',
    args: [ticket.bookingId],
  })
  const recipient = suppliedEmail || emailResult.rows[0]?.contact_email
  if (!recipient) throw new Error('No email was supplied and no contact_email is stored for this booking')

  const result = await sendTicketEmail(recipient, ticket)
  console.log(JSON.stringify({
    bookingId: ticket.bookingId,
    ticketCode: ticket.ticketCode,
    recipient,
    ...result,
  }, null, 2))
  if (!result.delivered) process.exitCode = 1
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
