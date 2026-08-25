import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  DEFAULT_SUBSCRIBE_ROUTES,
  parseSubscribeRoutes,
  resolveSubscribeDestination,
} from './subscribeRoutes.js'

describe('subscribeRoutes', () => {
  it('parses default rules like Try checks', () => {
    const routes = parseSubscribeRoutes({})
    assert.ok(Array.isArray(routes.rules))
    assert.ok(routes.rules.length >= 4)
    assert.equal(routes.rules[0].key, 'currentStatus')
    assert.equal(routes.noPhone.page, 'OTP')
    assert.equal(routes.miss.page, 'THANKYOU')
    assert.equal(routes.fail.page, 'ERROR')
  })

  it('keeps custom key=value rules', () => {
    const routes = parseSubscribeRoutes({
      'data-subscribe-routes': JSON.stringify({
        rules: [
          { key: 'currentStatus', value: 'blocked', go: 'page', page: 'BLOCKED' },
          { key: 'reason', value: 'low_balance', go: 'page', page: 'LOW_BALANCE' },
        ],
        noPhone: { page: 'OTP' },
      }),
    })
    assert.equal(routes.rules.length, 2)
    assert.equal(routes.rules[0].value, 'blocked')
    assert.equal(routes.rules[1].key, 'reason')
    assert.equal(routes.noPhone.page, 'OTP')
  })

  it('migrates legacy success/blocked buckets into rules', () => {
    const routes = parseSubscribeRoutes({
      'data-subscribe-routes': JSON.stringify({
        success: { page: 'THANKYOU' },
        blocked: { page: 'BLOCKED' },
        noPhone: { page: 'OTP' },
      }),
    })
    assert.ok(routes.rules.some((r) => r.value === 'active' && r.page === 'THANKYOU'))
    assert.ok(routes.rules.some((r) => r.value === 'blocked' && r.page === 'BLOCKED'))
  })

  it('resolveSubscribeDestination prefers matched rule from backend', () => {
    const routes = parseSubscribeRoutes({})
    const dest = resolveSubscribeDestination(routes, {
      routeOutcome: 'RULE_MATCH',
      matchedGo: 'page',
      matchedPage: 'LOW_BALANCE',
    })
    assert.equal(dest.page, 'LOW_BALANCE')
  })

  it('resolveSubscribeDestination uses noPhone / fail fallbacks', () => {
    const routes = DEFAULT_SUBSCRIBE_ROUTES
    assert.equal(
      resolveSubscribeDestination(routes, { routeOutcome: 'NO_PHONE' }).page,
      'OTP',
    )
    assert.equal(
      resolveSubscribeDestination(routes, { routeOutcome: 'FAIL' }).page,
      'ERROR',
    )
  })
})
