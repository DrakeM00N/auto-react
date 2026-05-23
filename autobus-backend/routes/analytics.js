const express = require('express')
const crypto = require('crypto')
const { db } = require('../db')
const { adminMiddleware } = require('../middleware')

const router = express.Router()

// Whitelisted event names — also the funnel step order
const EVENT_NAMES = [
  'page_view',
  'search_performed',
  'booking_started',
  'booking_submitted',
  'booking_completed',
]

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|monitor|preview/i
const IP_SALT = process.env.ANALYTICS_IP_SALT || 'autobus-analytics-salt'
const MAX_PROPS_BYTES = 2000

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip) + IP_SALT).digest('hex')
}

// Convert ?range=7|30 into a SQLite datetime modifier; defaults to 30 days
function rangeOffset(range) {
  const days = String(range) === '7' ? 7 : 30
  return `-${days} days`
}

// POST /api/analytics/track — public.
// navigator.sendBeacon sends a text/plain body, so we parse it as text here
// (the global express.json() only handles application/json and skips this).
router.post('/track', express.text({ type: '*/*', limit: '8kb' }), async (req, res) => {
  try {
    // Drop obvious bot traffic so it never pollutes the funnel
    const ua = req.headers['user-agent'] || ''
    if (BOT_UA.test(ua)) return res.status(204).end()

    let payload
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).end()
    }
    if (!payload || typeof payload !== 'object') return res.status(400).end()

    const { name, props, path, visitorId, sessionId, userId } = payload
    if (!EVENT_NAMES.includes(name)) return res.status(400).end()

    // Size-cap the props blob
    let propsStr = '{}'
    if (props && typeof props === 'object') {
      const s = JSON.stringify(props)
      if (s.length <= MAX_PROPS_BYTES) propsStr = s
    }

    const ip = req.ip || req.socket?.remoteAddress || ''

    await db.execute({
      sql: `INSERT INTO events (name, visitor_id, session_id, user_id, path, props, ip_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        typeof visitorId === 'string' ? visitorId.slice(0, 64) : null,
        typeof sessionId === 'string' ? sessionId.slice(0, 64) : null,
        Number.isInteger(userId) ? userId : null,
        typeof path === 'string' ? path.slice(0, 256) : null,
        propsStr,
        hashIp(ip),
      ],
    })

    res.status(204).end()
  } catch (err) {
    // Analytics must never surface an error to the client
    console.error('analytics track error:', err.message)
    res.status(204).end()
  }
})

// GET /api/analytics/funnel?range=7|30 — admin only.
// Each step is the number of distinct sessions that produced that event.
router.get('/funnel', adminMiddleware, async (req, res) => {
  try {
    const offset = rangeOffset(req.query.range)
    const result = await db.execute({
      sql: `SELECT name,
                   COUNT(DISTINCT session_id) AS sessions,
                   COUNT(*) AS events
            FROM events
            WHERE name IN (${EVENT_NAMES.map(() => '?').join(',')})
              AND created_at >= datetime('now', ?)
            GROUP BY name`,
      args: [...EVENT_NAMES, offset],
    })

    const byName = {}
    for (const row of result.rows) byName[row.name] = row

    const base = Number(byName['page_view']?.sessions || 0)
    const steps = EVENT_NAMES.map(name => {
      const sessions = Number(byName[name]?.sessions || 0)
      const events = Number(byName[name]?.events || 0)
      return {
        name,
        sessions,
        events,
        pct: base > 0 ? Math.round((sessions / base) * 1000) / 10 : 0,
      }
    })

    res.json({ rangeDays: offset === '-7 days' ? 7 : 30, steps })
  } catch (err) {
    console.error('analytics funnel error:', err.message)
    res.status(500).json({ error: 'Помилка завантаження аналітики' })
  }
})

// GET /api/analytics/search-demand?range=7|30 — admin only.
// Aggregates search_performed events by from/to so you can see which
// directions visitors look for — including ones with no matching trips.
router.get('/search-demand', adminMiddleware, async (req, res) => {
  try {
    const offset = rangeOffset(req.query.range)
    const result = await db.execute({
      sql: `SELECT
              COALESCE(NULLIF(json_extract(props, '$.from'), ''), '—') AS from_city,
              COALESCE(NULLIF(json_extract(props, '$.to'), ''), '—') AS to_city,
              COUNT(*) AS searches,
              SUM(CASE WHEN CAST(json_extract(props, '$.results_count') AS INTEGER) = 0
                       THEN 1 ELSE 0 END) AS zero_results
            FROM events
            WHERE name = 'search_performed'
              AND created_at >= datetime('now', ?)
            GROUP BY from_city, to_city
            ORDER BY searches DESC
            LIMIT 25`,
      args: [offset],
    })

    const rows = result.rows.map(r => {
      const searches = Number(r.searches)
      const zeroResults = Number(r.zero_results)
      return {
        from: r.from_city,
        to: r.to_city,
        searches,
        zeroResults,
        // true = every search for this direction returned nothing (unmet demand)
        noTrips: searches > 0 && zeroResults === searches,
      }
    })

    res.json({ rows })
  } catch (err) {
    console.error('analytics search-demand error:', err.message)
    res.status(500).json({ error: 'Помилка завантаження аналітики' })
  }
})

module.exports = router
