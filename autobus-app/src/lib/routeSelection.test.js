import test from 'node:test'
import assert from 'node:assert/strict'
import { selectRouteBySlug, selectRoutesBySlug } from './routeSelection.js'

const now = new Date('2026-09-18T10:00:00+03:00')
const routes = [
  { id: 21, from: 'Львів', to: 'Харків' },
  { id: 36, from: 'Львів', to: 'Харків' },
  { id: 41, from: 'Полтава', to: 'Львів' },
]

test('selects the duplicate route with more future trips and reports skipped IDs', () => {
  const trips = [
    { routeId: 21, date: '2026-09-19', time: '08:00' },
    { routeId: 36, date: '2026-09-20', time: '09:00' },
    { routeId: 36, date: '2026-09-18', time: '11:00' },
  ]

  const selection = selectRoutesBySlug(routes, trips, now)

  assert.deepEqual(selection.routes.map(route => route.id), [36, 41])
  assert.equal(selection.duplicates[0].selected.futureTrips, 2)
  assert.deepEqual(
    selection.duplicates[0].skipped.map(item => [item.route.id, item.futureTrips]),
    [[21, 1]],
  )
  assert.equal(selectRouteBySlug(routes, trips, 'l-viv-kharkiv', now).id, 36)
})

test('breaks equal future-trip counts by smaller route ID', () => {
  const selection = selectRoutesBySlug(
    routes,
    [],
    now,
  )

  assert.equal(selection.duplicates[0].selected.route.id, 21)
})
