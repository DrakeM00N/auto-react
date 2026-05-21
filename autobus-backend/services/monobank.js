const crypto = require('crypto')

// monobank acquiring API ("Plata by mono") — https://api.monobank.ua/docs/acquiring.html
const API_BASE = 'https://api.monobank.ua'
const TOKEN = process.env.MONOBANK_TOKEN
const UAH = 980 // ISO 4217 numeric code

// Create an invoice. amountUah is in hryvnia (e.g. 350); monobank wants kopecks.
// Returns { invoiceId, pageUrl } — pageUrl is where the customer pays.
async function createInvoice({ amountUah, reference, destination, redirectUrl, webHookUrl, validitySeconds }) {
  const body = {
    amount: Math.round(amountUah * 100),
    ccy: UAH,
    merchantPaymInfo: { reference, destination },
    redirectUrl,
    validity: validitySeconds,
    paymentType: 'debit',
  }
  if (webHookUrl) body.webHookUrl = webHookUrl

  const res = await fetch(`${API_BASE}/api/merchant/invoice/create`, {
    method: 'POST',
    headers: { 'X-Token': TOKEN || '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.errText || data.errorDescription || `monobank invoice create failed (${res.status})`)
  }
  return { invoiceId: data.invoiceId, pageUrl: data.pageUrl }
}

// Ask monobank for an invoice's current status. Returns the raw status string
// (created | processing | hold | success | failure | reversed | expired) or null.
async function requestInvoiceStatus(invoiceId) {
  if (!invoiceId) return null
  try {
    const res = await fetch(
      `${API_BASE}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
      { headers: { 'X-Token': TOKEN || '' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.status || null
  } catch (e) {
    console.error('monobank status request failed:', e.message)
    return null
  }
}

// monobank's public key is used to verify webhook signatures. It rarely
// changes, so it is cached and only refetched when verification fails.
let cachedPubKey = null
async function getPublicKey(forceRefresh = false) {
  if (cachedPubKey && !forceRefresh) return cachedPubKey
  const res = await fetch(`${API_BASE}/api/merchant/pubkey`, { headers: { 'X-Token': TOKEN || '' } })
  if (!res.ok) throw new Error(`monobank pubkey request failed (${res.status})`)
  const data = await res.json()
  cachedPubKey = Buffer.from(data.key, 'base64').toString('utf-8') // base64 -> PEM
  return cachedPubKey
}

// Verify a webhook's X-Sign header (base64 ECDSA/SHA-256 signature, DER) against
// the RAW request body bytes. Re-serialised JSON would break the check.
async function verifyWebhookSignature(rawBody, xSignBase64) {
  if (!rawBody || !xSignBase64) return false
  const signature = Buffer.from(xSignBase64, 'base64')

  const check = (pem) => {
    const verifier = crypto.createVerify('SHA256')
    verifier.update(rawBody)
    verifier.end()
    return verifier.verify(pem, signature)
  }

  try {
    if (check(await getPublicKey())) return true
    // The signing key may have rotated — refetch once and retry.
    return check(await getPublicKey(true))
  } catch (e) {
    console.error('monobank webhook verification error:', e.message)
    return false
  }
}

module.exports = { createInvoice, requestInvoiceStatus, verifyWebhookSignature }
