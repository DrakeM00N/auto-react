import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function Booking() {
  const { trips, routes } = useApp()
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
  const freeSeats = selectedTrip ? selectedTrip.seats - (selectedTrip.bookedSeats?.length || 0) : 0

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

    try {
      const fullName = `${passengerLastName.trim()} ${passengerFirstName.trim()}`
      const token = localStorage.getItem('token')

      const res = await fetch(`${BASE}/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId,
          passengerName: fullName,
          passengerPhone: passengerPhone.trim(),
          boardingPoint,
          alightingPoint,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Помилка сервера')

      // Fallback for recovering the order on the success page.
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
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>{selectedRoute?.from} → {selectedRoute?.to}</div>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{selectedTrip.date} • {selectedTrip.time}</div>
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
