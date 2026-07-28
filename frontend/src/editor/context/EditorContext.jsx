import { createContext, useContext } from 'react'

export const EditorContext = createContext(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}

export function EditorProvider({
  value,
  children,
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
