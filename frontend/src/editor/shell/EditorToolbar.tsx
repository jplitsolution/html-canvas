import {
  Save,
  Eye,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Download,
  ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { setCanvasZoom, getCanvasZoom, syncCanvasFrameHeight } from '../plugins/canvasEnhancements';

interface EditorToolbarProps {
  projectTitle: string;
  breadcrumbLabel?: string;
  breadcrumbHref?: string;
  isDirty?: boolean;
  saving?: boolean;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
}

export function EditorToolbar({
  projectTitle,
  breadcrumbLabel,
  breadcrumbHref,
  isDirty,
  saving,
  onSave,
  onPreview,
  onPublish,
  onExportCurrent,
  onExportAll,
}: EditorToolbarProps) {
  const { editor, device, setDevice, zoom, setZoom } = useEditor();
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
    syncCanvasFrameHeight(editor);
  };

  const devices = [
    { id: 'Desktop', icon: Monitor, label: 'Desktop' },
    { id: 'Tablet', icon: Tablet, label: 'Tablet' },
    { id: 'Mobile', icon: Smartphone, label: 'Phone' },
  ] as const;

  return (
    <header className="tc-toolbar shrink-0 h-14 flex items-center gap-2 px-3 border-b border-border bg-bg-elevated/95 backdrop-blur-sm">
      {breadcrumbHref ? (
        <Link
          to={breadcrumbHref}
          className="inline-flex items-center gap-1.5 p-2 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors max-w-[140px] sm:max-w-[200px]"
          title="Back to campaign"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate hidden sm:inline">{breadcrumbLabel}</span>
        </Link>
      ) : (
        <Link
          to="/campaigns"
          className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
          title="Back to campaigns"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}

      <div className="h-6 w-px bg-border hidden sm:block" />

      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-fg truncate">{projectTitle}</h1>
        <p className="text-[11px] text-fg-muted">
          {saving ? 'Saving your page...' : isDirty ? 'You have unsaved changes' : 'All changes saved'}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-gray-100/80 border border-gray-200/50 shadow-inner" title="Preview size">
        {devices.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => {
              editor?.setDevice(id);
              setDevice(id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              device === id 
                ? 'bg-white text-indigo-600 shadow-xs border border-gray-200/40 font-bold scale-[1.02]' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-xl bg-gray-50 border border-gray-200/60 shadow-2xs">
        <button type="button" onClick={() => handleZoom(-10)} className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-gray-600 w-11 text-center font-mono">{zoom}%</span>
        <button type="button" onClick={() => handleZoom(10)} className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => editor?.UndoManager.undo()} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor?.UndoManager.redo()} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 shadow-2xs hover:shadow-xs transition-all duration-200"
        title="See how your page looks"
      >
        <Eye className="w-3.5 h-3.5 text-gray-500" />
        Preview
      </button>

      <div className="relative hidden sm:block" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 shadow-2xs hover:shadow-xs transition-all duration-200"
          title="Download HTML file"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          Export
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] py-1.5 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setExportOpen(false);
                onExportCurrent();
              }}
            >
              This page (.html)
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 shadow-2xs hover:shadow-xs transition-all duration-200 disabled:opacity-50"
        title="Save your work"
      >
        <Save className="w-3.5 h-3.5 text-gray-500" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={onPublish}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border border-indigo-700/25 transition-all duration-200"
        title="Save and open preview"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Save &amp; preview</span>
      </button>
    </header>
  );
}

export default EditorToolbar;
