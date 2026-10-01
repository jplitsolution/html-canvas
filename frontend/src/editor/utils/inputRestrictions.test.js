import { describe, it, expect, vi } from 'vitest'
import {
  getInputRestriction,
  getInputLimits,
  cleanInputValue,
  isRestrictedKeyAllowed,
  validateInputLimits,
  attachInputRestrictions,
} from './inputRestrictions'

describe('inputRestrictions utility', () => {
  it('detects input restriction properly from attributes', () => {
    expect(getInputRestriction({ 'data-input-restriction': 'numbers' })).toBe('numbers')
    expect(getInputRestriction({ 'data-otp-field': 'phone' })).toBe('numbers')
    expect(getInputRestriction({ 'data-otp-field': 'otp' })).toBe('numbers')
    expect(getInputRestriction({ 'data-dcb-field': 'pin' })).toBe('numbers')
    expect(getInputRestriction({ type: 'tel' })).toBe('numbers')
    expect(getInputRestriction({ type: 'email' })).toBe('email')
    expect(getInputRestriction({ 'data-input-restriction': 'text' })).toBe('text')
    expect(getInputRestriction({})).toBe('any')
  })

  it('extracts min and max limits', () => {
    expect(getInputLimits({ minlength: '7', maxlength: '10' })).toEqual({ min: 7, max: 10 })
    expect(getInputLimits({ 'data-min-length': '5', 'data-max-length': '15' })).toEqual({ min: 5, max: 15 })
    expect(getInputLimits({})).toEqual({ min: null, max: null })
  })

  it('cleans input value according to restriction and max length', () => {
    // Numbers only
    expect(cleanInputValue('abc 123 - 456 def', 'numbers', null)).toBe('123456')
    expect(cleanInputValue('123456789012', 'numbers', 8)).toBe('12345678')

    // Text only (supports unicode and spaces)
    expect(cleanInputValue('John Doe 123!@#', 'text', null)).toBe('John Doe ')
    expect(cleanInputValue('أحمد 123', 'text', null)).toBe('أحمد ')

    // Alphanumeric
    expect(cleanInputValue('Code 123!@#', 'alphanumeric', null)).toBe('Code 123')

    // Email
    expect(cleanInputValue(' test @ example . com ', 'email', null)).toBe('test@example.com')
  })

  it('allows valid keys and blocks invalid keys', () => {
    // Control keys
    expect(isRestrictedKeyAllowed({ key: 'Backspace' }, 'numbers')).toBe(true)
    expect(isRestrictedKeyAllowed({ key: 'ArrowLeft' }, 'numbers')).toBe(true)
    expect(isRestrictedKeyAllowed({ ctrlKey: true, key: 'v' }, 'numbers')).toBe(true)

    // Numbers
    expect(isRestrictedKeyAllowed({ key: '5' }, 'numbers')).toBe(true)
    expect(isRestrictedKeyAllowed({ key: 'a' }, 'numbers')).toBe(false)
    expect(isRestrictedKeyAllowed({ key: '+' }, 'numbers')).toBe(false)

    // Text
    expect(isRestrictedKeyAllowed({ key: 'a' }, 'text')).toBe(true)
    expect(isRestrictedKeyAllowed({ key: '5' }, 'text')).toBe(false)
  })

  it('validates limits accurately', () => {
    const limits = { 'data-min-length': '7', 'data-max-length': '10' }
    expect(validateInputLimits('12345', limits).valid).toBe(false)
    expect(validateInputLimits('1234567', limits).valid).toBe(true)
    expect(validateInputLimits('1234567890', limits).valid).toBe(true)
    expect(validateInputLimits('12345678901', limits).valid).toBe(false)
  })

  it('attaches and detaches listeners to a container', () => {
    const container = document.createElement('div')
    const addSpy = vi.spyOn(container, 'addEventListener')
    const removeSpy = vi.spyOn(container, 'removeEventListener')

    const cleanup = attachInputRestrictions(container)
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(addSpy).toHaveBeenCalledWith('input', expect.any(Function), true)
    expect(addSpy).toHaveBeenCalledWith('paste', expect.any(Function), true)

    cleanup()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledWith('input', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function), true)
  })
})
