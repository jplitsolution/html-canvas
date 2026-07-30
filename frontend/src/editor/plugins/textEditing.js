import { configureAsTextComponent, ensureAllTextEditable } from '../utils/textContent';
import { isEditorAlive } from '../utils/editorUtils';

/** Sync sidebar with canvas edits; enable double-click inline text editing */
export function setupTextEditing(editor, onContentChange) {
  let alive = true
  const notify = () => onContentChange?.();

  let textSetupCalled = false;
  
  const setupText = () => {
    if (textSetupCalled || !alive) return;
    textSetupCalled = true;
    
    setTimeout(() => {
      if (!alive || !isEditorAlive(editor)) return
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
    requestAnimationFrame(() => {
      try {
        configureAsTextComponent(component);
      } catch (error) {
        // Silently fail for individual components
      }
    });
  });

  editor.on('component:selected', () => {
    const placer = editor.Canvas?.getPlacerEl?.();
    placer?.classList.remove('tc-placer-active');
  });

  editor.on('component:update:content', notify);
  editor.on('rte:disable', notify);
  editor.on('component:update', (component) => {
    if (editor.getSelected() === component) notify();
  });

  return () => {
    alive = false
  }
}
