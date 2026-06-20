import {
  Save,
  Eye,
  Rocket,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Search,
  ArrowLeft,
  Download,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { setCanvasZoom, getCanvasZoom } from '../plugins/canvasEnhancements';

interface EditorToolbarProps {
  projectTitle: string;
  isDirty?: boolean;
  saving?: boolean;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
  onSearchFocus?: () => void;
}

// ✅ Use 'export function'
export function EditorToolbar({
  projectTitle,
  isDirty,
  saving,
  onSave,
  onPreview,
  onPublish,
  onExportCurrent,
  onExportAll,
  onSearchFocus,
}: EditorToolbarProps) {
  const navigate = useNavigate();
  const { editor, device, setDevice, zoom, setZoom } = useEditor();
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportOpen]);

  const handleZoom = (delta: number) => {
    if (!editor) return;
    const next = Math.min(150, Math.max(50, getCanvasZoom(editor) + delta));
    setCanvasZoom(editor, next);
    setZoom(next);
  };

  const devices = [
    { id: 'Desktop', icon: Monitor },
    { id: 'Tablet', icon: Tablet },
    { id: 'Mobile', icon: Smartphone },
  ] as const;

  return (
    <header className="tc-toolbar shrink-0 h-14 flex items-center gap-2 px-3 border-b border-border bg-bg-elevated/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
        title="Back to dashboard"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-border hidden sm:block" />

      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-fg truncate">{projectTitle}</h1>
        <p className="text-[11px] text-fg-muted">
          {saving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-bg-subtle border border-border">
        {devices.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={id}
            onClick={() => {
              editor?.setDevice(id);
              setDevice(id);
            }}
            className={`p-2 rounded-md transition-colors ${
              device === id ? 'bg-bg-elevated text-accent shadow-sm' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-1 p-1 rounded-lg bg-bg-subtle border border-border">
        <button type="button" onClick={() => handleZoom(-10)} className="p-2 rounded-md text-fg-muted hover:text-fg" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-fg-muted w-10 text-center">{zoom}%</span>
        <button type="button" onClick={() => handleZoom(10)} className="p-2 rounded-md text-fg-muted hover:text-fg" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setSearchOpen(!searchOpen);
          onSearchFocus?.();
        }}
        className="p-2 rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg hidden sm:block"
        title="Search components"
      >
        <Search className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => editor?.UndoManager.undo()} className="p-2 rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg" title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor?.UndoManager.redo()} className="p-2 rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg" title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-fg border border-border bg-bg-subtle hover:bg-bg-muted transition-colors"
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>

      <div className="relative hidden sm:block" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-fg border border-border bg-bg-subtle hover:bg-bg-muted transition-colors"
          title="Export HTML"
        >
          <Download className="w-4 h-4" />
          Export
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] py-1 rounded-lg border border-border bg-bg-elevated shadow-lg">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg-subtle"
              onClick={() => {
                setExportOpen(false);
                onExportCurrent();
              }}
            >
              Current page (.html)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg-subtle"
              onClick={() => {
                setExportOpen(false);
                onExportAll();
              }}
            >
              All pages (.zip)
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onExportCurrent}
        className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-fg border border-border bg-bg-subtle hover:bg-bg-muted transition-colors"
        title="Export HTML"
      >
        <Download className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-fg border border-border bg-bg-subtle hover:bg-bg-muted transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={onPublish}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover shadow-sm transition-colors"
      >
        <Rocket className="w-4 h-4" />
        <span className="hidden sm:inline">Publish</span>
      </button>
    </header>
  );
}

export default EditorToolbar;