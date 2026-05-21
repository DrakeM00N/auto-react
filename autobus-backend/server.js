require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const { initDB } = require('./db')

const app = express()

// FRONTEND_URL may be a comma-separated list (e.g. localhost + LAN IP for phone testing).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim()).filter(Boolean)
app.use(cors({ origin: allowedOrigins, credentials: true }))
// Keep the raw body around so monobank webhook signatures can be verified.
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

// Маршрути API
app.use('/api/auth', require('./routes/auth'))
app.use('/api/routes', require('./routes/routes'))
app.use('/api/trips', require('./routes/trips'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/users', require('./routes/users'))
app.use('/api/payments', require('./routes/payments'))
app.use('/api/tickets', require('./routes/tickets'))

// Перевірка що сервер живий
app.get('/api/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено: http://localhost:${PORT}`)
    console.log(`📋 API доступне на: http://localhost:${PORT}/api`)
  })
}).catch(err => {
  console.error('❌ Помилка запуску:', err)
  process.exit(1)
})
