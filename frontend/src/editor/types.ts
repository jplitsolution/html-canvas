import type { Editor } from 'grapesjs'

export interface GrapesEditorData {
  projectData?: Record<string, unknown>
  html?: string
  css?: string
}

export interface SavedTemplatePayload {
  name: string
  projectData: Record<string, unknown>
  html: string
  css: string
  pages?: any[]
  activePageFilename?: string
}

export interface SaveTemplateMeta {
  id: string
  name: string
  createdAt?: string
  metadata?: { tags: string[]; description: string }
}

export interface TemplateEditorProps {
  projectId: string
  projectTitle: string
  projectCreatedAt?: string
  projectMetadata?: { tags: string[]; description: string }
  initialData: GrapesEditorData
  onSave?: (saved: unknown) => void
  onDirtyChange?: (dirty: boolean) => void
  onPreview?: (payload: SavedTemplatePayload) => void
  saveHandler?: (editor: import('grapesjs').Editor, meta: SaveTemplateMeta) => Promise<unknown>
}

export interface ToolbarCallbacks {
  onSave: () => Promise<void>
  onPreview: () => void
  saving?: boolean
}

export type GrapesEditor = Editor
