// Reusable snippet fragments (kept in sync with backend/src/database/seed/default-funnel-pages.js)
const phoneFieldSnippet = `
    <div style="text-align:left;margin-bottom:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Mobile number</label>
      <input data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
    </div>`

const otpFieldSnippet = `
    <div style="text-align:left;margin-bottom:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">OTP</label>
      <input data-otp-field="otp" inputmode="numeric" placeholder="Enter OTP" style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
    </div>`

const packPickerSnippet = `
    <div data-flow-pack-picker class="flow-pack-picker">
      <p class="flow-pack-title">Choose your pack</p>
      <div class="flow-pack-list">
        <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
          <span class="flow-pack-name">Daily Pack</span>
          <span class="flow-pack-desc">Billed every day · Best for short trials</span>
        </button>
        <button type="button" data-pack="weekly" class="flow-pack-option">
          <span class="flow-pack-name">Weekly Pack</span>
          <span class="flow-pack-desc">Billed every week · Most popular</span>
        </button>
        <button type="button" data-pack="monthly" class="flow-pack-option">
          <span class="flow-pack-name">Monthly Pack</span>
          <span class="flow-pack-desc">Billed every month · Best value</span>
        </button>
      </div>
    </div>`

export const FUNNEL_PAGE_GUIDES = {
  HOME: {
    title: 'Home page',
    summary:
      'First content page after identity checks. Design freely — intro, one CTA, pack buttons, or a jump to Confirm are all valid.',
    canChange: [
      'Everything on this page',
      'Buttons, images, hotspots',
      'Try-checks-in-order button (status URL → page routing)',
    ],
    required: [],
    optional: [
      {
        id: 'subscribe-btn',
        label: 'Subscribe button',
        why: 'Starts the signup path. Re-add if it went missing after resize.',
        match: 'data-action="SUBSCRIBE"',
        thumb: 'button',
        snippet: `<button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>`,
      },
      {
        id: 'pack-ctas',
        label: 'Pack buttons (Daily / Weekly / Monthly)',
        why: 'Optional. Each click subscribes to that pack. Works on Home or Confirm. Confirm page is not required.',
        match: 'data-pack=',
        thumb: 'pricing',
        snippet: `<div class="flow-pack-list">
      <button type="button" data-action="SUBSCRIBE_ROUTE" data-pack="daily" class="flow-btn" style="margin-bottom:8px;">Daily Pack</button>
      <button type="button" data-action="SUBSCRIBE_ROUTE" data-pack="weekly" class="flow-btn" style="margin-bottom:8px;">Weekly Pack</button>
      <button type="button" data-action="SUBSCRIBE_ROUTE" data-pack="monthly" class="flow-btn">Monthly Pack</button>
    </div>`,
      },
    ],
  },
  OTP: {
    title: 'OTP verification page',
    summary:
      'Shown when OTP is in the path (no HE number, or OTP-only). After verify, Checks before Home campaigns open Home — not Confirm.',
    canChange: ['Titles', 'Colors', 'Layout', 'Button labels (keep the fields & buttons)'],
    required: [
      {
        id: 'phone-field',
        label: 'Phone number box',
        why: 'User types their mobile number here.',
        matchAny: ['data-otp-field="phone"', 'data-dcb-field="phone"'],
        thumb: 'contact',
        snippet: phoneFieldSnippet,
      },
      {
        id: 'send-otp',
        label: 'Get OTP button',
        why: 'Sends SMS code to the server.',
        matchAny: ['data-otp-action="send"', 'data-dcb-action="manual-check"'],
        thumb: 'button',
        snippet: `<button type="button" data-otp-action="send" class="flow-btn" style="margin-bottom:12px;">Get OTP</button>`,
      },
      {
        id: 'otp-field',
        label: 'OTP code box',
        why: 'User enters the SMS code here.',
        matchAny: ['data-otp-field="otp"', 'data-dcb-field="pin"'],
        thumb: 'contact',
        snippet: otpFieldSnippet,
      },
      {
        id: 'verify-otp',
        label: 'Verify button',
        why: 'Checks the code with the server and continues the flow.',
        matchAny: ['data-otp-action="verify"', 'data-dcb-action="confirm-pin"'],
        thumb: 'button',
        snippet: `<button type="button" data-otp-action="verify" class="flow-btn">Verify &amp; Continue</button>`,
      },
      {
        id: 'error-slot',
        label: 'Error message area',
        why: 'Shows errors like wrong OTP (can be empty but must exist).',
        matchAny: ['data-otp-slot="error"', 'data-dcb-slot="error"'],
        thumb: 'text',
        snippet: `<div data-otp-slot="error" style="min-height:18px;color:#dc2626;font-size:13px;margin-bottom:8px;"></div>`,
      },
      {
        id: 'status-slot',
        label: 'Status message area',
        why: 'Shows “code sent” messages (can be empty but must exist).',
        matchAny: ['data-otp-slot="status"', 'data-dcb-slot="status"'],
        thumb: 'text',
        snippet: `<div data-otp-slot="status" style="min-height:18px;color:#64748b;font-size:12px;margin-bottom:10px;"></div>`,
      },
    ],
  },
  CONFIRM: {
    title: 'Confirm page',
    summary:
      'Optional confirm / pack step. Pack subscribe buttons also work on Home or any other page. This page is not required.',
    canChange: [
      'Everything on this page',
      'Pack picker (optional)',
      'Confirm button (optional — data-action=CONFIRM if you still want server billing)',
      'Text, images, hotspots, try-checks-in-order buttons',
    ],
    required: [],
    optional: [
      {
        id: 'pack-daily',
        label: 'Pack options',
        why: 'Optional. Select-then-confirm on this page. Pack subscribe buttons also work on Home or any other page.',
        match: 'data-pack=',
        thumb: 'pricing',
        snippet: packPickerSnippet,
      },
      {
        id: 'confirm-btn',
        label: 'Confirm button',
        why: 'Only if you still want the built-in confirm click (most flows use status checks or OTP instead).',
        match: 'data-action="CONFIRM"',
        thumb: 'button',
        snippet: `<button type="button" data-action="CONFIRM" class="flow-btn">Confirm Subscription</button>`,
      },
    ],
  },
  THANKYOU: {
    title: 'Thank you page',
    summary: 'Shown after successful subscription. Informational only — no backend buttons required.',
    canChange: ['Everything on this page'],
    required: [],
  },
  INPROGRESS: {
    title: 'In progress page',
    summary:
      'Shown when subscription is pending (e.g. checksub returns pending). Informational only.',
    canChange: ['Everything on this page', 'Text, images, and styling'],
    required: [],
  },
  LOW_BALANCE: {
    title: 'Low balance page',
    summary:
      'Shown for parking / grace / insufficient balance (e.g. checksub returns parking). Informational only.',
    canChange: ['Everything on this page', 'Recharge instructions and branding'],
    required: [],
  },
  BLOCKED: {
    title: 'Blocked page',
    summary: 'Shown when user is not allowed to subscribe. Informational only.',
    canChange: ['Everything on this page'],
    required: [],
  },
  ERROR: {
    title: 'Error page',
    summary: 'Shown when billing fails. Informational only.',
    canChange: ['Everything on this page'],
    required: [],
  },
}

