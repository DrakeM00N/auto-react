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

// Format `date` as Kyiv local time, ukr locale — "24.05.2026, 17:42" style.
// Kept inside the email module since this is the only consumer for now;
// move to a shared helper if other code starts formatting timestamps for UI.
function formatKyivTime(date) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function buildPasswordChangedEmailHtml(changedAtKyiv) {
  return `<!doctype html>
<html lang="uk">
  <body style="margin:0;padding:0;background:#F4F2EE;font-family:Helvetica,Arial,sans-serif;color:#1A1814;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="background:#FFFFFF;border-radius:16px;padding:32px;text-align:left;">
            <tr><td style="font-size:24px;font-weight:700;margin-bottom:16px;font-family:Georgia,serif;color:#1A1814;">Ваш пароль було змінено</td></tr>
            <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#333;">
              Пароль для вашого акаунта BusTour було успішно змінено.
            </td></tr>
            <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#333;">
              Час зміни: <strong>${changedAtKyiv}</strong> (за київським часом).
            </td></tr>
            <tr><td style="padding-top:24px;font-size:14px;line-height:1.6;color:#842029;background:#FDECEA;border:1px solid #F5C6CB;border-radius:10px;padding:16px;">
              <strong>Якщо ви НЕ змінювали пароль</strong> — негайно зверніться до підтримки.
              Можливо, ваш акаунт під загрозою: змініть пароль через «Забули пароль?» та повідомте нас.
            </td></tr>
            <tr><td style="padding-top:32px;font-size:12px;color:#999;">— Команда BusTour</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendPasswordChangedEmail(toEmail) {
  const changedAt = formatKyivTime(new Date())
  const client = getClient()
  if (!client) {
    // Same dev-tolerant behaviour as the reset email — we don't want
    // missing mail creds to break the password-change path.
    log.warn(`RESEND_API_KEY not set — would have notified ${toEmail} of password change at ${changedAt}`)
    return { delivered: false, dev: true }
  }
  try {
    const { error } = await client.emails.send({
      from: fromAddress,
      to: toEmail,
      subject: 'Ваш пароль BusTour було змінено',
      html: buildPasswordChangedEmailHtml(changedAt),
    })
    if (error) {
      log.error('Resend error (password-changed) for', toEmail, '-', error.message || error)
      return { delivered: false, error }
    }
    log.info('Password-changed notice sent to', toEmail)
    return { delivered: true }
  } catch (e) {
    log.error('Resend exception (password-changed) for', toEmail, '-', e.message)
    return { delivered: false, error: e }
  }
}

function buildTicketQrCodeUrl(ticketCode) {
  const encodedCode = encodeURIComponent(ticketCode || 'BusTour-ticket')
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodedCode}`
}

