import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { apiRequest as request } from '../lib/api'
import { mapTrip } from '../lib/tripMapper'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

// Network errors from fetch produce "Failed to fetch" — translate
// to something a non-technical user understands.
function describeError(e) {
  const networkLike = /failed to fetch|networkerror|network request failed/i.test(e.message)
  return networkLike ? 'Сервер недоступний. Перевірте підключення або спробуйте пізніше.' : e.message
}

function tripPayload(trip) {
  return {
    routeId: Number(trip.routeId),
    date: trip.date,
    time: trip.time,
    arrivalDate: trip.arrivalDate || '',
    arrivalTime: trip.arrivalTime || '',
    price: Number(trip.price),
    seats: Number(trip.seats),
    departurePoint: trip.departurePoint || '',
    arrivalPoint: trip.arrivalPoint || '',
    busModel: trip.busModel || '',
    busPlate: trip.busPlate || '',
    carrier: trip.carrier || '',
    amenities: Array.isArray(trip.amenities) ? trip.amenities : [],
    intermediateStops: Array.isArray(trip.intermediateStops) ? trip.intermediateStops : [],
  }
}

export function DataProvider({ children }) {
  const { currentUser } = useAuth()
  const [routes, setRoutes] = useState([])
  // Повний каталог рейсів (~850 КБ) вантажимо ЛИШЕ на сторінках, яким він потрібен
  // (адмінка, профіль, «Мої бронювання», розклад без дати) — див. ensureTrips().
  const [trips, setTrips] = useState([])
  const [tripsLoaded, setTripsLoaded] = useState(false)
  const [tripsLoading, setTripsLoading] = useState(false)
  const tripsRequested = useRef(false)
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  // Surfaced to the UI so a connectivity failure shows an explicit
  // message instead of a silently-empty list. Cleared on the next
  // successful load.
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const routesData = await request('GET', '/routes')
      setRoutes(routesData)

      if (currentUser) {
        if (currentUser.role === 'admin') {
          const [allBookings, usersData] = await Promise.all([
            request('GET', '/bookings'),
            request('GET', '/users'),
          ])
          setBookings(allBookings)
          setUsers(usersData)
        } else {
          const bookingsData = await request('GET', '/bookings/my')
          setBookings(bookingsData)
        }
      } else {
        setBookings([])
        setUsers([])
      }
      setError(null)
    } catch (e) {
      console.error('Помилка завантаження даних:', e.message)
      setError(describeError(e))
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  const fetchAllTrips = useCallback(async () => {
    setTripsLoading(true)
    try {
      const tripsData = await request('GET', '/trips')
      setTrips(tripsData.map(mapTrip))
      setTripsLoaded(true)
      setError(null)
    } catch (e) {
      console.error('Помилка завантаження рейсів:', e.message)
      tripsRequested.current = false // дозволити повторну спробу
      setError(describeError(e))
    } finally {
      setTripsLoading(false)
    }
  }, [])

  // Ідемпотентно: перший виклик запускає завантаження всіх рейсів, наступні нічого не роблять.
  const ensureTrips = useCallback(() => {
    if (tripsRequested.current) return
    tripsRequested.current = true
    fetchAllTrips()
  }, [fetchAllTrips])

  const reload = useCallback(() => {
    loadData()
    if (tripsRequested.current) fetchAllTrips()
  }, [loadData, fetchAllTrips])

  // Syncing external state (server data) into React state on auth change
  // is the documented valid use of useEffect — the lint rule fires a
  // false positive here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [currentUser])

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
    const deletedTripIds = trips.filter(t => t.routeId === id).map(t => t.id)
    setRoutes(prev => prev.filter(r => r.id !== id))
    setTrips(prev => prev.filter(t => t.routeId !== id))
    setBookings(prev => prev.filter(b => !deletedTripIds.includes(b.tripId)))
    return { success: true }
  })

  // --- Trips ---
  const addTrip = (trip) => wrap(async () => {
    await request('POST', '/trips', tripPayload(trip))
    const tripsData = await request('GET', '/trips')
    setTrips(tripsData.map(mapTrip))
    return { success: true }
  })

  const updateTrip = (id, data) => wrap(async () => {
    const updated = await request('PUT', `/trips/${id}`, tripPayload(data))
    setTrips(prev => prev.map(t => t.id === id ? mapTrip(updated) : t))
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
    setTrips((await request('GET', '/trips')).map(mapTrip))
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
      trips, tripsLoaded, tripsLoading, ensureTrips, addTrip, updateTrip, deleteTrip,
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
