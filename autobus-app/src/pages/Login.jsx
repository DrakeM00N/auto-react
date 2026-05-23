import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleAuthButton from '../components/GoogleAuthButton'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState(null)

  const fieldStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
  }

  const passwordWrapperStyle = {
    position: 'relative',
    display: 'grid',
  }

  const eyeButtonStyle = {
    position: 'absolute',
    top: '50%',
    right: '14px',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text2)',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: 0,
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const result = await login(normalizedEmail, password)
    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }
    setStatus({ type: 'success', message: 'Вхід виконано успішно!' })
    navigate('/')
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
      <section style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Увійти
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Введіть email та пароль, щоб увійти в свій кабінет і продовжити бронювання.
        </p>
      </section>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Email
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
            placeholder="example@mail.com"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Пароль
          <div style={passwordWrapperStyle}>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              style={eyeButtonStyle}
              aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
            >
              {showPassword ? '👁' : '👁️'}
            </button>
          </div>
        </label>

        {status && (
          <div style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
            border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
            color: status.type === 'success' ? '#1B6B31' : '#842029',
          }}>
            {status.message}
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: '14px 18px',
            borderRadius: '14px',
            border: 'none',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Увійти
        </button>

        <GoogleAuthButton onError={(message) => setStatus({ type: 'error', message })} />

        <p style={{ color: 'var(--text2)', textAlign: 'center' }}>
          Немає акаунту?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            Зареєструватися
          </Link>
        </p>
        <p style={{ color: 'var(--text2)', textAlign: 'center' }}>
          Забули пароль?{' '}
          <Link to="/reset-password" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            Скинути пароль
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login