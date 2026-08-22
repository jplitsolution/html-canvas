import { describe, it, expect } from 'vitest'
import {
  remapHotspotToAnchor,
  pinLiveHotspotToImage,
  IMAGE_BANNER_STYLE,
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
    expect(IMAGE_BANNER_STYLE.overflow).toBe('visible')

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
  })

  it('wraps a hugging non-banner parent so preview % uses the image box', () => {
    const card = document.createElement('div')
    stubRect(card, { left: 0, top: 0, width: 400, height: 800 })

    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 400, height: 800 })

    const hotspot = document.createElement('a')
    hotspot.setAttribute('data-tc-type', 'hotspot')
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })

    card.appendChild(img)
    card.appendChild(hotspot)
    document.body.appendChild(card)

    const host = pinLiveHotspotToImage(hotspot)
    expect(host.getAttribute('data-tc-type')).toBe('image-banner')
    expect(host.parentElement).toBe(card)
    expect(parseFloat(hotspot.style.top)).toBe(70)

    card.remove()
  })

  it('waits to wrap until the image has a real box', () => {
    const page = document.createElement('div')
    const img = document.createElement('img')
    stubRect(img, { left: 0, top: 0, width: 0, height: 0 })
    const hotspot = document.createElement('a')
    hotspot.setAttribute('data-tc-type', 'hotspot')
    stubRect(hotspot, { left: 40, top: 560, width: 200, height: 80 })
    page.appendChild(img)
    page.appendChild(hotspot)

    expect(pinLiveHotspotToImage(hotspot)).toBe(page)
    expect(hotspot.parentElement).toBe(page)
  })
})
