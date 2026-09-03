import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CANVAS_MIN_HEIGHT,
  resolveStableCanvasHeight,
} from '../../src/editor/plugins/canvasEnhancements'

describe('resolveStableCanvasHeight — fixed canvas on remove', () => {
  it('uses default floor when content is short', () => {
    expect(resolveStableCanvasHeight(120, 0)).toBe(DEFAULT_CANVAS_MIN_HEIGHT)
  })

  it('grows when content exceeds floor', () => {
    expect(resolveStableCanvasHeight(1400, 720)).toBe(1400)
  })

  it('does not shrink below previous high-water mark on remove', () => {
    const afterAdd = resolveStableCanvasHeight(1600, 720)
    expect(afterAdd).toBe(1600)
    // Content collapses after delete, but floor stays
    expect(resolveStableCanvasHeight(400, afterAdd)).toBe(1600)
  })

  it('allows shrink when explicitly requested (page/device change)', () => {
    expect(resolveStableCanvasHeight(200, 1600, { allowShrink: true })).toBe(DEFAULT_CANVAS_MIN_HEIGHT)
    expect(resolveStableCanvasHeight(900, 1600, { allowShrink: true })).toBe(900)
  })
})
