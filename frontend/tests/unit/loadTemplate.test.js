import { describe, it, expect, vi } from 'vitest'
import { loadIntoEditor } from '../../src/editor/services/loadTemplate'

describe('loadIntoEditor', () => {
  it('loads saved html instead of stale GrapesJS projectData', () => {
    const editor = {
      loadProjectData: vi.fn(),
      setStyle: vi.fn(),
      setComponents: vi.fn(),
    }

    loadIntoEditor(editor, {
      projectData: { pages: [{ frames: [{ component: { type: 'wrapper' } }] }] },
      html: '<div class="dcb-home"><h1>Choose your access pack</h1></div>',
      css: '.dcb-home { color: #0f172a }',
    })

    expect(editor.setComponents).toHaveBeenCalled()
    expect(String(editor.setComponents.mock.calls[0][0])).toContain('Choose your access pack')
    expect(editor.loadProjectData).not.toHaveBeenCalled()
  })
})
