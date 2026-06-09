import { normalizeStyles } from '../schemas/block.schema'
import { appendBackgroundImageCss } from './backgroundStyles'

const DEVICES = ['desktop', 'tablet', 'mobile']
const DEVICE_ORDER = { desktop: 0, tablet: 1, mobile: 2 }

export function resolveBlockStyles(styles, device = 'desktop') {
  const normalized = normalizeStyles(styles)
  const targetIdx = DEVICE_ORDER[device] ?? 0
  let resolved = { ...normalized.desktop }

  for (let i = 1; i <= targetIdx; i++) {
    const dev = DEVICES[i]
    resolved = { ...resolved, ...normalized[dev] }
  }

  return resolved
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
