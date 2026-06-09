import { persistence } from '../adapters/persistence'
import { migrateProjects } from '../../utils/migration'
import { getTemplateById, cloneLayout } from '../../constants/templates'
import { validateLayout } from '../../schemas/layout.schema'
import { repairProject, CURRENT_VERSION } from '../../schemas/project.schema'
import { createHistoryEntry } from '../../utils/history'
import { trackEvent } from '../../utils/analytics'
import {
  loadSessionDraft, deleteSessionDraft,
} from '../../utils/sessionDraft'

function seedProjects() {
  const saasTemplate = getTemplateById('saas-landing')
  const portfolioTemplate = getTemplateById('minimal-portfolio')

  return [
    repairProject({
      id: crypto.randomUUID(),
      title: 'SaaS Business Site',
      layout: cloneLayout(saasTemplate.layout),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
      metadata: { tags: [], description: '' },
    }),
    repairProject({
      id: crypto.randomUUID(),
      title: 'Alex Portfolio',
      layout: cloneLayout(portfolioTemplate.layout),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
      metadata: { tags: [], description: '' },
    }),
  ].filter(Boolean)
}

function initProjects() {
  const stored = migrateProjects(persistence.listProjects())
  if (stored.length === 0) {
    const seeded = seedProjects()
    persistence.saveProjects(seeded, true)
    return seeded
  }
  return stored
}

export function createProjectSlice(set, get) {
  return {
    projects: initProjects(),
    project: null,
    isDirty: false,

    loadProject: (id) => {
      set({ loading: true, error: null })
      const projects = get().projects.length ? get().projects : initProjects()
      const project = projects.find((p) => p.id === id)
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
        projects, project, layout,
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

    saveProject: () => {
      const { project, layout } = get()
      if (!project) return

      set({ saving: true })
      const updatedProject = repairProject({
        ...project,
        layout: validateLayout(structuredClone(layout)),
        updatedAt: new Date().toISOString(),
      })

      const projects = get().projects.map((p) =>
        p.id === project.id ? updatedProject : p
      )

      persistence.saveProjects(projects, true)
      deleteSessionDraft(project.id)
      trackEvent('saveCount')

      set({ projects, project: updatedProject, saving: false, isDirty: false })
      get().announce('Project saved')
    },

    createProject: (title, templateId = 'blank') => {
      const template = getTemplateById(templateId)
      const project = repairProject({
        id: crypto.randomUUID(),
        title: title || 'Untitled Project',
        layout: validateLayout(cloneLayout(template.layout)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: CURRENT_VERSION,
        metadata: { tags: [], description: '' },
      })

      const projects = [...get().projects, project]
      persistence.saveProjects(projects, true)
      trackEvent('projectsCreated')
      set({ projects })
      get().addToast('Project created successfully', 'success')
      return project.id
    },

    deleteProject: (id) => {
      const projects = get().projects.filter((p) => p.id !== id)
      persistence.saveProjects(projects, true)
      deleteSessionDraft(id)
      set({ projects })
      get().addToast('Project deleted', 'info')
    },

    updateProjectTitle: (title) => {
      const { project } = get()
      if (!project) return
      set({ project: { ...project, title }, isDirty: true })
    },
  }
}
