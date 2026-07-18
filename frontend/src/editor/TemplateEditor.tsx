import './editor.css'
import { useEffect, useRef, useCallback, useState } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import { createGrapesConfig } from './grapesConfig'
import { registerAllBlocks } from './blocks'
import { setupAssetUpload, restoreAssetsFromProjectData } from './plugins/assetUpload'
import { setupAssetCanvasDrop } from './plugins/assetDrag'
import { setupCanvasEnhancements, setCanvasZoom, applyDeviceViewport, syncCanvasFrameHeight } from './plugins/canvasEnhancements'
import { setupEditorExperience } from './plugins/editorExperience'
import { setupTextEditing } from './plugins/textEditing'
import { ensureAllTextEditable } from './utils/textContent'
import { setupPagesManager } from './plugins/pagesManager'
import {
  setupDragAndDrop,
  ensureBlockManagerMounted,
  filterBlockElements,
  type DragDebugState,
} from './plugins/dragAndDrop'
import { loadIntoEditor } from './services/loadTemplate'
import { getTemplatePayload } from './services/saveTemplate'
import { exportAllPagesFromEditor, exportCurrentPageFromEditor } from './services/exportSite'
import { EditorProvider } from './context/EditorContext'
import { EditorShell } from './shell/EditorShell'
import type { TemplateEditorProps, GrapesEditor } from './types'
import useStore from '../store/useStore'
import { listSectionAnchorsOnPage } from './utils/sectionAnchor'
import { trackEvent } from '../utils/analytics'
import { injectStylesheetsIntoCanvas, runDevModeStylesValidation } from './utils/styleUtils'
import { safeGetWrapper } from './utils/editorUtils'

