import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

const UKRAINE_CITIES = [
  'Київ', 'Харків', 'Дніпро', 'Одеса', 'Запоріжжя', 'Львів', 'Кривий Ріг',
  'Миколаїв', 'Вінниця', 'Херсон', 'Полтава', 'Чернігів', 'Черкаси',
  'Хмельницький', 'Житомир', 'Суми', 'Рівне', 'Івано-Франківськ', 'Тернопіль',
  'Кропивницький', 'Луцьк', 'Ужгород', 'Чернівці', 'Кременчук',
  
].sort()

function RoutesPage() {
  const { routes } = useData()
  const navigate = useNavigate()
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const [travelDate, setTravelDate] = useState(today)
  const [passengers, setPassengers] = useState('1')


  const filteredRoutes = useMemo(() => routes.filter(route => {
  const allPoints = [route.from, ...(route.stops || []), route.to]

  const fromIndex = fromFilter
    ? allPoints.findIndex(p => p === fromFilter)
    : 0
  const toIndex = toFilter
    ? allPoints.findLastIndex(p => p === toFilter)
    : allPoints.length - 1

  if (fromFilter && toFilter) {
    return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex
  }
  if (fromFilter) return fromIndex !== -1
  if (toFilter) return toIndex !== -1
  return true
}), [routes, fromFilter, toFilter]) 

  const handleSearch = () => {
    const passengersCount = Number(passengers) > 0 ? Number(passengers) : 1
    navigate(
      `/schedule?from=${encodeURIComponent(fromFilter)}&to=${encodeURIComponent(toFilter)}&date=${travelDate}&passengers=${passengersCount}`
    )
  }

  const selectStyle = {
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '980px', margin: '0 auto' }}>
      <section style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '12px' }}>
          Каталог маршрутів
        </h1>
        <p style={{ color: 'var(--text2)', maxWidth: '700px', lineHeight: 1.7 }}>
          Перегляньте всі доступні автобусні маршрути, порівняйте відстань і час у дорозі, а також перейдіть до розкладу для вибору потрібного рейсу.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gap: '16px', padding: '22px', borderRadius: '24px', background: 'var(--bg2)', border: '1px solid var(--border)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)' }}>
            Звідки
            <select value={fromFilter} onChange={e => setFromFilter(e.target.value)} style={selectStyle}>
              <option value="">Оберіть місто</option>
              {UKRAINE_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)' }}>
            Куди
            <select value={toFilter} onChange={e => setToFilter(e.target.value)} style={selectStyle}>
              <option value="">Оберіть напрямок</option>
              {UKRAINE_CITIES.filter(c => c !== fromFilter).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)' }}>
            Дата
            <input
              type="date"
              value={travelDate}
              onChange={e => setTravelDate(e.target.value)}
              style={selectStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)' }}>
            Пасажири
            <input
              type="number"
              min="1"
              value={passengers}
              onChange={e => setPassengers(e.target.value)}
              style={selectStyle}
            />
          </label>

          <button
            type="button"
            onClick={handleSearch}
            style={{ padding: '16px 18px', borderRadius: '18px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 700, cursor: 'pointer', minHeight: '58px' }}
          >
            Знайти квиток
          </button>
        </div>
      </section>

      {filteredRoutes.length === 0 ? (
        <div style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          Немає маршрутів за обраними параметрами.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {filteredRoutes.map(route => (
            <article key={route.id} style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '18px',
              padding: '24px',
              borderRadius: '20px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ minWidth: '240px', flex: '1 1 260px' }}>
                <div style={{ fontSize: '1.3rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '10px' }}>
                  {route.from} {route.stops?.length ? `→ ${route.stops.join(' → ')} →` : '→'} {route.to}
                </div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, lineHeight: 1.2 }}>{route.distance}</h2>
                <p style={{ margin: '12px 0 0', color: 'var(--text2)' }}>Тривалість поїздки: {route.duration}</p>
              </div>

              <div style={{ display: 'grid', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text2)' }}>Маршрут №{route.id}</span>
                <Link
                  to="/schedule"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 20px',
                    background: 'var(--accent)',
                    color: '#1A1814',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Переглянути рейси
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default RoutesPage