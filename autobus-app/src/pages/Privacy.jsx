import { useDocumentMeta } from '../lib/useDocumentMeta'

const sectionStyle = {
  padding: '24px',
  borderRadius: '18px',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
}

function Privacy() {
  useDocumentMeta({
    title: 'Політика конфіденційності BusToRIA',
    description: 'Політика конфіденційності та правила обробки персональних даних користувачів BusToRIA.',
  })

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '24px' }}>
        Політика конфіденційності
      </h1>
      <section style={sectionStyle}>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7, marginBottom: '12px' }}>
          TODO: цей документ потрібно доповнити актуальними відомостями про
          володільця персональних даних, правові підстави та строки обробки.
        </p>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Наразі BusToRIA використовує контактні та платіжні дані лише для
          оформлення бронювання, підтримки користувачів і виконання вимог
          законодавства. Платіжні реквізити картки обробляє платіжний сервіс і
          вони не зберігаються на сайті.
        </p>
      </section>
    </div>
  )
}

export default Privacy
