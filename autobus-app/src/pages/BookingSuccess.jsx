import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { useData } from '../context/DataContext'
import { Link } from 'react-router-dom'
import { track } from '../lib/analytics'
import { apiRequest } from '../lib/api'
=======
import { Link, useSearchParams } from 'react-router-dom'
import TicketCard from '../components/TicketCard'
>>>>>>> 57d6e617e571c5c3a7bda50eea02ed573f8389bd

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const MAX_ATTEMPTS = 6
const POLL_INTERVAL = 2500

const PRINT_STYLE = `@media print {
  body * { visibility: hidden; }
  #ticket-print, #ticket-print * { visibility: visible; }
  #ticket-print { position: absolute; left: 50%; transform: translateX(-50%); top: 0; }
}`

const primaryBtn = { padding: '12px 24px', borderRadius: '14px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }
const secondaryBtn = { padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }

function Centered({ children }) {
  return <div style={{ padding: '60px 2rem', maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}>{children}</div>
}

function BookingSuccess() {
<<<<<<< HEAD
  const { trips, routes } = useData();
  // Read once at mount — sessionStorage doesn't change between renders.
  const [orderId] = useState(() => sessionStorage.getItem('liqpayOrderId'));
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(orderId ? null : 'Замовлення не знайдено. Поверніться на головну сторінку.');

  useEffect(() => {
    if (!orderId) return;
=======
  const [searchParams] = useSearchParams()
  // order_id comes back in the monobank redirect URL; sessionStorage is a fallback.
  const orderId = searchParams.get('order_id') || sessionStorage.getItem('paymentOrderId')

  // phase: polling | paid | pending | failed | error
  const [phase, setPhase] = useState(orderId ? 'polling' : 'error')
  const [ticket, setTicket] = useState(null)
  const [message, setMessage] = useState(
    orderId ? '' : 'Замовлення не знайдено. Поверніться до розкладу та забронюйте квиток.'
  )

  useEffect(() => {
    if (!orderId) return
>>>>>>> 57d6e617e571c5c3a7bda50eea02ed573f8389bd

    let active = true
    let attempts = 0
    let timer

    async function poll() {
      attempts += 1
      try {
<<<<<<< HEAD
        const data = await apiRequest('GET', `/liqpay/status/${orderId}`);
        if (data.paid) {
          // Funnel: the booking completed via the LiqPay payment flow
          track('booking_completed', { trip_id: data.tripId, price: data.tripPrice });

          // Find trip and route from context. The /api/routes endpoint
          // already returns {from, to, stops: []} — stops is parsed there,
          // do not parse it again here.
          const trip = trips.find(t => t.id === data.tripId);
          if (!trip) {
            throw new Error('Рейс не знайдено');
          }
          const route = routes.find(r => r.id === trip.routeId);
          if (!route) {
            throw new Error('Маршрут не знайдено');
          }

          setTicketData({
            booking: {
              id: data.bookingId,
              passengerName: data.passengerName,
              passengerPhone: data.passengerPhone,
              boardingPoint: data.boardingPoint,
              alightingPoint: data.alightingPoint
            },
            trip: {
              id: data.tripId,
              date: data.tripDate,
              time: data.tripTime,
              price: data.tripPrice
            },
            route: {
              from: route.from,
              to: route.to,
              stops: route.stops || [],
              duration: route.duration
            }
          });
        } else {
          setError('Оплата ще не завершена. Будь ласка, зачекайте або спробуйте знову.');
=======
        const res = await fetch(`${BASE}/payments/status/${encodeURIComponent(orderId)}`)
        const data = await res.json()
        if (!active) return

        if (data.status === 'paid' && data.ticket) {
          sessionStorage.removeItem('paymentOrderId')
          setTicket(data.ticket)
          setPhase('paid')
          return
>>>>>>> 57d6e617e571c5c3a7bda50eea02ed573f8389bd
        }
        if (data.status === 'failed') {
          setPhase('failed')
          setMessage('Оплата не пройшла. Спробуйте забронювати квиток ще раз.')
          return
        }
        if (data.status === 'not_found') {
          setPhase('error')
          setMessage('Замовлення не знайдено.')
          return
        }
        if (attempts >= MAX_ATTEMPTS) {
          setPhase('pending')
          return
        }
        timer = setTimeout(poll, POLL_INTERVAL)
      } catch {
        if (!active) return
        if (attempts >= MAX_ATTEMPTS) {
          setPhase('error')
          setMessage('Не вдалося перевірити статус оплати. Спробуйте оновити сторінку.')
          return
        }
        timer = setTimeout(poll, POLL_INTERVAL)
      }
    }

<<<<<<< HEAD
    fetchStatus();
  }, [orderId, trips, routes]);
=======
    poll()
    return () => { active = false; clearTimeout(timer) }
  }, [orderId])
>>>>>>> 57d6e617e571c5c3a7bda50eea02ed573f8389bd

  if (phase === 'polling') {
    return <Centered><div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>⏳</div>Перевіряємо статус оплати...</Centered>
  }

  if (phase === 'paid') {
    return (
      <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
        <style>{PRINT_STYLE}</style>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
          <h1 style={{ fontFamily: 'Unbounded', fontSize: '1.8rem', marginBottom: '8px' }}>Оплата успішна!</h1>
          <p style={{ color: 'var(--text2)' }}>Ваш квиток підтверджено</p>
        </div>
        <TicketCard ticket={ticket} />
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={primaryBtn}>🖨️ Роздрукувати</button>
          <Link to={`/ticket/${ticket.ticketCode}`} style={secondaryBtn}>🔗 Постійне посилання на квиток</Link>
          <Link to="/schedule" style={secondaryBtn}>← До розкладу</Link>
        </div>
      </div>
    )
  }

  if (phase === 'pending') {
    return (
      <Centered>
        <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>⏳</div>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '1.5rem', marginBottom: '12px' }}>Оплата ще обробляється</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '20px' }}>
          Платіж ще не підтверджено. Це може зайняти трохи часу — оновіть сторінку за хвилину.
        </p>
        <button onClick={() => window.location.reload()} style={primaryBtn}>Перевірити ще раз</button>
      </Centered>
    )
  }

  // failed | error
  return (
    <Centered>
      <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>⚠️</div>
      <p style={{ color: 'var(--text2)', marginBottom: '20px' }}>{message}</p>
      <Link to="/schedule" style={primaryBtn}>Повернутися до розкладу</Link>
    </Centered>
  )
}

export default BookingSuccess
