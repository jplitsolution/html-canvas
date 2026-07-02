import React from 'react'

export default function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  suffix = '',
  className = ''
}) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-fg-muted">
        <span>{label}</span>
        <span className="text-xs font-mono text-fg bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
          {value}{suffix}
        </span>
      </div>
      <div className="flex items-center gap-3 py-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--border-strong) ${percentage}%, var(--border-strong) 100%)`
          }}
          className="
            w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer outline-none accent-accent
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-bg-elevated
            [&::-webkit-slider-thumb]:border
            [&::-webkit-slider-thumb]:border-accent
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:active:scale-125
            [&::-webkit-slider-thumb]:hover:bg-fg-inverse
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_50%,transparent)]
          "
        />
      </div>
    </div>
  )
}
