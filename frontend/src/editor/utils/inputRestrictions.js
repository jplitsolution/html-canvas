/**
 * Input restriction and limits utility for canvas editor and runtime flows.
 * Enforces character types (numbers, text, alphanumeric) and min/max limits.
 */

export function getInputRestriction(attrsOrEl) {
  if (!attrsOrEl) return 'any'

  const getAttr = (name) => {
    if (typeof attrsOrEl.getAttribute === 'function') {
      return attrsOrEl.getAttribute(name)
    }
    return attrsOrEl[name]
  }

  const explicit = getAttr('data-input-restriction')
  if (explicit && ['numbers', 'text', 'alphanumeric', 'email', 'any'].includes(explicit)) {
    return explicit
  }

  const otpField = getAttr('data-otp-field')
  const dcbField = getAttr('data-dcb-field')
  const field = getAttr('data-field')
  const type = (getAttr('type') || '').toLowerCase()
  const inputmode = (getAttr('inputmode') || '').toLowerCase()

  if (
    otpField === 'phone' ||
    otpField === 'otp' ||
    dcbField === 'phone' ||
    dcbField === 'pin' ||
    field === 'phone' ||
    field === 'otp' ||
    field === 'pin' ||
    type === 'tel' ||
    inputmode === 'numeric'
  ) {
    return 'numbers'
  }

  if (type === 'email') return 'email'
  if (type === 'number') return 'numbers'

  return 'any'
}

export function getInputLimits(attrsOrEl) {
  if (!attrsOrEl) return { min: null, max: null }

  const getAttr = (name) => {
    if (typeof attrsOrEl.getAttribute === 'function') {
      return attrsOrEl.getAttribute(name)
    }
    return attrsOrEl[name]
  }

  const minRaw = getAttr('data-min-length') ?? getAttr('minlength') ?? getAttr('min')
  const maxRaw = getAttr('data-max-length') ?? getAttr('maxlength') ?? getAttr('max')

  const min = minRaw != null && minRaw !== '' ? parseInt(minRaw, 10) : null
  const max = maxRaw != null && maxRaw !== '' ? parseInt(maxRaw, 10) : null

  return {
    min: Number.isFinite(min) && min > 0 ? min : null,
    max: Number.isFinite(max) && max > 0 ? max : null,
  }
}

export function cleanInputValue(val, restriction, maxLen) {
  if (val == null) return ''
  let cleaned = String(val)

  if (restriction === 'numbers') {
    cleaned = cleaned.replace(/\D/g, '')
  } else if (restriction === 'text') {
    // Unicode letters (\p{L}) and whitespace
    cleaned = cleaned.replace(/[^\p{L}\s]/gu, '')
  } else if (restriction === 'alphanumeric') {
    // Unicode letters, digits, and whitespace
    cleaned = cleaned.replace(/[^\p{L}0-9\s]/gu, '')
  } else if (restriction === 'email') {
    cleaned = cleaned.replace(/\s+/g, '')
  }

  if (Number.isFinite(maxLen) && maxLen > 0 && cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen)
  }

  return cleaned
}

export function isRestrictedKeyAllowed(e, restriction) {
  if (!restriction || restriction === 'any') return true

  // Standard control and navigation keys are always allowed
  if (
    e.key === 'Backspace' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.key === 'Delete' ||
    e.key === 'Escape' ||
    e.key.startsWith('Arrow') ||
    e.key === 'Home' ||
    e.key === 'End' ||
    e.key === 'PageUp' ||
    e.key === 'PageDown'
  ) {
    return true
  }

  // Allow modifier keys and standard shortcuts (copy, paste, cut, select all, undo, redo)
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return true
  }

  if (restriction === 'numbers') {
    return /^[0-9]$/.test(e.key)
  }

  if (restriction === 'text') {
    return /^[\p{L}\s]$/u.test(e.key)
  }

  if (restriction === 'alphanumeric') {
    return /^[\p{L}0-9\s]$/u.test(e.key)
  }

  if (restriction === 'email') {
    return /^[a-zA-Z0-9@._+\-]$/.test(e.key)
  }

  return true
}

export function validateInputLimits(val, attrsOrEl) {
  const str = String(val || '').trim()
  const { min, max } = getInputLimits(attrsOrEl)

  if (min != null && str.length < min) {
    return {
      valid: false,
      error: `Must be at least ${min} characters`,
      min,
      max,
    }
  }

  if (max != null && str.length > max) {
    return {
      valid: false,
      error: `Cannot exceed ${max} characters`,
      min,
      max,
    }
  }

  return { valid: true, min, max }
}

/**
 * Attaches real-time input restriction handlers to any container/root
 * (document, iframe document, or shadow root).
 */
export function attachInputRestrictions(rootEl) {
  if (!rootEl) return () => {}

  const onKeyDown = (e) => {
    const target = e.target
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return

    const restriction = getInputRestriction(target)
    if (restriction === 'any') return

    if (!isRestrictedKeyAllowed(e, restriction)) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Check if typing would exceed max length when not replacing selected text
    const { max } = getInputLimits(target)
    if (
      max != null &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key &&
      e.key.length === 1 &&
      (target.selectionEnd - target.selectionStart === 0) &&
      target.value.length >= max
    ) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const onInput = (e) => {
    const target = e.target
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return

    const restriction = getInputRestriction(target)
    const { max } = getInputLimits(target)

    const cleaned = cleanInputValue(target.value, restriction, max)
    if (target.value !== cleaned) {
      const start = target.selectionStart
      target.value = cleaned
      // Restore cursor position if possible
      try {
        if (start != null) {
          const newPos = Math.min(start, cleaned.length)
          target.setSelectionRange(newPos, newPos)
        }
      } catch (_) {
        /* noop */
      }
    }
  }

  const onPaste = (e) => {
    const target = e.target
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) return

    const restriction = getInputRestriction(target)
    if (restriction === 'any') return

    const pasteText = (e.clipboardData || window.clipboardData)?.getData('text') || ''
    if (!pasteText) return

    const { max } = getInputLimits(target)
    const start = target.selectionStart || 0
    const end = target.selectionEnd || 0
    const currentVal = target.value || ''

    // Clean only what is being pasted
    let cleanedPaste = cleanInputValue(pasteText, restriction, null)
    if (max != null) {
      const room = max - (currentVal.length - (end - start))
      if (room <= 0) {
        cleanedPaste = ''
      } else if (cleanedPaste.length > room) {
        cleanedPaste = cleanedPaste.slice(0, room)
      }
    }

    e.preventDefault()
    e.stopPropagation()

    const nextVal = currentVal.slice(0, start) + cleanedPaste + currentVal.slice(end)
    target.value = nextVal

    const newCursor = start + cleanedPaste.length
    try {
      target.setSelectionRange(newCursor, newCursor)
    } catch (_) {
      /* noop */
    }

    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
  }

  rootEl.addEventListener('keydown', onKeyDown, true)
  rootEl.addEventListener('input', onInput, true)
  rootEl.addEventListener('paste', onPaste, true)

  return () => {
    rootEl.removeEventListener('keydown', onKeyDown, true)
    rootEl.removeEventListener('input', onInput, true)
    rootEl.removeEventListener('paste', onPaste, true)
  }
}
