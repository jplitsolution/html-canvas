import { create } from 'zustand'
import { createCampaignSlice } from './slices/campaignSlice'
import { createPartnersSlice } from './slices/partnersSlice'
import { createUiSlice } from './slices/uiSlice'

const METRICS_KEY = 'templatecraft_metrics'
const defaultMetrics = {
  projectsCreated: 0,
  blocksAdded: 0,
  exports: 0,
  saveCount: 0,
  sessionTime: 0,
  sessions: 0,
  otp_sent: 0,
  otp_verified: 0,
  otp_failed: 0,
  confirm_loaded: 0,
  confirm_completed: 0,
  success_loaded: 0,
}

function getInitialMetrics() {
  try {
    const data = localStorage.getItem(METRICS_KEY)
    return data ? { ...defaultMetrics, ...JSON.parse(data) } : { ...defaultMetrics }
  } catch {
    return { ...defaultMetrics }
  }
}

const SETTINGS_KEY = 'templatecraft_settings'
function getInitialSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

const initialMetrics = getInitialMetrics()
const initialSettings = getInitialSettings()

const useStore = create((set, get) => ({
  ...createCampaignSlice(set, get),
  ...createPartnersSlice(set, get),
  ...createUiSlice(set, get),

  saveCount: initialMetrics.saveCount || 0,
  exports: initialMetrics.exports || 0,
  sessionTime: initialMetrics.sessionTime || 0,

  logError: (componentName, error) => {
    console.error(`[${componentName}] Error:`, error)
    const addToast = get().addToast
    if (typeof addToast === 'function') {
      addToast('An error occurred. Please try again.', 'error')
    }
  },
}))

useStore.subscribe((state, prevState) => {
  if (state.dateFormat !== prevState.dateFormat || state.timezone !== prevState.timezone) {
    const settings = getInitialSettings()
    settings.dateFormat = state.dateFormat
    settings.timezone = state.timezone
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }
})

export default useStore
