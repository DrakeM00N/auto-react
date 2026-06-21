import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useData } from '../context/DataContext'
import { track } from '../lib/analytics'
import { apiRequest } from '../lib/api'
import { formatDate, isDeparted } from '../lib/format'
import Button from '../components/Button'
import { bookingSchema } from '../lib/schemas'

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  boxSizing: 'border-box',
}

const fieldErrorStyle = { color: '#842029', fontSize: '0.85rem', marginTop: '-4px' }

function Booking() {
  const { trips, routes } = useData()
  const [searchParams] = useSearchParams()
  const tripId = Number(searchParams.get('tripId'))
  const [serverError, setServerError] = useState(null)

  const selectedTrip = useMemo(() => trips.find(trip => trip.id === tripId), [trips, tripId])
  const selectedRoute = useMemo(() => routes.find(route => route.id === selectedTrip?.routeId), [routes, selectedTrip])
  const freeSeats = selectedTrip ? selectedTrip.seats - (selectedTrip.bookedCount || 0) : 0
  const departed = selectedTrip ? isDeparted(selectedTrip) : false
  const [agreed, setAgreed] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      passengerFirstName: '',
      passengerLastName: '',
      passengerPhone: '',
      boardingPoint: '',
      alightingPoint: '',
    },
  })

  // useWatch (vs. the form's watch()) is the React-Compiler-friendly variant —
  // it subscribes to a single field without breaking memoization.
  const boardingPoint = useWatch({ control, name: 'boardingPoint' })

  // Funnel: the visitor reached the booking page with a valid trip
  useEffect(() => {
    if (selectedTrip) {
      track('booking_started', {
        trip_id: selectedTrip.id,
        route: selectedRoute ? `${selectedRoute.from} → ${selectedRoute.to}` : '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip?.id])

  const allPoints = useMemo(() => {
    if (!selectedRoute) return []
    const stopsCities = selectedRoute.stops || []
    return [selectedRoute.from, ...stopsCities, selectedRoute.to]
  }, [selectedRoute])

  const alightingOptions = useMemo(() => {
    if (!boardingPoint) return []
    const idx = allPoints.indexOf(boardingPoint)
    return allPoints.slice(idx + 1)
  }, [boardingPoint, allPoints])

  const onSubmit = async (values) => {
    if (departed) {
      setServerError('Цей рейс уже відправлено.')
      return
    }
    if (!agreed) {
      setServerError('Підтвердіть згоду з умовами Публічної оферти.')
      return
    }
    setServerError(null)

    // Funnel: the visitor submitted the booking form
    track('booking_submitted', { trip_id: tripId })

    try {
      const fullName = `${values.passengerLastName.trim()} ${values.passengerFirstName.trim()}`
      const result = await apiRequest('POST', '/payments/create', {
        tripId,
        passengerName: fullName,
        passengerPhone: values.passengerPhone,
        boardingPoint: values.boardingPoint,
        alightingPoint: values.alightingPoint,
      })
      sessionStorage.setItem('paymentOrderId', result.orderId)

      // WayForPay HPP is a form POST, not a GET redirect — build a hidden form
      // with the signed fields and submit it from the browser. Array values
      // (productName/productCount/productPrice for multi-product invoices)
      // become one input per element with a name="...[]" suffix.
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = result.formUrl
      form.acceptCharset = 'utf-8'
      const appendInput = (name, value) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value == null ? '' : String(value)
        form.appendChild(input)
      }
      for (const [name, value] of Object.entries(result.fields || {})) {
        if (Array.isArray(value)) {
          for (const item of value) appendInput(`${name}[]`, item)
        } else {
          appendInput(name, value)
        }
      }
      document.body.appendChild(form)
      form.submit()
    } catch (e) {
      setServerError(e.message)
    }
  }

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '760px', margin: '0 auto' }}>
      <section style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem', marginBottom: '10px' }}>Бронювання квитка</h1>
        <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>Заповніть дані та перейдіть до оплати.</p>
      </section>

      {!selectedTrip ? (
        <div style={{ padding: '28px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'grid', gap: '18px', justifyItems: 'start' }}>
          <p style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.6 }}>
            Невірний або відсутній tripId. Спочатку оберіть конкретний рейс у розкладі — натиснення «Забронювати» поряд із потрібним рейсом відкриє цю сторінку з потрібними параметрами.
          </p>
          <Link to="/schedule" style={{
            background: 'var(--accent)',
            color: '#1A1814',
            padding: '12px 22px',
            borderRadius: '12px',
            fontWeight: 700,
            textDecoration: 'none',
          }}>
            Перейти до розкладу
          </Link>
        </div>
      ) : departed ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)', opacity: 0.7 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>{selectedRoute?.from} → {selectedRoute?.to}</div>
            <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{formatDate(selectedTrip.date)} • {selectedTrip.time}</div>
            <div style={{ color: 'var(--text2)' }}>Ціна: <strong>{selectedTrip.price} грн</strong></div>
          </article>
          <div role="alert" style={{ padding: '20px', borderRadius: '14px', background: '#FDECEA', border: '1px solid #F5C6CB', color: '#842029', fontWeight: 600 }}>
            ⚠️ Цей рейс уже відправлено. Бронювання неможливе.
          </div>
          <Link to="/schedule" style={{ color: 'var(--accent)', textDecoration: 'underline', textAlign: 'center' }}>
            Повернутись до розкладу
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          <article style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>{selectedRoute?.from} → {selectedRoute?.to}</div>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>{formatDate(selectedTrip.date)} • {selectedTrip.time}</div>
                <div style={{ color: 'var(--text2)' }}>Ціна: <strong>{selectedTrip.price} грн</strong></div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '170px' }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Вільних місць</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: freeSeats <= 5 ? '#e74c3c' : 'var(--accent)' }}>{freeSeats}</div>
              </div>
            </div>
          </article>

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Зупинка посадки
                <select
                  {...register('boardingPoint', {
                    // Resetting the dependent field on boarding change keeps
                    // the option list and current value in sync.
                    onChange: () => setValue('alightingPoint', '', { shouldValidate: false }),
                  })}
                  style={inputStyle}
                >
                  <option value="">Оберіть зупинку</option>
                  {allPoints.slice(0, -1).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.boardingPoint && <span style={fieldErrorStyle}>{errors.boardingPoint.message}</span>}
              </label>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Зупинка висадки
                <select
                  {...register('alightingPoint')}
                  style={{ ...inputStyle, opacity: boardingPoint ? 1 : 0.5 }}
                  disabled={!boardingPoint}
                >
                  <option value="">Оберіть зупинку</option>
                  {alightingOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.alightingPoint && <span style={fieldErrorStyle}>{errors.alightingPoint.message}</span>}
              </label>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Імʼя
                  <input {...register('passengerFirstName')} placeholder="Іван" style={inputStyle} />
                  {errors.passengerFirstName && <span style={fieldErrorStyle}>{errors.passengerFirstName.message}</span>}
                </label>
                <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                  Прізвище
                  <input {...register('passengerLastName')} placeholder="Іваненко" style={inputStyle} />
                  {errors.passengerLastName && <span style={fieldErrorStyle}>{errors.passengerLastName.message}</span>}
                </label>
              </div>
              <label style={{ display: 'grid', gap: '8px', color: 'var(--text2)' }}>
                Телефон
                <input {...register('passengerPhone')} placeholder="+380..." style={inputStyle} />
                {errors.passengerPhone && <span style={fieldErrorStyle}>{errors.passengerPhone.message}</span>}
              </label>
            </div>

            {serverError && (
              <div style={{ padding: '16px 18px', borderRadius: '14px', background: '#FDECEA', border: '1px solid #F5C6CB', color: '#842029' }}>
                {serverError}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text2)', lineHeight: 1.5, fontSize: '0.95rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '4px', accentColor: 'var(--accent)', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>
                Я згоден з умовами{' '}
                <Link to="/oferta" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  Публічної оферти
                </Link>{' '}
                та політикою повернення коштів.
              </span>
            </label>

            <Button
              type="submit"
              disabled={freeSeats <= 0 || !agreed}
              loading={isSubmitting}
              loadingText="Перенаправлення на оплату…"
              style={{
                padding: '16px 22px',
                borderRadius: '14px',
                border: 'none',
                background: (freeSeats <= 0 || !agreed) ? 'var(--border)' : 'var(--accent)',
                color: (freeSeats <= 0 || !agreed) ? 'var(--text2)' : '#1A1814',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: (freeSeats <= 0 || !agreed) ? 'not-allowed' : 'pointer',
              }}
            >
              {freeSeats <= 0 ? 'Місць немає' : 'Перейти до оплати'}
            </Button>

            <Link to="/schedule" style={{ color: 'var(--accent)', textDecoration: 'underline', textAlign: 'center' }}>
              Повернутись до розкладу
            </Link>
          </form>
        </div>
      )}
    </div>
  )
}

export default Booking
