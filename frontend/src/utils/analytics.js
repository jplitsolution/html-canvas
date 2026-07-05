import useStore from '../store/useStore'

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

let sessionStart = Date.now()

export function loadMetrics() {
  try {
    const data = localStorage.getItem(METRICS_KEY)
    return data ? { ...defaultMetrics, ...JSON.parse(data) } : { ...defaultMetrics }
  } catch {
    return { ...defaultMetrics }
  }
}

function saveMetrics(metrics) {
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
}

export function trackEvent(event, value = 1) {
  const metrics = loadMetrics()
  if (event in metrics) {
    metrics[event] = (metrics[event] || 0) + value
  }
  saveMetrics(metrics)

  // Sync to Zustand store if defined
  if (event === 'saveCount') {
    useStore.setState({ saveCount: metrics.saveCount || 0 })
  } else if (event === 'exports') {
    useStore.setState({ exports: metrics.exports || 0 })
  }
}

export function startSession() {
  sessionStart = Date.now()
  trackEvent('sessions')
}

export function getActiveSessionDuration() {
  return Math.round((Date.now() - sessionStart) / 1000)
}

export function endSession() {
  const duration = getActiveSessionDuration()
  const metrics = loadMetrics()
  metrics.sessionTime = (metrics.sessionTime || 0) + duration
  saveMetrics(metrics)

  useStore.setState({ sessionTime: metrics.sessionTime || 0 })
}

export function getUsageSummary() {
  return loadMetrics()
}
