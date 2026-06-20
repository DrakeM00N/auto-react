import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { formatDate, isDeparted } from '../lib/format'
import Button from '../components/Button'
import { routeSchema, tripSchema } from '../lib/schemas'

// Fixed amenity catalogue. Used by the admin checkboxes — Schedule.jsx
// just renders whatever amenities the backend returns, so it doesn't
// need this list at module-load time.
const AMENITY_CATALOGUE = [
  'Кондиціонер',
  'Wi-Fi',
  'Туалет',
  'Розетки USB',
  'Клімат-контроль',
  'Місце для багажу',
]

const EMPTY_ROUTE_FORM = { from: '', to: '', distance: '', duration: '', distanceKm: null, stops: [] }
const EMPTY_TRIP_FORM = {
  routeId: '', date: '', time: '', price: '', seats: '',
  departurePoint: '', arrivalPoint: '', busModel: '', busPlate: '', carrier: '',
  amenities: [], intermediateStops: [],
}

const fieldErrorStyle = { color: '#842029', fontSize: '0.85rem', marginTop: '4px' }

// Shared "extended trip details" block used by both the create and edit
// trip forms. Reads from / writes to the given react-hook-form instance
// (passed via `form`) so the field paths line up with the parent's schema.
function TripDetailsFields({ form, inputStyle }) {
  const { register, watch, setValue, control } = form
  const amenities = watch('amenities') || []
  const { fields, append, remove } = useFieldArray({ control, name: 'intermediateStops' })

  const toggleAmenity = (a) => {
    setValue(
      'amenities',
      amenities.includes(a) ? amenities.filter(x => x !== a) : [...amenities, a],
      { shouldDirty: true },
    )
  }

  const sectionTitle = { fontSize: '0.9rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '8px' }

  return (
    <>
      <div style={sectionTitle}>Деталі рейсу</div>

      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          Точка відправлення
          <input {...register('departurePoint')} placeholder="вул. Шевченка, 1, автостанція" style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          Точка прибуття
          <input {...register('arrivalPoint')} placeholder="Центральна автостанція" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          Модель автобуса
          <input {...register('busModel')} placeholder="Setra S 415 GT-HD" style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          Держ. номер
          <input {...register('busPlate')} placeholder="AA 1234 BB" style={inputStyle} />
        </label>
        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          Перевізник
          <input {...register('carrier')} placeholder="Prestige-bus" style={inputStyle} />
        </label>
      </div>

      <div style={sectionTitle}>Зручності</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {AMENITY_CATALOGUE.map(a => {
          const checked = amenities.includes(a)
          return (
            <label key={a} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px',
              borderRadius: '999px',
              border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
              background: checked ? 'rgba(0,0,0,0)' : 'var(--bg)',
              color: checked ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleAmenity(a)}
                style={{ accentColor: 'var(--accent)' }}
              />
              {a}
            </label>
          )
        })}
      </div>

      <div style={sectionTitle}>Проміжні зупинки</div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {fields.length === 0 && (
          <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Немає проміжних зупинок.</div>
        )}
        {fields.map((field, i) => (
          <div key={field.id} style={{
            display: 'grid',
            gap: '8px',
            gridTemplateColumns: '1fr 1fr 100px auto',
            alignItems: 'end',
            padding: '12px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', color: 'var(--text2)', minWidth: 0 }}>
              Назва
              <input {...register(`intermediateStops.${i}.name`)} style={inputStyle} placeholder="Полтава" />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', color: 'var(--text2)', minWidth: 0 }}>
              Адреса
              <input {...register(`intermediateStops.${i}.address`)} style={inputStyle} placeholder="АС Полтава-1" />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '0.85rem', color: 'var(--text2)', minWidth: 0 }}>
              Час
              <input {...register(`intermediateStops.${i}.time`)} style={inputStyle} placeholder="11:30" />
            </label>
            <button type="button" onClick={() => remove(i)} style={{
              padding: '10px 14px', borderRadius: '10px', border: 'none',
              background: '#e74c3c', color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}>×</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: '', address: '', time: '' })}
          style={{
            padding: '10px 14px', borderRadius: '10px', border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', width: 'max-content',
          }}
        >
          + Додати зупинку
        </button>
      </div>
    </>
  )
}

