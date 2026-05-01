import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function ResetPassword() {
  const { resetPassword } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'Заповніть всі поля.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Паролі не співпадають.' })
      return
    }

    const result = resetPassword(normalizedEmail, newPassword)
    if (!result.success) {
      setStatus({ type: 'error', message: result.message })
      return
    }

    setStatus({ type: 'success', message: 'Пароль було успішно оновлено. Увійдіть з новим паролем.' })
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
      <section style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Скидання пароля
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Введіть email та новий пароль. Якщо акаунт існує, пароль буде оновлено.
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
            placeholder="example@mail.com"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Новий пароль
          <input
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            type="password"
            required
            placeholder="••••••••"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Підтвердження нового пароля
          <input
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            type="password"
            required
            placeholder="••••••••"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
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
          Оновити пароль
        </button>

        <p style={{ color: 'var(--text2)', textAlign: 'center' }}>
          Повернутись до{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            входу
          </Link>
        </p>
      </form>
    </div>
  )
}

export default ResetPassword
