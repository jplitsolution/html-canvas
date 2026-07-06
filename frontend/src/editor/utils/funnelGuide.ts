import type { Editor } from 'grapesjs'

export type FunnelPageType = 'HOME' | 'OTP' | 'CONFIRM' | 'THANKYOU' | 'BLOCKED' | 'ERROR'

export interface FunnelRequirement {
  id: string
  label: string
  /** Plain-language explanation for non-technical clients */
  why: string
  /** Substring that must appear in page HTML */
  match: string
}

export interface FunnelPageGuide {
  title: string
  summary: string
  canChange: string[]
  required: FunnelRequirement[]
}

export const FUNNEL_PAGE_GUIDES: Partial<Record<FunnelPageType, FunnelPageGuide>> = {
  HOME: {
    title: 'Subscribe page (Home)',
    summary:
      'User lands here first. When they tap Subscribe, the app talks to the server and moves them to Confirm or OTP.',
    canChange: ['Headlines', 'Colors', 'Images', 'Feature list text', 'Button label (keep the button itself)'],
    required: [
      {
        id: 'subscribe-btn',
        label: 'Subscribe button',
        why: 'Starts the subscription — without it nothing happens when user taps.',
        match: 'data-action="SUBSCRIBE"',
      },
    ],
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
      },
      {
        id: 'send-otp',
        label: 'Get OTP button',
        why: 'Sends SMS code to the server.',
        match: 'data-otp-action="send"',
      },
      {
        id: 'otp-field',
        label: 'OTP code box',
        why: 'User enters the SMS code here.',
        match: 'data-otp-field="otp"',
      },
      {
        id: 'verify-otp',
        label: 'Verify button',
        why: 'Checks the code with the server and continues the flow.',
        match: 'data-otp-action="verify"',
      },
      {
        id: 'error-slot',
        label: 'Error message area',
        why: 'Shows errors like wrong OTP (can be empty but must exist).',
        match: 'data-otp-slot="error"',
      },
      {
        id: 'status-slot',
        label: 'Status message area',
        why: 'Shows “code sent” messages (can be empty but must exist).',
        match: 'data-otp-slot="status"',
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
      },
      {
        id: 'confirm-btn',
        label: 'Confirm button',
        why: 'Completes subscription and charges the user — do not remove.',
        match: 'data-action="CONFIRM"',
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
  const missing = guide.required.filter((req) => !html.includes(req.match))
  return { ok: missing.length === 0, missing, guide }
}

export function getFlowElementInfo(attrs: Record<string, string>): {
  isSystem: boolean
  label: string
  description: string
} | null {
  const action = attrs['data-action']
  if (action === 'SUBSCRIBE') {
    return {
      isSystem: true,
      label: 'Subscribe button (system)',
      description: 'Starts subscription. You can change the text and colors — do not delete this button.',
    }
  }
  if (action === 'CONFIRM') {
    return {
      isSystem: true,
      label: 'Confirm button (system)',
      description: 'Completes billing. You can change the label — do not delete this button.',
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
      label: `Pack option: ${attrs['data-pack']} (system)`,
      description: 'User picks subscription pack. Do not remove pack buttons.',
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
