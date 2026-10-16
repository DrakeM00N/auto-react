require('dotenv').config()

const { db, initDB } = require('../db')
const { requestInvoiceStatus } = require('../services/wayforpay')

async function main() {
  await initDB({ seed: false })
  // Some orders from 15-16.10 may already have been removed by the old cleanup;
  // reconcile those manually in the WayForPay dashboard (they have no booking_id).
  const pending = await db.execute({
    sql: `SELECT order_id, invoice_id, trip_id, passenger_name, passenger_phone,
                 contact_email, created_at
          FROM pending_bookings
          WHERE booking_id IS NULL
          ORDER BY created_at`,
  })

  for (const order of pending.rows) {
    const status = await requestInvoiceStatus(order.invoice_id || order.order_id)
    console.log(JSON.stringify({ ...order, wayForPayStatus: status }))
  }
  console.log(`Audited ${pending.rows.length} unissued pending booking(s).`)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
