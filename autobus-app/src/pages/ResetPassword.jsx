import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { resetPasswordSchema } from '../lib/schemas'

const fieldStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
}

const fieldErrorStyle = { color: '#842029', fontSize: '0.85rem', marginTop: '-4px' }

function ResetPassword() {
  useDocumentMeta({
    title: 'Скидання пароля',
    description: 'Введіть новий пароль для свого акаунта BusTour.',
  })
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [serverStatus, setServerStatus] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirm: '' },
  })

  const onSubmit = async (values) => {
    setServerStatus(null)
    const result = await resetPassword(values.newPassword, token)
    if (!result.success) {
      setServerStatus({ type: 'error', message: result.message })
      return
    }
    setServerStatus({ type: 'success', message: 'Пароль було успішно оновлено. Увійдіть з новим паролем.' })
    setTimeout(() => navigate('/login'), 1200)
  }

  // Without a token in the URL there's no useful path forward — show a
  // dedicated dead-end view that points back to the request flow rather
  // than letting the user fill in fields that we'd reject anyway.
  if (!token) {
    return (
      <div className="auth-glow" style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
        <section style={{ marginBottom: '22px' }}>
          <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
            Скидання пароля
          </h1>
          <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
            Недійсне посилання. Скористайтесь листом, який ми надіслали на вашу пошту, або запросіть новий.
          </p>
        </section>
        <div className="form-card" style={{ display: 'grid', gap: '14px' }}>
          <Link
            to="/forgot-password"
            className="btn-primary"
            style={{ borderRadius: '14px', padding: '14px 22px' }}
          >
            Запросити нове посилання
          </Link>
          <p style={{ color: 'var(--text2)', textAlign: 'center', margin: 0 }}>
            Повернутись до{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              входу
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-glow" style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
      <section style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Скидання пароля
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Задайте новий пароль для свого акаунта.
        </p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-card" style={{ display: 'grid', gap: '18px' }}>
        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Новий пароль
          <input
            {...register('newPassword')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            style={fieldStyle}
          />
          {errors.newPassword && <span className="field-error" style={fieldErrorStyle}>{errors.newPassword.message}</span>}
        </label>

        <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
          Підтвердження пароля
          <input
            {...register('confirm')}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            style={fieldStyle}
          />
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
          Оновити пароль
        </Button>

        <p style={{ color: 'var(--text2)', textAlign: 'center', margin: 0 }}>
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
