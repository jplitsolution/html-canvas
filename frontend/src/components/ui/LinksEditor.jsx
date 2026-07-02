import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Input from './Input'
import Button from './Button'
import IconButton from './IconButton'

function LinksEditor({ label = 'Links', links = [], onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-muted">{label}</label>
      {links.map((link, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={link.label}
            onChange={(e) => {
              const u = [...links]
              u[i] = { ...u[i], label: e.target.value }
              onChange(u)
            }}
            placeholder="Label"
            className="flex-1"
          />
          <Input
            value={link.url}
            onChange={(e) => {
              const u = [...links]
              u[i] = { ...u[i], url: e.target.value }
              onChange(u)
            }}
            placeholder="URL"
            className="flex-1"
          />
          <IconButton
            onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="!text-danger hover:!bg-danger-muted"
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...links, { label: 'Link', url: '#' }])}
        className="!px-0 text-accent"
      >
        <Plus className="w-3 h-3" /> Add Link
      </Button>
    </div>
  )
}

export default memo(LinksEditor)
