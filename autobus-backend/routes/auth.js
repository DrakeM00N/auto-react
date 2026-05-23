const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { db } = require('../db')
const { authMiddleware } = require('../middleware')
const { body, validationResult } = require('express-validator')
const { OAuth2Client } = require('google-auth-library')

// Generate a reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

const router = express.Router()
const SECRET = process.env.JWT_SECRET
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// POST /api/auth/register
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/\d/).withMessage('Password must contain at least one digit')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { name, email, password } = req.body

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

    const user = { id: Number(result.lastInsertRowid), name: name.trim(), email: email.toLowerCase() }
    const token = jwt.sign(user, SECRET, { expiresIn: '7d' })

    res.json({ token, user: { ...user, hasPassword: true } })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

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

    const now = new Date().toISOString()
    await db.execute({
      sql: 'UPDATE users SET last_login = ? WHERE id = ?',
      args: [now, user.id]
    })

    const userData = { id: user.id, name: user.name, email: user.email, lastLogin: now }
    const token = jwt.sign(userData, SECRET, { expiresIn: '7d' })

    res.json({ token, user: { ...userData, hasPassword: true } })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential) {
      return res.status(400).json({ error: 'Відсутній токен Google' })
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Вхід через Google не налаштовано на сервері' })
    }

    // Verify the Google ID token (checks signature, audience, issuer, expiry)
    let payload
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch (e) {
      return res.status(401).json({ error: 'Недійсний токен Google' })
    }

    if (!payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Google не підтвердив цю електронну адресу' })
    }

    const email = payload.email.toLowerCase()
    const googleId = payload.sub
    const name = (payload.name || '').trim() || email

    let userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    })
    let user = userResult.rows[0]

    if (user) {
      // Existing account with this email — link the Google identity if not linked yet
      if (!user.google_id) {
        await db.execute({
          sql: 'UPDATE users SET google_id = ? WHERE id = ?',
          args: [googleId, user.id]
        })
      }
    } else {
      // First contact via Google — create a Google-only account (no password)
      const result = await db.execute({
        sql: 'INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)',
        args: [name, email, googleId]
      })
      userResult = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [Number(result.lastInsertRowid)]
      })
      user = userResult.rows[0]
    }

    const now = new Date().toISOString()
    await db.execute({
      sql: 'UPDATE users SET last_login = ? WHERE id = ?',
      args: [now, user.id]
    })

    const userData = { id: user.id, name: user.name, email: user.email, lastLogin: now }
    const token = jwt.sign(userData, SECRET, { expiresIn: '7d' })

    res.json({ token, user: { ...userData, hasPassword: !!user.password } })
  } catch (e) {
    console.error('Error in google auth:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// POST /api/auth/request-reset
router.post('/request-reset',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body

    // Check if user exists (don't reveal if not for security)
    const userResult = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()]
    })
    if (userResult.rows.length === 0) {
      // Don't reveal that email doesn't exist - for security
      return res.json({ success: true, message: 'If email exists, reset instructions have been sent' })
    }

    // Generate reset token
    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes

    await db.execute({
      sql: 'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      args: [email.toLowerCase(), token, expiresAt]
    })

    // No email transport is wired up. In production, refuse to operate
    // rather than silently dropping the token (would leak via dev logs
    // and let any log-reader take over accounts).
    if (process.env.NODE_ENV === 'production') {
      console.error('Password reset requested but no email transport configured')
      return res.status(503).json({ error: 'Password reset is not available right now' })
    }
    console.log(`[dev] Password reset token for ${email}: ${token}`)

    res.json({ success: true, message: 'If email exists, reset instructions have been sent' })
  } catch (e) {
    console.error('Error in request-reset:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, token } = req.body
    if (!email || !newPassword || !token) {
      return res.status(400).json({ error: 'Please fill all fields' })
    }

    // Find valid reset token
    const resetResult = await db.execute({
      sql: 'SELECT * FROM password_resets WHERE email = ? AND token = ? AND used = 0 AND expires_at > ?',
      args: [email.toLowerCase(), token, new Date().toISOString()]
    })

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Update user password
    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE email = ?',
      args: [hashed, email.toLowerCase()]
    })

    // Mark token as used
    await db.execute({
      sql: 'UPDATE password_resets SET used = 1 WHERE email = ? AND token = ?',
      args: [email.toLowerCase(), token]
    })

    res.json({ success: true })
  } catch (e) {
    console.error('Error in reset-password:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/change-password  (потрібна авторизація)
router.post('/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
      .matches(/\d/).withMessage('New password must contain at least one digit')
  ],
  authMiddleware, async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { currentPassword, newPassword } = req.body
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [req.user.id]
    })
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' })

    if (!user.password) {
      return res.status(400).json({ error: 'Цей акаунт використовує вхід через Google і не має пароля' })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Невірний поточний пароль' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashed, user.id]
    })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
