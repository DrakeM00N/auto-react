// Display-only date/time helpers.
//
// Trips are stored as date='YYYY-MM-DD' and time='HH:MM' and ALWAYS represent
// local Ukrainian time (Europe/Kyiv) regardless of the user's browser zone.
//
// Storage and equality comparisons MUST keep using the ISO `YYYY-MM-DD` form
// — only call formatDate() at render sites.

const KYIV_TZ = 'Europe/Kyiv'

// 'YYYY-MM-DD' → 'DD-MM-YYYY'. Returns the input untouched on a malformed value,
// so a stray null/empty string never throws in the UI.
export function formatDate(iso) {
  if (typeof iso !== 'string') return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}-${m[2]}-${m[1]}`
}

// Components of "now" as seen in Kyiv. Intl handles DST automatically — no
// manual ±2/±3 offsets — so this works year-round for any caller TZ.
function nowInKyivParts() {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: KYIV_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]))
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  }
}

// True if the trip's scheduled departure moment (YYYY-MM-DD HH:MM treated as
// Europe/Kyiv local time) has already passed relative to the real current
// instant. Comparison is done on the canonical 'YYYYMMDDHHmm' string so we
// never construct a Date in the caller's local TZ.
export function isDeparted(trip) {
  if (!trip || typeof trip.date !== 'string' || typeof trip.time !== 'string') return false
  const dateM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trip.date)
  const timeM = /^(\d{2}):(\d{2})$/.exec(trip.time)
  if (!dateM || !timeM) return false
  const tripKey = `${dateM[1]}${dateM[2]}${dateM[3]}${timeM[1]}${timeM[2]}`
  const n = nowInKyivParts()
  const nowKey = `${n.year}${n.month}${n.day}${n.hour}${n.minute}`
  return nowKey >= tripKey
}
