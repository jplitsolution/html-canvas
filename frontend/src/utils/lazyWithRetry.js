import { lazy } from 'react'

const RELOAD_KEY = 'chunk-reload-at'
const RELOAD_WINDOW_MS = 15000

function readReloadAt() {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) || 0)
  } catch {
    return 0
  }
}

function markReload() {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage can throw in private mode; the navigation still proceeds.
  }
}

export function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

/** Drop the cache-bust param added by a stale-chunk reload so routes stay clean. */
export function stripChunkReloadParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('v')) return
  url.searchParams.delete('v')
  const search = url.searchParams.toString()
  window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
}

function navigateFresh() {
  const url = new URL(window.location.href)
  url.searchParams.set('v', Date.now().toString())
  window.location.replace(url.toString())
}

/**
 * After a deploy, an open tab still imports the previous hashed chunk.
 * Nginx then serves index.html (text/html) and the module fetch fails.
 * One cache-busted navigation picks up the new index.html.
 * Returns false when a reload already happened in this window, so we don't loop.
 */
export function reloadOnceForStaleChunk() {
  if (Date.now() - readReloadAt() < RELOAD_WINDOW_MS) return false
  markReload()
  navigateFresh()
  return true
}

export function hardReloadForStaleChunk() {
  markReload()
  navigateFresh()
}

export function lazyWithRetry(importer) {
  return lazy(() =>
    importer().catch((error) => {
      if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
        return new Promise(() => {})
      }
      throw error
    }),
  )
}
