import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function ElectronicTicket({ booking, trip, route }) {
  const handlePrint = () => window.print()

  return (
    <div>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #ticket-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
        #ticket-print { display: block; }
      `}</style>

      <div id="ticket-print" style={{
        background: 'var(--bg2)',
        border: '2px solid var(--accent)',
        borderRadius: '24px',
        overflow: 'hidden',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          background: 'var(--accent)',
          padding: '20px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1814', opacity: 0.7, marginBottom: '2px' }}>
              ЕЛЕКТРОННИЙ КВИТОК
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A1814', fontFamily: 'Unbounded, sans-serif' }}>
              АвтоРейс
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#1A1814', opacity: 0.7 }}>№ бронювання</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A1814' }}>
              #{String(booking.id).padStart(6, '0')}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px', borderBottom: '1px dashed var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ВІДПРАВЛЕННЯ</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{route.from}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>✈</div>
              <div style={{ height: '2px', width: '100%', background: 'var(--border)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{route.duration}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ПРИБУТТЯ</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{route.to}</div>
            </div>
          </div>
          {route.stops?.length > 0 && (
            <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--text2)', fontSize: '0.85rem' }}>
              Зупинки: {route.stops.join(' → ')}
            </div>
          )}
        </div>

        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px dashed var(--border)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ДАТА</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{trip.date}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ЧАС ВІДПРАВЛЕННЯ</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{trip.time}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ПАСАЖИР</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{booking.passengerName}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ТЕЛЕФОН</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{booking.passengerPhone}</div>
          </div>
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ВАРТІСТЬ КВИТКА</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{trip.price} грн</div>
          </div>
          <div style={{
            background: 'var(--accent)',
            color: '#1A1814',
            padding: '8px 16px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}>
            ✓ ПІДТВЕРДЖЕНО
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '12px 24px',
            borderRadius: '14px',
            border: 'none',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          🖨️ Роздрукувати квиток
        </button>
        <Link
          to="/schedule"
          style={{
            padding: '12px 24px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            color: 'var(--text)',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          ← Назад до розкладу
        </Link>
      </div>
    </div>
  )
}

function Booking() {
  const { trips, routes, bookTrip } = useApp()
  const [searchParams] = useSearchParams()
  const tripId = Number(searchParams.get('tripId'))

  const [passengerFirstName, setPassengerFirstName] = useState('')
  const [passengerLastName, setPassengerLastName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [status, setStatus] = useState(null)
  const [completedBooking, setCompletedBooking] = useState(null)

  const selectedTrip = useMemo(() => trips.find(trip => trip.id === tripId), [trips, tripId])
  const selectedRoute = useMemo(() => routes.find(route => route.id === selectedTrip?.routeId), [routes, selectedTrip])
  const freeSeats = selectedTrip ? selectedTrip.seats - (selectedTrip.bookedSeats?.length || 0) : 0

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!passengerFirstName.trim() || !passengerLastName.trim() || !passengerPhone.trim()) {
      setStatus({ type: 'error', message: 'Будь ласка, заповніть всі поля.' })
      return
    }

    const fullName = `${passengerLastName.trim()} ${passengerFirstName.trim()}`
    const result = await bookTrip(selectedTrip.id, fullName, passengerPhone.trim())

    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }

    setCompletedBooking({
      id: result.booking.id,
      passengerName: fullName,
      passengerPhone: passengerPhone.trim(),
    })
  }

  if (completedBooking && selectedTrip && selectedRoute) {
    return (
      <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
          <h1 style={{ fontFamily: 'Unbounded', fontSize: '1.8rem', marginBottom: '8px' }}>
            Бронювання підтверджено!
          </h1>
          <p style={{ color: 'var(--text2)' }}>
            Збережіть або роздрукуйте ваш електронний квиток
          </p>
        </div>
        <ElectronicTicket
          booking={completedBooking}
          trip={selectedTrip}
          route={selectedRoute}
        />
      </div>
    )
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    boxSizing: 'border-box',
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
          Невірний або відсутній tripId. Поверніться до <Link to="/schedule">розкладу</Link> та оберіть рейс.
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Імʼя
                  <input
                    value={passengerFirstName}
                    onChange={e => setPassengerFirstName(e.target.value)}
                    placeholder="Іван"
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Прізвище
                  <input
                    value={passengerLastName}
                    onChange={e => setPassengerLastName(e.target.value)}
                    placeholder="Іваненко"
                    style={inputStyle}
                  />
                </label>
              </div>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Телефон
                <input
                  value={passengerPhone}
                  onChange={e => setPassengerPhone(e.target.value)}
                  placeholder="+380..."
                  style={inputStyle}
                />
              </label>
            </div>

            {status && (
              <div style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: '#FDECEA',
                border: '1px solid #F5C6CB',
                color: '#842029',
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
              <Link to="/schedule" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
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