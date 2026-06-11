import { apiClient } from './client'
import { mapBackendProject, mapProjectToBackend } from './mappers'

export async function listProjects() {
  const projects = await apiClient('/projects')
  return (projects || []).map(mapBackendProject).filter(Boolean)
}

export async function getProject(id) {
  const project = await apiClient(`/projects/${id}`)
  return mapBackendProject(project)
}

export async function saveProject(project) {
  const payload = mapProjectToBackend(project)
  const numericId = Number(project.id)

  if (
    project.id &&
    project.id !== 'new' &&
    !Number.isNaN(numericId) &&
    String(numericId) === project.id
  ) {
    const updated = await apiClient(`/projects/${numericId}`, {
      method: 'PATCH',
      body: payload,
    })
    return mapBackendProject(updated)
  }

  const created = await apiClient('/projects', {
    method: 'POST',
    body: payload,
  })
  return mapBackendProject(created)
}

export async function deleteProject(id) {
  await apiClient(`/projects/${id}`, { method: 'DELETE' })
}
