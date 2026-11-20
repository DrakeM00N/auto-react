// Search city filters match route endpoints only; intermediate stops are displayed, not searchable.
export function routeMatchesEndpoints(route, from, to) {
  if (!route) return false
  if (from && route.from !== from) return false
  if (to && route.to !== to) return false
  return true
}

// Free-text search includes route endpoints and optional trip metadata, but not intermediate stops.
export function routeSearchText(route, ...extra) {
  return [route.from, route.to, ...extra].join(' ').toLowerCase()
}
