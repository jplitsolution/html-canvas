import { memo } from 'react'
import { COLOR_PRESETS } from '../../constants/blocks'
import Input from './Input'

function ColorField({ label, value, onChange, inherited }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-muted">
        {label}
        {inherited != null && (
          <span className={`text-[10px] ml-1 ${inherited ? 'text-success' : 'text-warning'}`}>
            {inherited ? 'Inherited' : 'Overridden'}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${value === color ? 'border-accent scale-110' : 'border-border'}`}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>
      <Input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#000000" />
    </div>
  )
}

export default memo(ColorField)