export function getFunnelPageGuide(pageType, verificationMode) {
  const base = pageType ? FUNNEL_PAGE_GUIDES[pageType] ?? null : null
  if (!base) return null
  if (String(verificationMode || '').toUpperCase() !== 'UNIVERSE_DCB') return base

  if (pageType === 'OTP') {
    return {
      ...base,
      title: 'Number, then PIN (same canvas)',
      summary:
        'Live pe pehle sirf number dikhega. Pack choose ke baad user wapas isi page pe aata hai, tab sirf PIN. Editor mein dono parts rakho — user ko ek saath nahi dikhte. Preview se Number / PIN alag dekh sakte ho.',
      required: base.required.map((item) => {
        if (item.id === 'phone-field') {
          return {
            ...item,
            label: 'Mobile number box',
            why: 'Pehli screen. Pack ke baad yeh hide ho jata hai.',
            snippet: `
    <div data-dcb-stage="number" style="text-align:left;margin-bottom:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Mobile number</label>
      <input data-dcb-field="phone" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
    </div>`,
          }
        }
        if (item.id === 'send-otp') {
          return {
            ...item,
            label: 'Check number button',
            why: 'Checks the number, then continues to Home packs.',
            snippet: `<div data-dcb-stage="number"><button type="button" data-dcb-action="manual-check" data-otp-action="send" class="flow-btn" style="margin-bottom:12px;">Check subscription</button></div>`,
          }
        }
        if (item.id === 'otp-field') {
          return {
            ...item,
            label: 'Billing PIN box',
            why: 'Pack ke baad wapas isi page pe sirf yeh dikhega.',
            snippet: `
    <div data-dcb-stage="pin" style="text-align:left;margin-bottom:12px;">
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Billing PIN</label>
      <input data-dcb-field="pin" data-otp-field="otp" inputmode="numeric" placeholder="Enter billing PIN" style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
    </div>`,
          }
        }
        if (item.id === 'verify-otp') {
          return {
            ...item,
            label: 'Confirm PIN button',
            why: 'Confirms the billing PIN and starts activation.',
            snippet: `<div data-dcb-stage="pin"><button type="button" data-dcb-action="confirm-pin" data-otp-action="verify" class="flow-btn">Confirm billing PIN</button></div>`,
          }
        }
        return item
      }),
    }
  }

  if (pageType === 'HOME') {
    return {
      ...base,
      title: 'Pack selection',
      summary:
        'After identity, user picks a pack here. Each pack button sends a billing PIN, then opens the PIN page.',
    }
  }

  return base
}

