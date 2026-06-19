import { describe, it, expect } from 'vitest'
import { repairBlock } from '../../src/schemas/block.schema'
import { resolveBlockStyles } from '../../src/utils/responsiveStyles'

describe('Typography Block Support', () => {
  it('parses typography blocks correctly', () => {
    const block = repairBlock({
      id: 'typo-1',
      type: 'typography',
      content: { text: 'Hello Typography' },
      styles: {
        fontSize: '20px',
        fontFamily: 'Outfit',
        fontStyle: 'italic',
        lineHeight: '1.8',
        letterSpacing: '2px'
      }
    })
    expect(block).toBeTruthy()
    expect(block.type).toBe('typography')
    expect(block.styles.desktop.fontFamily).toBe('Outfit')
    expect(block.styles.desktop.fontStyle).toBe('italic')
    expect(block.styles.desktop.lineHeight).toBe('1.8')
    expect(block.styles.desktop.letterSpacing).toBe('2px')
    expect(block.style.desktop.fontFamily).toBe('Outfit')
  })

  it('converts legacy text block type to typography', () => {
    const block = repairBlock({
      id: 'legacy-1',
      type: 'text',
      content: { text: 'Old Text block' },
      styles: { fontSize: '14px' }
    })
    expect(block).toBeTruthy()
    expect(block.type).toBe('typography')
    expect(block.styles.desktop.fontSize).toBe('14px')
    expect(block.style.desktop.fontSize).toBe('14px')
  })

  it('resolves typography block style attributes', () => {
    const styles = {
      desktop: { fontFamily: 'Inter', fontStyle: 'italic', letterSpacing: '1px' },
      tablet: { fontStyle: 'normal' },
      mobile: {}
    }
    const resolvedTablet = resolveBlockStyles(styles, 'tablet')
    expect(resolvedTablet.fontFamily).toBe('Inter')
    expect(resolvedTablet.fontStyle).toBe('normal')
    expect(resolvedTablet.letterSpacing).toBe('1px')
  })
})
