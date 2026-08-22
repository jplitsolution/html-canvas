import { describe, it, expect } from 'vitest'
import {
  layoutKeyForDevice,
  parseDeviceLayouts,
  pickLivePageData,
  cloneLayout,
  buildSavePayload,
  MOBILE_LAYOUT_WIDTH,
} from './deviceLayouts.js'

describe('layoutKeyForDevice', () => {
  it('maps Phone to mobile and everything else to desktop', () => {
    expect(layoutKeyForDevice('Mobile')).toBe('mobile')
    expect(layoutKeyForDevice('Desktop')).toBe('desktop')
    expect(layoutKeyForDevice('Tablet')).toBe('desktop')
    expect(layoutKeyForDevice('Custom')).toBe('desktop')
  })
})

describe('parseDeviceLayouts', () => {
  it('uses page html as desktop when no variants exist', () => {
    const layouts = parseDeviceLayouts(
      { customWidth: '1200', customHeight: '800' },
      '<div>desk</div>',
      'body{color:red}',
    )
    expect(layouts.desktop.html).toContain('desk')
    expect(layouts.desktop.customWidth).toBe('1200')
    expect(layouts.mobile).toBeNull()
  })

  it('reads stored mobile without wiping desktop', () => {
    const layouts = parseDeviceLayouts(
      {
        deviceLayouts: {
          desktop: { html: '<d/>', css: '', customWidth: '1200' },
          mobile: { html: '<m/>', css: '', customWidth: '375' },
        },
      },
      '<fallback/>',
      '',
    )
    expect(layouts.desktop.html).toBe('<d/>')
    expect(layouts.mobile.html).toBe('<m/>')
  })
})

describe('pickLivePageData', () => {
  const page = {
    pageType: 'HOME',
    html: '<desktop/>',
    css: 'd{}',
    projectData: {
      customWidth: '1200',
      deviceLayouts: {
        desktop: { html: '<desktop/>', css: 'd{}', customWidth: '1200' },
        mobile: { html: '<phone/>', css: 'm{}', customWidth: '375' },
      },
    },
  }

  it('serves mobile html on a phone viewport', () => {
    const picked = pickLivePageData(page, true)
    expect(picked.html).toBe('<phone/>')
    expect(picked.projectData.customWidth).toBe(MOBILE_LAYOUT_WIDTH)
  })

  it('serves desktop html on a wide viewport', () => {
    const picked = pickLivePageData(page, false)
    expect(picked.html).toBe('<desktop/>')
    expect(picked.projectData.customWidth).toBe('1200')
  })

  it('falls back to saved html when mobile was never designed', () => {
    const old = { html: '<only/>', css: '', projectData: {} }
    expect(pickLivePageData(old, true).html).toBe('<only/>')
  })
})

describe('cloneLayout', () => {
  it('copies html and can retarget width for a new phone layout', () => {
    const clone = cloneLayout(
      { html: '<x/>', css: 'a{}', customWidth: '1200', customHeight: '800' },
      { customWidth: '375' },
    )
    expect(clone.html).toBe('<x/>')
    expect(clone.customWidth).toBe('375')
    expect(clone.customHeight).toBe('800')
  })
})

describe('buildSavePayload', () => {
  it('keeps top-level html as desktop when saving the phone layout', () => {
    const editor = {
      getProjectData: () => ({ pages: [{ id: 'home' }], assets: [] }),
    }
    const payload = buildSavePayload(
      editor,
      {
        desktop: { html: '<d/>', css: 'd{}', customWidth: '1200', customHeight: '800' },
        mobile: null,
      },
      'mobile',
      { html: '<m/>', css: 'm{}', customWidth: '375', customHeight: '800' },
      '1200',
      '800',
    )
    expect(payload.html).toBe('<d/>')
    expect(payload.projectData.deviceLayouts.mobile.html).toBe('<m/>')
    expect(payload.projectData.deviceLayouts.desktop.html).toBe('<d/>')
    expect(payload.projectData.pages[0].id).toBe('home')
  })
})
