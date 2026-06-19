import React, { useState } from 'react';
import Tabs from '../ui/Tabs';
import ContentTab from '../properties/ContentTab';
import DesignTab from '../properties/DesignTab';

export default function PropertiesPanel({
  selectedBlock,
  onUpdateBlockProperties,
  className = ''
}) {
  const [activeTab, setActiveTab] = useState('content');

  const tabOptions = [
    { id: 'content', label: 'Content' },
    { id: 'design', label: 'Design' }
  ];

  return (
    <div className={`w-[268px] bg-[#181818] border-l border-[#252525] flex flex-col shrink-0 overflow-hidden ${className}`}>
      
      {selectedBlock ? (
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header section */}
          <div className="p-4 border-b border-[#252525] flex flex-col gap-2 bg-[#111111]/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6B5CE7] bg-[#6B5CE7]/10 px-2 py-0.5 rounded border border-[#6B5CE7]/20">
                Editing Mode
              </span>
              <span className="text-[10px] font-semibold text-[#aaaaaa] flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>Active</span>
              </span>
            </div>
            
            <h3 className="text-sm font-extrabold text-[#e8e8e8] tracking-tight">
              {selectedBlock.title || 'Selected Component'}
            </h3>
            <p className="text-[10px] text-[#666666] leading-normal font-medium">
              Modify values below to update the canvas in real-time.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="p-3 border-b border-[#252525]">
            <Tabs
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'content' ? (
              <ContentTab
                properties={selectedBlock.properties}
                onChange={(updatedProps) => onUpdateBlockProperties(selectedBlock.id, updatedProps)}
              />
            ) : (
              <DesignTab
                properties={selectedBlock.properties}
                onChange={(updatedProps) => onUpdateBlockProperties(selectedBlock.id, updatedProps)}
              />
            )}
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#666666]">
          <div className="w-12 h-12 rounded-xl border border-dashed border-[#252525] flex items-center justify-center mb-3.5 bg-[#111111]/45">
            <i className="ti ti-hand-click text-xl text-[#666666]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#aaaaaa]">Inspector Panel</span>
          <p className="text-[11px] leading-relaxed text-[#666666] mt-2 max-w-[180px]">
            Select an element on the canvas workspace to configure content and design styling.
          </p>
        </div>
      )}

    </div>
  );
}
