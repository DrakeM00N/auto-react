// Transactional email via Resend (https://resend.com).
//
// The service intentionally fails OPEN in dev: if RESEND_API_KEY is missing,
// we don't throw — we log a warning and dump the reset link to stdout so the
// developer can copy/paste it. In production this would silently break the
// flow without warning; if you set NODE_ENV=production and forget the key,
// the caller (routes/auth.js) is responsible for refusing to operate.
//
// EMAIL_FROM accepts the Resend format "Name <addr@domain>"; for the very
// first dev test you can use 'BusTour <onboarding@resend.dev>' — Resend lets
// you send from that sandbox sender ONLY to the account-owner's email. For
// production, verify your own domain in the Resend dashboard and switch
// EMAIL_FROM to noreply@your-domain.

const { Resend } = require('resend')
const { logger } = require('../logger')

const log = logger('email')

const apiKey = process.env.RESEND_API_KEY
const fromAddress = process.env.EMAIL_FROM || 'BusTour <onboarding@resend.dev>'

// Lazy-init the client so a missing key doesn't blow up at module load.
let resendClient = null
function getClient() {
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

function buildResetEmailHtml(resetLink) {
  // Inline styles only — most email clients strip <style> blocks. Colours
  // mirror the app's amber accent; we keep this template self-contained so
  // it never bleeds CSS-vars (those don't resolve in mail clients).
  return `<!doctype html>
<html lang="uk">
  <body style="margin:0;padding:0;background:#F4F2EE;font-family:Helvetica,Arial,sans-serif;color:#1A1814;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="background:#FFFFFF;border-radius:16px;padding:32px;text-align:left;">
            <tr><td style="font-size:24px;font-weight:700;margin-bottom:16px;font-family:Georgia,serif;color:#1A1814;">Скидання пароля</td></tr>
            <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#333;">
              Ви запросили скидання пароля для свого акаунта BusTour. Натисніть кнопку нижче, щоб задати новий пароль:
            </td></tr>
            <tr><td style="padding-top:24px;" align="left">
              <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:#E8A020;color:#1A1814;text-decoration:none;border-radius:8px;font-weight:700;">
                Скинути пароль
              </a>
            </td></tr>
            <tr><td style="padding-top:24px;font-size:13px;color:#777;line-height:1.6;">
              Або скопіюйте посилання у браузер:<br>
              <span style="word-break:break-all;color:#1A1814;">${resetLink}</span>
            </td></tr>
            <tr><td style="padding-top:24px;font-size:13px;color:#777;line-height:1.6;">
              Посилання дійсне 1 годину. Якщо ви не запитували скидання пароля — просто проігноруйте цей лист.
            </td></tr>
            <tr><td style="padding-top:32px;font-size:12px;color:#999;">— Команда BusTour</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const client = getClient()
  if (!client) {
    // Dev path: log the link so it's recoverable from server stdout.
    log.warn(`RESEND_API_KEY not set — would have sent reset link to ${toEmail}`)
    log.warn(`[dev] reset link: ${resetLink}`)
    return { delivered: false, dev: true }
  }
  try {
    const { error } = await client.emails.send({
      from: fromAddress,
      to: toEmail,
      subject: 'Скидання пароля BusTour',
      html: buildResetEmailHtml(resetLink),
    })
    if (error) {
      log.error('Resend error for', toEmail, '-', error.message || error)
      return { delivered: false, error }
    }
    log.info('Reset email sent to', toEmail)
    return { delivered: true }
  } catch (e) {
    log.error('Resend exception for', toEmail, '-', e.message)
    return { delivered: false, error: e }
  }
}

module.exports = { sendPasswordResetEmail }
