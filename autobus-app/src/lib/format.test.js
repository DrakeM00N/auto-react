import test from 'node:test'
import assert from 'node:assert/strict'
import { getUpcomingTrips, isDepartedAt } from './format.js'

const now = new Date('2026-09-18T10:00:00+03:00')

test('filters past departures and keeps future trips in ascending order', () => {
  const trips = [
    { id: 1, date: '2026-09-19', time: '08:00' },
    { id: 2, date: '2026-09-18', time: '09:59' },
    { id: 3, date: '2026-09-18', time: '11:30' },
    { id: 4, date: '2026-09-18', time: '10:00' },
  ]

  assert.deepEqual(getUpcomingTrips(trips, now).map(trip => trip.id), [3, 1])
  assert.equal(isDepartedAt(trips[1], now), true)
  assert.equal(isDepartedAt(trips[2], now), false)
})

test('returns an empty list when every trip has departed', () => {
  const trips = [
    { date: '2026-09-17', time: '18:00' },
    { date: '2026-09-18', time: '09:59' },
  ]

  assert.deepEqual(getUpcomingTrips(trips, now), [])
})

test('keeps trips with malformed date/time instead of dropping them', () => {
  const trips = [
    { id: 1, date: '2026-09-19', time: '08:00' },
    { id: 2, date: 'not-a-date', time: '08:00' },
    { id: 3 },
  ]

  assert.deepEqual(getUpcomingTrips(trips, now).map(trip => trip.id).sort(), [1, 2, 3])
})

test('sorts upcoming trips by date and time and does not mutate the input', () => {
  const trips = [
    { id: 1, date: '2026-09-20', time: '08:00' },
    { id: 2, date: '2026-09-18', time: '12:00' },
    { id: 3, date: '2026-09-18', time: '10:30' },
  ]
  const snapshot = JSON.stringify(trips)

  assert.deepEqual(getUpcomingTrips(trips, now).map(trip => trip.id), [3, 2, 1])
  assert.equal(JSON.stringify(trips), snapshot)
})

test('upcoming filter stays fast on a full catalog (regression: Intl per trip)', () => {
  const trips = Array.from({ length: 13385 }, (_, i) => ({
    id: i,
    date: new Date(Date.UTC(2026, 8, 1) + (i % 365) * 86400000).toISOString().slice(0, 10),
    time: `${String(i % 24).padStart(2, '0')}:30`,
  }))

  const startedAt = performance.now()
  getUpcomingTrips(trips, now)
  const elapsed = performance.now() - startedAt

  // Раніше ≈880 мс (new Intl.DateTimeFormat на кожен рейс); тепер десятки мс.
  assert.ok(elapsed < 300, `getUpcomingTrips took ${elapsed.toFixed(0)} ms`)
})
