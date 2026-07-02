import { memo } from 'react'
import Input from './Input'
import Textarea from './Textarea'

function FormField({ label, type = 'text', value, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-fg-muted">{label}</label>
      )}
      {type === 'textarea' ? (
        <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} {...props} />
      ) : (
        <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props} />
      )}
    </div>
  )
}

export default memo(FormField)
