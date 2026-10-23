import { useEffect } from 'react'
import { absoluteUrl, SITE } from '../config/site'

function setMeta(selector, attr, value) {
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useDocumentMeta({ title, description, path } = {}) {
  useEffect(() => {
    const nextTitle = title || `${SITE.name} — автобусні квитки онлайн`
    const nextDescription = description || SITE.description
    const canonical = absoluteUrl(path || window.location.pathname)
    const image = absoluteUrl(SITE.image)

    document.title = nextTitle
    setMeta('meta[name="description"]', 'content', nextDescription)
    setMeta('meta[name="robots"]', 'content', 'index,follow')
    setMeta('meta[property="og:title"]', 'content', nextTitle)
    setMeta('meta[property="og:description"]', 'content', nextDescription)
    setMeta('meta[property="og:url"]', 'content', canonical)
    setMeta('meta[property="og:image"]', 'content', image)
    setMeta('meta[name="twitter:title"]', 'content', nextTitle)
    setMeta('meta[name="twitter:description"]', 'content', nextDescription)
    setMeta('meta[name="twitter:image"]', 'content', image)
    setLink('canonical', canonical)
  }, [title, description, path])
}
