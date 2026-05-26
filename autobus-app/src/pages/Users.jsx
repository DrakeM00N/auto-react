import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

function Users() {
  const { currentUser } = useAuth()
  const { users, promoteUser } = useData()
  const [status, setStatus] = useState(null)

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 2rem', textAlign: 'center' }}>
        <h1>Доступ заборонено</h1>
        <p>Тільки адміни можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  const handlePromote = (userId) => {
    promoteUser(userId)
    setStatus({ type: 'success', message: 'Користувача підвищено до адміна' })
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem' }}>Користувачі</h1>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          ← Назад до адмін-панелі
        </Link>
      </div>

      {status && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
          border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
          color: status.type === 'success' ? '#1B6B31' : '#842029',
          marginBottom: '20px',
        }}>
          {status.message}
        </div>
      )}

      <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Користувачі</h2>
        {users.length === 0 ? (
          <p>Немає зареєстрованих користувачів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {users.map(user => (
              <div key={user.id} style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: '260px' }}>
                  <div style={{ fontWeight: 700 }}>{user.name} {user.id === currentUser?.id && '(зараз онлайн)'}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{user.email}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>
                    Роль: {user.role}
                    {user.lastLogin ? ` • востаний вхід: ${new Date(user.lastLogin).toLocaleString('uk-UA')}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {user.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handlePromote(user.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#1A1814',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Зробити адміном
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Users
