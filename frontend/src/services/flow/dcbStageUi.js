const NUMBER_STAGES = new Set(['MANUAL_MSISDN', 'MANUAL_CHECK', 'MANUAL_ENTRY', 'MSISDN_REQUIRED'])
const PIN_STAGES = new Set(['BILLING_PIN', 'PIN_ENTRY', 'PIN_SENT', 'PIN_REQUIRED'])
const AUTH_STAGES = new Set(['AUTH_OTP', 'AUTHORIZATION_REQUIRED'])

export const DCB_OTP_PREVIEW_STYLE_ID = 'tc-dcb-otp-preview'

const NUMBER_PREVIEW_CSS = `
/* Step 1: Hide verify button */
[data-otp-action="verify"],
button[data-otp-action="verify"],
.flow-btn[data-otp-action="verify"],
.both-flow-btn[data-otp-action="verify"],
.otp-flow-btn[data-otp-action="verify"],
[data-dcb-action="confirm-pin"],
button[data-dcb-action="confirm-pin"],
[data-action="verify-otp"],
button[data-action="verify-otp"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

/* Step 1: Hide step 2 containers & resend */
[data-otp-step="2"],
.otp-step-2,
.both-step-2,
.otp-resend-row,
.otp-step2-actions,
[data-dcb-stage="pin"] {
  display: none !important;
}

/* Step 1: Hide OTP field groups */
[class*="field-group"]:has([data-otp-field="otp"]),
[class*="field-group"]:has([data-dcb-field="pin"]),
[class*="field-group"]:has([data-field="otp"]),
[class*="field-group"]:has([data-field="pin"]),
:has(> [data-otp-field="otp"]),
:has(> [data-dcb-field="pin"]),
:has(> [data-field="otp"]),
:has(> [data-field="pin"]) {
  display: none !important;
}
`

