import { getUpcomingTrips } from './format.js'
import { routePath } from './routeSlug.js'

export function selectRoutesBySlug(routes, trips, now = new Date()) {
  const futureTripCounts = new Map()
  for (const trip of getUpcomingTrips(trips, now)) {
    const routeId = String(trip.routeId)
    futureTripCounts.set(routeId, (futureTripCounts.get(routeId) || 0) + 1)
  }

  const groups = new Map()
  for (const route of routes) {
    const routeUrl = routePath(route)
    const group = groups.get(routeUrl) || []
    group.push(route)
    groups.set(routeUrl, group)
  }

  const selectedRoutes = []
  const duplicates = []
  for (const [routeUrl, group] of groups) {
    const ranked = [...group].sort((a, b) => {
      const countDifference =
        (futureTripCounts.get(String(b.id)) || 0) -
        (futureTripCounts.get(String(a.id)) || 0)
      if (countDifference) return countDifference
      return Number(a.id) - Number(b.id) || String(a.id).localeCompare(String(b.id))
    })
    const [selected, ...skipped] = ranked
    selectedRoutes.push(selected)
    if (skipped.length) {
      duplicates.push({
        routeUrl,
        selected: {
          route: selected,
          futureTrips: futureTripCounts.get(String(selected.id)) || 0,
        },
        skipped: skipped.map(route => ({
          route,
          futureTrips: futureTripCounts.get(String(route.id)) || 0,
        })),
      })
    }
  }

  return { routes: selectedRoutes, duplicates }
}

export function selectRouteBySlug(routes, trips, slug, now = new Date()) {
  return selectRoutesBySlug(routes, trips, now).routes.find(
    route => routePath(route).split('/').pop() === slug,
  )
}
