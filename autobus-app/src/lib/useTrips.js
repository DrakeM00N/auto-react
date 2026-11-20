import { useEffect, useState } from 'react'
import { apiRequest } from './api'
import { mapTrip } from './tripMapper'
import { useData } from '../context/DataContext'

// prerender.js виставляє window.__PRERENDER__ ще до запуску застосунку.
// Головна у цьому режимі не вантажить «живі» рейси, щоб у статичний HTML
// не потрапляли застарілі дані (замість них — скелетон).
export function isPrerender() {
  return typeof window !== 'undefined' && window.__PRERENDER__ === true
}

// Запускає (одноразово) завантаження повного каталогу рейсів. Потрібен лише
// адмінці, профілю та «Моїм бронюванням» — решта сторінок тягне вузькі запити.
export function useEnsureTrips() {
  const { ensureTrips } = useData()
  useEffect(() => { ensureTrips() }, [ensureTrips])
}

const toTrips = raw => (Array.isArray(raw) ? raw : []).map(mapTrip)
const toTrip = raw => (raw && raw.id ? mapTrip(raw) : null)
const toObject = raw => (raw && typeof raw === 'object' ? raw : null)

// Базовий GET-хук: { data, error, loading }. Відповідь прив'язана до path, тож
// застарілий запит ніколи не перезапише свіжий. keepPrevious залишає попередні
// дані на екрані, поки вантажаться нові (без миготіння при зміні фільтра).
function useFetched(path, transform, { enabled = true, keepPrevious = false } = {}) {
  const [state, setState] = useState({ path: null, data: null, error: null })
  const active = enabled && Boolean(path)

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    apiRequest('GET', path)
      .then(raw => { if (!cancelled) setState({ path, data: transform(raw), error: null }) })
      .catch(error => { if (!cancelled) setState({ path, data: null, error }) })
    return () => { cancelled = true }
    // transform — стабільна функція рівня модуля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, active])

  const settled = state.path === path
  return {
    data: settled || keepPrevious ? state.data : null,
    error: settled ? state.error : null,
    loading: active && !settled,
  }
}

// Найближчі рейси (ще не відправлені): GET /trips/upcoming
export function useUpcomingTrips({ limit = 6, routeIds, enabled = true } = {}) {
  const ids = Array.isArray(routeIds) ? [...routeIds].sort((a, b) => a - b).join(',') : ''
  const filterByRoute = Array.isArray(routeIds)
  const path = `/trips/upcoming?limit=${limit}${ids ? `&routeId=${ids}` : ''}`
  const { data, error, loading } = useFetched(path, toTrips, { enabled: enabled && (!filterByRoute || ids !== '') })
  return { trips: data || [], error, loading }
}

// Усі рейси за одну дату: GET /trips?date=YYYY-MM-DD (розклад)
export function useTripsByDate(date, { enabled = true } = {}) {
  const { data, error, loading } = useFetched(
    date ? `/trips?date=${encodeURIComponent(date)}` : null,
    toTrips,
    { enabled, keepPrevious: true },
  )
  return { trips: data || [], error, loading }
}

// Один рейс: GET /trips/:id (сторінка бронювання)
export function useTripById(id) {
  const valid = Number.isInteger(id) && id > 0
  const { data, error, loading } = useFetched(valid ? `/trips/${id}` : null, toTrip)
  return { trip: data, error, loading }
}

// Лічильники для головної: GET /stats
export function useSiteStats({ enabled = true } = {}) {
  const { data, error, loading } = useFetched('/stats', toObject, { enabled })
  return { stats: data, error, loading }
}
