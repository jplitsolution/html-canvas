import { uploadImage } from '../../services/api/upload'

let _backgroundTarget = null

function applyBackgroundImage(target, url) {
  if (!url || !target || typeof target.setStyle !== 'function') return

  const existingStyle = target.getStyle?.() || {}
  target.setStyle({
    ...existingStyle,
    'background-image': `url("${url}")`,
    'background-size': existingStyle['background-size'] || 'cover',
    'background-position': existingStyle['background-position'] || 'center',
    'background-repeat': existingStyle['background-repeat'] || 'no-repeat',
    'position': existingStyle.position || 'relative',
    'overflow': 'visible',
  })

  console.log('[AssetUpload] background-image applied (inline):', url, 'to', target.get?.('type'))
}

function getAssetUrl(asset) {
  if (typeof asset === 'string') return asset
  if (typeof asset?.get === 'function') return asset.get('src') || ''
  if (asset?.src) return asset.src
  return ''
}

function isNonImageTarget(target) {
  if (!target || typeof target.get !== 'function') return false
  const type = target.get('type')
  const tagName = (target.get('tagName') || '').toLowerCase()
  return type !== 'image' && tagName !== 'img'
}

export function setupAssetUpload(editor) {
  editor.AssetManager.config.upload = 'dummy_url'

  editor.AssetManager.config.uploadFile = async (e) => {
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files
    const fileList = Array.from(files)

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

  editor.Commands.add('open-assets', {
    run(ed, _sender, opts = {}) {
      const target = opts.target ?? ed.getSelected()

      _backgroundTarget = null
      ed._tc_asset_target = null

      if (target && isNonImageTarget(target)) {
        _backgroundTarget = target
        ed._tc_asset_target = target
        console.log('[AssetUpload] Opening for background-image. Target:', target.get?.('type'))
      } else {
        _backgroundTarget = null
        ed._tc_asset_target = null
        console.log('[AssetUpload] Opening for image src replacement')
      }

      ed.Modal.setTitle('Select Image')
      ed.Modal.setContent(ed.AssetManager.render())
      ed.AssetManager.setTarget(target)
      ed.Modal.open()

      setTimeout(() => {
        try {
          const modalEl = document.querySelector('.gjs-mdl-content')
          if (!modalEl) return

          const selectBtn = modalEl.querySelector(
            '[data-key="add"], .gjs-btn-prim, button[data-role="confirm"], .gjs-am-add-asset'
          )

          const amContainer = modalEl.querySelector('.gjs-am-assets-cont, .gjs-am-assets')
          if (amContainer) {
            const obs = new MutationObserver(() => {
              const selected = amContainer.querySelector('.gjs-am-asset.gjs-two-color, .gjs-am-asset--selected')
              if (selected) {
                const img = selected.querySelector('img')
                const bgStyle = selected.style?.backgroundImage || ''
                const srcMatch = bgStyle.match(/url\(["']?(.+?)["']?\)/)
                const rawUrl = img?.getAttribute('src') || (srcMatch ? srcMatch[1] : '') || ''
                const candidateUrl = rawUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/g, '')
                if (candidateUrl) {
                  ed._tc_highlighted_asset_url = candidateUrl
                }
              }
            })
            obs.observe(amContainer, { subtree: true, attributes: true, attributeFilter: ['class'] })
            ed._tc_asset_obs = obs
          }

          void selectBtn
        } catch (_e) {
          // Non-critical
        }
      }, 300)
    },
  })

  editor.Commands.add('tc-image-replace', {
    run(ed) {
      _backgroundTarget = null
      ed._tc_asset_target = null
      ed.runCommand('open-assets')
    },
  })

  function handleAssetSelected(asset) {
    const url = getAssetUrl(asset)
    if (!url) return

    const bgTarget = _backgroundTarget || editor._tc_asset_target

    const obs = editor._tc_asset_obs
    if (obs) {
      try { obs.disconnect() } catch (_) {}
      editor._tc_asset_obs = null
    }

    if (bgTarget && isNonImageTarget(bgTarget)) {
      applyBackgroundImage(bgTarget, url)
      _backgroundTarget = null
      editor._tc_asset_target = null
      editor.Modal.close()

      const currentSelected = editor.getSelected()
      if (currentSelected) {
        editor.select(null)
        setTimeout(() => editor.select(currentSelected), 50)
      }
      return true
    }
    return false
  }

  editor.on('asset:select', (asset) => {
    console.log('[AssetUpload] asset:select fired. URL:', getAssetUrl(asset), 'bgTarget:', _backgroundTarget)
    handleAssetSelected(asset)
  })

  editor.on('asset:open:add', (asset) => {
    const url = getAssetUrl(asset)
    if (!url) return
    handleAssetSelected(asset)
  })

  editor.on('asset:add', (asset) => {
    const bgTarget = _backgroundTarget || editor._tc_asset_target
    if (!bgTarget || !isNonImageTarget(bgTarget)) return
    if (!editor.Modal.isOpen()) return

    const url = getAssetUrl(asset)
    if (!url) return

    console.log('[AssetUpload] asset:add intercepted for bg-image. URL:', url)
    handleAssetSelected(asset)
  })

  editor.on('asset:upload:response', (data) => {
    const bgTarget = _backgroundTarget || editor._tc_asset_target
    if (!bgTarget || !isNonImageTarget(bgTarget)) return
    const url = typeof data === 'string' ? data : data?.src || data?.url || ''
    if (url) handleAssetSelected({ src: url })
  })
}

export function restoreAssetsFromProjectData(
  editor,
  projectData
) {
  const assets = projectData?.assets
  if (!Array.isArray(assets)) return

  assets.forEach((asset) => {
    if (asset?.src) {
      editor.AssetManager.add({ src: asset.src, type: asset.type || 'image' })
    }
  })
}
