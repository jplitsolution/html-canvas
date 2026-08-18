import { memo, useEffect, useState } from 'react'
import Button from '../ui/Button'
import useStore from '../../store/useStore'

/**
 * Campaign redirect / postback settings that belong with Flow Builder
 * (CG redirect, success portal URL, CPA callback timing).
 */
function FlowCampaignSettings({ campaignId }) {
  const campaign = useStore((s) => s.campaign)
  const updateCampaign = useStore((s) => s.updateCampaign)

  const [cgUrlDraft, setCgUrlDraft] = useState('')
  const [savingCg, setSavingCg] = useState(false)
  const [successUrlDraft, setSuccessUrlDraft] = useState('')
  const [successModeDraft, setSuccessModeDraft] = useState('thankyou')
  const [savingSuccessUrl, setSavingSuccessUrl] = useState(false)
  const [postbackAtDraft, setPostbackAtDraft] = useState('confirm')
  const [savingPostbackAt, setSavingPostbackAt] = useState(false)
  const [funnelLayoutDraft, setFunnelLayoutDraft] = useState('classic')
  const [savingFunnelLayout, setSavingFunnelLayout] = useState(false)

  useEffect(() => {
    if (!campaign || String(campaign.id) !== String(campaignId)) return
    setCgUrlDraft(campaign.cgRedirectUrl || '')
    setSuccessUrlDraft(campaign.successRedirectUrl || '')
    setSuccessModeDraft(
      campaign.successRedirectMode === 'immediate' ? 'immediate' : 'thankyou',
    )
    const v = campaign.postbackRegisterAt
    setPostbackAtDraft(v === 'otp' || v === 'both' ? v : 'confirm')
    setFunnelLayoutDraft(
      campaign.funnelLayout === 'packs_on_home' ? 'packs_on_home' : 'classic',
    )
  }, [
    campaignId,
    campaign?.id,
    campaign?.cgRedirectUrl,
    campaign?.successRedirectUrl,
    campaign?.successRedirectMode,
    campaign?.postbackRegisterAt,
    campaign?.funnelLayout,
  ])

  if (!campaign || String(campaign.id) !== String(campaignId)) return null

  const savedPostback =
    campaign.postbackRegisterAt === 'otp' || campaign.postbackRegisterAt === 'both'
      ? campaign.postbackRegisterAt
      : 'confirm'

  const packsAdvancedOn =
    postbackAtDraft === 'both' || postbackAtDraft === 'otp'
  const savedPacksAdvancedOn =
    savedPostback === 'both' || savedPostback === 'otp'

  const handleSaveFunnelLayout = async () => {
    setSavingFunnelLayout(true)
    try {
      const layout =
        funnelLayoutDraft === 'packs_on_home' ? 'packs_on_home' : 'classic'
      await updateCampaign(campaign.id, { funnelLayout: layout })
      useStore.getState().addToast('Landing layout saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingFunnelLayout(false)
    }
  }

  const handleSaveCgUrl = async () => {
    setSavingCg(true)
    try {
      await updateCampaign(campaign.id, {
        cgRedirectUrl: cgUrlDraft.trim() || null,
      })
      useStore.getState().addToast('CG redirect URL saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingCg(false)
    }
  }

  const handleSaveSuccessUrl = async () => {
    setSavingSuccessUrl(true)
    try {
      await updateCampaign(campaign.id, {
        successRedirectUrl: successUrlDraft.trim() || null,
        successRedirectMode: successModeDraft === 'immediate' ? 'immediate' : 'thankyou',
      })
      useStore.getState().addToast('Success redirect saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingSuccessUrl(false)
    }
  }

  const handleSavePostbackAt = async () => {
    setSavingPostbackAt(true)
    try {
      const mode =
        postbackAtDraft === 'otp' || postbackAtDraft === 'both'
          ? postbackAtDraft
          : 'confirm'
      await updateCampaign(campaign.id, { postbackRegisterAt: mode })
      useStore.getState().addToast('Callback timing saved', 'success')
    } catch {
      // toast in slice
    } finally {
      setSavingPostbackAt(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">Landing layout</h3>
          <p className="text-xs text-fg-muted mt-1">
            Identity checks run before Home. Home itself stays a free canvas — pack
            buttons are optional on any page.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFunnelLayoutDraft('classic')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                funnelLayoutDraft === 'classic'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">Classic</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                Home CTA then OTP / Confirm as today.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setFunnelLayoutDraft('packs_on_home')}
              className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                funnelLayoutDraft === 'packs_on_home'
                  ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                  : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
              }`}
            >
              <p className="text-sm font-semibold text-fg">Checks before Home</p>
              <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                HE-only miss → Error + fail URL. OTP-only → OTP then checks. HE+OTP →
                HE hit then checks, miss then OTP. After OTP → Home.
              </p>
            </button>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={
                savingFunnelLayout ||
                funnelLayoutDraft ===
                  (campaign.funnelLayout === 'packs_on_home'
                    ? 'packs_on_home'
                    : 'classic')
              }
              onClick={handleSaveFunnelLayout}
            >
              {savingFunnelLayout ? 'Saving...' : 'Save landing layout'}
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">CG / home redirect URL</h3>
          <p className="text-xs text-fg-muted mt-1">
            With flow mode <strong>None</strong> and this URL set, users are redirected here on
            landing. HE/OTP is not required. Also used as the HOME fallback when API HE cannot
            resolve MSISDN and no <code>failRedirectUrl</code> is set. Optional placeholders like{' '}
            <code className="font-mono">{'{{msisdn}}'}</code> /{' '}
            <code className="font-mono">{'{click_id}'}</code> are filled when present.
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
            value={cgUrlDraft}
            onChange={(e) => setCgUrlDraft(e.target.value)}
            placeholder="https://dsdp-cg.example/path"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingCg}
            onClick={handleSaveCgUrl}
          >
            {savingCg ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">Success / content URL</h3>
          <p className="text-xs text-fg-muted mt-1">
            Portal / content URL after a successful subscribe (or already subscribed). Leave empty
            to stay on thank-you.{' '}
            <code className="font-mono">{'{{msisdn}}'}</code>,{' '}
            <code className="font-mono">{'{{click_id}}'}</code> /{' '}
            <code className="font-mono">{'{rcid}'}</code> supported like CG redirect.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-bg-elevated text-fg font-mono"
              value={successUrlDraft}
              onChange={(e) => setSuccessUrlDraft(e.target.value)}
              placeholder="https://content.example/portal?msisdn={{msisdn}}"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={savingSuccessUrl}
              onClick={handleSaveSuccessUrl}
            >
              {savingSuccessUrl ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <div>
            <p className="text-xs font-medium text-fg mb-2">After success</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSuccessModeDraft('thankyou')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  successModeDraft === 'thankyou'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Show thank-you</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Show thank-you ~2s, then redirect to the portal URL.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSuccessModeDraft('immediate')}
                className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                  successModeDraft === 'immediate'
                    ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                    : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                }`}
              >
                <p className="text-sm font-semibold text-fg">Redirect immediately</p>
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  Skip thank-you paint — go straight to the portal URL.
                </p>
              </button>
            </div>
            <p className="text-[11px] text-fg-subtle mt-2">
              Click Save above to persist the URL and this mode together.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-fg">Vendor CPA callback</h3>
          <p className="text-xs text-fg-muted mt-1">
            Pending is queued here. Fire happens later when the operator hits{' '}
            <code className="font-mono">/api/flow/callback</code>.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {funnelLayoutDraft === 'packs_on_home' ? (
            <>
              <p className="text-sm text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">On pack / subscribe click.</span>{' '}
                Daily, weekly, or monthly CTAs (any page) queue a pending row. HE-detect
                does not. Uncheck &quot;Queue vendor postback&quot; on a button to skip it.
                Same MSISDN upserts one row.
              </p>
              <details className="rounded-lg border border-border bg-bg-elevated px-3.5 py-3">
                <summary className="text-sm font-medium text-fg cursor-pointer select-none">
                  Advanced
                </summary>
                <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={
                      postbackAtDraft === 'both' || postbackAtDraft === 'otp'
                    }
                    onChange={(e) =>
                      setPostbackAtDraft(e.target.checked ? 'both' : 'confirm')
                    }
                  />
                  <span>
                    <span className="text-sm font-semibold text-fg">
                      Also queue on OTP verify
                    </span>
                    <span className="block text-[11px] text-fg-muted mt-0.5 leading-snug">
                      Legacy pin-to-bill. Pending is created before the user picks a pack.
                      Pack clicks still upsert the same MSISDN row.
                    </span>
                  </span>
                </label>
                <div className="flex justify-end mt-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={
                      savingPostbackAt || packsAdvancedOn === savedPacksAdvancedOn
                    }
                    onClick={handleSavePostbackAt}
                  >
                    {savingPostbackAt ? 'Saving...' : 'Save callback timing'}
                  </Button>
                </div>
              </details>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPostbackAtDraft('confirm')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    postbackAtDraft === 'confirm'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">On Confirm</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Classic — queue when user clicks Confirm / subscribe.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPostbackAtDraft('otp')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    postbackAtDraft === 'otp'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">On OTP verify</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    Pin = subscribe / Skip HOME — queue right after OTP continue.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPostbackAtDraft('both')}
                  className={`text-left rounded-lg border px-3.5 py-3 transition-colors ${
                    postbackAtDraft === 'both'
                      ? 'border-accent bg-accent-muted/40 ring-1 ring-accent/30'
                      : 'border-border bg-bg-elevated hover:border-fg-subtle/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">Both</p>
                  <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                    OTP continue and Confirm click (upsert same MSISDN row).
                  </p>
                </button>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={savingPostbackAt || postbackAtDraft === savedPostback}
                  onClick={handleSavePostbackAt}
                >
                  {savingPostbackAt ? 'Saving...' : 'Save callback timing'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(FlowCampaignSettings)
