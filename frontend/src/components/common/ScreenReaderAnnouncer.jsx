import { memo } from 'react'
import useStore from '../../store/useStore'

function ScreenReaderAnnouncer() {
  const message = useStore((s) => s.srAnnouncement)

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  )
}

export default memo(ScreenReaderAnnouncer)
