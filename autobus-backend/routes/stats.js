const express = require('express')
const { db } = require('../db')

const router = express.Router()

// GET /api/stats — лічильники для головної (замість завантаження всіх рейсів)
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
    const [routesRes, tripsRes, citiesRes] = await Promise.all([
      db.execute('SELECT COUNT(*) AS n FROM routes'),
      db.execute('SELECT COUNT(*) AS n FROM trips'),
      db.execute('SELECT COUNT(*) AS n FROM (SELECT from_city AS city FROM routes UNION SELECT to_city FROM routes)'),
    ])
    res.json({
      routes: Number(routesRes.rows[0].n),
      trips: Number(tripsRes.rows[0].n),
      cities: Number(citiesRes.rows[0].n),
    })
  } catch (e) {
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
