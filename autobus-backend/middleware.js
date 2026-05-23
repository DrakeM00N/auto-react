const jwt = require('jsonwebtoken')
const { db } = require('./db')
const SECRET = process.env.JWT_SECRET

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потрібна авторизація' })
  }
  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, SECRET)
    // Fetch fresh user data from database including role
    const userResult = await db.execute({
      sql: 'SELECT id, name, email, role FROM users WHERE id = ?',
      args: [decoded.id]
    })
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Користувача не знайдено' })
    }
    req.user = userResult.rows[0]
    next()
  } catch {
    res.status(401).json({ error: 'Токен недійсний або застарілий' })
  }
}

async function adminMiddleware(req, res, next) {
  await authMiddleware(req, res, async () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ тільки для адміністраторів' })
    }
    next()
  })
}

module.exports = { authMiddleware, adminMiddleware }
