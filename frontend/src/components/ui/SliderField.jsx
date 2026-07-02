import { memo } from 'react'

function SliderField({ label, value, onChange, min = 0, max = 100, inherited }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <label className="text-xs font-medium text-fg-muted">
          {label}
          {inherited != null && (
            <span className={`text-[10px] ml-1 ${inherited ? 'text-success' : 'text-warning'}`}>
              {inherited ? 'Inherited' : 'Overridden'}
            </span>
          )}
        </label>
        <span className="text-xs text-fg-subtle">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  )
}

export default memo(SliderField)
