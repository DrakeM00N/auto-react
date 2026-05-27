import { useDocumentMeta } from '../lib/useDocumentMeta'

const sectionStyle = {
  padding: '24px',
  borderRadius: '18px',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
}

const sectionTitleStyle = {
  fontSize: '1.4rem',
  marginBottom: '12px',
  fontFamily: 'Unbounded',
}

const FEATURES = [
  'Актуальний розклад рейсів в режимі реального часу',
  'Безпечна оплата картою через WayForPay',
  'Електронний квиток на email одразу після оплати',
  'Зручне скасування та повернення коштів',
  'Підтримка 7 днів на тиждень',
]

function About() {
  useDocumentMeta({
    title: 'Про нас',
    description: 'Дізнайтесь більше про сервіс BusTour — онлайн-бронювання автобусних квитків по Україні',
  })

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '24px' }}>
        Про нас
      </h1>

      <div style={{ display: 'grid', gap: '20px' }}>
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Про сервіс</h2>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
            BusTour — це онлайн-сервіс для пошуку та бронювання автобусних квитків
            по Україні. Ми допомагаємо пасажирам швидко знайти потрібний рейс,
            обрати зручний час та оплатити квиток онлайн — без черг та зайвих
            дзвінків.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Чому обирають нас</h2>
          <ul style={{ display: 'grid', gap: '10px', listStyle: 'none', padding: 0, margin: 0 }}>
            {FEATURES.map(feature => (
              <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Контакти</h2>
          <div style={{ display: 'grid', gap: '8px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <div>
              Email:{' '}
              <a href="mailto:bustour.ukraine@gmail.com" style={{ color: 'var(--accent)' }}>
                bustour.ukraine@gmail.com
              </a>
            </div>
            <div>
              Сайт:{' '}
              <a href="https://bustour.com.ua" style={{ color: 'var(--accent)' }}>
                bustour.com.ua
              </a>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Юридична інформація</h2>
          <div style={{ display: 'grid', gap: '8px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <div>ФЛП: Єльнікова Лілія Олександрівна</div>
            <div>ЄДРПОУ: 3548506027</div>
            <div>Адреса: Україна, Заводське, Полтавська область</div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Умови повернення</h2>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
            Квиток можна скасувати не пізніше ніж за 24 години до відправлення.
            Кошти повертаються протягом 3-5 робочих днів.
          </p>
        </section>
      </div>
    </div>
  )
}

export default About
