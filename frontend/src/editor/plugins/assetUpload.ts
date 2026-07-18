import type { Editor } from 'grapesjs'
import { uploadImage } from '../../services/api/upload'

// Global flag to know if we opened asset manager for background-image purpose
let _backgroundTarget: any = null

function applyBackgroundImage(target: any, url: string) {
  if (!url || !target || typeof target.setStyle !== 'function') return

  // Use setStyle (inline) not addStyle (CSS manager) so background-image
  // is always included in the exported/preview HTML inline style attribute
  const existingStyle = target.getStyle?.() || {}
  target.setStyle({
    ...existingStyle,
    'background-image': `url("${url}")`,
    'background-size': existingStyle['background-size'] || 'cover',
    'background-position': existingStyle['background-position'] || 'center',
    'background-repeat': existingStyle['background-repeat'] || 'no-repeat',
    // Required so absolutely-positioned hotspots render correctly
    'position': existingStyle.position || 'relative',
    // overflow:hidden clips both background and absolute hotspot children
    'overflow': 'visible',
  })

  console.log('[AssetUpload] background-image applied (inline):', url, 'to', target.get?.('type'))
}

function getAssetUrl(asset: any): string {
  if (typeof asset === 'string') return asset
  if (typeof asset?.get === 'function') return asset.get('src') || ''
  if (asset?.src) return asset.src
  return ''
}

function isNonImageTarget(target: any): boolean {
  if (!target || typeof target.get !== 'function') return false
  const type = target.get('type')
  const tagName = (target.get('tagName') || '').toLowerCase()
  return type !== 'image' && tagName !== 'img'
}

