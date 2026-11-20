const express = require('express')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

const tripValidators = [
  body('routeId').isInt({ min: 1 }).withMessage('routeId must be a positive integer'),
  body('date').isISO8601({ strict: true }).withMessage('date must be ISO 8601 (YYYY-MM-DD)'),
  body('time').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('time must be HH:MM'),
  body('price').isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('seats').isInt({ min: 1, max: 100 }).withMessage('seats must be between 1 and 100'),
  // Extended trip metadata — all optional with safe defaults.
  body('departurePoint').optional({ nullable: true }).isString(),
  body('arrivalPoint').optional({ nullable: true }).isString(),
  body('arrivalDate').optional({ nullable: true }).isISO8601().withMessage('arrivalDate must be YYYY-MM-DD'),
  body('arrivalTime').optional({ nullable: true }).custom(v => {
    if (!v || v === '') return true
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
  }).withMessage('arrivalTime must be HH:MM'),
  body('busModel').optional({ nullable: true }).isString(),
  body('busPlate').optional({ nullable: true }).isString(),
  body('carrier').optional({ nullable: true }).isString(),
  body('amenities').optional({ nullable: true }).isArray().withMessage('amenities must be an array of strings'),
  body('amenities.*').optional().isString(),
  body('intermediateStops').optional({ nullable: true }).isArray().withMessage('intermediateStops must be an array'),
  body('intermediateStops.*.name').optional().isString(),
  body('intermediateStops.*.address').optional().isString(),
  body('intermediateStops.*.time').optional().isString(),
]

function rejectInvalid(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return true
  }
  return false
}

function safeParseJson(raw, fallback) {
  if (typeof raw !== 'string' || raw === '') return fallback
  try {
    const v = JSON.parse(raw)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

function safeString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

// Trim each leaf string in the intermediate-stops payload so the DB stores
// the same shape we hand to the frontend. Drops blank entries.
function normalizeIntermediateStops(arr) {
  if (!Array.isArray(arr)) return []
  return arr
    .map(s => ({
      name: safeString(s?.name),
      address: safeString(s?.address),
      time: safeString(s?.time),
    }))
    .filter(s => s.name || s.address || s.time)
}

function normalizeAmenities(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(safeString).filter(Boolean)
}

function mapTripRow(row) {
  return {
    id: row.id,
    routeId: row.route_id,
    date: row.date,
    time: row.time,
    price: row.price,
    seats: row.seats,
    bookedCount: Number(row.booked_count || 0),
    // Extended fields — old rows have NULL on TEXT columns; normalize to ''.
    departurePoint: row.departure_point || '',
    arrivalPoint: row.arrival_point || '',
    arrivalDate: row.arrival_date || '',
    arrivalTime: row.arrival_time || '',
    busModel: row.bus_model || '',
    busPlate: row.bus_plate || '',
    carrier: row.carrier || '',
    amenities: safeParseJson(row.amenities, []),
    intermediateStops: safeParseJson(row.intermediate_stops, []),
    stopsTimeline: safeParseJson(row.stops_timeline, []),
  }
}

const SELECT_TRIP_WITH_COUNT = `
  SELECT t.*, COUNT(b.id) as booked_count
  FROM trips t
  LEFT JOIN bookings b ON b.trip_id = t.id
`

const KYIV_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Kyiv',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23',
})

