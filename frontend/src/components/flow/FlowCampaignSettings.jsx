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

  useEffect(() => {
    if (!campaign || String(campaign.id) !== String(campaignId)) return
    setCgUrlDraft(campaign.cgRedirectUrl || '')
    setSuccessUrlDraft(campaign.successRedirectUrl || '')
    setSuccessModeDraft(
      campaign.successRedirectMode === 'immediate' ? 'immediate' : 'thankyou',
    )
    const v = campaign.postbackRegisterAt
    setPostbackAtDraft(v === 'otp' || v === 'both' ? v : 'confirm')
  }, [
    campaignId,
    campaign?.id,
    campaign?.cgRedirectUrl,
    campaign?.successRedirectUrl,
    campaign?.successRedirectMode,
    campaign?.postbackRegisterAt,
  ])

  if (!campaign || String(campaign.id) !== String(campaignId)) return null

  const savedPostback =
    campaign.postbackRegisterAt === 'otp' || campaign.postbackRegisterAt === 'both'
      ? campaign.postbackRegisterAt
      : 'confirm'

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
          <h3 className="text-sm font-semibold text-fg">CG / home redirect URL</h3>
          <p className="text-xs text-fg-muted mt-1">
            With flow mode <strong>None</strong> and this URL set, users are redirected here on
            landing. HE/OTP is not required. Also used as the HOME fallback when API HE cannot
            resolve MSISDN and no <code>failRedirectUrl</code> is set. Optional placeholders like{' '}
            <code className="font-mono">{'{{msisdn}}'}</code> are filled when present.
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
            When to queue a pending postback (fired later when the operator hits{' '}
            <code className="font-mono">/api/flow/callback</code>). HE success+new and null-flow CG
            still register on their own paths.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
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
                Pin = subscribe / Skip Confirm — queue right after OTP continue.
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
        </div>
      </div>
    </div>
  )
}

export default memo(FlowCampaignSettings)
