export function createUiSlice(set, get) {
  return {
    previewMode: 'desktop',
    dateFormat: JSON.parse(localStorage.getItem('templatecraft_settings') || '{}').dateFormat || 'YYYY-MM-DD',
    timezone: JSON.parse(localStorage.getItem('templatecraft_settings') || '{}').timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    loading: false,
    saving: false,
    error: null,
    toasts: [],
    srAnnouncement: '',

    setPreviewMode: (mode) => set({ previewMode: mode }),
    setDateFormat: (format) => set({ dateFormat: format }),
    setTimezone: (tz) => set({ timezone: tz }),

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
