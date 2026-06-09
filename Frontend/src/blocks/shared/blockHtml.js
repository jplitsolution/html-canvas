import { blockTokens } from './blockTokens'
import { getButtonUrlList, buildButtonClickScript } from '../../utils/buttonLinks'

export function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderLinksHtml(links = []) {
  return links.map((l) =>
    `<a href="${escapeHtml(l.url)}" style="color:inherit;text-decoration:none;margin:0 12px">${escapeHtml(l.label)}</a>`
  ).join('')
}

const t = blockTokens

export const blockHtmlGenerators = {
  navbar: (block, s) => {
    const { logoText, buttonText, buttonLink, links } = block.content || {}
    return `<nav style="${s};display:flex;align-items:center;justify-content:space-between;width:100%">
      <div style="font-weight:700;font-size:1.25rem;color:inherit">${escapeHtml(logoText)}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        ${renderLinksHtml(links)}
        ${buttonText ? `<a href="${escapeHtml(buttonLink)}" style="background:${t.primary};color:${t.surface};padding:8px 20px;border-radius:${t.radius.sm};text-decoration:none;margin-left:16px">${escapeHtml(buttonText)}</a>` : ''}
      </div>
    </nav>`
  },

  header: (block, s) => {
    const { title, subtitle } = block.content || {}
    return `<header style="${s};text-align:center;width:100%">
      <h1 style="font-size:2.5rem;font-weight:700;margin:0 0 8px;color:inherit">${escapeHtml(title)}</h1>
      <p style="font-size:1.125rem;opacity:0.8;margin:0;color:inherit">${escapeHtml(subtitle)}</p>
    </header>`
  },

  hero: (block, s) => {
    const { title, subtitle, buttonText, buttonLink, imageUrl } = block.content || {}
    return `<section style="${s};text-align:center;width:100%">
      <h1 style="font-size:3rem;font-weight:800;margin:0 0 16px;color:inherit">${escapeHtml(title)}</h1>
      <p style="font-size:1.25rem;opacity:0.9;margin:0 0 32px;color:inherit">${escapeHtml(subtitle)}</p>
      ${buttonText ? `<a href="${escapeHtml(buttonLink)}" style="display:inline-block;background:${t.surface};color:${t.primary};padding:12px 32px;border-radius:${t.radius.md};text-decoration:none;font-weight:600">${escapeHtml(buttonText)}</a>` : ''}
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" style="max-width:100%;margin-top:40px;border-radius:${t.radius.lg};display:block;margin-left:auto;margin-right:auto" />` : ''}
    </section>`
  },

  text: (block, s) =>
    `<div style="${s};width:100%"><p style="margin:0;line-height:1.7;color:inherit">${escapeHtml(block.content?.text)}</p></div>`,

  button: (block, s) => {
    const { buttonText } = block.content || {}
    const urls = getButtonUrlList(block.content)
    const primaryUrl = urls[0] || '#'
    const clickScript = buildButtonClickScript(urls)
    const onclickAttr = clickScript ? ` onclick="${clickScript}"` : ''
    return `<div style="${s};text-align:center;width:100%">
      <a href="${escapeHtml(primaryUrl)}"${onclickAttr} style="display:inline-block;background:${t.primary};color:${t.surface};padding:12px 32px;border-radius:${t.radius.md};text-decoration:none;font-weight:600">${escapeHtml(buttonText)}</a>
    </div>`
  },

  image: (block, s) => {
    const { imageUrl, altText, caption } = block.content || {}
    return `<figure style="${s};text-align:center;width:100%">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText || '')}" style="max-width:100%;border-radius:${t.radius.md};display:block;margin:0 auto" />` : ''}
      ${caption ? `<figcaption style="margin-top:8px;font-size:0.875rem;opacity:0.7;color:inherit">${escapeHtml(caption)}</figcaption>` : ''}
    </figure>`
  },

  card: (block, s) => {
    const { title, bodyText, imageUrl } = block.content || {}
    return `<div style="${s};width:100%">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;border-radius:${t.radius.md};margin-bottom:16px;display:block" />` : ''}
      <h3 style="font-size:1.25rem;font-weight:600;margin:0 0 8px;color:inherit">${escapeHtml(title)}</h3>
      <p style="margin:0;line-height:1.6;opacity:0.8;color:inherit">${escapeHtml(bodyText)}</p>
    </div>`
  },

  form: (block, s) => {
    const { title, buttonText, fields } = block.content || {}
    const fieldsHtml = (fields || []).map((f) => {
      if (f.type === 'textarea') {
        return `<div style="margin-bottom:16px"><label style="display:block;margin-bottom:4px;font-weight:500;color:inherit">${escapeHtml(f.label)}</label><textarea style="width:100%;padding:10px;border:1px solid ${t.border};border-radius:${t.radius.sm};box-sizing:border-box" rows="4"></textarea></div>`
      }
      return `<div style="margin-bottom:16px"><label style="display:block;margin-bottom:4px;font-weight:500;color:inherit">${escapeHtml(f.label)}</label><input type="${escapeHtml(f.type)}" style="width:100%;padding:10px;border:1px solid ${t.border};border-radius:${t.radius.sm};box-sizing:border-box" /></div>`
    }).join('')
    return `<form style="${s};max-width:480px;margin:0 auto;width:100%">
      <h2 style="font-size:1.5rem;font-weight:600;margin:0 0 24px;text-align:center;color:inherit">${escapeHtml(title)}</h2>
      ${fieldsHtml}
      <button type="button" style="width:100%;background:${t.primary};color:${t.surface};padding:12px;border:none;border-radius:${t.radius.md};font-weight:600;cursor:pointer">${escapeHtml(buttonText)}</button>
    </form>`
  },

  divider: (block, s) =>
    `<hr style="border:none;border-top:1px solid ${t.border};margin:0;width:100%;${s}" />`,

  footer: (block, s) => {
    const { footerText, links } = block.content || {}
    return `<footer style="${s};text-align:center;width:100%">
      <p style="margin:0 0 8px;color:inherit">${escapeHtml(footerText)}</p>
      <div>${renderLinksHtml(links)}</div>
    </footer>`
  },
}
