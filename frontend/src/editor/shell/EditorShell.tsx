import { useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { PropertyPanelConnected } from './PropertyPanel';
import { FunnelGuideBanner } from './FunnelGuideBanner';
import { useEditor } from '../context/EditorContext';
import { LayoutTemplate, Sparkles, PenTool } from 'lucide-react';
import { STARTER_TEMPLATES, HOME_STARTER_TEMPLATES, OTP_STARTER_TEMPLATES, CONFIRM_STARTER_TEMPLATES } from '../templates/starterTemplates';
import { applyStarterHtml } from '../utils/blockActions';

interface EditorShellProps {
  projectTitle: string;
  breadcrumbLabel?: string;
  breadcrumbHref?: string;
  funnelPageType?: string;
  isDirty?: boolean;
  saving?: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
}

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
}: EditorShellProps) {
  const { isEmpty, dragDebug, device, editor, customWidth, customHeight, setCustomWidth, setCustomHeight } = useEditor();

  const isMobile = device === 'Mobile';
  const isTablet = device === 'Tablet';
  const isCustom = device === 'Custom';
  const isConstrained = isMobile || isTablet || isCustom;

  const handleDragStart = (e: React.MouseEvent, type: 'width' | 'height' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = parseInt(customWidth || '500');
    // Default to 800 if height is not set so drag starts from a reasonable value
    const startH = customHeight ? parseInt(customHeight) : 800;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
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

  const deviceFrameStyle: React.CSSProperties = isMobile
    ? { maxWidth: '375px', width: '375px' }
    : isTablet
    ? { maxWidth: '768px', width: '768px' }
    : isCustom
    ? { 
        maxWidth: customWidth ? `${customWidth}px` : '100%', 
        width: customWidth ? `${customWidth}px` : '100%',
        height: customHeight ? `${customHeight}px` : 'auto',
        minHeight: customHeight ? `${customHeight}px` : '400px'
      }
    : { width: '100%', maxWidth: '100%', minHeight: '400px' };

  const scrollWrapperClass = isConstrained
    ? 'flex-1 min-h-0 overflow-auto p-6 md:p-8 bg-dot-grid flex justify-center items-start'
    : 'flex-1 min-h-0 overflow-auto p-6 md:p-8 bg-dot-grid';

  const quickTemplates = STARTER_TEMPLATES.slice(0, 3);

  return (
    <div className="tc-builder flex flex-col h-full min-h-0 bg-bg-canvas">
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

      <div className="flex flex-1 min-h-0">
        <EditorSidebar />

        <main className="tc-canvas-area flex-1 min-w-0 flex flex-col relative overflow-hidden">
          <FunnelGuideBanner pageType={funnelPageType} />
          <div className={scrollWrapperClass}>
            <div
              className={`tc-page-frame tc-drop-zone rounded-xl shadow-lg border bg-white relative ${
                dragDebug.isOverCanvas ? 'tc-drop-zone--over' : ''
              } ${dragDebug.isDragging ? 'tc-drop-zone--dragging' : ''}`}
              style={{
                ...deviceFrameStyle,
                overflow: isCustom ? 'hidden' : 'visible',
                transition: isCustom ? 'none' : 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div ref={canvasRef} className="gjs-editor-host absolute inset-0" style={{ pointerEvents: 'auto' }} />
              
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

              {isEmpty && !dragDebug.isDragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 z-10">
                  <div className="p-4 rounded-2xl bg-accent-muted text-accent">
                    <LayoutTemplate className="w-8 h-8" />
                  </div>
                  <div className="text-center max-w-md">
                    <p className="text-base font-semibold text-fg">
                      {funnelPageType ? `Start building your ${funnelPageType} page` : 'Start building your page'}
                    </p>
                    <p className="text-sm text-fg-muted mt-1">
                      Choose to start with a ready-made template or create a custom layout from scratch.
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
                            onClick={() => editor && applyStarterHtml(editor, t.html, t.css)}
                            className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg border border-border bg-bg-elevated hover:border-accent hover:bg-accent-muted/50 transition-colors shadow-sm text-center"
                          >
                            <div className="flex items-center gap-1.5 font-medium text-fg text-sm">
                              <Sparkles className="w-4 h-4 text-accent shrink-0" />
                              Use {t.name}
                            </div>
                            <div className="text-xs text-fg-muted">Ready-made layout</div>
                          </button>
                        ));
                      })()}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => editor && applyStarterHtml(editor, '<div style="padding:40px;text-align:center;">Empty Custom Page</div>', '')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-transparent hover:border-fg hover:bg-bg-muted transition-colors text-sm font-medium text-fg"
                    >
                      <PenTool className="w-4 h-4 shrink-0" />
                      Create Custom (Start from scratch)
                    </button>
                  </div>
                </div>
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
