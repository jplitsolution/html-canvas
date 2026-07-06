/** Parse a CSS length like "16px" or "0" into a number (defaults to 0). */
export function parsePx(value: string | undefined | null): number {
  if (!value || value === 'auto' || value === 'inherit') return 0
  const n = parseFloat(String(value).replace(/px$/i, '').trim())
  return Number.isFinite(n) ? n : 0
}

export interface SpacingBox {
  top: number
  right: number
  bottom: number
  left: number
}

/** Parse margin/padding shorthand into 4 sides (px numbers). */
export function parseSpacing(value: string | undefined | null): SpacingBox {
  if (!value?.trim()) {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  const parts = value.trim().split(/\s+/).map(parsePx)

  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] }
  }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
}

export function formatSpacing(box: SpacingBox): string {
  const { top, right, bottom, left } = box
  if (top === right && right === bottom && bottom === left) {
    return top === 0 ? '0' : `${top}px`
  }
  if (top === bottom && left === right) {
    return `${top}px ${right}px`
  }
  return `${top}px ${right}px ${bottom}px ${left}px`
}

export function nudgeSpacing(box: SpacingBox, side: keyof SpacingBox, delta: number): SpacingBox {
  return {
    ...box,
    [side]: Math.max(0, box[side] + delta),
  }
}

export const CORNER_STEPS = [0, 4, 8, 12, 16, 24, 999]

export function parseCornerIndex(value: string | undefined | null): number {
  const px = parsePx(value)
  if (px >= 900) return CORNER_STEPS.length - 1
  let best = 0
  let bestDiff = Infinity
  CORNER_STEPS.forEach((step, i) => {
    const diff = Math.abs(step - px)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}

export function cornerIndexToCss(index: number): string {
  const i = Math.max(0, Math.min(CORNER_STEPS.length - 1, index))
  const v = CORNER_STEPS[i]
  return v >= 900 ? '999px' : `${v}px`
}

export function cornerLabel(index: number): string {
  const labels = ['Square', 'Slightly round', 'Round', 'More round', 'Very round', 'Extra round', 'Pill shape']
  return labels[Math.max(0, Math.min(labels.length - 1, index))] ?? 'Round'
}

export const TEXT_SIZE_STEPS = [14, 16, 18, 20, 24, 28, 32, 40, 48]

export function parseTextSizeIndex(value: string | undefined | null): number {
  const px = parsePx(value) || 16
  let best = 1
  let bestDiff = Infinity
  TEXT_SIZE_STEPS.forEach((step, i) => {
    const diff = Math.abs(step - px)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}

export function textSizeIndexToCss(index: number): string {
  const i = Math.max(0, Math.min(TEXT_SIZE_STEPS.length - 1, index))
  return `${TEXT_SIZE_STEPS[i]}px`
}

export const NUDGE_STEP = 8
