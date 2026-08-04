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
  Maximize,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import { setCanvasZoom, getCanvasZoom, syncCanvasFrameHeight } from '../plugins/canvasEnhancements';

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
}) {
  const { editor, device, setDevice, zoom, setZoom, customWidth, customHeight, setCustomWidth, setCustomHeight } = useEditor();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportOpen]);

  const handleZoom = (delta) => {
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
    { id: 'Custom', icon: Maximize, label: 'Custom' },
  ];

  const saveStatus = saving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved';
  const saveStatusTitle = saving
    ? 'Saving your page...'
    : isDirty
    ? 'You have unsaved changes'
    : 'All changes saved';

  return (
    <header className="tc-toolbar shrink-0 h-12 flex items-center gap-1.5 px-2 sm:px-3 border-b border-border bg-bg-elevated/95 backdrop-blur-sm overflow-hidden">
      {breadcrumbHref ? (
        <Link
          to={breadcrumbHref}
          className="inline-flex items-center gap-1.5 p-1.5 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors shrink-0 max-w-[120px] lg:max-w-[180px]"
          title="Back to campaign"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate hidden md:inline text-xs">{breadcrumbLabel}</span>
        </Link>
      ) : (
        <Link
          to="/markets"
          className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors shrink-0"
          title="Back to markets"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}

      <div className="h-5 w-px bg-border shrink-0 hidden sm:block" />

      <div className="min-w-0 max-w-[140px] lg:max-w-[200px] shrink overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-fg truncate">{projectTitle}</h1>
          <span
            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
              saving
                ? 'bg-amber-50 text-amber-700'
                : isDirty
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
            title={saveStatusTitle}
          >
            {saveStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-2" />

      <div className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-gray-100/80 border border-gray-200/50 shadow-inner shrink-0" title="Preview size">
        {devices.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => {
              editor?.setDevice(id);
              setDevice(id);
            }}
            className={`px-2 lg:px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              device === id 
                ? 'bg-white text-indigo-600 shadow-xs border border-gray-200/40 font-bold scale-[1.02]' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
        
        {device === 'Custom' && (
          <div className="flex items-center gap-1 ml-2 mr-1">
            <input 
              type="number" 
              value={customWidth} 
              onChange={(e) => setCustomWidth(e.target.value)} 
              className="w-16 px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-indigo-500 bg-white text-center" 
              placeholder="W" 
              title="Width (px)"
            />
            <span className="text-gray-400 text-xs">x</span>
            <input 
              type="number" 
              value={customHeight} 
              onChange={(e) => setCustomHeight(e.target.value)} 
              className="w-16 px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-indigo-500 bg-white text-center" 
              placeholder="H" 
              title="Height (px)"
            />
          </div>
        )}
      </div>

      <div className="hidden xl:flex items-center gap-1 p-1 rounded-xl bg-gray-50 border border-gray-200/60 shadow-2xs shrink-0">
        <button type="button" onClick={() => handleZoom(-10)} className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-gray-600 w-10 text-center font-mono">{zoom}%</span>
        <button type="button" onClick={() => handleZoom(10)} className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100" title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-200 shrink-0 hidden sm:block" />

      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={() => editor?.UndoManager.undo()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor?.UndoManager.redo()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 shrink-0 transition-all duration-200"
        title="See how your page looks"
      >
        <Eye className="w-3.5 h-3.5 text-gray-500" />
        <span className="hidden lg:inline">Preview</span>
      </button>

      <div className="relative hidden sm:block shrink-0" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200"
          title="Download HTML file"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden lg:inline">Export</span>
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 shrink-0 transition-all duration-200 disabled:opacity-50"
        title="Save your work"
      >
        <Save className="w-3.5 h-3.5 text-gray-500" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={onPublish}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border border-indigo-700/25 shrink-0 transition-all duration-200"
        title="Save and open preview"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Save &amp; preview</span>
        <span className="lg:hidden hidden sm:inline">Publish</span>
      </button>
    </header>
  );
}

export default EditorToolbar;
