import { describe, it, expect } from 'vitest'
import { appendBackgroundImageCss } from '../../src/utils/backgroundStyles'
import { getResolvedStyleObject } from '../../src/utils/responsiveStyles'
import { styleToString } from '../../src/registry/htmlRenderers'

describe('backgroundStyles', () => {
  it('adds cover background image css when url is set', () => {
    const result = appendBackgroundImageCss({ color: '#000' }, 'https://example.com/bg.jpg')
    expect(result.backgroundImage).toBe('url("https://example.com/bg.jpg")')
    expect(result.backgroundSize).toBe('cover')
  })

  it('skips background image css when url is empty', () => {
    const result = appendBackgroundImageCss({ color: '#000' }, '')
    expect(result.backgroundImage).toBeUndefined()
  })

  it('renders background image in canvas and export styles', () => {
    const styles = {
      desktop: {
        color: '#000',
        backgroundColor: 'transparent',
        backgroundImage: 'https://example.com/bg.jpg',
        fontSize: '16px',
        fontWeight: '400',
        textAlign: 'left',
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        marginTop: 0,
        marginBottom: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        width: '100%',
        height: 'auto',
      },
      tablet: {},
      mobile: {},
    }

    expect(getResolvedStyleObject(styles).backgroundImage).toContain('example.com/bg.jpg')
    expect(styleToString(styles)).toContain('background-image:url')
  })
})
