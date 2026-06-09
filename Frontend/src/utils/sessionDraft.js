const SESSION_DRAFT_PREFIX = 'templatecraft_session_draft_'

let sessionDraftTimer = null

export function getSessionDraftKey(projectId) {
  return `${SESSION_DRAFT_PREFIX}${projectId}`
}

export function loadSessionDraft(projectId) {
  try {
    const data = sessionStorage.getItem(getSessionDraftKey(projectId))
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveSessionDraft(projectId, draft) {
  try {
    sessionStorage.setItem(
      getSessionDraftKey(projectId),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
    )
  } catch {
    // sessionStorage full or unavailable
  }
}

export function deleteSessionDraft(projectId) {
  try {
    sessionStorage.removeItem(getSessionDraftKey(projectId))
  } catch {
    // ignore
  }
}

export function scheduleSessionDraftSave(projectId, getDraftData) {
  if (sessionDraftTimer) clearTimeout(sessionDraftTimer)
  sessionDraftTimer = setTimeout(() => {
    const data = getDraftData()
    if (data) saveSessionDraft(projectId, data)
  }, 1000)
}