const PIN_PREVIEW_CSS = `
/* Step 2: Hide send button */
[data-otp-action="send"],
button[data-otp-action="send"],
.flow-btn[data-otp-action="send"],
.both-flow-btn[data-otp-action="send"],
.otp-flow-btn[data-otp-action="send"],
[data-dcb-action="manual-check"],
button[data-dcb-action="manual-check"],
[data-action="send-otp"],
button[data-action="send-otp"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

/* Step 2: Hide step 1 containers */
[data-otp-step="1"],
.otp-step-1,
.both-step-1,
[data-dcb-stage="number"] {
  display: none !important;
}

/* Step 2: Hide phone field groups */
[class*="field-group"]:has([data-otp-field="phone"]),
[class*="field-group"]:has([data-dcb-field="phone"]),
[class*="field-group"]:has([data-field="phone"]),
:has(> [data-otp-field="phone"]),
:has(> [data-dcb-field="phone"]),
:has(> [data-field="phone"]) {
  display: none !important;
}
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

  const preserveCustom =
    Boolean(root.getAttribute?.('data-dcb-custom')) ||
    Boolean(root.querySelector?.('[data-dcb-custom]'))

  if (sendButton) {
    sendButton.hidden = PIN_STAGES.has(stage)
    if (!preserveCustom && !sendButton.hasAttribute('data-dcb-custom')) {
      if (showNumber) sendButton.textContent = 'Check subscription'
      if (showAuth) sendButton.textContent = 'Send OTP'
    }
  }
  if (verifyButton) {
    verifyButton.hidden = showNumber
    if (!preserveCustom && !verifyButton.hasAttribute('data-dcb-custom')) {
      if (PIN_STAGES.has(stage)) verifyButton.textContent = 'Confirm billing PIN'
      if (showAuth) verifyButton.textContent = 'Verify OTP'
    }
  }

  if (showNumber) {
    if (!preserveCustom && heading && !heading.hasAttribute('data-dcb-custom')) {
      heading.textContent = 'Enter your number'
      if (description) description.textContent = 'Enter your mobile number. After that you will choose a pack.'
      if (footnote) footnote.textContent = 'PIN is asked only after you pick a pack.'
    }
    return 'number'
  }

  if (showAuth) {
    if (!preserveCustom && heading && !heading.hasAttribute('data-dcb-custom')) {
      heading.textContent = 'Verify subscription'
      if (description) {
        description.textContent = 'This number is already subscribed. Enter the authorization OTP to continue.'
      }
      if (footnote) footnote.textContent = 'Dummy OTP is printed in the server log. 1234 also works.'
    }
    return 'pin'
  }

  if (showPin) {
    if (!preserveCustom && heading && !heading.hasAttribute('data-dcb-custom')) {
      heading.textContent = 'Enter billing PIN'
      if (description) description.textContent = 'Enter the PIN sent to your mobile number.'
      if (footnote) footnote.textContent = 'Your subscription will activate after the PIN is confirmed.'
    }
    return 'pin'
  }

  return 'number'
}

export function setDcbEditorPreview(editor, mode) {
  const doc = editor?.Canvas?.getDocument?.()
  if (!doc) return
  doc.body.classList.remove('dcb-preview-number', 'dcb-preview-pin', 'dcb-preview-all')
  if (mode === 'all') {
    doc.body.classList.add('dcb-preview-all')
    const style = doc.getElementById(DCB_OTP_PREVIEW_STYLE_ID)
    if (style) style.textContent = ''
    try {
      doc.querySelectorAll('[data-otp-action], [data-otp-step], [data-dcb-action], [data-dcb-stage]').forEach((el) => {
        el.style.removeProperty('display')
      })
    } catch (_) {}
    return
  }
  const isPinOrOtp = mode === 'pin' || mode === 'otp'
  doc.body.classList.add(isPinOrOtp ? 'dcb-preview-pin' : 'dcb-preview-number')
  let style = doc.getElementById(DCB_OTP_PREVIEW_STYLE_ID)
  if (!style) {
    style = doc.createElement('style')
    style.id = DCB_OTP_PREVIEW_STYLE_ID
    doc.head.appendChild(style)
  }
  style.textContent = isPinOrOtp ? PIN_PREVIEW_CSS : NUMBER_PREVIEW_CSS

  // Direct DOM style enforcement so canvas buttons stay strictly synchronized
  try {
    const sendBtns = doc.querySelectorAll(
      '[data-otp-action="send"], button[data-otp-action="send"], [data-dcb-action="manual-check"], [data-action="send-otp"]'
    )
    const verifyBtns = doc.querySelectorAll(
      '[data-otp-action="verify"], button[data-otp-action="verify"], [data-dcb-action="confirm-pin"], [data-action="verify-otp"]'
    )
    const step1Els = doc.querySelectorAll(
      '[data-otp-step="1"], .otp-step-1, .both-step-1, [data-dcb-stage="number"]'
    )
    const step2Els = doc.querySelectorAll(
      '[data-otp-step="2"], .otp-step-2, .both-step-2, [data-dcb-stage="pin"], .otp-resend-row, .otp-step2-actions'
    )
    const phoneFields = doc.querySelectorAll(
      '[data-otp-field="phone"], [data-dcb-field="phone"], [data-field="phone"]'
    )
    const otpFields = doc.querySelectorAll(
      '[data-otp-field="otp"], [data-dcb-field="pin"], [data-field="otp"]'
    )

    if (isPinOrOtp) {
      // Step 2 (OTP / PIN): hide send button & step 1, show verify & step 2
      sendBtns.forEach((b) => b.style.setProperty('display', 'none', 'important'))
      verifyBtns.forEach((b) => b.style.removeProperty('display'))
      step1Els.forEach((s) => s.style.setProperty('display', 'none', 'important'))
      step2Els.forEach((s) => s.style.removeProperty('display'))
      phoneFields.forEach((f) => {
        const group = f.closest?.('[class*="field-group"]') || f.parentElement
        if (group && !group.querySelector('[data-otp-field="otp"], [data-dcb-field="pin"]')) {
          group.style.setProperty('display', 'none', 'important')
        }
      })
      otpFields.forEach((f) => {
        const group = f.closest?.('[class*="field-group"]') || f.parentElement
        if (group) group.style.removeProperty('display')
      })
    } else {
      // Step 1 (Number): hide verify button & step 2, show send & step 1
      verifyBtns.forEach((b) => b.style.setProperty('display', 'none', 'important'))
      sendBtns.forEach((b) => b.style.removeProperty('display'))
      step2Els.forEach((s) => s.style.setProperty('display', 'none', 'important'))
      step1Els.forEach((s) => s.style.removeProperty('display'))
      otpFields.forEach((f) => {
        const group = f.closest?.('[class*="field-group"]') || f.parentElement
        if (group && !group.querySelector('[data-otp-field="phone"], [data-dcb-field="phone"]')) {
          group.style.setProperty('display', 'none', 'important')
        }
      })
      phoneFields.forEach((f) => {
        const group = f.closest?.('[class*="field-group"]') || f.parentElement
        if (group) group.style.removeProperty('display')
      })
    }
  } catch (_) {}
}
