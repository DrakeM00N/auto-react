const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { db } = require('../db')
const { authMiddleware } = require('../middleware')

// In-memory storage for reset codes
const resetCodes = new Map() // email => { code, expiresAt }

// Generate a 6-digit numeric code
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Clean up expired codes (called on each request for simplicity)
function cleanupExpiredCodes() {
  const now = Date.now()
  for (const [email, { expiresAt }] of resetCodes.entries()) {
    if (now > expiresAt) {
      resetCodes.delete(email)
    }
  }
}

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

// POST /api/auth/request-reset
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email обов\'язковий' })
    }

    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    })
    if (result.rows.length === 0) {
      // Don't reveal that email doesn't exist - for security
      console.log(`Password reset requested for non-existent email: ${email}`)
      return res.json({ success: true, message: 'Если email существует, инструкции отправлены' })
    }

    // Generate and store reset code
    cleanupExpiredCodes()
    const code = generateResetCode()
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes
    resetCodes.set(email.toLowerCase(), { code, expiresAt })

    // Log the code (in production, this would be sent via email)
    console.log(`Password reset code for ${email}: ${code}`)

    res.json({ success: true, message: 'Если email существует, код отправлен на email' })
  } catch (e) {
    console.error('Error in request-reset:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, code } = req.body
    if (!email || !newPassword || !code) {
      return res.status(400).json({ error: 'Заповніть всі поля' })
    }

    cleanupExpiredCodes()
    const stored = resetCodes.get(email.toLowerCase())
    if (!stored) {
      return res.status(400).json({ error: 'Код сброса не найден или истёк' })
    }

    if (stored.code !== code.trim()) {
      return res.status(400).json({ error: 'Невірний код' })
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

    // Remove used code
    resetCodes.delete(email.toLowerCase())

    res.json({ success: true })
  } catch (e) {
    console.error('Error in reset-password:', e)
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
