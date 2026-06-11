import { normalizeStyles } from '../schemas/block.schema'
import { appendBackgroundImageCss } from './backgroundStyles'

const DEVICES = ['desktop', 'tablet', 'mobile']
const DEVICE_ORDER = { desktop: 0, tablet: 1, mobile: 2 }
const PADDING_KEYS = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']
const DEVICE_PADDING_SCALE = { tablet: 0.75, mobile: 0.55 }
const MIN_PADDING = 12

function applyImplicitDeviceStyles(resolved, normalized, device) {
  if (device === 'desktop') return resolved

  const scale = DEVICE_PADDING_SCALE[device]
  if (!scale) return resolved

  const overrides = normalized[device] || {}
  const next = { ...resolved }

  for (const key of PADDING_KEYS) {
    if (!(key in overrides) || overrides[key] === undefined) {
      next[key] = Math.max(MIN_PADDING, Math.round((resolved[key] || 16) * scale))
    }
  }

  if (device === 'mobile') {
    if (!('paddingTop' in overrides)) next.paddingTop = Math.min(next.paddingTop, 40)
    if (!('paddingBottom' in overrides)) next.paddingBottom = Math.min(next.paddingBottom, 40)
    if (!('paddingLeft' in overrides)) next.paddingLeft = Math.min(next.paddingLeft, 20)
    if (!('paddingRight' in overrides)) next.paddingRight = Math.min(next.paddingRight, 20)
  }

  return next
}

export function resolveBlockStyles(styles, device = 'desktop') {
  const normalized = normalizeStyles(styles)
  const targetIdx = DEVICE_ORDER[device] ?? 0
  let resolved = { ...normalized.desktop }

  for (let i = 1; i <= targetIdx; i++) {
    const dev = DEVICES[i]
    resolved = { ...resolved, ...normalized[dev] }
  }

  return applyImplicitDeviceStyles(resolved, normalized, device)
}

export function getStyleOverrides(styles, device) {
  const normalized = normalizeStyles(styles)
  return normalized[device] || {}
}

export function isStyleInherited(styles, device, key) {
  const overrides = getStyleOverrides(styles, device)
  return !(key in overrides) || overrides[key] === undefined
}

export function getResolvedStyleObject(styles, device = 'desktop') {
  const resolved = resolveBlockStyles(styles, device)
  return appendBackgroundImageCss({
    color: resolved.color,
    backgroundColor: resolved.backgroundColor,
    fontSize: resolved.fontSize,
    fontWeight: resolved.fontWeight,
    textAlign: resolved.textAlign,
    paddingTop: `${resolved.paddingTop}px`,
    paddingBottom: `${resolved.paddingBottom}px`,
    paddingLeft: `${resolved.paddingLeft}px`,
    paddingRight: `${resolved.paddingRight}px`,
    marginTop: `${resolved.marginTop}px`,
    marginBottom: `${resolved.marginBottom}px`,
    borderRadius: `${resolved.borderRadius}px`,
    borderWidth: `${resolved.borderWidth}px`,
    borderStyle: resolved.borderStyle,
    borderColor: resolved.borderColor,
    width: resolved.width,
    height: resolved.height,
  }, resolved.backgroundImage)
}
