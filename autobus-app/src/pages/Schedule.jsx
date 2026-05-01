import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

function Schedule() {
  const { trips, routes } = useApp()
  const [searchParams] = useSearchParams()
  const today = new Date().toISOString().split('T')[0]
  const [filterFrom, setFilterFrom] = useState(searchParams.get('from') || 'Кременчук')
  const [filterTo, setFilterTo] = useState(searchParams.get('to') || '')
  const [filterDate, setFilterDate] = useState(searchParams.get('date') || today)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setFilterFrom(searchParams.get('from') || 'Кременчук')
    setFilterTo(searchParams.get('to') || '')
    setFilterDate(searchParams.get('date') || today)
  }, [searchParams, today])

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const route = routes.find(r => r.id === trip.routeId)
      if (!route) return false
      const fromMatch = filterFrom ? route.from === filterFrom : true
      const toMatch = filterTo ? route.to === filterTo : true
      const dateMatch = filterDate ? trip.date === filterDate : true
      const stopsText = route.stops?.join(' ') || ''
      const searchText = `${route.from} ${route.to} ${stopsText} ${trip.date} ${trip.time}`.toLowerCase()
      const searchMatch = searchQuery ? searchText.includes(searchQuery.toLowerCase()) : true
      return fromMatch && toMatch && dateMatch && searchMatch
    })
  }, [trips, routes, filterFrom, filterTo, filterDate, searchQuery])

  const fromOptions = [...new Set(routes.map(route => route.from))]
  const toOptions = [...new Set(routes.map(route => route.to))]

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <section style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '12px' }}>
          Розклад рейсів
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7, maxWidth: '680px' }}>
          Оберіть зручний рейс та перейдіть до бронювання. Тут показані всі доступні автобусні маршрути з датою, часом, ціною та кількістю вільних місць.
        </p>
      </section>

      <section style={{ marginBottom: '28px', display: 'grid', gap: '14px' }}>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Пошук маршруту
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Одеса, Київ, дата або час"
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Відправлення
            <select
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="">Усі</option>
              {fromOptions.map(from => (
                <option key={from} value={from}>{from}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Напрямок
            <select
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="">Усі</option>
              {toOptions.map(to => (
                <option key={to} value={to}>{to}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Дата
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
          Показано {filteredTrips.length} з {trips.length} рейсів.
        </div>
      </section>

      <div style={{ display: 'grid', gap: '18px' }}>
        {filteredTrips.length === 0 ? (
          <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            Немає доступних рейсів.
          </div>
        ) : filteredTrips.map(trip => {
          const route = routes.find(r => r.id === trip.routeId)
          const freeSeats = trip.seats - trip.bookedSeats.length

          return (
            <article key={trip.id} style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '22px',
              background: 'var(--bg2)',
              borderRadius: '18px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ minWidth: '220px', flex: '1 1 280px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px', fontWeight: 700 }}>
                  {route?.from} {route?.stops?.length ? `→ ${route.stops.join(' → ')} →` : '→'} {route?.to}
                </div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, lineHeight: 1.2 }}>
                  {trip.date} • {trip.time}
                </h2>
                <p style={{ margin: '12px 0 0', color: 'var(--text2)' }}>
                  Пробіг: {route?.distance} • Тривалість: {route?.duration}
                </p>
              </div>

              <div style={{ display: 'grid', gap: '12px', alignContent: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: '120px' }}>
                    <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Ціна</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{trip.price} грн</div>
                  </div>
                  <div style={{ minWidth: '120px' }}>
                    <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Вільних місць</div>
                    <div style={{ fontWeight: 700, color: freeSeats <= 5 ? '#e74c3c' : 'var(--accent)' }}>
                      {freeSeats}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text2)' }}>Автобус містить {trip.seats} місць</span>
                  <Link
                    to={`/booking?tripId=${trip.id}`}
                    style={{
                      background: 'var(--accent)',
                      color: '#1A1814',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Забронювати
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default Schedule