import type { Editor } from 'grapesjs';
import { configureAsTextComponent, ensureAllTextEditable } from '../utils/textContent';

/** Sync sidebar with canvas edits; enable double-click inline text editing */
export function setupTextEditing(editor: Editor, onContentChange?: () => void) {
  const notify = () => onContentChange?.();

  // ✅ Use a single delayed call with a flag to prevent multiple calls
  let textSetupCalled = false;
  
  const setupText = () => {
    if (textSetupCalled) return;
    textSetupCalled = true;
    
    // Wait for editor to be fully ready
    setTimeout(() => {
      try {
        ensureAllTextEditable(editor);
      } catch (error) {
        console.warn('[TextEditing] Setup failed:', error);
      }
    }, 500);
  };

  editor.on('load', setupText);
  editor.on('project:load', setupText);

  editor.on('component:add', (component) => {
    // Defer until nested children are parsed
    requestAnimationFrame(() => {
      try {
        configureAsTextComponent(component);
      } catch (error) {
        // Silently fail for individual components
      }
    });
  });

  editor.on('component:selected', () => {
    const placer = editor.Canvas.getPlacerEl();
    placer?.classList.remove('tc-placer-active');
  });

  editor.on('component:update:content', notify);
  editor.on('rte:disable', notify);
  editor.on('component:update', (component) => {
    if (editor.getSelected() === component) notify();
  });
}