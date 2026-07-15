import { useCallback, useEffect, useState } from 'react'
import type { Editor } from 'grapesjs'
import { Code2, RefreshCw, Check } from 'lucide-react'
import { getActivePageSnapshot } from '../services/exportSite'
import { transformReactComponentsInHtml } from '../utils/styleUtils'
import { ensureAllTextEditable } from '../utils/textContent'

type RawHtmlPanelProps = {
  editor: Editor | null
  active: boolean
}

function formatHtml(html: string): string {
  if (!html?.trim()) return ''
  return html
    .replace(/></g, '>\n<')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function RawHtmlPanel({ editor, active }: RawHtmlPanelProps) {
  const [code, setCode] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const syncFromEditor = useCallback(() => {
    if (!editor) return
    const snapshot = getActivePageSnapshot(editor)
    const formattedHtml = formatHtml(snapshot.html)
    const currentCss = snapshot.css || ''
    const combinedCode = `<style>\n${currentCss}\n</style>\n\n${formattedHtml}`
    setCode(combinedCode)
    setIsDirty(false)
    setApplyError(null)
  }, [editor])

  useEffect(() => {
    if (!editor || !active) return
    syncFromEditor()
  }, [editor, active, syncFromEditor])

  useEffect(() => {
    if (!editor || !active) return

    const onChange = () => {
      if (!isDirty) syncFromEditor()
    }

    editor.on('component:update', onChange)
    editor.on('component:add', onChange)
    editor.on('component:remove', onChange)
    editor.on('page:select', onChange)

    return () => {
      editor.off('component:update', onChange)
      editor.off('component:add', onChange)
      editor.off('component:remove', onChange)
      editor.off('page:select', onChange)
    }
  }, [editor, active, isDirty, syncFromEditor])

  const handleApply = async () => {
    if (!editor) return
    setApplying(true)
    setApplyError(null)

    try {
      let parsedCss = ''
      let parsedHtml = code

      const styleMatch = code.match(/<style>([\s\S]*?)<\/style>([\s\S]*)/i)
      if (styleMatch) {
        parsedCss = styleMatch[1].trim()
        parsedHtml = styleMatch[2].trim()
      } else {
        // Fallback: extract any inline style tags
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = code
        const styles = tempDiv.querySelectorAll('style')
        styles.forEach(s => {
          parsedCss += s.innerHTML + '\n'
          s.remove()
        })
        parsedHtml = tempDiv.innerHTML
      }

      editor.setStyle(parsedCss)
      const compiled = transformReactComponentsInHtml(parsedHtml)
      editor.setComponents(compiled)
      ensureAllTextEditable(editor)

      setIsDirty(false)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to apply changes')
    } finally {
      setApplying(false)
    }
  }

  const lineCount = code ? code.split('\n').length : 1

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          <Code2 className="w-3.5 h-3.5" />
          <span>Raw Code (HTML + CSS)</span>
          {isDirty && (
            <span className="px-1.5 py-0.5 rounded bg-warning-muted text-warning text-[10px] font-semibold uppercase">
              Unsaved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={syncFromEditor}
          title="Refresh from canvas"
          className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setIsDirty(true)
            setApplyError(null)
          }}
          spellCheck={false}
          className="absolute inset-0 w-full h-full resize-none rounded-lg border border-border bg-bg-subtle text-fg font-mono text-[11px] leading-relaxed p-3 focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder={'<style>\n/* CSS */\n</style>\n<!-- HTML -->'}
        />
      </div>

      <div className="flex items-center justify-between gap-2 shrink-0 text-[10px] text-fg-muted">
        <span>{lineCount} line{lineCount === 1 ? '' : 's'}</span>
        <span>{code.length.toLocaleString()} chars</span>
      </div>

      {applyError && (
        <p className="text-xs text-danger bg-danger-muted rounded-lg px-3 py-2 shrink-0">{applyError}</p>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={!isDirty || applying || !editor}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium bg-accent text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        <Check className="w-4 h-4" />
        {applying ? 'Applying…' : 'Apply to Canvas'}
      </button>

      <p className="text-[10px] text-fg-muted leading-relaxed shrink-0">
        Edit code here, then click Apply to update the canvas. Use Refresh to discard local edits.
      </p>
    </div>
  )
}

export default RawHtmlPanel
