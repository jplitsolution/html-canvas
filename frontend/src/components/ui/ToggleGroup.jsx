import React from 'react'

export default function ToggleGroup({
  label,
  options = [],
  value,
  onChange,
  className = ''
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex bg-bg-subtle p-1 rounded-lg border border-border w-full">
        {options.map((opt) => {
          const id = opt.id !== undefined ? opt.id : opt
          const optLabel = opt.label !== undefined ? opt.label : opt
          const optIcon = opt.icon
          const isActive = value === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-200
                ${isActive
                  ? 'bg-accent text-accent-fg shadow-sm font-semibold'
                  : 'text-fg-subtle hover:text-fg-muted'
                }
              `}
            >
              {optIcon && <i className={`ti ${optIcon} text-sm`} />}
              {optLabel && <span>{optLabel}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
