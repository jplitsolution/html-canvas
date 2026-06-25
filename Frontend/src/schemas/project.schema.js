import { z } from 'zod'

export const CURRENT_VERSION = 2

export const projectMetadataSchema = z.object({
  tags: z.array(z.string()).default([]),
  description: z.string().default(''),
  lastOpenedAt: z.string().optional(),
}).default({})

export const projectSchema = z.object({
  version: z.number().default(CURRENT_VERSION),
  id: z.string().min(1),
  title: z.string().min(1).default('Untitled Project'),
  createdAt: z.string(),
  updatedAt: z.string(),
  editor: z.literal('grapesjs').default('grapesjs'),
  projectData: z.record(z.unknown()).default({}),
  html: z.string().default(''),
  css: z.string().default(''),
  metadata: projectMetadataSchema,
})

const emptyGrapesDefaults = {
  editor: 'grapesjs',
  version: CURRENT_VERSION,
  projectData: {},
  html: '',
  css: '',
}

export function migrateProject(oldVersion, newVersion, project) {
  let migrated = { ...project }

  if (oldVersion < 2 && newVersion >= 2) {
    migrated = {
      ...emptyGrapesDefaults,
      ...migrated,
      layout: undefined,
    }
  }

  migrated.version = newVersion
  return migrated
}

export function repairProject(project) {
  const version = project.version ?? 0
  let repaired = migrateProject(version, CURRENT_VERSION, {
    id: project.id || crypto.randomUUID(),
    title: project.title || 'Untitled Project',
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    editor: project.editor || 'grapesjs',
    projectData: project.projectData || {},
    html: project.html || '',
    css: project.css || '',
    metadata: project.metadata || { tags: [], description: '' },
    version,
  })

  const result = projectSchema.safeParse(repaired)
  return result.success ? result.data : null
}

export function validateProject(project) {
  const repaired = repairProject(project)
  return repaired ? { success: true, data: repaired } : { success: false, error: 'Invalid project' }
}

export function createEmptyProject(overrides = {}) {
  return repairProject({
    id: 'new',
    title: 'Untitled Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...emptyGrapesDefaults,
    metadata: { tags: [], description: '' },
    ...overrides,
  })
}
