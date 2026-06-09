const { createClient } = require('@libsql/client')
const { logger } = require('./logger')

const log = logger('db')

// Local dev falls back to a SQLite file; production sets DATABASE_URL to a
// Turso (libsql) URL plus DATABASE_AUTH_TOKEN.
const db = createClient({
  url: process.env.DATABASE_URL || 'file:autobus.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

async function addColumnIfMissing(table, column, type) {
  const info = await db.execute(`PRAGMA table_info(${table})`)
  if (!info.rows.some(r => r.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}

async function initDB() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      google_id TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      distance TEXT NOT NULL,
      duration TEXT NOT NULL,
      stops TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      price REAL NOT NULL,
      seats INTEGER NOT NULL DEFAULT 40,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER,
      passenger_name TEXT NOT NULL,
      passenger_phone TEXT NOT NULL,
      boarding_point TEXT,
      alighting_point TEXT,
      ticket_code TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`,
    `CREATE TABLE IF NOT EXISTS pending_bookings (
      order_id TEXT PRIMARY KEY,
      invoice_id TEXT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER,
      passenger_name TEXT NOT NULL,
      passenger_phone TEXT NOT NULL,
      boarding_point TEXT,
      alighting_point TEXT,
      booking_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      visitor_id TEXT,
      session_id TEXT,
      user_id INTEGER,
      path TEXT,
      props TEXT DEFAULT '{}',
      ip_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_name_time ON events(name, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)`,
  ])

  // Migrations for databases created before the monobank ticketing system.
  // CREATE TABLE IF NOT EXISTS does not add new columns to existing tables,
  // so we patch them in explicitly. Safe to run on a fresh DB too — the
  // helper is a no-op when the column is already present.
  await addColumnIfMissing('bookings', 'ticket_code', 'TEXT')
  await addColumnIfMissing('pending_bookings', 'invoice_id', 'TEXT')
  await addColumnIfMissing('pending_bookings', 'user_id', 'INTEGER')
  await addColumnIfMissing('bookings', 'status', "TEXT DEFAULT 'active'")

  // Extended trip metadata (busfor-style detail block). Old rows get '[]'
  // for the JSON columns via the ADD COLUMN default; the plain TEXT
  // columns stay NULL on old rows and are normalized to '' on the way
  // out in routes/trips.js.
  await addColumnIfMissing('trips', 'departure_point', 'TEXT')
  await addColumnIfMissing('trips', 'arrival_point', 'TEXT')
  await addColumnIfMissing('trips', 'bus_model', 'TEXT')
  await addColumnIfMissing('trips', 'bus_plate', 'TEXT')
  await addColumnIfMissing('trips', 'carrier', 'TEXT')
  await addColumnIfMissing('trips', 'amenities', "TEXT DEFAULT '[]'")
  await addColumnIfMissing('trips', 'intermediate_stops', "TEXT DEFAULT '[]'")

  // Seed initial data if empty
  const routeCount = await db.execute('SELECT COUNT(*) as cnt FROM routes')
  if (routeCount.rows[0].cnt === 0) {
    await db.batch([
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Київ', '475 км', '6 год', '["Миколаїв","Житомир"]')`,
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Харків', '680 км', '8 год', '["Полтава"]')`,
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Львів', '810 км', '10 год', '["Кропивницький"]')`,
    ])
  }

  // Seed trips independently — if routes exist but no trips do, we still
  // need example trips for the seeded routes.
  const tripCount = await db.execute('SELECT COUNT(*) as cnt FROM trips')
  if (tripCount.rows[0].cnt === 0) {
    const now = new Date()
    const day = (n) => new Date(now.getTime() + n * 86400000).toISOString().split('T')[0]
    const routes = await db.execute('SELECT id FROM routes ORDER BY id LIMIT 3')
    if (routes.rows.length >= 3) {
      const [r1, r2, r3] = routes.rows
      await db.batch([
        `INSERT INTO trips (route_id, date, time, price, seats) VALUES (${r1.id}, '${day(7)}', '07:00', 350, 40)`,
        `INSERT INTO trips (route_id, date, time, price, seats) VALUES (${r1.id}, '${day(8)}', '14:00', 320, 40)`,
        `INSERT INTO trips (route_id, date, time, price, seats) VALUES (${r2.id}, '${day(9)}', '08:00', 480, 40)`,
        `INSERT INTO trips (route_id, date, time, price, seats) VALUES (${r3.id}, '${day(10)}', '09:00', 550, 40)`,
      ])
    }
  }

  // Purge expired/used rows on startup, then every hour. pending_bookings
  // older than a day without a real booking_id are dead — the user either
  // never paid or LiqPay never called back. password_resets that are used
  // or expired serve no purpose.
  async function cleanup() {
    try {
      await db.batch([
        `DELETE FROM password_resets WHERE used = 1 OR expires_at < datetime('now')`,
        `DELETE FROM pending_bookings WHERE booking_id IS NULL AND created_at < datetime('now', '-1 day')`,
      ])
    } catch (e) {
      log.error('Cleanup task failed:', e.message)
    }
  }
  await cleanup()
  setInterval(cleanup, 60 * 60 * 1000).unref()

  log.info('Database ready')
}

module.exports = { db, initDB }