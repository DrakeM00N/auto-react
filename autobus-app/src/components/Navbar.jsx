import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const close = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="navbar__bar">
        <Link to="/" className="navbar__logo" onClick={close}>
          Bus<span style={{ color: 'var(--text)' }}>Tour</span>
        </Link>

        <div className="navbar__links">
          <Link to="/routes" className="navbar__link">Маршрути</Link>
          <Link to="/schedule" className="navbar__link">Розклад</Link>

          {currentUser ? (
            <>
              <Link to="/profile" className="navbar__link">Профіль</Link>
              {currentUser.role === 'admin' && (
                <Link to="/admin" className="navbar__link">Адмінка</Link>
              )}
              <span className="navbar__link" style={{ cursor: 'default' }}>
                {currentUser.name}
              </span>
              <button onClick={logout} className="navbar__pill">Вийти</button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__link">Увійти</Link>
              <Link to="/register" className="navbar__link">Реєстрація</Link>
            </>
          )}

          <button onClick={toggleTheme} className="navbar__pill">
            {theme === 'dark' ? '☀️ Світла' : '🌙 Темна'}
          </button>
        </div>

        <button
          className="navbar__burger"
          aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span className={`navbar__burger-line ${menuOpen ? 'is-open' : ''}`} />
          <span className={`navbar__burger-line ${menuOpen ? 'is-open' : ''}`} />
          <span className={`navbar__burger-line ${menuOpen ? 'is-open' : ''}`} />
        </button>
      </div>

      <div className={`navbar__mobile collapse ${menuOpen ? 'is-open' : ''}`}>
        <div className="collapse__inner navbar__mobile-inner">
          <Link to="/routes" className="navbar__mobile-link" onClick={close}>Маршрути</Link>
          <Link to="/schedule" className="navbar__mobile-link" onClick={close}>Розклад</Link>

          {currentUser ? (
            <>
              <Link to="/profile" className="navbar__mobile-link" onClick={close}>Профіль</Link>
              {currentUser.role === 'admin' && (
                <Link to="/admin" className="navbar__mobile-link" onClick={close}>Адмінка</Link>
              )}
              <button
                onClick={() => { logout(); close() }}
                className="navbar__mobile-link navbar__mobile-link--button"
              >
                Вийти ({currentUser.name})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__mobile-link" onClick={close}>Увійти</Link>
              <Link to="/register" className="navbar__mobile-link" onClick={close}>Реєстрація</Link>
            </>
          )}

          <button
            onClick={toggleTheme}
            className="navbar__mobile-link navbar__mobile-link--button"
          >
            {theme === 'dark' ? '☀️ Світла тема' : '🌙 Темна тема'}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar