import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'

function TicketDisplay({ booking, trip, route }) {
  return (
    <div id="ticket-print" style={{
      background: 'var(--bg2)',
      border: '2px solid var(--accent)',
      borderRadius: '24px',
      overflow: 'hidden',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div style={{ background: 'var(--accent)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1A1814', opacity: 0.7, marginBottom: '2px' }}>ЕЛЕКТРОННИЙ КВИТОК</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A1814', fontFamily: 'Unbounded, sans-serif' }}>АвтоРейс</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#1A1814', opacity: 0.7 }}>№ бронювання</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A1814' }}>#{String(booking.id).padStart(6, '0')}</div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', borderBottom: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ПОСАДКА</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{booking.boardingPoint}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>🚌</div>
            <div style={{ height: '2px', width: '100%', background: 'var(--border)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '50%' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{route.duration}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ВИСАДКА</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{booking.alightingPoint}</div>
          </div>
        </div>
        <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--text2)', fontSize: '0.85rem' }}>
          Маршрут: {route.from} → {route.stops?.length ? route.stops.join(' → ') + ' → ' : ''}{route.to}
        </div>
      </div>

      <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px dashed var(--border)' }}>
        <div><div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ДАТА</div><div style={{ fontWeight: 700 }}>{trip.date}</div></div>
        <div><div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ЧАС</div><div style={{ fontWeight: 700 }}>{trip.time}</div></div>
        <div><div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ПАСАЖИР</div><div style={{ fontWeight: 700 }}>{booking.passengerName}</div></div>
        <div><div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ТЕЛЕФОН</div><div style={{ fontWeight: 700 }}>{booking.passengerPhone}</div></div>
      </div>

      <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '4px' }}>ВАРТІСТЬ КВИТКА</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{trip.price} грн</div>
        </div>
        <div style={{ background: 'var(--accent)', color: '#1A1814', padding: '8px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
          ✓ ОПЛАЧЕНО
        </div>
      </div>
    </div>
  );
}

function BookingSuccess() {
  const { trips, routes } = useApp();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const orderId = sessionStorage.getItem('liqpayOrderId');
    if (!orderId) {
      setError('Замовлення не знайдено. Поверніться на головну сторінку.');
      setLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/liqpay/status/${orderId}`);
        if (!res.ok) {
          throw new Error('Не вдалося отримати статус оплати');
        }
        const data = await res.json();
        if (data.paid) {
          // Find trip and route from context
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
              from: route.from_city,
              to: route.to_city,
              stops: route.stops ? JSON.parse(route.stops) : [],
              duration: route.duration
            }
          });
        } else {
          setError('Оплата ще не завершена. Будь ласка, зачекайте або спробуйте знову.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [trips, routes]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Завантаження...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Link to="/" style={{ display: 'inline-block', marginTop: '20px' }}>Повернутися на головну</Link>
      </div>
    );
  }

  if (!ticketData) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Дані квитка не знайдено.</div>;
  }

  const { booking, trip, route } = ticketData;

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '1.8rem', marginBottom: '8px' }}>Оплата успішна!</h1>
        <p style={{ color: 'var(--text2)' }}>Ваш квиток підтверджено</p>
      </div>
      <TicketDisplay booking={booking} trip={trip} route={route} />
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => window.print()} style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
          🖨️ Роздрукувати
        </button>
        <Link to="/schedule" style={{ padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>
          ← Назад до розкладу
        </Link>
      </div>
    </div>
  );
}

export default BookingSuccess;