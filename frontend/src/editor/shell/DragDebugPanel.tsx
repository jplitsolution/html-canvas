import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Bug } from 'lucide-react'
import type { DragDebugState } from '../plugins/dragAndDrop'

interface DragDebugPanelProps {
  debug: DragDebugState
}

export function DragDebugPanel({ debug }: DragDebugPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="absolute bottom-3 left-3 z-50 max-w-xs">


      {open && (
        <pre className="mt-2 p-3 rounded-lg bg-slate-900/95 text-emerald-400 text-[10px] leading-relaxed shadow-xl border border-slate-700 overflow-auto max-h-64 font-mono">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function DropToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: number | undefined
    const handler = (e: Event) => {
      const label = (e as CustomEvent<{ label: string }>).detail?.label
      setMessage(label ? `Dropped: ${label}` : 'Component added')
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(null), 2200)
    }
    window.addEventListener('tc-drop-success', handler)
    return () => {
      window.removeEventListener('tc-drop-success', handler)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (!message) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-lg animate-in fade-in">
      ✓ {message}
    </div>
  )
}
