/**
 * Client-side file download helpers (no server round-trip).
 */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename, content, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([content], { type: mime }))
}
