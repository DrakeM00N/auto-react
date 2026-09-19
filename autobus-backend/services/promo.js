const { db } = require('../db')

// Округлення до копійок, щоб уникнути 999.9999999999 через плаваючу кому.
function round2(value) {
  return Math.round(value * 100) / 100
}

// Єдина точка перевірки промокоду — використовується і публічним
// /api/promo/validate (для попереднього показу знижки), і /api/payments/create
// (де це єдине джерело правди для суми, що піде у WayForPay). Ціна, порахована
// на фронтенді, ніколи не приймається як є.
async function validatePromo(rawCode, tripPrice) {
  const code = (rawCode || '').trim().toUpperCase()
  if (!code) return { valid: false, error: 'Введіть промокод' }

  const res = await db.execute({ sql: 'SELECT * FROM promo_codes WHERE code = ?', args: [code] })
  const promo = res.rows[0]
  if (!promo) return { valid: false, error: 'Промокод не знайдено' }
  if (!promo.active) return { valid: false, error: 'Цей промокод більше не активний' }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Термін дії промокоду закінчився' }
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { valid: false, error: 'Ліміт використань промокоду вичерпано' }
  }

  const discountPercent = promo.discount_percent
  const discountedPrice = round2(tripPrice * (1 - discountPercent / 100))

  return {
    valid: true,
    code,
    discountPercent,
    originalPrice: tripPrice,
    discountedPrice,
  }
}

// Викликається лише один раз — у момент підтвердження оплати (issueTicket),
// а не при простому створенні pending_booking, інакше незавершені/неоплачені
// спроби теж витрачали б ліміт використань.
async function incrementPromoUsage(code) {
  if (!code) return
  await db.execute({
    sql: 'UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?',
    args: [code],
  })
}

module.exports = { validatePromo, incrementPromoUsage, round2 }
