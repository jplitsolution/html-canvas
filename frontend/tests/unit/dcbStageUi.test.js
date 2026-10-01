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

describe('setDcbEditorPreview', () => {
  it('hides verify button and otp field when editing step 1 (number)', async () => {
    const { setDcbEditorPreview } = await import('../../src/services/flow/dcbStageUi')
    const fakeDoc = document.implementation.createHTMLDocument('Editor Canvas')
    fakeDoc.body.innerHTML = `
      <div class="both-flow-field-group"><label>Mobile</label><input data-otp-field="phone" /></div>
      <button type="button" data-otp-action="send" class="both-flow-btn">Get OTP</button>
      <div class="both-flow-field-group"><label>OTP</label><input data-otp-field="otp" /></div>
      <button type="button" data-otp-action="verify" class="both-flow-btn">Verify & Continue</button>
    `
    const fakeEditor = { Canvas: { getDocument: () => fakeDoc } }

    setDcbEditorPreview(fakeEditor, 'number')

    const sendBtn = fakeDoc.querySelector('[data-otp-action="send"]')
    const verifyBtn = fakeDoc.querySelector('[data-otp-action="verify"]')
    const phoneGroup = fakeDoc.querySelector('[data-otp-field="phone"]').closest('.both-flow-field-group')
    const otpGroup = fakeDoc.querySelector('[data-otp-field="otp"]').closest('.both-flow-field-group')

    expect(sendBtn.style.display).not.toBe('none')
    expect(verifyBtn.style.display).toBe('none')
    expect(phoneGroup.style.display).not.toBe('none')
    expect(otpGroup.style.display).toBe('none')
  })

  it('hides send button and phone field when editing step 2 (otp)', async () => {
    const { setDcbEditorPreview } = await import('../../src/services/flow/dcbStageUi')
    const fakeDoc = document.implementation.createHTMLDocument('Editor Canvas')
    fakeDoc.body.innerHTML = `
      <div class="both-flow-field-group"><label>Mobile</label><input data-otp-field="phone" /></div>
      <button type="button" data-otp-action="send" class="both-flow-btn">Get OTP</button>
      <div class="both-flow-field-group"><label>OTP</label><input data-otp-field="otp" /></div>
      <button type="button" data-otp-action="verify" class="both-flow-btn">Verify & Continue</button>
    `
    const fakeEditor = { Canvas: { getDocument: () => fakeDoc } }

    setDcbEditorPreview(fakeEditor, 'otp')

    const sendBtn = fakeDoc.querySelector('[data-otp-action="send"]')
    const verifyBtn = fakeDoc.querySelector('[data-otp-action="verify"]')
    const phoneGroup = fakeDoc.querySelector('[data-otp-field="phone"]').closest('.both-flow-field-group')
    const otpGroup = fakeDoc.querySelector('[data-otp-field="otp"]').closest('.both-flow-field-group')

    expect(sendBtn.style.display).toBe('none')
    expect(verifyBtn.style.display).not.toBe('none')
    expect(phoneGroup.style.display).toBe('none')
    expect(otpGroup.style.display).not.toBe('none')
  })

  it('restores all fields and buttons when mode is all', async () => {
    const { setDcbEditorPreview } = await import('../../src/services/flow/dcbStageUi')
    const fakeDoc = document.implementation.createHTMLDocument('Editor Canvas')
    fakeDoc.body.innerHTML = `
      <div class="bf-field-group"><input class="bf-otp-code-input" data-otp-field="otp" /></div>
      <button type="button" data-otp-action="send" class="bf-resend-btn">Renvoyer</button>
      <button type="button" data-otp-action="verify" class="bf-primary-btn">Vérifier</button>
    `
    const fakeEditor = { Canvas: { getDocument: () => fakeDoc } }

    setDcbEditorPreview(fakeEditor, 'number')
    expect(fakeDoc.querySelector('.bf-field-group').style.display).toBe('none')
    expect(fakeDoc.querySelector('.bf-primary-btn').style.display).toBe('none')

    setDcbEditorPreview(fakeEditor, 'all')
    expect(fakeDoc.querySelector('.bf-field-group').style.display).toBe('')
    expect(fakeDoc.querySelector('.bf-primary-btn').style.display).toBe('')
    expect(fakeDoc.querySelector('.bf-resend-btn').style.display).toBe('')
  })
})
