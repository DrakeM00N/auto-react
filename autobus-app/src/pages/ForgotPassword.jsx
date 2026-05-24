import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { forgotPasswordSchema } from '../lib/schemas'

const fieldStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
}

const fieldErrorStyle = { color: '#842029', fontSize: '0.85rem', marginTop: '-4px' }

function ForgotPassword() {
  useDocumentMeta({
    title: 'Забули пароль',
    description: 'Введіть email — ми надішлемо посилання для скидання пароля.',
  })
  const { requestPasswordReset } = useAuth()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values) => {
    // The backend returns the same response whether the email exists or
    // not. We just need to await it and flip to the "check your mail" view.
    await requestPasswordReset(values.email)
    setSent(true)
  }

  return (
    <div className="auth-glow" style={{ padding: '40px 2rem', maxWidth: '520px', margin: '0 auto' }}>
      <section style={{ marginBottom: '22px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>
          Забули пароль?
        </h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
          Введіть email, на який зареєстрований акаунт. Ми надішлемо посилання для скидання пароля.
        </p>
      </section>

      {sent ? (
        <div className="form-card" style={{ display: 'grid', gap: '14px' }}>
          <div style={{
            padding: '14px 16px',
            borderRadius: '14px',
            background: '#E8F6EE',
            border: '1px solid #A3D9A5',
            color: '#1B6B31',
            lineHeight: 1.6,
          }}>
            Якщо акаунт існує, ми надіслали лист з посиланням. Перевірте пошту (включно з папкою «Спам»). Посилання дійсне 1 годину.
          </div>
          <p style={{ color: 'var(--text2)', textAlign: 'center', margin: 0 }}>
            Повернутись до{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              входу
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-card" style={{ display: 'grid', gap: '18px' }}>
          <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
            Email
            <input
              {...register('email')}
              type="email"
              autoComplete="username"
              placeholder="example@mail.com"
              style={fieldStyle}
            />
            {errors.email && <span className="field-error" style={fieldErrorStyle}>{errors.email.message}</span>}
          </label>

          <Button
            type="submit"
            loading={isSubmitting}
            className="btn-primary"
            style={{ borderRadius: '14px' }}
          >
            Надіслати посилання
          </Button>

          <p style={{ color: 'var(--text2)', textAlign: 'center', margin: 0 }}>
            Згадали пароль?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Увійти
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}

export default ForgotPassword
