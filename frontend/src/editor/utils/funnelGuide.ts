import type { Editor } from 'grapesjs'

export type FunnelPageType = 'HOME' | 'OTP' | 'CONFIRM' | 'THANKYOU' | 'BLOCKED' | 'ERROR'

export interface FunnelRequirement {
  id: string
  label: string
  /** Plain-language explanation for non-technical clients */
  why: string
  /** Substring that must appear in page HTML (legacy single match) */
  match?: string
  /** Any of these substrings counts as present */
  matchAny?: string[]
  /** HTML inserted when the client re-adds this element (from banner or sidebar) */
  snippet: string
  /** Thumbnail key used for the sidebar block card */
  thumb: string
}

// Reusable snippet fragments (kept in sync with backend/src/database/seed/default-funnel-pages.ts)
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

export interface FunnelPageGuide {
  title: string
  summary: string
  canChange: string[]
  required: FunnelRequirement[]
}

export const FUNNEL_PAGE_GUIDES: Partial<Record<FunnelPageType, FunnelPageGuide>> = {
  HOME: {
    title: 'Home page',
    summary:
      'User lands here first. Design freely — any button or hotspot can start the flow. Verification mode (HE / OTP / both / none) is chosen in Flow Builder, not by a required Subscribe button.',
    canChange: [
      'Everything on this page',
      'Buttons, images, hotspots',
      'Priority Chain steps (API / page / flow / external redirect)',
    ],
    required: [],
  },
  OTP: {
    title: 'OTP verification page',
    summary:
      'Shown when the phone number is not detected. User enters number, gets SMS code, then verifies.',
    canChange: ['Titles', 'Colors', 'Layout', 'Button labels (keep the fields & buttons)'],
    required: [
      {
        id: 'phone-field',
        label: 'Phone number box',
        why: 'User types their mobile number here.',
        match: 'data-otp-field="phone"',
        thumb: 'contact',
        snippet: phoneFieldSnippet,
      },
      {
        id: 'send-otp',
        label: 'Get OTP button',
        why: 'Sends SMS code to the server.',
        match: 'data-otp-action="send"',
        thumb: 'button',
        snippet: `<button type="button" data-otp-action="send" class="flow-btn" style="margin-bottom:12px;">Get OTP</button>`,
      },
      {
        id: 'otp-field',
        label: 'OTP code box',
        why: 'User enters the SMS code here.',
        match: 'data-otp-field="otp"',
        thumb: 'contact',
        snippet: otpFieldSnippet,
      },
      {
        id: 'verify-otp',
        label: 'Verify button',
        why: 'Checks the code with the server and continues the flow.',
        match: 'data-otp-action="verify"',
        thumb: 'button',
        snippet: `<button type="button" data-otp-action="verify" class="flow-btn">Verify &amp; Continue</button>`,
      },
      {
        id: 'error-slot',
        label: 'Error message area',
        why: 'Shows errors like wrong OTP (can be empty but must exist).',
        match: 'data-otp-slot="error"',
        thumb: 'text',
        snippet: `<div data-otp-slot="error" style="min-height:18px;color:#dc2626;font-size:13px;margin-bottom:8px;"></div>`,
      },
      {
        id: 'status-slot',
        label: 'Status message area',
        why: 'Shows “code sent” messages (can be empty but must exist).',
        match: 'data-otp-slot="status"',
        thumb: 'text',
        snippet: `<div data-otp-slot="status" style="min-height:18px;color:#64748b;font-size:12px;margin-bottom:10px;"></div>`,
      },
    ],
  },
  CONFIRM: {
    title: 'Confirm subscription page',
    summary:
      'User picks a pack (daily / weekly / monthly) and confirms. This triggers billing on the server.',
    canChange: ['Text', 'Colors', 'Pack names & descriptions', 'Confirm button label'],
    required: [
      {
        id: 'pack-daily',
        label: 'Pack options',
        why: 'User must pick daily, weekly, or monthly before confirming.',
        match: 'data-pack=',
        thumb: 'pricing',
        snippet: packPickerSnippet,
      },
      {
        id: 'confirm-btn',
        label: 'Confirm button',
        why: 'Completes subscription and charges the user — do not remove.',
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

export function getPageHtml(editor: Editor | null): string {
  if (!editor) return ''
  try {
    return editor.getHtml() || ''
  } catch {
    return ''
  }
}

export function validateFunnelPage(
  editor: Editor | null,
  pageType: string | undefined,
): { ok: boolean; missing: FunnelRequirement[]; guide: FunnelPageGuide | null } {
  const guide = pageType ? FUNNEL_PAGE_GUIDES[pageType as FunnelPageType] ?? null : null
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

const FLOW_MARKER_ATTRS = ['data-otp-field', 'data-otp-action', 'data-otp-slot', 'data-action', 'data-pack', 'data-flow-pack-picker']

function hasFlowMarker(component: any): boolean {
  const attrs = component?.getAttributes?.() || {}
  return FLOW_MARKER_ATTRS.some((key) => key in attrs)
}

/** Find the container that holds the page's flow elements, so re-added parts land inside the card. */
function findFlowContainer(editor: Editor): any | null {
  const wrapper = editor.getWrapper?.()
  if (!wrapper) return null
  let container: any = null
  const walk = (cmp: any) => {
    if (container) return
    cmp.components?.().forEach((child: any) => {
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
export function insertFunnelPart(editor: Editor | null, snippet: string): void {
  if (!editor || !snippet) return
  const wrapper = editor.getWrapper?.()
  if (!wrapper) return

  const selected = editor.getSelected?.()
  const selectedParent = selected?.parent?.()
  let added: any

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

export interface FlowActionStep {
  type: 'api' | 'page' | 'external' | 'anchor' | 'flow' | string
  url?: string
  page?: string
  section?: string
}

export interface FlowElementInfo {
  isSystem: boolean
  /** When true, keep showing Action Chain / click destination editors */
  editableActions: boolean
  label: string
  description: string
  /** Plain-language lines of what happens on click (shown in editor) */
  onClick: string[]
  steps?: FlowActionStep[]
}

function parseActionSteps(raw: string | undefined): FlowActionStep[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function describeActionStep(step: FlowActionStep, index: number): string {
  const n = index + 1
  switch (step.type) {
    case 'api':
      return `Priority ${n}: Call API “${step.url || '(no URL)'}”. If already subscribed → Thank You. If fail / not subscribed → next priority.`
    case 'page':
      return `Priority ${n}: Open campaign page “${(step.page || '').toUpperCase() || '(none)'}”.`
    case 'external':
      return `Priority ${n}: Redirect to website “${step.url || '(no URL)'}”.`
    case 'anchor':
      return `Priority ${n}: Scroll to section “#${step.section || ''}” on this page.`
    case 'flow':
      return `Priority ${n}: Continue verification flow (HE / OTP) from Flow Builder settings.`
    default:
      return `Priority ${n}: Unknown action “${step.type}”.`
  }
}

/** Human-readable summary of what this element does when the user clicks it. */
export function describeClickBehavior(attrs: Record<string, string>): string[] {
  const action = attrs['data-action']
  if (action === 'CHAIN' || attrs['data-actions']) {
    const steps = parseActionSteps(attrs['data-actions'])
    if (steps.length === 0) {
      return ['Priority Chain is set, but no steps configured yet. Add steps below.']
    }
    return [
      'On click this runs a Sequential Action Chain (highest priority first):',
      ...steps.map(describeActionStep),
    ]
  }
  if (action === 'SUBSCRIBE') {
    return [
      'On click: starts verification (HE / OTP) using Flow Builder mode.',
      'Button label can be anything — the action is what matters.',
    ]
  }
  if (action === 'CONFIRM') {
    return [
      'On click: confirms the selected pack and triggers billing on the server.',
      'Do not delete this button — only change the label / style if needed.',
    ]
  }
  if (attrs['data-otp-action'] === 'send') {
    return ['On click: sends an SMS OTP to the phone number entered above.']
  }
  if (attrs['data-otp-action'] === 'verify') {
    return ['On click: verifies the OTP with the server and continues the subscription flow.']
  }

  const href = attrs.href || ''
  if (href.startsWith('#')) {
    return [`On click: scroll to section “${href}” on this page.`]
  }
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return [`On click: open website “${href}”.`]
  }
  if (href && href !== '#') {
    return [`On click: go to campaign page “${href.toUpperCase()}”.`]
  }
  return ['On click: no destination configured yet.']
}

export function getFlowElementInfo(attrs: Record<string, string>): FlowElementInfo | null {
  const action = attrs['data-action']
  if (action === 'CHAIN' || attrs['data-actions']) {
    const steps = parseActionSteps(attrs['data-actions'])
    return {
      isSystem: true,
      editableActions: true,
      label: 'Priority Chain CTA',
      description:
        'Runs Sequential Action Chain on click (API checks → pages / flow). This replaces the old Subscribe-only action.',
      onClick: describeClickBehavior(attrs),
      steps,
    }
  }
  if (action === 'SUBSCRIBE') {
    return {
      isSystem: true,
      editableActions: true,
      label: 'Verification flow CTA',
      description:
        'On click: runs HE / OTP routing from Flow Builder mode. Label can be anything — action matters, not the word Subscribe. Optional if Priority Chain already handles navigation.',
      onClick: describeClickBehavior(attrs),
    }
  }
  if (action === 'CONFIRM') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'Confirm button (system)',
      description: 'Completes billing. You can change the label — do not delete this button.',
      onClick: describeClickBehavior(attrs),
    }
  }

  const otpAction = attrs['data-otp-action']
  if (otpAction === 'send') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'Send OTP button (system)',
      description: 'Sends SMS code. Do not delete.',
      onClick: describeClickBehavior(attrs),
    }
  }
  if (otpAction === 'verify') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'Verify OTP button (system)',
      description: 'Verifies the code with server. Do not delete.',
      onClick: describeClickBehavior(attrs),
    }
  }

  const otpField = attrs['data-otp-field']
  if (otpField === 'phone') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'Phone input (system)',
      description: 'Required for OTP flow. Style it freely — do not delete.',
      onClick: ['Not a button — user types their mobile number here.'],
    }
  }
  if (otpField === 'otp') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'OTP input (system)',
      description: 'Where user enters SMS code. Do not delete.',
      onClick: ['Not a button — user types the SMS code here.'],
    }
  }

  if (attrs['data-otp-slot']) {
    return {
      isSystem: true,
      editableActions: false,
      label: `${attrs['data-otp-slot'] === 'error' ? 'Error' : 'Status'} message area (system)`,
      description: 'App shows messages here. Can be invisible but must stay on the page.',
      onClick: ['Not clickable — the app writes status / error text into this area.'],
    }
  }

  if (attrs['data-pack']) {
    return {
      isSystem: true,
      editableActions: false,
      label: `Pack option: ${attrs['data-pack']} (system)`,
      description: 'User picks subscription pack. Do not remove pack buttons.',
      onClick: [`On click: selects the “${attrs['data-pack']}” pack before Confirm.`],
    }
  }

  if (attrs['data-flow-pack-picker'] !== undefined || attrs['data-flow-pack-picker'] === '') {
    return {
      isSystem: true,
      editableActions: false,
      label: 'Pack picker (system)',
      description: 'Contains daily / weekly / monthly options.',
      onClick: ['Container for pack option buttons (daily / weekly / monthly).'],
    }
  }

  return null
}
