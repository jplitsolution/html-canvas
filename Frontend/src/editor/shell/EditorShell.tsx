import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { PropertyPanelConnected } from './PropertyPanel';
import { useEditor } from '../context/EditorContext';
import { LayoutTemplate } from 'lucide-react';

interface EditorShellProps {
  projectTitle: string;
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
  isDirty,
  saving,
  canvasRef,
  onSave,
  onPreview,
  onPublish,
  onExportCurrent,
  onExportAll,
}: EditorShellProps) {
  const { isEmpty, dragDebug, device } = useEditor();

  // For Mobile/Tablet: constrain the page frame to the device width and center it.
  // GrapesJS also sets the frame wrapper width internally via deviceManager.
  // The outer CSS here ensures the React layout container aligns with the preview size.
  const isMobile = device === 'Mobile';
  const isTablet = device === 'Tablet';
  const isConstrained = isMobile || isTablet;

  const deviceFrameStyle: React.CSSProperties = isMobile
    ? { maxWidth: '375px', width: '375px' }
    : isTablet
    ? { maxWidth: '768px', width: '768px' }
    : { width: '100%', maxWidth: '100%' };

  // Canvas scroll wrapper: centered for mobile/tablet, scrollable for desktop
  const scrollWrapperClass = isConstrained
    ? 'flex-1 min-h-0 overflow-auto p-6 md:p-8 bg-stripe-pattern flex justify-center items-start'
    : 'flex-1 min-h-0 overflow-auto p-6 md:p-8 bg-stripe-pattern';

  return (
    <div className="tc-builder flex flex-col h-full min-h-0 bg-bg-canvas">
      <EditorToolbar
        projectTitle={projectTitle}
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
          <div className={scrollWrapperClass}>
            <div
              className={`tc-page-frame tc-drop-zone min-h-[min(800px,100%)] rounded-xl shadow-lg border bg-white relative ${
                dragDebug.isOverCanvas ? 'tc-drop-zone--over' : ''
              } ${dragDebug.isDragging ? 'tc-drop-zone--dragging' : ''}`}
              style={{
                ...deviceFrameStyle,
                // Prevent GrapesJS iframe internal content from spilling outside
                overflow: 'hidden',
                // Smooth width transition when switching devices
                transition: 'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div ref={canvasRef} className="gjs-editor-host absolute inset-0 min-h-[600px]" />

              {isEmpty && !dragDebug.isDragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3 p-8 z-10">
                  <div className="p-4 rounded-2xl bg-accent-muted text-accent">
                    <LayoutTemplate className="w-8 h-8" />
                  </div>
                  <p className="text-base font-medium text-fg-muted text-center">
                    Drag a section here to start building
                  </p>
                  <p className="text-sm text-fg-subtle text-center max-w-xs">
                    Choose a section from the left panel or apply a starter template
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

// ✅ Default export for compatibility
export default EditorShell;