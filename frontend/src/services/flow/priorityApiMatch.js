/** Read a field from an object; also try snake_case of camelCase keys (OTP parity). */
export function getResponseField(data, key) {
  if (!data || typeof data !== 'object' || !key) return null
  if (data[key] !== undefined && data[key] !== null) return data[key]
  const snake = String(key)
    .replace(/([A-Z])/g, '_$1')
    .replace(/__/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
  if (snake !== key && data[snake] !== undefined && data[snake] !== null) {
    return data[snake]
  }
  return null
}

function readField(json, key) {
  const nested = json?.data && typeof json.data === 'object' ? json.data : null
  return getResponseField(json, key) ?? (nested ? getResponseField(nested, key) : null)
}

function normalizeGo(raw) {
  const g = String(raw || 'page').trim().toLowerCase()
  return g === 'external' ? 'external' : 'page'
}

function mapRule(r = {}) {
  const go = normalizeGo(r.go)
  return {
    key: String(r?.key || '').trim(),
    value: r?.value != null ? String(r.value).trim() : '',
    go,
    page: String(r?.page || '').trim().toUpperCase(),
    url: String(r?.url || '').trim(),
  }
}

/** Normalize step.rules + legacy successKey/successValue into a rules list. */
export function normalizePriorityRules(step = {}) {
  if (Array.isArray(step.rules) && step.rules.length > 0) {
    return step.rules.map(mapRule).filter((r) => r.key && r.value !== '')
  }

  const key = String(step.successKey || '').trim()
  const value = step.successValue != null ? String(step.successValue).trim() : ''
  if (key && value !== '') {
    return [
      {
        key,
        value,
        go: 'page',
        page: String(step.matchPage || 'THANKYOU').trim().toUpperCase() || 'THANKYOU',
        url: '',
      },
    ]
  }
  return []
}

/** Editor helper — keeps incomplete rows while typing (does not drop empty values). */
export function normalizeApiRules(step = {}) {
  if (Array.isArray(step.rules) && step.rules.length > 0) {
    return step.rules.map((r) => {
      const mapped = mapRule({
        ...r,
        value: r?.value != null ? String(r.value) : '',
        page: r?.page || 'OTP',
      })
      return mapped
    })
  }
  return normalizePriorityRules(step)
}

/**
 * Priority API match — first matching rule wins.
 * rules: [{ key, value, go: 'page'|'external', page, url }, ...]
 */
export function evaluatePriorityApiMatch(json, step = {}) {
  const rules = normalizePriorityRules(step)

  if (rules.length > 0) {
    for (const rule of rules) {
      const actual = readField(json, rule.key)
      if (actual === undefined || actual === null) continue
      if (String(actual) === rule.value) {
        return {
          matched: true,
          mode: 'rules',
          key: rule.key,
          expected: rule.value,
          actual: String(actual),
          go: rule.go || 'page',
          page: rule.page || null,
          url: rule.url || '',
          currentStatus: '',
        }
      }
    }
    return {
      matched: false,
      mode: 'rules',
      key: rules[0]?.key || '',
      expected: rules.map((r) => r.value).join('|'),
      actual: readField(json, rules[0]?.key) != null
        ? String(readField(json, rules[0]?.key))
        : null,
      go: 'page',
      page: null,
      url: '',
      currentStatus: '',
    }
  }

  const nestedData = json?.data && typeof json.data === 'object' ? json.data : json || {}
  const currentStatus = String(
    nestedData.currentStatus ||
      nestedData.subscriptionStatus ||
      json?.subscriptionStatus ||
      json?.status ||
      '',
  )
    .trim()
    .toLowerCase()
  const isActive = currentStatus === 'active'
  const matched =
    isActive ||
    (Boolean(currentStatus) && currentStatus !== 'new' && currentStatus !== 'unknown')

  return {
    matched,
    mode: 'legacy_status',
    key: '',
    expected: '',
    actual: currentStatus || null,
    go: 'page',
    page: null,
    url: '',
    currentStatus,
  }
}
