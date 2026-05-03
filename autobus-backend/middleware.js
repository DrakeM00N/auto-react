const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'autobus-secret-key'

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потрібна авторизація' })
  }
  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Токен недійсний або застарілий' })
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ тільки для адміністраторів' })
    }
    next()
  })
}

module.exports = { authMiddleware, adminMiddleware }
