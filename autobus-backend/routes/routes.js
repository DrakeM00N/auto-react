const express = require('express')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

const routeValidators = [
  body('from').isString().trim().notEmpty().withMessage('from is required'),
  body('to').isString().trim().notEmpty().withMessage('to is required'),
  body('distance').isString().trim().notEmpty().withMessage('distance is required'),
  body('duration').isString().trim().notEmpty().withMessage('duration is required'),
  body('stops').optional().isArray().withMessage('stops must be an array'),
  body('stops.*').optional().isString().withMessage('each stop must be a string'),
]

function rejectInvalid(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return true
  }
  return false
}

function parseRoute(row) {
  return {
    id: row.id,
    from: row.from_city,
    to: row.to_city,
    distance: row.distance,
    duration: row.duration,
    stops: JSON.parse(row.stops || '[]'),
  }
}

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM routes ORDER BY id')
    res.json(result.rows.map(parseRoute))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/routes  (тільки адмін)
router.post('/', adminMiddleware, routeValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const { from, to, distance, duration, stops = [] } = req.body
    const result = await db.execute({
      sql: 'INSERT INTO routes (from_city, to_city, distance, duration, stops) VALUES (?, ?, ?, ?, ?)',
      args: [from, to, distance, duration, JSON.stringify(stops)]
    })
    res.json({ id: Number(result.lastInsertRowid), from, to, distance, duration, stops })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PUT /api/routes/:id  (тільки адмін)
router.put('/:id', adminMiddleware, routeValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const { from, to, distance, duration, stops = [] } = req.body
    await db.execute({
      sql: 'UPDATE routes SET from_city=?, to_city=?, distance=?, duration=?, stops=? WHERE id=?',
      args: [from, to, distance, duration, JSON.stringify(stops), req.params.id]
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /api/routes/:id  (тільки адмін)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM routes WHERE id = ?', args: [req.params.id] })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
