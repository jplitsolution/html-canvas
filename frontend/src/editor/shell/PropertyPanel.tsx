import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useEditor } from '../context/EditorContext';
import { getComponentKind, getStyleProp, setStyleProp } from '../utils/blockActions';
import { getFlowElementInfo } from '../utils/funnelGuide';
import { getLinkText, getTextContent, setLinkText, setTextContent } from '../utils/textContent';
import { getSectionAnchorId, setSectionAnchorId, listSectionAnchorsOnPage, ANCHOR_PRESETS } from '../utils/sectionAnchor';
import { mountAdvancedPanels, ensureComponentStylable } from '../utils/mountAdvancedPanels';
import { MoveArrows, InnerSpaceArrows, StepArrows } from '../components/SpacingArrows';
import {
  parseSpacing,
  formatSpacing,
  parseCornerIndex,
  cornerIndexToCss,
  cornerLabel,
  parseTextSizeIndex,
  textSizeIndexToCss,
  CORNER_STEPS,
  TEXT_SIZE_STEPS,
} from '../utils/spacingUtils';
import type { Component } from 'grapesjs';

function formatHtml(html: string): string {
  if (!html?.trim()) return ''
  return html
    .replace(/></g, '>\n<')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function ComponentCodeEditor({ selected, editor, update }: { selected: Component; editor: any; update: () => void }) {
  const [code, setCode] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useLayoutEffect(() => {
    // get outer HTML with inline styles
    const el = selected.getEl();
    if (el) {
      setCode(formatHtml(el.outerHTML));
    } else {
      setCode(formatHtml(selected.toHTML()));
    }
    setIsDirty(false);
  }, [selected, editor, update]); // refresh on update()

  const applyCode = () => {
    try {
      const newComp = selected.replaceWith(code);
      if (Array.isArray(newComp)) {
        editor.select(newComp[0]);
      } else {
        editor.select(newComp);
      }
      setIsDirty(false);
      update();
    } catch (err) {
      console.error('Failed to apply component code', err);
    }
  };

  return (
    <div className="pt-4 mt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-fg">Component Code (HTML)</h3>
      </div>
      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setIsDirty(true);
        }}
        spellCheck={false}
        className="w-full h-32 text-[10px] font-mono p-2 bg-bg-subtle text-fg border border-border rounded resize-y focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {isDirty && (
        <button
          type="button"
          onClick={applyCode}
          className="mt-2 w-full py-1.5 text-[11px] font-semibold bg-accent text-accent-fg rounded hover:bg-accent-hover transition-colors"
        >
          Apply Code
        </button>
      )}
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function extractUrlFromBgImage(bgImage: unknown): string {
  if (!bgImage || typeof bgImage !== 'string' || bgImage === 'none') return ''
  const match = bgImage.match(/url\(["']?(.+?)["']?\)/)
  return match ? match[1] : ''
}

function BackgroundImageField({
  selected,
  editor,
  update,
}: {
  selected: Component;
  editor: any;
  update: () => void;
}) {
  const currentBgImage = getStyleProp(selected, 'background-image') || ''
  const currentUrl = extractUrlFromBgImage(currentBgImage)
  const hasImage = Boolean(currentBgImage && typeof currentBgImage === 'string' && currentBgImage !== 'none')

  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const applyUrl = useCallback((url: string) => {
    if (!url.trim()) return
    const trimmed = url.trim()
    // Use setStyle (inline) not addStyle (CSS manager) so background-image
    // is always included in exported/preview HTML as an inline style attribute
    const existingStyle = selected.getStyle() || {}
    selected.setStyle({
      ...existingStyle,
      'background-image': `url("${trimmed}")`,
      'background-size': existingStyle['background-size'] || 'cover',
      'background-position': existingStyle['background-position'] || 'center',
      'background-repeat': existingStyle['background-repeat'] || 'no-repeat',
      // Required so absolutely-positioned hotspots are contained correctly
      'position': existingStyle.position || 'relative',
      // Must not be hidden — clips background and absolute children like hotspots
      'overflow': 'visible',
    })
    setShowUrlInput(false)
    setUrlValue('')
    update()
  }, [selected, update])

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-fg-muted">Background Image</span>

      {/* Current image preview */}
      {hasImage && currentUrl && (
        <div
          className="w-full h-16 rounded-lg border border-border bg-bg-subtle overflow-hidden relative"
          style={{ backgroundImage: `url("${currentUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="text-[10px] text-white font-medium bg-black/40 px-2 py-0.5 rounded">Background Set</span>
          </div>
        </div>
      )}

      {/* Buttons row */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            editor.runCommand('open-assets', { target: selected })

            // ── Guaranteed fallback: directly wire the AM's confirm button ──
            // GrapesJS renders a "Select" / "Add" button in the asset manager modal.
            // When user single-clicks an asset and hits that button, we need to catch it.
            setTimeout(() => {
              const modalEl = document.querySelector('.gjs-mdl-content')
              if (!modalEl) return

              // Remove any previously attached listener to avoid duplicates
              const old = (modalEl as any)._tcBgClickHandler
              if (old) modalEl.removeEventListener('click', old, true)

              const handler = (e: Event) => {
                const target = e.target as HTMLElement
                // GrapesJS "Select" / "Add" button inside asset manager
                const isConfirmBtn =
                  target.closest('[data-key="add"]') ||
                  target.closest('.gjs-am-add-asset') ||
                  (target.tagName === 'BUTTON' &&
                    (target.textContent?.trim().toLowerCase() === 'select' ||
                      target.textContent?.trim().toLowerCase() === 'add'))

                if (!isConfirmBtn) return

                // Get the highlighted/selected asset URL from the AM
                const highlighted = modalEl.querySelector(
                  '.gjs-am-asset.gjs-two-color, .gjs-am-asset--selected, .gjs-am-asset:focus-within'
                ) as HTMLElement | null

                const img = highlighted?.querySelector('img') as HTMLImageElement | null
                const bgStyle = highlighted?.style?.backgroundImage || ''
                const srcMatch = bgStyle.match(/url\(["']?(.+?)["']?\)/)
                const rawUrl = img?.getAttribute('src') || (srcMatch ? srcMatch[1] : '') ||
                  (editor as any)._tc_highlighted_asset_url || ''
                const url = rawUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/g, '')

                if (!url) return

                const bgTarget = (editor as any)._tc_asset_target
                if (!bgTarget) return

                e.preventDefault()
                e.stopPropagation()

                // Apply background-image as inline style (setStyle)
                const existingStyle = bgTarget.getStyle() || {}
                bgTarget.setStyle({
                  ...existingStyle,
                  'background-image': `url("${url}")`,
                  'background-size': existingStyle['background-size'] || 'cover',
                  'background-position': existingStyle['background-position'] || 'center',
                  'background-repeat': existingStyle['background-repeat'] || 'no-repeat',
                  'position': existingStyle.position || 'relative',
                  'overflow': 'visible',
                })

                ;(editor as any)._tc_asset_target = null
                editor.Modal.close()
                update()
              }

              ;(modalEl as any)._tcBgClickHandler = handler
              modalEl.addEventListener('click', handler, true)
            }, 400)
          }}
          className="flex-1 py-2 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent text-fg transition-colors"
        >
          {hasImage ? '🖼 Change' : '📁 Browse'}
        </button>
        <button
          type="button"
          onClick={() => {
            setUrlValue(currentUrl)
            setShowUrlInput(!showUrlInput)
          }}
          className="flex-1 py-2 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent text-fg transition-colors"
          title="Enter image URL directly"
        >
          🔗 URL
        </button>
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div className="space-y-1.5">
          <input
            type="text"
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200"
            placeholder="https://example.com/image.jpg"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyUrl(urlValue)
              if (e.key === 'Escape') setShowUrlInput(false)
            }}
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => applyUrl(urlValue)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-fg hover:bg-accent-hover transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border bg-bg-subtle text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remove button */}
      {hasImage && (
        <button
          type="button"
          onClick={() => {
            setStyleProp(selected, 'background-image', 'none')
            setShowUrlInput(false)
            update()
          }}
          className="w-full py-1.5 text-xs font-medium rounded-lg border border-danger/30 text-danger bg-danger/5 hover:bg-danger/10 transition-colors"
        >
          ✕ Remove Image
        </button>
      )}
    </div>
  )
}

function AddHotspotButton({ selected, editor }: { selected: Component; editor: any }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!editor || !selected) return
        // Use the registered GrapesJS command which uses components().add()
        // This bypasses droppable restrictions unlike selected.append()
        editor.runCommand('tc-add-hotspot', { target: selected })
      }}
      className="w-full py-2.5 text-sm font-semibold rounded-lg border border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
    >
      <span>+</span> Add Hotspot
    </button>
  )
}


const inputClass =
  'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200';

const KIND_LABELS: Record<string, string> = {
  text: 'Text',
  button: 'Button',
  image: 'Photo',
  section: 'Section',
  generic: 'Block',
  link: 'Link',
  hotspot: 'Image Hotspot',
  none: 'Element',
};

function getButtonSize(padding: string | undefined): string {
  if (padding === '8px 16px') return 'sm';
  if (padding === '16px 32px') return 'lg';
  return 'md';
}

function PositionControls({
  selected,
  update,
}: {
  selected: Component;
  update: () => void;
}) {
  const margin = parseSpacing(getStyleProp(selected, 'margin'));
  const padding = parseSpacing(getStyleProp(selected, 'padding'));

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <MoveArrows
        label="Move on page"
        value={margin}
        onChange={(v) => {
          setStyleProp(selected, 'margin', formatSpacing(v));
          update();
        }}
      />
      <InnerSpaceArrows
        label="Space inside"
        value={padding}
        onChange={(v) => {
          setStyleProp(selected, 'padding', formatSpacing(v));
          update();
        }}
      />
    </div>
  );
}

export function PropertyPanel() {
  const { editor, selectionVersion, advancedMode, setAdvancedMode, refreshSelection } = useEditor();
  const styleHostRef = useRef<HTMLDivElement>(null);
  const traitHostRef = useRef<HTMLDivElement>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const selected = editor?.getSelected() as Component | null;
  const kind = editor && selected ? getComponentKind(selected) : 'none';
  const flowInfo = selected ? getFlowElementInfo((selected.getAttributes?.() || {}) as Record<string, string>) : null;

  useLayoutEffect(() => {
    setAnchorError(null);
  }, [selectionVersion]);

  useLayoutEffect(() => {
    if (!editor || !advancedMode) return;
    const cmp = editor.getSelected() as Component | null;
    if (!cmp || getComponentKind(cmp) === 'none') return;

    ensureComponentStylable(cmp);

    if (styleHostRef.current) styleHostRef.current.id = 'tc-advanced-styles';
    if (traitHostRef.current) traitHostRef.current.id = 'tc-advanced-traits';

    mountAdvancedPanels(editor, cmp);
  }, [editor, advancedMode, selectionVersion]);

  if (!editor) {
    return (
      <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated p-4">
        <p className="text-sm text-fg-muted">Loading...</p>
      </aside>
    );
  }

  const update = () => {
    refreshSelection();
  };

  if (!selected || kind === 'none') {
    return (
      <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-fg">Edit selection</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-fg-muted">
            Click any text, button, or image on the page to change it here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="tc-properties w-72 shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-fg">{KIND_LABELS[kind] || 'Element'}</h2>
          <p className="text-xs text-fg-muted mt-0.5">Change how this looks on your page</p>
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
        {flowInfo && (
          <div className="rounded-lg border border-warning/40 bg-warning-muted/40 p-3 space-y-1">
            <p className="text-xs font-semibold text-fg flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-warning" />
              {flowInfo.label}
            </p>
            <p className="text-[11px] text-fg-muted leading-relaxed">{flowInfo.description}</p>
          </div>
        )}

        {kind === 'text' && (
          <>
            <Field label="What it says">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={getTextContent(selected)}
                onChange={(e) => {
                  setTextContent(selected, e.target.value, editor);
                  update();
                }}
              />
              <p className="text-xs text-fg-muted pt-0.5">Tip: double-click text on the page to edit it directly.</p>
            </Field>
            <StepArrows
              label="Text size"
              valueLabel={['Small', 'Normal', 'Medium', 'Large', 'XL', '2XL', '3XL', '4XL', 'Huge'][parseTextSizeIndex(getStyleProp(selected, 'font-size'))] || 'Normal'}
              decreaseTitle="Smaller text"
              increaseTitle="Larger text"
              onDecrease={() => {
                const idx = Math.max(0, parseTextSizeIndex(getStyleProp(selected, 'font-size')) - 1);
                setStyleProp(selected, 'font-size', textSizeIndexToCss(idx));
                update();
              }}
              onIncrease={() => {
                const idx = Math.min(TEXT_SIZE_STEPS.length - 1, parseTextSizeIndex(getStyleProp(selected, 'font-size')) + 1);
                setStyleProp(selected, 'font-size', textSizeIndexToCss(idx));
                update();
              }}
            />
            <Field label="Font weight">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'font-weight') || '400'}
                onChange={(e) => {
                  setStyleProp(selected, 'font-weight', e.target.value);
                  update();
                }}
              >
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
              </select>
            </Field>
            <Field label="Text color">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border cursor-pointer"
                value={toHex(getStyleProp(selected, 'color') || '#334155')}
                onChange={(e) => {
                  setStyleProp(selected, 'color', e.target.value);
                  update();
                }}
              />
            </Field>
            <Field label="Alignment">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'text-align') || 'left'}
                onChange={(e) => {
                  setStyleProp(selected, 'text-align', e.target.value);
                  update();
                }}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <PositionControls selected={selected} update={update} />
          </>
        )}

        {kind === 'button' && (
          <>
            <Field label="Button label">
              <input
                className={inputClass}
                value={getLinkText(selected)}
                onChange={(e) => {
                  setLinkText(selected, e.target.value, editor);
                  update();
                }}
              />
            </Field>
            {!flowInfo && (
              <>
                <Field label="When clicked, go to">
                  <select
                    className={inputClass}
                    value={(() => {
                      const href = selected.getAttributes()?.href || '';
                      if (href.startsWith('#')) return 'anchor';
                      if (href.startsWith('http://') || href.startsWith('https://')) return 'external';
                      return 'page';
                    })()}
                    onChange={(e) => {
                      if (e.target.value === 'anchor') {
                        const anchors = listSectionAnchorsOnPage(editor, selected);
                        selected.addAttributes({ href: anchors.length > 0 ? `#${anchors[0]}` : '#' });
                      } else if (e.target.value === 'page') {
                        selected.addAttributes({ href: 'otp' });
                      } else {
                        selected.addAttributes({ href: 'https://' });
                      }
                      update();
                    }}
                  >
                    <option value="anchor">Another part of this page</option>
                    <option value="page">Another page in this campaign</option>
                    <option value="external">Another website</option>
                  </select>
                </Field>

                {(() => {
                  const href = selected.getAttributes()?.href || '';
                  const type = href.startsWith('#') ? 'anchor' : (href.startsWith('http://') || href.startsWith('https://')) ? 'external' : 'page';
                  
                  if (type === 'anchor') {
                    return (
                      <Field label="Scroll to section">
                        <select
                          className={inputClass}
                          value={href.replace(/^#/, '')}
                          onChange={(e) => {
                            selected.addAttributes({ href: `#${e.target.value}` });
                            update();
                          }}
                        >
                          <option value="">Select a section...</option>
                          {(() => {
                            const sections: { id: string; label: string }[] = [];
                            const wrapper = editor.getWrapper();
                            if (wrapper) {
                              const walk = (cmp: any) => {
                                const tag = (cmp.get('tagName') || '').toLowerCase();
                                const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article']);
                                const isSection = SECTION_TAGS.has(tag) || cmp.getAttributes()?.['data-tc-type'] === 'section';
                                if (isSection && tag !== 'header' && tag !== 'footer') {
                                  const id = cmp.getAttributes()?.id || cmp.getId();
                                  const label = cmp.get('sectionLabel') || id || 'Untitled Section';
                                  sections.push({ id, label });
                                }
                                cmp.components().forEach(walk);
                              };
                              walk(wrapper);
                            }
                            const seen = new Set();
                            const uniqueSections = sections.filter((s) => {
                              if (seen.has(s.id)) return false;
                              seen.add(s.id);
                              return true;
                            });
                            return uniqueSections.map((sec) => (
                              <option key={sec.id} value={sec.id}>
                                {sec.label} (#{sec.id})
                              </option>
                            ));
                          })()}
                        </select>
                      </Field>
                    );
                  }
                  
                  if (type === 'page') {
                    return (
                      <Field label="Page name">
                        <input
                          className={inputClass}
                          placeholder="e.g. otp, confirm"
                          value={href}
                          list="campaign-pages-list"
                          onChange={(e) => {
                            selected.addAttributes({ href: e.target.value });
                            update();
                          }}
                        />
                        <datalist id="campaign-pages-list">
                          <option value="HOME">HOME</option>
                          <option value="OTP">OTP</option>
                          <option value="CONFIRM">CONFIRM</option>
                          <option value="THANKYOU">THANKYOU</option>
                          <option value="ERROR">ERROR</option>
                          {editor && editor.Pages.getAll().map((p: any) => {
                            const pid = String(p.getId());
                            const pname = String(p.get('name') || pid);
                            if (['HOME', 'OTP', 'CONFIRM', 'THANKYOU', 'ERROR'].includes(pid.toUpperCase())) return null;
                            return <option key={pid} value={pid}>{pname}</option>;
                          })}
                        </datalist>
                      </Field>
                    );
                  }

                  return (
                    <Field label="Website address">
                      <input
                        className={inputClass}
                        value={href}
                        onChange={(e) => {
                          selected.addAttributes({ href: e.target.value });
                          update();
                        }}
                      />
                    </Field>
                  );
                })()}
              </>
            )}
            <Field label="Button color">
              <div className="flex gap-2">
                <input
                  type="color"
                  className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
                  value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#2563eb')}
                  onChange={(e) => {
                    setStyleProp(selected, 'background-color', e.target.value);
                    update();
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStyleProp(selected, 'background-color', 'transparent');
                    update();
                  }}
                  className="px-3 h-9 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent hover:text-accent transition-colors"
                  title="Make transparent"
                >
                  Clear
                </button>
              </div>
            </Field>
            <StepArrows
              label="Corner roundness"
              valueLabel={cornerLabel(parseCornerIndex(getStyleProp(selected, 'border-radius')))}
              decreaseTitle="Less rounded"
              increaseTitle="More rounded"
              onDecrease={() => {
                const idx = Math.max(0, parseCornerIndex(getStyleProp(selected, 'border-radius')) - 1);
                setStyleProp(selected, 'border-radius', cornerIndexToCss(idx));
                update();
              }}
              onIncrease={() => {
                const idx = Math.min(CORNER_STEPS.length - 1, parseCornerIndex(getStyleProp(selected, 'border-radius')) + 1);
                setStyleProp(selected, 'border-radius', cornerIndexToCss(idx));
                update();
              }}
            />
            <Field label="Button size">
              <select
                className={inputClass}
                value={getButtonSize(getStyleProp(selected, 'padding'))}
                onChange={(e) => {
                  const map: Record<string, string> = {
                    sm: '8px 16px',
                    md: '12px 24px',
                    lg: '16px 32px',
                  };
                  setStyleProp(selected, 'padding', map[e.target.value] || map.md);
                  update();
                }}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
            <PositionControls selected={selected} update={update} />
          </>
        )}

        {kind === 'image' && (
          <>
            <button
              type="button"
              onClick={() => editor.runCommand('tc-image-replace')}
              className="w-full py-2.5 text-sm font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent text-fg transition-colors"
            >
              Change photo
            </button>
            <button
              type="button"
              onClick={() => {
                if (editor) {
                  const parent = selected.parent() || editor.getWrapper();
                  if (parent) {
                    editor.runCommand('tc-add-hotspot', { target: parent });
                  }
                }
              }}
              className="w-full mt-2 py-2.5 text-sm font-semibold rounded-lg border border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
            >
              <span>+</span> Add Hotspot
            </button>
            <Field label="Description for accessibility">
              <input
                className={inputClass}
                placeholder="Describe this image (optional)"
                value={selected.getAttributes()?.alt || ''}
                onChange={(e) => {
                  selected.addAttributes({ alt: e.target.value });
                  update();
                }}
              />
            </Field>
            <Field label="Photo size">
              <select
                className={inputClass}
                value={
                  getStyleProp(selected, 'width') === '50%' ? 'half'
                  : getStyleProp(selected, 'width') === '320px' ? 'small'
                  : 'full'
                }
                onChange={(e) => {
                  const map: Record<string, { width: string; height: string }> = {
                    full: { width: '100%', height: 'auto' },
                    half: { width: '50%', height: 'auto' },
                    small: { width: '320px', height: 'auto' },
                  };
                  const next = map[e.target.value] || map.full;
                  setStyleProp(selected, 'width', next.width);
                  setStyleProp(selected, 'height', next.height);
                  update();
                }}
              >
                <option value="full">Full width</option>
                <option value="half">Half width</option>
                <option value="small">Small</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <Field label="Width">
                <input
                  className={inputClass}
                  placeholder="e.g. 100px or 50%"
                  value={getStyleProp(selected, 'width') || ''}
                  onChange={(e) => {
                    setStyleProp(selected, 'width', e.target.value);
                    update();
                  }}
                />
              </Field>
              <Field label="Height">
                <input
                  className={inputClass}
                  placeholder="e.g. auto"
                  value={getStyleProp(selected, 'height') || ''}
                  onChange={(e) => {
                    setStyleProp(selected, 'height', e.target.value);
                    update();
                  }}
                />
              </Field>
            </div>
            <PositionControls selected={selected} update={update} />
          </>
        )}

        {kind === 'hotspot' && (
          <>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                Image Hotspot
              </p>
              <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                This is an invisible button. It will show a purple dashed border here in the editor, but will be completely invisible and transparent in the preview and live site.
              </p>
            </div>
            
            <Field label="When clicked, go to">
              <select
                className={inputClass}
                value={(() => {
                  const href = selected.getAttributes()?.href || '';
                  if (href.startsWith('#')) return 'anchor';
                  if (href.startsWith('http://') || href.startsWith('https://')) return 'external';
                  return 'page';
                })()}
                onChange={(e) => {
                  if (e.target.value === 'anchor') {
                    const anchors = listSectionAnchorsOnPage(editor, selected);
                    selected.addAttributes({ href: anchors.length > 0 ? `#${anchors[0]}` : '#' });
                  } else if (e.target.value === 'page') {
                    selected.addAttributes({ href: 'otp' });
                  } else {
                    selected.addAttributes({ href: 'https://' });
                  }
                  update();
                }}
              >
                <option value="anchor">Another part of this page (Scroll)</option>
                <option value="page">Another page in this campaign</option>
                <option value="external">Another website (URL)</option>
              </select>
            </Field>

            {(() => {
              const href = selected.getAttributes()?.href || '';
              const type = href.startsWith('#') ? 'anchor' : (href.startsWith('http://') || href.startsWith('https://')) ? 'external' : 'page';

              if (type === 'anchor') {
                return (
                  <Field label="Scroll to section">
                    <select
                      className={inputClass}
                      value={href.replace(/^#/, '')}
                      onChange={(e) => {
                        selected.addAttributes({ href: `#${e.target.value}` });
                        update();
                      }}
                    >
                      <option value="">Select a section...</option>
                      {(() => {
                        const sections: { id: string; label: string }[] = [];
                        const wrapper = editor.getWrapper();
                        if (wrapper) {
                          const walk = (cmp: any) => {
                            const tag = (cmp.get('tagName') || '').toLowerCase();
                            const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article']);
                            const isSection = SECTION_TAGS.has(tag) || cmp.getAttributes()?.['data-tc-type'] === 'section';
                            if (isSection && tag !== 'header' && tag !== 'footer') {
                              const id = cmp.getAttributes()?.id || cmp.getId();
                              const label = cmp.get('sectionLabel') || id || 'Untitled Section';
                              sections.push({ id, label });
                            }
                            cmp.components().forEach(walk);
                          };
                          walk(wrapper);
                        }
                        const seen = new Set();
                        const uniqueSections = sections.filter((s) => {
                          if (seen.has(s.id)) return false;
                          seen.add(s.id);
                          return true;
                        });
                        return uniqueSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.label} (#{sec.id})
                          </option>
                        ));
                      })()}
                    </select>
                  </Field>
                );
              }

              if (type === 'page') {
                return (
                  <Field label="Page name">
                    <input
                      className={inputClass}
                      placeholder="e.g. otp, confirm"
                      value={href}
                      list="campaign-pages-list"
                      onChange={(e) => {
                        selected.addAttributes({ href: e.target.value });
                        update();
                      }}
                    />
                    <datalist id="campaign-pages-list">
                      <option value="HOME">HOME</option>
                      <option value="OTP">OTP</option>
                      <option value="CONFIRM">CONFIRM</option>
                      <option value="THANKYOU">THANKYOU</option>
                      <option value="ERROR">ERROR</option>
                      {editor && editor.Pages.getAll().map((p: any) => {
                        const pid = String(p.getId());
                        const pname = String(p.get('name') || pid);
                        if (['HOME', 'OTP', 'CONFIRM', 'THANKYOU', 'ERROR'].includes(pid.toUpperCase())) return null;
                        return <option key={pid} value={pid}>{pname}</option>;
                      })}
                    </datalist>
                  </Field>
                );
              }

              return (
                <Field label="Website address (URL)">
                  <input
                    className={inputClass}
                    placeholder="e.g. https://google.com"
                    value={href}
                    onChange={(e) => {
                      selected.addAttributes({ href: e.target.value });
                      update();
                    }}
                  />
                </Field>
              );
            })()}
            
            <Field label="Open in">
              <select
                className={inputClass}
                value={selected.getAttributes()?.target || '_self'}
                onChange={(e) => {
                  selected.addAttributes({ target: e.target.value });
                  update();
                }}
              >
                <option value="_self">Same Window (Default)</option>
                <option value="_blank">New Window</option>
              </select>
            </Field>

            <Field label="Hotspot Name / Label">
              <input
                className={inputClass}
                placeholder="e.g. Subscribe Button Hotspot"
                value={selected.getAttributes()?.title || ''}
                onChange={(e) => {
                  selected.addAttributes({ title: e.target.value });
                  update();
                }}
              />
              <p className="text-[10px] text-fg-muted mt-1">Useful to identify this hotspot in the Layers panel</p>
            </Field>

            {/* Position and size controls for hotspot */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-fg">Hotspot Position & Size</h3>
                <button
                  title="Make this hotspot cover the entire image — clicking anywhere on the image will trigger the link"
                  onClick={() => {
                    selected.addStyle({
                      width: '100%',
                      height: '100%',
                      top: '0px',
                      left: '0px',
                      right: '0px',
                      bottom: '0px',
                    });
                    update();
                  }}
                  style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⛶ Cover Full Image
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-medium text-fg-muted uppercase">Width</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={getStyleProp(selected, 'width') || '100px'}
                    onChange={(e) => {
                      setStyleProp(selected, 'width', e.target.value);
                      update();
                    }}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-medium text-fg-muted uppercase">Height</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={getStyleProp(selected, 'height') || '100px'}
                    onChange={(e) => {
                      setStyleProp(selected, 'height', e.target.value);
                      update();
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-medium text-fg-muted uppercase">Left Position</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={getStyleProp(selected, 'left') || '0px'}
                    onChange={(e) => {
                      setStyleProp(selected, 'left', e.target.value);
                      update();
                    }}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-medium text-fg-muted uppercase">Top Position</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={getStyleProp(selected, 'top') || '0px'}
                    onChange={(e) => {
                      setStyleProp(selected, 'top', e.target.value);
                      update();
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-fg-muted mt-2">
                Tip: Click <strong>⛶ Cover Full Image</strong> to make the entire image clickable. Or drag and resize the hotspot using the blue handles.
              </p>
            </div>
          </>
        )}

        {(kind === 'section' || kind === 'generic') && (
          <>
            <Field label="Section label (for builder dropdown)">
              <input
                className={inputClass}
                placeholder="e.g. Hero Section"
                value={selected.get('sectionLabel') || ''}
                onChange={(e) => {
                  selected.set('sectionLabel', e.target.value);
                  update();
                }}
              />
            </Field>
            <Field label="Section anchor (for nav links)">
              <input
                className={inputClass}
                placeholder="contact"
                value={getSectionAnchorId(selected)}
                onChange={(e) => {
                  if (!editor) return;
                  const result = setSectionAnchorId(editor, selected, e.target.value);
                  setAnchorError(result.ok ? null : result.error ?? null);
                  if (result.ok) update();
                }}
              />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {ANCHOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (!editor) return;
                      const result = setSectionAnchorId(editor, selected, preset);
                      setAnchorError(result.ok ? null : result.error ?? null);
                      if (result.ok) update();
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

            {/* ✅ Background Overlay Opacity - only show if background-image is set */}
            {getStyleProp(selected, 'background-image') && (
              <Field label="Overlay Opacity">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={parseFloat(getStyleProp(selected, '--overlay-opacity') || '0.45')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      // Update the overlay div inside this section
                      const overlayDivs = selected.components().filter((c: Component) => 
                        c.get('tagName') === 'div' && 
                        c.getAttributes?.()?.['data-overlay'] === 'true'
                      );
                      if (overlayDivs.length > 0) {
                        overlayDivs[0].setStyle({ opacity: String(val) });
                      }
                      setStyleProp(selected, '--overlay-opacity', String(val));
                      update();
                    }}
                    className="flex-1 accent-accent h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono text-fg-muted min-w-[40px] text-center">
                    {Math.round(parseFloat(getStyleProp(selected, '--overlay-opacity') || '0.45') * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-fg-subtle mt-1">Adjust overlay darkness for better text readability</p>
              </Field>
            )}

            <BackgroundImageField selected={selected} editor={editor} update={update} />

            <AddHotspotButton selected={selected} editor={editor} />

            <Field label="Text Color">
              <div className="flex gap-2">
                <input
                  type="color"
                  className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
                  value={toHex(getStyleProp(selected, 'color') || '#000000')}
                  onChange={(e) => {
                    setStyleProp(selected, 'color', e.target.value);
                    update();
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStyleProp(selected, 'color', '');
                    update();
                  }}
                  className="px-3 h-9 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent hover:text-accent transition-colors"
                  title="Reset to default"
                >
                  Clear
                </button>
              </div>
            </Field>

            <Field label="Background Color">
              <div className="flex gap-2">
                <input
                  type="color"
                  className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
                  value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#ffffff')}
                  onChange={(e) => {
                    setStyleProp(selected, 'background-color', e.target.value);
                    update();
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStyleProp(selected, 'background-color', 'transparent');
                    update();
                  }}
                  className="px-3 h-9 text-xs font-medium rounded-lg border border-border bg-bg-subtle hover:border-accent hover:text-accent transition-colors"
                  title="Make transparent"
                >
                  Clear
                </button>
              </div>
            </Field>
            <PositionControls selected={selected} update={update} />
            <Field label="Layout">
              <select
                className={inputClass}
                value={getStyleProp(selected, 'display') || 'block'}
                onChange={(e) => {
                  setStyleProp(selected, 'display', e.target.value);
                  update();
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
                      setStyleProp(selected, 'flex-direction', e.target.value);
                      update();
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
                      setStyleProp(selected, 'gap', e.target.value);
                      update();
                    }}
                  />
                </Field>
                <Field label="Align items">
                  <select
                    className={inputClass}
                    value={getStyleProp(selected, 'align-items') || 'stretch'}
                    onChange={(e) => {
                      setStyleProp(selected, 'align-items', e.target.value);
                      update();
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
                      setStyleProp(selected, 'justify-content', e.target.value);
                      update();
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
            Advanced styling options
          </label>
          <p className="text-[11px] text-fg-subtle mt-1.5 leading-relaxed">
            Extra controls for spacing, layout, and fine-tuning. Most users can skip this.
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
            <ComponentCodeEditor selected={selected} editor={editor} update={update} />
          </div>
        )}
      </div>
    </aside>
  );
}

function toHex(color: string): string {
  if (color.startsWith('#')) return color.length === 7 ? color : '#000000';
  return '#334155';
}

// ✅ Re-render when selection changes via context
export function PropertyPanelConnected() {
  return <PropertyPanel />;
}

// ✅ Default export for compatibility
export default PropertyPanel;