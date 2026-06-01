const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const { db } = require('../db')
const { authMiddleware } = require('../middleware')
const { body, validationResult } = require('express-validator')
const { OAuth2Client } = require('google-auth-library')
const { logger } = require('../logger')
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/email')

const log = logger('auth')

// Generate a reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

const router = express.Router()
const SECRET = process.env.JWT_SECRET
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

// Emails listed in ADMIN_EMAILS get role='admin' on registration. This is the
// recovery path after a DB reset — without it, the first user has to be
// promoted by hand (chicken-and-egg with adminMiddleware). Lower-cased on
// load so the lookup matches email.toLowerCase() at signup time.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
)

// Build an INSERT statement that picks role='admin' atomically when (a) the
// caller-supplied flag says so (ADMIN_EMAILS hit) or (b) the users table is
// still empty (first-user-admin bootstrap). The COUNT subquery is evaluated
// against the table state before this insert, so two concurrent registrations
// can both see COUNT=0 only if SQLite ever runs writes in parallel — it
// doesn't, single writer at a time. Race window is effectively zero.
function insertUserSql(columns, placeholders, forceAdmin) {
  // role column is appended after the caller's columns.
  return {
    sql: `INSERT INTO users (${columns.join(', ')}, role)
          VALUES (${placeholders.join(', ')},
                  CASE WHEN ? = 1 THEN 'admin'
                       WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'admin'
                       ELSE 'user' END)`,
    forceAdminArg: forceAdmin ? 1 : 0,
  }
}

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
    const normalizedEmail = email.toLowerCase()
    const trimmedName = name.trim()
    const stmt = insertUserSql(
      ['name', 'email', 'password'],
      ['?', '?', '?'],
      ADMIN_EMAILS.has(normalizedEmail),
    )
    const result = await db.execute({
      sql: stmt.sql,
      args: [trimmedName, normalizedEmail, hashed, stmt.forceAdminArg],
    })

    // Read back the role since the INSERT decided it via a CASE expression.
    const userRow = (await db.execute({
      sql: 'SELECT id, name, email, role FROM users WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    })).rows[0]

    const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })

    res.json({ token, user: { ...user, hasPassword: true } })
  } catch (e) {
    log.error('register:', e)
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

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, lastLogin: now }
    const token = jwt.sign(userData, SECRET, { expiresIn: '30d' })

    res.json({ token, user: { ...userData, hasPassword: true } })
  } catch (e) {
    log.error('login:', e)
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
      // First contact via Google — create a Google-only account (no password).
      // Same atomic role-bootstrap as /register.
      const stmt = insertUserSql(
        ['name', 'email', 'google_id'],
        ['?', '?', '?'],
        ADMIN_EMAILS.has(email),
      )
      const result = await db.execute({
        sql: stmt.sql,
        args: [name, email, googleId, stmt.forceAdminArg],
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

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, lastLogin: now }
    const token = jwt.sign(userData, SECRET, { expiresIn: '30d' })

    res.json({ token, user: { ...userData, hasPassword: !!user.password } })
  } catch (e) {
    log.error('google auth:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

// Tighter rate limit specifically for the forgot-password endpoint — 5 per
// IP per hour. The global /api/auth limiter (20 / 15 min) is too generous
// for a fan-out vector like password reset, and would also be consumed by
// legitimate login attempts on the same IP.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Забагато спроб скидання пароля. Спробуйте пізніше.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// POST /api/auth/forgot-password
// Anti-enumeration: the response is identical whether or not the email is
// registered. The email is only really sent (and a token only really
// created) when an account exists, but the client can't tell from outside.
router.post('/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Невірний формат email')],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      // Format errors are about MALFORMED input, not enumeration — safe to
      // surface specifically so the user sees "fix your email syntax."
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg })
      }

      const email = (req.body.email || '').trim().toLowerCase()
      const generic = { success: true, message: 'Якщо акаунт існує, ми надіслали лист з посиланням.' }

      const userResult = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [email],
      })
      if (userResult.rows.length === 0) {
        // Don't tell the client. Log server-side for analytics.
        log.info(`forgot-password: no account for ${email} — silent success`)
        return res.json(generic)
      }

      const token = generateResetToken()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h
      await db.execute({
        sql: 'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
        args: [email, token, expiresAt],
      })

      // FRONTEND_URL may be a comma-separated list (CORS allowlist). The
      // first entry is treated as the canonical public URL for outbound
      // links — no hardcoded domain anywhere.
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')[0].trim()
      const resetLink = `${frontendUrl}/reset-password?token=${token}`

      // Failures are logged inside the service. We don't fail the request
      // even if delivery hiccups — the user shouldn't be able to detect
      // outbound-mail outages either.
      await sendPasswordResetEmail(email, resetLink)

      res.json(generic)
    } catch (e) {
      log.error('forgot-password:', e)
      res.status(500).json({ error: 'Помилка сервера' })
    }
  }
)

// POST /api/auth/reset-password
// Token is the only credential; the email it's bound to comes from the
// password_resets row, not the client. Client only sends { newPassword, token }.
router.post('/reset-password', async (req, res) => {
  try {
    const { newPassword, token } = req.body
    if (!token) {
      return res.status(400).json({ error: 'Недійсне або застаріле посилання.' })
    }
    if (!newPassword) {
      return res.status(400).json({ error: 'Заповніть усі поля.' })
    }
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Пароль має містити щонайменше 8 символів та хоча б одну цифру.' })
    }

    const resetResult = await db.execute({
      sql: 'SELECT email FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?',
      args: [token, new Date().toISOString()],
    })
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Посилання недійсне або застаріле.' })
    }
    const email = resetResult.rows[0].email

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE email = ?',
      args: [hashed, email],
    })
    await db.execute({
      sql: 'UPDATE password_resets SET used = 1 WHERE token = ?',
      args: [token],
    })

    // Notify the account owner that their password just changed. A failed
    // notice must NOT block the response — the password change already
    // succeeded and the user is waiting on this request.
    sendPasswordChangedEmail(email).catch(e => log.error('post-reset notice failed:', e))

    res.json({ success: true })
  } catch (e) {
    log.error('reset-password:', e)
    res.status(500).json({ error: 'Помилка сервера' })
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

    // Security notice — same fire-and-forget treatment as in /reset-password.
    sendPasswordChangedEmail(user.email).catch(e => log.error('post-change notice failed:', e))

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
