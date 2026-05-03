const express = require('express')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

// GET /api/users  (тільки адмін)
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT id, name, email, role, last_login, created_at FROM users ORDER BY id')
    res.json(result.rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      lastLogin: u.last_login,
    })))
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/users/:id/promote  (тільки адмін)
router.post('/:id/promote', adminMiddleware, async (req, res) => {
  try {
    await db.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: ['admin', req.params.id]
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
