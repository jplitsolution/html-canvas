import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import Modal from '../../components/common/Modal'
import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import { useEditor } from '../context/EditorContext'
import { campaignEditPath } from '../../utils/routes'
import {
  DEFAULT_SUBSCRIBE_ROUTES,
  DEFAULT_SUBSCRIBE_RULES,
  parseSubscribeRoutes,
} from '../utils/subscribeRoutes'

const inputClass =
  'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50/20 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-200'

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  )
}

function usePageEditHref(pageType) {
  const { campaignId, countryCode, operatorCode, funnelPageType } = useEditor()
  if (!campaignId || !pageType) return null
  if (String(pageType).toUpperCase() === String(funnelPageType || '').toUpperCase()) {
    return null
  }
  return campaignEditPath(countryCode, operatorCode, campaignId, pageType)
}

function PageSelect({ value, onChange, label = 'Page' }) {
  const options = PAGE_TYPES.map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
  const matched = options.find((o) => o.id.toLowerCase() === String(value || '').toLowerCase())
  const selected = matched?.id || options[0]?.id || 'OTP'
  const editHref = usePageEditHref(selected)

  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select className={inputClass} value={selected} onChange={(e) => onChange(e.target.value)}>
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
          Edit {PAGE_TYPE_LABELS[selected] || selected} page
        </a>
      )}
    </div>
  )
}

function DestinationFields({
  go = 'page',
  page = 'OTP',
  url = '',
  onGoChange,
  onPageChange,
  onUrlChange,
  goLabel = 'Then go to',
}) {
  return (
    <div className="space-y-2">
      <Field label={goLabel}>
        <select
          className={inputClass}
          value={go === 'external' ? 'external' : 'page'}
          onChange={(e) => onGoChange(e.target.value)}
        >
          <option value="page">A page in this campaign</option>
          <option value="external">A website</option>
        </select>
      </Field>
      {go === 'external' ? (
        <Field label="Website URL">
          <input
            className={inputClass}
            placeholder="https://example.com/offer"
            value={url || ''}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        </Field>
      ) : (
        <PageSelect label="Which page" value={page || 'OTP'} onChange={onPageChange} />
      )}
    </div>
  )
}

/**
 * Modal to configure Subscribe API + response rules (Priority-Chain style).
 */
