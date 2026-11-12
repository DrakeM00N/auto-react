import test from 'node:test'
import assert from 'node:assert/strict'
import { routePath, routeSlug } from './routeSlug.js'

test('route slugs use the production Львів spelling', () => {
  assert.equal(routeSlug({ from: 'Львів', to: 'Харків' }), 'l-viv-kharkiv')
  assert.equal(routeSlug({ from: 'Полтава', to: 'Львів' }), 'poltava-l-viv')
  assert.equal(routePath({ from: 'Lviv', to: 'Uman' }), '/routes/l-viv-uman')
  assert.equal(routePath({ from: 'Кременчук', to: 'Київ' }), '/routes/kremenchuk-kyiv')
})
