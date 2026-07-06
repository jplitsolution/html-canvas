import { useLayoutEffect, useRef, useState } from 'react';
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-subtle text-fg focus:outline-none focus:ring-2 focus:ring-accent/30';

const KIND_LABELS: Record<string, string> = {
  text: 'Text',
  button: 'Button',
  image: 'Photo',
  section: 'Section',
  generic: 'Block',
  link: 'Link',
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
                    value={(selected.getAttributes()?.href || '').startsWith('#') ? 'anchor' : 'external'}
                    onChange={(e) => {
                      if (e.target.value === 'anchor') {
                        const anchors = listSectionAnchorsOnPage(editor, selected);
                        selected.addAttributes({ href: anchors.length > 0 ? `#${anchors[0]}` : '#' });
                      } else {
                        selected.addAttributes({ href: 'https://' });
                      }
                      update();
                    }}
                  >
                    <option value="anchor">Another part of this page</option>
                    <option value="external">Another website</option>
                  </select>
                </Field>

                {(selected.getAttributes()?.href || '').startsWith('#') ? (
                  <Field label="Scroll to section">
                    <select
                      className={inputClass}
                      value={(selected.getAttributes()?.href || '').replace(/^#/, '')}
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
                ) : (
                  <Field label="Website address">
                    <input
                      className={inputClass}
                      value={selected.getAttributes()?.href || ''}
                      onChange={(e) => {
                        selected.addAttributes({ href: e.target.value });
                        update();
                      }}
                    />
                  </Field>
                )}
              </>
            )}
            <Field label="Button color">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border"
                value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#2563eb')}
                onChange={(e) => {
                  setStyleProp(selected, 'background-color', e.target.value);
                  update();
                }}
              />
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
            <PositionControls selected={selected} update={update} />
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

            <Field label="Background">
              <input
                type="color"
                className="w-full h-9 rounded-lg border border-border"
                value={toHex(getStyleProp(selected, 'background-color') || getStyleProp(selected, 'background') || '#ffffff')}
                onChange={(e) => {
                  setStyleProp(selected, 'background-color', e.target.value);
                  update();
                }}
              />
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