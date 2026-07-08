import { createContext, useContext, type ReactNode } from 'react'
import type { Editor } from 'grapesjs'

interface EditorContextValue {
  editor: Editor | null
  isEmpty: boolean
  device: string
  zoom: number
  advancedMode: boolean
  funnelPageType?: string
  setAdvancedMode: (v: boolean) => void
  setZoom: (z: number) => void
  setDevice: (d: string) => void
  refreshSelection: () => void
  selectionVersion: number
  dragDebug: import('../plugins/dragAndDrop').DragDebugState
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue
  children: ReactNode
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
