import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'
import { loadTheme } from '../utils/storage'

const theme = loadTheme()
document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
if (theme === 'dark') {
  document.documentElement.classList.add('dark')
}

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('reduce-motion')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
