import { describe, it, expect, vi } from 'vitest'
import {
  wasIntentionallyAbsolute,
  keepFlowButtonInFlow,
  isFlowLayoutButton,
} from '../../src/editor/utils/textSizeAlign'
import { healEditorHotspot } from '../../src/editor/utils/overlayStacking'

function mockComponent({ attrs = {}, style = {}, tag = 'button' } = {}) {
  let currentStyle = { ...style }
  let currentAttrs = { ...attrs }
  return {
    getAttributes: () => ({ ...currentAttrs }),
    getStyle: () => ({ ...currentStyle }),
    get: (key) => (key === 'tagName' ? tag : key === 'type' ? '' : undefined),
    getEl: () => null,
    setStyle: vi.fn((next) => {
      currentStyle = { ...next }
    }),
    addStyle: vi.fn((patch) => {
      currentStyle = { ...currentStyle, ...patch }
    }),
    addAttributes: vi.fn((patch) => {
      currentAttrs = { ...currentAttrs, ...patch }
    }),
    set: vi.fn(),
  }
}

describe('wasIntentionallyAbsolute / keepFlowButtonInFlow (canvas drag)', () => {
  it('treats absolute+top/left as intentional Canva placement (CHAIN button)', () => {
    const cmp = mockComponent({
      attrs: { 'data-action': 'CHAIN' },
      style: { position: 'absolute', top: '40%', left: '25%', width: 'auto' },
    })
    expect(isFlowLayoutButton(cmp)).toBe(true)
    expect(wasIntentionallyAbsolute(cmp)).toBe(true)
  })

  it('does not snap absolute CHAIN button back to relative after drag', () => {
    const cmp = mockComponent({
      attrs: { 'data-action': 'CHAIN' },
      style: { position: 'absolute', top: '12%', left: '30%' },
    })
    keepFlowButtonInFlow(cmp)
    expect(cmp.setStyle).not.toHaveBeenCalled()
    expect(cmp.getStyle().position).toBe('absolute')
    expect(cmp.getStyle().top).toBe('12%')
  })

  it('still heals in-flow SUBSCRIBE buttons without absolute placement', () => {
    const cmp = mockComponent({
      attrs: { 'data-action': 'SUBSCRIBE', class: 'flow-btn' },
      style: { position: 'relative', width: '100%' },
    })
    expect(wasIntentionallyAbsolute(cmp)).toBe(false)
    keepFlowButtonInFlow(cmp)
    expect(cmp.setStyle).toHaveBeenCalled()
    const next = cmp.setStyle.mock.calls[0][0]
    expect(next.position).toBe('relative')
    expect(next.width).toBe('100%')
  })

  it('respects data-tc-absolute overlay flag', () => {
    const cmp = mockComponent({
      attrs: { 'data-action': 'SUBSCRIBE', 'data-tc-absolute': '1' },
      style: { position: 'absolute', top: '50%', left: '10%' },
    })
    expect(wasIntentionallyAbsolute(cmp)).toBe(true)
    keepFlowButtonInFlow(cmp)
    expect(cmp.setStyle).not.toHaveBeenCalled()
  })
})

describe('healEditorHotspot grab/drag', () => {
  it('keeps HTML5 draggable=true so Grapes dragstart → tlb-move works', () => {
    const el = {
      style: {
        left: '10%',
        top: '70%',
        width: '30%',
        height: '12%',
        position: 'absolute',
      },
      getAttribute: vi.fn(() => null),
      setAttribute: vi.fn(),
      hasAttribute: vi.fn(() => false),
      removeAttribute: vi.fn(),
    }
    let attrs = {
      'data-tc-type': 'hotspot',
      'data-action': 'SUBSCRIBE',
      href: '#',
    }
    let style = {
      position: 'absolute',
      top: '70%',
      left: '10%',
      width: '30%',
      height: '12%',
    }
    const parentEl = { style: { position: 'relative' } }
    const cmp = {
      getAttributes: () => ({ ...attrs }),
      setAttributes: vi.fn((next) => {
        attrs = { ...next }
      }),
      getStyle: () => ({ ...style }),
      addStyle: vi.fn((patch) => {
        style = { ...style, ...patch }
      }),
      setStyle: vi.fn((next) => {
        style = { ...next }
      }),
      set: vi.fn(),
      getEl: () => el,
      parent: () => ({
        getEl: () => parentEl,
        getStyle: () => ({ position: 'relative' }),
        addStyle: vi.fn(),
      }),
      get: (key) => (key === 'tagName' ? 'a' : undefined),
    }

    healEditorHotspot(cmp)

    expect(cmp.set).toHaveBeenCalledWith(
      expect.objectContaining({ draggable: true }),
    )
    expect(el.setAttribute).toHaveBeenCalledWith('draggable', 'true')
    expect(el.removeAttribute).not.toHaveBeenCalledWith('draggable')
  })
})

describe('Priority chain step reorder helper', () => {
  it('reorders steps by splice (drag-drop semantics)', () => {
    const actions = [
      { type: 'api', url: '/a' },
      { type: 'page', page: 'OTP' },
      { type: 'page', page: 'ERROR' },
    ]
    const fromIndex = 2
    const toIndex = 0
    const next = [...actions]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    expect(next.map((s) => s.page || s.url)).toEqual(['ERROR', '/a', 'OTP'])
  })
})
