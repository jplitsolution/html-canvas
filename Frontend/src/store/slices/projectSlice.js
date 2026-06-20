import * as projectsApi from '../../services/api/projects'
import { getTemplateById } from '../../constants/templates'
import { repairProject, CURRENT_VERSION } from '../../schemas/project.schema'
import { trackEvent } from '../../utils/analytics'

export function createProjectSlice(set, get) {
  return {
    projects: [],
    project: null,
    isDirty: false,
    projectsLoading: false,

    fetchProjects: async () => {
      set({ projectsLoading: true, error: null })
      try {
        const projects = await projectsApi.listProjects()
        set({ projects, projectsLoading: false })
      } catch (err) {
        set({ projectsLoading: false, error: err.message })
      }
    },

    loadProject: async (id) => {
      set({ loading: true, error: null })
      let projects = get().projects
      let project = projects.find((p) => p.id === id)

      if (!project) {
        try {
          project = await projectsApi.getProject(id)
          if (project) {
            projects = [...projects.filter((p) => p.id !== project.id), project]
            set({ projects })
          }
        } catch {
          project = null
        }
      }

      if (!project) {
        set({ loading: false, error: 'Project not found' })
        return
      }

      set({
        project,
        loading: false,
        isDirty: false,
        previewMode: 'desktop',
      })

      if (project.upgradedFromLegacy) {
        get().addToast('Project upgraded to the new editor', 'info')
      }
    },

    saveProjectFromEditor: async (editorData) => {
      const { project } = get()
      if (!project) return null

      set({ saving: true })
      try {
        const updatedProject = repairProject({
          ...project,
          ...editorData,
          updatedAt: new Date().toISOString(),
        })

        const saved = await projectsApi.saveProject(updatedProject)
        const projects = get().projects.map((p) => (p.id === saved.id ? saved : p))
        if (!projects.find((p) => p.id === saved.id)) {
          projects.push(saved)
        }

        trackEvent('saveCount')
        set({ projects, project: saved, saving: false, isDirty: false })
        get().announce('Project saved')
        get().addToast('Project saved successfully', 'success')
        return saved
      } catch (err) {
        set({ saving: false })
        get().addToast(err.message || 'Failed to save project', 'error')
        throw err
      }
    },

    setProjectDirty: (dirty) => set({ isDirty: dirty }),

    createProject: async (title, templateId = 'blank', templateData = null) => {
      const template = templateData || getTemplateById(templateId)
      const project = repairProject({
        id: 'new',
        title: title || 'Untitled Project',
        editor: 'grapesjs',
        projectData: template?.projectData || {},
        html: template?.html || '',
        css: template?.css || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: CURRENT_VERSION,
        metadata: { tags: [], description: '' },
      })

      const saved = await projectsApi.saveProject(project)
      const projects = [...get().projects, saved]
      trackEvent('projectsCreated')
      set({ projects })
      get().addToast('Project created successfully', 'success')
      return saved.id
    },

    deleteProject: async (id) => {
      try {
        await projectsApi.deleteProject(id)
        const projects = get().projects.filter((p) => p.id !== id)
        set({ projects })
        get().addToast('Project deleted', 'info')
      } catch (err) {
        get().addToast(err.message || 'Failed to delete project', 'error')
      }
    },

    updateProjectTitle: (title) => {
      const { project } = get()
      if (!project) return
      set({ project: { ...project, title }, isDirty: true })
    },
  }
}
