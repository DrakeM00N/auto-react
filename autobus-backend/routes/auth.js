const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db } = require('../db')
const { authMiddleware } = require('../middleware')

const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'autobus-secret-key'

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    })
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Користувач з таким email вже існує' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      args: [name.trim(), email.toLowerCase(), hashed]
    })

    const user = { id: Number(result.lastInsertRowid), name: name.trim(), email: email.toLowerCase(), role: 'user' }
    const token = jwt.sign(user, SECRET, { expiresIn: '7d' })

    res.json({ token, user })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Введіть email та пароль' })
    }

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    })
    const user = result.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Невірний email або пароль' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Невірний email або пароль' })
    }

    const now = new Date().toLocaleString('uk-UA')
    await db.execute({
      sql: 'UPDATE users SET last_login = ? WHERE id = ?',
      args: [now, user.id]
    })

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, lastLogin: now }
    const token = jwt.sign(userData, SECRET, { expiresIn: '7d' })

    res.json({ token, user: userData })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Користувача з таким email не знайдено' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE email = ?',
      args: [hashed, email.toLowerCase()]
    })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/change-password  (потрібна авторизація)
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [req.user.id]
    })
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Невірний поточний пароль' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashed, user.id]
    })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