export function SubscribeRouteModal({ isOpen, onClose, selected, update }) {
  if (!selected) return null

  const attrs = selected.getAttributes() || {}
  const routes = parseSubscribeRoutes(attrs)
  const rules =
    Array.isArray(routes.rules) && routes.rules.length > 0
      ? routes.rules
      : DEFAULT_SUBSCRIBE_RULES.map((r) => ({ ...r }))

  const saveRoutes = (next) => {
    selected.addAttributes({
      'data-action': 'SUBSCRIBE_ROUTE',
      'data-subscribe-routes': JSON.stringify(next),
      href: '#',
    })
    update()
  }

  const updateRule = (ruleIndex, field, value) => {
    const nextRules = [...rules]
    nextRules[ruleIndex] = { ...nextRules[ruleIndex], [field]: value }
    saveRoutes({ ...routes, rules: nextRules })
  }

  const addRule = () => {
    saveRoutes({
      ...routes,
      rules: [
        ...rules,
        { key: 'currentStatus', value: '', go: 'page', page: 'OTP', url: '' },
      ],
    })
  }

  const removeRule = (ruleIndex) => {
    const nextRules = rules.filter((_, i) => i !== ruleIndex)
    saveRoutes({
      ...routes,
      rules:
        nextRules.length > 0
          ? nextRules
          : [{ ...DEFAULT_SUBSCRIBE_RULES[0] }],
    })
  }

  const setFallback = (bucket, patch) => {
    saveRoutes({
      ...routes,
      rules,
      [bucket]: { ...(routes[bucket] || DEFAULT_SUBSCRIBE_ROUTES[bucket]), ...patch },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hit Subscribe API + choose pages" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-fg-muted leading-relaxed">
          Uses this campaign&apos;s checksub + Subscribe APIs (no URL to paste). Add rules like
          Try checks: if <code className="text-xs">currentStatus = blocked</code> → Blocked page.
          First match wins.
        </p>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-fg">Where to go for each response</p>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Response field + equals → page or website
              </p>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
            >
              + Add status
            </button>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {rules.map((rule, rIdx) => (
              <div
                key={rIdx}
                className="rounded-lg border border-border bg-bg p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-indigo-600">Rule {rIdx + 1}</span>
                  <button
                    type="button"
                    title="Remove this rule"
                    disabled={rules.length <= 1}
                    onClick={() => removeRule(rIdx)}
                    className="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Response field">
                    <input
                      className={inputClass}
                      placeholder="currentStatus"
                      value={rule.key || ''}
                      onChange={(e) => updateRule(rIdx, 'key', e.target.value)}
                    />
                  </Field>
                  <Field label="Equals">
                    <input
                      className={inputClass}
                      placeholder="blocked"
                      value={rule.value || ''}
                      onChange={(e) => updateRule(rIdx, 'value', e.target.value)}
                    />
                  </Field>
                </div>
                <DestinationFields
                  go={rule.go || 'page'}
                  page={rule.page || 'THANKYOU'}
                  url={rule.url || ''}
                  goLabel="Then go to"
                  onGoChange={(go) => updateRule(rIdx, 'go', go)}
                  onPageChange={(pageId) => updateRule(rIdx, 'page', pageId)}
                  onUrlChange={(u) => updateRule(rIdx, 'url', u)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              key: 'noPhone',
              title: 'No phone',
              hint: 'Usually → OTP',
              fallbackPage: 'OTP',
            },
            {
              key: 'miss',
              title: 'Nothing matches',
              hint: 'After subscribe OK',
              fallbackPage: 'THANKYOU',
            },
            {
              key: 'fail',
              title: 'API fails',
              hint: 'Network / partner error',
              fallbackPage: 'ERROR',
            },
          ].map((row) => {
            const dest = routes[row.key] || DEFAULT_SUBSCRIBE_ROUTES[row.key]
            return (
              <div
                key={row.key}
                className="space-y-2 rounded-lg border border-border bg-bg-muted/30 p-3"
              >
                <div>
                  <p className="text-xs font-semibold text-fg">{row.title}</p>
                  <p className="text-[10px] text-fg-muted">{row.hint}</p>
                </div>
                <DestinationFields
                  go={dest.go || 'page'}
                  page={dest.page || row.fallbackPage}
                  url={dest.url || ''}
                  goLabel="Then go to"
                  onGoChange={(go) => setFallback(row.key, { go })}
                  onPageChange={(pageId) => setFallback(row.key, { page: pageId, go: 'page' })}
                  onUrlChange={(u) => setFallback(row.key, { url: u })}
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-accent-fg hover:bg-accent-hover"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Compact trigger shown in the property panel (like Try checks). */
export function SubscribeRouteTrigger({ selected, update, openSignal = 0 }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (openSignal <= 0) return undefined
    const t = setTimeout(() => setOpen(true), 0)
    return () => clearTimeout(t)
  }, [openSignal])

  const attrs = selected?.getAttributes?.() || {}
  const routes = parseSubscribeRoutes(attrs)
  const ruleCount = (routes.rules || []).filter((r) => r.key && r.value !== '').length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl border border-indigo-400 bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors text-left shadow-sm"
      >
        <span className="block">Edit Subscribe destinations…</span>
        <span className="block text-[10px] font-medium text-indigo-100 mt-0.5">
          {ruleCount} status rule{ruleCount === 1 ? '' : 's'}
          {' · '}no phone / miss / fail fallbacks
        </span>
      </button>
      <SubscribeRouteModal
        isOpen={open}
        onClose={() => setOpen(false)}
        selected={selected}
        update={update}
      />
    </>
  )
}
