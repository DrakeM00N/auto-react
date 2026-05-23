const express = require('express')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')
const { logger } = require('../logger')

const router = express.Router()
const log = logger('users')

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

async function setRole(req, res, role) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Невірний ID користувача' })
    }
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [id] })
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Користувача не знайдено' })
    }
    // Don't let an admin demote themselves — risks locking out the last admin.
    if (role !== 'admin' && id === req.user.id) {
      return res.status(400).json({ error: 'Не можна знизити роль самому собі' })
    }
    await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, id] })
    res.json({ success: true })
  } catch (e) {
    log.error('setRole:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
}

// POST /api/users/:id/promote  (тільки адмін)
router.post('/:id/promote', adminMiddleware, (req, res) => setRole(req, res, 'admin'))

// POST /api/users/:id/demote  (тільки адмін)
router.post('/:id/demote', adminMiddleware, (req, res) => setRole(req, res, 'user'))

module.exports = router
