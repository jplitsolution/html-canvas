import type { Editor } from 'grapesjs'
import { uploadImage } from '../../services/api/upload'

export function setupAssetUpload(editor: Editor) {
  editor.AssetManager.config.upload = false

  const am = editor.AssetManager as Editor['AssetManager'] & {
    uploadFile?: (files: FileList | File[]) => Promise<{ data: Array<{ src: string; type: string }> }>
  }

  am.uploadFile = async (files: FileList | File[]) => {
    const fileList = files instanceof FileList ? Array.from(files) : files
    const results: Array<{ src: string; type: string }> = []

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue
      try {
        const response = await uploadImage(file)
        const url = response.url
        results.push({ src: url, type: 'image' })
        editor.AssetManager.add({ src: url, type: 'image', name: file.name })
      } catch (err) {
        console.error('Image upload failed:', err)
      }
    }

    return { data: results }
  }

  editor.Commands.add('open-assets', {
    run(ed, _sender, opts: { target?: unknown } = {}) {
      ed.Modal.setTitle('Select Image')
      ed.Modal.setContent(ed.AssetManager.render())
      ed.AssetManager.setTarget(opts.target ?? ed.getSelected())
      ed.Modal.open()
    },
  })

  editor.Commands.add('tc-image-replace', {
    run(ed) {
      ed.runCommand('open-assets')
    },
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
