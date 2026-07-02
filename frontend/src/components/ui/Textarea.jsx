import { memo } from 'react'

function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-elevated text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring focus:border-border-focus transition-colors resize-y min-h-[80px] ${className}`}
      {...props}
    />
  )
}

export default memo(Textarea)
