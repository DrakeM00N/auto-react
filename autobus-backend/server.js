require('dotenv').config()

if (!process.env.JWT_SECRET) {
  // Pre-logger startup check — logger.js is fine to load this early, but
  // stderr direct is fine too and avoids any future logger config concerns.
  console.error('❌ JWT_SECRET is not set. Refusing to start with an unsigned/weak token secret.')
  process.exit(1)
}

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { initDB } = require('./db')
const { logger } = require('./logger')

const log = logger('server')

const app = express()

app.set('trust proxy', 1)

// FRONTEND_URL may be a comma-separated list (e.g. localhost + LAN IP for phone testing).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim()).filter(Boolean)
app.use(cors({ origin: allowedOrigins, credentials: true }))
// Raw body is captured in case a future webhook needs signature verification
// over the exact bytes; WayForPay signs JSON fields, so it doesn't need it.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth', authLimiter)

// Rate limiting for the public analytics tracking endpoint
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 events per minute
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/analytics/track', analyticsLimiter)

// Маршрути API
app.use('/api/auth', require('./routes/auth'))
app.use('/api/routes', require('./routes/routes'))
app.use('/api/trips', require('./routes/trips'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/users', require('./routes/users'))
app.use('/api/payments', require('./routes/payments'))
app.use('/api/tickets', require('./routes/tickets'))
app.use('/api/analytics', require('./routes/analytics'))

// Перевірка що сервер живий
app.get('/api/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001

initDB().then(() => {
  app.listen(PORT, () => {
    log.info(`Server listening on http://localhost:${PORT}`)
    log.info(`API base: http://localhost:${PORT}/api`)
  })
}).catch(err => {
  log.error('Startup failed:', err)
  process.exit(1)
})
