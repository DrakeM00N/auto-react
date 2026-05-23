const { createClient } = require('@libsql/client')

const db = createClient({ url: 'file:autobus.db' })

async function initDB() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`,
    `CREATE TABLE IF NOT EXISTS pending_bookings (
      order_id TEXT PRIMARY KEY,
      trip_id INTEGER NOT NULL,
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

  // Seed initial data if empty
  const routeCount = await db.execute('SELECT COUNT(*) as cnt FROM routes')
  if (routeCount.rows[0].cnt === 0) {
    // Generate future dates for trips (7, 8, 9, 10 days from now)
    const now = new Date()
    const date1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const date2 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const date3 = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const date4 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    await db.batch([
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Київ', '475 км', '6 год', '["Миколаїв","Житомир"]')`,
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Харків', '680 км', '8 год', '["Полтава"]')`,
      `INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES
        ('Кременчук', 'Львів', '810 км', '10 год', '["Кропивницький"]')`,
      `INSERT INTO trips (route_id, date, time, price, seats) VALUES (1, '${date1}', '07:00', 350, 40)`,
      `INSERT INTO trips (route_id, date, time, price, seats) VALUES (1, '${date2}', '14:00', 320, 40)`,
      `INSERT INTO trips (route_id, date, time, price, seats) VALUES (2, '${date3}', '08:00', 480, 40)`,
      `INSERT INTO trips (route_id, date, time, price, seats) VALUES (3, '${date4}', '09:00', 550, 40)`,
    ])
  }

  console.log('✅ Database ready')
}

module.exports = { db, initDB }