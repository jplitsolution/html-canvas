import { useEffect, memo } from 'react'
import { X } from 'lucide-react'
import IconButton from './IconButton'

function SlidePanel({ isOpen, onClose, side = 'left', title, children, className = '' }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sideClass = side === 'left'
    ? 'left-0 border-r slide-panel-left'
    : 'right-0 border-l slide-panel-right'

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-bg-overlay backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className={`absolute top-0 bottom-0 flex flex-col bg-bg-elevated shadow-xl border-border w-[min(320px,88vw)] safe-bottom ${sideClass} ${className}`}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-fg font-display">{title}</h2>
            <IconButton onClick={onClose} aria-label="Close panel">
              <X className="w-5 h-5" />
            </IconButton>
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </aside>
    </div>
  )
}

export default memo(SlidePanel)
