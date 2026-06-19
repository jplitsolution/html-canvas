import React from 'react';
import ColorSwatch from '../ui/ColorSwatch';
import Input from '../ui/Input';
import Slider from '../ui/Slider';
import ImageResizeCard from './ImageResizeCard';

export default function DesignTab({
  properties = {},
  onChange
}) {
  const {
    textColor = '#e8e8e8',
    bgColor = '#181818',
    bgImage = '',
    paddingTop = 16,
    paddingBottom = 16,
    paddingLeft = 24,
    paddingRight = 24,
    marginTop = 0,
    marginBottom = 0,
    borderRadius = 12,
    borderWidth = 1,
    borderColor = '#252525',
    // Navbar Logo image resize parameters
    logoImageWidth,
    logoImageHeight,
    logoImageFit,
    logoImagePosition,
    // Hero banner image resize parameters
    heroImageWidth,
    heroImageHeight,
    heroImageFit,
    heroImagePosition,
    // Media block image resize parameters
    imageWidth,
    imageHeight,
    imageFit,
    imagePosition,
    lockRatio
  } = properties;

  const handleFieldChange = (key, value) => {
    onChange({ [key]: value });
  };

  // Handler for image card dimensions changes
  const handleImageResize = (imgProps) => {
    onChange(imgProps);
  };

  // Detect if selected block has any image attributes
  const hasNavbarLogoImage = logoImageWidth !== undefined;
  const hasHeroImage = heroImageWidth !== undefined;
  const hasMediaImage = imageWidth !== undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Colors Section */}
      <div className="flex flex-col gap-4">
        <ColorSwatch
          label="Text Color"
          value={textColor}
          onChange={(val) => handleFieldChange('textColor', val)}
        />
        <ColorSwatch
          label="Background Color"
          value={bgColor}
          onChange={(val) => handleFieldChange('bgColor', val)}
        />
      </div>

      {/* 2. Background Image */}
      {properties.bgColor !== undefined && (
        <Input
          label="Background Image URL"
          value={bgImage}
          onChange={(e) => handleFieldChange('bgImage', e.target.value)}
          placeholder="https://images.unsplash.com/..."
          icon="ti-photo-vector"
        />
      )}

      {/* 3. Spacing Section */}
      <div className="flex flex-col gap-4 border-t border-[#252525] pt-4">
        <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
          Spacing Controls
        </span>
        <div className="flex flex-col gap-3">
          <Slider
            label="Padding Vertical"
            min={0}
            max={120}
            step={4}
            value={paddingTop}
            onChange={(val) => {
              onChange({
                paddingTop: val,
                paddingBottom: val
              });
            }}
            suffix="px"
          />
          <Slider
            label="Padding Horizontal"
            min={0}
            max={80}
            step={4}
            value={paddingLeft}
            onChange={(val) => {
              onChange({
                paddingLeft: val,
                paddingRight: val
              });
            }}
            suffix="px"
          />
          <Slider
            label="Margin Vertical"
            min={0}
            max={60}
            step={4}
            value={marginTop}
            onChange={(val) => {
              onChange({
                marginTop: val,
                marginBottom: val
              });
            }}
            suffix="px"
          />
        </div>
      </div>

      {/* 4. Borders Section */}
      {borderRadius !== undefined && (
        <div className="flex flex-col gap-4 border-t border-[#252525] pt-4">
          <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
            Border Styling
          </span>
          <div className="flex flex-col gap-3">
            <Slider
              label="Border Radius"
              min={0}
              max={40}
              step={2}
              value={borderRadius}
              onChange={(val) => handleFieldChange('borderRadius', val)}
              suffix="px"
            />
            {borderWidth !== undefined && (
              <Slider
                label="Border Width"
                min={0}
                max={8}
                step={1}
                value={borderWidth}
                onChange={(val) => handleFieldChange('borderWidth', val)}
                suffix="px"
              />
            )}
            {borderColor !== undefined && (
              <ColorSwatch
                label="Border Color"
                value={borderColor}
                onChange={(val) => handleFieldChange('borderColor', val)}
              />
            )}
          </div>
        </div>
      )}

      {/* 5. Embedded ImageResizeCard for Navbar Logo Image */}
      {hasNavbarLogoImage && (
        <div className="border-t border-[#252525] pt-4">
          <ImageResizeCard
            width={logoImageWidth}
            height={logoImageHeight}
            lockRatio={lockRatio}
            objectFit={logoImageFit}
            objectPosition={logoImagePosition}
            onChange={(resizedProps) => {
              const updated = {};
              if (resizedProps.width !== undefined) updated.logoImageWidth = resizedProps.width;
              if (resizedProps.height !== undefined) updated.logoImageHeight = resizedProps.height;
              if (resizedProps.lockRatio !== undefined) updated.lockRatio = resizedProps.lockRatio;
              if (resizedProps.objectFit !== undefined) updated.logoImageFit = resizedProps.objectFit;
              if (resizedProps.objectPosition !== undefined) updated.logoImagePosition = resizedProps.objectPosition;
              handleImageResize(updated);
            }}
          />
        </div>
      )}

      {/* 6. Embedded ImageResizeCard for Header Hero Image */}
      {hasHeroImage && (
        <div className="border-t border-[#252525] pt-4">
          <ImageResizeCard
            width={heroImageWidth}
            height={heroImageHeight}
            lockRatio={lockRatio}
            objectFit={heroImageFit}
            objectPosition={heroImagePosition}
            onChange={(resizedProps) => {
              const updated = {};
              if (resizedProps.width !== undefined) updated.heroImageWidth = resizedProps.width;
              if (resizedProps.height !== undefined) updated.heroImageHeight = resizedProps.height;
              if (resizedProps.lockRatio !== undefined) updated.lockRatio = resizedProps.lockRatio;
              if (resizedProps.objectFit !== undefined) updated.heroImageFit = resizedProps.objectFit;
              if (resizedProps.objectPosition !== undefined) updated.heroImagePosition = resizedProps.objectPosition;
              handleImageResize(updated);
            }}
          />
        </div>
      )}

      {/* 7. Embedded ImageResizeCard for Media Element Block */}
      {hasMediaImage && (
        <div className="border-t border-[#252525] pt-4">
          <ImageResizeCard
            width={imageWidth}
            height={imageHeight}
            lockRatio={lockRatio}
            objectFit={imageFit}
            objectPosition={imagePosition}
            onChange={(resizedProps) => {
              const updated = {};
              if (resizedProps.width !== undefined) updated.imageWidth = resizedProps.width;
              if (resizedProps.height !== undefined) updated.imageHeight = resizedProps.height;
              if (resizedProps.lockRatio !== undefined) updated.lockRatio = resizedProps.lockRatio;
              if (resizedProps.objectFit !== undefined) updated.imageFit = resizedProps.objectFit;
              if (resizedProps.objectPosition !== undefined) updated.imagePosition = resizedProps.objectPosition;
              handleImageResize(updated);
            }}
          />
        </div>
      )}
    </div>
  );
}
