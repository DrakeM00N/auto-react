const { db } = require('../db')

// How long an unpaid checkout holds a seat before it is released.
const HOLD_MINUTES = 15

// Seats taken on a trip = confirmed bookings + still-valid (non-expired) payment holds.
async function getOccupiedSeats(tripId) {
  const res = await db.execute({
    sql: `
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE trip_id = ?) +
        (SELECT COUNT(*) FROM pending_bookings
           WHERE trip_id = ?
             AND booking_id IS NULL
             AND created_at > datetime('now', '-${HOLD_MINUTES} minutes')) AS occupied
    `,
    args: [tripId, tripId],
  })
  return Number(res.rows[0].occupied)
}

module.exports = { HOLD_MINUTES, getOccupiedSeats }
