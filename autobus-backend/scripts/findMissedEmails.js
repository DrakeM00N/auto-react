require('dotenv').config()

const { db } = require('../db')

async function main() {
  const result = await db.execute(`
    SELECT b.ticket_code, b.passenger_name AS name, b.passenger_phone AS phone, b.created_at
    FROM pending_bookings pb
    JOIN bookings b ON b.id = pb.booking_id
    WHERE pb.booking_id IS NOT NULL
      AND pb.contact_email IS NULL
      AND pb.user_id IS NULL
    ORDER BY b.created_at, b.id
  `)
  console.log(JSON.stringify(result.rows, null, 2))
}

main()
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => db.close())
