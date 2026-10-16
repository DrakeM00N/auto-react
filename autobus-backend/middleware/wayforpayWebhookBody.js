const express = require('express')

const captureText = express.text({
  type: () => true,
  verify: (req, res, buffer) => {
    req.rawBody = Buffer.from(buffer)
  },
})

function parseWebhookBody(req, res, next) {
  const rawBody = typeof req.body === 'string' ? req.body : ''
  if (!rawBody) {
    req.body = {}
    return next()
  }

  try {
    req.body = JSON.parse(rawBody)
    return next()
  } catch {
    // Continue with URL-encoded form parsing.
  }

  const entries = Array.from(new URLSearchParams(rawBody).entries())
  if (entries.length === 1) {
    for (const candidate of [entries[0][0], entries[0][1]]) {
      try {
        const parsed = JSON.parse(candidate)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          req.body = parsed
          return next()
        }
      } catch {
        // The other part of the single form entry may contain the JSON.
      }
    }
  }

  const formBody = {}
  for (const [key, value] of entries) {
    if (Object.hasOwn(formBody, key)) {
      formBody[key] = Array.isArray(formBody[key])
        ? [...formBody[key], value]
        : [formBody[key], value]
    } else {
      formBody[key] = value
    }
  }
  req.body = formBody
  next()
}

module.exports = [captureText, parseWebhookBody]
