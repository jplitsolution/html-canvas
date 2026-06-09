import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSessionDraft,
  loadSessionDraft,
  deleteSessionDraft,
  getSessionDraftKey,
} from '../../src/utils/sessionDraft'

describe('sessionDraft', () => {
  const projectId = 'test-project-123'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saves and loads session draft', () => {
    const draft = { layout: [], title: 'Test', savedAt: '2026-01-01T00:00:00.000Z' }
    saveSessionDraft(projectId, draft)
    const loaded = loadSessionDraft(projectId)
    expect(loaded.layout).toEqual([])
    expect(loaded.title).toBe('Test')
    expect(loaded.savedAt).toBeTruthy()
  })

  it('deletes session draft', () => {
    saveSessionDraft(projectId, { layout: [] })
    deleteSessionDraft(projectId)
    expect(loadSessionDraft(projectId)).toBeNull()
  })

  it('uses project-scoped storage key', () => {
    expect(getSessionDraftKey(projectId)).toContain(projectId)
  })
})
