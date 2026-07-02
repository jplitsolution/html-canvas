export function mapBackendTemplate(template) {
  if (!template) return null
  const data = template.data || {}

  if (data.editor === 'grapesjs') {
    return {
      id: data.slug || String(template.id),
      dbId: template.id,
      name: template.name,
      description: data.description || '',
      thumbnail: data.thumbnail || data.previewImage || '',
      previewImage: data.previewImage || data.thumbnail || '',
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
    thumbnail: data.thumbnail || data.previewImage || '',
    previewImage: data.previewImage || data.thumbnail || '',
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
      thumbnail: template.previewImage || template.thumbnail || '',
      previewImage: template.previewImage || template.thumbnail || '',
      editor: 'grapesjs',
      projectData: template.projectData || {},
      html: template.html || '',
      css: template.css || '',
    },
  }
}
