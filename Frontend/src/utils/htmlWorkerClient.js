import { generateHTML } from './htmlGenerator'

let worker = null
let requestCounter = 0
const pending = new Map()

const LARGE_LAYOUT_THRESHOLD = 50

function getWorker() {
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/htmlWorker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => {
        const { html, requestId } = e.data
        const entry = pending.get(requestId)
        if (entry) {
          pending.delete(requestId)
          clearTimeout(entry.timeout)
          const finalHtml = html && html.includes('</body>') && !isEmptyBody(html)
            ? html
            : generateHTML(entry.layout, entry.title, entry.device)
          entry.resolve(finalHtml)
        }
      }
      worker.onerror = () => {
        worker = null
      }
    } catch {
      worker = null
    }
  }
  return worker
}

function isEmptyBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (!match) return true
  const content = match[1].replace(/\s/g, '')
  return content.length < 10
}

export function generateHTMLAsync(layout, title = 'My Website', device = 'desktop') {
  const w = getWorker()
  if (!w || layout.length < LARGE_LAYOUT_THRESHOLD) {
    return Promise.resolve(generateHTML(layout, title, device))
  }

  const requestId = ++requestCounter
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId)
      resolve(generateHTML(layout, title, device))
    }, 10000)

    pending.set(requestId, { resolve, reject, timeout, layout, title, device })
    w.postMessage({ layout, title, device, requestId })
  })
}

export function terminateWorker() {
  if (worker) {
    worker.terminate()
    worker = null
    pending.clear()
  }
}
