import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Workflow, ArrowRight, GitBranch, Lock, Unlock } from 'lucide-react'
import Button from '../ui/Button'
import { PAGE_TYPE_LABELS } from '../../services/api/campaigns'
import {
  VERIFICATION_MODES,
  normalizeModeId,
  buildDefaultFlow,
  buildFlowPathSummary,
  resolveAfterIdentityTarget,
  isApiExposeEntry,
  isNullIdentityMode,
} from './verificationModes'
import { campaignFlowPath, resolveMarketCodes } from '../../utils/routes'

function resolveSavedEntry(flowConfig) {
  const entry = String(flowConfig?.entryPage || 'HOME').toUpperCase()
  if (entry === 'API_EXPOSE') return 'API_EXPOSE'
  if (entry === 'OTP') return 'OTP'
  return 'HOME'
}

/**
 * Mode picker + read-only signup path on Campaign Detail.
 * Advanced edge remaps live in Flow Builder (/flow).
 */
function CampaignFlowSummary({ campaign, onSaveMode }) {
  const currentMode = normalizeModeId(campaign?.verificationMode)
  const savedEntry = resolveSavedEntry(campaign?.flowConfig)
  const savedAfterIdentity = resolveAfterIdentityTarget(campaign?.flowConfig)
  const savedLocked = Boolean(campaign?.flowConfig?.isLocked ?? (currentMode === 'ORANGE_BF'))
  const [isLocked, setIsLocked] = useState(savedLocked)
  const [draftMode, setDraftMode] = useState(currentMode)
  const [draftEntry, setDraftEntry] = useState(savedEntry)
  const [draftAfterIdentity, setDraftAfterIdentity] = useState(savedAfterIdentity)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraftMode(currentMode)
    setDraftEntry(savedEntry)
    setDraftAfterIdentity(savedAfterIdentity)
    setIsLocked(Boolean(campaign?.flowConfig?.isLocked ?? (currentMode === 'ORANGE_BF')))
  }, [campaign?.id, currentMode, savedEntry, savedAfterIdentity, campaign?.flowConfig?.isLocked])

  const previewConfig = useMemo(() => {
    if (
      draftMode === currentMode &&
      draftEntry === savedEntry &&
      draftAfterIdentity === savedAfterIdentity
    ) {
      return campaign?.flowConfig || null
    }
    return buildDefaultFlow(draftMode, {
      entryPage:
        draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB' ? draftEntry : 'HOME',
      afterIdentity: isApiExposeEntry(draftEntry) ? 'HOME' : draftAfterIdentity,
    })
  }, [
    draftMode,
    currentMode,
    draftEntry,
    savedEntry,
    draftAfterIdentity,
    savedAfterIdentity,
    campaign?.flowConfig,
  ])

  const summary = useMemo(
    () =>
      buildFlowPathSummary(draftMode, previewConfig, {
        cgRedirectUrl: campaign?.cgRedirectUrl,
      }),
    [draftMode, previewConfig, campaign?.cgRedirectUrl],
  )

  const dirty =
    draftMode !== currentMode ||
    ((draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB') &&
      draftEntry !== savedEntry) ||
    (!isApiExposeEntry(draftEntry) &&
      draftMode !== 'NONE' &&
      draftMode !== 'CG_HOME' &&
      draftMode !== 'UNIVERSE_DCB' &&
      draftAfterIdentity !== savedAfterIdentity)

  const handleToggleLock = async () => {
    const nextLocked = !isLocked
    setIsLocked(nextLocked)
    if (onSaveMode) {
      setSaving(true)
      try {
        const currentConfig = campaign?.flowConfig || buildDefaultFlow(currentMode)
        await onSaveMode({
          verificationMode: currentMode,
          flowConfig: { ...currentConfig, isLocked: nextLocked },
        })
      } finally {
        setSaving(false)
      }
    }
  }

  const handleModeChange = (nextMode) => {
    if (isLocked) return
    setDraftMode(nextMode)
    setDraftEntry(
      nextMode === 'OTP_ONLY' || nextMode === 'UNIVERSE_DCB' ? 'OTP' : 'HOME',
    )
    setDraftAfterIdentity('HOME')
  }

  const handleSave = async () => {
    if (!dirty || !onSaveMode || isLocked) return
    setSaving(true)
    try {
      const flowConfig = {
        ...buildDefaultFlow(draftMode, {
          entryPage:
            draftMode === 'OTP_ONLY' || draftMode === 'UNIVERSE_DCB'
              ? draftEntry
              : 'HOME',
          afterIdentity: isApiExposeEntry(draftEntry) ? 'HOME' : draftAfterIdentity,
        }),
        isLocked,
      }
      await onSaveMode({ verificationMode: draftMode, flowConfig })
    } finally {
      setSaving(false)
    }
  }

  const labelFor = (pageType) => PAGE_TYPE_LABELS[pageType] || pageType
  const { countryCode, operatorCode } = resolveMarketCodes({}, campaign)
  const advancedPath = campaignFlowPath(countryCode, operatorCode, campaign?.id)
  const showOtpApiExposeDocs = draftMode === 'OTP_ONLY' && isApiExposeEntry(draftEntry)
  const showDcbApiExposeDocs =
    draftMode === 'UNIVERSE_DCB' && isApiExposeEntry(draftEntry)
  const showApiExposeDocs = showOtpApiExposeDocs || showDcbApiExposeDocs

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <Workflow className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-fg">Subscription flow</h2>
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Unlock className="w-3 h-3" /> Editable
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Pick how the Subscribe CTA moves between pages. Canvas button “When clicked”
                  (page / URL / Priority) can override this for individual buttons.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLock}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  {isLocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600" />
                      Unlock Flow
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Lock Flow
                    </>
                  )}
                </Button>
                {campaign?.id && !showApiExposeDocs && (
                  isLocked ? (
                    <span
                      title="Flow is locked. Unlock above to edit the path."
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted opacity-50 cursor-not-allowed pt-0.5"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Edit advanced path
                    </span>
                  ) : (
                    <Link
                      to={advancedPath}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline shrink-0 pt-0.5"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Edit advanced path
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This flow is <strong>locked</strong> against accidental changes. Click <strong>Unlock Flow</strong> above to modify.</span>
          </div>
        </div>
      )}

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
                  disabled={isLocked}
                  onClick={() => handleModeChange(m.id)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-80 ' : ''
                  }${
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
        </div>

        {draftMode === 'OTP_ONLY' && (
          <>
            <div>
              <p className="text-xs font-medium text-fg mb-2">Landing page</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDraftEntry('HOME')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    draftEntry === 'HOME'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">HOME first</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Show intro, then OTP, then HOME packs.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftEntry('OTP')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    draftEntry === 'OTP'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">OTP first</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Skip HOME on landing — PIN first, then HOME packs.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftEntry('API_EXPOSE')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    draftEntry === 'API_EXPOSE'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">API expose</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    No WAP pages — expose public OTP send/verify URLs.
                  </p>
                </button>
              </div>
            </div>

            {!isApiExposeEntry(draftEntry) && (
              <div>
                <p className="text-xs font-medium text-fg mb-2">After OTP verified</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftAfterIdentity('HOME')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      draftAfterIdentity === 'HOME' || draftAfterIdentity === 'CONFIRM'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">HOME page</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      Pack / subscribe CTAs on HOME after PIN.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftAfterIdentity('THANKYOU')}
                    className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                      draftAfterIdentity === 'THANKYOU'
                        ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                        : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-fg">Skip HOME</p>
                    <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                      PIN verify → Thank you / portal (no pack page).
                    </p>
                  </button>
                </div>
              </div>
            )}

            {showOtpApiExposeDocs && (
              <p className="text-[11px] text-fg-muted">
                Vendor send/verify APIs are in the Vendors tab.
              </p>
            )}
          </>
        )}

        {draftMode === 'UNIVERSE_DCB' && (
          <>
            <div>
              <p className="text-xs font-medium text-fg mb-2">Delivery</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraftEntry('OTP')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    !isApiExposeEntry(draftEntry)
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">WAP funnel</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Full pages: number → pack → PIN → activation poll.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftEntry('API_EXPOSE')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    isApiExposeEntry(draftEntry)
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">API expose</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    No pages — vendor billing PIN request / confirm / status APIs.
                  </p>
                </button>
              </div>
            </div>

            {showDcbApiExposeDocs && (
              <p className="text-[11px] text-fg-muted">
                Vendor billing PIN APIs are in the Vendors tab.
              </p>
            )}
          </>
        )}

        {(draftMode === 'HEADER_INJECTION' || draftMode === 'BOTH') && (
          <div>
            <p className="text-xs font-medium text-fg mb-2">
              {draftMode === 'BOTH'
                ? 'After number resolved (HE or OTP)'
                : 'After HE resolved'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraftAfterIdentity('HOME')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  draftAfterIdentity === 'HOME' || draftAfterIdentity === 'CONFIRM'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">HOME page</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Show HOME with pack / subscribe CTAs.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDraftAfterIdentity('THANKYOU')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  draftAfterIdentity === 'THANKYOU'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Skip HOME</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Number resolved → Thank you / portal (no pack page).
                </p>
              </button>
            </div>
            {draftMode === 'HEADER_INJECTION' && (
              <p className="text-[11px] text-fg-muted mt-2 leading-snug">
                If HE finds no number → Error page (and fail/CG URL if set). OTP is not used
                in this mode.
              </p>
            )}
          </div>
        )}

        {dirty && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-warning">
              Saving resets the signup path to the default for this mode
              {draftMode === 'OTP_ONLY'
                ? isApiExposeEntry(draftEntry)
                  ? ' (API expose — mediator only)'
                  : ` (${draftEntry} landing → ${draftAfterIdentity === 'THANKYOU' ? 'Thank you' : 'HOME'})`
                : draftMode === 'UNIVERSE_DCB'
                  ? isApiExposeEntry(draftEntry)
                    ? ' (DCB API expose — billing PIN APIs only)'
                    : ' (WAP funnel)'
                  : isNullIdentityMode(draftMode)
                    ? ''
                    : ` (${draftAfterIdentity === 'THANKYOU' ? 'skip HOME' : 'HOME packs'})`}
              .
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save flow'}
            </Button>
          </div>
        )}

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
                  <li
                    key={`${e.source}-${e.condition}-${e.target}`}
                    className="text-[11px] text-fg-muted"
                  >
                    <span className="font-mono text-fg">{labelFor(e.source)}</span>
                    <span className="mx-1.5 text-fg-subtle">—{e.conditionLabel}→</span>
                    <span className="font-mono text-fg">{labelFor(e.target)}</span>
                  </li>
                ))}
            </ul>
          )}

          <p className="text-[11px] text-fg-subtle mt-2.5">{summary.note}</p>
          {campaign?.funnelLayout === 'packs_on_home' && (
            <p className="text-[11px] text-fg-muted mt-1.5 leading-snug">
              Checks before Home: identity runs before the first content page. After OTP
              (when used) the next page is Home. Pack buttons subscribe from any page.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(CampaignFlowSummary)