export function getPageHtml(editor) {
  if (!editor) return ''
  try {
    return editor.getHtml() || ''
  } catch {
    return ''
  }
}

export function validateFunnelPage(
  editor,
  pageType,
  verificationMode,
) {
  const guide = getFunnelPageGuide(pageType, verificationMode)
  if (!guide || !editor) return { ok: true, missing: [], guide }

  const html = getPageHtml(editor)
  const missing = guide.required.filter((req) => {
    const needles = req.matchAny?.length
      ? req.matchAny
      : req.match
        ? [req.match]
        : []
    if (needles.length === 0) return false
    return !needles.some((n) => html.includes(n))
  })
  return { ok: missing.length === 0, missing, guide }
}

const FLOW_MARKER_ATTRS = [
  'data-otp-field',
  'data-otp-action',
  'data-otp-slot',
  'data-dcb-field',
  'data-dcb-action',
  'data-dcb-slot',
  'data-action',
  'data-pack',
  'data-flow-pack-picker',
]

function hasFlowMarker(component) {
  const attrs = component?.getAttributes?.() || {}
  return FLOW_MARKER_ATTRS.some((key) => key in attrs)
}

/** Find the container that holds the page's flow elements, so re-added parts land inside the card. */
function findFlowContainer(editor) {
  const wrapper = editor.getWrapper?.()
  if (!wrapper) return null
  let container = null
  const walk = (cmp) => {
    if (container) return
    cmp.components?.().forEach((child) => {
      if (hasFlowMarker(child)) {
        container = child.parent?.() || null
        return
      }
      walk(child)
    })
  }
  walk(wrapper)
  return container
}

/**
 * Insert a required flow element back onto the page.
 * Places it next to the current selection when possible, otherwise inside the
 * card that holds the other flow elements, falling back to the page wrapper.
 */
