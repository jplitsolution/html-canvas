import { memo, useEffect, useMemo, useState } from 'react'
import { Workflow, ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import { PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import {
  VERIFICATION_MODES,
  DEFAULT_FLOWS,
  normalizeModeId,
  buildFlowPathSummary,
} from './verificationModes'

/**
 * Mode picker + read-only signup path on Campaign Detail.
 * Replaces the primary Flow Builder drag-drop UX (Option A cleanup).
 */
function CampaignFlowSummary({ campaign, onSaveMode }) {
  const currentMode = normalizeModeId(campaign?.verificationMode)
  const [draftMode, setDraftMode] = useState(currentMode)
  const [saving, setSaving] = useState(false)

  // Keep draft in sync when campaign reloads
  useEffect(() => {
    setDraftMode(currentMode)
  }, [campaign?.id, currentMode])

  const summary = useMemo(
    () =>
      buildFlowPathSummary(
        draftMode,
        draftMode === currentMode ? campaign?.flowConfig : null,
        { cgRedirectUrl: campaign?.cgRedirectUrl },
      ),
    [draftMode, currentMode, campaign?.flowConfig, campaign?.cgRedirectUrl],
  )

  const dirty = draftMode !== currentMode

  const handleSave = async () => {
    if (!dirty || !onSaveMode) return
    setSaving(true)
    try {
      const flowConfig = DEFAULT_FLOWS[draftMode] || DEFAULT_FLOWS.BOTH
      await onSaveMode({ verificationMode: draftMode, flowConfig })
    } finally {
      setSaving(false)
    }
  }

  const labelFor = (pageType) => PAGE_TYPE_LABELS[pageType] || pageType

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <Workflow className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-fg">Subscription flow</h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Pick how the Subscribe CTA moves between pages. Canvas button “When clicked”
              (page / URL / Priority) can override this for individual buttons.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-fg mb-2">Verification mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VERIFICATION_MODES.map((m) => {
              const selected = draftMode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDraftMode(m.id)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    selected
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">{m.label}</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">{m.hint}</p>
                </button>
              )
            })}
          </div>
          {dirty && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-warning">
                Saving resets the signup path to the default for this mode.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save mode'}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-muted/40 px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle font-medium mb-2">
            Path at a glance
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {summary.steps.map((step, idx) => (
              <span key={step.id} className="inline-flex items-center gap-1.5">
                {idx > 0 && <ArrowRight className="w-3 h-3 text-fg-subtle shrink-0" />}
                <span className="text-xs font-mono px-2 py-1 rounded-md bg-bg-elevated border border-border text-fg">
                  {labelFor(step.label) !== step.label ? labelFor(step.label) : step.label}
                </span>
              </span>
            ))}
          </div>

          {summary.edges.length > 0 && (
            <ul className="mt-3 space-y-1">
              {summary.edges
                .filter((e) => ['HOME', 'OTP'].includes(e.source))
                .map((e) => (
                  <li key={`${e.source}-${e.condition}-${e.target}`} className="text-[11px] text-fg-muted">
                    <span className="font-mono text-fg">{labelFor(e.source)}</span>
                    <span className="mx-1.5 text-fg-subtle">—{e.conditionLabel}→</span>
                    <span className="font-mono text-fg">{labelFor(e.target)}</span>
                  </li>
                ))}
            </ul>
          )}

          <p className="text-[11px] text-fg-subtle mt-2.5">{summary.note}</p>
        </div>
      </div>
    </div>
  )
}

export default memo(CampaignFlowSummary)
