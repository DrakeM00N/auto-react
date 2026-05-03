require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { initDB } = require('./db')

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Маршрути API
app.use('/api/auth', require('./routes/auth'))
app.use('/api/routes', require('./routes/routes'))
app.use('/api/trips', require('./routes/trips'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/users', require('./routes/users'))

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
