import { create } from 'zustand'
import { createProjectSlice } from './slices/projectSlice'
import { createUiSlice } from './slices/uiSlice'

// Load initial metrics from local storage to avoid circular import issues
const METRICS_KEY = 'templatecraft_metrics'
const defaultMetrics = {
  projectsCreated: 0,
  blocksAdded: 0,
  exports: 0,
  saveCount: 0,
  sessionTime: 0,
  sessions: 0,
}

function getInitialMetrics() {
  try {
    const data = localStorage.getItem(METRICS_KEY)
    return data ? { ...defaultMetrics, ...JSON.parse(data) } : { ...defaultMetrics }
  } catch {
    return { ...defaultMetrics }
  }
}

const initialMetrics = getInitialMetrics()

const useStore = create((set, get) => ({
  // ✅ Merge existing slices
  ...createProjectSlice(set, get),
  ...createUiSlice(set, get),

  // ✅ Reactive Analytics State
  saveCount: initialMetrics.saveCount || 0,
  exports: initialMetrics.exports || 0,
  sessionTime: initialMetrics.sessionTime || 0,
  
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