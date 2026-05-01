import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function Register() {
  const { register } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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

  const handleSubmit = (event) => {
    event.preventDefault()
    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Паролі не співпадають' })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const result = register(name.trim(), normalizedEmail, password)
    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }

    setStatus({ type: 'success', message: 'Реєстрація пройшла успішно!' })
    navigate('/')
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
      <section style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Реєстрація
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Створіть акаунт, щоб зберігати бронювання та швидко оформляти квитки.
        </p>
      </section>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Ім’я
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Ім’я"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Email
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
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

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Підтвердження пароля
          <div style={passwordWrapperStyle}>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="••••••••"
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(prev => !prev)}
              style={eyeButtonStyle}
              aria-label={showConfirm ? 'Сховати підтвердження пароля' : 'Показати підтвердження пароля'}
            >
              {showConfirm ? '👁' : '👁️'}
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
          Зареєструватися
        </button>

        <p style={{ color: 'var(--text2)', textAlign: 'center' }}>
          Вже є акаунт?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            Увійти
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Register