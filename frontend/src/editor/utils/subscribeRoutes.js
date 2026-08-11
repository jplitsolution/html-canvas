/**
 * Button destinations for data-action=SUBSCRIBE_ROUTE.
 * Priority-Chain style: response field = value → page/URL, plus system fallbacks.
 */

export const DEFAULT_SUBSCRIBE_RULES = [
  { key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' },
  { key: 'currentStatus', value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
  { key: 'currentStatus', value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
  { key: 'currentStatus', value: 'blocked', go: 'page', page: 'BLOCKED', url: '' },
]

export const DEFAULT_SUBSCRIBE_ROUTES = {
  rules: DEFAULT_SUBSCRIBE_RULES.map((r) => ({ ...r })),
  noPhone: { go: 'page', page: 'OTP', url: '' },
  /** After subscribe OK when no rule matched the response */
  miss: { go: 'page', page: 'THANKYOU', url: '' },
  /** Partner subscribe / check failed to load */
  fail: { go: 'page', page: 'ERROR', url: '' },
}

function dest(partial, fallback) {
  return {
    go: partial?.go === 'external' ? 'external' : 'page',
    page: String(partial?.page || fallback.page || 'THANKYOU').trim().toUpperCase(),
    url: String(partial?.url || '').trim(),
  }
}

function mapRule(r = {}) {
  return {
    key: String(r?.key || '').trim(),
    value: r?.value != null ? String(r.value).trim() : '',
    go: r?.go === 'external' ? 'external' : 'page',
    page: String(r?.page || 'THANKYOU').trim().toUpperCase(),
    url: String(r?.url || '').trim(),
  }
}

/** Migrate older fixed-bucket saves into rules + fallbacks. */
function migrateLegacyBuckets(parsed) {
  if (Array.isArray(parsed?.rules) && parsed.rules.length > 0) {
    return null
  }
  const rules = []
  if (parsed?.success?.page || parsed?.success?.url) {
    rules.push({
      key: 'currentStatus',
      value: 'active',
      ...dest(parsed.success, { page: 'THANKYOU' }),
    })
  }
  if (parsed?.alreadySubscribed?.page || parsed?.alreadySubscribed?.url) {
    // Prefer explicit already-subscribed destination for active
    const d = dest(parsed.alreadySubscribed, { page: 'THANKYOU' })
    const idx = rules.findIndex((r) => r.key === 'currentStatus' && r.value === 'active')
    if (idx >= 0) rules[idx] = { key: 'currentStatus', value: 'active', ...d }
    else rules.push({ key: 'currentStatus', value: 'active', ...d })
  }
  if (parsed?.blocked?.page || parsed?.blocked?.url) {
    rules.push({
      key: 'currentStatus',
      value: 'blocked',
      ...dest(parsed.blocked, { page: 'BLOCKED' }),
    })
  }
  if (rules.length === 0) return null
  return rules
}

export function parseSubscribeRoutes(attrs = {}) {
  const raw = attrs['data-subscribe-routes']
  if (!raw) {
    return {
      rules: DEFAULT_SUBSCRIBE_RULES.map((r) => ({ ...r })),
      noPhone: { ...DEFAULT_SUBSCRIBE_ROUTES.noPhone },
      miss: { ...DEFAULT_SUBSCRIBE_ROUTES.miss },
      fail: { ...DEFAULT_SUBSCRIBE_ROUTES.fail },
    }
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const migrated = migrateLegacyBuckets(parsed)
    const rulesSource =
      migrated ||
      (Array.isArray(parsed?.rules) && parsed.rules.length > 0
        ? parsed.rules
        : DEFAULT_SUBSCRIBE_RULES)
    return {
      rules: rulesSource.map(mapRule),
      noPhone: dest(parsed?.noPhone, DEFAULT_SUBSCRIBE_ROUTES.noPhone),
      miss: dest(
        parsed?.miss || parsed?.success,
        DEFAULT_SUBSCRIBE_ROUTES.miss,
      ),
      fail: dest(parsed?.fail, DEFAULT_SUBSCRIBE_ROUTES.fail),
    }
  } catch {
    return {
      rules: DEFAULT_SUBSCRIBE_RULES.map((r) => ({ ...r })),
      noPhone: { ...DEFAULT_SUBSCRIBE_ROUTES.noPhone },
      miss: { ...DEFAULT_SUBSCRIBE_ROUTES.miss },
      fail: { ...DEFAULT_SUBSCRIBE_ROUTES.fail },
    }
  }
}

/**
 * Pick destination from backend outcome + optional rule match.
 * Backend may set matchedGo/matchedPage/matchedUrl when a rule hit.
 */
export function resolveSubscribeDestination(routes, next = {}) {
  const r = routes || parseSubscribeRoutes({})
  if (next.matchedGo === 'external' && next.matchedUrl) {
    return { go: 'external', page: '', url: String(next.matchedUrl) }
  }
  if (next.matchedPage) {
    return {
      go: 'page',
      page: String(next.matchedPage).toUpperCase(),
      url: '',
    }
  }

  const outcome = String(next.routeOutcome || '').toUpperCase()
  if (outcome === 'NO_PHONE') return r.noPhone
  if (outcome === 'FAIL') return r.fail
  if (outcome === 'SUCCESS' || outcome === 'ALREADY_SUBSCRIBED' || outcome === 'RULE_MATCH') {
    return r.miss
  }
  if (outcome === 'BLOCKED') {
    const blockedRule = (r.rules || []).find(
      (rule) =>
        rule.key === 'currentStatus' &&
        String(rule.value).toLowerCase() === 'blocked',
    )
    if (blockedRule) return blockedRule
    return { go: 'page', page: 'BLOCKED', url: '' }
  }
  return r.fail
}
