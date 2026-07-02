import { memo } from 'react'
import { Monitor, Tablet, Smartphone } from 'lucide-react'

const devices = [
  { mode: 'desktop', icon: Monitor, label: 'Desktop' },
  { mode: 'tablet', icon: Tablet, label: 'Tablet' },
  { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
]

function DeviceSwitcher({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-0.5 bg-bg-subtle border border-border rounded-md p-0.5 ${className}`} role="group" aria-label="Device preview">
      {devices.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`p-1.5 rounded transition-colors ${
            value === mode
              ? 'bg-bg-elevated shadow-sm text-accent'
              : 'text-fg-muted hover:text-fg'
          }`}
          title={label}
          aria-label={label}
          aria-pressed={value === mode}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}

export default memo(DeviceSwitcher)
