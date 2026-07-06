import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { useEditor } from '../context/EditorContext'
import { validateFunnelPage } from '../utils/funnelGuide'

interface FunnelGuideBannerProps {
  pageType?: string
}

export function FunnelGuideBanner({ pageType }: FunnelGuideBannerProps) {
  const { editor } = useEditor()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(() => validateFunnelPage(editor, pageType))

  useEffect(() => {
    if (!editor || !pageType) return

    const refresh = () => setStatus(validateFunnelPage(editor, pageType))

    refresh()
    editor.on('component:add', refresh)
    editor.on('component:remove', refresh)
    editor.on('component:update', refresh)
    editor.on('change:changesCount', refresh)

    return () => {
      editor.off('component:add', refresh)
      editor.off('component:remove', refresh)
      editor.off('component:update', refresh)
      editor.off('change:changesCount', refresh)
    }
  }, [editor, pageType])

  const { guide, ok, missing } = status
  if (!pageType || !guide) return null

  return (
    <div
      className={`shrink-0 border-b px-4 py-2.5 ${
        ok ? 'bg-success-muted/40 border-success/20' : 'bg-warning-muted/50 border-warning/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">{guide.title}</p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-fg-muted hover:text-fg p-1 rounded"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
            {expanded ? guide.summary : 'Tap ▼ to see what you can change vs. must keep'}
          </p>

          {!ok && (
            <p className="text-xs font-medium text-warning mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Missing: {missing.map((m) => m.label).join(', ')} — subscription may break!
            </p>
          )}

          {expanded && (
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 text-xs">
              <div className="rounded-md border border-border bg-bg-elevated/80 p-2.5">
                <p className="font-semibold text-fg mb-1">Safe to change</p>
                <ul className="text-fg-muted space-y-0.5 list-disc pl-4">
                  {guide.canChange.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {guide.required.length > 0 && (
                <div className="rounded-md border border-border bg-bg-elevated/80 p-2.5">
                  <p className="font-semibold text-fg mb-1">Do not remove</p>
                  <ul className="space-y-1">
                    {guide.required.map((req) => {
                      const present = !missing.some((m) => m.id === req.id)
                      return (
                        <li key={req.id} className="flex gap-1.5">
                          {present ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                          )}
                          <span className={present ? 'text-fg-muted' : 'text-warning font-medium'}>
                            <strong className="font-medium text-fg">{req.label}</strong> — {req.why}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FunnelGuideBanner
