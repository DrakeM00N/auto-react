import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const STEP_LABELS = {
  page_view: 'Перегляди сторінок',
  search_performed: 'Пошук рейсів',
  booking_started: 'Початок бронювання',
  booking_submitted: 'Відправлено форму',
  booking_completed: 'Бронювання завершено',
}

const cardStyle = {
  padding: '24px',
  borderRadius: '18px',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
}

function Analytics() {
  const { currentUser } = useApp()
  const [range, setRange] = useState('30')
  const [funnel, setFunnel] = useState([])
  const [demand, setDemand] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const [funnelRes, demandRes] = await Promise.all([
        fetch(`${BASE}/analytics/funnel?range=${range}`, { headers }),
        fetch(`${BASE}/analytics/search-demand?range=${range}`, { headers }),
      ])
      if (!funnelRes.ok || !demandRes.ok) {
        throw new Error('Не вдалося завантажити аналітику')
      }
      const funnelData = await funnelRes.json()
      const demandData = await demandRes.json()
      setFunnel(funnelData.steps || [])
      setDemand(demandData.rows || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 2rem', textAlign: 'center' }}>
        <h1>Доступ заборонено</h1>
        <p>Тільки адміни можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  const rangeButton = (value, label) => (
    <button
      type="button"
      onClick={() => setRange(value)}
      style={{
        padding: '8px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: range === value ? 'var(--accent)' : 'transparent',
        color: range === value ? '#1A1814' : 'var(--text)',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem' }}>Аналітика</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {rangeButton('7', '7 днів')}
          {rangeButton('30', '30 днів')}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          ← Назад до адмін-панелі
        </Link>
      </div>

      {error && (
        <div style={{ ...cardStyle, marginBottom: '24px', background: '#FDECEA', border: '1px solid #F5C6CB', color: '#842029' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...cardStyle, textAlign: 'center' }}>Завантаження...</div>
      ) : (
        <div style={{ display: 'grid', gap: '32px' }}>

          {/* Конверсійна воронка */}
          <section style={cardStyle}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Воронка бронювання</h2>
            <p style={{ color: 'var(--text2)', marginBottom: '20px', fontSize: '0.95rem' }}>
              Кількість сесій на кожному кроці. Відсоток — від переглядів сторінок.
            </p>
            {funnel.every(step => step.sessions === 0) ? (
              <p style={{ color: 'var(--text2)' }}>Поки що немає даних за цей період.</p>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {funnel.map(step => (
                  <div key={step.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: 600 }}>{STEP_LABELS[step.name] || step.name}</span>
                      <span style={{ color: 'var(--text2)' }}>
                        {step.sessions} сесій • {step.pct}%
                      </span>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: '10px', overflow: 'hidden', height: '28px', border: '1px solid var(--border)' }}>
                      <div style={{
                        width: `${Math.max(step.pct, step.sessions > 0 ? 2 : 0)}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Попит за напрямками */}
          <section style={cardStyle}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Попит за напрямками</h2>
            <p style={{ color: 'var(--text2)', marginBottom: '20px', fontSize: '0.95rem' }}>
              Що шукають відвідувачі. Рядки з позначкою — напрямки без жодного доступного рейсу.
            </p>
            {demand.length === 0 ? (
              <p style={{ color: 'var(--text2)' }}>Поки що немає пошукових запитів за цей період.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 110px', gap: '12px', padding: '0 14px', color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <span>Напрямок</span>
                  <span style={{ textAlign: 'right' }}>Пошуків</span>
                  <span style={{ textAlign: 'right' }}>Без рейсів</span>
                </div>
                {demand.map((row, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 110px',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg)',
                    border: `1px solid ${row.noTrips ? '#E74C3C' : 'var(--border)'}`,
                    alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600 }}>
                      {row.from} → {row.to}
                      {row.noTrips && (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#E74C3C', fontWeight: 700 }}>
                          ● немає рейсів
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 700 }}>{row.searches}</span>
                    <span style={{ textAlign: 'right', color: row.zeroResults > 0 ? '#E74C3C' : 'var(--text2)' }}>
                      {row.zeroResults}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}

export default Analytics
