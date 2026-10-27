import React from 'react'

export default function FailedBreakdownBadge({ count = 0, breakdown = {} }) {
  const num = Number(count) || 0
  if (num === 0) {
    return <span className="text-fg-muted font-mono text-xs">0</span>
  }

  const entries = Object.entries(breakdown || {}).filter(
    ([, c]) => Number(c) > 0,
  )
  const breakdownTooltip =
    entries.length > 0
      ? `${num} Failed: ` +
        entries.map(([reason, c]) => `${c} ${reason}`).join(', ')
      : `${num} Failed`

  return (
    <div
      className="inline-flex flex-col items-end gap-1"
      title={breakdownTooltip}
    >
      <div className="flex items-center gap-1">
        <span className="font-semibold text-danger font-mono text-xs">
          {num}
        </span>
        <span className="text-[10px] text-danger/80 uppercase font-medium tracking-wider">
          Failed
        </span>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1 max-w-[220px]">
          {entries.map(([reason, c]) => {
            const isWrongPin = reason === 'Wrong PIN'
            const isTimeout =
              reason.includes('Expired') || reason.includes('Timeout')
            const badgeClass = isWrongPin
              ? 'bg-danger-muted/30 text-danger border-danger/25'
              : isTimeout
              ? 'bg-warning-muted/40 text-warning-fg border-warning/30'
              : 'bg-bg-subtle text-fg-muted border-border'

            return (
              <span
                key={reason}
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border ${badgeClass}`}
                title={`${c} ${reason}`}
              >
                <span className="font-bold">{c}</span>
                <span className="truncate max-w-[85px]">{reason}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
