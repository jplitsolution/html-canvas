import { describe, expect, it } from 'vitest'
import { applyDcbStageUi } from '../../src/services/flow/dcbStageUi'

function mount(html) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('applyDcbStageUi', () => {
  it('shows only the number field before pack select', () => {
    const root = mount(`
      <h1>Both</h1>
      <p>desc</p>
      <div><label>Mobile</label><input data-otp-field="phone" /></div>
      <div><label>PIN</label><input data-otp-field="otp" /></div>
      <button data-otp-action="send">Check</button>
      <button data-otp-action="verify">Confirm</button>
    `)
    applyDcbStageUi(root, 'MANUAL_MSISDN')
    expect(root.querySelector('[data-otp-field="phone"]').parentElement.hidden).toBe(false)
    expect(root.querySelector('[data-otp-field="otp"]').parentElement.hidden).toBe(true)
    expect(root.querySelector('[data-otp-action="send"]').hidden).toBe(false)
    expect(root.querySelector('[data-otp-action="verify"]').hidden).toBe(true)
    expect(root.querySelector('h1').textContent).toBe('Enter your number')
  })

  it('shows only the PIN field after pack select', () => {
    const root = mount(`
      <h1>Both</h1>
      <p>desc</p>
      <div><label>Mobile</label><input data-otp-field="phone" /></div>
      <div><label>PIN</label><input data-otp-field="otp" /></div>
      <button data-otp-action="send">Check</button>
      <button data-otp-action="verify">Confirm</button>
    `)
    applyDcbStageUi(root, 'PIN_REQUIRED')
    expect(root.querySelector('[data-otp-field="phone"]').parentElement.hidden).toBe(true)
    expect(root.querySelector('[data-otp-field="otp"]').parentElement.hidden).toBe(false)
    expect(root.querySelector('[data-otp-action="send"]').hidden).toBe(true)
    expect(root.querySelector('[data-otp-action="verify"]').hidden).toBe(false)
    expect(root.querySelector('h1').textContent).toBe('Enter billing PIN')
  })
})
