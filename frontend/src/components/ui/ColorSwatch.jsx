import React from 'react';
import Input from './Input';

const DEFAULT_SWATCHES = [
  '#e8e8e8', // Light primary
  '#aaaaaa', // Secondary gray
  '#666666', // Muted gray
  '#6B5CE7', // Accent purple
  '#3b82f6', // Premium blue
  '#10b981', // Premium green
  '#f59e0b', // Warning amber
  '#ff5555', // Danger red
  '#181818', // Surface dark
  '#111111'  // Background deep
];

export default function ColorSwatch({
  label,
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  className = ''
}) {
  const activeColor = value || '#111111';

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
          {label}
        </span>
      )}
      
      {/* 10 swatches grid */}
      <div className="grid grid-cols-5 gap-2">
        {swatches.map((color) => {
          const isSelected = activeColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              title={color}
              className={`
                w-full aspect-square rounded-md border transition-all duration-200 relative group
                ${isSelected ? 'border-[#6B5CE7] scale-110 shadow-lg shadow-[#6B5CE7]/20' : 'border-[#252525] hover:border-[#666666]'}
              `}
              style={{ backgroundColor: color }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference">
                  <i className="ti ti-check font-bold" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Manual Hex & Native Color picker row */}
      <div className="flex gap-2 items-end mt-1">
        <div className="relative w-10 h-9 rounded-lg border border-[#252525] overflow-hidden shrink-0">
          <input
            type="color"
            value={activeColor.startsWith('#') && activeColor.length === 7 ? activeColor : '#6B5CE7'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-1 w-[150%] h-[150%] cursor-pointer border-none p-0 bg-transparent"
          />
        </div>
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            icon="ti-hash"
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
