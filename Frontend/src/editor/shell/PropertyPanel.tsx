import { useLayoutEffect, useRef, useState } from 'react'
import { useEditor } from '../context/EditorContext'
import { getComponentKind, getStyleProp, setStyleProp } from '../utils/blockActions'
import { getLinkText, getTextContent, setLinkText, setTextContent } from '../utils/textContent'
import { getSectionAnchorId, setSectionAnchorId, listSectionAnchorsOnPage, ANCHOR_PRESETS } from '../utils/sectionAnchor'
import { mountAdvancedPanels, ensureComponentStylable } from '../utils/mountAdvancedPanels'
import type { Component } from 'grapesjs'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-subtle text-fg focus:outline-none focus:ring-2 focus:ring-accent/30'

export function PropertyPanel() {
  const { editor, selectionVersion, advancedMode, setAdvancedMode, refreshSelection } = useEditor()
  const styleHostRef = useRef<HTMLDivElement>(null)
  const traitHostRef = useRef<HTMLDivElement>(null)
  const [anchorError, setAnchorError] = useState<string | null>(null)

  const selected = editor?.getSelected() as Component | null
  const kind = editor && selected ? getComponentKind(selected) : 'none'
  const pageAnchors = editor && selected ? listSectionAnchorsOnPage(editor, selected) : []

  useLayoutEffect(() => {
    setAnchorError(null)
  }, [selectionVersion])

  useLayoutEffect(() => {
    if (!editor || !advancedMode) return
    const cmp = editor.getSelected() as Component | null
    if (!cmp || getComponentKind(cmp) === 'none') return

    ensureComponentStylable(cmp)

    if (styleHostRef.current) styleHostRef.current.id = 'tc-advanced-styles'
    if (traitHostRef.current) traitHostRef.current.id = 'tc-advanced-traits'

    mountAdvancedPanels(editor, cmp)
  }, [editor, advancedMode, selectionVersion])

  if (!editor) {
    return (
      <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated p-4">
        <p className="text-sm text-fg-muted">Loading...</p>
      </aside>
    )
  }

  const update = () => {
    // Keep GrapesJS selection; only refresh panel fields
    refreshSelection()
  }

  if (!selected || kind === 'none') {
    return (
      <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-fg">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-fg-muted">Select an element on the canvas to edit its properties.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fg capitalize">{kind} properties</h2>
          <p className="text-xs text-fg-muted mt-0.5 truncate">{selected.get('tagName') || kind}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            title="Duplicate"
            onClick={() => editor.runCommand('tc-duplicate')}
            className="p-1.5 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg text-xs"
          >
            Duplicate
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => editor.runCommand('tc-delete')}
            className="p-1.5 rounded-md text-danger hover:bg-danger-muted text-xs"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {kind === 'text' && (
          <>
            <Field label="Content">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={getTextContent(selected)}
                onChange={(e) => {
                  setTextContent(selected, e.target.value, editor)
                  update()
                }}
              />
              <p className="text-xs text-fg-muted pt-0.5">Double-click text on the canvas to edit inline.</p>
            </Field>
            <Field label="Font size">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'font-size') || '16px'}
                onChange={(e) => {
                  setStyleProp(selected, 'font-size', e.target.value)
                  update()
                }}
              >
                {['14px', '16px', '18px', '24px', '32px', '48px'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Font weight">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'font-weight') || '400'}
                onChange={(e) => {
                  setStyleProp(selected, 'font-weight', e.target.value)
                  update()
                }}
              >
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
              </select>
            </Field>
            <Field label="Color">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border cursor-pointer"
                value={toHex(getStyleProp(selected, 'color') || '#334155')}
                onChange={(e) => {
                  setStyleProp(selected, 'color', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Alignment">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'text-align') || 'left'}
                onChange={(e) => {
                  setStyleProp(selected, 'text-align', e.target.value)
                  update()
                }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
          </>
        )}

        {kind === 'button' && (
          <>
            <Field label="Button text">
              <input
                className={inputClass}
                value={getLinkText(selected)}
                onChange={(e) => {
                  setLinkText(selected, e.target.value, editor)
                  update()
                }}
              />
            </Field>
            <Field label="Link URL">
              <input
                className={inputClass}
                value={selected.getAttributes()?.href || '#'}
                onChange={(e) => {
                  selected.addAttributes({ href: e.target.value })
                  update()
                }}
              />
              {pageAnchors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pageAnchors.map((anchor) => (
                    <button
                      key={anchor}
                      type="button"
                      onClick={() => {
                        selected.addAttributes({ href: `#${anchor}` })
                        update()
                      }}
                      className="px-2 py-0.5 text-[11px] rounded-md border border-border bg-bg-subtle hover:border-accent hover:text-accent"
                    >
                      #{anchor}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-fg-muted pt-0.5">Use #section-id to scroll on this page (test in Preview).</p>
            </Field>
            <Field label="Background color">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border"
                value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#4f46e5')}
                onChange={(e) => {
                  setStyleProp(selected, 'background-color', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Border radius">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'border-radius') || '8px'}
                onChange={(e) => {
                  setStyleProp(selected, 'border-radius', e.target.value)
                  update()
                }}
              >
                {['0', '4px', '8px', '12px', '999px'].map((v) => (
                  <option key={v} value={v}>{v === '999px' ? 'Pill' : v}</option>
                ))}
              </select>
            </Field>
            <Field label="Size">
              <select
                className={inputClass}
                onChange={(e) => {
                  const map: Record<string, string> = {
                    sm: '8px 16px',
                    md: '12px 24px',
                    lg: '16px 32px',
                  }
                  setStyleProp(selected, 'padding', map[e.target.value] || map.md)
                  update()
                }}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
          </>
        )}

        {kind === 'image' && (
          <>
            <Field label="Image URL">
              <input
                className={inputClass}
                value={selected.getAttributes()?.src || ''}
                onChange={(e) => {
                  selected.addAttributes({ src: e.target.value })
                  update()
                }}
              />
            </Field>
            <button
              type="button"
              onClick={() => editor.runCommand('tc-image-replace')}
              className="w-full py-2 text-sm font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent text-fg"
            >
              Replace image
            </button>
            <Field label="Alt text">
              <input
                className={inputClass}
                value={selected.getAttributes()?.alt || ''}
                onChange={(e) => {
                  selected.addAttributes({ alt: e.target.value })
                  update()
                }}
              />
            </Field>
            <Field label="Width">
              <input
                className={inputClass}
                value={getStyleProp(selected, 'width') || '100%'}
                onChange={(e) => {
                  setStyleProp(selected, 'width', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Height">
              <input
                className={inputClass}
                value={getStyleProp(selected, 'height') || 'auto'}
                onChange={(e) => {
                  setStyleProp(selected, 'height', e.target.value)
                  update()
                }}
              />
            </Field>
          </>
        )}

        {(kind === 'section' || kind === 'generic') && (
          <>
            <Field label="Section anchor (for nav links)">
              <input
                className={inputClass}
                placeholder="contact"
                value={getSectionAnchorId(selected)}
                onChange={(e) => {
                  if (!editor) return
                  const result = setSectionAnchorId(editor, selected, e.target.value)
                  setAnchorError(result.ok ? null : result.error ?? null)
                  if (result.ok) update()
                }}
              />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {ANCHOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (!editor) return
                      const result = setSectionAnchorId(editor, selected, preset)
                      setAnchorError(result.ok ? null : result.error ?? null)
                      if (result.ok) update()
                    }}
                    className="px-2 py-0.5 text-[11px] rounded-md border border-border bg-bg-subtle hover:border-accent hover:text-accent capitalize"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <p className="text-xs text-fg-muted pt-1">
                Navbar link <code className="text-[11px]">#contact</code> scrolls here. Pick a preset or type your own.
              </p>
              {anchorError && <p className="text-xs text-danger pt-0.5">{anchorError}</p>}
            </Field>
            <Field label="Width">
              <input
                className={inputClass}
                placeholder="e.g. 100%, 960px"
                value={getStyleProp(selected, 'width') || ''}
                onChange={(e) => {
                  setStyleProp(selected, 'width', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Height">
              <input
                className={inputClass}
                placeholder="e.g. auto, 400px"
                value={getStyleProp(selected, 'height') || ''}
                onChange={(e) => {
                  setStyleProp(selected, 'height', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Min height">
              <input
                className={inputClass}
                placeholder="e.g. 400px"
                value={getStyleProp(selected, 'min-height') || ''}
                onChange={(e) => {
                  setStyleProp(selected, 'min-height', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Background">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border"
                value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#ffffff')}
                onChange={(e) => {
                  setStyleProp(selected, 'background-color', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Padding">
              <input
                className={inputClass}
                placeholder="e.g. 64px 32px"
                value={getStyleProp(selected, 'padding') || ''}
                onChange={(e) => {
                  setStyleProp(selected, 'padding', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Margin">
              <input
                className={inputClass}
                placeholder="e.g. 0 auto"
                value={getStyleProp(selected, 'margin') || ''}
                onChange={(e) => {
                  setStyleProp(selected, 'margin', e.target.value)
                  update()
                }}
              />
            </Field>
            <Field label="Layout">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'display') || 'block'}
                onChange={(e) => {
                  setStyleProp(selected, 'display', e.target.value)
                  update()
                }}
              >
                <option value="block">Block</option>
                <option value="flex">Flex</option>
                <option value="grid">Grid</option>
              </select>
            </Field>
            {getStyleProp(selected, 'display') === 'flex' && (
              <>
                <Field label="Flex direction">
                  <select
                    className={inputClass}
                    value={getStyleProp(selected, 'flex-direction') || 'row'}
                    onChange={(e) => {
                      setStyleProp(selected, 'flex-direction', e.target.value)
                      update()
                    }}
                  >
                    <option value="row">Row</option>
                    <option value="column">Column</option>
                  </select>
                </Field>
                <Field label="Gap">
                  <input
                    className={inputClass}
                    placeholder="e.g. 16px, 24px"
                    value={getStyleProp(selected, 'gap') || ''}
                    onChange={(e) => {
                      setStyleProp(selected, 'gap', e.target.value)
                      update()
                    }}
                  />
                </Field>
                <Field label="Align items">
                  <select
                    className={inputClass}
                    value={getStyleProp(selected, 'align-items') || 'stretch'}
                    onChange={(e) => {
                      setStyleProp(selected, 'align-items', e.target.value)
                      update()
                    }}
                  >
                    <option value="stretch">Stretch</option>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                  </select>
                </Field>
                <Field label="Justify content">
                  <select
                    className={inputClass}
                    value={getStyleProp(selected, 'justify-content') || 'flex-start'}
                    onChange={(e) => {
                      setStyleProp(selected, 'justify-content', e.target.value)
                      update()
                    }}
                  >
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="space-between">Space between</option>
                  </select>
                </Field>
              </>
            )}
          </>
        )}

        <div className="pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              className="rounded border-border"
            />
            Advanced CSS mode
          </label>
          <p className="text-[11px] text-fg-subtle mt-1.5 leading-relaxed">
            Full CSS controls: size, flex, typography, borders. Click inner elements on canvas or use Layers tab.
          </p>
        </div>

        {advancedMode && (
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="text-xs font-semibold text-fg mb-2">Component settings</h3>
              <div ref={traitHostRef} className="tc-advanced-traits-host" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-fg mb-2">CSS styles</h3>
              <div ref={styleHostRef} className="tc-advanced-styles-host" />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function toHex(color: string): string {
  if (color.startsWith('#')) return color.length === 7 ? color : '#000000'
  return '#334155'
}

// Re-render when selection changes via context
export function PropertyPanelConnected() {
  return <PropertyPanel />
}
