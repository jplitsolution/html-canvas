import { uploadImage } from '../services/api/upload'
import { getAuthToken } from '../services/api/client'

const ASSETS_KEY = 'templatecraft_assets'
const MAX_SIZE = 5 * 1024 * 1024

export function loadAssets() {
  try {
    const data = localStorage.getItem(ASSETS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveAssets(assets) {
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets))
}

function compressImage(dataUrl, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export async function uploadAsset(file) {
  if (file.size > MAX_SIZE) throw new Error('Image must be under 5MB')

  if (getAuthToken()) {
    const result = await uploadImage(file)
    const asset = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      data: result.url,
      url: result.url,
      publicId: result.publicId,
      createdAt: new Date().toISOString(),
    }
    const assets = loadAssets()
    assets.push(asset)
    saveAssets(assets)
    return asset
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result)
      const asset = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        data: compressed,
        createdAt: new Date().toISOString(),
      }
      const assets = loadAssets()
      assets.push(asset)
      saveAssets(assets)
      resolve(asset)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function deleteAsset(id) {
  const assets = loadAssets().filter((a) => a.id !== id)
  saveAssets(assets)
}

export function renameAsset(id, name) {
  const assets = loadAssets().map((a) => a.id === id ? { ...a, name } : a)
  saveAssets(assets)
}

export function searchAssets(query) {
  const q = query.toLowerCase()
  return loadAssets().filter((a) => a.name.toLowerCase().includes(q))
}

export function getUnusedAssets(layout) {
  const used = new Set()
  const layoutStr = JSON.stringify(layout)
  const assets = loadAssets()
  return assets.filter((a) => !layoutStr.includes(a.data) && !layoutStr.includes(a.url || ''))
}

export function cleanupUnusedAssets(layout) {
  const unused = getUnusedAssets(layout)
  const unusedIds = new Set(unused.map((a) => a.id))
  const assets = loadAssets().filter((a) => !unusedIds.has(a.id))
  saveAssets(assets)
  return unused.length
}
