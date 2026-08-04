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

/**
 * Priority API match:
 * - If successKey + successValue set → OTP-style rule (checks body + body.data)
 * - Else → legacy subscriptionStatus heuristic (active / pending / …)
 */
export function evaluatePriorityApiMatch(json, step = {}) {
  const key = String(step.successKey || '').trim()
  const expectedRaw = step.successValue
  const hasRule = Boolean(key) && expectedRaw != null && String(expectedRaw).trim() !== ''

  if (hasRule) {
    const expected = String(expectedRaw).trim()
    const nested = json?.data && typeof json.data === 'object' ? json.data : null
    const actual =
      getResponseField(json, key) ?? (nested ? getResponseField(nested, key) : null)
    if (actual === undefined || actual === null) {
      return { matched: false, mode: 'rule', key, expected, actual: null, currentStatus: '' }
    }
    return {
      matched: String(actual) === expected,
      mode: 'rule',
      key,
      expected,
      actual: String(actual),
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
    currentStatus,
  }
}
