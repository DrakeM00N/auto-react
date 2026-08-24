import { Link } from 'react-router-dom'
import UkraineMap from './UkraineMap'

function Footer() {
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
            <div style={{ fontFamily: 'Unbounded', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '12px' }}>
              BusToRIA
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 16px' }}>
              Зручне бронювання автобусних квитків по всій Україні
            </p>

            {/* Соцмережі */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="https://www.instagram.com/bustour.bus?igsh=MWxyMTFsZTNobjhsdw=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text2)',
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.color = '#fff'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
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
                { to: '/oferta', label: 'Політика конфіденційності' },
              ].map((link, i) => (
                <Link key={`${link.to}-${i}`} to={link.to} style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Контакти */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: '14px', fontSize: '0.95rem' }}>Контакти</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="tel:+380500570656" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 +38 (050) 057-06-56
              </a>
              <a href="tel:+380979075738" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 +38 (097) 907-57-38
              </a>
              <a href="tel:+380634859399" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 +38 (063) 485-93-99
              </a>
              <a href="mailto:bustour.ukraine@gmail.com" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✉️ bustour.ukraine@gmail.com
              </a>
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
            © {new Date().getFullYear()} BusToRIA. Всі права захищено.
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