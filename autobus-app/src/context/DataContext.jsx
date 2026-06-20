import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest as request } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

// Normalize a trip coming back from the backend — defensively fill in the
// extended fields with empty values so consumers can always rely on the
// shape even on rows added before the busfor-style migration.
function mapTrip(raw) {
  return {
    id: raw.id,
    routeId: raw.routeId,
    date: raw.date,
    time: raw.time,
    price: raw.price,
    seats: raw.seats,
    bookedCount: raw.bookedCount || 0,
    departurePoint: raw.departurePoint || '',
    arrivalPoint: raw.arrivalPoint || '',
    busModel: raw.busModel || '',
    busPlate: raw.busPlate || '',
    carrier: raw.carrier || '',
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    intermediateStops: Array.isArray(raw.intermediateStops) ? raw.intermediateStops : [],
  }
}

function tripPayload(trip) {
  return {
    routeId: Number(trip.routeId),
    date: trip.date,
    time: trip.time,
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

export function DataProvider({ children, initialData = null }) {
  const { currentUser } = useAuth()
  // If initialData is provided, use it to set state and skip the effect
  const [routes, setRoutes] = useState(initialData?.routes || [])
  const [trips, setTrips] = useState(initialData?.trips || [])
  const [users, setUsers] = useState(initialData?.users || [])
  const [bookings, setBookings] = useState(initialData?.bookings || [])
  const [loading, setLoading] = useState(!initialData) // If we have initialData, we are not loading
  const [error, setError] = useState(initialData ? null : null)

  const loadData = useCallback(async () => {
    // Only load data if we don't have initialData (i.e., on the client after hydration)
    if (initialData) return
    setLoading(true)
    try {
      const [routesData, tripsData] = await Promise.all([
        request('GET', '/routes'),
        request('GET', '/trips'),
      ])
      setRoutes(routesData)
      setTrips(tripsData.map(mapTrip))

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
      // Network errors from fetch produce "Failed to fetch" — translate
      // to something a non-technical user understands.
      const networkLike = /failed to fetch|networkerror|network request failed/i.test(e.message)
      setError(networkLike ? 'Сервер недоступний. Перевірте підключення або спробуйте пізніше.' : e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, initialData])

  const reload = useCallback(() => loadData(), [loadData])

  // Syncing external state (server data) into React state on auth change
  // is the documented valid use of useEffect — the lint rule fires a
  // false positive here.
  // We skip the effect if we have initialData (server render)
  useEffect(() => {
    // If we have initialData, we assume the data is already loaded and skip
    if (initialData) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [currentUser, initialData])

  const wrap = async (fn) => {
    try { return await fn() }
    catch (e) { return { success: false, message: e.message } }
  }

  // --- Routes ---
  // Normalizes stops to an array of objects: [{ city: string, km: number | null }]
  // Accepts:
  //   - a comma-separated string (old format) -> converts to objects with km: null
  //   - an array of strings (old format) -> converts to objects with km: null
  //   - an array of objects with {city, km} (new format) -> returns as is
  const normalizeStops = (stops) => {
    if (typeof stops === 'string') {
      // Old format: comma-separated string
      return stops
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(city => ({ city, km: null }));
    }
    if (Array.isArray(stops)) {
      if (stops.length === 0) {
        return [];
      }
      // Check the type of the first element to determine format
      if (typeof stops[0] === 'string') {
        // Old format: array of strings
        return stops.map(city => ({ city, km: null }));
      }
      // Assume new format: array of objects with city and km
      // We don't validate the shape here; we assume it's correct.
      return stops;
    }
    // If it's neither a string nor an array, return empty array
    return [];
  }

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
