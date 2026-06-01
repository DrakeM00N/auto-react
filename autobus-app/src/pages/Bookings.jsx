import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { formatDate, isDeparted } from '../lib/format'

function Bookings() {
  const { currentUser } = useAuth()
  const { routes, trips, bookings, cancelBooking } = useData()
  const [status, setStatus] = useState(null)
  const [filter, setFilter] = useState('upcoming')

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 2rem', textAlign: 'center' }}>
        <h1>Доступ заборонено</h1>
        <p>Тільки адміни можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  const handleCancelBooking = (bookingId) => {
    cancelBooking(bookingId)
    setStatus({ type: 'success', message: 'Бронювання скасовано' })
  }

  const filteredBookings = bookings.filter(booking => {
    const trip = trips.find(t => t.id === booking.tripId)
    if (!trip) return filter === 'all'
    if (filter === 'upcoming') return !isDeparted(trip)
    if (filter === 'past') return isDeparted(trip)
    return true
  })

  const filterBtn = (value, label) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      style={{
        padding: '8px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: filter === value ? 'var(--accent)' : 'transparent',
        color: filter === value ? '#1A1814' : 'var(--text)',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  const upcomingCount = bookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId)
    return trip && !isDeparted(trip)
  }).length

  const pastCount = bookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId)
    return trip && isDeparted(trip)
  }).length

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem' }}>Бронювання</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {filterBtn('upcoming', `Майбутні (${upcomingCount})`)}
          {filterBtn('past', `Минулі (${pastCount})`)}
          {filterBtn('all', `Всі (${bookings.length})`)}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          ← Назад до адмін-панелі
        </Link>
      </div>

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

      <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>
          {filter === 'upcoming' ? 'Майбутні бронювання' : filter === 'past' ? 'Минулі бронювання' : 'Всі бронювання'}
        </h2>
        {filteredBookings.length === 0 ? (
          <p style={{ color: 'var(--text2)' }}>Немає бронювань.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredBookings.map(booking => {
              const trip = trips.find(t => t.id === booking.tripId)
              const route = routes.find(r => r.id === trip?.routeId)
              const departed = isDeparted(trip)
              return (
                <div key={booking.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: departed ? 0.7 : 1,
                }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {booking.passengerName}
                      {departed && (
                        <span style={{
                          fontSize: '0.7rem',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: 'var(--border)',
                          color: 'var(--text2)',
                          fontWeight: 700,
                        }}>
                          Відправлено
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                      {route?.from} → {route?.to} • {formatDate(trip?.date)} {trip?.time}
                    </div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                      Телефон: {booking.passengerPhone} • Дата броні: {booking.createdAt}
                    </div>
                    {!departed && (
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
                    )}
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

export default Bookings