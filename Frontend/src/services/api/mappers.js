import { repairProject, CURRENT_VERSION } from '../../schemas/project.schema'
import { validateLayout } from '../../schemas/layout.schema'

export function mapBackendProject(project) {
  if (!project) return null
  const data = project.data || {}
  return repairProject({
    id: String(project.id),
    title: project.name || 'Untitled Project',
    layout: validateLayout(data.layout || []),
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    version: data.version ?? CURRENT_VERSION,
    metadata: data.metadata || { tags: [], description: '' },
  })
}

export function mapProjectToBackend(project) {
  return {
    name: project.title,
    data: {
      layout: project.layout || [],
      version: project.version ?? CURRENT_VERSION,
      metadata: project.metadata || { tags: [], description: '' },
    },
  }
}

export function mapBackendTemplate(template) {
  if (!template) return null
  const data = template.data || {}
  return {
    id: data.slug || String(template.id),
    dbId: template.id,
    name: template.name,
    description: data.description || '',
    thumbnail: data.thumbnail || '',
    layout: validateLayout(data.layout || []),
    isPrebuilt: template.isPrebuilt,
  }
}

export function mapTemplateToBackend(template) {
  return {
    name: template.name,
    data: {
      slug: template.id,
      description: template.description || '',
      thumbnail: template.thumbnail || '',
      layout: template.layout || [],
    },
  }
}
