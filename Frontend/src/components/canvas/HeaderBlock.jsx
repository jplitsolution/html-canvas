import React from 'react';

export default function HeaderBlock({
  properties = {},
  isSelected = false,
  onClick
}) {
  const {
    chipText = 'PREMIUM RELEASE',
    title = 'We design things that feel futuristic and alive.',
    subtitle = 'Interactive page builders tailored for modern editorial websites, featuring responsive design systems.',
    primaryBtnText = 'Start Building',
    primaryBtnLink = '#',
    secondaryBtnText = 'View Docs',
    secondaryBtnLink = '#',
    textColor = '#e8e8e8',
    bgColor = '#181818',
    bgImage = '',
    paddingTop = 64,
    paddingBottom = 64,
    paddingLeft = 32,
    paddingRight = 32,
    marginTop = 0,
    marginBottom = 0,
    borderRadius = 16,
    borderWidth = 1,
    borderColor = '#252525',
    // Resizable Hero Image Properties
    heroImageWidth = 450,
    heroImageHeight = 280,
    heroImageFit = 'cover',
    heroImagePosition = 'center'
  } = properties;

  // Convert 3x3 positions (e.g., 'top-left', 'center') to css values if needed, otherwise string passes directly
  const posMap = {
    'top-left': 'top left', 'top': 'top center', 'top-right': 'top right',
    'left': 'center left', 'center': 'center', 'right': 'center right',
    'bottom-left': 'bottom left', 'bottom': 'bottom center', 'bottom-right': 'bottom right'
  };
  const objectPositionCss = posMap[heroImagePosition] || heroImagePosition;

  const inlineStyles = {
    color: textColor,
    backgroundColor: bgImage ? 'transparent' : bgColor,
    backgroundImage: bgImage ? `linear-gradient(rgba(17, 17, 17, 0.4), rgba(17, 17, 17, 0.75)), url(${bgImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    paddingLeft: `${paddingLeft}px`,
    paddingRight: `${paddingRight}px`,
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
    borderRadius: `${borderRadius}px`,
    borderWidth: `${borderWidth}px`,
    borderColor: borderColor
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        relative cursor-pointer transition-all duration-300 group overflow-hidden select-none border
        ${isSelected 
          ? 'border-2 border-dashed border-[#6B5CE7] bg-[#6B5CE7]/5 shadow-[0_0_20px_rgba(107,92,231,0.2)] scale-[0.99]' 
          : 'border-transparent hover:border-[#6B5CE7]/50 hover:bg-[#6B5CE7]/2'
        }
      `}
      style={inlineStyles}
    >
      {/* Visual badge chip inside Canvas for selected status */}
      {isSelected && (
        <span className="absolute -top-3 left-4 z-10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white bg-[#6B5CE7] border border-[#6B5CE7] rounded-md uppercase flex items-center gap-1 shadow-md">
          <i className="ti ti-layout-board-split text-xs" />
          <span>Header Section</span>
        </span>
      )}

      {!isSelected && (
        <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1e1e1e] text-[#aaaaaa] border border-[#2e2e2e] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
          Click to Edit
        </span>
      )}

      {/* Grid container: switches between stack and column depending on responsive width */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
        
        {/* Editorial Text Content on Left */}
        <div className="lg:col-span-7 flex flex-col items-start gap-4">
          
          {/* Neutral Chip */}
          {chipText && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold tracking-widest text-[#aaaaaa] bg-[#111111]/80 border border-[#252525] rounded-full uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B5CE7] animate-pulse" />
              {chipText}
            </div>
          )}

          {/* 42px premium title */}
          <h1 
            className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.15]"
            style={{ color: textColor }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-sm sm:text-base text-[#aaaaaa] font-medium leading-relaxed max-w-xl"
            style={{ color: `${textColor}aa` }}
          >
            {subtitle}
          </p>

          {/* Button Pairs */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {primaryBtnText && (
              <a
                href={primaryBtnLink}
                onClick={(e) => e.preventDefault()}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#6B5CE7] text-white hover:bg-[#5b4cd4] transition-all duration-200 shadow-md shadow-[#6B5CE7]/15"
              >
                {primaryBtnText}
              </a>
            )}
            {secondaryBtnText && (
              <a
                href={secondaryBtnLink}
                onClick={(e) => e.preventDefault()}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#111111] text-[#e8e8e8] border border-[#252525] hover:border-[#6B5CE7] transition-all duration-200"
              >
                {secondaryBtnText}
              </a>
            )}
          </div>
        </div>

        {/* Resizable Mockup Image on Right */}
        <div className="lg:col-span-5 flex justify-center items-center w-full">
          <div 
            className="relative bg-[#111111] rounded-xl border border-[#252525] overflow-hidden group/image shadow-2xl transition-all duration-300"
            style={{
              width: heroImageWidth ? `${heroImageWidth}px` : '100%',
              height: heroImageHeight ? `${heroImageHeight}px` : '240px',
              maxWidth: '100%'
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80"
              alt="Spectra Showcase Mockup"
              className="w-full h-full transition-transform duration-500 group-hover/image:scale-[1.03]"
              style={{
                objectFit: heroImageFit,
                objectPosition: objectPositionCss
              }}
            />
            {/* Visual Grid Accents (Bento style) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-0.5 text-[8px] font-bold text-[#aaaaaa] bg-[#111111]/80 rounded border border-[#252525] uppercase tracking-wider">
              <i className="ti ti-aspect-ratio text-[10px]" />
              <span>{heroImageWidth} × {heroImageHeight} px ({heroImageFit})</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
