import { useEffect } from 'react'

// Check if we are in the browser
const DEFAULT_TITLE =
  typeof document !== 'undefined' ? document.title : 'BusTour — Автобусні квитки онлайн, розклад, маршрути, бронювання'
const DEFAULT_DESCRIPTION =
  typeof document !== 'undefined'
    ? document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      'Купуйте автобусні квитки онлайн: актуальний розклад, прямі та транзитні маршрути, бронювання місць з оплатою картою.'
    : 'Купуйте автобусні квитки онлайн: актуальний розклад, прямі та транзитні маршрути, бронювання місць з оплатою картою.'

function setMeta(selector, attr, value) {
  if (typeof document === 'undefined') return
  const el = document.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const nextTitle = title ? `${title} — BusTour` : DEFAULT_TITLE
    const nextDescription = description || DEFAULT_DESCRIPTION

    document.title = nextTitle
    setMeta('meta[name="description"]', 'content', nextDescription)
    setMeta('meta[property="og:title"]', 'content', nextTitle)
    setMeta('meta[property="og:description"]', 'content', nextDescription)
    setMeta('meta[name="twitter:title"]', 'content', nextTitle)
    setMeta('meta[name="twitter:description"]', 'content', nextDescription)

    return () => {
      if (typeof document === 'undefined') return
      document.title = DEFAULT_TITLE
      setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE)
      setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION)
      setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE)
      setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION)
    }
  }, [title, description])
}
