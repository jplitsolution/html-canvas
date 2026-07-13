export function createUiSlice(set, get) {
  return {
    previewMode: 'desktop',
    loading: false,
    saving: false,
    error: null,
    toasts: [],
    srAnnouncement: '',

    setPreviewMode: (mode) => set({ previewMode: mode }),

    addToast: (message, type = 'info') => {
      const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
      set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
      setTimeout(() => get().removeToast(id), 3500)
    },

    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    announce: (message) => {
      set({ srAnnouncement: '' })
      requestAnimationFrame(() => set({ srAnnouncement: message }))
    },
  }
}