export function insertFunnelPart(editor, snippet) {
  if (!editor || !snippet) return
  const wrapper = editor.getWrapper?.()
  if (!wrapper) return

  const selected = editor.getSelected?.()
  const selectedParent = selected?.parent?.()
  let added

  if (selected && selectedParent && !selected.is?.('wrapper')) {
    added = selectedParent.append(snippet, { at: selected.index() + 1 })
  } else {
    const container = findFlowContainer(editor) || wrapper
    added = container.append(snippet)
  }

  const node = Array.isArray(added) ? added[added.length - 1] : added
  if (node) {
    editor.select(node)
    try {
      node.view?.el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    } catch {
      /* scroll is best-effort */
    }
  }
}

export function getFlowElementInfo(attrs) {
  const action = attrs['data-action']
  if (action === 'CHAIN' || attrs['data-actions']) {
    return {
      isSystem: true,
      label: 'Try checks in order (system)',
      description:
        'On click: runs status checks top to bottom. Matching status opens a page (or the next step). Change the action below if needed.',
    }
  }
  if (action === 'SUBSCRIBE') {
    return {
      isSystem: true,
      label: 'Signup flow button (system)',
      description:
        'On click: continues the signup path from Flow Builder. Reconfigure below to switch to Subscribe API + pages, status checks, or another action.',
    }
  }
  if (action === 'SUBSCRIBE_ROUTE') {
    return {
      isSystem: true,
      label: 'Subscribe API + response rules (system)',
      description:
        'On click: hits checksub + Subscribe API, then matches response field = value rules (like Try checks) to open a page or link.',
    }
  }
  if (action === 'CONFIRM') {
    return {
      isSystem: true,
      label: 'Confirm button (system)',
      description:
        'On click: completes billing via Flow Builder. Reconfigure below to switch to status checks, a page, or another action.',
    }
  }

  const otpAction = attrs['data-otp-action']
  if (otpAction === 'send') {
    return {
      isSystem: true,
      label: 'Send OTP button (system)',
      description: 'Sends SMS code. Do not delete.',
    }
  }
  if (otpAction === 'verify') {
    return {
      isSystem: true,
      label: 'Verify OTP button (system)',
      description: 'Verifies the code with server. Do not delete.',
    }
  }

  const otpField = attrs['data-otp-field']
  if (otpField === 'phone') {
    return {
      isSystem: true,
      label: 'Phone input (system)',
      description: 'Required for OTP flow. Style it freely — do not delete.',
    }
  }
  if (otpField === 'otp') {
    return {
      isSystem: true,
      label: 'OTP input (system)',
      description: 'Where user enters SMS code. Do not delete.',
    }
  }

  if (attrs['data-otp-slot']) {
    return {
      isSystem: true,
      label: `${attrs['data-otp-slot'] === 'error' ? 'Error' : 'Status'} message area (system)`,
      description: 'App shows messages here. Can be invisible but must stay on the page.',
    }
  }

  if (attrs['data-pack']) {
    return {
      isSystem: true,
      label: `Pack option: ${attrs['data-pack']}`,
      description:
        'Subscribe pack. Works on Home, Confirm, or any page. Do not remove pack buttons you still need.',
    }
  }

  if (attrs['data-flow-pack-picker'] !== undefined || attrs['data-flow-pack-picker'] === '') {
    return {
      isSystem: true,
      label: 'Pack picker (system)',
      description: 'Contains daily / weekly / monthly options.',
    }
  }

  return null
}

/** Soft warning: OTP postback + pack CTAs are two conversion kinds, not three pack buttons. */
export function hasMixedConversionTriggers({ html = '', postbackRegisterAt } = {}) {
  const hasPackCta = /data-pack\s*=/i.test(String(html || ''))
  const otpPostback =
    postbackRegisterAt === 'otp' || postbackRegisterAt === 'both'
  return Boolean(hasPackCta && otpPostback)
}
