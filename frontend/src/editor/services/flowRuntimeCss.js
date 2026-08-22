/**
 * Shared WYSIWYG runtime CSS for campaign pages.
 *
 * Contract: canvas iframe (non-editor chrome) and live SubscriptionPage shadow DOM
 * must inject the SAME rules so Save → Preview matches what operators see while editing.
 * Editor-only chrome (hover outlines, hotspot dashed borders) stays OUT of this file.
 *
 * Guardrails: frontend/src/editor/services/wysiwygContract.js
 * CI: tests/unit/wysiwygContract.test.js
 * Cursor rule: .cursor/rules/canvas-preview-wysiwyg.mdc
 */
import { OVERLAY_STACKING_CSS } from '../utils/overlayStacking'
import { TEXT_SIZE_ALIGN_CANVAS_CSS } from '../utils/textSizeAlign'

/** Fonts / icons loaded into both GrapesJS canvas and live shadow root. */
export const FLOW_RUNTIME_STYLESHEET_HREFS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
]

export const RESPONSIVE_STYLE_RULES = `
/* ── Global overflow prevention ──────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box !important;
}
html, body, :host {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  scroll-behavior: smooth !important;
}
/* .flow-page-inner intentionally omitted — customWidth inline must win in Preview */
.flow-page-inner {
  overflow-x: hidden !important;
  scroll-behavior: smooth !important;
}
img, video, iframe, embed, object {
  max-width: 100% !important;
  height: auto !important;
}

/* ── Mobile breakpoint (≤ 767px) ─────────────────────────────── */
@media (max-width: 767px) {
  /* Do not hammer every div — overflow-x:hidden on a collapsing wrapper
     computes overflow-y to auto and clips the campaign image. */
  header, nav, section, footer, main, article, aside {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .page-wrapper,
  [data-tc-type="image-banner"] {
    overflow: visible !important;
    max-width: 100% !important;
  }
  [data-tc-type="image-banner"] img,
  .page-wrapper > img {
    overflow: visible !important;
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    visibility: visible !important;
  }

  /* Hamburger button — show on mobile */
  .tc-nav-hamburger {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    font-size: 24px !important;
    user-select: none !important;
    color: #0f172a !important;
    padding: 4px !important;
    z-index: 100 !important;
  }

  /* Header: flex-wrap so logo + hamburger sit on one row */
  header, [data-tc-type="section"] > header {
    position: relative !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 12px 16px !important;
    gap: 0 !important;
  }

  /* Desktop nav — hidden until hamburger toggled.
     Use maximum specificity to override GrapesJS inline style="display:flex" */
  header nav,
  header > nav,
  header nav[style],
  header > nav[style] {
    display: none !important;
    flex-direction: column !important;
    width: 100% !important;
    order: 3 !important;
    background: #ffffff !important;
    padding: 12px 16px !important;
    border-top: 1px solid #e2e8f0 !important;
    gap: 8px !important;
    align-items: stretch !important;
  }
  header nav a,
  header > nav a {
    width: 100% !important;
    text-align: center !important;
    padding: 10px 16px !important;
    display: block !important;
    white-space: normal !important;
    word-break: break-word !important;
  }

  /* CSS-checkbox hamburger toggle — works with any unique id via class */
  .tc-nav-toggle:checked ~ nav,
  .tc-nav-toggle:checked ~ nav[style] {
    display: flex !important;
  }

  /* Sections — comfortable mobile padding, prevent side overflow */
  [data-tc-type="section"],
  section, footer {
    padding: 32px 16px !important;
    width: 100% !important;
  }

  /* Flex rows → vertical stacks on mobile */
  section > div[style*="display:flex"],
  section > div[style*="display: flex"],
  header + section > div[style*="flex"] {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  /* Flex children: take full width */
  section > div > div[style*="flex:1"],
  section > div > div[style*="flex: 1"] {
    min-width: 0 !important;
    width: 100% !important;
  }

  /* Hero columns: stack image below text */
  section[style*="display:flex"],
  section[style*="display: flex"] {
    flex-direction: column !important;
    gap: 24px !important;
  }

  /* Pricing cards: full width */
  section div[style*="min-width:260px"],
  section div[style*="min-width: 260px"],
  section div[style*="min-width:240px"],
  section div[style*="min-width: 240px"] {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* CTA buttons: flex-center + no overflow (skip absolute image overlays).
     Do NOT use width:100%!important — that overrides author/editor px widths
     and makes horizontal shrink impossible in the canvas (inline loses to !important).
     Templates already set .flow-btn { width:100% }; custom inline width must win. */
  a[data-tc-type="button"]:not([data-tc-absolute="1"]),
  a[style*="padding:14px"]:not([data-tc-absolute="1"]),
  a[style*="padding: 14px"]:not([data-tc-absolute="1"]),
  button.flow-btn:not([data-tc-absolute="1"]),
  .flow-btn:not([data-tc-absolute="1"]) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    max-width: 100% !important;
    text-align: center !important;
    box-sizing: border-box !important;
    white-space: normal !important;
    word-break: break-word !important;
    line-height: 1.25 !important;
  }

  /* Grid columns: single column on mobile */
  div[style*="grid-template-columns:repeat(auto-fit"],
  div[style*="grid-template-columns: repeat(auto-fit"] {
    grid-template-columns: 1fr !important;
  }

  /* Typography scale down */
  h1 { font-size: clamp(24px, 8vw, 32px) !important; }
  h2 { font-size: clamp(20px, 6vw, 26px) !important; }
}

/* ── Tablet breakpoint (768px – 1023px) ──────────────────────── */
@media (min-width: 768px) and (max-width: 1023px) {
  header, [data-tc-type="section"] > header {
    padding: 16px 20px !important;
  }
  header nav {
    gap: 16px !important;
  }
  section {
    padding: 48px 24px !important;
  }
}
`

