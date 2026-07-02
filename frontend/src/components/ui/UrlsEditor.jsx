import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Input from './Input'
import Button from './Button'
import IconButton from './IconButton'

function UrlsEditor({ label = 'URLs', urls = [], onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-fg-muted">{label}</label>
      {urls.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item.url}
            onChange={(e) => {
              const next = [...urls]
              next[i] = { ...next[i], url: e.target.value }
              onChange(next)
            }}
            placeholder="https://example.com"
            className="flex-1"
          />
          <IconButton
            onClick={() => onChange(urls.filter((_, j) => j !== i))}
            disabled={urls.length <= 1}
            className="!text-danger hover:!bg-danger-muted disabled:!opacity-30"
            aria-label="Remove URL"
          >
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([...urls, { url: '#' }])}
        className="!px-0 text-accent"
      >
        <Plus className="w-3 h-3" /> Add URL
      </Button>
    </div>
  )
}

export default memo(UrlsEditor)
