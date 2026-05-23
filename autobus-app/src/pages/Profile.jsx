import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

function Profile() {
  const { currentUser, changePassword } = useAuth()
  const { bookings, trips, routes, cancelBooking, updateBooking } = useData()
  const [editBookingId, setEditBookingId] = useState(null)
  const [editData, setEditData] = useState({ passengerName: '', passengerPhone: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [status, setStatus] = useState(null)

  // Hooks must run on every render in the same order, so this useMemo
  // sits above the early-return for the unauthenticated case.
  const userBookings = useMemo(
    () => (currentUser ? bookings.filter(b => b.userId === currentUser.id) : []),
    [bookings, currentUser]
  )

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const totalSpent = userBookings.reduce((sum, booking) => {
    const trip = trips.find(t => t.id === booking.tripId)
    return sum + (trip?.price || 0)
  }, 0)

  const handleEditClick = (booking) => {
    setEditBookingId(booking.id)
    setEditData({ passengerName: booking.passengerName, passengerPhone: booking.passengerPhone })
    setStatus(null)
  }

  const handleSaveBooking = (bookingId) => {
    if (!editData.passengerName.trim() || !editData.passengerPhone.trim()) {
      setStatus({ type: 'error', message: 'Заповніть імʼя та телефон для збереження.' })
      return
    }

    updateBooking(bookingId, {
      passengerName: editData.passengerName.trim(),
      passengerPhone: editData.passengerPhone.trim(),
    })
    setEditBookingId(null)
    setStatus({ type: 'success', message: 'Дані бронювання оновлено.' })
  }

  const handleCancelBooking = (bookingId) => {
    cancelBooking(bookingId)
    setStatus({ type: 'success', message: 'Бронювання скасовано.' })
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setStatus({ type: 'error', message: 'Заповніть всі поля для зміни пароля.' })
      return
    }

    if (passwords.new !== passwords.confirm) {
      setStatus({ type: 'error', message: 'Новий пароль і підтвердження не співпадають.' })
      return
    }

    const result = await changePassword(passwords.current, passwords.new)
    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }

    setPasswords({ current: '', new: '', confirm: '' })
    setStatus({ type: 'success', message: 'Пароль успішно змінено.' })
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1120px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '18px' }}>Мій профіль</h1>
      <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: '28px' }}>
        Твоя особиста панель: історія бронювань, зміна пароля та управління своїми поїздками.
      </p>

      {status && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
          border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
          color: status.type === 'success' ? '#1B6B31' : '#842029',
          marginBottom: '24px',
        }}>
          {status.message}
        </div>
      )}

      <section style={{ display: 'grid', gap: '22px', marginBottom: '36px' }}>
        <div style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Особисті дані</h2>
          <div style={{ display: 'grid', gap: '10px', maxWidth: '560px' }}>
            <div><strong>Ім’я:</strong> {currentUser.name}</div>
            <div><strong>Email:</strong> {currentUser.email}</div>
            {currentUser.role === 'admin' && <div><strong>Роль:</strong> {currentUser.role}</div>}
            {currentUser.lastLogin && <div><strong>Останній вхід:</strong> {new Date(currentUser.lastLogin).toLocaleString('uk-UA')}</div>}
          </div>
        </div>

        <div style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Статистика профілю</h2>
          <div style={{ display: 'grid', gap: '10px', maxWidth: '560px' }}>
            <div><strong>Всього бронювань:</strong> {userBookings.length}</div>
            <div><strong>Витрачено:</strong> {totalSpent} грн</div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '36px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '18px' }}>Історія бронювань</h2>
        {userBookings.length === 0 ? (
          <p>У вас ще немає бронювань.</p>
        ) : (
          <div style={{ display: 'grid', gap: '18px' }}>
            {userBookings.map(booking => {
              const trip = trips.find(t => t.id === booking.tripId)
              const route = routes.find(r => r.id === trip?.routeId)
              return (
                <article key={booking.id} style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{route?.from} → {route?.to}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>{trip?.date} • {trip?.time}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{trip?.price} грн</div>
                    </div>

                    <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
                      Телефон: {booking.passengerPhone} • Дата броні: {booking.createdAt}
                    </div>

                    {editBookingId === booking.id ? (
                      <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <label style={{ color: 'var(--text2)' }}>
                            Ім’я пасажира
                            <input
                              value={editData.passengerName}
                              onChange={e => setEditData(prev => ({ ...prev, passengerName: e.target.value }))}
                              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)' }}
                            />
                          </label>
                          <label style={{ color: 'var(--text2)' }}>
                            Телефон
                            <input
                              value={editData.passengerPhone}
                              onChange={e => setEditData(prev => ({ ...prev, passengerPhone: e.target.value }))}
                              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)' }}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveBooking(booking.id)}
                            style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Зберегти
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditBookingId(null)}
                            style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
                          >
                            Скасувати
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditClick(booking)}
                          style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Редагувати
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking.id)}
                          style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', cursor: 'pointer' }}
                        >
                          Скасувати бронювання
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {currentUser.hasPassword !== false && (
      <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Змінити пароль</h2>
        <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '14px', maxWidth: '520px' }}>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Поточний пароль
            <input
              type="password"
              value={passwords.current}
              onChange={e => setPasswords(prev => ({ ...prev, current: e.target.value }))}
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Новий пароль
            <input
              type="password"
              value={passwords.new}
              onChange={e => setPasswords(prev => ({ ...prev, new: e.target.value }))}
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Підтвердження пароля
            <input
              type="password"
              value={passwords.confirm}
              onChange={e => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>
          <button
            type="submit"
            style={{ padding: '14px 18px', borderRadius: '14px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 700, cursor: 'pointer' }}
          >
            Змінити пароль
          </button>
        </form>
      </section>
      )}
    </div>
  )
}

export default Profile
