import { create } from 'zustand'
import { createProjectSlice } from './slices/projectSlice'
import { createUiSlice } from './slices/uiSlice'

const useStore = create((set, get) => ({
  // ✅ Merge existing slices
  ...createProjectSlice(set, get),
  ...createUiSlice(set, get),
  
  // ✅ Add logError without TypeScript types (plain JavaScript)
  logError: (componentName, error) => {
    console.error(`[${componentName}] Error:`, error);
    
    // Add a toast notification for the user
    const addToast = get().addToast;
    if (typeof addToast === 'function') {
      addToast('An error occurred. Please try again.', 'error');
    }
  },
}));

export default useStore;