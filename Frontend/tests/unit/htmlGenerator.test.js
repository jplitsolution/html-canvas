import { describe, it, expect } from 'vitest'
import { generateHTML } from '../../src/utils/htmlGenerator'
import { registerAllBlocks } from '../../src/registry/registerBlocks'

registerAllBlocks()

describe('htmlGenerator', () => {
  it('generates HTML from layout using registry', () => {
    const layout = [
      {
        id: 'b1',
        type: 'text',
        parentId: null,
        content: { text: 'Hello World' },
        styles: { desktop: {}, tablet: {}, mobile: {} },
      },
    ]
    const html = generateHTML(layout, 'Test Page')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Hello World')
    expect(html).toContain('Test Page')
  })

  it('returns empty state HTML for empty layout', () => {
    const html = generateHTML([], 'Empty')
    expect(html).toContain('No content yet')
  })
})