export default function TemplateEditor({
  projectId,
  projectTitle,
  breadcrumbLabel,
  breadcrumbHref,
  funnelPageType,
  projectCreatedAt,
  projectMetadata,
  initialData,
  onSave,
  onDirtyChange,
  onPreview,
  saveHandler,
}: TemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<GrapesEditor | null>(null)
  const initializedRef = useRef(false)
  const cleanupExperienceRef = useRef<(() => void) | null>(null)

  const [editor, setEditor] = useState<GrapesEditor | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [device, setDevice] = useState(() => (initialData?.projectData?.customWidth ? 'Custom' : 'Desktop'))
  const [zoom, setZoom] = useState(100)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [customWidth, setCustomWidth] = useState(() => (initialData?.projectData?.customWidth?.toString() || '1200'))
  const [customHeight, setCustomHeight] = useState(() => (initialData?.projectData?.customHeight?.toString() || '800'))
  const [dragDebug, setDragDebug] = useState<DragDebugState>({
    draggedItem: null,
    selectedItem: null,
    editorState: 'idle',
    componentCount: 0,
    lastEvent: '—',
    dropSuccess: false,
    isDragging: false,
    isOverCanvas: false,
  })

  if (import.meta.env.DEV) {
    // Keep logs dev-only; the editor renders frequently during drag/selection.
    console.log('[TemplateEditor] Rendering. isEmpty:', isEmpty, 'dragDebugState:', dragDebug.editorState)
  }

  const refreshSelection = useCallback(() => setSelectionVersion((v) => v + 1), [])

  const callbacksRef = useRef({ onSave, onDirtyChange, onPreview, projectCreatedAt, projectMetadata, projectId, projectTitle, saveHandler, customWidth, customHeight })
  useEffect(() => {
    callbacksRef.current = { onSave, onDirtyChange, onPreview, projectCreatedAt, projectMetadata, projectId, projectTitle, saveHandler, customWidth, customHeight }
  }, [onSave, onDirtyChange, onPreview, projectCreatedAt, projectMetadata, projectId, projectTitle, saveHandler, customWidth, customHeight])

  // Sync GrapesJS "Custom" device width when the user changes the custom dimension inputs.
  // GrapesConfig initialises Custom at 1200 px; here we keep it in lockstep with state.
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !customWidth) return
    const customDevice = ed.Devices.get('Custom')
    if (customDevice) {
      const px = `${customWidth}px`
      if (customDevice.get('width') !== px) {
        customDevice.set('width', px)
      }
    }
    // If we're currently in Custom mode, re-apply the frame width
    const selected = ed.Devices.getSelected()
    if (selected && String(selected.get('name')) === 'Custom') {
      const frameEl = ed.Canvas?.getFrameEl?.() as HTMLIFrameElement | null
      if (frameEl) frameEl.style.width = `${customWidth}px`
    }
  }, [customWidth])

  const handleSave = useCallback(async () => {
    const ed = editorRef.current
    if (!ed) return
    setSaving(true)
    try {
      const { projectId: id, projectTitle: name, projectCreatedAt: createdAt, projectMetadata: metadata, onSave: saveCb, onDirtyChange: dirtyCb, saveHandler: customSave, customWidth: cw, customHeight: ch } =
        callbacksRef.current
      const meta = { id, name, createdAt, metadata, customWidth: cw, customHeight: ch }
      if (!customSave) {
        useStore.getState().addToast('Save handler not configured', 'error')
        return
      }
      const saved = await customSave(ed, meta)
      dirtyCb?.(false)
      setIsDirty(false)
      saveCb?.(saved)
    } finally {
      setSaving(false)
    }
  }, [])

  const handlePreview = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const { projectTitle: name, onPreview: previewCb } = callbacksRef.current
    if (isDirty && previewCb) {
      useStore.getState().addToast(
        'Preview shows the last saved version. Use Save & preview to save your changes first.',
        'info',
      )
    }
    if (previewCb) {
      previewCb(getTemplatePayload(ed, name))
    }
  }, [isDirty, editorRef, callbacksRef])

  const handlePublish = useCallback(async () => {
    await handleSave()
    handlePreview()
  }, [handleSave, handlePreview])

  const handleExportCurrent = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    exportCurrentPageFromEditor(ed, callbacksRef.current.projectTitle)
    trackEvent('exports')
  }, [])

  const handleExportAll = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    exportAllPagesFromEditor(ed, callbacksRef.current.projectTitle)
    trackEvent('exports')
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) console.log('[TemplateEditor] useEffect triggered for projectId:', projectId)
    if (!containerRef.current || initializedRef.current) {
      if (import.meta.env.DEV) {
        console.log('[TemplateEditor] useEffect skip. Already initialized:', initializedRef.current)
      }
      return
    }

    if (import.meta.env.DEV) console.log('[TemplateEditor] Initializing GrapesJS...')
    initializedRef.current = true
    let mounted = true

    // Clear previous elements to avoid strict mode duplicates
    if (containerRef.current) containerRef.current.innerHTML = ''
    const blocksMount = document.getElementById('tc-blocks-mount')
    if (blocksMount) blocksMount.innerHTML = ''
    const layersMount = document.getElementById('tc-layers-panel')
    if (layersMount) layersMount.innerHTML = ''

    const config = createGrapesConfig(containerRef.current)
    const hostLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((l: any) => l.href)
      .filter(Boolean)
    const defaultStyles = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
      'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    ]
    if (config.canvas) {
      config.canvas.styles = [
        ...(config.canvas.styles || []),
        ...defaultStyles,
        ...hostLinks,
      ]
    }

    const ed = grapesjs.init(config)
    editorRef.current = ed
    setEditor(ed)

    // Register custom hotspot component type
    ed.Components.addType('hotspot', {
      isComponent: (el) => el.getAttribute && el.getAttribute('data-tc-type') === 'hotspot',
      model: {
        defaults: {
          tagName: 'a',
          draggable: true,
          droppable: false,
          resizable: true,
          traits: [
            {
              type: 'text',
              name: 'href',
              label: 'Link URL',
            },
            {
              type: 'select',
              name: 'target',
              label: 'Open in',
              options: [
                { id: '_self', value: '_self', name: 'Same Window' },
                { id: '_blank', value: '_blank', name: 'New Window' },
              ]
            }
          ]
        }
      }
    })

    // ── Dedicated hotspot insertion command ─────────────────────────────
    // Uses components().add() directly which bypasses droppable restrictions
    ed.Commands.add('tc-add-hotspot', {
      run(ed: any, _sender: any, opts: { target?: any; coverFull?: boolean } = {}) {
        let target = opts.target || ed.getSelected()
        if (!target) {
          console.warn('[tc-add-hotspot] No valid target component')
          return
        }

        const targetTag = (target.get?.('tagName') || '').toLowerCase()
        
        // <img> tags are void HTML elements and cannot contain child <a> tags.
        // If target is an <img>, target its parent container instead so the hotspot <a> renders valid HTML!
        if (targetTag === 'img') {
          const parent = target.parent()
          if (parent) {
            target = parent
          }
        }

        if (typeof target.components !== 'function') {
          console.warn('[tc-add-hotspot] Target component cannot accept children')
          return
        }

        // Ensure parent has position:relative
        const pStyle = target.getStyle?.() || {}
        if (!['absolute', 'relative', 'fixed'].includes(pStyle.position || '')) {
          target.addStyle?.({ position: 'relative' })
        }

        // coverFull = true → hotspot covers 100% of parent (entire image is clickable)
        const hotspotStyle = opts.coverFull
          ? {
              position: 'absolute',
              top: '0px',
              left: '0px',
              width: '100%',
              height: '100%',
              display: 'block',
              'z-index': '50',
              cursor: 'pointer',
              'text-decoration': 'none',
            }
          : {
              position: 'absolute',
              top: '10%',
              left: '10%',
              width: '30%',
              height: '25%',
              display: 'block',
              'z-index': '50',
              cursor: 'pointer',
              'text-decoration': 'none',
            }

        // Directly add to component's children collection (bypasses droppable check)
        const children = target.components()
        const hotspot = children.add({
          tagName: 'a',
          type: 'hotspot',
          attributes: { 'data-tc-type': 'hotspot', href: '#' },
          style: hotspotStyle,
          draggable: true,
          droppable: false,
          resizable: true,
          selectable: true,
          hoverable: true,
        }) as any

        console.log('[tc-add-hotspot] Added hotspot to', target.get?.('tagName'), hotspot)

        // Select the new hotspot
        setTimeout(() => {
          try {
            const h = Array.isArray(hotspot) ? hotspot[0] : hotspot
            if (h) ed.select(h)
          } catch (e) {
            console.warn('[tc-add-hotspot] Select failed:', e)
          }
        }, 100)
      }
    })

    // Expose editor globally for debugging in dev
    if (import.meta.env.DEV) {
      ;(window as any).editor = ed
    }

    registerAllBlocks(ed, funnelPageType)
    setupAssetUpload(ed)
    setupAssetCanvasDrop(ed)
    const cleanupDragAndDrop = setupDragAndDrop(ed, setDragDebug)
    const cleanupCanvasEnhancements = setupCanvasEnhancements(ed, (empty) => mounted && setIsEmpty(empty))
    const cleanupTextEditing = setupTextEditing(ed, refreshSelection)

    // Register section ID auto-generation and nav link validation hooks
    let lastDragEvent: any = null
    let isDraggingBlock = false

    ed.on('block:drag:start', () => {
      isDraggingBlock = true
    })

    ed.on('block:drag:stop', () => {
      isDraggingBlock = false
      lastDragEvent = null
    })

    ed.on('canvas:dragover', (e) => {
      lastDragEvent = e
    })

    ed.on('component:add', (component) => {
      const parent = component.parent()
      const isTopLevel = parent && (parent.get('type') === 'wrapper' || parent === safeGetWrapper(ed))
      if (!isTopLevel) return

      const tag = (component.get('tagName') || '').toLowerCase()
      const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article'])
      const isSection = SECTION_TAGS.has(tag) || component.getAttributes()?.['data-tc-type'] === 'section'
      if (!isSection || tag === 'header' || tag === 'footer') return

      // Auto-detect proposed ID based on content
      const html = component.toHTML ? component.toHTML() : ''
      const text = (component.getEl?.()?.textContent || '').toLowerCase()
      
      let proposed = ''
      if (html.includes('<form') || text.includes('contact') || text.includes('get in touch')) {
        proposed = 'contact'
      } else if (text.includes('pricing') || html.includes('pricing') || text.includes('$') || text.includes('/mo')) {
        proposed = 'pricing'
      } else if (text.includes('features') || text.includes('lightning fast') || text.includes('responsive')) {
        proposed = 'features'
      } else if (text.includes('about') || text.includes('our team') || text.includes('meet the team')) {
        proposed = 'about'
      } else {
        // First non-header section gets 'hero'
        const children = parent.components().models || []
        const nonHeaderSections = children.filter((c: any) => {
          const t = (c.get('tagName') || '').toLowerCase()
          return t !== 'header' && t !== 'nav'
        })
        if (nonHeaderSections.length === 0 || nonHeaderSections[0] === component) {
          proposed = 'hero'
        }
      }

      if (!proposed) proposed = 'section'

      // Ensure proposed ID is unique on page
      let finalId = proposed
      let counter = 1
      if (proposed === 'section') {
        finalId = `section-${counter}`
      }

      const findConflict = (anchorId: string) => {
        let found = false
        ed.Pages.getAll().forEach((page) => {
          const root = page.getMainComponent()
          if (!root) return
          const walk = (cmp: any) => {
            if (cmp === component) return
            if (cmp.getAttributes()?.id === anchorId) found = true
            cmp.components().forEach(walk)
          }
          walk(root)
        })
        return found
      }

      while (findConflict(finalId)) {
        if (proposed === 'section') {
          counter++
          finalId = `section-${counter}`
        } else {
          finalId = `${proposed}-${counter}`
          counter++
        }
      }

      // Defer modifications to prevent layout conflicts during the initial add/render lifecycle
      setTimeout(() => {
        if (!mounted || editorRef.current !== ed || !safeGetWrapper(ed)) return
        component.setId(finalId)
        component.set('sectionId', finalId)

        // Set sectionLabel
        let label = 'Section'
        if (proposed === 'hero') label = 'Hero Section'
        else if (proposed === 'features') label = 'Features Section'
        else if (proposed === 'pricing') label = 'Pricing Section'
        else if (proposed === 'contact') label = 'Contact Section'
        else if (proposed === 'about') label = 'About Section'
        else if (proposed.startsWith('section-')) label = `Section ${proposed.split('-')[1]}`
        
        component.set('sectionLabel', label)
      }, 0)
    })

    // Hook for Canva-style Absolute Free-Form Placement
    ed.on('component:add', (component) => {
      setTimeout(() => {
        if (!mounted || editorRef.current !== ed) return
        
        const type = component.get('type')
        const tag = (component.get('tagName') || '').toLowerCase()
        const isWrapperOrSection = type === 'wrapper' || tag === 'body' || ['section', 'header', 'footer', 'main'].includes(tag) || component.getAttributes()?.['data-tc-type'] === 'section'
        
        if (!isWrapperOrSection) {
          const parent = component.parent()
          if (parent) {
            // Fix Preview Issue: Parent MUST be relative/absolute for absolute children
            const pStyle = parent.getStyle() || {}
            if (pStyle.position !== 'absolute' && pStyle.position !== 'relative' && pStyle.position !== 'fixed') {
              parent.addStyle({ position: 'relative' })
            }

            // Fix Exact Drop Issue: Set position: absolute and top/left to where the mouse actually is
            if (isDraggingBlock && lastDragEvent && lastDragEvent.clientX !== undefined) {
              const parentEl = parent.getEl ? parent.getEl() : null
              if (parentEl) {
                const rect = parentEl.getBoundingClientRect()
                // Mouse position relative to the iframe viewport minus the parent's top/left bounds
                const topPx = lastDragEvent.clientY - rect.top
                const leftPx = lastDragEvent.clientX - rect.left
                
                // Convert to percentages for responsive scaling
                const topPct = (topPx / rect.height) * 100
                const leftPct = (leftPx / rect.width) * 100
                
                // Keep existing styles but override position and add coordinates
                component.addStyle({ 
                  position: 'absolute', 
                  top: `${topPct.toFixed(2)}%`, 
                  left: `${leftPct.toFixed(2)}%`,
                  'z-index': '20',
                  margin: '0' // strip margin so it drops exactly at cursor
                })
              }
            } else if (!component.getStyle()?.position) {
              // Fallback if no drag event tracked, just ensure it's absolute
              component.addStyle({ position: 'absolute', 'z-index': '20', margin: '0' })
            }
          }
          // Enable resizable handles visually for absolute items
          component.set('resizable', true)
        }
      }, 50)
    })

    ed.on('component:remove', (removedComponent) => {
      const id = removedComponent.getAttributes()?.id || removedComponent.getId()
      if (!id) return

      const root = safeGetWrapper(ed)
      if (!root) return

      const walk = (cmp: any) => {
        const href = cmp.getAttributes()?.href
        if (href === `#${id}`) {
          cmp.addAttributes({ href: '#' })
          const addToast = useStore.getState().addToast
          if (typeof addToast === 'function') {
            addToast(`Section "#${id}" was deleted. Intersecting navigation links have been reset.`, 'info')
          }
        }
        cmp.components().forEach(walk)
      }
      walk(root)
    })

    ed.on('change:changesCount', () => {
      if (!mounted) return
      setIsDirty(true)
      callbacksRef.current.onDirtyChange?.(true)
    })

    ed.on('component:selected', () => mounted && refreshSelection())
    ed.on('component:deselected', () => mounted && refreshSelection())
    ed.on('page:select', () => injectStylesheetsIntoCanvas(ed))
    ed.on('canvas:ready', () => injectStylesheetsIntoCanvas(ed))
    ed.on('device:select', (dev) => mounted && setDevice((dev?.get('name') as string) || 'Desktop'))

    ed.on('component:update', (component) => {
      if (!mounted) return
      const tag = (component.get('tagName') || '').toLowerCase()
      const type = component.get('type') || ''
      if (tag === 'a' || type === 'link') {
        const text = (component.getEl?.()?.textContent || '').trim()
        if (text) {
          const href = component.getAttributes()?.href || ''
          if (!href || href === '#' || href.startsWith('#')) {
            const pageAnchors = listSectionAnchorsOnPage(ed, component)
            const normalized = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
            const common = ['features', 'pricing', 'contact', 'about', 'faq', 'services', 'hero']
            if (pageAnchors.includes(normalized) || common.includes(normalized)) {
              if (href !== `#${normalized}`) {
                component.addAttributes({ href: `#${normalized}` })
                refreshSelection()
              }
            }
          }
        }
      }
    })

    ed.on('load', () => {
      injectStylesheetsIntoCanvas(ed)

      const iframeDoc = ed.Canvas?.getDocument?.()
      if (iframeDoc) {
        runDevModeStylesValidation(iframeDoc)
      }
      ed.UndoManager.clear()
      setCanvasZoom(ed, 100)
      
      // Enable absolute drag mode for free-form dragging anywhere
      ed.setDragMode('absolute')

      // Healing script: Fix existing absolute components from before the update
      const wrapper = ed.getWrapper()
      if (wrapper) {
        const walk = (cmp: any) => {
          const style = cmp.getStyle() || {}
          const isAbsolute = style.position === 'absolute' || cmp.getAttributes()?.['data-tc-type'] === 'hotspot'
          if (isAbsolute) {
            // Remove margins which break absolute positioning
            if (style.margin || style['margin-top'] || style['margin-left']) {
              const newStyle = { ...style }
              delete newStyle.margin
              delete newStyle['margin-top']
              delete newStyle['margin-left']
              delete newStyle['margin-right']
              delete newStyle['margin-bottom']
              cmp.setStyle(newStyle)
            }
            // Ensure parent is relative
            const parent = cmp.parent()
            if (parent) {
              const pStyle = parent.getStyle() || {}
              if (pStyle.position !== 'absolute' && pStyle.position !== 'relative' && pStyle.position !== 'fixed') {
                parent.addStyle({ position: 'relative' })
              }
            }
            // Enable resizable handles visually for existing absolute items
            cmp.set('resizable', true)
          }
          cmp.components().forEach(walk)
        }
        walk(wrapper)
      }

      // Healing script for wellness containers
      try {
        const cssRules = ed.CssComposer.getAll();
        cssRules.forEach((rule: any) => {
          const selectors = rule.getSelectors().getFullString();
          if (
            selectors.includes('wellness-otp-container') ||
            selectors.includes('wellness-confirm-container') ||
            selectors.includes('wellness-home-container')
          ) {
            const style = rule.getStyle() || {};
            if (style['min-height'] === '100vh') {
              rule.addStyle({ 'min-height': 'auto' });
            }
          }
        });
      } catch (e) {
        console.error('Failed to heal CSS rules:', e);
      }

      requestAnimationFrame(() => {
        ensureBlockManagerMounted(ed)
        filterBlockElements(ed, 'sections', '')
        // Apply the correct viewport meta for the default device (Desktop)
        const selectedDev = ed.Devices.getSelected()
        if (selectedDev) {
          applyDeviceViewport(ed, String(selectedDev.get('name')))
        }
      })
    })

    const hasExistingPages =
      initialData.projectData &&
      typeof initialData.projectData === 'object' &&
      Array.isArray((initialData.projectData as { pages?: unknown[] }).pages) &&
      ((initialData.projectData as { pages?: unknown[] }).pages?.length ?? 0) > 0

    if (!hasExistingPages) {
      setupPagesManager(ed)
    }

    try {
      loadIntoEditor(ed, initialData)
    } catch (err: any) {
      console.error('[TemplateEditor] Error loading template:', err)
      const addToast = useStore.getState().addToast
      if (typeof addToast === 'function') {
        addToast(err.message || 'Failed to load template', 'error')
      }
    }

    const intervals = [0, 50, 150, 300, 600, 1200]
    intervals.forEach((delay) => {
      setTimeout(() => {
        if (!mounted || editorRef.current !== ed) return
        ensureAllTextEditable(ed)
        injectStylesheetsIntoCanvas(ed)
        syncCanvasFrameHeight(ed)
      }, delay)
    })

    restoreAssetsFromProjectData(ed, initialData.projectData)

    cleanupExperienceRef.current = setupEditorExperience(ed, { onSave: handleSave })

    return () => {
      if (import.meta.env.DEV) console.log('[TemplateEditor] useEffect cleanup: destroying GrapesJS...')
      mounted = false
      initializedRef.current = false
      cleanupExperienceRef.current?.()
      cleanupDragAndDrop?.()
      cleanupCanvasEnhancements?.()
      cleanupTextEditing?.()
      ed.destroy()
      editorRef.current = null
      setEditor(null)

      // Clear external panels
      const bMount = document.getElementById('tc-blocks-mount')
      if (bMount) bMount.innerHTML = ''
      const lMount = document.getElementById('tc-layers-panel')
      if (lMount) lMount.innerHTML = ''
    }
  }, [projectId])

  const contextValue = {
    editor,
    isEmpty,
    device,
    zoom,
    advancedMode,
    funnelPageType,
    customWidth,
    customHeight,
    setAdvancedMode,
    setZoom,
    setDevice,
    setCustomWidth,
    setCustomHeight,
    refreshSelection,
    selectionVersion,
    dragDebug,
  }

  return (
    <EditorProvider value={contextValue}>
      <EditorShell
        projectTitle={projectTitle}
        breadcrumbLabel={breadcrumbLabel}
        breadcrumbHref={breadcrumbHref}
        funnelPageType={funnelPageType}
        isDirty={isDirty}
        saving={saving}
        canvasRef={containerRef}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
        onExportCurrent={handleExportCurrent}
        onExportAll={handleExportAll}
      />
    </EditorProvider>
  )
}
