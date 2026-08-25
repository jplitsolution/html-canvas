import { memo, useState } from 'react'
import { Plus, X } from 'lucide-react'

export const GLOBAL_CALLBACK_STATUSES = 'active, success, ok, subscribed, 1, true'

export const PRESET_CALLBACK_STATUSES = [
  'active',
  'grace',
  'parking',
  'unsub',
  'success',
  'ok',
  'subscribed',
]

export function parseCallbackStatuses(value) {
  if (!value) return []
  const seen = new Set()
  const out = []
  for (const part of String(value).split(',')) {
    const s = part.trim().toLowerCase().slice(0, 64)
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

export function serializeCallbackStatuses(list) {
  return parseCallbackStatuses((list || []).join(',')).join(', ')
}

export function fallbackCallbackStatusesHint(vendor) {
  const vendorVal = vendor?.allowedCallbackStatuses?.trim()
  if (vendorVal) return `Blank uses vendor default: ${vendorVal}.`
  return `Blank uses global default: ${GLOBAL_CALLBACK_STATUSES}.`
}

export function vendorFireSkipCopy(received, allowedLabel) {
  const rec = String(received || '').trim() || '(empty)'
  const allowed = String(allowedLabel || '').trim() || GLOBAL_CALLBACK_STATUSES
  return `Vendor postback not sent because received status "${rec}" is not in allowed statuses [${allowed}].`
}

export function effectiveCallbackStatuses(assignmentValue, vendor) {
  const assignment = String(assignmentValue || '').trim()
  if (assignment) return assignment
  const vendorVal = vendor?.allowedCallbackStatuses?.trim()
  if (vendorVal) return vendorVal
  return GLOBAL_CALLBACK_STATUSES
}

function AllowedCallbackStatusesField({
  value,
  onChange,
  disabled = false,
  label = 'Fire postback on',
  hint,
  compact = false,
}) {
  const [custom, setCustom] = useState('')
  const selected = parseCallbackStatuses(value)
  const extras = selected.filter((s) => !PRESET_CALLBACK_STATUSES.includes(s))

  const commit = (nextList) => {
    const next = serializeCallbackStatuses(nextList)
    const current = serializeCallbackStatuses(selected)
    if (next === current) return
    onChange(next || null)
  }

  const toggle = (status) => {
    if (disabled) return
    if (selected.includes(status)) {
      commit(selected.filter((s) => s !== status))
    } else {
      commit([...selected, status])
    }
  }

  const addCustom = () => {
    const next = parseCallbackStatuses(`${selected.join(',')}, ${custom}`)
    setCustom('')
    commit(next)
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_CALLBACK_STATUSES.map((status) => {
          const on = selected.includes(status)
          return (
            <button
              key={status}
              type="button"
              disabled={disabled}
              onClick={() => toggle(status)}
              className={`
                font-mono rounded-md border px-2 py-0.5 transition-colors
                disabled:cursor-not-allowed disabled:opacity-50
                ${compact ? 'text-[10px]' : 'text-[11px]'}
                ${
                  on
                    ? 'border-accent bg-accent-muted text-accent font-semibold'
                    : 'border-border bg-bg-elevated text-fg-muted hover:border-fg-subtle/50 hover:text-fg'
                }
              `}
            >
              {status}
            </button>
          )
        })}
        {extras.map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => toggle(status)}
            title="Remove"
            className={`
              inline-flex items-center gap-1 font-mono rounded-md border px-2 py-0.5
              border-accent bg-accent-muted text-accent font-semibold
              disabled:cursor-not-allowed disabled:opacity-50
              ${compact ? 'text-[10px]' : 'text-[11px]'}
            `}
          >
            {status}
            <X className="w-3 h-3" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          className={`
            flex-1 min-w-0 border border-border rounded-md px-2 bg-bg-elevated text-fg font-mono
            disabled:opacity-50
            ${compact ? 'text-[11px] py-1' : 'text-xs py-1.5'}
          `}
          value={custom}
          disabled={disabled}
          placeholder="custom status (e.g. billing_ok)"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <button
          type="button"
          disabled={disabled || !custom.trim()}
          onClick={addCustom}
          className="inline-flex items-center gap-1 shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-fg-muted hover:text-fg hover:bg-bg-muted disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
        {selected.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => commit([])}
            className="shrink-0 text-[11px] text-fg-subtle hover:text-fg disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-[11px] text-fg-subtle leading-snug">{hint}</p> : null}
    </div>
  )
}

export default memo(AllowedCallbackStatusesField)
