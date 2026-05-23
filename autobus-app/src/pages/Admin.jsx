import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function Admin() {
  const { currentUser, routes, addRoute, deleteRoute, updateRoute, trips, addTrip, deleteTrip, updateTrip, users, bookings, promoteUser, cancelBooking } = useApp()

  // Состояния для форм
  const [newRoute, setNewRoute] = useState({ from: '', to: '', distance: '', duration: '', stops: '' })
  const [newTrip, setNewTrip] = useState({ routeId: '', date: '', time: '', price: '', seats: '' })
  const [editingRouteId, setEditingRouteId] = useState(null)
  const [editingRoute, setEditingRoute] = useState({ from: '', to: '', distance: '', duration: '', stops: '' })
  const [editingTripId, setEditingTripId] = useState(null)
  const [editingTrip, setEditingTrip] = useState({ routeId: '', date: '', time: '', price: '', seats: '' })
  const [status, setStatus] = useState(null)
  const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }

  // Проверка роли
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 2rem', textAlign: 'center' }}>
        <h1>Доступ заборонено</h1>
        <p>Тільки адміни можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  const handleAddRoute = (e) => {
    e.preventDefault()
    if (!newRoute.from || !newRoute.to || !newRoute.distance || !newRoute.duration) {
      setStatus({ type: 'error', message: 'Заповніть всі поля для маршруту' })
      return
    }
    addRoute({
      ...newRoute,
      stops: newRoute.stops.split(',').map(item => item.trim()).filter(Boolean),
    })
    setNewRoute({ from: '', to: '', distance: '', duration: '', stops: '' })
    setStatus({ type: 'success', message: 'Маршрут додано' })
  }

  const handleAddTrip = async (e) => {
    e.preventDefault()
    if (!newTrip.routeId || !newTrip.date || !newTrip.time || !newTrip.price || !newTrip.seats) {
      setStatus({ type: 'error', message: 'Заповніть всі поля для рейсу' })
      return
    }
    try {
      await addTrip({
        ...newTrip,
        routeId: Number(newTrip.routeId),
        price: Number(newTrip.price),
        seats: Number(newTrip.seats)
      })
      setNewTrip({ routeId: '', date: '', time: '', price: '', seats: '' })
      setStatus({ type: 'success', message: 'Рейс додано' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не вдалось добавити рейс: ' + err.message })
    }
  }

  const handlePromote = (userId) => {
    promoteUser(userId)
    setStatus({ type: 'success', message: 'Користувача підвищено до адміна' })
  }

  const handleStartEditRoute = (route) => {
    setEditingRouteId(route.id)
    setEditingRoute({ ...route })
    setStatus(null)
  }

  const handleSaveRoute = (e) => {
    e.preventDefault()
    if (!editingRoute.from || !editingRoute.to || !editingRoute.distance || !editingRoute.duration) {
      setStatus({ type: 'error', message: 'Заповніть всі поля для маршруту' })
      return
    }
    updateRoute(editingRouteId, editingRoute)
    setEditingRouteId(null)
    setEditingRoute({ from: '', to: '', distance: '', duration: '' })
    setStatus({ type: 'success', message: 'Маршрут оновлено' })
  }

  const handleCancelEditRoute = () => {
    setEditingRouteId(null)
    setEditingRoute({ from: '', to: '', distance: '', duration: '' })
  }

  const handleStartEditTrip = (trip) => {
    setEditingTripId(trip.id)
    setEditingTrip({
      routeId: String(trip.routeId),
      date: trip.date,
      time: trip.time,
      price: String(trip.price),
      seats: String(trip.seats),
    })
    setStatus(null)
  }

  const handleSaveTrip = (e) => {
    e.preventDefault()
    if (!editingTrip.routeId || !editingTrip.date || !editingTrip.time || !editingTrip.price || !editingTrip.seats) {
      setStatus({ type: 'error', message: 'Заповніть всі поля для рейсу' })
      return
    }
    updateTrip(editingTripId, {
      routeId: Number(editingTrip.routeId),
      date: editingTrip.date,
      time: editingTrip.time,
      price: Number(editingTrip.price),
      seats: Number(editingTrip.seats),
    })
    setEditingTripId(null)
    setEditingTrip({ routeId: '', date: '', time: '', price: '', seats: '' })
    setStatus({ type: 'success', message: 'Рейс оновлено' })
  }

  const handleCancelEditTrip = () => {
    setEditingTripId(null)
    setEditingTrip({ routeId: '', date: '', time: '', price: '', seats: '' })
  }

  const handleDeleteRoute = (routeId) => {
    deleteRoute(routeId)
    setStatus({ type: 'success', message: 'Маршрут та пов’язані рейси видалено' })
  }

  const handleDeleteTrip = (tripId) => {
    deleteTrip(tripId)
    setStatus({ type: 'success', message: 'Рейс видалено' })
  }

  const handleCancelBooking = (bookingId) => {
    cancelBooking(bookingId)
    setStatus({ type: 'success', message: 'Бронювання скасовано' })
  }

  const totalBookings = bookings.length
  const totalRevenue = bookings.reduce((sum, booking) => {
    const trip = trips.find(t => t.id === booking.tripId)
    return sum + (trip?.price || 0)
  }, 0)
  const totalUsers = users.length
  const totalSeats = trips.reduce((sum, trip) => sum + trip.seats, 0)
  const bookedSeats = trips.reduce((sum, trip) => sum + trip.bookedSeats.length, 0)

  const routeBookingCount = routes.map(route => {
    const count = bookings.reduce((sum, booking) => {
      const trip = trips.find(t => t.id === booking.tripId)
      return sum + (trip?.routeId === route.id ? 1 : 0)
    }, 0)
    return { ...route, count }
  })
  const busiestRoute = routeBookingCount.reduce((max, route) => route.count > max.count ? route : max, { count: 0 })

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem' }}>
          Адмін-панель
        </h1>
        <Link to="/admin/analytics" style={{
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'var(--accent)',
          color: '#1A1814',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          📊 Аналітика
        </Link>
      </div>

      <section style={{ display: 'grid', gap: '18px', marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Користувачів</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalUsers}</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Бронювань</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalBookings}</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Виручка</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalRevenue} грн</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Найпопулярніший маршрут</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{busiestRoute.count ? `${busiestRoute.from} → ${busiestRoute.to}` : 'немає бронювань'}</div>
          {busiestRoute.count > 0 && <div style={{ color: 'var(--text2)', marginTop: '6px' }}>{busiestRoute.count} бронювань</div>}
        </div>
      </section>

      {status && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
          border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
          color: status.type === 'success' ? '#1B6B31' : '#842029',
          marginBottom: '20px',
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>

        {/* Добавление маршрута */}
        <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Додати маршрут</h2>
          <form onSubmit={handleAddRoute} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px' }}>
              Звідки
              <input
                value={newRoute.from}
                onChange={e => setNewRoute({ ...newRoute, from: e.target.value })}
                placeholder="Наприклад: Одеса"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Куди
              <input
                value={newRoute.to}
                onChange={e => setNewRoute({ ...newRoute, to: e.target.value })}
                placeholder="Наприклад: Київ"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Відстань
              <input
                value={newRoute.distance}
                onChange={e => setNewRoute({ ...newRoute, distance: e.target.value })}
                placeholder="Наприклад: 475 км"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Тривалість
              <input
                value={newRoute.duration}
                onChange={e => setNewRoute({ ...newRoute, duration: e.target.value })}
                placeholder="Наприклад: 6 год"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Остановки
              <input
                value={newRoute.stops}
                onChange={e => setNewRoute({ ...newRoute, stops: e.target.value })}
                placeholder="Наприклад: Полтава, Кропивницький"
                style={inputStyle}
              />
            </label>
            <button type="submit" style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#1A1814',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Додати маршрут
            </button>
          </form>
        </section>

        {/* Добавление рейса */}
        <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Додати рейс</h2>
          <form onSubmit={handleAddTrip} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px' }}>
              Маршрут
              <select
                value={newTrip.routeId}
                onChange={e => setNewTrip({ ...newTrip, routeId: e.target.value })}
                style={inputStyle}
              >
                <option value="">Оберіть маршрут</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>
                    {route.from} → {route.to}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Дата
              <input
                type="date"
                value={newTrip.date}
                onChange={e => setNewTrip({ ...newTrip, date: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Час
              <input
                type="time"
                value={newTrip.time}
                onChange={e => setNewTrip({ ...newTrip, time: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Ціна (грн)
              <input
                type="number"
                value={newTrip.price}
                onChange={e => setNewTrip({ ...newTrip, price: e.target.value })}
                placeholder="350"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px' }}>
              Кількість місць
              <input
                type="number"
                value={newTrip.seats}
                onChange={e => setNewTrip({ ...newTrip, seats: e.target.value })}
                placeholder="40"
                style={inputStyle}
              />
            </label>
            <button type="submit" style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#1A1814',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Додати рейс
            </button>
          </form>
        </section>

      </div>

      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Управління маршрутами</h2>
        {routes.length === 0 ? (
          <p>Немає маршрутів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {routes.map(route => (
              <div key={route.id} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {editingRouteId === route.id ? (
                  <form onSubmit={handleSaveRoute} style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      Звідки
                      <input
                        value={editingRoute.from}
                        onChange={e => setEditingRoute({ ...editingRoute, from: e.target.value })}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      Куди
                      <input
                        value={editingRoute.to}
                        onChange={e => setEditingRoute({ ...editingRoute, to: e.target.value })}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      Відстань
                      <input
                        value={editingRoute.distance}
                        onChange={e => setEditingRoute({ ...editingRoute, distance: e.target.value })}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      Тривалість
                      <input
                        value={editingRoute.duration}
                        onChange={e => setEditingRoute({ ...editingRoute, duration: e.target.value })}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      Остановки
                      <input
                        value={editingRoute.stops}
                        onChange={e => setEditingRoute({ ...editingRoute, stops: e.target.value })}
                        placeholder="Наприклад: Полтава, Кропивницький"
                        style={inputStyle}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button type="submit" style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600, cursor: 'pointer' }}>
                        Зберегти маршрут
                      </button>
                      <button type="button" onClick={handleCancelEditRoute} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{route.from} → {route.to}</div>
                      <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Відстань: {route.distance} • Тривалість: {route.duration}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => handleStartEditRoute(route)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                        Редагувати
                      </button>
                      <button type="button" onClick={() => handleDeleteRoute(route.id)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>
                        Видалити
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Управління рейсами</h2>
        {trips.length === 0 ? (
          <p>Немає рейсів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {trips.map(trip => {
              const route = routes.find(r => r.id === trip.routeId)
              return (
                <div key={trip.id} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {editingTripId === trip.id ? (
                    <form onSubmit={handleSaveTrip} style={{ display: 'grid', gap: '12px' }}>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        Маршрут
                        <select
                          value={editingTrip.routeId}
                          onChange={e => setEditingTrip({ ...editingTrip, routeId: e.target.value })}
                          style={inputStyle}
                        >
                          {routes.map(routeOption => (
                            <option key={routeOption.id} value={routeOption.id}>
                              {routeOption.from} → {routeOption.to}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        Дата
                        <input
                          type="date"
                          value={editingTrip.date}
                          onChange={e => setEditingTrip({ ...editingTrip, date: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        Час
                        <input
                          type="time"
                          value={editingTrip.time}
                          onChange={e => setEditingTrip({ ...editingTrip, time: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        Ціна (грн)
                        <input
                          type="number"
                          value={editingTrip.price}
                          onChange={e => setEditingTrip({ ...editingTrip, price: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '6px' }}>
                        Кількість місць
                        <input
                          type="number"
                          value={editingTrip.seats}
                          onChange={e => setEditingTrip({ ...editingTrip, seats: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="submit" style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600, cursor: 'pointer' }}>
                          Зберегти рейс
                        </button>
                        <button type="button" onClick={handleCancelEditTrip} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                          Скасувати
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{route?.from} → {route?.to}</div>
                          <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>{trip.date} • {trip.time}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => handleStartEditTrip(trip)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                            Редагувати
                          </button>
                          <button type="button" onClick={() => handleDeleteTrip(trip.id)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>
                            Видалити
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Ціна: {trip.price} грн • Місць: {trip.seats}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Заброньовано: {trip.bookedSeats.length}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Список користувачів */}
      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Користувачі</h2>
        {users.length === 0 ? (
          <p>Немає зареєстрованих користувачів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {users.map(user => (
              <div key={user.id} style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: '260px' }}>
                  <div style={{ fontWeight: 700 }}>{user.name} {user.id === currentUser?.id && '(зараз онлайн)'}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{user.email}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                    Роль: {user.role}
                    {user.lastLogin ? ` • востаний вхід: ${user.lastLogin}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {user.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handlePromote(user.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#1A1814',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Зробити адміном
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Список бронювань */}
      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Бронювання</h2>
        {bookings.length === 0 ? (
          <p>Немає бронювань.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {bookings.map(booking => {
              const trip = trips.find(t => t.id === booking.tripId)
              const route = routes.find(r => r.id === trip?.routeId)
              return (
                <div key={booking.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ fontWeight: 600 }}>{booking.passengerName}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                      {route?.from} → {route?.to} • {trip?.date} {trip?.time}
                    </div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                      Телефон: {booking.passengerPhone} • Дата броні: {booking.createdAt}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#e74c3c',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: 'max-content',
                      }}
                    >
                      Скасувати бронювання
                    </button>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {trip?.price} грн
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Admin