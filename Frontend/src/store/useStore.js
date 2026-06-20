import { create } from 'zustand'
import { createProjectSlice } from './slices/projectSlice'
import { createUiSlice } from './slices/uiSlice'

const useStore = create((set, get) => ({
  ...createProjectSlice(set, get),
  ...createUiSlice(set, get),
}))

export default useStore
