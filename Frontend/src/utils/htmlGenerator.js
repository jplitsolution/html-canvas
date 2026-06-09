import { getRootBlocks, getChildBlocks } from './blockUtils'
import { getBlockHTMLGenerator } from '../registry/index'
import { styleToString } from '../registry/htmlRenderers'
import { escapeHtml } from '../blocks/shared/blockHtml'

function renderBlock(block, layout, device = 'desktop') {
  if (!block?.type) return ''

  if (block.type === 'container') {
    const children = getChildBlocks(layout, block.id)
    const cols = block.content?.columns || 2
    const s = styleToString(block.styles, device)
    const childrenHtml = children.map((c) => renderBlock(c, layout, device)).join('')
    return `<div style="${s};display:grid;grid-template-columns:repeat(${cols},1fr);gap:16px;width:100%">${childrenHtml}</div>`
  }

  const generator = getBlockHTMLGenerator(block.type)
  if (!generator) return ''
  const s = styleToString(block.styles, device)
  return generator(block, s)
}

export function generateHTML(layout, title = 'My Website', device = 'desktop') {
  if (!Array.isArray(layout) || layout.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; color:#64748b; }
  </style>
</head>
<body><p>No content yet. Add blocks in TemplateCraft and export again.</p></body>
</html>`
  }

  const roots = getRootBlocks(layout)
  const body = roots.map((b) => renderBlock(b, layout, device)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      min-height: 100vh;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; }
    @media (max-width: 768px) {
      h1 { font-size: 2rem !important; }
      nav { flex-direction: column !important; gap: 12px !important; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`
}

function sanitizeFilename(str) {
  return (str || 'export').replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

export function downloadHTML(layout, title, device = 'desktop') {
  const html = generateHTML(layout, title, device)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(title)}.html`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 200)
}
