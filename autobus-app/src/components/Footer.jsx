import { Link } from 'react-router-dom'
import UkraineMap from './UkraineMap'
import { SITE } from '../config/site'
import { useData } from '../context/DataContext'
import { routePath } from '../lib/routeSlug'

const POPULAR_DIRECTIONS = [
  ['Кременчук', 'Тернопіль'],
  ['Кременчук', 'Харків'],
  ['Кременчук', 'Львів'],
  ['Львів', 'Вінниця'],
  ['Запоріжжя', 'Чернівці'],
]

function Footer() {
  const { routes } = useData()
  const popularRoutes = POPULAR_DIRECTIONS
    .map(([from, to]) => routes.find(route =>
      (route.from === from && route.to === to) || (route.from === to && route.to === from),
    ))
    .filter(Boolean)

  const socialIconStyle = {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text2)',
    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
  }

  const handleSocialEnter = (e) => {
    e.currentTarget.style.background = 'var(--accent)'
    e.currentTarget.style.color = '#fff'
    e.currentTarget.style.borderColor = 'var(--accent)'
  }

  const handleSocialLeave = (e) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = 'var(--text2)'
    e.currentTarget.style.borderColor = 'var(--border)'
  }

  return (
    <footer style={{
      position: 'relative',
      overflow: 'hidden',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg2)',
      padding: '48px 2rem 24px',
      marginTop: 'auto',
    }}>
      <UkraineMap />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>

          {/* Бренд */}
          <div>
            <div style={{ fontFamily: 'Unbounded', fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px' }}>
              <span style={{ color: '#3DA70F' }}>Bus</span>
              <span style={{ color: 'var(--text)' }}>To</span>
              <span style={{ color: '#3DA70F' }}>RIA</span>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 16px' }}>
              Зручне бронювання автобусних квитків по всій Україні
            </p>

            {/* Соцмережі */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="https://www.instagram.com/bustoria_bus/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={socialIconStyle}
                onMouseEnter={handleSocialEnter}
                onMouseLeave={handleSocialLeave}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
                </svg>
              </a>

              <a
                href="https://www.facebook.com/people/%D0%92%D1%96%D0%BA%D1%82%D0%BE%D1%80-%D0%9B%D0%B8%D0%BC%D0%B0%D0%BD%D0%B5%D1%86%D1%8C/61591237206412/?rdid=IHPhQ8EaKQ6NFt9Q&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1HNvNf9e1C%2F"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                style={socialIconStyle}
                onMouseEnter={handleSocialEnter}
                onMouseLeave={handleSocialLeave}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 8.5h2V5.5h-2c-2.2 0-3.5 1.5-3.5 3.5v2H9.5v3H11.5V21h3v-7h2l0.5-3h-2.5V9c0-0.5 0.2-0.5 0.5-0.5Z" fill="currentColor"/>
                </svg>
              </a>

              <a
                href="viber://chat?number=%2B380500570656"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Viber"
                style={socialIconStyle}
                onMouseEnter={handleSocialEnter}
                onMouseLeave={handleSocialLeave}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3C7 3 3.5 6.2 3.5 10.3c0 2.4 1.2 4.5 3.2 5.9-0.1 0.9-0.4 2.3-1.2 3.4 1.4-0.2 2.9-0.9 3.9-1.6 0.8 0.2 1.7 0.3 2.6 0.3 5 0 8.5-3.2 8.5-7.3S17 3 12 3Z" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8.7 9.2c0.3 2.6 2.4 4.6 5 4.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Навігація */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Сервіс</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { to: '/routes', label: 'Маршрути' },
                { to: '/schedule', label: 'Розклад рейсів' },
                { to: '/schedule', label: 'Купити квиток' },
                { to: '/about', label: 'Про нас' },
                { to: '/oferta', label: 'Публічна оферта' },
                { to: '/privacy', label: 'Політика конфіденційності' },
              ].map((link, i) => (
                <Link key={`${link.to}-${i}`} to={link.to} style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Популярні напрямки</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {popularRoutes.length ? popularRoutes.map(route => (
                <Link key={route.id} to={routePath(route)} style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                  {route.from} — {route.to}
                </Link>
              )) : (
                <Link to="/routes" style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                  Усі маршрути
                </Link>
              )}
            </div>
          </div>

          {/* Контакти */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Контакти</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="tel:+380500570656" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 {SITE.phone}
              </a>
              <a href="tel:+380979075738" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 +38 (097) 907-57-38
              </a>
              <a href="tel:+380634859399" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 +38 (063) 485-93-99
              </a>
              <a href={`mailto:${SITE.email}`} style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✉️ {SITE.email}
              </a>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Реквізити</div>
              <div style={{ display: 'grid', gap: '7px', color: 'var(--text2)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <div>Юр. особа / ФОП: {SITE.legalName}</div>
                <div>ЄДРПОУ: {SITE.edrpou}</div>
                <div>Адреса: {SITE.address}</div>
              </div>
            </div>
          </div>

          {/* Графік роботи */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Графік роботи</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)', fontSize: '0.9rem' }}>
              <div>Пн–Пт: 07:00 – 21:00</div>
              <div>Сб–Нд: 08:00 – 20:00</div>
              <div style={{ marginTop: '8px', color: 'var(--accent)', fontWeight: 600 }}>
                Онлайн бронювання — 24/7
              </div>
            </div>
          </div>

        </div>

        {/* Нижня лінія */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
            © {new Date().getFullYear()} {SITE.name}. Всі права захищено.
          </div>
          <div style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
            Зроблено в Україні 🇺🇦
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer