import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = ''
}) {
  return (
    <div className={`flex bg-[#111111] p-1 rounded-xl border border-[#252525] ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-[#181818] text-[#e8e8e8] shadow-sm border border-[#252525]'
                : 'text-[#666666] hover:text-[#aaaaaa] border border-transparent'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
