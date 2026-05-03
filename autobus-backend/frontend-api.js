// src/api.js
// Цей файл замінює всі звернення до localStorage — тепер дані йдуть на сервер

const BASE = 'http://localhost:3001/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Помилка сервера')
  return data
}

// --- Auth ---
export const api = {
  // Авторизація
  register: (name, email, password) =>
    request('POST', '/auth/register', { name, email, password }),

  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  resetPassword: (email, newPassword) =>
    request('POST', '/auth/reset-password', { email, newPassword }),

  changePassword: (currentPassword, newPassword) =>
    request('POST', '/auth/change-password', { currentPassword, newPassword }),

  // Маршрути
  getRoutes: () => request('GET', '/routes'),
  addRoute: (route) => request('POST', '/routes', route),
  updateRoute: (id, data) => request('PUT', `/routes/${id}`, data),
  deleteRoute: (id) => request('DELETE', `/routes/${id}`),

  // Рейси
  getTrips: () => request('GET', '/trips'),
  addTrip: (trip) => request('POST', '/trips', trip),
  updateTrip: (id, data) => request('PUT', `/trips/${id}`, data),
  deleteTrip: (id) => request('DELETE', `/trips/${id}`),

  // Бронювання
  bookTrip: (tripId, passengerName, passengerPhone) =>
    request('POST', '/bookings', { tripId, passengerName, passengerPhone }),

  getMyBookings: () => request('GET', '/bookings/my'),
  getAllBookings: () => request('GET', '/bookings'),
  updateBooking: (id, data) => request('PUT', `/bookings/${id}`, data),
  cancelBooking: (id) => request('DELETE', `/bookings/${id}`),

  // Користувачі (адмін)
  getUsers: () => request('GET', '/users'),
  promoteUser: (id) => request('POST', `/users/${id}/promote`),
}
