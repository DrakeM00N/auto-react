import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getScheduleDate } from './scheduleDate.js'

test('schedule date defaults to today unless the URL explicitly clears it', () => {
  assert.equal(getScheduleDate(new URLSearchParams(), '2026-11-20'), '2026-11-20')
  assert.equal(getScheduleDate(new URLSearchParams('date=2026-11-27'), '2026-11-20'), '2026-11-27')
  assert.equal(getScheduleDate(new URLSearchParams('date='), '2026-11-20'), '')
})
