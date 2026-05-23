import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest as request } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { currentUser } = useAuth()
  const [routes, setRoutes] = useState([])
  const [trips, setTrips] = useState([])
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  // Surfaced to the UI so a connectivity failure shows an explicit
  // message instead of a silently-empty list. Cleared on the next
  // successful load.
  const [error, setError] = useState(null)

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
      } else {
        setBookings([])
        setUsers([])
      }
      setError(null)
    } catch (e) {
      console.error('Помилка завантаження даних:', e.message)
      // Network errors from fetch produce "Failed to fetch" — translate
      // to something a non-technical user understands.
      const networkLike = /failed to fetch|networkerror|network request failed/i.test(e.message)
      setError(networkLike ? 'Сервер недоступний. Перевірте підключення або спробуйте пізніше.' : e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  const reload = useCallback(() => {
    setLoading(true)
    return loadData()
  }, [loadData])

  // Syncing external state (server data) into React state on auth change
  // is the documented valid use of useEffect — the lint rule fires a
  // false positive here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const wrap = async (fn) => {
    try { return await fn() }
    catch (e) { return { success: false, message: e.message } }
  }

  // --- Routes ---
  const normalizeStops = (stops) =>
    typeof stops === 'string'
      ? stops.split(',').map(s => s.trim()).filter(Boolean)
      : (stops || [])

  const addRoute = (route) => wrap(async () => {
    await request('POST', '/routes', { ...route, stops: normalizeStops(route.stops) })
    setRoutes(await request('GET', '/routes'))
    return { success: true }
  })

  const updateRoute = (id, data) => wrap(async () => {
    await request('PUT', `/routes/${id}`, { ...data, stops: normalizeStops(data.stops) })
    setRoutes(await request('GET', '/routes'))
    return { success: true }
  })

  const deleteRoute = (id) => wrap(async () => {
    await request('DELETE', `/routes/${id}`)
    setRoutes(prev => prev.filter(r => r.id !== id))
    setTrips(await request('GET', '/trips'))
    if (currentUser?.role === 'admin') {
      setBookings(await request('GET', '/bookings'))
    }
    return { success: true }
  })

  // --- Trips ---
  const tripPayload = (trip) => ({
    routeId: Number(trip.routeId),
    date: trip.date,
    time: trip.time,
    price: Number(trip.price),
    seats: Number(trip.seats),
  })

  const addTrip = (trip) => wrap(async () => {
    await request('POST', '/trips', tripPayload(trip))
    setTrips(await request('GET', '/trips'))
    return { success: true }
  })

  const updateTrip = (id, data) => wrap(async () => {
    const updated = await request('PUT', `/trips/${id}`, tripPayload(data))
    setTrips(prev => prev.map(t => t.id === id ? updated : t))
    return { success: true }
  })

  const deleteTrip = (id) => wrap(async () => {
    await request('DELETE', `/trips/${id}`)
    setTrips(prev => prev.filter(t => t.id !== id))
    if (currentUser?.role === 'admin') {
      setBookings(await request('GET', '/bookings'))
    }
    return { success: true }
  })

  // --- Bookings (admin manual creation, edits, cancellations) ---
  const cancelBooking = (bookingId) => wrap(async () => {
    await request('DELETE', `/bookings/${bookingId}`)
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    setTrips(await request('GET', '/trips'))
    return { success: true }
  })

  const updateBooking = (bookingId, updates) => wrap(async () => {
    await request('PUT', `/bookings/${bookingId}`, updates)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b))
    return { success: true }
  })

  // --- Users (admin) ---
  const setUserRole = async (userId, role) => {
    const endpoint = role === 'admin' ? 'promote' : 'demote'
    return wrap(async () => {
      await request('POST', `/users/${userId}/${endpoint}`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      return { success: true }
    })
  }
  const promoteUser = (userId) => setUserRole(userId, 'admin')
  const demoteUser = (userId) => setUserRole(userId, 'user')

  return (
    <DataContext.Provider value={{
      loading, error, reload,
      routes, addRoute, updateRoute, deleteRoute,
      trips, addTrip, updateTrip, deleteTrip,
      users, promoteUser, demoteUser,
      bookings, cancelBooking, updateBooking,
    }}>
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  return useContext(DataContext)
}
