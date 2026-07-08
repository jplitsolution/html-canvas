import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { PropertyPanelConnected } from './PropertyPanel';
import { FunnelGuideBanner } from './FunnelGuideBanner';
import { useEditor } from '../context/EditorContext';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { STARTER_TEMPLATES } from '../templates/starterTemplates';
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
  const { isEmpty, dragDebug, device, editor } = useEditor();

  const isMobile = device === 'Mobile';
  const isTablet = device === 'Tablet';
  const isConstrained = isMobile || isTablet;

  const deviceFrameStyle: React.CSSProperties = isMobile
    ? { maxWidth: '375px', width: '375px' }
    : isTablet
    ? { maxWidth: '768px', width: '768px' }
    : { width: '100%', maxWidth: '100%' };

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
              className={`tc-page-frame tc-drop-zone min-h-[900px] rounded-xl shadow-lg border bg-white relative ${
                dragDebug.isOverCanvas ? 'tc-drop-zone--over' : ''
              } ${dragDebug.isDragging ? 'tc-drop-zone--dragging' : ''}`}
              style={{
                ...deviceFrameStyle,
                transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div ref={canvasRef} className="gjs-editor-host absolute inset-0 min-h-[900px]" />

              {isEmpty && !dragDebug.isDragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 z-10">
                  <div className="p-4 rounded-2xl bg-accent-muted text-accent">
                    <LayoutTemplate className="w-8 h-8" />
                  </div>
                  <div className="text-center max-w-md">
                    <p className="text-base font-semibold text-fg">
                      {funnelPageType ? 'This page is empty' : 'Start building your page'}
                    </p>
                    <p className="text-sm text-fg-muted mt-1">
                      {funnelPageType
                        ? 'Go back to the campaign and click “Apply default templates” to load the subscription page with all required buttons.'
                        : 'Pick a ready-made layout below, or drag a section from the left panel onto this page.'}
                    </p>
                  </div>

                  {!funnelPageType && (
                    <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto w-full max-w-lg">
                      {quickTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => editor && applyStarterHtml(editor, t.html, t.css)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-bg-elevated hover:border-accent hover:bg-accent-muted/50 text-sm font-medium text-fg transition-colors shadow-sm"
                        >
                          <Sparkles className="w-4 h-4 text-accent shrink-0" />
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-fg-subtle text-center max-w-sm">
                    {funnelPageType
                      ? 'Do not use generic layouts here — they remove Subscribe / OTP / Confirm buttons.'
                      : 'No coding needed — click anything on the page to edit text, colors, and images.'}
                  </p>
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
