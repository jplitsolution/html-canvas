import * as projectsApi from '../../services/api/projects'
import { getTemplateById, cloneLayout } from '../../constants/templates'
import { validateLayout } from '../../schemas/layout.schema'
import { repairProject, CURRENT_VERSION } from '../../schemas/project.schema'
import { createHistoryEntry } from '../../utils/history'
import { trackEvent } from '../../utils/analytics'
import {
  loadSessionDraft, deleteSessionDraft,
} from '../../utils/sessionDraft'

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

      const draft = loadSessionDraft(id)
      const layout = validateLayout(project.layout || [])
      const entry = createHistoryEntry('load', layout)

      if (draft && draft.savedAt > project.updatedAt) {
        set({
          pendingDraft: draft,
          showRecoveryDialog: true,
          loading: false,
          project,
          layout,
          selectedBlockId: null,
          selectedBlocks: [],
          history: [entry],
          historyIndex: 0,
          isDirty: false,
          previewMode: 'desktop',
          zoom: 100,
        })
        return
      }

      set({
        project, layout,
        selectedBlockId: null, selectedBlocks: [],
        history: [entry], historyIndex: 0,
        loading: false, isDirty: false,
        previewMode: 'desktop', zoom: 100,
        pendingDraft: null,
        showRecoveryDialog: false,
      })
    },

    restoreDraft: () => {
      const { pendingDraft } = get()
      if (!pendingDraft) return
      const layout = validateLayout(pendingDraft.layout || [])
      set({
        layout, selectedBlockId: pendingDraft.selectedBlockId || null,
        selectedBlocks: pendingDraft.selectedBlocks || [],
        zoom: pendingDraft.zoom || 100,
        history: [createHistoryEntry('restore', layout)],
        historyIndex: 0, isDirty: true,
        showRecoveryDialog: false, pendingDraft: null,
      })
      get().announce('Draft restored')
    },

    discardDraft: () => {
      const { project, pendingDraft } = get()
      if (project && pendingDraft) deleteSessionDraft(project.id)
      const layout = validateLayout(project?.layout || [])
      set({
        layout, pendingDraft: null, showRecoveryDialog: false,
        history: [createHistoryEntry('load', layout)], historyIndex: 0,
        isDirty: false,
      })
    },

    saveProject: async () => {
      const { project, layout } = get()
      if (!project) return

      set({ saving: true })
      try {
        const updatedProject = repairProject({
          ...project,
          layout: validateLayout(structuredClone(layout)),
          updatedAt: new Date().toISOString(),
        })

        const saved = await projectsApi.saveProject(updatedProject)
        const projects = get().projects.map((p) =>
          p.id === saved.id ? saved : p
        )
        if (!projects.find((p) => p.id === saved.id)) {
          projects.push(saved)
        }

        deleteSessionDraft(project.id)
        trackEvent('saveCount')

        set({ projects, project: saved, saving: false, isDirty: false })
        get().announce('Project saved')
        get().addToast('Project saved successfully', 'success')
      } catch (err) {
        set({ saving: false })
        get().addToast(err.message || 'Failed to save project', 'error')
      }
    },

    createProject: async (title, templateId = 'blank') => {
      const template = getTemplateById(templateId)
      const project = repairProject({
        id: 'new',
        title: title || 'Untitled Project',
        layout: validateLayout(cloneLayout(template.layout)),
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
        deleteSessionDraft(id)
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
