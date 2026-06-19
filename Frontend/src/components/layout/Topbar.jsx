import React, { useState } from 'react';

export default function Topbar({
  previewMode = 'desktop',
  onChangePreviewMode,
  zoom = 100,
  onChangeZoom,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isDirty = false,
  onSave,
  onPreview,
  onExport,
  className = ''
}) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);

  const ZOOM_OPTIONS = [50, 75, 100, 125, 150];

  const handleZoomSelect = (val) => {
    onChangeZoom(val);
    setShowZoomDropdown(false);
  };

  return (
    <div className={`h-[52px] bg-[#181818] border-b border-[#252525] px-4 flex items-center justify-between shrink-0 select-none z-30 ${className}`}>
      
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => alert('Navigating back to Dashboard...')}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#aaaaaa] hover:text-[#e8e8e8] transition-colors"
        >
          <i className="ti ti-arrow-left text-sm" />
          <span>Dashboard</span>
        </button>

        <div className="w-px h-4 bg-[#252525]" />

        {/* Text 'AA' Typography indicator */}
        <div className="flex items-center gap-1 text-[#aaaaaa] font-bold text-xs bg-[#111111] px-2 py-0.5 rounded border border-[#252525]" title="Plus Jakarta Sans font loaded">
          <i className="ti ti-typography text-xs text-[#6B5CE7]" />
          <span>AA</span>
        </div>

        {/* Unsaved Badge */}
        {isDirty ? (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-full text-[10px] font-bold text-[#f59e0b] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            <span>Unsaved Changes</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full text-[10px] font-bold text-[#10b981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Synced</span>
          </div>
        )}
      </div>

      {/* CENTER SECTION */}
      <div className="flex items-center gap-4">
        
        {/* Device Switcher */}
        <div className="flex bg-[#111111] p-0.5 rounded-lg border border-[#252525]">
          {[
            { id: 'desktop', icon: 'ti-device-desktop', tooltip: 'Desktop View' },
            { id: 'tablet', icon: 'ti-device-tablet', tooltip: 'Tablet View (768px)' },
            { id: 'mobile', icon: 'ti-device-mobile', tooltip: 'Mobile View (375px)' }
          ].map((device) => {
            const isActive = previewMode === device.id;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => onChangePreviewMode(device.id)}
                title={device.tooltip}
                className={`
                  p-1.5 rounded-md transition-all duration-200 flex items-center justify-center
                  ${isActive
                    ? 'bg-[#6B5CE7] text-white shadow-sm shadow-[#6B5CE7]/20'
                    : 'text-[#666666] hover:text-[#aaaaaa]'
                  }
                `}
              >
                <i className={`ti ${device.icon} text-base`} />
              </button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-[#252525]" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`
              p-1.5 rounded-lg border flex items-center justify-center transition-all duration-200
              ${canUndo
                ? 'bg-[#111111] border-[#252525] text-[#e8e8e8] hover:border-[#666666] hover:bg-[#181818]'
                : 'border-[#252525]/30 text-[#444444] cursor-not-allowed'
              }
            `}
          >
            <i className="ti ti-arrow-back-up text-base" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`
              p-1.5 rounded-lg border flex items-center justify-center transition-all duration-200
              ${canRedo
                ? 'bg-[#111111] border-[#252525] text-[#e8e8e8] hover:border-[#666666] hover:bg-[#181818]'
                : 'border-[#252525]/30 text-[#444444] cursor-not-allowed'
              }
            `}
          >
            <i className="ti ti-arrow-forward-up text-base" />
          </button>
        </div>

        <div className="w-px h-4 bg-[#252525]" />

        {/* Zoom Level Indicator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowZoomDropdown(!showZoomDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold font-mono text-[#aaaaaa] hover:text-[#e8e8e8] bg-[#111111] border border-[#252525] rounded-lg transition-all"
          >
            <span>{zoom}%</span>
            <i className={`ti ${showZoomDropdown ? 'ti-chevron-up' : 'ti-chevron-down'} text-[10px]`} />
          </button>
          
          {showZoomDropdown && (
            <div className="absolute top-[32px] left-1/2 -translate-x-1/2 bg-[#181818] border border-[#252525] rounded-lg shadow-xl py-1 w-20 z-50 animate-glow">
              {ZOOM_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleZoomSelect(val)}
                  className={`
                    w-full text-center py-1 text-xs font-mono transition-colors
                    ${zoom === val ? 'bg-[#6B5CE7] text-white' : 'text-[#aaaaaa] hover:bg-[#111111] hover:text-[#e8e8e8]'}
                  `}
                >
                  {val}%
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#aaaaaa] hover:text-[#e8e8e8] hover:bg-[#111111] border border-[#252525] rounded-lg transition-all flex items-center gap-1.5"
        >
          <i className="ti ti-eye text-sm" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#aaaaaa] hover:text-[#e8e8e8] hover:bg-[#111111] border border-[#252525] rounded-lg transition-all flex items-center gap-1.5"
        >
          <i className="ti ti-download text-sm" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#6B5CE7] hover:bg-[#5b4cd4] rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-[#6B5CE7]/20"
        >
          <i className="ti ti-device-floppy text-sm" />
          <span>Save</span>
        </button>

        <div className="w-px h-4 bg-[#252525] mx-1" />

        <button
          type="button"
          onClick={() => alert('Additional Settings & Shortcuts Menu')}
          className="p-1.5 rounded-lg border border-[#252525] text-[#aaaaaa] hover:text-[#e8e8e8] hover:bg-[#111111] transition-all"
        >
          <i className="ti ti-dots-vertical text-base" />
        </button>
      </div>

    </div>
  );
}
