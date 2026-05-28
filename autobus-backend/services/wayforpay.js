const crypto = require('crypto')
const { logger } = require('../logger')

const log = logger('wayforpay')

// WayForPay (https://wiki.wayforpay.com/) — UAH-only acquiring.
const HPP_URL = 'https://secure.wayforpay.com/pay'
const API_URL = 'https://api.wayforpay.com/api'
const UAH = 'UAH'

const MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT
const SECRET_KEY = process.env.WAYFORPAY_SECRET_KEY
const MERCHANT_DOMAIN = process.env.WAYFORPAY_MERCHANT_DOMAIN

if (!SECRET_KEY) {
  log.warn('WAYFORPAY_SECRET_KEY not set — payments will not work until you add it to autobus-backend/.env')
}

// HMAC-MD5 of the fields joined by ';'. WayForPay's signature algorithm
// across requests, callbacks, and our reply is the same primitive — only
// the field list differs per direction.
function sign(fields) {
  return crypto
    .createHmac('md5', SECRET_KEY || '')
    .update(fields.join(';'))
    .digest('hex')
}

// Build the field set the frontend posts to HPP_URL. Same fields, same order
// as the signature payload — see WayForPay "Purchase" docs.
//   merchantAccount;merchantDomainName;orderReference;orderDate;
//   amount;currency;productName;productCount;productPrice
function createInvoice({ amountUah, reference, destination, redirectUrl, webHookUrl }) {
  if (!MERCHANT_ACCOUNT || !SECRET_KEY || !MERCHANT_DOMAIN) {
    throw new Error('WayForPay merchant credentials are not configured')
  }
  const orderDate = Math.floor(Date.now() / 1000)
  const amount = Number(amountUah).toFixed(2)
  const productName = destination
  const productCount = 1
  const productPrice = amount

  const signature = sign([
    MERCHANT_ACCOUNT,
    MERCHANT_DOMAIN,
    reference,
    orderDate,
    amount,
    UAH,
    productName,
    productCount,
    productPrice,
  ])

  const fields = {
    merchantAccount: MERCHANT_ACCOUNT,
    merchantDomainName: MERCHANT_DOMAIN,
    merchantSignature: signature,
    orderReference: reference,
    orderDate: String(orderDate),
    amount,
    currency: UAH,
    productName,
    productCount: String(productCount),
    productPrice,
    language: 'UA',
  }
  if (redirectUrl) fields.returnUrl = redirectUrl
  if (webHookUrl) fields.serviceUrl = webHookUrl

  // Keep parity with the prior monobank shape so callers don't care which gateway is wired.
  return { invoiceId: reference, pageUrl: HPP_URL, formUrl: HPP_URL, fields }
}

// CHECK_STATUS — used by /status polling. Returns the raw `transactionStatus`
// string (Approved | Declined | Expired | InProcessing | Pending | Refunded |
// Voided | WaitingAuthComplete | ...) or null.
async function requestInvoiceStatus(orderReference) {
  if (!orderReference) return null
  try {
    const merchantSignature = sign([MERCHANT_ACCOUNT, orderReference])
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionType: 'CHECK_STATUS',
        merchantAccount: MERCHANT_ACCOUNT,
        orderReference,
        merchantSignature,
        apiVersion: 1,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.transactionStatus || null
  } catch (e) {
    log.error('status request failed:', e.message)
    return null
  }
}

// Webhook fields WayForPay signs (Purchase callback):
//   merchantAccount;orderReference;amount;currency;authCode;cardPan;
//   transactionStatus;reasonCode
function verifyWebhookSignature(body) {
  if (!body || !body.merchantSignature) return false
  const expected = sign([
    body.merchantAccount,
    body.orderReference,
    body.amount,
    body.currency,
    body.authCode,
    body.cardPan,
    body.transactionStatus,
    body.reasonCode,
  ])
  // Constant-time compare to avoid timing leaks on the secret-derived hash.
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(body.merchantSignature), 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// WayForPay requires the webhook response to be JSON with our own signature.
// Without it the gateway will keep retrying.
function buildWebhookReply(orderReference, status = 'accept') {
  const time = Math.floor(Date.now() / 1000)
  const signature = sign([orderReference, status, time])
  return { orderReference, status, time, signature }
}

module.exports = {
  createInvoice,
  requestInvoiceStatus,
  verifyWebhookSignature,
  buildWebhookReply,
}
