/** Defaults match backend mapSubServiceId (HDaily / HWeekly / HMonthly). */
export function defaultSubServiceId(pack) {
  const p = String(pack || 'daily').toLowerCase()
  if (p === 'weekly') return 'HWeekly'
  if (p === 'monthly') return 'HMonthly'
  return 'HDaily'
}

export function sanitizeSubscribeParam(raw, max = 80) {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^(javascript|data|https?):/i.test(s)) return ''
  if (/\{\{|\}\}/.test(s)) return ''
  return s.slice(0, max)
}

/** True when the campaign template can actually use pack / service / sub-service. */
export function templateHasSubscribeSlots(template) {
  const t = String(template || '')
  return /\{\{(pack|planId|serviceId|subServiceId)\}\}/.test(t)
}

export function fillSubscribeTemplate(template, vars = {}) {
  let result = String(template || '')
  for (const [key, val] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(val ?? '')
  }
  return result
}

/**
 * Preview the operator subscribe URL from the campaign template + this button's
 * pack / serviceId / subServiceId. MSISDN stays a placeholder until runtime.
 */
export function previewSubscribeUrl(
  template,
  { pack, serviceId, subServiceId, msisdn = '{{msisdn}}' } = {},
) {
  const planId = String(pack || 'daily').toLowerCase() || 'daily'
  const sid = sanitizeSubscribeParam(serviceId)
  const sub = sanitizeSubscribeParam(subServiceId) || defaultSubServiceId(planId)
  return fillSubscribeTemplate(template, {
    msisdn,
    phone: msisdn,
    pack: planId,
    planId,
    serviceId: sid,
    subServiceId: sub,
  })
}
