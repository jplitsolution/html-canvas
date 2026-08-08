import { useEffect, useRef } from 'react'

/**
 * Boot / HE overlays. Detecting & Redirecting copy stays in the browser console —
 * the screen stays blank so tracker → wap domain → exit feels quieter for end users.
 */
function SubscriptionOverlays({
  transitioning,
  error,
  pageData,
  hideHomeForHe,
  showBootSpinner,
  showFatalError,
  notAvailable,
  heExitPending,
  heFunnelSuppressed,
  phoneResolving,
}) {
  const lastStatusRef = useRef('')

  useEffect(() => {
    if (!showBootSpinner) {
      lastStatusRef.current = ''
      return
    }
    const status =
      heExitPending || heFunnelSuppressed
        ? 'Redirecting…'
        : phoneResolving
          ? 'Detecting mobile number…'
          : 'Loading…'
    if (status === lastStatusRef.current) return
    lastStatusRef.current = status
    console.log(`[subscription] ${status}`)
  }, [
    showBootSpinner,
    heExitPending,
    heFunnelSuppressed,
    phoneResolving,
  ])

  return (
    <>
      {transitioning && <div className="flow-runtime-progress" aria-hidden="true" />}
      {error && pageData && !hideHomeForHe && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-amber-100 text-amber-900 text-sm text-center py-2.5 px-4 animate-fade-in border-b border-amber-200">
          {error}
        </div>
      )}
      {showBootSpinner && (
        <div
          className="absolute inset-0 z-30 bg-[#f8fafc]"
          aria-busy="true"
          aria-label="Loading"
        />
      )}
      {showFatalError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-50">
          <div className="text-center max-w-md bg-white border border-slate-200 rounded-2xl px-8 py-10 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              {notAvailable ? '🚫' : '⚠️'}
            </div>
            <h1 className="text-lg font-semibold text-slate-900 mb-2">
              {notAvailable ? 'Not available' : 'Unable to load'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {notAvailable
                ? 'This offer is currently not available. Please try again later or contact your provider.'
                : error}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default SubscriptionOverlays
