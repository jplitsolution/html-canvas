import * as localStorageAdapter from './localStorageAdapter'

export const persistence = {
  listProjects: () => localStorageAdapter.listProjects(),
  saveProjects: (projects, immediate) => localStorageAdapter.saveProjects(projects, immediate),
  loadTheme: () => localStorageAdapter.loadTheme(),
  saveTheme: (theme) => localStorageAdapter.saveTheme(theme),
}
