import { useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { PropertyPanelConnected } from './PropertyPanel';
import { FunnelGuideBanner } from './FunnelGuideBanner';
import { ContextualFormatBar } from './ContextualFormatBar';
import { useEditor } from '../context/EditorContext';
import { LayoutTemplate, Sparkles, PenTool, Monitor, Smartphone, Tablet } from 'lucide-react';
import { STARTER_TEMPLATES, HOME_STARTER_TEMPLATES, OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES } from '../templates/starterTemplates';
import { applyStarterHtml, applyStarterTemplate } from '../utils/blockActions';
import useStore from '../../store/useStore';

export function EditorShell({
  projectTitle,
  breadcrumbLabel,
  breadcrumbHref,
  funnelPageType,
  isDirty,
  saving,
  canvasRef,
  onSave,
  onPreview,
  onPublish,
  onExportCurrent,
  onExportAll,
}) {
  const { isEmpty, dragDebug, device, editor, customWidth, customHeight, setCustomWidth, setCustomHeight, campaignId } = useEditor();
  const updateCampaign = useStore((s) => s.updateCampaign);

  const isMobile = device === 'Mobile';
  const isTablet = device === 'Tablet';
  const isCustom = device === 'Custom';
  const isConstrained = isMobile || isTablet || isCustom;

  const handleDragStart = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = parseInt(customWidth || '500');
    const startH = customHeight ? parseInt(customHeight) : 800;
    
    const onMouseMove = (moveEvent) => {
      if (type === 'width' || type === 'both') {
        const deltaX = moveEvent.clientX - startX;
        const newW = Math.max(320, startW + deltaX * 2);
        setCustomWidth(newW.toString());
      }
      if (type === 'height' || type === 'both') {
        const deltaY = moveEvent.clientY - startY;
        const newH = Math.max(200, startH + deltaY);
        setCustomHeight(newH.toString());
      }
    };
    
    const onMouseUp = () => {
      document.body.classList.remove('tc-is-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.body.classList.add('tc-is-dragging');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const deviceFrameStyle = isMobile
    ? { width: '375px', maxWidth: '375px', height: '812px', minHeight: '812px' }
    : isTablet
    ? { width: '768px', maxWidth: '768px', height: '1024px', minHeight: '1024px' }
    : isCustom
    ? { 
        width: customWidth ? `${customWidth}px` : '1000px',
        maxWidth: '100%',
        height: customHeight ? `${customHeight}px` : '750px',
        minHeight: customHeight ? `${customHeight}px` : '750px'
      }
    : { width: '1200px', maxWidth: '100%', height: '750px', minHeight: '750px' };

  const quickTemplates = STARTER_TEMPLATES.slice(0, 3);

  const deviceLabel = isMobile ? 'Mobile View (375 × 812)' : isTablet ? 'Tablet View (768 × 1024)' : isCustom ? `Custom (${customWidth || 1000} × ${customHeight || 750})` : 'Desktop View (1200 × 750)';
  const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Monitor;

  return (
    <div className="tc-builder flex flex-col h-full min-h-0 bg-slate-50 text-slate-800">
      <EditorToolbar
        projectTitle={projectTitle}
        breadcrumbLabel={breadcrumbLabel}
        breadcrumbHref={breadcrumbHref}
        isDirty={isDirty}
        saving={saving}
        onSave={onSave}
        onPreview={onPreview}
        onPublish={onPublish}
        onExportCurrent={onExportCurrent}
        onExportAll={onExportAll}
      />

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <EditorSidebar />

        <main className="tc-canvas-area flex-1 min-w-0 flex flex-col relative overflow-hidden bg-[#e2e8f0]">
          <FunnelGuideBanner pageType={funnelPageType} />

          {/* Canva Contextual Format Bar */}
          <ContextualFormatBar />

          <div className="flex-1 min-h-0 overflow-auto p-6 md:p-10 flex flex-col items-center justify-start relative" style={{ scrollBehavior: 'smooth' }}>
            {/* Artboard Frame Header Badge */}
            <div className="mb-3 px-3.5 py-1 rounded-full bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 flex items-center gap-2 shadow-sm shrink-0">
              <DeviceIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>{deviceLabel}</span>
            </div>

            <div
              className="relative w-full max-w-full flex justify-center"
              style={isCustom ? {
                width: customWidth ? `${customWidth}px` : '1000px',
                maxWidth: '100%',
                height: customHeight ? `${customHeight}px` : '750px',
              } : {}}
            >
              <div
                className={`tc-page-frame tc-drop-zone rounded-2xl shadow-2xl shadow-black/50 border border-slate-700/60 bg-white relative overflow-hidden ${
                  dragDebug.isOverCanvas ? 'tc-drop-zone--over' : ''
                } ${dragDebug.isDragging ? 'tc-drop-zone--dragging' : ''}`}
                style={{
                  ...deviceFrameStyle,
                  transition: 'none',
                }}
              >
                <div
                  ref={canvasRef}
                  className="gjs-editor-host absolute inset-0 w-full h-full"
                  style={{
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                    borderRadius: 'inherit',
                  }}
                />

                {isEmpty && !dragDebug.isDragging && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 z-10 bg-slate-50/95 backdrop-blur-sm rounded-2xl">
                    <div className="p-4 rounded-3xl bg-purple-100 text-purple-600 shadow-md">
                      <LayoutTemplate className="w-8 h-8" />
                    </div>
                    <div className="text-center max-w-md">
                      <p className="text-base font-bold text-slate-800">
                        {funnelPageType ? `Start building your ${funnelPageType} page` : 'Start building your page'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Choose a ready-made Canva Studio template or start with a blank custom artboard.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 pointer-events-auto w-full max-w-lg mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(() => {
                          let templatesToUse = quickTemplates;
                          if (funnelPageType === 'HOME') templatesToUse = HOME_STARTER_TEMPLATES.slice(0, 2);
                          else if (funnelPageType === 'OTP') templatesToUse = OTP_STARTER_TEMPLATES.slice(0, 2);
                          else if (funnelPageType === 'CONFIRM') templatesToUse = CONFIRM_STARTER_TEMPLATES.slice(0, 2);

                          return templatesToUse.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                editor &&
                                applyStarterTemplate(editor, t, {
                                  campaignId,
                                  updateCampaign,
                                })
                              }
                              className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-purple-500 hover:bg-purple-50/50 transition-all shadow-sm text-center group"
                            >
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs group-hover:text-purple-700">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                Use {t.name}
                              </div>
                              <div className="text-[10px] text-slate-400">Ready-made layout</div>
                            </button>
                          ));
                        })()}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => editor && applyStarterHtml(editor, '<div style="padding:40px;text-align:center;">Empty Custom Page</div>', '')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-100/50 transition-all text-xs font-bold text-slate-700"
                      >
                        <PenTool className="w-4 h-4 shrink-0 text-slate-500" />
                        Create Custom (Start from scratch)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isCustom && (
                <>
                  <div
                    className="absolute top-1/2 -right-3 w-6 h-12 bg-white border border-gray-300 rounded shadow-sm cursor-ew-resize flex items-center justify-center -translate-y-1/2 z-50 hover:bg-gray-50"
                    onMouseDown={(e) => handleDragStart(e, 'width')}
                  >
                    <div className="w-1 h-4 border-l border-r border-gray-300"></div>
                  </div>
                  <div
                    className="absolute -bottom-3 left-1/2 w-12 h-6 bg-white border border-gray-300 rounded shadow-sm cursor-ns-resize flex items-center justify-center -translate-x-1/2 z-50 hover:bg-gray-50"
                    onMouseDown={(e) => handleDragStart(e, 'height')}
                  >
                    <div className="w-4 h-1 border-t border-b border-gray-300"></div>
                  </div>
                  <div
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border border-gray-300 rounded shadow-sm cursor-nwse-resize flex items-center justify-center z-50 hover:bg-gray-50"
                    onMouseDown={(e) => handleDragStart(e, 'both')}
                  >
                    <div className="w-2 h-2 rounded-full border border-gray-400"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <PropertyPanelConnected />
      </div>
    </div>
  );
}

export default EditorShell;

