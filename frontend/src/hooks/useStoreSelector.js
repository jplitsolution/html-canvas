import { useShallow } from 'zustand/react/shallow'

export function useStoreShallow(selector) {
  return useShallow(selector)
}

export { useShallow }
