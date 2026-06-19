import React, { useState } from 'react';
import { COMPONENT_GROUPS } from '../../data/components';

export default function Sidebar({
  onAddComponent,
  addedComponentIds = [],
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({
    NAVIGATION: true,
    HERO_SECTIONS: true,
    TYPOGRAPHY: true,
    ACTIONS: false,
    MEDIA: false,
    COMPONENTS: false,
    LAYOUT: false,
    FOOTER: false
  });

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filter groups and items based on search query
  const filteredGroups = COMPONENT_GROUPS.map(group => {
    const matchingItems = group.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...group,
      items: matchingItems
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className={`w-[230px] bg-[#181818] border-r border-[#252525] flex flex-col shrink-0 overflow-hidden ${className}`}>
      
      {/* Search & Header Section */}
      <div className="p-4 border-b border-[#252525] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#e8e8e8] flex items-center gap-1.5">
            <i className="ti ti-box text-base text-[#6B5CE7]" />
            <span>Library</span>
          </h3>
          <span className="text-[9px] font-bold text-[#666666] bg-[#111111] px-1.5 py-0.5 rounded border border-[#252525]">
            V1.0
          </span>
        </div>

        {/* Search input */}
        <div className="relative flex items-center">
          <span className="absolute left-2.5 text-[#666666] pointer-events-none">
            <i className="ti ti-search text-sm" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blocks..."
            className="w-full bg-[#111111] border border-[#252525] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e8e8e8] placeholder-[#666666] transition-all outline-none focus:border-[#6B5CE7]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#666666] hover:text-[#aaaaaa]"
            >
              <i className="ti ti-x text-xs" />
            </button>
          )}
        </div>

        {/* Hint Box */}
        <div className="bg-[#6B5CE7]/5 border border-[#6B5CE7]/10 rounded-lg p-2 text-[10px] text-[#aaaaaa] leading-relaxed">
          <span className="font-semibold text-[#6B5CE7] block mb-0.5">Quick Hint:</span>
          Click any card to add it to the canvas workspace.
        </div>
      </div>

      {/* Accordions Lists Section */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filteredGroups.map(group => {
          const isExpanded = expandedGroups[group.id] || searchQuery.length > 0;
          return (
            <div key={group.id} className="flex flex-col gap-1 border-b border-[#252525]/30 pb-2 last:border-0 last:pb-0">
              
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between w-full py-1 text-[10px] font-extrabold text-[#666666] hover:text-[#aaaaaa] transition-colors uppercase tracking-wider text-left"
              >
                <span>{group.title}</span>
                <i className={`ti ${isExpanded ? 'ti-chevron-down' : 'ti-chevron-right'} text-[9px]`} />
              </button>

              {/* Group Cards */}
              {isExpanded && (
                <div className="flex flex-col gap-2 mt-1">
                  {group.items.map(item => {
                    const isAdded = addedComponentIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onAddComponent(item)}
                        className={`
                          w-full p-2.5 rounded-lg border text-left flex flex-col gap-1.5 transition-all duration-200 group/card relative overflow-hidden
                          ${isAdded
                            ? 'bg-[#6B5CE7] border-[#6B5CE7] text-white shadow-md shadow-[#6B5CE7]/15'
                            : 'bg-[#111111] border-[#252525] text-[#e8e8e8] hover:border-[#6B5CE7]/50 hover:bg-[#181818]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`
                            p-1 rounded-md flex items-center justify-center shrink-0
                            ${isAdded ? 'bg-white/20 text-white' : 'bg-[#181818] text-[#aaaaaa] group-hover/card:text-[#6B5CE7]'}
                          `}>
                            <i className={`ti ${item.icon} text-sm`} />
                          </span>
                          <span className={`text-[11px] font-bold tracking-tight ${isAdded ? 'text-white' : 'text-[#e8e8e8]'}`}>
                            {item.title}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-normal font-medium ${isAdded ? 'text-white/80' : 'text-[#666666]'}`}>
                          {item.description}
                        </p>
                        
                        {isAdded && (
                          <span className="absolute top-2 right-2 text-white bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                            <i className="ti ti-check" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
