import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import type { SpacingBox } from '../utils/spacingUtils'
import { NUDGE_STEP } from '../utils/spacingUtils'

interface MoveArrowsProps {
  label: string
  hint?: string
  value: SpacingBox
  onChange: (next: SpacingBox) => void
  step?: number
}

/** Move element on page by adjusting margin */
export function MoveArrows({ label, hint, value, onChange, step = NUDGE_STEP }: MoveArrowsProps) {
  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    const next = { ...value }
    if (dir === 'up') next.top = Math.max(0, next.top - step)
    if (dir === 'down') next.top = next.top + step
    if (dir === 'left') next.left = Math.max(0, next.left - step)
    if (dir === 'right') next.left = next.left + step
    onChange(next)
  }

  const btn =
    'p-2.5 rounded-lg border border-border bg-bg-subtle hover:bg-bg-muted hover:border-accent text-fg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium'

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {hint && <p className="text-[10px] text-fg-subtle leading-snug">{hint}</p>}
      <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
        <span />
        <button type="button" className={btn} onClick={() => move('up')} title="Move up">
          <ArrowUp className="w-4 h-4" />
        </button>
        <span />
        <button type="button" className={btn} onClick={() => move('left')} title="Move left">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-accent/30 bg-accent-muted/20 text-[9px] text-fg-muted px-1 text-center">
          Move
        </div>
        <button type="button" className={btn} onClick={() => move('right')} title="Move right">
          <ArrowRight className="w-4 h-4" />
        </button>
        <span />
        <button type="button" className={btn} onClick={() => move('down')} title="Move down">
          <ArrowDown className="w-4 h-4" />
        </button>
        <span />
      </div>
    </div>
  )
}

interface InnerSpaceArrowsProps {
  label: string
  value: SpacingBox
  onChange: (next: SpacingBox) => void
  step?: number
}

/** Add/remove inner padding on each side */
export function InnerSpaceArrows({ label, value, onChange, step = NUDGE_STEP }: InnerSpaceArrowsProps) {
  const adjust = (side: keyof SpacingBox, delta: number) => {
    onChange({ ...value, [side]: Math.max(0, value[side] + delta) })
  }

  const btn =
    'px-2 py-1.5 rounded-md border border-border bg-bg-subtle hover:bg-bg-muted hover:border-accent text-[10px] font-medium text-fg-muted hover:text-fg transition-colors'

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <p className="text-[10px] text-fg-subtle">Add or remove space inside this element.</p>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={btn} onClick={() => adjust('top', step)}>
          ↑ More top space
        </button>
        <button type="button" className={btn} onClick={() => adjust('top', -step)}>
          ↑ Less top space
        </button>
        <button type="button" className={btn} onClick={() => adjust('bottom', step)}>
          ↓ More bottom space
        </button>
        <button type="button" className={btn} onClick={() => adjust('bottom', -step)}>
          ↓ Less bottom space
        </button>
        <button type="button" className={btn} onClick={() => adjust('left', step)}>
          ← More left space
        </button>
        <button type="button" className={btn} onClick={() => adjust('left', -step)}>
          ← Less left space
        </button>
        <button type="button" className={btn} onClick={() => adjust('right', step)}>
          → More right space
        </button>
        <button type="button" className={btn} onClick={() => adjust('right', -step)}>
          → Less right space
        </button>
      </div>
    </div>
  )
}

interface StepArrowsProps {
  label: string
  valueLabel: string
  onDecrease: () => void
  onIncrease: () => void
  decreaseTitle?: string
  increaseTitle?: string
}

export function StepArrows({
  label,
  valueLabel,
  onDecrease,
  onIncrease,
  decreaseTitle = 'Smaller',
  increaseTitle = 'Larger',
}: StepArrowsProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          title={decreaseTitle}
          onClick={onDecrease}
          className="flex-1 py-2 rounded-md border border-border bg-bg-subtle hover:bg-bg-muted hover:border-accent text-sm font-bold transition-colors"
        >
          −
        </button>
        <span className="flex-[2] text-center text-sm font-medium text-fg py-2 px-2 rounded-md bg-bg-subtle border border-border truncate">
          {valueLabel}
        </span>
        <button
          type="button"
          title={increaseTitle}
          onClick={onIncrease}
          className="flex-1 py-2 rounded-md border border-border bg-bg-subtle hover:bg-bg-muted hover:border-accent text-sm font-bold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default MoveArrows
