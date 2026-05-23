import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatDate, isDeparted } from '../lib/format'

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

function FaqItem({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      borderRadius: '16px',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        {item.question}
        <span style={{
          color: 'var(--accent)',
          fontSize: '1.4rem',
          lineHeight: 1,
          transform: open ? 'rotate(45deg)' : 'none',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>
          +
        </span>
      </button>
      {open && (
        <div style={{
          padding: '0 24px 20px',
          color: 'var(--text2)',
          lineHeight: 1.7,
          fontSize: '0.95rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
        }}>
          {item.answer}
        </div>
      )}
    </div>
  )
}

function Home() {
  const { routes, trips } = useData()
  // Главная — только актуальные рейсы. Прошедшие отрезаются по Києву.
  const upcomingTrips = trips.filter(t => !isDeparted(t)).slice(0, 3)

  return (
    <div>

      {/* ГЕРОЙ */}
      <section style={{
        padding: '80px 2rem',
        textAlign: 'center',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{
          color: 'var(--accent)',
          fontFamily: 'Unbounded',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          Зручні подорожі Україною
        </p>

        <h1 style={{
          fontFamily: 'Unbounded',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: '24px',
        }}>
          Автобусні рейси<br />
          <span style={{ color: 'var(--accent)' }}>швидко та зручно</span>
        </h1>

        <p style={{
          color: 'var(--text2)',
          fontSize: '1.1rem',
          maxWidth: '480px',
          margin: '0 auto 40px',
          lineHeight: 1.7,
        }}>
          Бронюйте квитки онлайн, обирайте зручний час відправлення та подорожуйте з комфортом
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/schedule" style={{
            background: 'var(--accent)',
            color: '#1A1814',
            padding: '14px 32px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '1rem',
            fontFamily: 'Unbounded',
            textDecoration: 'none',
          }}>
            Дивитись розклад
          </Link>
          <Link to="/routes" style={{
            background: 'transparent',
            color: 'var(--text)',
            padding: '14px 32px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '1rem',
            border: '1px solid var(--border2)',
            textDecoration: 'none',
          }}>
            Всі маршрути
          </Link>
        </div>
      </section>

      {/* СТАТИСТИКА */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: '2px', background: 'var(--border)' }}>
        {[
          { value: routes.length, label: 'Маршрутів' },
          { value: trips.length, label: 'Рейсів' },
          { value: '40', label: 'Місць у автобусі' },
        ].map((stat, i) => (
          <div key={i} style={{ flex: 1, maxWidth: '200px', padding: '32px 16px', textAlign: 'center', background: 'var(--bg)' }}>
            <div style={{ fontFamily: 'Unbounded', fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
              {stat.value}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '0.9rem', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
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
          {upcomingTrips.map(trip => {
            const route = routes.find(r => r.id === trip.routeId)
            const freeSeats = trip.seats - (trip.bookedCount || 0)
            return (
              <div key={trip.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                background: 'var(--bg2)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: '16px',
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
                  <Link to={`/booking?tripId=${trip.id}`} style={{
                    background: 'var(--accent)',
                    color: '#1A1814',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}>
                    Забронювати
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