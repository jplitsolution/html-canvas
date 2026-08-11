import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, Pencil } from 'lucide-react';
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
import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../services/api/campaigns';
import { campaignEditPath } from '../../utils/routes';
import { PriorityChainTrigger } from './PriorityChainModal';
import { MIN_BTN_WIDTH } from '../utils/textSizeAlign';

const PROPS_COLLAPSED_KEY = 'tc-editor-props-collapsed';
const PROPS_WIDTH_KEY = 'tc-editor-props-width';
const PROPS_WIDTH_DEFAULT = 288;
const PROPS_WIDTH_MIN = 240;
const PROPS_WIDTH_MAX = 560;
const PROPS_WIDTH_ADVANCED_MIN = 360;

function clampPropsWidth(w) {
  return Math.min(PROPS_WIDTH_MAX, Math.max(PROPS_WIDTH_MIN, Math.round(w)));
}

function usePropsCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(PROPS_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PROPS_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggleCollapsed };
}

function usePropsWidth(advancedMode) {
  const [width, setWidth] = useState(() => {
    try {
      const raw = parseInt(localStorage.getItem(PROPS_WIDTH_KEY) || '', 10);
      if (Number.isFinite(raw)) return clampPropsWidth(raw);
    } catch {
      /* ignore */
    }
    return PROPS_WIDTH_DEFAULT;
  });

  const effectiveWidth =
    advancedMode && width < PROPS_WIDTH_ADVANCED_MIN
      ? PROPS_WIDTH_ADVANCED_MIN
      : width;

  const startResize = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = effectiveWidth;

    const onMove = (ev) => {
      // Dragging the left edge: mouse left → wider panel
      const next = clampPropsWidth(startW + (startX - ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      document.body.classList.remove('tc-is-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setWidth((w) => {
        try {
          localStorage.setItem(PROPS_WIDTH_KEY, String(w));
        } catch {
          /* ignore */
        }
        return w;
      });
    };

    document.body.classList.add('tc-is-dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [effectiveWidth]);

  return { width: effectiveWidth, startResize };
}

function formatHtml(html) {
  if (!html?.trim()) return ''
  return html
    .replace(/></g, '>\n<')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function ComponentCodeEditor({ selected, editor, update }) {
  const [code, setCode] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useLayoutEffect(() => {
    const el = selected.getEl();
    if (el) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(formatHtml(el.outerHTML));
    } else {
      setCode(formatHtml(selected.toHTML()));
    }
    setIsDirty(false);
  }, [selected, editor, update]);

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

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function extractUrlFromBgImage(bgImage) {
  if (!bgImage || typeof bgImage !== 'string' || bgImage === 'none') return ''
  const match = bgImage.match(/url\(["']?(.+?)["']?\)/)
  return match ? match[1] : ''
}

function BackgroundImageField({
  selected,
  editor,
  update,
}) {
  const currentBgImage = getStyleProp(selected, 'background-image') || ''
  const currentUrl = extractUrlFromBgImage(currentBgImage)
  const hasImage = Boolean(currentBgImage && typeof currentBgImage === 'string' && currentBgImage !== 'none')

  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')

  const applyUrl = useCallback((url) => {
    if (!url.trim()) return
    const trimmed = url.trim()
    const existingStyle = selected.getStyle() || {}
    selected.setStyle({
      ...existingStyle,
      'background-image': `url('${trimmed}')`,
      'background-size': existingStyle['background-size'] || 'cover',
      'background-position': existingStyle['background-position'] || 'center',
      'background-repeat': existingStyle['background-repeat'] || 'no-repeat',
      'position': existingStyle.position || 'relative',
      'overflow': 'visible',
    })
    setShowUrlInput(false)
    setUrlValue('')
    update()
  }, [selected, update])

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-fg-muted">Background Image</span>

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

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (!editor) return
            editor.runCommand('open-assets', { target: selected })

            setTimeout(() => {
              const modalEl = document.querySelector('.gjs-mdl-content')
              if (!modalEl) return

              const old = modalEl._tcBgClickHandler
              if (old) modalEl.removeEventListener('click', old, true)

              const handler = (e) => {
                const target = e.target
                const isConfirmBtn =
                  target.closest('[data-key="add"]') ||
                  target.closest('.gjs-am-add-asset') ||
                  (target.tagName === 'BUTTON' &&
                    (target.textContent?.trim().toLowerCase() === 'select' ||
                      target.textContent?.trim().toLowerCase() === 'add'))

                if (!isConfirmBtn) return

                const highlighted = modalEl.querySelector(
                  '.gjs-am-asset.gjs-two-color, .gjs-am-asset--selected, .gjs-am-asset:focus-within'
                )

                const img = highlighted?.querySelector('img')
                const bgStyle = highlighted?.style?.backgroundImage || ''
                const srcMatch = bgStyle.match(/url\(["']?(.+?)["']?\)/)
                const rawUrl = img?.getAttribute('src') || (srcMatch ? srcMatch[1] : '') ||
                  editor._tc_highlighted_asset_url || ''
                const url = rawUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/g, '')

                if (!url) return

                const bgTarget = editor._tc_asset_target
                if (!bgTarget) return

                e.preventDefault()
                e.stopPropagation()

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

                editor._tc_asset_target = null
                editor.Modal.close()
                update()
              }

              modalEl._tcBgClickHandler = handler
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

function AddHotspotButton({ selected, editor }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!editor || !selected) return
        editor.runCommand('tc-add-hotspot', { target: selected })
      }}
      className="w-full py-2.5 text-sm font-semibold rounded-lg border border-indigo-200 bg-indigo-50/20 text-indigo-700 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2"
    >
      <span>+</span> Add Clickable Area
    </button>
  )
}

const inputClass =
  'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200';

/** Fonts loaded in canvas (Google) + common system faces. */
const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Outfit, sans-serif', label: 'Outfit' },
  { value: '"Plus Jakarta Sans", sans-serif', label: 'Plus Jakarta Sans' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", Times, serif', label: 'Times' },
  { value: 'system-ui, sans-serif', label: 'System' },
];

const TEXT_SIZE_LABELS = ['Small', 'Normal', 'Medium', 'Large', 'XL', '2XL', '3XL', '4XL', 'Huge'];

function fontFamilyKey(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
}

function matchFontOptionValue(cssValue) {
  const key = fontFamilyKey(cssValue);
  if (!key) return '';
  const found = FONT_OPTIONS.find((o) => fontFamilyKey(o.value) === key);
  return found ? found.value : '';
}

function FontFamilyField({ selected, update }) {
  const current = getStyleProp(selected, 'font-family') || '';
  const matched = matchFontOptionValue(current);
  const selectValue = matched || (current ? '__custom__' : '');

  return (
    <Field label="Font">
      <select
        className={inputClass}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (!v || v === '__custom__') return;
          setStyleProp(selected, 'font-family', v);
          update();
        }}
      >
        <option value="">Default</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
        {current && !matched && (
          <option value="__custom__">{current.replace(/['"]/g, '').split(',')[0].trim()}</option>
        )}
      </select>
    </Field>
  );
}

function TextSizeField({ selected, update }) {
  const idx = parseTextSizeIndex(getStyleProp(selected, 'font-size'));
  return (
    <StepArrows
      label="Text size"
      valueLabel={TEXT_SIZE_LABELS[idx] || 'Normal'}
      decreaseTitle="Smaller text"
      increaseTitle="Larger text"
      onDecrease={() => {
        const next = Math.max(0, idx - 1);
        setStyleProp(selected, 'font-size', textSizeIndexToCss(next));
        update();
      }}
      onIncrease={() => {
        const next = Math.min(TEXT_SIZE_STEPS.length - 1, idx + 1);
        setStyleProp(selected, 'font-size', textSizeIndexToCss(next));
        update();
      }}
    />
  );
}

function FontWeightField({ selected, update }) {
  return (
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
  );
}

function TextColorField({ selected, update, label = 'Text color', fallback = '#334155' }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          className="flex-1 h-9 rounded-lg border border-border cursor-pointer"
          value={toHex(getStyleProp(selected, 'color') || fallback)}
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
  );
}

function TextAlignField({ selected, update }) {
  return (
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
  );
}

/** Everyday typography — always visible in the simple panel (not only Advanced CSS). */
function TypographyControls({
  selected,
  update,
  showSize = true,
  showWeight = true,
  showColor = true,
  showAlign = false,
  colorFallback = '#334155',
}) {
  return (
    <>
      <FontFamilyField selected={selected} update={update} />
      {showSize && <TextSizeField selected={selected} update={update} />}
      {showWeight && <FontWeightField selected={selected} update={update} />}
      {showColor && (
        <TextColorField selected={selected} update={update} fallback={colorFallback} />
      )}
      {showAlign && <TextAlignField selected={selected} update={update} />}
    </>
  );
}

/** All funnel page types — every campaign can edit HOME … ERROR. */
function getCampaignPageOptions() {
  return PAGE_TYPES.map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
}

function CampaignPageSelect({
  href,
  onChange,
  label = 'Page name',
  editHref,
}) {
  const options = getCampaignPageOptions()
  const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
  const value = matched?.id || options[0]?.id || 'OTP'

  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((page) => (
            <option key={page.id} value={page.id}>
              {page.label}
            </option>
          ))}
        </select>
      </Field>
      {editHref && (
        <a
          href={editHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          <Pencil className="w-3 h-3" />
          Edit {PAGE_TYPE_LABELS[value] || value} page
        </a>
      )}
    </div>
  )
}

/** True for OTP/Confirm/pack system controls — action dropdown must stay locked. */
function isLockedSystemAction(attrs = {}) {
  const action = attrs['data-action']
  if (action === 'CONFIRM') return true
  if (attrs['data-otp-action'] || attrs['data-otp-field'] || attrs['data-otp-slot']) return true
  if (attrs['data-pack'] || attrs['data-flow-pack-picker'] !== undefined) return true
  return false
}

function getClickActionType(attrs = {}) {
  if (attrs['data-action'] === 'CHAIN' || attrs['data-actions']) return 'chain'
  const href = attrs.href || ''
  // Prefer real navigation targets over a leftover SUBSCRIBE (save heal used to re-add it)
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return 'external'
  }
  if (href.startsWith('#') && href !== '#') return 'anchor'
  if (attrs['data-action'] === 'SUBSCRIBE') return 'flow'
  if (href.startsWith('#')) return 'anchor'
  return 'page'
}

function SectionAnchorSelect({
  editor,
  value,
  onChange,
}) {
  return (
    <Field label="Scroll to section">
      <select
        className={inputClass}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a section...</option>
        {(() => {
          const sections = []
          const wrapper = editor.getWrapper()
          if (wrapper) {
            const walk = (cmp) => {
              const tag = (cmp.get('tagName') || '').toLowerCase()
              const SECTION_TAGS = new Set([
                'section',
                'header',
                'footer',
                'nav',
                'main',
                'article',
              ])
              const isSection =
                SECTION_TAGS.has(tag) ||
                cmp.getAttributes()?.['data-tc-type'] === 'section'
              if (isSection && tag !== 'header' && tag !== 'footer') {
                const id = cmp.getAttributes()?.id || cmp.getId()
                const label = cmp.get('sectionLabel') || id || 'Untitled Section'
                sections.push({ id, label })
              }
              cmp.components().forEach(walk)
            }
            walk(wrapper)
          }
          const seen = new Set()
          return sections
            .filter((s) => {
              if (seen.has(s.id)) return false
              seen.add(s.id)
              return true
            })
            .map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} (#{sec.id})
              </option>
            ))
        })()}
      </select>
    </Field>
  )
}

/** Shared “When clicked” config for buttons and hotspots (5 options, including Priority). */
function ClickActionEditor({
  selected,
  editor,
  update,
}) {
  const [chainOpenSignal, setChainOpenSignal] = useState(0)
  const { campaignId, countryCode, operatorCode, funnelPageType } = useEditor()
  const attrs = selected.getAttributes() || {}
  const href = attrs.href || ''
  const type = getClickActionType(attrs)

  const pageEditHref = (() => {
    if (type !== 'page' || !campaignId) return null
    const options = getCampaignPageOptions()
    const matched = options.find((o) => o.id.toLowerCase() === (href || '').toLowerCase())
    const pageId = matched?.id || options[0]?.id || 'OTP'
    // Don't offer edit for the page currently open in the canvas
    if (String(pageId).toUpperCase() === String(funnelPageType || '').toUpperCase()) {
      return null
    }
    return campaignEditPath(countryCode, operatorCode, campaignId, pageId)
  })()

  const setClickType = (next) => {
    if (next === 'chain') {
      selected.addAttributes({
        'data-action': 'CHAIN',
        'data-actions': JSON.stringify([
          {
            type: 'api',
            url: '',
            rules: [
              { key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' },
              { key: 'currentStatus', value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
              { key: 'currentStatus', value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
            ],
            missAction: 'page',
            missPage: 'CONFIRM',
            missUrl: '',
            failAction: 'page',
            failPage: 'ERROR',
            failUrl: '',
          },
        ]),
        href: '#',
      })
      setChainOpenSignal((n) => n + 1)
    } else if (next === 'flow') {
      selected.removeAttributes('data-actions')
      selected.addAttributes({ 'data-action': 'SUBSCRIBE', href: '#' })
      selected.removeAttributes('target')
    } else if (next === 'anchor') {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      const anchors = listSectionAnchorsOnPage(editor, selected)
      selected.addAttributes({ href: anchors.length > 0 ? `#${anchors[0]}` : '#' })
    } else if (next === 'page') {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.addAttributes({ href: 'OTP' })
    } else {
      selected.removeAttributes('data-action')
      selected.removeAttributes('data-actions')
      selected.addAttributes({ href: 'https://' })
    }
    update()
  }

  return (
    <>
      <Field label="When clicked">
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setClickType(e.target.value)}
        >
          <option value="flow">Hit Subscribe API (signup flow)</option>
          <option value="anchor">Scroll to a section</option>
          <option value="page">Go to another page</option>
          <option value="external">Open a website</option>
          <option value="chain">Try checks in order</option>
        </select>
      </Field>

      {type === 'chain' && (
        <PriorityChainTrigger
          selected={selected}
          editor={editor}
          update={update}
          openSignal={chainOpenSignal}
        />
      )}

      {type === 'flow' && (
        <p className="text-[11px] text-fg-muted leading-relaxed -mt-1">
          Hits this campaign&apos;s Subscribe / signup APIs on the server, then opens the next
          page from verification mode (HE → Confirm, or OTP path). Prefer this on HE HOME instead
          of a custom URL. For a fixed jump, use &quot;Go to another page&quot; or
          &quot;Open a website&quot; instead.
        </p>
      )}

      {type === 'anchor' && (
        <SectionAnchorSelect
          editor={editor}
          value={href.replace(/^#/, '')}
          onChange={(id) => {
            selected.addAttributes({ href: `#${id}` })
            update()
          }}
        />
      )}

      {type === 'page' && (
        <CampaignPageSelect
          href={href}
          editor={editor}
          editHref={pageEditHref}
          onChange={(pageId) => {
            selected.addAttributes({ href: pageId })
            update()
          }}
        />
      )}

      {type === 'external' && (
        <Field label="Website address (URL)">
          <input
            className={inputClass}
            placeholder="e.g. https://google.com"
            value={href}
            onChange={(e) => {
              selected.addAttributes({ href: e.target.value })
              update()
            }}
          />
        </Field>
      )}
    </>
  )
}


const KIND_LABELS = {
  text: 'Text',
  button: 'Button',
  image: 'Photo',
  section: 'Section',
  generic: 'Block',
  link: 'Link',
  hotspot: 'Clickable Area',
  none: 'Element',
};

function getButtonSize(padding) {
  if (padding === '8px 16px') return 'sm';
  if (padding === '16px 32px') return 'lg';
  return 'md';
}

function PositionControls({
  selected,
  update,
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
  const styleHostRef = useRef(null);
  const traitHostRef = useRef(null);
  const [anchorError, setAnchorError] = useState(null);
  const { collapsed, toggleCollapsed } = usePropsCollapsed();
  const { width: propsWidth, startResize } = usePropsWidth(advancedMode);

  const selected = editor?.getSelected();
  const kind = editor && selected ? getComponentKind(selected) : 'none';
  const flowInfo = selected ? getFlowElementInfo((selected.getAttributes?.() || {})) : null;

  const panelStyle = { width: propsWidth };

  const resizeHandle = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize properties panel"
      title="Drag to resize"
      onMouseDown={startResize}
      className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-ew-resize z-20 group hover:bg-accent/30 active:bg-accent/50"
    >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-accent opacity-70" />
    </div>
  );

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchorError(null);
  }, [selectionVersion]);

  useLayoutEffect(() => {
    if (!editor || !advancedMode || collapsed) return;
    const cmp = editor.getSelected();
    if (!cmp || getComponentKind(cmp) === 'none') return;

    ensureComponentStylable(cmp);

    if (styleHostRef.current) styleHostRef.current.id = 'tc-advanced-styles';
    if (traitHostRef.current) traitHostRef.current.id = 'tc-advanced-traits';

    mountAdvancedPanels(editor, cmp);
  }, [editor, advancedMode, selectionVersion, collapsed]);

  if (collapsed) {
    const label = !editor
      ? 'Properties'
      : selected && kind !== 'none'
      ? KIND_LABELS[kind] || 'Element'
      : 'Properties';
    return (
      <aside className="tc-properties w-10 shrink-0 border-l border-border bg-bg-elevated flex flex-col items-center py-3 gap-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="flex-1 w-full flex items-start justify-center pt-2"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {label}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Show properties"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  if (!editor) {
    return (
      <aside
        className="tc-properties shrink-0 border-l border-border bg-bg-elevated p-4 relative"
        style={panelStyle}
      >
        {resizeHandle}
        <p className="text-sm text-fg-muted">Loading...</p>
      </aside>
    );
  }

  const update = () => {
    refreshSelection();
  };

  if (!selected || kind === 'none') {
    return (
      <aside
        className="tc-properties shrink-0 border-l border-border bg-bg-elevated flex flex-col relative"
        style={panelStyle}
      >
        {resizeHandle}
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Edit selection</h2>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Hide properties"
            className="p-1.5 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
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
    <aside
      className="tc-properties shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden relative"
      style={panelStyle}
    >
      {resizeHandle}
      <div className="p-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg truncate">{KIND_LABELS[kind] || 'Element'}</h2>
          <p className="text-xs text-fg-muted mt-0.5 leading-snug">Change how this looks</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            title="Duplicate"
            onClick={() => editor.runCommand('tc-duplicate')}
            className="px-2 py-1 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg text-[11px] font-medium"
          >
            Duplicate
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => editor.runCommand('tc-delete')}
            className="px-2 py-1 rounded-md text-danger hover:bg-danger-muted text-[11px] font-medium"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Hide properties"
            className="p-1.5 rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
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
            <TypographyControls selected={selected} update={update} showAlign />
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
                  try {
                    editor?.Canvas?.refresh?.();
                  } catch (_) {
                    /* noop */
                  }
                }}
              />
            </Field>
            {!isLockedSystemAction(selected.getAttributes() || {}) && (
              <ClickActionEditor selected={selected} editor={editor} update={update} />
            )}
            <TypographyControls
              selected={selected}
              update={update}
              showAlign
              colorFallback="#ffffff"
            />
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
                  const map = {
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
            <div className="flex gap-2">
              <Field label="Width">
                <input
                  className={inputClass}
                  placeholder="e.g. 100% or 220px"
                  value={getStyleProp(selected, 'width') || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const next = { ...selected.getStyle() };
                    const full = !val || val === '100%' || val === 'auto';
                    if (full) {
                      next.width = '100%';
                      next['min-width'] = '0';
                      next['max-width'] = '100%';
                      next.display = 'inline-flex';
                      next['align-self'] = 'stretch';
                    } else {
                      next.width = val;
                      next['max-width'] = '100%';
                      // Floor only — matching width would block further canvas shrink.
                      next['min-width'] = `${MIN_BTN_WIDTH}px`;
                      next.display = 'inline-flex';
                      next['align-self'] = 'center';
                      next['flex-shrink'] = '0';
                    }
                    selected.setStyle(next);
                    update();
                    try {
                      editor?.Canvas?.refresh?.();
                    } catch (_) {
                      /* noop */
                    }
                  }}
                />
              </Field>
              <Field label="Min height">
                <input
                  className={inputClass}
                  placeholder="e.g. 44px"
                  value={getStyleProp(selected, 'min-height') || getStyleProp(selected, 'height') || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const next = { ...selected.getStyle() };
                    if (val) {
                      next['min-height'] = val;
                      delete next.height;
                    } else {
                      delete next['min-height'];
                    }
                    selected.setStyle(next);
                    update();
                    try {
                      editor?.Canvas?.refresh?.();
                    } catch (_) {
                      /* noop */
                    }
                  }}
                />
              </Field>
            </div>
            <p className="text-[11px] text-fg-subtle -mt-2 leading-relaxed">
              Drag corner or left/right handles on the canvas to resize width and height.
            </p>
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
              <span>+</span> Add Clickable Area
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
                  const map = {
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
                Clickable Area
              </p>
              <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                Draw a box on the image that people can tap or click. In the editor you will see a purple dashed border — on the live page it stays invisible.
              </p>
            </div>
            
            <ClickActionEditor selected={selected} editor={editor} update={update} />
            
            {(selected.getAttributes()?.['data-action'] !== 'SUBSCRIBE') && (
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
            )}

            <Field label="Name (optional)">
              <input
                className={inputClass}
                placeholder="e.g. Subscribe button"
                value={selected.getAttributes()?.title || ''}
                onChange={(e) => {
                  selected.addAttributes({ title: e.target.value });
                  update();
                }}
              />
              <p className="text-[10px] text-fg-muted mt-1">Helps you recognise this area later in the layers list</p>
            </Field>

            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-fg">Size & Position</h3>
                <button
                  title="Make the whole image clickable"
                  onClick={() => {
                    selected.addAttributes({ 'data-tc-cover-full': '1' });
                    selected.addStyle({
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      top: '0%',
                      left: '0%',
                      right: '0%',
                      bottom: '0%',
                      'z-index': '50',
                      'pointer-events': 'auto',
                      cursor: 'pointer',
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
                Tip: Click <strong>⛶ Cover Full Image</strong> to make the whole image clickable. Or drag the blue handles to move and resize this area.
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
                      const overlayDivs = selected.components().filter((c) => 
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

            <FontFamilyField selected={selected} update={update} />
            <TextColorField selected={selected} update={update} fallback="#000000" />
            <TextAlignField selected={selected} update={update} />

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
            <div className="flex gap-2">
              <Field label="Width">
                <input
                  className={inputClass}
                  placeholder="e.g. 100% or 400px"
                  value={getStyleProp(selected, 'width') || ''}
                  onChange={(e) => {
                    setStyleProp(selected, 'width', e.target.value);
                    update();
                  }}
                />
              </Field>
              <Field label="Min height">
                <input
                  className={inputClass}
                  placeholder="e.g. 400px"
                  value={getStyleProp(selected, 'min-height') || getStyleProp(selected, 'height') || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const next = { ...selected.getStyle() };
                    if (val) {
                      next['min-height'] = val;
                      delete next.height;
                    } else {
                      delete next['min-height'];
                    }
                    selected.setStyle(next);
                    update();
                  }}
                />
              </Field>
            </div>
            <p className="text-[11px] text-fg-subtle -mt-2 leading-relaxed">
              Drag the blue corner/edge handles on the canvas, or type a min height here to make the block taller.
            </p>
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
            Font, size, color, and spacing are above. Use Advanced for layout, borders, and fine-tuning.
          </p>
        </div>

        {advancedMode && (
          <div className="space-y-4 pt-2">
            <p className="text-[11px] text-fg-muted leading-snug">
              Drag the left edge of this panel wider if CSS controls feel cramped.
            </p>
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

function toHex(color) {
  if (!color || typeof color !== 'string') return '#334155';
  if (color.startsWith('#')) {
    if (color.length === 7) return color;
    if (color.length === 4) {
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return '#334155';
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const hex = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return '#334155';
}

export function PropertyPanelConnected() {
  return <PropertyPanel />;
}

export default PropertyPanel;
