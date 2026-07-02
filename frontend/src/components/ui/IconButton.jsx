import { memo } from 'react'

function IconButton({ children, className = '', title, ...props }) {
  return (
    <button
      type="button"
      title={title}
      className={`p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-subtle disabled:opacity-30 transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default memo(IconButton)
