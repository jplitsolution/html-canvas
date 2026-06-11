import useStore from '../store/useStore'

export function usePreviewMode() {
  return useStore((s) => s.previewMode)
}
