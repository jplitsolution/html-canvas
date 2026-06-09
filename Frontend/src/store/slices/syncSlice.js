import { createSyncQueue } from '../../utils/collaboration'

export function createSyncSlice(set) {
  return {
    syncQueue: createSyncQueue(),
    errorLog: [],
    safeMode: false,

    logError: (component, error) => {
      const entry = { component, timestamp: Date.now(), stack: error?.stack || String(error) }
      set((s) => ({ errorLog: [...s.errorLog.slice(-49), entry] }))
    },

    setSafeMode: (enabled) => set({ safeMode: enabled }),
  }
}
