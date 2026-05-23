import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { track } from '../lib/analytics'
import { apiRequest } from '../lib/api'
import { formatDate, isDeparted } from '../lib/format'

function Booking() {
  const { trips, routes } = useData()
  const [searchParams] = useSearchParams()
  const tripId = Number(searchParams.get('tripId'))

  const [passengerFirstName, setPassengerFirstName] = useState('')
  const [passengerLastName, setPassengerLastName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [boardingPoint, setBoardingPoint] = useState('')
  const [alightingPoint, setAlightingPoint] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const selectedTrip = useMemo(() => trips.find(trip => trip.id === tripId), [trips, tripId])
  const selectedRoute = useMemo(() => routes.find(route => route.id === selectedTrip?.routeId), [routes, selectedTrip])
  const freeSeats = selectedTrip ? selectedTrip.seats - (selectedTrip.bookedCount || 0) : 0
  const departed = selectedTrip ? isDeparted(selectedTrip) : false

  // Funnel: the visitor reached the booking page with a valid trip
  useEffect(() => {
    if (selectedTrip) {
      track('booking_started', {
        trip_id: selectedTrip.id,
        route: selectedRoute ? `${selectedRoute.from} → ${selectedRoute.to}` : '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip?.id])

  const allPoints = useMemo(() => {
    if (!selectedRoute) return []
    return [selectedRoute.from, ...(selectedRoute.stops || []), selectedRoute.to]
  }, [selectedRoute])

  const alightingOptions = useMemo(() => {
    if (!boardingPoint) return []
    const idx = allPoints.indexOf(boardingPoint)
    return allPoints.slice(idx + 1)
  }, [boardingPoint, allPoints])

  const handleBoardingChange = (val) => {
    setBoardingPoint(val)
    setAlightingPoint('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (departed) {
      setStatus({ type: 'error', message: 'Цей рейс уже відправлено.' })
      return
    }

    if (!passengerFirstName.trim() || !passengerLastName.trim() || !passengerPhone.trim()) {
      setStatus({ type: 'error', message: 'Будь ласка, заповніть всі поля.' })
      return
    }
    if (!boardingPoint || !alightingPoint) {
      setStatus({ type: 'error', message: 'Оберіть зупинку посадки та висадки.' })
      return
    }

    setLoading(true)
    setStatus(null)

    // Funnel: the visitor submitted the booking form
    track('booking_submitted', { trip_id: tripId })

    try {
      const fullName = `${passengerLastName.trim()} ${passengerFirstName.trim()}`

      // Ask the backend to create a monobank invoice. The booking is
      // created server-side only after monobank confirms payment, so we
      // never produce unpaid bookings from the client.
      const result = await apiRequest('POST', '/payments/checkout', {
        tripId,
        passengerName: fullName,
        passengerPhone: passengerPhone.trim(),
        boardingPoint,
        alightingPoint,
      })

      // Fallback for recovering the order on the success page if monobank
      // doesn't preserve the order_id query param in its redirect.
      sessionStorage.setItem('paymentOrderId', result.orderId)
      window.location.href = result.pageUrl
    } catch (e) {
      setStatus({ type: 'error', message: e.message })
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
      <section style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>Бронювання квитка</h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>Заповніть дані та перейдіть до оплати.</p>
      </section>

      {!selectedTrip ? (
        <div style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          Невірний або відсутній tripId. Поверніться до <Link to="/schedule">розкладу</Link>.
        </div>
      ) : departed ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)', opacity: 0.7 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>{selectedRoute?.from} → {selectedRoute?.to}</div>
            <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{formatDate(selectedTrip.date)} • {selectedTrip.time}</div>
            <div style={{ color: 'var(--text2)' }}>Ціна: <strong>{selectedTrip.price} грн</strong></div>
          </article>
          <div role="alert" style={{ padding: '20px', borderRadius: '14px', background: '#FDECEA', border: '1px solid #F5C6CB', color: '#842029', fontWeight: 600 }}>
            ⚠️ Цей рейс уже відправлено. Бронювання неможливе.
          </div>
          <Link to="/schedule" style={{ color: 'var(--accent)', textDecoration: 'underline', textAlign: 'center' }}>
            Повернутись до розкладу
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>{selectedRoute?.from} → {selectedRoute?.to}</div>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{formatDate(selectedTrip.date)} • {selectedTrip.time}</div>
                <div style={{ color: 'var(--text2)' }}>Ціна: <strong>{selectedTrip.price} грн</strong></div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '170px' }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Вільних місць</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: freeSeats <= 5 ? '#e74c3c' : 'var(--accent)' }}>{freeSeats}</div>
              </div>
            </div>
          </article>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Зупинка посадки
                <select value={boardingPoint} onChange={e => handleBoardingChange(e.target.value)} style={inputStyle}>
                  <option value="">Оберіть зупинку</option>
                  {allPoints.slice(0, -1).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Зупинка висадки
                <select value={alightingPoint} onChange={e => setAlightingPoint(e.target.value)} style={{ ...inputStyle, opacity: boardingPoint ? 1 : 0.5 }} disabled={!boardingPoint}>
                  <option value="">Оберіть зупинку</option>
                  {alightingOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Імʼя
                  <input value={passengerFirstName} onChange={e => setPassengerFirstName(e.target.value)} placeholder="Іван" style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Прізвище
                  <input value={passengerLastName} onChange={e => setPassengerLastName(e.target.value)} placeholder="Іваненко" style={inputStyle} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Телефон
                <input value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} placeholder="+380..." style={inputStyle} />
              </label>
            </div>

            {status && (
              <div style={{ padding: '16px 18px', borderRadius: '14px', background: '#FDECEA', border: '1px solid #F5C6CB', color: '#842029' }}>
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={freeSeats <= 0 || loading}
              style={{
                padding: '16px 22px',
                borderRadius: '14px',
                border: 'none',
                background: freeSeats <= 0 ? 'var(--border)' : 'var(--accent)',
                color: freeSeats <= 0 ? 'var(--text2)' : '#1A1814',
                fontWeight: 700,
                cursor: freeSeats <= 0 || loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? 'Перенаправлення на оплату...' : freeSeats <= 0 ? 'Місць немає' : 'Перейти до оплати'}
            </button>

            <Link to="/schedule" style={{ color: 'var(--accent)', textDecoration: 'underline', textAlign: 'center' }}>
              Повернутись до розкладу
            </Link>
          </form>
        </div>
      )}
    </div>
  )
}

export default Booking
