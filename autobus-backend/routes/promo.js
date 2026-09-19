const express = require('express')
const { body, validationResult } = require('express-validator')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')
const { validatePromo } = require('../services/promo')

const router = express.Router()

function rejectInvalid(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return true
  }
  return false
}

function parsePromo(row) {
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discount_percent,
    active: !!row.active,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

const promoValidators = [
  body('code').isString().trim().notEmpty().withMessage('Код обов\'язковий'),
  body('discountPercent').isFloat({ min: 1, max: 100 }).withMessage('Знижка має бути від 1 до 100%'),
  body('maxUses').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Ліміт використань має бути додатним числом'),
  body('expiresAt').optional({ nullable: true }).isString(),
  body('active').optional().isBoolean(),
]

// GET /api/promo — список усіх промокодів (тільки адмін)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM promo_codes ORDER BY id DESC')
    res.json(result.rows.map(parsePromo))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/promo — створити промокод (тільки адмін)
router.post('/', adminMiddleware, promoValidators, async (req, res) => {
  if (rejectInvalid(req, res)) return
  try {
    const code = req.body.code.trim().toUpperCase()
    const { discountPercent, maxUses = null, expiresAt = null, active = true } = req.body

    const existing = await db.execute({ sql: 'SELECT 1 FROM promo_codes WHERE code = ?', args: [code] })
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Такий промокод вже існує' })
    }

    const result = await db.execute({
      sql: 'INSERT INTO promo_codes (code, discount_percent, active, max_uses, expires_at) VALUES (?, ?, ?, ?, ?)',
      args: [code, discountPercent, active ? 1 : 0, maxUses, expiresAt],
    })
    res.json({ id: Number(result.lastInsertRowid), code, discountPercent, active, maxUses, usedCount: 0, expiresAt })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// PATCH /api/promo/:id — редагувати/(де)активувати промокод (тільки адмін)
router.patch('/:id', adminMiddleware, async (req, res) => {
  try {
    const fields = []
    const args = []
    if (req.body.discountPercent !== undefined) {
      fields.push('discount_percent = ?')
      args.push(req.body.discountPercent)
    }
    if (req.body.active !== undefined) {
      fields.push('active = ?')
      args.push(req.body.active ? 1 : 0)
    }
    if (req.body.maxUses !== undefined) {
      fields.push('max_uses = ?')
      args.push(req.body.maxUses)
    }
    if (req.body.expiresAt !== undefined) {
      fields.push('expires_at = ?')
      args.push(req.body.expiresAt)
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Немає полів для оновлення' })
    }
    args.push(req.params.id)
    await db.execute({ sql: `UPDATE promo_codes SET ${fields.join(', ')} WHERE id = ?`, args })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// DELETE /api/promo/:id — видалити промокод (тільки адмін)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM promo_codes WHERE id = ?', args: [req.params.id] })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/promo/validate — публічна перевірка коду перед оплатою.
// Це лише для показу знижки користувачу на сторінці бронювання;
// /api/payments/create перевіряє код повторно і незалежно на сервері.
router.post('/validate',
  [
    body('code').isString().trim().notEmpty().withMessage('Код обов\'язковий'),
    body('tripId').isInt({ min: 1 }).withMessage('tripId має бути додатним числом'),
  ],
  async (req, res) => {
    if (rejectInvalid(req, res)) return
    try {
      const tripRes = await db.execute({ sql: 'SELECT price FROM trips WHERE id = ?', args: [req.body.tripId] })
      const trip = tripRes.rows[0]
      if (!trip) return res.status(404).json({ error: 'Рейс не знайдено' })

      const result = await validatePromo(req.body.code, trip.price)
      if (!result.valid) return res.status(400).json({ error: result.error })
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: 'Помилка сервера' })
    }
  }
)

module.exports = router
