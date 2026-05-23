// Lightweight first-party usage tracking.
// Events are sent via navigator.sendBeacon so they survive page navigation
// (critical for page_view and booking_completed, which fire as the page unloads).
// Nothing here may ever throw into the app — analytics failures are swallowed.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TRACK_URL = `${BASE}/analytics/track`

const VISITOR_KEY = 'analytics-visitor-id'
const SESSION_KEY = 'analytics-session-id'

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Persistent across visits — used for returning-visitor analysis
export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

// Resets when the tab closes — funnels are windowed by session
export function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = uuid()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

function getUserId() {
  try {
    const saved = localStorage.getItem('app-current-user')
    if (!saved) return null
    const user = JSON.parse(saved)
    return Number.isInteger(user?.id) ? user.id : null
  } catch {
    return null
  }
}

export function track(name, props = {}) {
  try {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return
    const payload = JSON.stringify({
      name,
      props,
      path: window.location.pathname + window.location.search,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      userId: getUserId(),
    })
    // A plain string body is sent as text/plain — a CORS-safelisted
    // request, so it works cross-origin without a preflight.
    navigator.sendBeacon(TRACK_URL, payload)
  } catch {
    // analytics must never break the app
  }
}

// Deduped page-view tracking: skips consecutive identical paths, which also
// absorbs React StrictMode's double-invoked effects in development.
let lastPageViewPath = null

export function trackPageView() {
  try {
    const path = window.location.pathname + window.location.search
    if (path === lastPageViewPath) return
    lastPageViewPath = path
    track('page_view', {})
  } catch {
    // ignore
  }
}
