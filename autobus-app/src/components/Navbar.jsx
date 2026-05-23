import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout } = useAuth()

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: '64px',
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
    }}>
      <Link to="/" style={{ fontFamily: 'Unbounded', color: 'var(--accent)', fontSize: '1.1rem' }}>
        Авто<span style={{ color: 'var(--text)' }}>Рейс</span>
      </Link>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link to="/routes" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Маршрути</Link>
        <Link to="/schedule" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Розклад</Link>

        {currentUser ? (
          <>
            <Link to="/profile" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Профіль</Link>
            {currentUser.role === 'admin' && (
              <Link to="/admin" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Адмінка</Link>
            )}
            <span style={{ padding: '8px 16px', color: 'var(--text2)' }}>
              {currentUser.name}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid var(--border2)',
                borderRadius: '20px',
                padding: '6px 14px',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Вийти
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Увійти</Link>
            <Link to="/register" style={{ padding: '8px 16px', color: 'var(--text2)' }}>Реєстрація</Link>
          </>
        )}

        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            borderRadius: '20px',
            padding: '6px 14px',
            color: 'var(--text)',
            fontSize: '14px',
          }}
        >
          {theme === 'dark' ? '☀️ Світла' : '🌙 Темна'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar