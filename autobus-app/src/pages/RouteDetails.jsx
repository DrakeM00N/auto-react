import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatDate, getUpcomingTrips } from '../lib/format'
import { routePath } from '../lib/routeSlug'
import { useDocumentMeta } from '../lib/useDocumentMeta'

const FAQ = [
  {
    question: 'Як забронювати квиток на цей маршрут?',
    answer: 'Оберіть потрібний рейс у списку, натисніть «Забронювати», введіть дані пасажира та оплатіть замовлення онлайн.',
  },
  {
    question: 'Що входить у вартість квитка?',
    answer: 'У вартість входить проїзд автобусом за обраним рейсом. Точні умови перевезення та багажу вказані в деталях рейсу.',
  },
  {
    question: 'Як дізнатися актуальний час відправлення?',
    answer: 'На цій сторінці показуються найближчі доступні рейси. Перед бронюванням перевірте дату й час у картці рейсу.',
  },
]

function RouteDetails() {
  const { slug } = useParams()
  const { routes, trips } = useData()
  const route = routes.find(item => routePath(item).split('/').pop() === slug)
  const routeTrips = useMemo(
    () => route ? getUpcomingTrips(trips.filter(trip => trip.routeId === route.id)).slice(0, 5) : [],
    [route, trips],
  )
  const price = routeTrips.length ? Math.min(...routeTrips.map(trip => Number(trip.price)).filter(Number.isFinite)) : null
  const title = route ? `Автобус ${route.from} — ${route.to}` : 'Маршрут не знайдено'
  const description = route
    ? `Автобус ${route.from} — ${route.to}: ціна від ${price || '...'} грн, найближчі рейси та онлайн-бронювання квитків.`
    : 'Перегляньте доступні автобусні маршрути BusToRIA та забронюйте квиток онлайн.'

  useDocumentMeta({ title, description, path: route ? routePath(route) : `/routes/${slug}` })
  const otherRoutes = route ? routes.filter(item => item.from === route.from && item.id !== route.id).slice(0, 5) : []

  if (!route) {
    return (
      <div style={{ padding: '60px 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Unbounded' }}>Маршрут не знайдено</h1>
        <Link to="/routes" className="btn-primary" style={{ marginTop: '24px' }}>До всіх маршрутів</Link>
      </div>
    )
  }

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Головна', item: 'https://bustour.com.ua/' },
        { '@type': 'ListItem', position: 2, name: 'Маршрути', item: 'https://bustour.com.ua/routes' },
        { '@type': 'ListItem', position: 3, name: `${route.from} — ${route.to}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ]

  return (
    <div className="page-glow" style={{ padding: '40px 2rem', maxWidth: '980px', margin: '0 auto' }}>
      {jsonLd.map((schema, index) => (
        <script key={index} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
      <nav aria-label="Хлібні крихти" style={{ color: 'var(--text2)', marginBottom: '20px' }}>
        <Link to="/">Головна</Link> <span aria-hidden="true">→</span>{' '}
        <Link to="/routes">Маршрути</Link> <span aria-hidden="true">→</span>{' '}
        <span>{route.from} — {route.to}</span>
      </nav>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '14px' }}>
        Автобус {route.from} — {route.to}
      </h1>
      <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
        {route.distance} · {route.duration}
      </p>
      <div style={{ marginTop: '24px', padding: '20px 24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <strong style={{ fontSize: '1.2rem' }}>Ціна: {price ? `від ${price} грн` : 'уточнюється'}</strong>
      </div>

      <section style={{ marginTop: '36px' }}>
        <h2 style={{ fontFamily: 'Unbounded', fontSize: '1.35rem', marginBottom: '18px' }}>Найближчі рейси</h2>
        {routeTrips.length ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {routeTrips.map(trip => (
              <article key={trip.id} className="trip-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 22px', flexWrap: 'wrap' }}>
                <div>
                  <strong>{formatDate(trip.date)} о {trip.time}</strong>
                  <div style={{ color: 'var(--text2)', marginTop: '5px' }}>{trip.price} грн · вільних місць: {trip.seats - (trip.bookedCount || 0)}</div>
                </div>
                <Link to={`/booking?tripId=${trip.id}`} className="trip-card__cta">Забронювати →</Link>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text2)' }}>Найближчих рейсів поки немає. Перевірте розклад пізніше.</p>
        )}
      </section>

      <section style={{ marginTop: '42px' }}>
        <h2 style={{ fontFamily: 'Unbounded', fontSize: '1.35rem', marginBottom: '18px' }}>Питання та відповіді</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {FAQ.map(item => (
            <details key={item.question} style={{ padding: '16px 20px', borderRadius: '14px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.question}</summary>
              <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginTop: '12px' }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '42px' }}>
        <h2 style={{ fontFamily: 'Unbounded', fontSize: '1.2rem', marginBottom: '14px' }}>Інші рейси з міста {route.from}</h2>
        {otherRoutes.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {otherRoutes.map(item => (
              <Link key={item.id} to={routePath(item)} style={{ color: 'var(--accent)', border: '1px solid var(--border2)', borderRadius: '999px', padding: '8px 12px' }}>
                {item.from} — {item.to}
              </Link>
            ))}
          </div>
        ) : (
          <Link to="/routes" style={{ color: 'var(--accent)' }}>Переглянути всі маршрути →</Link>
        )}
      </section>
    </div>
  )
}

export default RouteDetails
