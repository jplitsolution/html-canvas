import { useState } from 'react'
import Modal from '../../components/common/Modal'
import { PAGE_TYPES, PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import useStore from '../../store/useStore'
import { normalizeApiRules } from '../../services/flow/priorityApiMatch'

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

function getCampaignPageOptions(campaign) {
  const fromCampaign = (campaign?.pages || [])
    .map((p) => String(p.pageType || '').toUpperCase())
    .filter((id) => PAGE_TYPES.includes(id))
  const ids = fromCampaign.length > 0 ? [...new Set(fromCampaign)] : [...PAGE_TYPES]
  return PAGE_TYPES.filter((id) => ids.includes(id)).map((id) => ({
    id,
    label: PAGE_TYPE_LABELS[id] || id,
  }))
}

function PageSelect({ value, onChange, label = 'Page' }) {
  const campaign = useStore((s) => s.campaign)
  const options = getCampaignPageOptions(campaign)
  const matched = options.find((o) => o.id.toLowerCase() === String(value || '').toLowerCase())
  const selected = matched?.id || options[0]?.id || 'OTP'

  return (
    <Field label={label}>
      <select className={inputClass} value={selected} onChange={(e) => onChange(e.target.value)}>
        {options.map((page) => (
          <option key={page.id} value={page.id}>
            {page.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Campaign page OR external website destination. */
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
          <option value="page">Campaign page</option>
          <option value="external">External website (URL)</option>
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
        <PageSelect label="Page" value={page || 'OTP'} onChange={onPageChange} />
      )}
    </div>
  )
}

function defaultApiStep() {
  return {
    type: 'api',
    url: '',
    rules: [
      { key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' },
      { key: 'currentStatus', value: 'parking', go: 'page', page: 'LOW_BALANCE', url: '' },
      { key: 'currentStatus', value: 'pending', go: 'page', page: 'INPROGRESS', url: '' },
      { key: 'currentStatus', value: 'new', go: 'page', page: 'CONFIRM', url: '' },
    ],
    missAction: 'page',
    missPage: 'ERROR',
    missUrl: '',
    failAction: 'page',
    failPage: 'ERROR',
    failUrl: '',
  }
}

function ensureApiRules(step) {
  const rules = normalizeApiRules(step)
  if (rules.length > 0) return { ...step, rules }
  return { ...step, rules: defaultApiStep().rules }
}

/**
 * Full-screen-ish modal to configure Priority Chain (multi if/else status → page).
 */
export function PriorityChainModal({
  isOpen,
  onClose,
  selected,
  editor,
  update,
}) {
  if (!selected) return null

  const attrs = selected.getAttributes() || {}
  let actions = []
  try {
    actions = JSON.parse(attrs['data-actions'] || '[]')
  } catch {
    actions = []
  }

  if (actions.length === 0) {
    actions = [defaultApiStep(), { type: 'page', page: 'OTP' }]
  }

  const saveActions = (newActions) => {
    selected.addAttributes({
      'data-action': 'CHAIN',
      'data-actions': JSON.stringify(newActions),
      href: '#',
    })
    update()
  }

  const updateStep = (index, field, value) => {
    const next = [...actions]
    let updated = { ...next[index], [field]: value }
    if (field === 'type' && value === 'api') {
      updated = ensureApiRules({
        ...updated,
        missAction: updated.missAction || 'page',
        missPage: updated.missPage || 'ERROR',
        failAction: updated.failAction || 'page',
        failPage: updated.failPage || 'ERROR',
      })
    }
    next[index] = updated
    saveActions(next)
  }

  const updateRule = (stepIndex, ruleIndex, field, value) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = [...(step.rules || [])]
    rules[ruleIndex] = { ...rules[ruleIndex], [field]: value }
    next[stepIndex] = { ...step, rules }
    saveActions(next)
  }

  const addRule = (stepIndex) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = [
      ...(step.rules || []),
      { key: 'currentStatus', value: '', go: 'page', page: 'OTP', url: '' },
    ]
    next[stepIndex] = { ...step, rules }
    saveActions(next)
  }

  const removeRule = (stepIndex, ruleIndex) => {
    const next = [...actions]
    const step = ensureApiRules(next[stepIndex])
    const rules = (step.rules || []).filter((_, i) => i !== ruleIndex)
    next[stepIndex] = {
      ...step,
      rules:
        rules.length > 0
          ? rules
          : [{ key: 'currentStatus', value: 'active', go: 'page', page: 'THANKYOU', url: '' }],
    }
    saveActions(next)
  }

  const addStep = () => saveActions([...actions, { type: 'page', page: 'OTP' }])

  const removeStep = (index) => {
    if (actions.length <= 1) return
    saveActions(actions.filter((_, i) => i !== index))
  }

  const moveStep = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= actions.length) return
    const next = [...actions]
    const temp = next[index]
    next[index] = next[targetIndex]
    next[targetIndex] = temp
    saveActions(next)
  }

  const sectionOptions = (() => {
    const sections = []
    const wrapper = editor?.getWrapper?.()
    if (!wrapper) return sections
    const walk = (cmp) => {
      const tag = (cmp.get('tagName') || '').toLowerCase()
      const SECTION_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article'])
      const isSection =
        SECTION_TAGS.has(tag) || cmp.getAttributes()?.['data-tc-type'] === 'section'
      if (isSection && tag !== 'header' && tag !== 'footer') {
        const id = cmp.getAttributes()?.id || cmp.getId()
        const label = cmp.get('sectionLabel') || id || 'Untitled Section'
        sections.push({ id, label })
      }
      cmp.components().forEach(walk)
    }
    walk(wrapper)
    return sections
  })()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Priority Flow — button click rules"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted leading-relaxed">
          Steps run in order for this button only. For an API check, add multiple if/else rows:
          if response field equals a value → go to a campaign page <strong>or</strong> an external
          website URL. First matching row wins.
        </p>

        <div className="space-y-3">
          {actions.map((step, idx) => {
            const apiStep = step.type === 'api' ? ensureApiRules(step) : step
            const rules = apiStep.type === 'api' ? apiStep.rules || [] : []

            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-indigo-600">Priority {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 'up')}
                        className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-bg"
                      >
                        ↑
                      </button>
                    )}
                    {idx < actions.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 'down')}
                        className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-bg"
                      >
                        ↓
                      </button>
                    )}
                    {actions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <Field label="Action Type">
                  <select
                    className={inputClass}
                    value={step.type}
                    onChange={(e) => updateStep(idx, 'type', e.target.value)}
                  >
                    <option value="api">Validate URL / Webhook (API Check)</option>
                    <option value="page">Another page in this campaign</option>
                    <option value="external">Another website (URL Redirect)</option>
                    <option value="anchor">Another part of this page (Scroll)</option>
                    <option value="flow">Continue verification flow (HE / OTP)</option>
                  </select>
                </Field>

                {step.type === 'api' && (
                  <>
                    <Field label="Webhook / API URL to check">
                      <input
                        className={inputClass}
                        placeholder="https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS"
                        value={step.url || ''}
                        onChange={(e) => updateStep(idx, 'url', e.target.value)}
                      />
                    </Field>

                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-fg">If / else response rules</p>
                          <p className="text-[11px] text-fg-muted mt-0.5">
                            First match wins. Example: currentStatus = parking → Low balance
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addRule(idx)}
                          className="shrink-0 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50"
                        >
                          + Add rule
                        </button>
                      </div>

                      <div className="space-y-2">
                        {rules.map((rule, rIdx) => (
                          <div
                            key={rIdx}
                            className="rounded-lg border border-border bg-bg p-2.5 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-indigo-600">
                                IF {rIdx + 1}
                              </span>
                              <button
                                type="button"
                                title="Remove rule"
                                disabled={rules.length <= 1}
                                onClick={() => removeRule(idx, rIdx)}
                                className="px-2 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Field label="If key">
                                <input
                                  className={inputClass}
                                  placeholder="currentStatus"
                                  value={rule.key || ''}
                                  onChange={(e) => updateRule(idx, rIdx, 'key', e.target.value)}
                                />
                              </Field>
                              <Field label="equals value">
                                <input
                                  className={inputClass}
                                  placeholder="parking"
                                  value={rule.value || ''}
                                  onChange={(e) => updateRule(idx, rIdx, 'value', e.target.value)}
                                />
                              </Field>
                            </div>
                            <DestinationFields
                              go={rule.go || 'page'}
                              page={rule.page || 'THANKYOU'}
                              url={rule.url || ''}
                              goLabel="Then go to"
                              onGoChange={(go) => updateRule(idx, rIdx, 'go', go)}
                              onPageChange={(pageId) => updateRule(idx, rIdx, 'page', pageId)}
                              onUrlChange={(u) => updateRule(idx, rIdx, 'url', u)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
                        <Field label="If no rule matches">
                          <select
                            className={inputClass}
                            value={
                              step.missAction === 'external'
                                ? 'external'
                                : step.missAction === 'page'
                                  ? 'page'
                                  : 'continue'
                            }
                            onChange={(e) => {
                              const next = [...actions]
                              const updated = { ...next[idx], missAction: e.target.value }
                              if (e.target.value === 'page' && !updated.missPage) {
                                updated.missPage = 'ERROR'
                              }
                              if (e.target.value === 'external' && !updated.missUrl) {
                                updated.missUrl = 'https://'
                              }
                              next[idx] = updated
                              saveActions(next)
                            }}
                          >
                            <option value="continue">Continue to next priority step</option>
                            <option value="page">Show a campaign page</option>
                            <option value="external">Redirect to external URL</option>
                          </select>
                        </Field>
                        {step.missAction === 'page' && (
                          <PageSelect
                            label="Else → page"
                            value={step.missPage || 'ERROR'}
                            onChange={(pageId) => updateStep(idx, 'missPage', pageId)}
                          />
                        )}
                        {step.missAction === 'external' && (
                          <Field label="Else → website URL">
                            <input
                              className={inputClass}
                              placeholder="https://example.com"
                              value={step.missUrl || ''}
                              onChange={(e) => updateStep(idx, 'missUrl', e.target.value)}
                            />
                          </Field>
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg border border-border bg-bg p-3">
                        <Field label="If API call fails (network / HTTP)">
                          <select
                            className={inputClass}
                            value={
                              step.failAction === 'external'
                                ? 'external'
                                : step.failAction === 'page'
                                  ? 'page'
                                  : 'continue'
                            }
                            onChange={(e) => {
                              const next = [...actions]
                              const updated = { ...next[idx], failAction: e.target.value }
                              if (e.target.value === 'page' && !updated.failPage) {
                                updated.failPage = 'ERROR'
                              }
                              if (e.target.value === 'external' && !updated.failUrl) {
                                updated.failUrl = 'https://'
                              }
                              next[idx] = updated
                              saveActions(next)
                            }}
                          >
                            <option value="continue">Continue to next priority step</option>
                            <option value="page">Show a campaign page</option>
                            <option value="external">Redirect to external URL</option>
                          </select>
                        </Field>
                        {step.failAction === 'page' && (
                          <PageSelect
                            label="On API fail → page"
                            value={step.failPage || 'ERROR'}
                            onChange={(pageId) => updateStep(idx, 'failPage', pageId)}
                          />
                        )}
                        {step.failAction === 'external' && (
                          <Field label="On API fail → website URL">
                            <input
                              className={inputClass}
                              placeholder="https://example.com"
                              value={step.failUrl || ''}
                              onChange={(e) => updateStep(idx, 'failUrl', e.target.value)}
                            />
                          </Field>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {step.type === 'page' && (
                  <PageSelect
                    label="Page name"
                    value={step.page || 'OTP'}
                    onChange={(pageId) => updateStep(idx, 'page', pageId)}
                  />
                )}

                {step.type === 'external' && (
                  <Field label="Website address (URL)">
                    <input
                      className={inputClass}
                      placeholder="https://example.com"
                      value={step.url || ''}
                      onChange={(e) => updateStep(idx, 'url', e.target.value)}
                    />
                  </Field>
                )}

                {step.type === 'anchor' && (
                  <Field label="Scroll to section">
                    <select
                      className={inputClass}
                      value={step.section || ''}
                      onChange={(e) => updateStep(idx, 'section', e.target.value)}
                    >
                      <option value="">Select a section...</option>
                      {sectionOptions.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.label} (#{sec.id})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {step.type === 'flow' && (
                  <p className="text-[11px] text-fg-muted">
                    Hands control back to Flow Builder (HE / OTP verification).
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="w-full py-2.5 px-3 border border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl text-sm text-indigo-600 font-semibold hover:bg-indigo-50/50 transition-colors"
        >
          + Add Priority Step
        </button>

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

/** Compact trigger shown in the property panel. */
export function PriorityChainTrigger({
  selected,
  editor,
  update,
}) {
  const [open, setOpen] = useState(false)
  const attrs = selected?.getAttributes?.() || {}
  let count = 0
  let ruleCount = 0
  try {
    const actions = JSON.parse(attrs['data-actions'] || '[]')
    count = actions.length
    for (const step of actions) {
      if (step.type === 'api') {
        ruleCount += normalizeApiRules(step).length || 1
      }
    }
  } catch {
    count = 0
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2.5 px-3 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors text-left"
      >
        <span className="block">Configure Priority Flow…</span>
        <span className="block text-[10px] font-medium text-indigo-600/80 mt-0.5">
          {count} step{count === 1 ? '' : 's'}
          {ruleCount > 0 ? ` · ${ruleCount} if/else rule${ruleCount === 1 ? '' : 's'}` : ''}
          {' — opens popup'}
        </span>
      </button>
      <PriorityChainModal
        isOpen={open}
        onClose={() => setOpen(false)}
        selected={selected}
        editor={editor}
        update={update}
      />
    </>
  )
}
