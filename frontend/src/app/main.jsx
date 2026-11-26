import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'
import { isChunkLoadError, reloadOnceForStaleChunk, stripChunkReloadParam } from '../utils/lazyWithRetry'

stripChunkReloadParam()

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnceForStaleChunk()
})

window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event.reason)) return
  event.preventDefault()
  reloadOnceForStaleChunk()
})

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reduce-motion')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
