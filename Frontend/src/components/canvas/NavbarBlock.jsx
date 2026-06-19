import React from 'react';

export default function NavbarBlock({
  properties = {},
  isSelected = false,
  onClick
}) {
  const {
    logoText = 'SPECTRA',
    btnText = 'Launch App',
    btnLink = '#',
    links = [],
    textColor = '#e8e8e8',
    bgColor = '#181818',
    bgImage = '',
    paddingTop = 12,
    paddingBottom = 12,
    paddingLeft = 24,
    paddingRight = 24,
    marginTop = 16,
    marginBottom = 16,
    borderRadius = 12,
    borderWidth = 1,
    borderColor = '#252525',
    logoImageWidth = 24,
    logoImageHeight = 24,
    logoImageFit = 'contain',
    logoImagePosition = 'center'
  } = properties;

  const inlineStyles = {
    color: textColor,
    backgroundColor: bgImage ? 'transparent' : bgColor,
    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
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
        relative cursor-pointer transition-all duration-300 group select-none border
        ${isSelected 
          ? 'border-2 border-dashed border-[#6B5CE7] bg-[#6B5CE7]/5 shadow-[0_0_20px_rgba(107,92,231,0.2)] scale-[0.99]' 
          : 'border-transparent hover:border-[#6B5CE7]/50 hover:bg-[#6B5CE7]/2'
        }
      `}
      style={{
        ...inlineStyles,
        // Ensure color variables apply for custom text matching if needed
      }}
    >
      {/* Visual badge chip inside Canvas for selected status */}
      {isSelected && (
        <span className="absolute -top-3 left-4 z-10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white bg-[#6B5CE7] border border-[#6B5CE7] rounded-md uppercase flex items-center gap-1 shadow-md">
          <i className="ti ti-layout-navbar text-xs" />
          <span>Navbar Section</span>
        </span>
      )}
      
      {!isSelected && (
        <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1e1e1e] text-[#aaaaaa] border border-[#2e2e2e] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
          Click to Edit
        </span>
      )}

      <div className="flex items-center justify-between gap-4 w-full">
        {/* Brand/Logo on Left */}
        <div className="flex items-center gap-2 shrink-0">
          <div 
            className="flex items-center justify-center rounded-lg bg-gradient-to-tr from-[#6B5CE7] to-[#8c7df0]"
            style={{ 
              width: `${logoImageWidth}px`, 
              height: `${logoImageHeight}px` 
            }}
          >
            <i 
              className="ti ti-cube-3d-sphere text-white font-bold" 
              style={{ 
                fontSize: `${Math.max(10, Math.floor(logoImageWidth * 0.6))}px` 
              }}
            />
          </div>
          <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#e8e8e8] to-[#aaaaaa]">
            {logoText}
          </span>
        </div>

        {/* Links in Center */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.link}
              onClick={(e) => e.preventDefault()}
              className="text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
              style={{ color: `${textColor}dd` }}
            >
              <span className="hover:text-[#6B5CE7] transition-colors">{link.text}</span>
            </a>
          ))}
          {links.length === 0 && (
            <span className="text-xs text-[#666666] italic">No navigation links</span>
          )}
        </div>

        {/* CTA on Right */}
        <div className="shrink-0">
          <a
            href={btnLink}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#6B5CE7] text-white hover:bg-[#5b4cd4] transition-all duration-200 shadow-sm"
          >
            {btnText}
          </a>
        </div>
      </div>
    </div>
  );
}
