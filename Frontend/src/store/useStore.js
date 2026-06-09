import { create } from 'zustand'
import { createProjectSlice } from './slices/projectSlice'
import { createEditorSlice } from './slices/editorSlice'
import { createUiSlice } from './slices/uiSlice'
import { createSyncSlice } from './slices/syncSlice'

const useStore = create((set, get) => ({
  ...createProjectSlice(set, get),
  ...createEditorSlice(set, get),
  ...createUiSlice(set, get),
  ...createSyncSlice(set),
}))

export default useStore
