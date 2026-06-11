import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Undo2, Redo2, Save, Eye, Download, Check, Loader2, FileJson, MoreVertical,
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
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef(null)

  useEffect(() => {
    if (!showMore) return undefined
    const onClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showMore])

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
    setShowMore(false)
  }, [project, layout])

  const handlePreview = useCallback(() => {
    if (!project) return
    setPreviewHandoff(project.id, {
      layout,
      title: project.title,
      previewMode,
    })
    window.open(`/preview/${project.id}`, '_blank')
    setShowMore(false)
  }, [project, layout, previewMode])

  const handleTitleSave = useCallback(() => {
    updateProjectTitle(titleValue)
    setEditingTitle(false)
  }, [titleValue, updateProjectTitle])

  const StatusIcon = saveBadge.icon

  return (
    <header className="shrink-0 border-b border-border glass">
      <div className="h-12 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="!px-2 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
        <div className="divider-v hidden sm:block" />
        <div className="min-w-0 flex-1 sm:flex-none">
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
              className="!py-1 !px-2 w-full sm:w-48 text-sm font-medium"
              aria-label="Project title"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="text-sm font-medium text-fg hover:text-accent transition-colors px-1 font-display truncate max-w-[140px] sm:max-w-none block text-left"
            >
              {project?.title || 'Untitled'}
            </button>
          )}
        </div>
        <Badge variant={saveBadge.variant} className="shrink-0">
          {StatusIcon && <StatusIcon className={`w-3 h-3 ${saveBadge.spin ? 'animate-spin' : ''}`} />}
          <span className="hidden sm:inline">{saveBadge.label}</span>
        </Badge>
        <div className="flex-1 hidden md:block" />
        <div className="hidden md:flex items-center gap-2 shrink-0">
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
            <Save className="w-4 h-4" />
            <span className="hidden lg:inline">Save</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePreview}>
            <Eye className="w-4 h-4" />
            <span className="hidden lg:inline">Preview</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleExport('html')}>
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Export</span>
          </Button>
          <IconButton onClick={() => handleExport('json')} title="Export JSON" aria-label="Export JSON">
            <FileJson className="w-4 h-4" />
          </IconButton>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-1 md:hidden shrink-0">
          <Button
            variant={isDirty ? 'primary' : 'secondary'}
            size="sm"
            onClick={saveProject}
            disabled={saving || !isDirty}
            className="!px-2.5"
            aria-label="Save project"
          >
            <Save className="w-4 h-4" />
          </Button>
          <div className="relative" ref={moreRef}>
            <IconButton onClick={() => setShowMore((v) => !v)} aria-label="More actions" aria-expanded={showMore}>
              <MoreVertical className="w-4 h-4" />
            </IconButton>
            {showMore && (
              <div className="absolute right-0 top-full mt-1 w-52 py-1 bg-bg-elevated border border-border rounded-lg shadow-lg z-50 animate-fade-in">
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg-subtle flex items-center gap-2" onClick={handlePreview}>
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg-subtle flex items-center gap-2" onClick={() => handleExport('html')}>
                  <Download className="w-4 h-4" /> Export HTML
                </button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg-subtle flex items-center gap-2" onClick={() => handleExport('json')}>
                  <FileJson className="w-4 h-4" /> Export JSON
                </button>
                <div className="divider my-1" />
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-fg-muted">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-10 flex items-center justify-center gap-2 px-3 border-t border-border md:hidden">
        <DeviceSwitcher value={previewMode} onChange={setPreviewMode} />
        <div className="divider-v" />
        <IconButton onClick={undo} disabled={historyIndex <= 0} title="Undo" aria-label="Undo">
          <Undo2 className="w-4 h-4" />
        </IconButton>
        <IconButton onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" aria-label="Redo">
          <Redo2 className="w-4 h-4" />
        </IconButton>
        <input
          type="range"
          min={50}
          max={150}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-20 sm:w-24 accent-accent"
          aria-label={`Zoom ${zoom}%`}
        />
        <span className="text-xs text-fg-subtle w-8 tabular-nums shrink-0">{zoom}%</span>
      </div>
    </header>
  )
}

export default memo(BuilderNavbar)
