import { memo } from 'react'

function Card({ children, className = '', interactive = false, onClick }) {
  const base = interactive ? 'surface-card-interactive cursor-pointer' : 'surface-card'
  return (
    <div className={`${base} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  )
}

export default memo(Card)
