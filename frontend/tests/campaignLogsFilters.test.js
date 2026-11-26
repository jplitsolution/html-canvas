import { describe, expect, it } from 'vitest'
import {
  resolveCampaignProfile,
  getEventTypeOptions,
  getStatusesForEvent,
  getVendorOptionsForCampaign,
} from '../src/utils/campaignLogsFilters'

describe('campaignLogsFilters', () => {
  const allVendors = [
    { id: 24, name: 'Dheeru', code: 'dh' },
    { id: 15, name: 'Mplus', code: 'mp' },
    { id: 6, name: 'Track My Ads', code: 'ke' },
    { id: 11, name: 'Google', code: 'ga' },
    { id: 21, name: 'skyads', code: 'sa' },
  ]

  it('distinguishes OTP_ONLY API_EXPOSE from OTP_ONLY WAP', () => {
    const exposeCampaign = {
      id: '37',
      name: 'Wellness Orange API',
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
    }
    const wapCampaign = {
      id: '41',
      name: 'Wellness Moov Burkina Faso',
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'HOME' },
    }

    const exposeProfile = resolveCampaignProfile(exposeCampaign)
    expect(exposeProfile.specKey).toBe('OTP_ONLY_EXPOSE')
    expect(exposeProfile.isApiExpose).toBe(true)

    const exposeEvents = getEventTypeOptions({ profile: exposeProfile })
    expect(exposeEvents).toContain('API_OTP_EXPOSE_SEND_IN')
    expect(exposeEvents).toContain('OTP_VERIFY')
    expect(exposeEvents).not.toContain('HOME_VIEW')
    expect(exposeEvents).not.toContain('CONFIRM_VIEW')
    expect(exposeEvents).not.toContain('OTP_VIEW')
    expect(exposeEvents).not.toContain('CG_REDIRECT')

    const wapProfile = resolveCampaignProfile(wapCampaign)
    expect(wapProfile.specKey).toBe('OTP_ONLY')
    expect(wapProfile.isApiExpose).toBe(false)

    const wapEvents = getEventTypeOptions({ profile: wapProfile })
    expect(wapEvents).toContain('HOME_VIEW')
    expect(wapEvents).toContain('OTP_VIEW')
    expect(wapEvents).toContain('SUBSCRIBE_SUCCESS')
    expect(wapEvents).not.toContain('API_OTP_EXPOSE_SEND_IN')
  })

  it('distinguishes UNIVERSE_DCB API_EXPOSE from UNIVERSE_DCB WAP and omits PLAN_VIEW', () => {
    const dcbExpose = {
      id: '16',
      name: 'Wellness Ooredoo PS API',
      verificationMode: 'UNIVERSE_DCB',
      flowConfig: JSON.stringify({ entryPage: 'API_EXPOSE' }),
    }
    const dcbWap = {
      id: '24',
      name: 'Wellness Screen',
      verificationMode: 'UNIVERSE_DCB',
      flowConfig: { entryPage: 'OTP' },
    }

    const exposeProfile = resolveCampaignProfile(dcbExpose)
    expect(exposeProfile.specKey).toBe('UNIVERSE_DCB_EXPOSE')
    const exposeEvents = getEventTypeOptions({ profile: exposeProfile })
    expect(exposeEvents).toContain('API_DCB_EXPOSE_PINCODE_IN')
    expect(exposeEvents).toContain('API_DCB_EXPOSE_CONFIRM_IN')
    expect(exposeEvents).not.toContain('HOME_VIEW')
    expect(exposeEvents).not.toContain('PLAN_VIEW')

    const wapProfile = resolveCampaignProfile(dcbWap)
    expect(wapProfile.specKey).toBe('UNIVERSE_DCB')
    const wapEvents = getEventTypeOptions({ profile: wapProfile })
    expect(wapEvents).toContain('HOME_VIEW')
    expect(wapEvents).toContain('OTP_VIEW')
    expect(wapEvents).not.toContain('PLAN_VIEW')
    expect(wapEvents).not.toContain('API_DCB_EXPOSE_PINCODE_IN')
  })

  it('includes ORANGE_BF specific events and excludes DCB/CG/HE events', () => {
    const obfCampaign = {
      id: '17',
      name: 'HealthPortal_OBF',
      verificationMode: 'ORANGE_BF',
      flowConfig: { entryPage: 'HOME' },
    }
    const profile = resolveCampaignProfile(obfCampaign)
    const events = getEventTypeOptions({ profile })
    expect(events).toContain('CONFIRM_VIEW')
    expect(events).toContain('ORANGE_BF_SYNC')
    expect(events).toContain('API_ORANGE_BF_CHECKSUB')
    expect(events).toContain('CHECKSUB_30M')
    expect(events).not.toContain('API_DCB_PINCODE')
    expect(events).not.toContain('CG_REDIRECT')
    expect(events).not.toContain('API_HE_RESOLVE')
  })

  it('narrows verification statuses based on selected event and campaign profile', () => {
    const exposeProfile = resolveCampaignProfile({
      id: '37',
      verificationMode: 'OTP_ONLY',
      flowConfig: { entryPage: 'API_EXPOSE' },
    })

    expect(
      getStatusesForEvent({
        profile: exposeProfile,
        eventType: '',
        hasHoldStatusOptions: true,
      }),
    ).toEqual(['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED', 'BLOCKED'])

    expect(
      getStatusesForEvent({
        profile: exposeProfile,
        eventType: 'OTP_VERIFY',
        hasHoldStatusOptions: true,
      }),
    ).toEqual(['OTP_SHOWN', 'SUCCESS', 'SUCCESS_SENT', 'HELD', 'FAILED'])

    const obfProfile = resolveCampaignProfile({
      id: '17',
      verificationMode: 'ORANGE_BF',
      flowConfig: { entryPage: 'HOME' },
    })

    expect(
      getStatusesForEvent({
        profile: obfProfile,
        eventType: 'SUBSCRIBE_FAILED',
        hasHoldStatusOptions: true,
      }),
    ).toEqual(['FAILED'])

    expect(
      getStatusesForEvent({
        profile: obfProfile,
        eventType: 'SUBSCRIBE_SUCCESS',
        hasHoldStatusOptions: true,
      }),
    ).toEqual(['CONFIRM_SHOWN', 'OTP_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'SUCCESS_SENT', 'HELD'])

    const noneProfile = resolveCampaignProfile({
      id: '12',
      verificationMode: 'NONE',
      flowConfig: { entryPage: 'HOME' },
    })

    expect(
      getStatusesForEvent({
        profile: noneProfile,
        eventType: 'CG_REDIRECT',
        hasHoldStatusOptions: false,
      }),
    ).toEqual(['VISIT', 'HOME_SHOWN', 'SUBSCRIBED', 'SUCCESS', 'FAILED', 'BLOCKED'])
  })

  it('filters out non-session ES status labels from status dropdown', () => {
    const obfProfile = resolveCampaignProfile({
      id: '17',
      verificationMode: 'ORANGE_BF',
      flowConfig: { entryPage: 'HOME' },
    })
    const statuses = getStatusesForEvent({
      profile: obfProfile,
      eventType: '',
      hasHoldStatusOptions: true,
      aggsByStatus: [
        { key: 'INACTIVE', count: 500 },
        { key: 'ENGINE_NOT_FOUND', count: 1 },
        { key: 'SUBSCRIBED', count: 10 },
      ],
    })
    expect(statuses).not.toContain('INACTIVE')
    expect(statuses).not.toContain('ENGINE_NOT_FOUND')
    expect(statuses).toContain('SUBSCRIBED')
  })

  it('scopes vendor options to campaign trackings and traffic vendors', () => {
    const campaign = {
      id: '37',
      trackings: [{ vendorId: 24 }, { vendorId: 15 }],
    }
    const scoped = getVendorOptionsForCampaign({
      selectedCampaign: campaign,
      allVendors,
      knownVendorIds: ['24', '15', '18'],
      aggsByVendor: [{ key: '24', count: 100 }],
    })
    expect(scoped.map((v) => v.id)).toEqual([24, 15])

    const all = getVendorOptionsForCampaign({
      selectedCampaign: null,
      allVendors,
    })
    expect(all).toHaveLength(5)
  })
})
