import { apiClient } from './client'
import { mapBackendTemplate, mapTemplateToBackend } from './mappers'
import { PREBUILT_TEMPLATES, getTemplateById } from '../../constants/templates'

function fallbackTemplates() {
  return PREBUILT_TEMPLATES
}

export async function listTemplates() {
  try {
    const templates = await apiClient('/templates/prebuilt')
    const mapped = (templates || []).map(mapBackendTemplate).filter(Boolean)
    return mapped.length > 0 ? mapped : fallbackTemplates()
  } catch {
    return fallbackTemplates()
  }
}

export async function listUserTemplates() {
  const templates = await apiClient('/templates/user')
  return (templates || []).map(mapBackendTemplate).filter(Boolean)
}

export async function getTemplate(id) {
  try {
    const numericId = Number(id)
    if (!Number.isNaN(numericId) && String(numericId) === id) {
      const template = await apiClient(`/templates/${numericId}`)
      return mapBackendTemplate(template)
    }

    const all = await listTemplates()
    const bySlug = all.find((t) => t.id === id)
    if (bySlug) return bySlug

    const userTemplates = await listUserTemplates()
    return userTemplates.find((t) => t.id === id) || getTemplateById(id)
  } catch {
    return getTemplateById(id)
  }
}

export async function saveUserTemplate(template) {
  const saved = await apiClient('/templates', {
    method: 'POST',
    body: mapTemplateToBackend(template),
  })
  return mapBackendTemplate(saved)
}

export async function deleteUserTemplate(id) {
  const dbId = typeof id === 'object' ? id.dbId : Number(id)
  await apiClient(`/templates/${dbId}`, { method: 'DELETE' })
}
