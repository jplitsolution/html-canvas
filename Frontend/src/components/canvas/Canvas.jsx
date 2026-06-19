import React from 'react';
import NavbarBlock from './NavbarBlock';
import HeaderBlock from './HeaderBlock';

export default function Canvas({
  blocks = [],
  selectedBlockId,
  onSelectBlock,
  previewMode = 'desktop',
  zoom = 100
}) {
  // Map device modes to CSS widths
  const widthMap = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  const canvasWidth = widthMap[previewMode] || '100%';

  const handleCanvasClick = (e) => {
    // Deselect all when clicking empty canvas areas
    if (e.target === e.currentTarget) {
      onSelectBlock(null);
    }
  };

  return (
    <div
      onClick={handleCanvasClick}
      className="flex-1 overflow-auto bg-[#111111] p-8 flex items-start justify-center relative select-none"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% 0%, rgba(107, 92, 231, 0.15) 0%, rgba(107, 92, 231, 0) 70%),
          radial-gradient(ellipse at 50% 100%, rgba(107, 92, 231, 0.05) 0%, rgba(107, 92, 231, 0) 70%),
          radial-gradient(rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 24px 24px'
      }}
    >
      {/* Zoom scale wrapper */}
      <div
        className="canvas-scale-transition w-full flex justify-center items-start origin-top"
        style={{
          transform: `scale(${zoom / 100})`,
          width: '100%'
        }}
      >
        {/* Device frame container */}
        <div
          style={{ width: canvasWidth }}
          className={`
            transition-all duration-300 min-h-[680px] p-6 bg-gradient-to-b from-[#171717] to-[#111111] border border-[#252525] rounded-xl flex flex-col gap-6 shadow-2xl relative
            hover:border-[#6B5CE7]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.7),_0_0_24px_-4px_rgba(107,92,231,0.1)]
            ${previewMode !== 'desktop' ? 'max-w-[100%] ring-8 ring-[#252525]/30' : ''}
          `}
        >
          {/* Device status header (only shown for non-desktop preview frames) */}
          {previewMode !== 'desktop' && (
            <div className="absolute -top-7 left-0 right-0 flex items-center justify-between px-3 text-[10px] font-bold text-[#666666] tracking-wider uppercase select-none">
              <span>{previewMode === 'tablet' ? 'Tablet (768px)' : 'Mobile (375px)'}</span>
              <span>100% Responsive</span>
            </div>
          )}

          {/* Render Blocks */}
          {blocks.map((block) => {
            if (block.id === 'navbar-section') {
              return (
                <NavbarBlock
                  key={block.id}
                  properties={block.properties}
                  isSelected={selectedBlockId === block.id}
                  onClick={() => onSelectBlock(block.id)}
                />
              );
            }
            if (block.id === 'header-section') {
              return (
                <HeaderBlock
                  key={block.id}
                  properties={block.properties}
                  isSelected={selectedBlockId === block.id}
                  onClick={() => onSelectBlock(block.id)}
                />
              );
            }
            
            // Generic Fallback Blocks
            const isSelected = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock(block.id);
                }}
                className={`
                  p-6 rounded-xl border relative cursor-pointer group transition-all duration-200
                  ${isSelected 
                    ? 'border-2 border-dashed border-[#6B5CE7] bg-[#6B5CE7]/5 shadow-[0_0_20px_rgba(107,92,231,0.2)]' 
                    : 'border-[#252525] hover:border-neutral-600 hover:bg-neutral-900/40'}
                `}
                style={{
                  color: block.properties?.textColor || '#e8e8e8',
                  backgroundColor: block.properties?.bgColor || '#1e1e1e',
                  paddingTop: `${block.properties?.paddingTop || 24}px`,
                  paddingBottom: `${block.properties?.paddingBottom || 24}px`,
                  borderRadius: `${block.properties?.borderRadius || 12}px`
                }}
              >
                {isSelected && (
                  <span className="absolute -top-3 left-4 z-10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white bg-[#6B5CE7] border border-[#6B5CE7] rounded-md uppercase">
                    {block.title}
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold">{block.properties?.title || block.title}</h3>
                  <p className="text-sm text-[#aaaaaa]">{block.properties?.subtitle || block.description}</p>
                </div>
              </div>
            );
          })}

          {blocks.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#252525] bg-[#6B5CE7]/5 rounded-xl p-12 text-center text-[#666666] select-none min-h-[400px]">
              <div className="mb-4 p-4 rounded-2xl bg-[#6B5CE7]/10 border border-[#6B5CE7]/20 text-[#6B5CE7] shadow-inner animate-pulse">
                <i className="ti ti-layout-grid-add text-3xl" />
              </div>
              <p className="text-sm font-bold text-white tracking-wide font-display">Canvas Workspace</p>
              <p className="text-xs text-neutral-400 mt-1.5 max-w-xs leading-relaxed">
                Click components in the left library panel to construct your page layout
              </p>
              <div className="mt-6 w-24 h-0.5 bg-gradient-to-r from-transparent via-[#6B5CE7]/30 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
