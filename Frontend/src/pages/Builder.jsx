import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { savePreviewHandoff } from '../utils/previewHandoff'

const TemplateEditor = lazy(() => import('../editor/TemplateEditor'))

function BuilderFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-bg-canvas">
      <div className="text-sm text-fg-muted animate-pulse">Loading editor...</div>
    </div>
  )
}

export default function Builder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loadProject = useStore((s) => s.loadProject)
  const project = useStore((s) => s.project)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const isDirty = useStore((s) => s.isDirty)
  const setProjectDirty = useStore((s) => s.setProjectDirty)
  const saveProjectFromEditor = useStore((s) => s.saveProjectFromEditor)

  useEffect(() => {
    if (id) loadProject(id)
  }, [id, loadProject])

  useEffect(() => {
    if (error) navigate('/dashboard')
  }, [error, navigate])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleEditorSave = useCallback((savedProject) => {
    if (!savedProject) return
    useStore.setState((s) => ({
      project: savedProject,
      projects: s.projects.map((p) => (p.id === savedProject.id ? savedProject : p)),
      isDirty: false,
      saving: false,
    }))
    useStore.getState().addToast('Project saved successfully', 'success')
  }, [])

  const handleDirtyChange = useCallback(
    (dirty) => setProjectDirty(dirty),
    [setProjectDirty]
  )

  const handlePreview = useCallback(
    async (payload) => {
      if (!id || !project) return
      if (isDirty) {
        try {
          await saveProjectFromEditor({
            projectData: payload.projectData,
            html: payload.html,
            css: payload.css,
          })
        } catch {
          return
        }
      }
      savePreviewHandoff(id, {
        html: payload.html,
        css: payload.css,
        title: payload.name,
        pages: payload.pages,
        activePageFilename: payload.activePageFilename,
      })
      navigate(`/preview/${id}`)
    },
    [id, project, isDirty, saveProjectFromEditor, navigate]
  )

  const initialData = useMemo(() => ({
    projectData: project?.projectData || {},
    html: project?.html || '',
    css: project?.css || '',
  }), [project?.id])

  if (loading || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-canvas">
        <div className="text-sm text-fg-muted animate-pulse">Loading project...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg-canvas safe-top overflow-hidden">
      <Suspense fallback={<BuilderFallback />}>
        <TemplateEditor
          projectId={project.id}
          projectTitle={project.title}
          projectCreatedAt={project.createdAt}
          projectMetadata={project.metadata}
          initialData={initialData}
          onSave={handleEditorSave}
          onDirtyChange={handleDirtyChange}
          onPreview={handlePreview}
        />
      </Suspense>
    </div>
  )
}
