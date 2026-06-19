import React, { useEffect } from 'react';
import Input from '../ui/Input';
import ToggleGroup from '../ui/ToggleGroup';
import useImageResize from '../../hooks/useImageResize';

const POSITION_PRESETS = [
  'top-left', 'top', 'top-right',
  'left', 'center', 'right',
  'bottom-left', 'bottom', 'bottom-right'
];

export default function ImageResizeCard({
  width = 400,
  height = 300,
  lockRatio = true,
  objectFit = 'cover',
  objectPosition = 'center',
  onChange
}) {
  const {
    width: localWidth,
    height: localHeight,
    lockRatio: localLockRatio,
    updateWidth,
    updateHeight,
    toggleLockRatio,
    setDimensions
  } = useImageResize({
    width,
    height,
    lockRatio,
    onUpdate: ({ width: w, height: h, lockRatio: lr }) => {
      onChange({
        width: w,
        height: h,
        lockRatio: lr
      });
    }
  });

  // Keep hook local state synced with external updates
  useEffect(() => {
    setDimensions(width, height);
  }, [width, height, setDimensions]);

  const handleFitChange = (fitVal) => {
    onChange({ objectFit: fitVal });
  };

  const handlePositionChange = (posVal) => {
    onChange({ objectPosition: posVal });
  };

  return (
    <div className="bg-[#181818] border border-[#252525] rounded-xl p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#252525] pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#e8e8e8] flex items-center gap-1.5">
          <i className="ti ti-photo text-base text-[#6B5CE7]" />
          <span>Image Transform</span>
        </h4>
        <span className="text-[10px] font-semibold text-[#aaaaaa] bg-[#111111] px-1.5 py-0.5 rounded border border-[#252525]">
          Live Render
        </span>
      </div>

      {/* Sizing: Width, Link Icon, Height */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Width (px)"
            type="number"
            value={localWidth}
            onChange={(e) => updateWidth(e.target.value)}
            suffix="px"
          />
        </div>
        <button
          type="button"
          onClick={toggleLockRatio}
          title={localLockRatio ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
          className={`
            mb-1.5 p-2 rounded-lg border flex items-center justify-center transition-all duration-200
            ${localLockRatio
              ? 'bg-[#6B5CE7]/20 border-[#6B5CE7] text-[#6B5CE7]'
              : 'bg-[#111111] border-[#252525] text-[#666666] hover:text-[#aaaaaa] hover:border-[#666666]'
            }
          `}
        >
          <i className={`ti ${localLockRatio ? 'ti-lock' : 'ti-lock-open'} text-base`} />
        </button>
        <div className="flex-1">
          <Input
            label="Height (px)"
            type="number"
            value={localHeight}
            onChange={(e) => updateHeight(e.target.value)}
            suffix="px"
          />
        </div>
      </div>

      {/* Object Fit Options */}
      <ToggleGroup
        label="Object Fit"
        value={objectFit}
        onChange={handleFitChange}
        options={[
          { id: 'cover', label: 'Cover' },
          { id: 'contain', label: 'Contain' },
          { id: 'fill', label: 'Fill' },
          { id: 'none', label: 'None' }
        ]}
      />

      {/* 3x3 Alignment Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
          Object Position
        </span>
        <div className="flex items-center gap-4">
          {/* Visual 3x3 Grid Box */}
          <div className="grid grid-cols-3 gap-1 bg-[#111111] p-1.5 border border-[#252525] rounded-lg w-[76px] h-[76px] shrink-0">
            {POSITION_PRESETS.map((pos) => {
              const isActive = objectPosition === pos;
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => handlePositionChange(pos)}
                  title={`Position: ${pos}`}
                  className={`
                    w-full h-full rounded transition-all duration-200
                    ${isActive
                      ? 'bg-[#6B5CE7] shadow-sm shadow-[#6B5CE7]/30 scale-105'
                      : 'bg-[#1e1e1e] hover:bg-[#666666]'
                    }
                  `}
                />
              );
            })}
          </div>
          {/* Label text */}
          <div className="flex flex-col text-[10px] text-[#666666]">
            <span className="font-semibold text-[#aaaaaa] uppercase tracking-wider">Alignment Mode</span>
            <span className="mt-0.5 font-mono text-[#e8e8e8] uppercase bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#252525] w-fit">
              {objectPosition.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
