import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import GoogleAuthButton from '../components/GoogleAuthButton'
import Button from '../components/Button'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { registerSchema } from '../lib/schemas'

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

function Register() {
  useDocumentMeta({
    title: 'Реєстрація',
    description: 'Створіть акаунт, щоб зберігати бронювання, отримувати електронні квитки та швидко повторно оформляти поїздки.',
  })
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverStatus, setServerStatus] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  })

  const onSubmit = async (values) => {
    setServerStatus(null)
    const result = await registerUser(values.name, values.email, values.password)
    if (!result.success) {
      setServerStatus({ type: 'error', message: result.message })
      return
    }
    setServerStatus({ type: 'success', message: 'Реєстрація пройшла успішно!' })
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-card" style={{ display: 'grid', gap: '18px' }}>
        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Імʼя
          <input {...register('name')} placeholder="Імʼя" style={fieldStyle} />
          {errors.name && <span className="field-error" style={fieldErrorStyle}>{errors.name.message}</span>}
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Email
          <input
            {...register('email')}
            type="email"
            placeholder="example@mail.com"
            style={fieldStyle}
          />
          {errors.email && <span className="field-error" style={fieldErrorStyle}>{errors.email.message}</span>}
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Пароль
          <div style={passwordWrapperStyle}>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
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
          {errors.password && <span className="field-error" style={fieldErrorStyle}>{errors.password.message}</span>}
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Підтвердження пароля
          <div style={passwordWrapperStyle}>
            <input
              {...register('confirm')}
              type={showConfirm ? 'text' : 'password'}
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
          {errors.confirm && <span className="field-error" style={fieldErrorStyle}>{errors.confirm.message}</span>}
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
          className="btn-primary"
          style={{ borderRadius: '14px' }}
        >
          Зареєструватися
        </Button>

        <GoogleAuthButton onError={(message) => setServerStatus({ type: 'error', message })} />

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