export function setupAssetUpload(editor: Editor) {
  editor.AssetManager.config.upload = 'dummy_url' // Set to string to enable UI

  editor.AssetManager.config.uploadFile = async (e: any) => {
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files
    const fileList = Array.from(files) as File[]

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue
      try {
        const response = await uploadImage(file)
        const url = response.url
        editor.AssetManager.add({ src: url, type: 'image', name: file.name })
      } catch (err) {
        console.error('Image upload failed:', err)
      }
    }
  }

  // Override 'open-assets' command to track background-image targets
  // Use type assertion to bypass GrapesJS's built-in command type conflict
  ;(editor.Commands as any).add('open-assets', {
    run(ed: any, _sender: any, opts: { target?: any } = {}) {
      const target = opts.target ?? ed.getSelected()

      // Store target globally for background-image mode
      _backgroundTarget = null
      ;(ed as any)._tc_asset_target = null

      if (target && isNonImageTarget(target)) {
        // This is a background-image selection
        _backgroundTarget = target
        ;(ed as any)._tc_asset_target = target
        console.log('[AssetUpload] Opening for background-image. Target:', target.get?.('type'))
      } else {
        // Normal image replacement
        _backgroundTarget = null
        ;(ed as any)._tc_asset_target = null
        console.log('[AssetUpload] Opening for image src replacement')
      }

      ed.Modal.setTitle('Select Image')
      ed.Modal.setContent(ed.AssetManager.render())
      ed.AssetManager.setTarget(target)
      ed.Modal.open()

      // ── Key Fix: Intercept the AssetManager's internal "Select" button click ──
      // GrapesJS wires a "Select" button inside its asset manager UI that calls
      // AssetManager.FileUploader or triggers an internal confirm — NOT `asset:select`.
      // We patch the confirm path by intercepting the rendered modal's Select button.
      setTimeout(() => {
        try {
          const modalEl = document.querySelector('.gjs-mdl-content')
          if (!modalEl) return

          // GrapesJS renders a "Select" button inside asset manager for the selected asset
          const selectBtn = modalEl.querySelector(
            '[data-key="add"], .gjs-btn-prim, button[data-role="confirm"], .gjs-am-add-asset'
          )

          // We use MutationObserver on asset-manager container to detect click on any asset item
          const amContainer = modalEl.querySelector('.gjs-am-assets-cont, .gjs-am-assets')
          if (amContainer) {
            const obs = new MutationObserver(() => {
              // When selection class changes, capture currently highlighted asset
              const selected = amContainer.querySelector('.gjs-am-asset.gjs-two-color, .gjs-am-asset--selected')
              if (selected) {
                const img = selected.querySelector('img')
                const bgStyle = (selected as HTMLElement).style?.backgroundImage || ''
                const srcMatch = bgStyle.match(/url\(["']?(.+?)["']?\)/)
                const rawUrl = img?.getAttribute('src') || (srcMatch ? srcMatch[1] : '') || ''
                const candidateUrl = rawUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/g, '')
                if (candidateUrl) {
                  ;(ed as any)._tc_highlighted_asset_url = candidateUrl
                }
              }
            })
            obs.observe(amContainer, { subtree: true, attributes: true, attributeFilter: ['class'] })
            ;(ed as any)._tc_asset_obs = obs
          }

          void selectBtn // referenced to avoid lint warning
        } catch (_e) {
          // Non-critical — fallback events handle it
        }
      }, 300)
    },
  })

  editor.Commands.add('tc-image-replace', {
    run(ed) {
      // Clear background target since this is for img src
      _backgroundTarget = null
      ;(ed as any)._tc_asset_target = null
      ed.runCommand('open-assets')
    },
  })

  // ---- Asset selection event handlers ----

  function handleAssetSelected(asset: any) {
    const url = getAssetUrl(asset)
    if (!url) return

    const bgTarget = _backgroundTarget || (editor as any)._tc_asset_target

    // Cleanup observer if any
    const obs = (editor as any)._tc_asset_obs
    if (obs) {
      try { obs.disconnect() } catch (_) {}
      ;(editor as any)._tc_asset_obs = null
    }

    if (bgTarget && isNonImageTarget(bgTarget)) {
      // Apply as background-image
      applyBackgroundImage(bgTarget, url)
      _backgroundTarget = null
      ;(editor as any)._tc_asset_target = null
      editor.Modal.close()

      // Force PropertyPanel re-render by triggering selection events
      const currentSelected = editor.getSelected()
      if (currentSelected) {
        editor.select(null as any)
        setTimeout(() => editor.select(currentSelected), 50)
      }
      return true
    }
    return false
  }

  // 'asset:select' fires on double-click in GrapesJS asset manager
  editor.on('asset:select', (asset: any) => {
    console.log('[AssetUpload] asset:select fired. URL:', getAssetUrl(asset), 'bgTarget:', _backgroundTarget)
    handleAssetSelected(asset)
  })

  // 'asset:open:add' fires in some GrapesJS versions when URL is added
  editor.on('asset:open:add', (asset: any) => {
    const url = getAssetUrl(asset)
    if (!url) return
    handleAssetSelected(asset)
  })

  // Catch-all: intercept when GrapesJS internally calls AssetManager.add during selection
  // This fires when user single-clicks asset → clicks the "Select" / confirm button
  editor.on('asset:add', (asset: any) => {
    // Only act if we have a background target AND the modal is open (meaning user is selecting)
    const bgTarget = _backgroundTarget || (editor as any)._tc_asset_target
    if (!bgTarget || !isNonImageTarget(bgTarget)) return
    if (!editor.Modal.isOpen()) return

    const url = getAssetUrl(asset)
    if (!url) return

    console.log('[AssetUpload] asset:add intercepted for bg-image. URL:', url)
    handleAssetSelected(asset)
  })

  // GrapesJS v0.21+ fires this when the asset manager select action is triggered
  editor.on('asset:upload:response', (data: any) => {
    const bgTarget = _backgroundTarget || (editor as any)._tc_asset_target
    if (!bgTarget || !isNonImageTarget(bgTarget)) return
    const url = typeof data === 'string' ? data : data?.src || data?.url || ''
    if (url) handleAssetSelected({ src: url })
  })
}

export function restoreAssetsFromProjectData(
  editor: Editor,
  projectData?: Record<string, unknown>
) {
  const assets = projectData?.assets as Array<{ src?: string; type?: string }> | undefined
  if (!Array.isArray(assets)) return

  assets.forEach((asset) => {
    if (asset?.src) {
      editor.AssetManager.add({ src: asset.src, type: asset.type || 'image' })
    }
  })
}
