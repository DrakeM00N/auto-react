import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import GoogleAuthButton from '../components/GoogleAuthButton'
import Button from '../components/Button'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { loginSchema } from '../lib/schemas'

const fieldStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
}

const fieldErrorStyle = { color: '#842029', fontSize: '0.85rem', marginTop: '-4px' }

const passwordWrapperStyle = { position: 'relative', display: 'grid' }

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

function Login() {
  useDocumentMeta({
    title: 'Вхід',
    description: 'Увійдіть до особистого кабінету, щоб переглянути свої бронювання та квитки.',
  })
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverStatus, setServerStatus] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values) => {
    setServerStatus(null)
    const result = await login(values.email, values.password)
    if (!result.success) {
      setServerStatus({ type: 'error', message: result.message })
      return
    }
    setServerStatus({ type: 'success', message: 'Вхід виконано успішно!' })
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'grid', gap: '18px' }}>
        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Email
          <input
            {...register('email')}
            type="email"
            autoComplete="username"
            placeholder="example@mail.com"
            style={fieldStyle}
          />
          {errors.email && <span style={fieldErrorStyle}>{errors.email.message}</span>}
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Пароль
          <div style={passwordWrapperStyle}>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
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
          {errors.password && <span style={fieldErrorStyle}>{errors.password.message}</span>}
        </label>

        {serverStatus && (
          <div style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: serverStatus.type === 'success' ? '#E8F6EE' : '#FDECEA',
            border: `1px solid ${serverStatus.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
            color: serverStatus.type === 'success' ? '#1B6B31' : '#842029',
          }}>
            {serverStatus.message}
          </div>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          style={{
            padding: '14px 18px',
            borderRadius: '14px',
            border: 'none',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 700,
          }}
        >
          Увійти
        </Button>

        <GoogleAuthButton onError={(message) => setServerStatus({ type: 'error', message })} />

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