/**
 * Host chrome for live shadow + shared with canvas runtime (not editor outlines).
 * Deliberately does NOT force display:flex on .page-wrapper / first child —
 * that rewrote author layouts and caused canvas≠preview mismatch.
 */
export const FLOW_HOST_CSS = `
  :host {
    display: block;
    width: 100%;
    min-height: 100vh;
  }
  /* Do NOT force width/max-width:!important here — customWidth inline on #wrapper
     must win so Save→Preview keeps the canvas frame size (1200×800 etc.).
     Preview sets max-width:min(100%, customWidth) so phone/tablet never left-pin
     an overflowing fixed canvas (margin:auto cannot center when width > viewport). */
  .flow-page-inner {
    display: block;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    opacity: 1;
    min-height: 100vh;
    height: auto !important;
    max-height: none !important;
    overflow-x: hidden;
    overflow-y: visible !important;
    box-sizing: border-box;
  }
  .flow-page-inner > * {
    max-width: 100%;
    min-width: 0;
  }
  .page-wrapper {
    min-height: 100vh;
    height: auto !important;
    width: 100%;
    position: relative;
    box-sizing: border-box;
    overflow: visible !important;
  }
  /* Grapes absolute-drag leaves left/top on template cards, which removes them from
     .home-page / .otp-container flex centering → card stuck to one side on large
     screens (and asymmetric inside customWidth frames). Real freeform overlays must
     use data-tc-absolute="1". Do NOT force display:flex on .page-wrapper. */
  .home-card:not([data-tc-absolute="1"]),
  .otp-card:not([data-tc-absolute="1"]),
  .confirm-card:not([data-tc-absolute="1"]) {
    position: relative !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    bottom: auto !important;
    height: auto !important;
    margin-left: auto;
    margin-right: auto;
  }
  .flow-pack-option.flow-pack-selected {
    border-color: #7c4dff !important;
    background: #f5f3ff !important;
    box-shadow: 0 0 0 1px #7c4dff;
  }
  /* Keep resized button/text labels centered (matches editor) */
  button, a[data-tc-type="button"], .flow-btn {
    box-sizing: border-box;
  }
  button[style*="height"]:not([data-tc-absolute="1"]),
  a[data-tc-type="button"][style*="height"]:not([data-tc-absolute="1"]),
  .flow-btn[style*="height"]:not([data-tc-absolute="1"]) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1.25 !important;
  }
`

/** Full runtime bundle for live shadow DOM and HTML export documents. */
export const FLOW_RUNTIME_CSS = `
${FLOW_HOST_CSS}
${OVERLAY_STACKING_CSS}
${TEXT_SIZE_ALIGN_CANVAS_CSS}
${RESPONSIVE_STYLE_RULES}
`

/** <link> tags for shadow mount / static HTML head. */
export function flowRuntimeStylesheetLinks() {
  return FLOW_RUNTIME_STYLESHEET_HREFS.map(
    (href) => `<link rel="stylesheet" href="${href}" crossorigin="anonymous">`,
  ).join('\n')
}
