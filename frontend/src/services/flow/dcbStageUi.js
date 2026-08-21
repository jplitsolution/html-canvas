const NUMBER_STAGES = new Set(['MANUAL_MSISDN', 'MANUAL_CHECK', 'MANUAL_ENTRY', 'MSISDN_REQUIRED'])
const PIN_STAGES = new Set(['BILLING_PIN', 'PIN_ENTRY', 'PIN_SENT', 'PIN_REQUIRED'])
const AUTH_STAGES = new Set(['AUTH_OTP', 'AUTHORIZATION_REQUIRED'])

export const DCB_OTP_PREVIEW_STYLE_ID = 'tc-dcb-otp-preview'

const NUMBER_PREVIEW_CSS = `
[data-dcb-stage="pin"],
[data-dcb-action="confirm-pin"],
[data-otp-action="verify"],
:has(> [data-dcb-field="pin"]),
:has(> [data-otp-field="otp"]),
:has(> [data-field="otp"]),
:has(> [data-field="pin"]) { display: none !important; }
`

const PIN_PREVIEW_CSS = `
[data-dcb-stage="number"],
[data-dcb-action="manual-check"],
[data-otp-action="send"],
:has(> [data-dcb-field="phone"]),
:has(> [data-otp-field="phone"]),
:has(> [data-field="phone"]) { display: none !important; }
`

function query(root, selector) {
  return root?.querySelector?.(selector) || null
}

function fieldBlockHasBoth(block) {
  if (!block) return false
  const hasPhone = Boolean(
    block.querySelector('[data-dcb-field="phone"], [data-otp-field="phone"], [data-field="phone"]')
  )
  const hasPin = Boolean(
    block.querySelector('[data-dcb-field="pin"], [data-otp-field="otp"], [data-field="otp"], [data-field="pin"]')
  )
  return hasPhone && hasPin
}

export function setFieldVisibility(input, visible) {
  if (!input) return
  const stage = input.closest('[data-dcb-stage]')
  if (stage) {
    stage.hidden = !visible
    return
  }
  const container = input.parentElement
  if (container && !fieldBlockHasBoth(container)) {
    container.hidden = !visible
    return
  }
  input.hidden = !visible
}

export function applyDcbStageUi(root, stage, { phoneInput, pinInput } = {}) {
  if (!root) return 'number'
  const resolvedPhone =
    phoneInput ||
    query(root, '[data-dcb-field="phone"], [data-otp-field="phone"], [data-field="phone"], input[type="tel"]')
  const resolvedPin =
    pinInput ||
    query(root, '[data-dcb-field="pin"], [data-otp-field="otp"], [data-field="otp"], [data-field="pin"]')
  const heading = query(root, 'h1')
  const description = heading?.nextElementSibling
  const sendButton = query(root, '[data-dcb-action="manual-check"], [data-otp-action="send"]')
  const verifyButton = query(root, '[data-dcb-action="confirm-pin"], [data-otp-action="verify"]')
  const footnote = query(root, '.flow-footnote')
  const numberStage = query(root, '[data-dcb-stage="number"]')
  const pinStage = query(root, '[data-dcb-stage="pin"]')

  const showNumber = NUMBER_STAGES.has(stage)
  const showPin = PIN_STAGES.has(stage) || AUTH_STAGES.has(stage)
  const showAuth = AUTH_STAGES.has(stage)

  if (numberStage) numberStage.hidden = !showNumber
  if (pinStage) pinStage.hidden = !(showPin || showAuth)
  setFieldVisibility(resolvedPhone, showNumber)
  setFieldVisibility(resolvedPin, showPin || showAuth)

  if (sendButton) {
    sendButton.hidden = PIN_STAGES.has(stage)
    if (showNumber) sendButton.textContent = 'Check subscription'
    if (showAuth) sendButton.textContent = 'Send OTP'
  }
  if (verifyButton) {
    verifyButton.hidden = showNumber
    if (PIN_STAGES.has(stage)) verifyButton.textContent = 'Confirm billing PIN'
    if (showAuth) verifyButton.textContent = 'Verify OTP'
  }

  if (showNumber) {
    if (heading) heading.textContent = 'Enter your number'
    if (description) description.textContent = 'Enter your mobile number. After that you will choose a pack.'
    if (footnote) footnote.textContent = 'PIN is asked only after you pick a pack.'
    return 'number'
  }

  if (showAuth) {
    if (heading) heading.textContent = 'Verify subscription'
    if (description) {
      description.textContent = 'This number is already subscribed. Enter the authorization OTP to continue.'
    }
    if (footnote) footnote.textContent = 'Dummy OTP is printed in the server log. 1234 also works.'
    return 'pin'
  }

  if (showPin) {
    if (heading) heading.textContent = 'Enter billing PIN'
    if (description) description.textContent = 'Enter the PIN sent to your mobile number.'
    if (footnote) footnote.textContent = 'Your subscription will activate after the PIN is confirmed.'
    return 'pin'
  }

  return 'number'
}

export function setDcbEditorPreview(editor, mode) {
  const doc = editor?.Canvas?.getDocument?.()
  if (!doc) return
  doc.body.classList.remove('dcb-preview-number', 'dcb-preview-pin')
  doc.body.classList.add(mode === 'pin' ? 'dcb-preview-pin' : 'dcb-preview-number')
  let style = doc.getElementById(DCB_OTP_PREVIEW_STYLE_ID)
  if (!style) {
    style = doc.createElement('style')
    style.id = DCB_OTP_PREVIEW_STYLE_ID
    doc.head.appendChild(style)
  }
  style.textContent = mode === 'pin' ? PIN_PREVIEW_CSS : NUMBER_PREVIEW_CSS
}
