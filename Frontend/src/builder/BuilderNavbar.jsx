import { memo, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Undo2, Redo2, Save, Eye, Download, Check, Loader2, FileJson,
} from 'lucide-react'
import useStore from '../store/useStore'
import { generateExport, downloadExport } from '../utils/exportEngine'
import { setPreviewHandoff } from '../utils/previewHandoff'
import { trackEvent } from '../utils/analytics'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import DeviceSwitcher from '../components/ui/DeviceSwitcher'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import ThemeToggle from '../components/common/ThemeToggle'

function BuilderNavbar() {
  const navigate = useNavigate()
  const project = useStore((s) => s.project)
  const layout = useStore((s) => s.layout)
  const previewMode = useStore((s) => s.previewMode)
  const zoom = useStore((s) => s.zoom)
  const saving = useStore((s) => s.saving)
  const isDirty = useStore((s) => s.isDirty)
  const historyIndex = useStore((s) => s.historyIndex)
  const history = useStore((s) => s.history)
  const setPreviewMode = useStore((s) => s.setPreviewMode)
  const setZoom = useStore((s) => s.setZoom)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const saveProject = useStore((s) => s.saveProject)
  const updateProjectTitle = useStore((s) => s.updateProjectTitle)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(project?.title || '')

  const saveBadge = useMemo(() => {
    if (saving) return { variant: 'default', label: 'Saving...', icon: Loader2, spin: true }
    if (isDirty) return { variant: 'warning', label: 'Unsaved', icon: null }
    return { variant: 'success', label: 'Saved', icon: Check }
  }, [saving, isDirty])

  const handleExport = useCallback(async (format) => {
    if (!project) return
    const result = await generateExport({ ...project, layout }, { format })
    downloadExport(result)
    trackEvent('exports')
  }, [project, layout])

  const handlePreview = useCallback(() => {
    if (!project) return
    setPreviewHandoff(project.id, {
      layout,
      title: project.title,
      previewMode,
    })
    window.open(`/preview/${project.id}`, '_blank')
  }, [project, layout, previewMode])

  const handleTitleSave = useCallback(() => {
    updateProjectTitle(titleValue)
    setEditingTitle(false)
  }, [titleValue, updateProjectTitle])

  const StatusIcon = saveBadge.icon

  return (
    <header className="h-12 shrink-0 border-b border-border glass flex items-center gap-2 px-3">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="!px-2">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Button>
      <div className="divider-v" />
      {editingTitle ? (
        <Input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSave()
            if (e.key === 'Escape') {
              setTitleValue(project?.title || '')
              setEditingTitle(false)
            }
          }}
          autoFocus
          className="!py-1 !px-2 w-48 text-sm font-medium"
          aria-label="Project title"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className="text-sm font-medium text-fg hover:text-accent transition-colors px-1 font-display"
        >
          {project?.title || 'Untitled'}
        </button>
      )}
      <Badge variant={saveBadge.variant} className="ml-1">
        {StatusIcon && <StatusIcon className={`w-3 h-3 ${saveBadge.spin ? 'animate-spin' : ''}`} />}
        {saveBadge.label}
      </Badge>
      <div className="flex-1" />
      <DeviceSwitcher value={previewMode} onChange={setPreviewMode} />
      <div className="divider-v" />
      <IconButton onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 className="w-4 h-4" />
      </IconButton>
      <IconButton onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)" aria-label="Redo">
        <Redo2 className="w-4 h-4" />
      </IconButton>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={50}
          max={150}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-16 accent-accent"
          aria-label={`Zoom ${zoom}%`}
        />
        <span className="text-xs text-fg-subtle w-8 tabular-nums">{zoom}%</span>
      </div>
      <div className="divider-v" />
      <Button
        variant={isDirty ? 'primary' : 'secondary'}
        size="sm"
        onClick={saveProject}
        disabled={saving || !isDirty}
      >
        <Save className="w-4 h-4" /> Save
      </Button>
      <Button variant="secondary" size="sm" onClick={handlePreview}>
        <Eye className="w-4 h-4" /> Preview
      </Button>
      <Button variant="primary" size="sm" onClick={() => handleExport('html')}>
        <Download className="w-4 h-4" /> Export
      </Button>
      <IconButton onClick={() => handleExport('json')} title="Export JSON" aria-label="Export JSON">
        <FileJson className="w-4 h-4" />
      </IconButton>
      <ThemeToggle />
    </header>
  )
}

export default memo(BuilderNavbar)
