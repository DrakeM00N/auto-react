require('dotenv').config()

const { isEmail } = require('validator')
const { db, initDB } = require('../db')
const { loadTicketByBookingId, loadTicketByCode } = require('../services/ticketing')
const { sendTicketEmail } = require('../services/email')

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const positional = args.filter(arg => arg !== '--dry-run')
  const [identifier, suppliedEmail, ...extra] = positional
  if (!identifier || extra.length) {
    throw new Error('Usage: node scripts/resendTicketEmail.js <ticket_code|booking_id> [email] [--dry-run]')
  }
  if (suppliedEmail && !isEmail(suppliedEmail)) {
    throw new Error('The supplied email address is invalid')
  }

  await initDB({ seed: false })
  const ticket = /^\d+$/.test(identifier)
    ? await loadTicketByBookingId(Number(identifier))
    : await loadTicketByCode(identifier)
  if (!ticket) throw new Error(`Ticket ${identifier} was not found`)

  const emailResult = await db.execute({
    sql: `SELECT pb.contact_email, u.email AS user_email
          FROM pending_bookings pb
          LEFT JOIN users u ON u.id = pb.user_id
          WHERE pb.booking_id = ?`,
    args: [ticket.bookingId],
  })
  const recipient = suppliedEmail || emailResult.rows[0]?.contact_email || emailResult.rows[0]?.user_email
  if (!recipient) throw new Error('No email was supplied or found for this booking')
  if (!isEmail(recipient)) throw new Error('The recipient email address is invalid')

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      recipient,
      ticket: {
        ticketCode: ticket.ticketCode,
        passengerName: ticket.passengerName,
        fromCity: ticket.fromCity,
        toCity: ticket.toCity,
        departureDate: ticket.departureDate,
        departureTime: ticket.departureTime,
      },
    }, null, 2))
    return
  }

  const result = await sendTicketEmail(recipient, ticket)
  console.log(JSON.stringify({
    bookingId: ticket.bookingId,
    ticketCode: ticket.ticketCode,
    recipient,
    ...result,
  }, null, 2))
  if (!result.delivered) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => db.close())
