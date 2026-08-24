import { useEffect } from 'react'

// SPA-side <title>/<meta description>/<og> updater. Avoids react-helmet-async
// (one less dependency) — we just mutate the existing tags from index.html on
// route change. Without SSR crawlers still see only index.html, so this is a
// best-effort improvement for browser tabs, social-share previews fetched
// after JS executes, and search-engine bots that render JS (Googlebot does).
const DEFAULT_TITLE = document.title
const DEFAULT_DESCRIPTION =
  document.querySelector('meta[name="description"]')?.getAttribute('content') || ''

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    const nextTitle = title ? `${title} — BusToRIA` : DEFAULT_TITLE
    const nextDescription = description || DEFAULT_DESCRIPTION

    document.title = nextTitle
    setMeta('meta[name="description"]', 'content', nextDescription)
    setMeta('meta[property="og:title"]', 'content', nextTitle)
    setMeta('meta[property="og:description"]', 'content', nextDescription)
    setMeta('meta[name="twitter:title"]', 'content', nextTitle)
    setMeta('meta[name="twitter:description"]', 'content', nextDescription)

    return () => {
      document.title = DEFAULT_TITLE
      setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE)
      setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION)
      setMeta('meta[name="twitter:title"]', 'content', DEFAULT_TITLE)
      setMeta('meta[name="twitter:description"]', 'content', DEFAULT_DESCRIPTION)
    }
  }, [title, description])
}
