const express = require('express')
const { adminMiddleware } = require('../middleware')
const { generateUpcomingTrips } = require('../services/scheduleGenerator')

const router = express.Router()

router.post('/generate', adminMiddleware, async (req, res) => {
  try {
    const created = await generateUpcomingTrips()
    res.json({ created })
  } catch (error) {
    res.status(500).json({ error: 'Не вдалося згенерувати рейси' })
  }
})

module.exports = router
