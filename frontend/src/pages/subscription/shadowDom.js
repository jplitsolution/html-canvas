import { healLiveHotspots } from '../../editor/utils/overlayStacking'
import { healLiveFlowButtons } from '../../editor/utils/textSizeAlign'
import {
  FLOW_RUNTIME_CSS,
  flowRuntimeStylesheetLinks,
} from '../../editor/services/flowRuntimeCss'
import { sanitizeSavedPageHtml } from '../../editor/services/wysiwygContract'
import { normalizePack } from './flowHelpers'

/**
 * Mount a saved campaign page into the live funnel shadow root.
 * Uses the same FLOW_RUNTIME_CSS + font/icon links as the GrapesJS canvas
 * (minus editor-only chrome) so Save → Preview matches the builder.
 */
function mountPageInShadow(shadow, pageData) {
  const { customWidth, customHeight } = pageData.projectData || {}

  let inlineStyles = ''
  if (customWidth) {
    // Use !important so FLOW_HOST_CSS width:100% cannot blow custom canvas size
    inlineStyles += `width: ${customWidth}px !important; max-width: ${customWidth}px !important; `
  }
  if (customHeight) {
    inlineStyles += `height: ${customHeight}px !important; min-height: ${customHeight}px !important; overflow: hidden; position: relative; `
  }

  // Transform <body> tag to <div> to avoid invalid nested <body> inside Shadow DOM,
  // which browser parsers often collapse or strip.
  let cleanedHtml = pageData.html || ''
  if (cleanedHtml.trim().toLowerCase().startsWith('<body')) {
    cleanedHtml = cleanedHtml.replace(/^<body/i, '<div').replace(/<\/body>$/i, '</div>')
  }
  // WYSIWYG: strip accidental absolute CTAs from older saves before paint
  cleanedHtml = sanitizeSavedPageHtml(cleanedHtml)

  const cleanCss = (pageData.css || '').replace(/#wrapper\s*/gi, '')

  shadow.innerHTML = `
    ${flowRuntimeStylesheetLinks()}
    <style>${FLOW_RUNTIME_CSS}</style>
    <style>${cleanCss}</style>
    <div class="flow-page-inner" id="wrapper" style="${inlineStyles}">${cleanedHtml}</div>
  `

  // Bad editor saves: missing data-action, px boxes, cursor:move — repair for clicks
  healLiveHotspots(shadow, pageData.pageType)
  // Accidental absolute CTAs (no data-tc-absolute) break card layout in Preview
  healLiveFlowButtons(shadow)
  // Re-run after images give the container real height (first pass can see 0-height parents)
  const imgs = shadow.querySelectorAll('img')
  if (imgs.length) {
    let left = imgs.length
    const redo = () => {
      left -= 1
      if (left <= 0) {
        healLiveHotspots(shadow, pageData.pageType)
        healLiveFlowButtons(shadow)
      }
    }
    imgs.forEach((img) => {
      if (img.complete) redo()
      else {
        img.addEventListener('load', redo, { once: true })
        img.addEventListener('error', redo, { once: true })
      }
    })
  } else {
    requestAnimationFrame(() => {
      healLiveHotspots(shadow, pageData.pageType)
      healLiveFlowButtons(shadow)
    })
  }
}

function syncPackPicker(shadow, selectedPack) {
  shadow.querySelectorAll('[data-pack]').forEach((el) => {
    const isSelected = el.getAttribute('data-pack') === selectedPack
    el.classList.toggle('flow-pack-selected', isSelected)
  })
}

/** Fill empty {{phone}} slots on CONFIRM / thank-you style pages. */
function syncPhoneDisplay(shadow, phone) {
  if (!shadow || !phone) return
  shadow.querySelectorAll('.flow-info-value').forEach((el) => {
    const text = (el.textContent || '').trim()
    if (!text || text === '{{phone}}') {
      el.textContent = phone
    }
  })
}

function getSelectedPackFromShadow(shadow) {
  const selected = shadow.querySelector('[data-pack].flow-pack-selected')
  return normalizePack(selected?.getAttribute('data-pack'))
}

export {
  mountPageInShadow,
  syncPackPicker,
  syncPhoneDisplay,
  getSelectedPackFromShadow,
}
