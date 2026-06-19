import React from 'react';
import Input from '../ui/Input';

export default function ContentTab({
  properties = {},
  onChange
}) {
  // Destructure common properties
  const {
    logoText,
    btnText,
    btnLink,
    primaryBtnText,
    primaryBtnLink,
    secondaryBtnText,
    secondaryBtnLink,
    links = [],
    chipText,
    title,
    subtitle,
    // Add columns/cards support if needed for other templates
    leftColText,
    rightColText,
    footerText
  } = properties;

  const handleFieldChange = (key, value) => {
    onChange({ [key]: value });
  };

  // Manage Link Actions
  const handleLinkTextChange = (id, text) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, text } : l);
    onChange({ links: updatedLinks });
  };

  const handleLinkUrlChange = (id, link) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, link } : l);
    onChange({ links: updatedLinks });
  };

  const handleAddLink = () => {
    const newLink = {
      id: Math.random().toString(36).substr(2, 9),
      text: `Link ${links.length + 1}`,
      link: '#new-link'
    };
    onChange({ links: [...links, newLink] });
  };

  const handleRemoveLink = (id) => {
    const updatedLinks = links.filter(l => l.id !== id);
    onChange({ links: updatedLinks });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Navbar Specific Content */}
      {logoText !== undefined && (
        <Input
          label="Logo Brand Name"
          value={logoText}
          onChange={(e) => handleFieldChange('logoText', e.target.value)}
          placeholder="SPECTRA"
          icon="ti-building-fortress"
        />
      )}

      {/* 2. Navigation Links Editor */}
      {properties.links !== undefined && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
              Navigation Links
            </span>
            <button
              type="button"
              onClick={handleAddLink}
              className="text-[10px] font-bold text-[#6B5CE7] hover:text-[#5b4cd4] bg-[#6B5CE7]/10 px-2 py-1 rounded border border-[#6B5CE7]/20 flex items-center gap-1 uppercase transition-colors"
            >
              <i className="ti ti-plus" />
              <span>Add Link</span>
            </button>
          </div>

          <div className="flex flex-col gap-3.5 bg-[#111111] p-3 rounded-lg border border-[#252525] max-h-[220px] overflow-y-auto">
            {links.map((link, index) => (
              <div key={link.id} className="flex flex-col gap-1.5 border-b border-[#252525]/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#666666]">
                  <span>LINK #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    className="text-[#ff5555] hover:text-red-400 flex items-center gap-0.5"
                    title="Remove Link"
                  >
                    <i className="ti ti-trash text-xs" />
                    <span>Delete</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Text"
                    value={link.text}
                    onChange={(e) => handleLinkTextChange(link.id, e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={link.link}
                    onChange={(e) => handleLinkUrlChange(link.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
            {links.length === 0 && (
              <div className="text-center text-xs text-[#666666] py-3 italic">
                No links added. Add one above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Hero Section Fields */}
      {chipText !== undefined && (
        <Input
          label="Chip Indicator text"
          value={chipText}
          onChange={(e) => handleFieldChange('chipText', e.target.value)}
          placeholder="NEW LAUNCH"
          icon="ti-tag"
        />
      )}

      {title !== undefined && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
            Main Headline
          </label>
          <textarea
            value={title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            rows={3}
            className="w-full bg-[#181818] border border-[#252525] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#666666] transition-all duration-200 outline-none focus:border-[#6B5CE7] focus:ring-1 focus:ring-[#6B5CE7] resize-none"
            placeholder="Headline Title..."
          />
        </div>
      )}

      {subtitle !== undefined && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
            Subtitle Description
          </label>
          <textarea
            value={subtitle}
            onChange={(e) => handleFieldChange('subtitle', e.target.value)}
            rows={3}
            className="w-full bg-[#181818] border border-[#252525] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#666666] transition-all duration-200 outline-none focus:border-[#6B5CE7] focus:ring-1 focus:ring-[#6B5CE7] resize-none"
            placeholder="Subtitle content description..."
          />
        </div>
      )}

      {/* 4. Single Button Fields (e.g. Navbar CTA) */}
      {btnText !== undefined && (
        <div className="grid grid-cols-2 gap-2 border-t border-[#252525] pt-3 mt-1">
          <Input
            label="CTA Button Text"
            value={btnText}
            onChange={(e) => handleFieldChange('btnText', e.target.value)}
          />
          <Input
            label="CTA Button Link"
            value={btnLink}
            onChange={(e) => handleFieldChange('btnLink', e.target.value)}
          />
        </div>
      )}

      {/* 5. Dual Button Pairs (e.g. Header CTA pairs) */}
      {primaryBtnText !== undefined && (
        <div className="flex flex-col gap-3 border-t border-[#252525] pt-3 mt-1">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Primary CTA Text"
              value={primaryBtnText}
              onChange={(e) => handleFieldChange('primaryBtnText', e.target.value)}
            />
            <Input
              label="Primary CTA Link"
              value={primaryBtnLink}
              onChange={(e) => handleFieldChange('primaryBtnLink', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Secondary CTA Text"
              value={secondaryBtnText}
              onChange={(e) => handleFieldChange('secondaryBtnText', e.target.value)}
            />
            <Input
              label="Secondary CTA Link"
              value={secondaryBtnLink}
              onChange={(e) => handleFieldChange('secondaryBtnLink', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 6. Layout / Grid column texts */}
      {leftColText !== undefined && (
        <Input
          label="Left Column Content"
          value={leftColText}
          onChange={(e) => handleFieldChange('leftColText', e.target.value)}
        />
      )}

      {rightColText !== undefined && (
        <Input
          label="Right Column Content"
          value={rightColText}
          onChange={(e) => handleFieldChange('rightColText', e.target.value)}
        />
      )}

      {/* 7. Footer text content */}
      {footerText !== undefined && (
        <Input
          label="Footer Copy text"
          value={footerText}
          onChange={(e) => handleFieldChange('footerText', e.target.value)}
          icon="ti-copyright"
        />
      )}
    </div>
  );
}
