import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext()

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

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark')
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app-current-user')
    try { return saved ? JSON.parse(saved) : null } catch { return null }
  })
  const [routes, setRoutes] = useState([])
  const [trips, setTrips] = useState([])
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Тема
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // Завантажуємо дані з сервера
  const loadData = useCallback(async () => {
    try {
      const [routesData, tripsData] = await Promise.all([
        request('GET', '/routes'),
        request('GET', '/trips'),
      ])
      setRoutes(routesData)
      setTrips(tripsData)

      if (currentUser) {
        const bookingsData = await request('GET', '/bookings/my')
        setBookings(bookingsData)

        if (currentUser.role === 'admin') {
          const [allBookings, usersData] = await Promise.all([
            request('GET', '/bookings'),
            request('GET', '/users'),
          ])
          setBookings(allBookings)
          setUsers(usersData)
        }
      }
    } catch (e) {
      console.error('Помилка завантаження даних:', e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Авторизація ---
  const register = async (name, email, password) => {
    try {
      const { token, user } = await request('POST', '/auth/register', { name, email, password })
      localStorage.setItem('token', token)
      localStorage.setItem('app-current-user', JSON.stringify(user))
      setCurrentUser(user)
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const login = async (email, password) => {
    try {
      const { token, user } = await request('POST', '/auth/login', { email, password })
      localStorage.setItem('token', token)
      localStorage.setItem('app-current-user', JSON.stringify(user))
      setCurrentUser(user)
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('app-current-user')
    setCurrentUser(null)
    setBookings([])
    setUsers([])
  }

  const promoteUser = async (userId) => {
    try {
      await request('POST', `/users/${userId}/promote`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin' } : u))
    } catch (e) {
      console.error(e.message)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await request('POST', '/auth/change-password', { currentPassword, newPassword })
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const resetPassword = async (email, newPassword) => {
    try {
      await request('POST', '/auth/reset-password', { email, newPassword })
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  // --- Маршрути ---
const addRoute = async (route) => {
  try {
    await request('POST', '/routes', {
      ...route,
      stops: typeof route.stops === 'string'
        ? route.stops.split(',').map(s => s.trim()).filter(Boolean)
        : route.stops,
    })
    // Перезавантажуємо всі маршрути з сервера
    const updated = await request('GET', '/routes')
    setRoutes(updated)
  } catch (e) { console.error(e.message) }
}

  const updateRoute = async (id, data) => {
    try {
      await request('PUT', `/routes/${id}`, {
        ...data,
        stops: typeof data.stops === 'string'
          ? data.stops.split(',').map(s => s.trim()).filter(Boolean)
          : (data.stops || []),
      })
      const updated = await request('GET', '/routes')
      setRoutes(updated)
    } catch (e) { console.error(e.message) }
  }

  const deleteRoute = async (id) => {
    try {
      await request('DELETE', `/routes/${id}`)
      setRoutes(prev => prev.filter(r => r.id !== id))
      // рейси і бронювання видаляються каскадно на сервері
      const tripsData = await request('GET', '/trips')
      setTrips(tripsData)
      if (currentUser?.role === 'admin') {
        const allBookings = await request('GET', '/bookings')
        setBookings(allBookings)
      }
    } catch (e) { console.error(e.message) }
  }

  // --- Рейси ---
const addTrip = async (trip) => {
  try {
    await request('POST', '/trips', {
      routeId: Number(trip.routeId),
      date: trip.date,
      time: trip.time,
      price: Number(trip.price),
      seats: Number(trip.seats),
    })
    // Перезавантажуємо всі рейси з сервера
    const updated = await request('GET', '/trips')
    setTrips(updated)
  } catch (e) { console.error(e.message) }
}

  const updateTrip = async (id, data) => {
    try {
      const updated = await request('PUT', `/trips/${id}`, {
        routeId: Number(data.routeId),
        date: data.date,
        time: data.time,
        price: Number(data.price),
        seats: Number(data.seats),
      })
      setTrips(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) { console.error(e.message) }
  }

  const deleteTrip = async (id) => {
    try {
      await request('DELETE', `/trips/${id}`)
      setTrips(prev => prev.filter(t => t.id !== id))
      if (currentUser?.role === 'admin') {
        const allBookings = await request('GET', '/bookings')
        setBookings(allBookings)
      }
    } catch (e) { console.error(e.message) }
  }

  // --- Бронювання ---
  const bookTrip = async (tripId, passengerName, passengerPhone) => {
    try {
      const result = await request('POST', '/bookings', { tripId, passengerName, passengerPhone })
      // Оновлюємо рейси щоб показати нову кількість місць
      const tripsData = await request('GET', '/trips')
      setTrips(tripsData)
      // Оновлюємо бронювання користувача
      const myBookings = await request('GET', '/bookings/my')
      setBookings(myBookings)
      return { success: true, booking: result.booking }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const cancelBooking = async (bookingId) => {
    try {
      await request('DELETE', `/bookings/${bookingId}`)
      setBookings(prev => prev.filter(b => b.id !== bookingId))
      const tripsData = await request('GET', '/trips')
      setTrips(tripsData)
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  const updateBooking = async (bookingId, updates) => {
    try {
      await request('PUT', `/bookings/${bookingId}`, updates)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b))
    } catch (e) { console.error(e.message) }
  }

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      loading,
      routes, addRoute, deleteRoute, updateRoute,
      trips, addTrip, deleteTrip, updateTrip,
      users,
      currentUser, register, login, logout, promoteUser,
      bookings, bookTrip, cancelBooking, updateBooking,
      changePassword, resetPassword,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}