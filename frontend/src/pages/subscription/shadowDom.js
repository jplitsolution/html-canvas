import { healLiveHotspots } from '../../editor/utils/overlayStacking'
import { healLiveFlowButtons } from '../../editor/utils/textSizeAlign'
import {
  FLOW_RUNTIME_CSS,
  flowRuntimeStylesheetLinks,
} from '../../editor/services/flowRuntimeCss'
import { sanitizeSavedPageHtml } from '../../editor/services/wysiwygContract'
import { pickLivePageData, isMobileViewport } from '../../editor/services/deviceLayouts'
import { normalizePack } from './flowHelpers'

/**
 * Mount a saved campaign page into the live funnel shadow root.
 * Uses the same FLOW_RUNTIME_CSS + font/icon links as the GrapesJS canvas
 * (minus editor-only chrome) so Save → Preview matches the builder.
 */
function mountPageInShadow(shadow, pageData, options = {}) {
  const mobile =
    options.mobile != null ? options.mobile : isMobileViewport()
  pageData = pickLivePageData(pageData, mobile) || pageData
  const { customWidth, customHeight } = pageData.projectData || {}

  let inlineStyles = ''
  if (customWidth) {
    // Keep authored canvas width, but cap to the viewport so phone/tablet do not
    // left-align an overflowing fixed box (margin:auto cannot center when wider
    // than the host). min() beats FLOW_HOST_CSS max-width:100% via !important.
    inlineStyles += `width: ${customWidth}px !important; max-width: min(100%, ${customWidth}px) !important; `
  }
  if (customHeight) {
    // Editor canvas height is a frame, not a crop. Live must grow with the image.
    inlineStyles += `min-height: ${customHeight}px !important; position: relative; `
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
    <style>
      /* Grapes canvas frame CSS is injected above — do not let it crop the live image. */
      .flow-page-inner, .flow-page-inner > *, .page-wrapper,
      [data-tc-type="image-banner"] {
        height: auto !important;
        max-height: none !important;
        overflow-x: hidden !important;
        overflow-y: visible !important;
      }
      .flow-page-inner img, [data-tc-type="image-banner"] > img {
        height: auto !important;
        max-height: none !important;
        object-fit: contain !important;
      }
    </style>
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
