import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the route changes (link click, back/forward).
  // Updating state during render (not in an effect) is the React-recommended
  // way to react to a changed prop/value — avoids an extra render pass.
  const [trackedPath, setTrackedPath] = useState(location.pathname)
  if (location.pathname !== trackedPath) {
    setTrackedPath(location.pathname)
    setMenuOpen(false)
  }

  // Lock body scroll while the mobile menu overlay is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const linkStyle = { padding: '8px 16px', color: 'var(--text2)' }

  return (
    <nav className="navbar">
      <Link
        to="/"
        className="navbar__logo"
        onClick={() => setMenuOpen(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <img src={logo} alt="BusToRIA" style={{ width: '32px', height: '32px' }} />
        BusTo<span style={{ color: 'var(--text)' }}>RIA</span>
      </Link>

      {/* Desktop links — hidden under the mobile breakpoint via CSS */}
      <div className="navbar__links navbar__links--desktop">
        <Link to="/routes" style={linkStyle}>Маршрути</Link>
        <Link to="/schedule" style={linkStyle}>Розклад</Link>

        {currentUser ? (
          <>
            <Link to="/profile" style={linkStyle}>Профіль</Link>
            {currentUser.role === 'admin' && (
              <Link to="/admin" style={linkStyle}>Адмінка</Link>
            )}
            <span style={linkStyle}>{currentUser.name}</span>
            <button onClick={logout} className="navbar__pill-btn">Вийти</button>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Увійти</Link>
            <Link to="/register" style={linkStyle}>Реєстрація</Link>
          </>
        )}

        <button onClick={toggleTheme} className="navbar__pill-btn navbar__theme-btn">
          {theme === 'dark' ? '☀️ Світла' : '🌙 Темна'}
        </button>
      </div>

      {/* Mobile burger — hidden on desktop via CSS */}
      <button
        className={`navbar__burger ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
        aria-expanded={menuOpen}
        aria-controls="navbar-mobile-menu"
      >
        <span /><span /><span />
      </button>

      {/* Mobile overlay menu */}
      <div
        id="navbar-mobile-menu"
        className={`navbar__overlay ${menuOpen ? 'is-open' : ''}`}
      >
        <div className="navbar__overlay-links">
          <Link to="/routes" onClick={() => setMenuOpen(false)}>Маршрути</Link>
          <Link to="/schedule" onClick={() => setMenuOpen(false)}>Розклад</Link>

          {currentUser ? (
            <>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>Профіль</Link>
              {currentUser.role === 'admin' && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>Адмінка</Link>
              )}
              <span className="navbar__overlay-user">{currentUser.name}</span>
              <button onClick={() => { logout(); setMenuOpen(false) }} className="navbar__pill-btn">
                Вийти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Увійти</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Реєстрація</Link>
            </>
          )}

          <button onClick={toggleTheme} className="navbar__pill-btn navbar__theme-btn">
            {theme === 'dark' ? '☀️ Світла тема' : '🌙 Темна тема'}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar