const express = require('express')
const { loadTicketByCode } = require('../services/ticketing')
const { logger } = require('../logger')

const router = express.Router()
const log = logger('tickets')

// GET /api/tickets/:code — public ticket lookup / verification.
// The opaque ticket code is the bearer credential: whoever holds it can view
// the ticket. Used by the success page, the standalone ticket page, and as
// the target a scanned QR code resolves to.
router.get('/:code', async (req, res) => {
  try {
    const ticket = await loadTicketByCode(req.params.code)
    if (!ticket) return res.status(404).json({ error: 'Квиток не знайдено' })
    if (ticket.status === 'cancelled') {
      return res.json({ valid: false, reason: 'Бронювання скасовано' })
    }
    res.json(ticket)
  } catch (e) {
    log.error('GET /api/tickets/:code:', e)
    res.status(500).json({ error: 'Помилка сервера' })
  }
})

module.exports = router
