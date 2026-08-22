import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  sanitizeSavedPageHtml,
  WYSIWYG_INVARIANTS,
} from '../../src/editor/services/wysiwygContract'
import { FLOW_RUNTIME_CSS, FLOW_HOST_CSS, RESPONSIVE_STYLE_RULES } from '../../src/editor/services/flowRuntimeCss'
import { healLiveFlowButtons } from '../../src/editor/utils/textSizeAlign'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

describe('WYSIWYG contract — sanitizeSavedPageHtml', () => {
  it('strips absolute px geometry from OTP verify without data-tc-absolute', () => {
    const html = `
      <div class="page-wrapper" style="position:relative">
        <button data-otp-action="send" class="flow-btn" style="position:relative;width:100%">Get OTP</button>
        <button data-otp-action="verify" class="flow-btn"
          style="position:absolute;left:311px;top:509px;width:187px;z-index:40">Verify &amp; Continue</button>
      </div>`
    const out = sanitizeSavedPageHtml(html)
    expect(out).not.toMatch(/data-otp-action="verify"[^>]*position:\s*absolute/i)
    expect(out).toMatch(/data-otp-action="verify"[^>]*position:\s*relative/i)
    expect(out).not.toMatch(/left:\s*311px/i)
  })

  it('preserves real image overlays marked data-tc-absolute', () => {
    const html = `
      <button data-action="SUBSCRIBE" data-tc-absolute="1" class="flow-btn"
        style="position:absolute;top:40%;left:25%">Subscribe</button>`
    const out = sanitizeSavedPageHtml(html)
    expect(out).toMatch(/position:\s*absolute/i)
    expect(out).toMatch(/top:\s*40%/i)
  })

  it('preserves hotspots', () => {
    const html = `<a data-tc-type="hotspot" data-action="SUBSCRIBE" href="#"
      style="position:absolute;top:50%;left:20%;width:40%;height:12%"></a>`
    const out = sanitizeSavedPageHtml(html)
    expect(out).toMatch(/position:\s*absolute/i)
  })

  it('strips accidental absolute geometry from .home-card (keeps flex centering)', () => {
    const html = `
      <div class="home-page">
        <div class="home-card" style="left:0px;top:28px;position:absolute;width:420px;height:280px">
          <p>ORANGE</p>
        </div>
      </div>`
    const out = sanitizeSavedPageHtml(html)
    expect(out).not.toMatch(/home-card[^>]*position:\s*absolute/i)
    expect(out).toMatch(/home-card[^>]*position:\s*relative/i)
    expect(out).not.toMatch(/left:\s*0px/i)
  })

  it('preserves home-card marked data-tc-absolute', () => {
    const html = `<div class="home-card" data-tc-absolute="1"
      style="position:absolute;left:10px;top:20px;width:200px">Card</div>`
    const out = sanitizeSavedPageHtml(html)
    expect(out).toMatch(/position:\s*absolute/i)
    expect(out).toMatch(/left:\s*10px/i)
  })
})

describe('WYSIWYG contract — healLiveFlowButtons', () => {
  it('heals stray absolute verify button in a document fragment', () => {
    const rootEl = document.createElement('div')
    rootEl.innerHTML = `
      <button data-otp-action="verify" class="flow-btn"
        style="position:absolute;left:10px;top:20px">Verify</button>`
    const n = healLiveFlowButtons(rootEl)
    expect(n).toBeGreaterThanOrEqual(1)
    const btn = rootEl.querySelector('[data-otp-action="verify"]')
    expect(btn.style.position).toBe('relative')
    expect(btn.style.left).toBe('')
  })
})

describe('WYSIWYG contract — CSS + wiring invariants (CI)', () => {
  it('never forces .flow-page-inner { width: 100% !important }', () => {
    expect(FLOW_RUNTIME_CSS).not.toMatch(WYSIWYG_INVARIANTS.forbiddenFlowPageInnerWidthImportant)
    expect(FLOW_HOST_CSS).not.toMatch(WYSIWYG_INVARIANTS.forbiddenFlowPageInnerWidthImportant)
    expect(RESPONSIVE_STYLE_RULES).not.toMatch(WYSIWYG_INVARIANTS.forbiddenFlowPageInnerWidthImportant)
  })

  it('live shadow mounts FLOW_RUNTIME_CSS + heals + sanitizes', () => {
    const src = read('src/pages/subscription/shadowDom.js')
    expect(src).toContain('FLOW_RUNTIME_CSS')
    expect(src).toContain(WYSIWYG_INVARIANTS.liveMustHealFlowButtons)
    expect(src).toContain(WYSIWYG_INVARIANTS.snapshotMustSanitize)
  })

  it('save heals flow buttons and snapshot sanitizes HTML', () => {
    const save = read('src/editor/services/saveCampaignPage.js')
    const snap = read('src/editor/services/exportSite.js')
    expect(save).toContain(WYSIWYG_INVARIANTS.saveMustHealFlowButtons)
    expect(snap).toContain(WYSIWYG_INVARIANTS.snapshotMustSanitize)
  })

  it('canvas injects shared FLOW_HOST_CSS + RESPONSIVE from flowRuntimeCss', () => {
    const src = read('src/editor/plugins/canvasEnhancements.js')
    expect(src).toContain('FLOW_HOST_CSS')
    expect(src).toContain('RESPONSIVE_STYLE_RULES')
    expect(src).toContain('flowRuntimeCss')
  })

  it('FLOW_RUNTIME_CSS includes host + responsive + text-size pieces', () => {
    expect(FLOW_RUNTIME_CSS).toContain('.page-wrapper')
    expect(FLOW_RUNTIME_CSS).toContain('tc-nav-hamburger')
    expect(FLOW_RUNTIME_CSS).toContain('flow-btn')
  })

  it('does not force flow-btn width:100%!important (blocks editor horizontal shrink)', () => {
    // Negative lookbehind avoids matching max-width:100%!important in the CTA rule.
    expect(RESPONSIVE_STYLE_RULES).not.toMatch(
      /\.flow-btn[^{]*\{[^}]*(?<!max-)width\s*:\s*100%\s*!important/is,
    )
    expect(RESPONSIVE_STYLE_RULES).not.toMatch(
      /button\.flow-btn[^{]*\{[^}]*(?<!max-)width\s*:\s*100%\s*!important/is,
    )
  })

  it('keeps template cards in-flow (not absolute) unless data-tc-absolute', () => {
    expect(FLOW_HOST_CSS).toMatch(/\.home-card:not\(\[data-tc-absolute="1"\]\)/)
    expect(FLOW_HOST_CSS).toMatch(/position:\s*relative\s*!important/)
    expect(FLOW_HOST_CSS).toMatch(/left:\s*auto\s*!important/)
  })

  it('live mount caps customWidth with min(100%, …) for small viewports', () => {
    const src = read('src/pages/subscription/shadowDom.js')
    expect(src).toMatch(/width:\s*100%\s*!important/)
    expect(src).toMatch(/max-width:\s*min\(100%,\s*\$\{customWidth\}px\)/)
  })
})
