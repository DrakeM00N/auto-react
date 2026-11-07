require('dotenv').config()

const { db } = require('../db')

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseArgs(args) {
  const unknown = args.find(arg => arg !== '--apply')
  if (unknown) throw new Error(`Unknown option: ${unknown}`)
  return { apply: args.includes('--apply') }
}

async function getFutureTrips(executor, today) {
  const result = await executor.execute({
    sql: `SELECT t.id, t.date, t.time, r.from_city, r.to_city,
                 (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id) AS booking_count,
                 (SELECT COUNT(*) FROM pending_bookings p WHERE p.trip_id = t.id) AS order_count
          FROM trips t
          LEFT JOIN routes r ON r.id = t.route_id
          WHERE t.date >= ?
          ORDER BY t.date, t.time, t.id`,
    args: [today],
  })

  return result.rows.map(row => ({
    ...row,
    hasTickets: Number(row.booking_count) > 0 || Number(row.order_count) > 0,
  }))
}

function printRemaining(trips) {
  if (!trips.length) {
    console.log('Рейсов с бронями/заказами не осталось.')
    return
  }

  console.log('Оставшиеся будущие рейсы:')
  for (const trip of trips) {
    console.log(
      `  #${trip.id} ${trip.date} ${trip.time} ${trip.from_city || '—'} → ${trip.to_city || '—'}` +
      ` (броней: ${trip.booking_count}, заказов: ${trip.order_count})`,
    )
  }
}

async function deleteByIds(tx, table, column, tripIds) {
  const chunkSize = 500
  for (let index = 0; index < tripIds.length; index += chunkSize) {
    const chunk = tripIds.slice(index, index + chunkSize)
    const placeholders = chunk.map(() => '?').join(', ')
    await tx.execute({
      sql: `DELETE FROM ${table} WHERE ${column} IN (${placeholders})`,
      args: chunk,
    })
  }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))
  const today = localToday()

  if (!apply) {
    const trips = await getFutureTrips(db, today)
    const toDelete = trips.filter(trip => !trip.hasTickets)
    const remaining = trips.filter(trip => trip.hasTickets)
    console.log(`Сегодня: ${today}`)
    console.log(`Будущих рейсов без брони/заказов к удалению: ${toDelete.length}`)
    console.log(`Будущих рейсов с бронями/заказами останется: ${remaining.length}`)
    printRemaining(remaining)
    console.log('Dry-run: база данных не изменена. Для удаления передайте --apply.')
    return
  }

  const tx = await db.transaction('write')
  try {
    const currentTrips = await getFutureTrips(tx, today)
    const currentToDelete = currentTrips.filter(trip => !trip.hasTickets)
    const tripIds = currentToDelete.map(trip => trip.id)

    await deleteByIds(tx, 'bookings', 'trip_id', tripIds)
    await deleteByIds(tx, 'pending_bookings', 'trip_id', tripIds)
    await deleteByIds(tx, 'trips', 'id', tripIds)

    const currentRemaining = (await getFutureTrips(tx, today))
      .filter(trip => trip.hasTickets)
    await tx.commit()

    console.log(`Удалено будущих рейсов: ${tripIds.length}`)
    console.log(`Будущих рейсов осталось: ${currentRemaining.length}`)
  } catch (error) {
    try {
      await tx.rollback()
    } catch {
      // The transaction may already have been finalized.
    }
    throw error
  }
}

main()
  .catch(error => {
    console.error(`Удаление рейсов завершилось ошибкой: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => db.close())
