import { useEffect } from 'react'
import { startSession, endSession } from '../utils/analytics'

export function useDraftRecovery() {
  useEffect(() => {
    startSession()
    return () => endSession()
  }, [])
}
