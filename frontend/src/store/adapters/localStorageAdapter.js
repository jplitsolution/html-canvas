const STORAGE_KEY = 'templatecraft_projects'
const THEME_KEY = 'templatecraft_theme'

let saveTimer = null
let pendingProjects = null

export function listProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveProjects(projects, immediate = false) {
  pendingProjects = projects
  if (immediate) {
    flushSave()
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, 500)
}

function flushSave() {
  if (pendingProjects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingProjects))
    pendingProjects = null
  }
  saveTimer = null
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'light'
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}