function kyivNow(now = new Date()) {
  const p = Object.fromEntries(KYIV_FORMATTER.formatToParts(now).map(part => [part.type, part.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

// "12" или "12,15,36" -> [12, 15, 36]; пустое/некорректное значение -> null
function parseRouteIds(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const ids = value.split(',').map(part => Number(part.trim()))
  if (ids.length > 20 || ids.some(id => !Number.isInteger(id) || id <= 0)) return null
  return ids
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/trips            — все рейсы (для админки и профиля)
// GET /api/trips?date=YYYY-MM-DD&routeId=1,2 — только нужные рейсы (расписание)
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60')
    const where = []
    const args = []
    if (req.query.date !== undefined) {
      if (!DATE_RE.test(String(req.query.date))) return res.status(400).json({ error: 'Некоректна дата' })
      where.push('t.date = ?')
      args.push(String(req.query.date))
    }
    if (req.query.routeId !== undefined) {
      const ids = parseRouteIds(req.query.routeId)
      if (!ids) return res.status(400).json({ error: 'Некоректний routeId' })
      where.push(`t.route_id IN (${ids.map(() => '?').join(',')})`)
      args.push(...ids)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const tripsRes = await db.execute({
      sql: `${SELECT_TRIP_WITH_COUNT} ${whereSql} GROUP BY t.id ORDER BY t.date, t.time`,
      args,
    })
    res.json(tripsRes.rows.map(mapTripRow))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// GET /api/trips/upcoming?limit=3&routeId=12,15
// Найближчі рейси (ще не відправлені, за київським часом). Для головної та сторінки маршруту.
router.get('/upcoming', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60')
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 200)
    const now = kyivNow()
    const where = ['(t.date > ? OR (t.date = ? AND t.time > ?))']
    const args = [now.date, now.date, now.time]
    if (req.query.routeId !== undefined) {
      const ids = parseRouteIds(req.query.routeId)
      if (!ids) return res.status(400).json({ error: 'Некоректний routeId' })
      where.push(`t.route_id IN (${ids.map(() => '?').join(',')})`)
      args.push(...ids)
    }
    const tripsRes = await db.execute({
      sql: `${SELECT_TRIP_WITH_COUNT} WHERE ${where.join(' AND ')} GROUP BY t.id ORDER BY t.date, t.time LIMIT ?`,
      args: [...args, limit],
    })
    res.json(tripsRes.rows.map(mapTripRow))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

async function fetchTripById(id) {
  const r = await db.execute({
    sql: `${SELECT_TRIP_WITH_COUNT} WHERE t.id = ? GROUP BY t.id`,
    args: [id],
  })
  return r.rows[0] ? mapTripRow(r.rows[0]) : null
}

// GET /api/trips/:id — один рейс (сторінка бронювання)
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Некоректний id' })
    const trip = await fetchTripById(id)
    if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })
    res.set('Cache-Control', 'no-store') // місця змінюються після кожного бронювання
    res.json(trip)
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/trips  (admin)
router.post('/', adminMiddleware, tripValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const {
      routeId, date, time, price, seats,
      departurePoint, arrivalPoint, arrivalDate, arrivalTime, busModel, busPlate, carrier,
      amenities, intermediateStops,
    } = req.body

    const result = await db.execute({
      sql: `INSERT INTO trips
              (route_id, date, time, price, seats,
               departure_point, arrival_point, arrival_date, arrival_time, bus_model, bus_plate, carrier,
               amenities, intermediate_stops)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        routeId, date, time, price, seats,
        safeString(departurePoint),
        safeString(arrivalPoint),
        arrivalDate || null,
        arrivalTime || null,
        safeString(busModel),
        safeString(busPlate),
        safeString(carrier),
        JSON.stringify(normalizeAmenities(amenities)),
        JSON.stringify(normalizeIntermediateStops(intermediateStops)),
      ],
    })

    res.json(await fetchTripById(Number(result.lastInsertRowid)))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/trips/:id  (admin)
router.put('/:id', adminMiddleware, tripValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const {
      routeId, date, time, price, seats,
      departurePoint, arrivalPoint, arrivalDate, arrivalTime, busModel, busPlate, carrier,
      amenities, intermediateStops,
    } = req.body

    await db.execute({
      sql: `UPDATE trips SET
        route_id=?, date=?, time=?, price=?, seats=?,
        departure_point=?, arrival_point=?, arrival_date=?, arrival_time=?, bus_model=?, bus_plate=?, carrier=?,
        amenities=?, intermediate_stops=?
      WHERE id=?`,
      args: [
        routeId, date, time, price, seats,
        safeString(departurePoint),
        safeString(arrivalPoint),
        arrivalDate || null,
        arrivalTime || null,
        safeString(busModel),
        safeString(busPlate),
        safeString(carrier),
        JSON.stringify(normalizeAmenities(amenities)),
        JSON.stringify(normalizeIntermediateStops(intermediateStops)),
        req.params.id,
      ],
    })

    res.json(await fetchTripById(req.params.id))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /api/trips/:id  (admin)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM trips WHERE id = ?', args: [req.params.id] })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router