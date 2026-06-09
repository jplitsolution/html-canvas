import { persistence } from '../../store/adapters/persistence'
import { migrateProjects } from '../../utils/migration'
import { repairProject } from '../../schemas/project.schema'

export async function listProjects() {
  return migrateProjects(persistence.listProjects())
}

export async function getProject(id) {
  const projects = await listProjects()
  return projects.find((p) => p.id === id) || null
}

export async function saveProject(project) {
  const repaired = repairProject(project)
  const projects = (await listProjects()).map((p) =>
    p.id === repaired.id ? repaired : p
  )
  if (!projects.find((p) => p.id === repaired.id)) {
    projects.push(repaired)
  }
  persistence.saveProjects(projects, true)
  return repaired
}

export async function deleteProject(id) {
  const projects = (await listProjects()).filter((p) => p.id !== id)
  persistence.saveProjects(projects, true)
}