function Admin() {
  const { currentUser } = useAuth()
  const { routes, addRoute, deleteRoute, updateRoute, trips, addTrip, deleteTrip, updateTrip, users, bookings } = useData()

  const [editingRouteId, setEditingRouteId] = useState(null)
  const [editingTripId, setEditingTripId] = useState(null)
  const [status, setStatus] = useState(null)
  // width:100% + boxSizing:border-box + minWidth:0 lets inputs shrink to fit
  // their grid column instead of overflowing to the right. minWidth:0 is the
  // critical bit — grid items default to min-width:auto (= intrinsic content
  // width) which an <input>/<select> never lets shrink below.
  const inputStyle = { width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }

  // 4 separate form instances. Each has its own schema + isSubmitting flag,
  // so two admins editing different rows in the same browser tab still
  // wouldn't be possible UX-wise but the form state stays clean.
  const addRouteForm = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: EMPTY_ROUTE_FORM,
  })
  const editRouteForm = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: EMPTY_ROUTE_FORM,
  })
  const addTripForm = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: EMPTY_TRIP_FORM,
  })
  const editTripForm = useForm({
    resolver: zodResolver(tripSchema),
    defaultValues: EMPTY_TRIP_FORM,
  })

  // Проверка роли
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '40px 2rem', textAlign: 'center' }}>
        <h1>Доступ заборонено</h1>
        <p>Тільки адміни можуть переглядати цю сторінку.</p>
      </div>
    )
  }

  const onAddRoute = async (values) => {
    await addRoute(values)
    addRouteForm.reset(EMPTY_ROUTE_FORM)
    setStatus({ type: 'success', message: 'Маршрут додано' })
  }

  const onAddTrip = async (values) => {
    try {
      await addTrip({ ...values, routeId: Number(values.routeId) })
      addTripForm.reset(EMPTY_TRIP_FORM)
      setStatus({ type: 'success', message: 'Рейс додано' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Не вдалось додати рейс: ' + err.message })
    }
  }

  const handleStartEditRoute = (route) => {
    setEditingRouteId(route.id)
    editRouteForm.reset({
      from: route.from,
      to: route.to,
      distance: route.distance,
      duration: route.duration,
      distanceKm: route.distanceKm ?? null,
      stops: route.stops || [],
    })
    setStatus(null)
  }

  const onSaveRoute = async (values) => {
    await updateRoute(editingRouteId, values)
    setEditingRouteId(null)
    editRouteForm.reset(EMPTY_ROUTE_FORM)
    setStatus({ type: 'success', message: 'Маршрут оновлено' })
  }

  const handleCancelEditRoute = () => {
    setEditingRouteId(null)
    editRouteForm.reset(EMPTY_ROUTE_FORM)
  }

  const handleStartEditTrip = (trip) => {
    setEditingTripId(trip.id)
    editTripForm.reset({
      routeId: String(trip.routeId),
      date: trip.date,
      time: trip.time,
      price: String(trip.price),
      seats: String(trip.seats),
      departurePoint: trip.departurePoint || '',
      arrivalPoint: trip.arrivalPoint || '',
      busModel: trip.busModel || '',
      busPlate: trip.busPlate || '',
      carrier: trip.carrier || '',
      amenities: Array.isArray(trip.amenities) ? trip.amenities : [],
      intermediateStops: Array.isArray(trip.intermediateStops) ? trip.intermediateStops : [],
    })
    setStatus(null)
  }

  const onSaveTrip = async (values) => {
    await updateTrip(editingTripId, { ...values, routeId: Number(values.routeId) })
    setEditingTripId(null)
    editTripForm.reset(EMPTY_TRIP_FORM)
    setStatus({ type: 'success', message: 'Рейс оновлено' })
  }

  const handleCancelEditTrip = () => {
    setEditingTripId(null)
    editTripForm.reset(EMPTY_TRIP_FORM)
  }

  const handleDeleteRoute = (routeId) => {
    deleteRoute(routeId)
    setStatus({ type: 'success', message: 'Маршрут та повʼязані рейси видалено' })
  }

  const handleDeleteTrip = (tripId) => {
    deleteTrip(tripId)
    setStatus({ type: 'success', message: 'Рейс видалено' })
  }

  const totalBookings = bookings.length
  const totalRevenue = bookings.reduce((sum, booking) => {
    const trip = trips.find(t => t.id === booking.tripId)
    return sum + (trip?.price || 0)
  }, 0)
  const totalUsers = users.length

  const routeBookingCount = routes.map(route => {
    const count = bookings.reduce((sum, booking) => {
      const trip = trips.find(t => t.id === booking.tripId)
      return sum + (trip?.routeId === route.id ? 1 : 0)
    }, 0)
    return { ...route, count }
  })
  const busiestRoute = routeBookingCount.reduce((max, route) => route.count > max.count ? route : max, { count: 0 })

  const addRouteErrors = addRouteForm.formState.errors
  const editRouteErrors = editRouteForm.formState.errors
  const addTripErrors = addTripForm.formState.errors
  const editTripErrors = editTripForm.formState.errors

  return (
    <div style={{ padding: '40px 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Unbounded', fontSize: '2rem' }}>
          Адмін-панель
        </h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/admin/analytics" style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            📊 Аналітика
          </Link>
          <Link to="/admin/users" style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            👥 Користувачі
          </Link>
          <Link to="/admin/bookings" style={{
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: '#1A1814',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            🎫 Бронювання
          </Link>
        </div>
      </div>

      <section style={{ display: 'grid', gap: '18px', marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Користувачів</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalUsers}</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Бронювань</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalBookings}</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Виручка</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{totalRevenue} грн</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text2)', marginBottom: '8px' }}>Найпопулярніший маршрут</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{busiestRoute.count ? `${busiestRoute.from} → ${busiestRoute.to}` : 'немає бронювань'}</div>
          {busiestRoute.count > 0 && <div style={{ color: 'var(--text2)', marginTop: '6px' }}>{busiestRoute.count} бронювань</div>}
        </div>
      </section>

      {status && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          background: status.type === 'success' ? '#E8F6EE' : '#FDECEA',
          border: `1px solid ${status.type === 'success' ? '#A3D9A5' : '#F5C6CB'}`,
          color: status.type === 'success' ? '#1B6B31' : '#842029',
          marginBottom: '20px',
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>

        {/* Добавление маршрута */}
        <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Додати маршрут</h2>
          <form onSubmit={addRouteForm.handleSubmit(onAddRoute)} noValidate style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Звідки
              <input {...addRouteForm.register('from')} placeholder="Наприклад: Одеса" style={inputStyle} />
              {addRouteErrors.from && <span style={fieldErrorStyle}>{addRouteErrors.from.message}</span>}
            </label>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Куди
              <input {...addRouteForm.register('to')} placeholder="Наприклад: Київ" style={inputStyle} />
              {addRouteErrors.to && <span style={fieldErrorStyle}>{addRouteErrors.to.message}</span>}
            </label>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Відстань
              <input {...addRouteForm.register('distance')} placeholder="Наприклад: 475 км" style={inputStyle} />
              {addRouteErrors.distance && <span style={fieldErrorStyle}>{addRouteErrors.distance.message}</span>}
            </label>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Тривалість
              <input {...addRouteForm.register('duration')} placeholder="Наприклад: 6 год" style={inputStyle} />
              {addRouteErrors.duration && <span style={fieldErrorStyle}>{addRouteErrors.duration.message}</span>}
            </label>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Відносна відстань від старту (км)
              <input {...addRouteForm.register('distanceKm')} type="number" placeholder="Наприклад: 475" style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Остановки
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {addRouteForm.control._names.stops ? (
                  <>
                    {addRouteForm.getValues('stops').map((stop, index) => (
                      <div key={stop.id || index} style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '2px' }}>Місто {index + 1}</label>
                          <input {...addRouteForm.register(`stops[${index}].city`)} placeholder="Наприклад: Полтава" style={inputStyle} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '2px' }}>Відстань от старту (км)</label>
                          <input {...addRouteForm.register(`stops[${index}].km`)} type="number" placeholder="Наприклад: 120" style={inputStyle} />
                        </div>
                        <button type="button"
                          onClick={() => {
                            const stops = addRouteForm.getValues('stops');
                            stops.splice(index, 1);
                            addRouteForm.setValue('stops', stops);
                          }}
                          style={{ padding: '8px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          −
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => {
                        const stops = addRouteForm.getValues('stops');
                        stops.push({ city: '', km: null });
                        addRouteForm.setValue('stops', stops);
                      }}
                      style={{ padding: '10px 14px', background: 'transparent', color: 'var(--text)', border: '1px dashed var(--border)', borderRadius: '4px', cursor: 'pointer' }}>
                      + Додати зупинку
                    </button>
                  </>
                ) : (
                  <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Немає зупинок.</div>
                )}
              </div>
            </div>
            <Button type="submit" loading={addRouteForm.formState.isSubmitting} style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#1A1814',
              fontWeight: 600,
            }}>
              Додати маршрут
            </Button>
          </form>
        </section>

        {/* Добавление рейса */}
        <section style={{ padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Додати рейс</h2>
          <form onSubmit={addTripForm.handleSubmit(onAddTrip)} noValidate style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
              Маршрут
              <select {...addTripForm.register('routeId')} style={inputStyle}>
                <option value="">Оберіть маршрут</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>
                    {route.from} → {route.to}
                  </option>
                ))}
              </select>
              {addTripErrors.routeId && <span style={fieldErrorStyle}>{addTripErrors.routeId.message}</span>}
            </label>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                Дата
                <input type="date" {...addTripForm.register('date')} style={inputStyle} />
                {addTripErrors.date && <span style={fieldErrorStyle}>{addTripErrors.date.message}</span>}
              </label>
              <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                Час
                <input type="time" {...addTripForm.register('time')} style={inputStyle} />
                {addTripErrors.time && <span style={fieldErrorStyle}>{addTripErrors.time.message}</span>}
              </label>
            </div>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                Ціна (грн)
                <input type="number" {...addTripForm.register('price')} placeholder="350" style={inputStyle} />
                {addTripErrors.price && <span style={fieldErrorStyle}>{addTripErrors.price.message}</span>}
              </label>
              <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                Кількість місць
                <input type="number" {...addTripForm.register('seats')} placeholder="40" style={inputStyle} />
                {addTripErrors.seats && <span style={fieldErrorStyle}>{addTripErrors.seats.message}</span>}
              </label>
            </div>

            <TripDetailsFields form={addTripForm} inputStyle={inputStyle} />

            <Button type="submit" loading={addTripForm.formState.isSubmitting} style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#1A1814',
              fontWeight: 600,
            }}>
              Додати рейс
            </Button>
          </form>
        </section>

      </div>

      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Управління маршрутами</h2>
        {routes.length === 0 ? (
          <p>Немає маршрутів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {routes.map(route => (
              <div key={route.id} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {editingRouteId === route.id ? (
                  <form onSubmit={editRouteForm.handleSubmit(onSaveRoute)} noValidate style={{ display: 'grid', gap: '12px' }}>
                    <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Звідки
                      <input {...editRouteForm.register('from')} style={inputStyle} />
                      {editRouteErrors.from && <span style={fieldErrorStyle}>{editRouteErrors.from.message}</span>}
                    </label>
                    <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Куди
                      <input {...editRouteForm.register('to')} style={inputStyle} />
                      {editRouteErrors.to && <span style={fieldErrorStyle}>{editRouteErrors.to.message}</span>}
                    </label>
                    <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Відстань
                      <input {...editRouteForm.register('distance')} style={inputStyle} />
                      {editRouteErrors.distance && <span style={fieldErrorStyle}>{editRouteErrors.distance.message}</span>}
                    </label>
                    <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Тривалість
                      <input {...editRouteForm.register('duration')} style={inputStyle} />
                      {editRouteErrors.duration && <span style={fieldErrorStyle}>{editRouteErrors.duration.message}</span>}
                    </label>
                    <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Відносна відстань від старту (км)
                      <input {...editRouteForm.register('distanceKm')} type="number" placeholder="Наприклад: 475" style={inputStyle} />
                    </label>
                    <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                      Остановки
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {editRouteForm.control._names.stops ? (
                          <>
                            {editRouteForm.getValues('stops').map((stop, index) => (
                              <div key={stop.id || index} style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '2px' }}>Місто {index + 1}</label>
                                  <input {...editRouteForm.register(`stops[${index}].city`)} placeholder="Наприклад: Полтава" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text2)', marginBottom: '2px' }}>Відстань от старту (км)</label>
                                  <input {...editRouteForm.register(`stops[${index}].km`)} type="number" placeholder="Наприклад: 120" style={inputStyle} />
                                </div>
                                <button type="button"
                                  onClick={() => {
                                    const stops = editRouteForm.getValues('stops');
                                    stops.splice(index, 1);
                                    editRouteForm.setValue('stops', stops);
                                  }}
                                  style={{ padding: '8px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  −
                                </button>
                              </div>
                            ))}
                            <button type="button"
                              onClick={() => {
                                const stops = editRouteForm.getValues('stops');
                                stops.push({ city: '', km: null });
                                editRouteForm.setValue('stops', stops);
                              }}
                              style={{ padding: '10px 14px', background: 'transparent', color: 'var(--text)', border: '1px dashed var(--border)', borderRadius: '4px', cursor: 'pointer' }}>
                              + Додати зупинку
                            </button>
                          </>
                        ) : (
                          <div style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Немає зупинок.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <Button type="submit" loading={editRouteForm.formState.isSubmitting} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600 }}>
                        Зберегти маршрут
                      </Button>
                      <button type="button" onClick={handleCancelEditRoute} disabled={editRouteForm.formState.isSubmitting} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: editRouteForm.formState.isSubmitting ? 'not-allowed' : 'pointer', opacity: editRouteForm.formState.isSubmitting ? 0.65 : 1 }}>
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{route.from} → {route.to}</div>
                      <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Відстань: {route.distance} • Тривалість: {route.duration}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => handleStartEditRoute(route)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                        Редагувати
                      </button>
                      <button type="button" onClick={() => handleDeleteRoute(route.id)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>
                        Видалити
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: '40px', padding: '24px', borderRadius: '18px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Управління рейсами</h2>
        {trips.length === 0 ? (
          <p>Немає рейсів.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {trips.map(trip => {
              const route = routes.find(r => r.id === trip.routeId)
              return (
                <div key={trip.id} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {editingTripId === trip.id ? (
                    <form onSubmit={editTripForm.handleSubmit(onSaveTrip)} noValidate style={{ display: 'grid', gap: '12px' }}>
                      <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                        Маршрут
                        <select {...editTripForm.register('routeId')} style={inputStyle}>
                          {routes.map(routeOption => (
                            <option key={routeOption.id} value={routeOption.id}>
                              {routeOption.from} → {routeOption.to}
                            </option>
                          ))}
                        </select>
                        {editTripErrors.routeId && <span style={fieldErrorStyle}>{editTripErrors.routeId.message}</span>}
                      </label>
                      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                          Дата
                          <input type="date" {...editTripForm.register('date')} style={inputStyle} />
                          {editTripErrors.date && <span style={fieldErrorStyle}>{editTripErrors.date.message}</span>}
                        </label>
                        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                          Час
                          <input type="time" {...editTripForm.register('time')} style={inputStyle} />
                          {editTripErrors.time && <span style={fieldErrorStyle}>{editTripErrors.time.message}</span>}
                        </label>
                      </div>
                      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                          Ціна (грн)
                          <input type="number" {...editTripForm.register('price')} style={inputStyle} />
                          {editTripErrors.price && <span style={fieldErrorStyle}>{editTripErrors.price.message}</span>}
                        </label>
                        <label style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                          Кількість місць
                          <input type="number" {...editTripForm.register('seats')} style={inputStyle} />
                          {editTripErrors.seats && <span style={fieldErrorStyle}>{editTripErrors.seats.message}</span>}
                        </label>
                      </div>

                      <TripDetailsFields form={editTripForm} inputStyle={inputStyle} />

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button type="submit" loading={editTripForm.formState.isSubmitting} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#1A1814', fontWeight: 600 }}>
                          Зберегти рейс
                        </Button>
                        <button type="button" onClick={handleCancelEditTrip} disabled={editTripForm.formState.isSubmitting} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: editTripForm.formState.isSubmitting ? 'not-allowed' : 'pointer', opacity: editTripForm.formState.isSubmitting ? 0.65 : 1 }}>
                          Скасувати
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px', opacity: isDeparted(trip) ? 0.65 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span>{route?.from} → {route?.to}</span>
                            {isDeparted(trip) && (
                              <span style={{
                                fontSize: '0.7rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '999px',
                                background: 'var(--border)',
                                color: 'var(--text2)',
                                fontWeight: 700,
                              }}>
                                Відправлено
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>{formatDate(trip.date)} • {trip.time}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => handleStartEditTrip(trip)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer' }}>
                            Редагувати
                          </button>
                          <button type="button" onClick={() => handleDeleteTrip(trip.id)} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>
                            Видалити
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Ціна: {trip.price} грн • Місць: {trip.seats}</div>
                        <div style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Заброньовано: {trip.bookedCount || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

export default Admin
