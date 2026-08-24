import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatDate, isDeparted } from '../lib/format'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { useCountUp } from '../lib/useCountUp'

const FAQ_ITEMS = [
  {
    question: 'Як забронювати квиток?',
    answer: 'Оберіть маршрут або рейс, натисніть "Забронювати", заповніть ім\'я, прізвище та номер телефону — і квиток ваш. Електронний квиток можна роздрукувати або зберегти на телефоні.',
  },
  {
    question: 'Чи можна скасувати бронювання?',
    answer: 'Так, скасувати бронювання можна в особистому кабінеті у розділі "Мої бронювання". Зверніться також до нашої підтримки за телефоном якщо виникли труднощі.',
  },
  {
    question: 'За скільки днів наперед можна купити квиток?',
    answer: 'Квитки доступні на всі заплановані рейси. Рекомендуємо бронювати заздалегідь — особливо на вихідні та святкові дні, коли місця розбирають швидко.',
  },
  {
    question: 'Що робити якщо я запізнився на рейс?',
    answer: 'На жаль, у разі запізнення квиток не переноситься і не повертається. Рекомендуємо приїжджати на місце відправлення за 10–15 хвилин до рейсу.',
  },
  {
    question: 'Скільки багажу можна взяти?',
    answer: 'Кожен пасажир може взяти одну велику валізу (до 20 кг) та один ручний багаж. Великогабаритний багаж уточнюйте у підтримки за телефоном.',
  },
  {
    question: 'Чи є знижки для дітей та пільговиків?',
    answer: 'Діти до 5 років їдуть безкоштовно на колінах у батьків. Для дітей від 5 до 12 років та пільговиків діє знижка 50%. Уточнюйте деталі при бронюванні.',
  },
]

const BusIllustration = () => (
  <svg width="100%" viewBox="0 0 480 280" role="img" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '480px' }}>
    <title>Ілюстрація автобуса BusToRIA</title>
    <desc>Стилізований контурний автобус на дорозі</desc>

    <circle cx="40" cy="35" r="2" fill="#FFC93C" opacity="0.4"/>
    <circle cx="90" cy="20" r="1.5" fill="#FFC93C" opacity="0.3"/>
    <circle cx="150" cy="40" r="2" fill="#FFC93C" opacity="0.5"/>
    <circle cx="220" cy="15" r="1.5" fill="#FFC93C" opacity="0.3"/>
    <circle cx="290" cy="35" r="2" fill="#FFC93C" opacity="0.4"/>
    <circle cx="360" cy="18" r="1.5" fill="#FFC93C" opacity="0.3"/>
    <circle cx="430" cy="42" r="2" fill="#FFC93C" opacity="0.5"/>
    <circle cx="60" cy="65" r="1" fill="#FFC93C" opacity="0.25"/>
    <circle cx="400" cy="55" r="1" fill="#FFC93C" opacity="0.25"/>

    <line x1="0" y1="195" x2="480" y2="195" stroke="#FFC93C" strokeWidth="1.5" opacity="0.12"/>
    <line x1="0" y1="208" x2="480" y2="208" stroke="#FFC93C" strokeWidth="1" opacity="0.07"/>

    <rect x="0" y="210" width="30" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="55" y="210" width="45" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="130" y="210" width="45" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="205" y="210" width="45" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="280" y="210" width="45" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="355" y="210" width="45" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>
    <rect x="430" y="210" width="50" height="3" rx="1.5" fill="#FFC93C" opacity="0.25"/>

    <g transform="translate(20, 80)">
      <rect x="0" y="0" width="440" height="105" rx="14" fill="none" stroke="#4ADE80" strokeWidth="2"/>
      <rect x="0" y="0" width="440" height="105" rx="14" fill="#4ADE80" opacity="0.04"/>
      <rect x="0" y="68" width="440" height="37" rx="0" fill="#4ADE80" opacity="0.06"/>
      <rect x="0" y="68" width="440" height="2.5" fill="#4ADE80" opacity="0.35"/>
      <line x1="0" y1="34" x2="440" y2="34" stroke="#4ADE80" strokeWidth="1.5" opacity="0.25"/>
      <rect x="14" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="16" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="70" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="72" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="126" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="128" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="182" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="184" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="238" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="240" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="294" y="7" width="46" height="24" rx="5" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.55"/>
      <rect x="296" y="9" width="42" height="20" rx="3" fill="#4ADE80" opacity="0.08"/>
      <rect x="352" y="4" width="72" height="30" rx="6" fill="none" stroke="#4ADE80" strokeWidth="2" opacity="0.75"/>
      <rect x="354" y="6" width="68" height="26" rx="4" fill="#4ADE80" opacity="0.12"/>
      <rect x="426" y="40" width="14" height="24" rx="3" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.45"/>
      <rect x="428" y="42" width="10" height="10" rx="2" fill="#4ADE80" opacity="0.18"/>
      <rect x="0" y="40" width="10" height="24" rx="3" fill="#4ADE80" opacity="0.12"/>
      <circle cx="68" cy="103" r="24" fill="none" stroke="#4ADE80" strokeWidth="2"/>
      <circle cx="68" cy="103" r="13" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.45"/>
      <circle cx="68" cy="103" r="5" fill="#4ADE80" opacity="0.35"/>
      <circle cx="338" cy="103" r="24" fill="none" stroke="#4ADE80" strokeWidth="2"/>
      <circle cx="338" cy="103" r="13" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.45"/>
      <circle cx="338" cy="103" r="5" fill="#4ADE80" opacity="0.35"/>
      <line x1="14" y1="46" x2="14" y2="65" stroke="#4ADE80" strokeWidth="1" opacity="0.25"/>
      <line x1="26" y1="46" x2="26" y2="65" stroke="#4ADE80" strokeWidth="1" opacity="0.25"/>
      <line x1="420" y1="46" x2="420" y2="65" stroke="#4ADE80" strokeWidth="1" opacity="0.25"/>
      <line x1="432" y1="46" x2="432" y2="65" stroke="#4ADE80" strokeWidth="1" opacity="0.25"/>
    </g>

    <circle cx="80" cy="240" r="3" fill="#FFC93C" opacity="0.15"/>
    <circle cx="130" cy="248" r="2" fill="#FFC93C" opacity="0.1"/>
    <circle cx="350" cy="240" r="3" fill="#FFC93C" opacity="0.15"/>
    <circle cx="400" cy="248" r="2" fill="#FFC93C" opacity="0.1"/>
  </svg>
)

function FaqItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%', padding: '20px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', gap: '16px',
          background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
          textAlign: 'left', fontSize: '1rem', fontWeight: 600,
        }}
      >
        {item.question}
        <span style={{
          color: 'var(--accent)', fontSize: '1.4rem', lineHeight: 1,
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0,
        }}>+</span>
      </button>
      {open && (
        <div style={{
          padding: '16px 24px 20px', color: 'var(--text2)', lineHeight: 1.7,
          fontSize: '0.95rem', borderTop: '1px solid var(--border)',
        }}>
          {item.answer}
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }) {
  const display = useCountUp(value)
  return (
    <div className="stat">
      <div style={{ fontFamily: 'Unbounded', fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{display}</div>
      <div style={{ color: 'var(--text2)', fontSize: '0.9rem', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function Home() {
  useDocumentMeta({
    title: 'Автобусні квитки онлайн по Україні',
    description: 'Купуйте автобусні квитки онлайн: розклад рейсів, популярні маршрути, бронювання з оплатою картою та електронний квиток на телефон.',
  })

  const { routes, trips, loading } = useData()
  const upcomingTrips = trips.filter(t => !isDeparted(t)).slice(0, 3)
  const citiesCovered = new Set(routes.flatMap(r => [r.from, r.to])).size

  return (
    <div>

      {/* ГЕРОЙ — показується одразу, не залежить від API */}
      <section className="hero" style={{
        padding: '80px 2rem',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="hero-grid">
          <div>
            <p className="hero__eyebrow" style={{
              color: 'var(--accent)', fontFamily: 'Unbounded',
              fontSize: '0.75rem', letterSpacing: '0.15em',
              textTransform: 'uppercase', marginBottom: '16px',
            }}>
              Зручні подорожі Україною
            </p>
            <h1 className="hero__title" style={{
              fontFamily: 'Unbounded',
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 700, lineHeight: 1.15, marginBottom: '24px',
            }}>
              Автобусні рейси<br />
              <span style={{ color: 'var(--accent)' }}>швидко та зручно</span>
            </h1>
            <p className="hero__subtitle" style={{
              color: 'var(--text2)', fontSize: '1.1rem',
              maxWidth: '440px', marginBottom: '40px', lineHeight: 1.7,
            }}>
              Бронюйте квитки онлайн, обирайте зручний час відправлення та подорожуйте з комфортом
            </p>
            <div className="hero__cta-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link to="/schedule" className="btn-primary">
                Дивитись розклад <span aria-hidden="true">→</span>
              </Link>
              <Link to="/routes" className="btn-ghost">
                Всі маршрути
              </Link>
            </div>
          </div>

          <div className="hero-bus" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <BusIllustration />
          </div>
        </div>
      </section>

      {/* СТАТИСТИКА */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: '2px', background: 'var(--border)' }}>
        <Stat value={routes.length} label="Маршрутів" />
        <Stat value={trips.length} label="Рейсів" />
        <Stat value={citiesCovered} label="Міст у мережі" />
      </section>

      {/* НАЙБЛИЖЧІ РЕЙСИ */}
      <section style={{ padding: '60px 2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Unbounded', fontSize: '1.4rem', marginBottom: '8px' }}>
          Найближчі рейси
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: '32px' }}>
          Актуальні рейси на найближчі дні
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <>
              <div style={{ height: '80px', background: 'var(--bg3)', borderRadius: '12px' }} />
              <div style={{ height: '80px', background: 'var(--bg3)', borderRadius: '12px' }} />
              <div style={{ height: '80px', background: 'var(--bg3)', borderRadius: '12px' }} />
            </>
          ) : upcomingTrips.map(trip => {
            const route = routes.find(r => r.id === trip.routeId)
            const freeSeats = trip.seats - (trip.bookedCount || 0)
            return (
              <div key={trip.id} className="trip-card" style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '20px 24px',
                flexWrap: 'wrap', gap: '16px',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px' }}>
                    {route?.from} → {route?.to}
                  </div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                    {formatDate(trip.date)} • відправлення о {trip.time}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Місць</div>
                    <div style={{ fontWeight: 600, color: freeSeats < 10 ? '#E74C3C' : 'var(--accent)' }}>{freeSeats}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Ціна</div>
                    <div style={{ fontWeight: 600 }}>{trip.price} грн</div>
                  </div>
                  <Link to={`/booking?tripId=${trip.id}`} className="trip-card__cta">
                    Забронювати <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link to="/schedule" style={{ color: 'var(--accent)', fontWeight: 500, borderBottom: '1px solid var(--accent)', paddingBottom: '2px', textDecoration: 'none' }}>
            Переглянути всі рейси →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '60px 2rem', maxWidth: '760px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Unbounded', fontSize: '1.4rem', marginBottom: '8px', textAlign: 'center' }}>
          Часті запитання
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: '32px', textAlign: 'center' }}>
          Відповіді на найпоширеніші питання про наш сервіс
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} item={item} />
          ))}
        </div>
      </section>

    </div>
  )
}

export default Home