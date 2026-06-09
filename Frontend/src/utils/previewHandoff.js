const PREVIEW_HANDOFF_PREFIX = 'templatecraft_preview_'

export function getPreviewHandoffKey(projectId) {
  return `${PREVIEW_HANDOFF_PREFIX}${projectId}`
}

export function setPreviewHandoff(projectId, data) {
  try {
    sessionStorage.setItem(getPreviewHandoffKey(projectId), JSON.stringify(data))
  } catch {
    // sessionStorage full or unavailable
  }
}

export function loadPreviewHandoff(projectId) {
  try {
    const raw = sessionStorage.getItem(getPreviewHandoffKey(projectId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPreviewHandoff(projectId) {
  try {
    sessionStorage.removeItem(getPreviewHandoffKey(projectId))
  } catch {
    // ignore
  }
}
