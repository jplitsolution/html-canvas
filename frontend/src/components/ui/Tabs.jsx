import React from 'react'

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = ''
}) {
  return (
    <div className={`flex bg-bg-subtle p-1 rounded-xl border border-border ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-bg-elevated text-fg shadow-sm border border-border'
                : 'text-fg-subtle hover:text-fg-muted border border-transparent'
              }
            `}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
