// Centralized API helper. Reads the JWT from localStorage on every call
// so consumers don't need to thread it through, and surfaces backend
// error messages as Error.message so UI code can render `e.message`.

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function getToken() {
  return localStorage.getItem('token')
}

export async function apiRequest(method, path, body) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error || (data.errors && data.errors[0]?.msg) || 'Помилка сервера'
    throw new Error(msg)
  }
  return data
}