function buildTicketEmailHtml(ticket) {
  const qrCodeUrl = buildTicketQrCodeUrl(ticket?.ticketCode)
  const fromCity = ticket?.fromCity || 'Маршрут'
  const toCity = ticket?.toCity || 'Призначення'
  const departureAddr = ticket?.departurePoint || ticket?.boardingPoint || '—'
  const arrivalAddr = ticket?.arrivalPoint || ticket?.alightingPoint || '—'
  const tripDate = ticket?.tripDate
  ? ticket.tripDate.split('-').reverse().join('-')
  : ''
  const tripTime = ticket?.tripTime || ''
  const passenger = ticket?.passengerName || '—'
  const phone = ticket?.passengerPhone || '—'
  const price = ticket?.tripPrice ? `${ticket.tripPrice} грн` : '—'

  return `<!doctype html>
<html lang="uk">
  <body style="margin:0;padding:0;background:#1A1814;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;background:#1A1814;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="border-radius:20px;overflow:hidden;">

            <!-- Заголовок -->
            <tr>
              <td style="background:#E8A020;padding:20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#7A4A00;font-weight:700;">Електронний квиток</div>
                      <div style="font-size:26px;font-weight:900;color:#1A1814;font-family:Georgia,serif;">BusTour</div>
                    </td>
                    <td align="right">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7A4A00;">№ квитка</div>
                      <div style="font-size:20px;font-weight:800;color:#1A1814;letter-spacing:0.05em;">${ticket?.ticketCode || '—'}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Маршрут -->
            <tr>
              <td style="background:#242018;padding:24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="42%" valign="top">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Посадка</div>
                      <div style="font-size:22px;font-weight:800;color:#FFFFFF;padding-top:4px;">${fromCity}</div>
                      <div style="font-size:13px;color:#B0A070;padding-top:6px;line-height:1.4;">${departureAddr}</div>
                    </td>
                    <td width="16%" align="center" valign="middle" style="padding-top:16px;">
                      <div style="font-size:20px;">🚌</div>
                      <div style="border-top:2px dashed #E8A020;margin:6px 0;"></div>
                      <div style="font-size:11px;color:#8A7A50;">${ticket?.duration || ''}</div>
                    </td>
                    <td width="42%" valign="top" align="right">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Висадка</div>
                      <div style="font-size:22px;font-weight:800;color:#FFFFFF;padding-top:4px;">${toCity}</div>
                      <div style="font-size:13px;color:#B0A070;padding-top:6px;line-height:1.4;">${arrivalAddr}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Разделитель -->
            <tr>
              <td style="background:#1E1C16;padding:0 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="border-top:1px dashed #3A3520;padding:0;font-size:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Детали -->
            <tr>
              <td style="background:#1E1C16;padding:20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="50%" valign="top" style="padding-bottom:16px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Дата</div>
                      <div style="font-size:16px;font-weight:700;color:#FFFFFF;padding-top:4px;">${tripDate}</div>
                    </td>
                    <td width="50%" valign="top" style="padding-bottom:16px;">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Час</div>
                      <div style="font-size:16px;font-weight:700;color:#FFFFFF;padding-top:4px;">${tripTime}</div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" valign="top">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Пасажир</div>
                      <div style="font-size:16px;font-weight:700;color:#FFFFFF;padding-top:4px;">${passenger}</div>
                    </td>
                    <td width="50%" valign="top">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Телефон</div>
                      <div style="font-size:16px;font-weight:700;color:#FFFFFF;padding-top:4px;">${phone}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- QR + цена -->
            <tr>
              <td style="background:#1E1C16;padding:0 28px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="40%" valign="middle">
                      <img src="${qrCodeUrl}" alt="QR-код" width="160" height="160"
                           style="display:block;border-radius:12px;background:#fff;padding:8px;" />
                    </td>
                    <td width="60%" valign="middle" align="right">
                      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8A7A50;font-weight:700;">Вартість квитка</div>
                      <div style="font-size:32px;font-weight:900;color:#E8A020;padding-top:6px;">${price}</div>
                      <div style="margin-top:14px;display:inline-block;background:#E8A020;color:#1A1814;font-size:13px;font-weight:800;padding:10px 22px;border-radius:8px;letter-spacing:0.05em;">✓ ОПЛАЧЕНО</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Футер -->
            <tr>
              <td style="background:#141210;padding:16px 28px;border-radius:0 0 20px 20px;">
                <div style="font-size:12px;color:#5A5040;text-align:center;">
                  Покажіть QR-код водієві під час посадки — Команда BusTour
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendTicketEmail(toEmail, ticket) {
  const client = getClient()
  if (!client) {
    log.warn(`RESEND_API_KEY not set — ticket email not sent to ${toEmail}`)
    log.warn(`Ticket email fallback: ticketCode=${ticket?.ticketCode || 'unknown'}`)
    return { delivered: false, dev: true }
  }
  try {
    const { error } = await client.emails.send({
      from: fromAddress,
      to: toEmail,
      subject: 'Ваш квиток BusTour — посадка підтверджена',
      html: buildTicketEmailHtml(ticket),
    })
    if (error) {
      log.error('Resend error (ticket) for', toEmail, '-', error.message || error)
      return { delivered: false, error }
    }
    log.info('Ticket email sent to', toEmail)
    return { delivered: true }
  } catch (e) {
    log.error('Resend exception (ticket) for', toEmail, '-', e.message)
    return { delivered: false, error: e }
  }
}

module.exports = { sendPasswordResetEmail, sendPasswordChangedEmail, sendTicketEmail }
