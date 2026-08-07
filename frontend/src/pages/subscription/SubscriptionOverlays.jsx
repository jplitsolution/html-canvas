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
  return (
    <>
      {transitioning && <div className="flow-runtime-progress" aria-hidden="true" />}
      {error && pageData && !hideHomeForHe && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-amber-100 text-amber-900 text-sm text-center py-2.5 px-4 animate-fade-in border-b border-amber-200">
          {error}
        </div>
      )}
      {showBootSpinner && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f8fafc]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#7C4DFF]/30 border-t-[#7C4DFF] animate-spin" />
            <p className="text-slate-500 text-sm">
              {heExitPending || heFunnelSuppressed
                ? 'Redirecting…'
                : phoneResolving
                  ? 'Detecting mobile number…'
                  : 'Loading...'}
            </p>
          </div>
        </div>
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
