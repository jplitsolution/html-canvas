import { resolveBlockStyles } from '../utils/responsiveStyles'
import { appendBackgroundImageCss } from '../utils/backgroundStyles'

export function styleToString(styles, device = 'desktop') {
  const resolved = resolveBlockStyles(styles, device)
  const { backgroundImage, ...rest } = resolved
  const styled = appendBackgroundImageCss(rest, backgroundImage)
  return Object.entries(styled)
    .filter(([, v]) => v !== undefined && v !== 'auto' && v !== 'transparent')
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase()
      const val = typeof v === 'number' && !['fontWeight'].includes(k) ? `${v}px` : v
      return `${prop}:${val}`
    })
    .join(';')
}

export function renderLinks(links = []) {
  return links.map((l) =>
    `<a href="${l.url}" style="color:inherit;text-decoration:none;margin:0 12px">${l.label}</a>`
  ).join('')
}
