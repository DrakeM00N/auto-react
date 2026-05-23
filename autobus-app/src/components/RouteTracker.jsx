import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/analytics'

// Fires a page_view event on every route change. Renders nothing.
// Must live inside <BrowserRouter> so useLocation() is available.
function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    trackPageView()
  }, [location.pathname, location.search])

  return null
}

export default RouteTracker
