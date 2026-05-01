import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function Booking() {
  const { trips, routes, currentUser, bookTrip } = useApp()
  const [searchParams] = useSearchParams()
  const tripId = Number(searchParams.get('tripId'))
  const [passengerName, setPassengerName] = useState(currentUser?.name || '')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [status, setStatus] = useState(null)

  const selectedTrip = useMemo(() => trips.find(trip => trip.id === tripId), [trips, tripId])
  const selectedRoute = useMemo(() => routes.find(route => route.id === selectedTrip?.routeId), [routes, selectedTrip])
  const freeSeats = selectedTrip ? selectedTrip.seats - selectedTrip.bookedSeats.length : 0

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!selectedTrip) {
      setStatus({ type: 'error', message: 'Немає обраного рейсу.' })
      return
    }

    if (!passengerName.trim() || !passengerPhone.trim()) {
      setStatus({ type: 'error', message: 'Будь ласка, заповніть ім’я та телефон.' })
      return
    }

    const result = bookTrip(selectedTrip.id, passengerName.trim(), passengerPhone.trim())
    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }

    setStatus({ type: 'success', message: `Рейс успішно заброньовано! Номер бронювання: ${result.booking.id}` })
    setPassengerPhone('')
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
      <section style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Бронювання квитка
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Заповніть дані пасажира та підтвердіть бронювання на обраний рейс.
        </p>
      </section>

      {!selectedTrip ? (
        <div style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          Невірний або відсутній `tripId`. Поверніться до <Link to="/schedule">розкладу</Link> та оберіть рейс.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>
                  {selectedRoute?.from} → {selectedRoute?.to}
                </div>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{selectedTrip.date} • {selectedTrip.time}</div>
                <div style={{ color: 'var(--text2)' }}>Ціна: {selectedTrip.price} грн</div>
              </div>

              <div style={{ textAlign: 'right', minWidth: '170px' }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Вільних місць</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: freeSeats <= 5 ? '#e74c3c' : 'var(--accent)' }}>
                  {freeSeats}
                </div>
              </div>
            </div>
          </article>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Ім’я пасажира
                <input
                  value={passengerName}
                  onChange={e => setPassengerName(e.target.value)}
                  placeholder="Ваше ім’я"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Телефон
                <input
                  value={passengerPhone}
                  onChange={e => setPassengerPhone(e.target.value)}
                  placeholder="+380..."
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </label>
            </div>

            {status && (
              <div style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
                border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
                color: status.type === 'success' ? '#1B6B31' : '#842029',
              }}>
                {status.message}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={freeSeats <= 0}
                style={{
                  padding: '14px 22px',
                  borderRadius: '14px',
                  border: 'none',
                  background: freeSeats <= 0 ? 'var(--border)' : 'var(--accent)',
                  color: freeSeats <= 0 ? 'var(--text2)' : '#1A1814',
                  fontWeight: 700,
                  cursor: freeSeats <= 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {freeSeats <= 0 ? 'Місць немає' : 'Підтвердити бронювання'}
              </button>

              <Link
                to="/schedule"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                Повернутись до розкладу
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Booking