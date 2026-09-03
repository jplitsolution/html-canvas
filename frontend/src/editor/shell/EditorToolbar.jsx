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
  Sparkles,
  Home,
  CheckCircle2,
  Clock
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
  const { editor, device, setDevice, switchDevice, zoom, setZoom, customWidth, customHeight, setCustomWidth, setCustomHeight } = useEditor();
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
    { id: 'Mobile', icon: Smartphone, label: 'Phone' },
    { id: 'Tablet', icon: Tablet, label: 'Tablet' },
    { id: 'Custom', icon: Maximize, label: 'Custom' },
  ];

  return (
    <header className="tc-toolbar shrink-0 h-14 flex items-center justify-between gap-3 px-4 bg-white text-slate-800 border-b border-slate-200 shadow-sm relative z-30 select-none">
      {/* Left Section: Back, Studio Brand & Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={breadcrumbHref || "/markets"}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-xs font-semibold shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
          <Home className="w-3.5 h-3.5 hidden sm:inline" />
        </Link>

        <div className="h-5 w-px bg-slate-200 shrink-0" />

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-bold text-slate-800 truncate tracking-tight">{projectTitle || 'Untitled Studio Project'}</h1>
              <span
                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  saving
                    ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                    : isDirty
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}
              >
                {saving ? (
                  <>
                    <Clock className="w-2.5 h-2.5" /> Saving…
                  </>
                ) : isDirty ? (
                  'Unsaved'
                ) : (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Saved
                  </>
                )}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Canva Studio Funnel Editor</span>
          </div>
        </div>
      </div>

      {/* Center Section: Device Switcher & Zoom Controls */}
      <div className="hidden lg:flex items-center gap-3">
        {/* Device Switcher Pills */}
        <div className="flex items-center gap-1.5">
          {devices.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (switchDevice) switchDevice(id);
                else {
                  editor?.setDevice(id);
                  setDevice(id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                device === id
                  ? 'bg-indigo-50/80 border-2 border-indigo-600 text-indigo-700 shadow-sm font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

          {device === 'Custom' && (
            <div className="flex items-center gap-1 ml-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="w-12 text-xs rounded text-slate-800 text-center focus:outline-none font-medium"
                placeholder="W"
                title="Width (px)"
              />
              <span className="text-slate-400 text-xs">×</span>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className="w-12 text-xs rounded text-slate-800 text-center focus:outline-none font-medium"
                placeholder="H"
                title="Height (px)"
              />
            </div>
          )}
        </div>

        {/* Zoom Control */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => handleZoom(-10)}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-slate-700 w-9 text-center font-mono">{zoom}%</span>
          <button
            type="button"
            onClick={() => handleZoom(10)}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Section: Undo/Redo, Export, Save, Save & Preview CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => editor?.UndoManager.undo()}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.UndoManager.redo()}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onPreview}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Preview</span>
        </button>

        <div className="relative hidden sm:block" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] py-2 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setExportOpen(false);
                  onExportCurrent();
                }}
              >
                Current page (.html)
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Canva Signature Indigo CTA */}
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm border border-indigo-600 transition-all active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Save &amp; preview</span>
        </button>
      </div>
    </header>
  );
}

export default EditorToolbar;

