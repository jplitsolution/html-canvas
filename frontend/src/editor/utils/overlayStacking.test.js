import { describe, it, expect, vi } from 'vitest'
import {
  remapHotspotToAnchor,
  pinLiveHotspotToImage,
  IMAGE_BANNER_STYLE,
  fitCreativeToViewport,
  persistEditorHotspotBox,
  freezeHotspotToPixels,
  coverHotspotFullImage,
} from './overlayStacking.js'

function stubRect(el, { left, top, width, height }) {
  el.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  })
}

describe('remapHotspotToAnchor', () => {
  it('converts the hotspot box into % of the image, not the page', () => {
    const img = document.createElement('img')
    const hotspot = document.createElement('a')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })

    expect(remapHotspotToAnchor(hotspot, img)).toBe(true)
    expect(parseFloat(hotspot.style.left)).toBe(10)
    expect(parseFloat(hotspot.style.top)).toBe(70)
    expect(parseFloat(hotspot.style.width)).toBe(50)
    expect(parseFloat(hotspot.style.height)).toBe(10)
  })

  it('keeps a taller hotspot by moving top up instead of shrinking height', () => {
    const img = document.createElement('img')
    const hotspot = document.createElement('a')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    stubRect(hotspot, { left: 40, top: 640, width: 200, height: 240 })

    expect(remapHotspotToAnchor(hotspot, img)).toBe(true)
    expect(parseFloat(hotspot.style.height)).toBe(30)
    expect(parseFloat(hotspot.style.top) + parseFloat(hotspot.style.height)).toBeLessThanOrEqual(100)
  })
})

describe('pinLiveHotspotToImage', () => {
  it('wraps a page-level image + hotspot into image-banner', () => {
    const page = document.createElement('div')
    page.style.width = '400px'
    Object.defineProperty(page, 'clientHeight', { value: 2000 })
    stubRect(page, { left: 0, top: 0, width: 400, height: 2000 })

    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })

    const hotspot = document.createElement('a')
    hotspot.setAttribute('data-tc-type', 'hotspot')
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })

    page.appendChild(img)
    page.appendChild(hotspot)
    document.body.appendChild(page)

    const host = pinLiveHotspotToImage(hotspot)
    expect(host.getAttribute('data-tc-type')).toBe('image-banner')
    expect(host.contains(img)).toBe(true)
    expect(host.contains(hotspot)).toBe(true)
    expect(hotspot.style.top.endsWith('%')).toBe(true)
    expect(parseFloat(hotspot.style.top)).toBe(70)
    expect(IMAGE_BANNER_STYLE.position).toBe('relative')

    page.remove()
  })

  it('does not wrap when parent already hugs the image', () => {
    const host = document.createElement('div')
    host.setAttribute('data-tc-type', 'image-banner')
    stubRect(host, { left: 0, top: 0, width: 400, height: 800 })

    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })

    const hotspot = document.createElement('a')
    hotspot.setAttribute('data-tc-type', 'hotspot')
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })

    host.appendChild(img)
    host.appendChild(hotspot)

    expect(pinLiveHotspotToImage(hotspot)).toBe(host)
    expect(host.parentElement).toBeNull()
    expect(hotspot.getAttribute('data-tc-pinned')).toBe('1')
  })

  it('moves a sibling hotspot into an existing image-banner', () => {
    const page = document.createElement('div')
    stubRect(page, { left: 0, top: 0, width: 400, height: 2000 })

    const host = document.createElement('div')
    host.setAttribute('data-tc-type', 'image-banner')
    stubRect(host, { left: 0, top: 0, width: 400, height: 800 })

    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    host.appendChild(img)

    const hotspot = document.createElement('a')
    hotspot.setAttribute('data-tc-type', 'hotspot')
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })

    page.appendChild(host)
    page.appendChild(hotspot)

    expect(pinLiveHotspotToImage(hotspot)).toBe(host)
    expect(host.contains(hotspot)).toBe(true)
    expect(parseFloat(hotspot.style.top)).toBe(70)
  })
})

describe('fitCreativeToViewport', () => {
  it('scales a tall banner instead of shrinking only the image', () => {
    const banner = document.createElement('div')
    banner.setAttribute('data-tc-type', 'image-banner')
    Object.defineProperty(banner, 'scrollHeight', { value: 2000 })
    Object.defineProperty(banner, 'offsetHeight', { value: 2000 })
    document.body.appendChild(banner)
    fitCreativeToViewport(document)
    expect(banner.style.transform).toMatch(/scale\(/)
    banner.remove()
  })
})

describe('persistEditorHotspotBox', () => {
  it('saves the on-screen resized box instead of the old % height', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-tc-type', 'image-banner')
    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    Object.defineProperty(img, 'complete', { value: true })
    Object.defineProperty(img, 'naturalWidth', { value: 400 })
    Object.defineProperty(img, 'naturalHeight', { value: 800 })
    parent.appendChild(img)

    const el = document.createElement('a')
    el.setAttribute('data-tc-type', 'hotspot')
    el.style.top = '10%'
    el.style.height = '12%'
    stubRect(el, { left: 40, top: 230, width: 200, height: 240 })
    parent.appendChild(el)

    const addStyle = vi.fn()
    persistEditorHotspotBox({
      getAttributes: () => ({ 'data-tc-type': 'hotspot' }),
      getEl: () => el,
      parent: () => ({ getEl: () => parent }),
      addStyle,
      removeStyle: vi.fn(),
    })

    expect(parseFloat(el.style.top)).toBeCloseTo(28.75)
    expect(parseFloat(el.style.height)).toBe(30)
  })
})

describe('freezeHotspotToPixels', () => {
  it('writes the on-screen box in px so Grapes can resize it', () => {
    const parent = document.createElement('div')
    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    parent.appendChild(img)
    const el = document.createElement('a')
    el.setAttribute('data-tc-type', 'hotspot')
    el.style.height = '12%'
    stubRect(el, { left: 40, top: 230, width: 200, height: 80 })
    parent.appendChild(el)
    const set = vi.fn()
    freezeHotspotToPixels({
      getAttributes: () => ({ 'data-tc-type': 'hotspot' }),
      getEl: () => el,
      parent: () => ({ getEl: () => parent }),
      addStyle: vi.fn(),
      removeStyle: vi.fn(),
      set,
    })
    expect(el.style.height).toBe('80px')
    expect(el.style.top).toBe('230px')
  })
})

describe('coverHotspotFullImage', () => {
  it('covers the image using pixel size so 100% height is not ignored', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-tc-type', 'image-banner')
    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })
    parent.appendChild(img)
    const el = document.createElement('a')
    el.setAttribute('data-tc-type', 'hotspot')
    parent.appendChild(el)
    let attrs = { 'data-tc-type': 'hotspot' }
    coverHotspotFullImage({
      getAttributes: () => ({ ...attrs }),
      setAttributes: (next) => {
        attrs = { ...next }
      },
      getEl: () => el,
      parent: () => ({
        getEl: () => parent,
        getAttributes: () => ({ 'data-tc-type': 'image-banner' }),
        addStyle: vi.fn(),
      }),
      addStyle: vi.fn(),
      removeStyle: vi.fn(),
    })
    expect(attrs['data-tc-cover-full']).toBe('1')
    expect(el.style.top).toBe('0px')
    expect(el.style.left).toBe('0px')
    expect(el.style.width).toBe('400px')
    expect(el.style.height).toBe('800px')
  })
})
