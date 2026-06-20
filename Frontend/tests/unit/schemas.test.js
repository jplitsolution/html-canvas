import { describe, it, expect } from 'vitest'
import { repairProject, CURRENT_VERSION, createEmptyProject } from '../../src/schemas/project.schema'
import { mapBackendProject, mapProjectToBackend } from '../../src/services/api/mappers'

describe('Project Schema', () => {
  it('repairs project with grapesjs defaults', () => {
    const project = repairProject({
      id: 'p1',
      title: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(project.version).toBe(CURRENT_VERSION)
    expect(project.editor).toBe('grapesjs')
    expect(project.projectData).toEqual({})
    expect(project.html).toBe('')
    expect(project.css).toBe('')
  })

  it('creates empty project', () => {
    const project = createEmptyProject({ title: 'Blank' })
    expect(project.title).toBe('Blank')
    expect(project.editor).toBe('grapesjs')
  })
})

describe('API Mappers', () => {
  it('maps backend grapesjs project', () => {
    const mapped = mapBackendProject({
      id: 1,
      name: 'My Site',
      data: {
        editor: 'grapesjs',
        version: 2,
        projectData: { pages: [] },
        html: '<div>Hello</div>',
        css: 'div { color: red; }',
        metadata: { tags: [], description: '' },
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(mapped.html).toBe('<div>Hello</div>')
    expect(mapped.projectData).toEqual({ pages: [] })
  })

  it('maps legacy project to empty grapesjs canvas', () => {
    const mapped = mapBackendProject({
      id: 2,
      name: 'Legacy',
      data: { layout: [{ id: 'b1', type: 'text' }] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(mapped.upgradedFromLegacy).toBe(true)
    expect(mapped.html).toBe('')
  })

  it('maps project to backend payload', () => {
    const payload = mapProjectToBackend({
      title: 'Export',
      version: 2,
      projectData: {},
      html: '<p>Hi</p>',
      css: '',
      metadata: { tags: [], description: '' },
    })
    expect(payload.data.editor).toBe('grapesjs')
    expect(payload.data.html).toBe('<p>Hi</p>')
  })
})

describe('Analytics', () => {
  it('tracks events locally', async () => {
    const { loadMetrics, trackEvent } = await import('../../src/utils/analytics')
    trackEvent('blocksAdded')
    const metrics = loadMetrics()
    expect(metrics.blocksAdded).toBeGreaterThan(0)
  })
})

describe('Export Project', () => {
  it('detects project content', async () => {
    const { projectHasContent } = await import('../../src/utils/exportProject')
    expect(projectHasContent({ html: '<p>x</p>' })).toBe(true)
    expect(projectHasContent({ html: '', projectData: {} })).toBe(false)
  })
})
