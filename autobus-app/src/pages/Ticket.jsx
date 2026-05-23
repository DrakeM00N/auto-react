import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TicketCard from '../components/TicketCard'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const PRINT_STYLE = `@media print {
  body * { visibility: hidden; }
  #ticket-print, #ticket-print * { visibility: visible; }
  #ticket-print { position: absolute; left: 50%; transform: translateX(-50%); top: 0; }
}`

const primaryBtn = { padding: '12px 24px', borderRadius: '14px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }
const secondaryBtn = { padding: '12px 24px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }

function Ticket() {
  const { code } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`${BASE}/tickets/${encodeURIComponent(code)}`)
      .then(async res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Квиток не знайдено' : 'Помилка сервера')
        return res.json()
      })
      .then(data => { if (active) { setTicket(data); setLoading(false) } })
      .catch(e => { if (active) { setError(e.message); setLoading(false) } })
    return () => { active = false }
  }, [code])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Завантаження квитка...</div>
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🎫</div>
        <p style={{ color: 'var(--text2)', marginBottom: '20px' }}>{error}</p>
        <Link to="/schedule" style={{ color: 'var(--accent)' }}>Перейти до розкладу</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
      <style>{PRINT_STYLE}</style>
      <h1 style={{ fontFamily: 'Unbounded', fontSize: '1.8rem', marginBottom: '24px', textAlign: 'center' }}>Ваш квиток</h1>
      <TicketCard ticket={ticket} />
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => window.print()} style={primaryBtn}>🖨️ Роздрукувати</button>
        <Link to="/schedule" style={secondaryBtn}>← До розкладу</Link>
      </div>
    </div>
  )
}

export default Ticket
