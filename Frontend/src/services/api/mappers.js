import { repairProject, CURRENT_VERSION, createEmptyProject } from '../../schemas/project.schema'

export function mapBackendProject(project) {
  if (!project) return null
  const data = project.data || {}

  if (data.editor === 'grapesjs') {
    return repairProject({
      id: String(project.id),
      title: project.name || 'Untitled Project',
      editor: 'grapesjs',
      projectData: data.projectData || {},
      html: data.html || '',
      css: data.css || '',
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString(),
      version: data.version ?? CURRENT_VERSION,
      metadata: data.metadata || { tags: [], description: '' },
    })
  }

  const upgradedFromLegacy = Boolean(data.layout?.length)

  return {
    ...createEmptyProject({
      id: String(project.id),
      title: project.name || 'Untitled Project',
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString(),
      metadata: data.metadata || { tags: [], description: '' },
    }),
    upgradedFromLegacy,
  }
}

export function mapProjectToBackend(project) {
  return {
    name: project.title,
    data: {
      editor: 'grapesjs',
      version: project.version ?? CURRENT_VERSION,
      projectData: project.projectData || {},
      html: project.html || '',
      css: project.css || '',
      metadata: project.metadata || { tags: [], description: '' },
    },
  }
}

export function mapBackendTemplate(template) {
  if (!template) return null
  const data = template.data || {}

  if (data.editor === 'grapesjs') {
    return {
      id: data.slug || String(template.id),
      dbId: template.id,
      name: template.name,
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      editor: 'grapesjs',
      projectData: data.projectData || {},
      html: data.html || '',
      css: data.css || '',
      isPrebuilt: template.isPrebuilt,
    }
  }

  return {
    id: data.slug || String(template.id),
    dbId: template.id,
    name: template.name,
    description: data.description || '',
    thumbnail: data.thumbnail || '',
    editor: 'grapesjs',
    projectData: {},
    html: '',
    css: '',
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
      editor: 'grapesjs',
      projectData: template.projectData || {},
      html: template.html || '',
      css: template.css || '',
    },
  }
}
