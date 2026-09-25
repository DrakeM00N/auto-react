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
