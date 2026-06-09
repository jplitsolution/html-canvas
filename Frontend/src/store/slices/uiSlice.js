export function createUiSlice(set, get) {
  return {
    previewMode: 'desktop',
    zoom: 100,
    loading: false,
    saving: false,
    error: null,
    activeDragId: null,
    toasts: [],
    srAnnouncement: '',
    selectedBlockId: null,
    selectedBlocks: [],
    showRecoveryDialog: false,
    showShortcutsModal: false,
    pendingDraft: null,

    setPreviewMode: (mode) => set({ previewMode: mode }),
    setZoom: (zoom) => set({ zoom: Math.min(150, Math.max(50, zoom)) }),
    setSelectedBlockId: (id) => set({ selectedBlockId: id, selectedBlocks: id ? [id] : [] }),
    setActiveDragId: (id) => set({ activeDragId: id }),
    setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),

    selectMultiple: (ids) => set({ selectedBlocks: ids, selectedBlockId: ids[0] || null }),

    toggleBlockSelection: (id, shiftKey = false) => {
      const { selectedBlocks } = get()
      if (shiftKey) {
        const next = selectedBlocks.includes(id)
          ? selectedBlocks.filter((bid) => bid !== id)
          : [...selectedBlocks, id]
        set({ selectedBlocks: next, selectedBlockId: next[0] || null })
      } else {
        set({ selectedBlocks: [id], selectedBlockId: id })
      }
    },

    deselectAll: () => set({ selectedBlockId: null, selectedBlocks: [] }),

    addToast: (message, type = 'info') => {
      const id = crypto.randomUUID()
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
