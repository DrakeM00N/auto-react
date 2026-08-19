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
  }
}

const SELECT_TRIP_WITH_COUNT = `
  SELECT t.*, COUNT(b.id) as booked_count
  FROM trips t
  LEFT JOIN bookings b ON b.trip_id = t.id
`

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const tripsRes = await db.execute({
      sql: `${SELECT_TRIP_WITH_COUNT} GROUP BY t.id ORDER BY t.date, t.time`,
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