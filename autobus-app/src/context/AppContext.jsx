import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

// Начальные данные — маршруты
const initialRoutes = [
  { id: 1, from: 'Кременчук', to: 'Київ', distance: '475 км', duration: '6 год', stops: ['Миколаїв', 'Житомир'] },
  { id: 2, from: 'Кременчук', to: 'Харків', distance: '680 км', duration: '8 год', stops: ['Полтава'] },
  { id: 3, from: 'Кременчук', to: 'Львів', distance: '810 км', duration: '10 год', stops: ['Кропивницький'] },
]

// Начальные данные — рейсы
const initialTrips = [
  { id: 1, routeId: 1, date: '2026-05-05', time: '07:00', price: 350, seats: 40, bookedSeats: [] },
  { id: 2, routeId: 1, date: '2026-05-05', time: '14:00', price: 320, seats: 40, bookedSeats: [] },
  { id: 3, routeId: 2, date: '2026-05-06', time: '08:00', price: 480, seats: 40, bookedSeats: [] },
  { id: 4, routeId: 3, date: '2026-05-07', time: '09:00', price: 550, seats: 40, bookedSeats: [] },
]

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme')
    return saved || 'dark'
  })
  const [routes, setRoutes] = useState(() => {
    const saved = localStorage.getItem('app-routes')
    if (!saved) return initialRoutes
    try { return JSON.parse(saved) } catch { return initialRoutes }
  })
  const [trips, setTrips] = useState(() => {
    const saved = localStorage.getItem('app-trips')
    if (!saved) return initialTrips
    try { return JSON.parse(saved) } catch { return initialTrips }
  })
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('app-users')
    if (!saved) return [
      { id: 1, name: 'Адмін', email: 'drakeokay@gmail.com', password: 'Drake1410', role: 'admin' }
    ]
    try { return JSON.parse(saved) } catch { return [
      { id: 1, name: 'Адмін', email: 'drakeokay@gmail.com', password: 'Drake1410', role: 'admin' }
    ] }
  })
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('app-current-user')
    if (!saved) return null
    try { return JSON.parse(saved) } catch { return null }
  })
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('app-bookings')
    if (!saved) return []
    try { return JSON.parse(saved) } catch { return [] }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('app-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('app-routes', JSON.stringify(routes))
  }, [routes])

  useEffect(() => {
    localStorage.setItem('app-trips', JSON.stringify(trips))
  }, [trips])

  useEffect(() => {
    localStorage.setItem('app-users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('app-current-user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('app-current-user')
    }
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem('app-bookings', JSON.stringify(bookings))
  }, [bookings])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // --- Функции для пользователей ---
  const register = (name, email, password, role = 'user') => {
    const exists = users.find(u => u.email === email)
    if (exists) return { success: false, message: 'Користувач з таким email вже існує' }

    const newUser = { id: Date.now(), name, email, password, role }
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
    return { success: true }
  }

  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) return { success: false, message: 'Невірний email або пароль' }

    const now = new Date().toLocaleString('uk-UA')
    const updatedUser = { ...user, lastLogin: now }
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u))
    setCurrentUser(updatedUser)
    return { success: true }
  }

  const logout = () => setCurrentUser(null)

  const promoteUser = (userId) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role: 'admin' } : u
    ))
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: 'admin' } : prev)
    }
  }

  // --- Функции для маршрутов ---
  const addRoute = (route) => {
    const newRoute = { ...route, id: Date.now() }
    setRoutes(prev => [...prev, newRoute])
  }

  const deleteRoute = (id) => {
    setRoutes(prev => prev.filter(r => r.id !== id))
    setTrips(prevTrips => {
      const remainingTrips = prevTrips.filter(t => t.routeId !== id)
      setBookings(prevBookings => prevBookings.filter(b => remainingTrips.some(t => t.id === b.tripId)))
      return remainingTrips
    })
  }

  const updateRoute = (routeId, data) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, ...data } : r))
  }

  // --- Функции для рейсов ---
  const addTrip = (trip) => {
    const newTrip = { ...trip, id: Date.now(), bookedSeats: [] }
    setTrips(prev => [...prev, newTrip])
  }

  const updateTrip = (tripId, data) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...data } : t))
  }

  const deleteTrip = (id) => {
    setTrips(prevTrips => prevTrips.filter(t => t.id !== id))
    setBookings(prevBookings => prevBookings.filter(b => b.tripId !== id))
  }

  // --- Функции для бронирования ---
  const bookTrip = (tripId, passengerName, passengerPhone) => {
    const trip = trips.find(t => t.id === tripId)
    const freeSeats = trip.seats - trip.bookedSeats.length
    if (freeSeats <= 0) return { success: false, message: 'Місць немає' }

    const booking = {
      id: Date.now(),
      tripId,
      userId: currentUser?.id || null,
      passengerName,
      passengerPhone,
      createdAt: new Date().toLocaleDateString('uk-UA'),
    }

    setBookings(prev => [...prev, booking])
    setTrips(prev => prev.map(t =>
      t.id === tripId
        ? { ...t, bookedSeats: [...t.bookedSeats, booking.id] }
        : t
    ))

    return { success: true, booking }
  }

  const cancelBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId)
    if (!booking) return { success: false, message: 'Бронювання не знайдено' }

    setBookings(prev => prev.filter(b => b.id !== bookingId))
    setTrips(prev => prev.map(t =>
      t.id === booking.tripId
        ? { ...t, bookedSeats: t.bookedSeats.filter(id => id !== bookingId) }
        : t
    ))
    return { success: true }
  }

  const updateBooking = (bookingId, updates) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, ...updates } : b
    ))
  }

  const changePassword = (currentPassword, newPassword) => {
    if (!currentUser) return { success: false, message: 'Користувач не знайдений' }
    if (currentUser.password !== currentPassword) return { success: false, message: 'Невірний поточний пароль' }

    setUsers(prev => prev.map(u =>
      u.id === currentUser.id ? { ...u, password: newPassword } : u
    ))
    setCurrentUser(prev => prev ? { ...prev, password: newPassword } : prev)
    return { success: true }
  }

  const resetPassword = (email, newPassword) => {
    const normalizedEmail = email.trim().toLowerCase()
    const user = users.find(u => u.email === normalizedEmail)
    if (!user) return { success: false, message: 'Користувача з таким email не знайдено' }

    setUsers(prev => prev.map(u =>
      u.email === normalizedEmail ? { ...u, password: newPassword } : u
    ))
    if (currentUser?.email === normalizedEmail) {
      setCurrentUser(prev => prev ? { ...prev, password: newPassword } : prev)
    }
    return { success: true }
  }

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      routes, addRoute, deleteRoute,
      trips, addTrip, deleteTrip,
      users,
      currentUser, register, login, logout, promoteUser,
      bookings, bookTrip, cancelBooking, updateBooking, changePassword, resetPassword,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}