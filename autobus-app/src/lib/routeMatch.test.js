import test from 'node:test'
import assert from 'node:assert/strict'
import { routeMatchesEndpoints, routeSearchText } from './routeMatch.js'

const route = { from: 'Львів', to: 'Харків', stops: ['Київ', 'Полтава'] }

test('city filters match only the start and end points of a route', () => {
  assert.equal(routeMatchesEndpoints(route, 'Львів', ''), true)
  assert.equal(routeMatchesEndpoints(route, '', 'Харків'), true)
  assert.equal(routeMatchesEndpoints(route, 'Львів', 'Харків'), true)
})

test('city filters do not match intermediate stops', () => {
  assert.equal(routeMatchesEndpoints(route, 'Київ', ''), false)
  assert.equal(routeMatchesEndpoints(route, '', 'Полтава'), false)
  assert.equal(routeMatchesEndpoints(route, 'Київ', 'Харків'), false)
})

test('from and to filters do not match the opposite endpoint', () => {
  assert.equal(routeMatchesEndpoints(route, 'Харків', ''), false)
  assert.equal(routeMatchesEndpoints(route, '', 'Львів'), false)
})

test('no filters match every route; a missing route never matches', () => {
  assert.equal(routeMatchesEndpoints(route, '', ''), true)
  assert.equal(routeMatchesEndpoints(undefined, 'Львів', ''), false)
})

test('free-text search excludes intermediate stops', () => {
  const text = routeSearchText(route, '2026-11-20', '08:00')
  assert.ok(text.includes('львів') && text.includes('харків') && text.includes('08:00'))
  assert.ok(!text.includes('київ') && !text.includes('полтава'))
})
