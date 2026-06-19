import React from 'react';

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
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-[#aaaaaa]">
        <span>{label}</span>
        <span className="text-xs font-mono text-[#e8e8e8] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#252525]">
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
            background: `linear-gradient(to right, #6B5CE7 0%, #6B5CE7 ${percentage}%, #252525 ${percentage}%, #252525 100%)`
          }}
          className="
            w-full h-1 bg-[#252525] rounded-lg appearance-none cursor-pointer outline-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#e8e8e8]
            [&::-webkit-slider-thumb]:border
            [&::-webkit-slider-thumb]:border-[#6B5CE7]
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:active:scale-125
            [&::-webkit-slider-thumb]:hover:bg-[#ffffff]
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(107,92,231,0.5)]
          "
        />
      </div>
    </div>
  );
}
