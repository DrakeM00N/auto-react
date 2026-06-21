import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { track } from '../lib/analytics'
import { formatDate, isDeparted, todayLocalISO } from '../lib/format'
import { useDocumentMeta } from '../lib/useDocumentMeta'

// One toggleable "Детальніше" panel per trip card. Renders only fields that
// were actually filled in, so old trips with no extended data don't show
// empty sections.
function TripDetails({ trip, route }) {
  const [open, setOpen] = useState(false)

  const hasDeparture = Boolean(trip.departurePoint || trip.arrivalPoint)
  const hasStops = Array.isArray(trip.intermediateStops) && trip.intermediateStops.length > 0
  const hasBusInfo = Boolean(trip.busModel || trip.carrier || trip.busPlate)
  const hasAmenities = Array.isArray(trip.amenities) && trip.amenities.length > 0

  // If nothing was filled in, the toggle has nothing to show — hide it.
  if (!hasDeparture && !hasStops && !hasBusInfo && !hasAmenities) return null

  const labelStyle = { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text2)', marginBottom: '4px' }
  const sectionStyle = { padding: '14px 16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }

  return (
    <div style={{ flexBasis: '100%', marginTop: '4px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          fontSize: '0.95rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {open ? '▾' : '▸'} Детальніше про рейс
      </button>

      <div className={`collapse${open ? ' is-open' : ''}`}>
        <div className="collapse__inner">
          <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
            {hasDeparture && (
              <div style={{ ...sectionStyle, display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                {trip.departurePoint && (
                  <div>
                    <div style={labelStyle}>Точка відправлення</div>
                    <div style={{ color: 'var(--text)' }}>{route?.from}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{trip.departurePoint}</div>
                  </div>
                )}
                {trip.arrivalPoint && (
                  <div>
                    <div style={labelStyle}>Точка прибуття</div>
                    <div style={{ color: 'var(--text)' }}>{route?.to}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{trip.arrivalPoint}</div>
                  </div>
                )}
              </div>
            )}

            {hasStops && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Проміжні зупинки</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {trip.intermediateStops.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {s.address && <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{s.address}</div>}
                      </div>
                      {s.time && <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.time}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasBusInfo && (
              <div style={{ ...sectionStyle, display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {trip.busModel && (
                  <div>
                    <div style={labelStyle}>Автобус</div>
                    <div style={{ color: 'var(--text)' }}>{trip.busModel}</div>
                  </div>
                )}
                {trip.busPlate && (
                  <div>
                    <div style={labelStyle}>Держ. номер</div>
                    <div style={{ color: 'var(--text)' }}>{trip.busPlate}</div>
                  </div>
                )}
                {trip.carrier && (
                  <div>
                    <div style={labelStyle}>Перевізник</div>
                    <div style={{ color: 'var(--text)' }}>{trip.carrier}</div>
                  </div>
                )}
              </div>
            )}

            {hasAmenities && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Зручності</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {trip.amenities.map(a => (
                    <span key={a} style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const UKRAINE_CITIES = [
  'Київ', 'Харків', 'Дніпро', 'Одеса', 'Запоріжжя', 'Львів', 'Кривий Ріг',
  'Миколаїв', 'Вінниця', 'Херсон', 'Полтава', 'Чернігів', 'Черкаси',
  'Хмельницький', 'Житомир', 'Суми', 'Рівне', 'Івано-Франківськ', 'Тернопіль',
  'Кропивницький', 'Луцьк', 'Ужгород', 'Чернівці', 'Кременчук'
].sort((a, b) => a.localeCompare(b, 'uk'))

function Schedule() {
  useDocumentMeta({
    title: 'Розклад рейсів',
    description: 'Актуальний розклад автобусних рейсів: фільтр за датою, напрямком та часом відправлення. Забронюйте місце онлайн за кілька хвилин.',
  })
  const { trips, routes } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const resultsRef = useRef(null)

  // Filters live in the URL so they survive refresh and can be linked to.
  // Reading them straight from searchParams (no local mirror) is what
  // removes the set-state-in-effect anti-pattern.
  const filterFrom = searchParams.get('from') || ''
  const filterTo = searchParams.get('to') || ''
  // No `date` param? Default to today (computed at read time, no effect,
  // no URL write). An explicit value in the URL — even if empty after the
  // user clears the picker — still wins on the next render because we
  // remove the param from the URL when value is '' (see updateFilter).
  const today = todayLocalISO()
  const filterDate = searchParams.get('date') ?? today

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }
  const setFilterFrom = (v) => updateFilter('from', v)
  const setFilterTo = (v) => updateFilter('to', v)
  const setFilterDate = (v) => updateFilter('date', v)

  const filteredTrips = useMemo(() => {
  return trips.filter(trip => {
    const route = routes.find(r => r.id === trip.routeId)
    if (!route) return false

    // Повний список точок маршруту: від → зупинки → до
    const allPoints = [route.from, ...(route.stops || []), route.to]

    const fromIndex = filterFrom
      ? allPoints.findIndex(p => p === filterFrom)
      : 0
    const toIndex = filterTo
      ? allPoints.findLastIndex(p => p === filterTo)
      : allPoints.length - 1

    // Місто "звідки" має бути раніше міста "куди" в маршруті
    const routeMatch = filterFrom && filterTo
      ? fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex
      : filterFrom
        ? fromIndex !== -1
        : filterTo
          ? toIndex !== -1
          : true

    const dateMatch = filterDate ? trip.date === filterDate : true
    const stopsText = (route.stops || []).join(' ') || ''
    const searchText = `${route.from} ${route.to} ${stopsText} ${trip.date} ${trip.time}`.toLowerCase()
    const searchMatch = searchQuery ? searchText.includes(searchQuery.toLowerCase()) : true

    return routeMatch && dateMatch && searchMatch
  })
}, [trips, routes, filterFrom, filterTo, filterDate, searchQuery])

  // Прошедшие рейсы НЕ скрываем — выводим в конце списка, приглушённо.
  // Сортировка стабильная: внутри каждой группы порядок берётся из data layer
  // (бэкенд уже сортирует по date, time).
  const orderedTrips = useMemo(() => {
    const active = []
    const past = []
    for (const t of filteredTrips) (isDeparted(t) ? past : active).push(t)
    return [...active, ...past]
  }, [filteredTrips])

  // Track search demand: debounced so we record a settled search, not every
  // keystroke. Only fires when at least one structured filter is set.
  useEffect(() => {
    if (!filterFrom && !filterTo && !filterDate) return
    const timer = setTimeout(() => {
      track('search_performed', {
        from: filterFrom || '',
        to: filterTo || '',
        date: filterDate || '',
        results_count: filteredTrips.length,
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [filterFrom, filterTo, filterDate, filteredTrips.length])

  // Explicit search action — fired by the "Знайти" button and by Enter
  // in any of the filter inputs. Filtering is already reactive, so this
  // mainly forces an immediate funnel event and scrolls to results.
  const handleSearch = () => {
    track('search_performed', {
      from: filterFrom || '',
      to: filterTo || '',
      date: filterDate || '',
      results_count: filteredTrips.length,
    })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onFiltersKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const selectStyle = {
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
  }

  return (
    <div className="page-glow" style={{ padding: '40px 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <section style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '12px' }}>
          Розклад рейсів
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7, maxWidth: '680px' }}>
          Оберіть зручний рейс та перейдіть до бронювання. Тут показані всі доступні автобусні маршрути з датою, часом, ціною та кількістю вільних місць.
        </p>
      </section>

      <section style={{ marginBottom: '28px', display: 'grid', gap: '14px' }}>
        <div onKeyDown={onFiltersKeyDown} style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>

          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Пошук маршруту
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Одеса, Київ, дата або час"
              style={selectStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Відправлення
            <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={selectStyle}>
              <option value="">Усі міста</option>
              {UKRAINE_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Напрямок
            <select value={filterTo} onChange={e => setFilterTo(e.target.value)} style={selectStyle}>
              <option value="">Усі напрямки</option>
              {UKRAINE_CITIES.filter(c => c !== filterFrom).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Дата
            <input
              type="date"
              value={filterDate}
              min={today}
              onChange={e => setFilterDate(e.target.value)}
              style={selectStyle}
            />
          </label>

          <button
            type="button"
            onClick={handleSearch}
            className="btn-primary"
            style={{ minHeight: '50px', cursor: 'pointer' }}
          >
            Знайти
          </button>
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
          Показано {filteredTrips.length} з {trips.length} рейсів.
        </div>
      </section>

      <div ref={resultsRef} style={{ display: 'grid', gap: '18px' }}>
        {orderedTrips.length === 0 ? (
          <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            Немає доступних рейсів за обраними параметрами.
          </div>
        ) : orderedTrips.map((trip, i) => {
          const route = routes.find(r => r.id === trip.routeId)
          const freeSeats = trip.seats - (trip.bookedCount || 0)
          const departed = isDeparted(trip)

          return (
            <article
              key={trip.id}
              className={`lift-card cascade-item${departed ? ' is-disabled' : ''}`}
              style={{
                '--i': Math.min(i, 8),
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '20px',
                padding: '22px',
                background: 'var(--bg2)',
                borderRadius: '18px',
                border: '1px solid var(--border)',
                opacity: departed ? 0.55 : 1,
              }}
            >
              <div style={{ minWidth: '220px', flex: '1 1 280px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px', fontWeight: 700 }}>
                  {route?.from} {route?.stops?.length ? `→ ${route.stops.join(' → ')} →` : '→'} {route?.to}
                </div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span>{formatDate(trip.date)} • {trip.time}</span>
                  {departed && (
                    <span style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'var(--border)',
                      color: 'var(--text2)',
                      fontWeight: 700,
                    }}>
                      Відправлено
                    </span>
                  )}
                </h2>
                <p style={{ margin: '12px 0 0', color: 'var(--text2)' }}>
                  Відстань: {route?.distance} • Тривалість: {route?.duration}
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
                  {departed ? (
                    <span style={{
                      background: 'var(--border)',
                      color: 'var(--text2)',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                    }}>
                      Бронювання закрите
                    </span>
                  ) : (
                    <Link
                      to={`/booking?tripId=${trip.id}`}
                      className="trip-card__cta"
                      style={{ padding: '10px 18px', borderRadius: '10px' }}
                    >
                      Забронювати
                      <svg className="trip-card__cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>

              <TripDetails trip={trip} route={route} />
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default Schedule