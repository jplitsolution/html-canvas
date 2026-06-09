import { useEffect, memo } from 'react'
import { X } from 'lucide-react'
import IconButton from '../ui/IconButton'

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-bg-elevated rounded-xl border border-border shadow-xl animate-slide-up`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-fg font-display">{title}</h2>
          <IconButton onClick={onClose} aria-label="Close modal">
            <X className="w-5 h-5" />
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default memo(Modal)
