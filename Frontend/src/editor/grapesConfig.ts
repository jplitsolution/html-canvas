import type { EditorConfig } from 'grapesjs'
import { STYLE_MANAGER_SECTORS } from './styleManagerConfig'

export function createGrapesConfig(container: HTMLElement): EditorConfig {
  return {
    container,
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
    showOffsets: true,
    showStylesOnChange: true,
    avoidInlineStyle: false,
    /** Use mousedown + ComponentSorter (not HTML5 drag). Native DnD breaks iframe drops. */
    nativeDnD: false,

    domComponents: {
      /** Same anchor ids (eg. #contact) may exist on different pages without renaming to i9ppd */
      keepAttributeIdsCrossPages: true,
    },

    panels: { defaults: [] },

    blockManager: {
      appendTo: '#tc-blocks-mount',
      ignoreCategories: true,
    },
    layerManager: { appendTo: '#tc-layers-panel' },
    selectorManager: { componentFirst: true },
    traitManager: { appendTo: '' },
    styleManager: {
      appendTo: '',
      sectors: STYLE_MANAGER_SECTORS,
      highlightChanged: true,
      clearProperties: true,
      hideNotStylable: false,
    },

    assetManager: {
      upload: false,
      autoAdd: true,
      embedAsBase64: false,
    },

    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '768px', widthMedia: '992px' },
        { name: 'Mobile', width: '375px', widthMedia: '480px' },
      ],
    },

    canvas: {
      styles: [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      ],
      scripts: [],
    },

    richTextEditor: {
      actions: ['bold', 'italic', 'underline', 'link'],
    },

    plugins: [],
  }
}
