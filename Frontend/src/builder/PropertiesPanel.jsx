import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Type, Image, Layout, Settings, Sliders, Palette, RefreshCw } from 'lucide-react'
import useStore from '../store/useStore'
import { uploadAsset } from '../assets/assetManager'
import { getBlock } from '../registry/index'
import { getBlockById } from '../utils/blockUtils'
import { isStyleInherited } from '../utils/responsiveStyles'
import Panel from '../components/ui/Panel'
import EmptyState from '../components/ui/EmptyState'
import FormField from '../components/ui/FormField'
import ColorField from '../components/ui/ColorField'
import SliderField from '../components/ui/SliderField'
import LinksEditor from '../components/ui/LinksEditor'
import UrlsEditor from '../components/ui/UrlsEditor'
import ToggleGroup from '../components/ui/ToggleGroup'
import { getButtonLinks } from '../utils/buttonLinks'
import ImageResizeCard from '../components/properties/ImageResizeCard'

function RegistryField({ field, block, updateBlock, previewMode, onUploadError }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const updateContent = useCallback((key, value) => {
    updateBlock(block.id, { content: { [key]: value } })
  }, [block.id, updateBlock])

  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }

  if (field.scope === 'content') {
    const value = block.content?.[field.key]
    if (field.type === 'links') {
      return (
        <LinksEditor
          label={field.label}
          links={value || []}
          onChange={(v) => updateContent(field.key, v)}
        />
      )
    }
    if (field.type === 'urls') {
      const urls = field.key === 'buttonLinks' ? getButtonLinks(block.content) : (value || [])
      return (
        <UrlsEditor
          label={field.label}
          urls={urls}
          onChange={(v) => updateContent(field.key, v)}
        />
      )
    }
    if (field.type === 'textarea') {
      return (
        <FormField
          label={field.label}
          type="textarea"
          value={value || ''}
          onChange={(v) => updateContent(field.key, v)}
          rows={field.key === 'text' ? 5 : 3}
        />
      )
    }
    if (field.key === 'imageUrl') {
      const imageUrl = value || ''
      const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
          const asset = await uploadAsset(file)
          updateContent(field.key, asset.url || asset.data)
        } catch (err) {
          onUploadError?.(err.message || 'Upload failed')
        } finally {
          setUploading(false)
          e.target.value = ''
        }
      }
      return (
        <div className="space-y-2">
          <FormField
            label={field.label}
            value={imageUrl}
            onChange={(v) => updateContent(field.key, v)}
            placeholder="https://example.com/image.jpg"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload image'}
          </button>
          {imageUrl && (
            <div
              className="h-20 rounded-lg border border-border overflow-hidden bg-bg-muted"
              style={{
                backgroundImage: `url("${String(imageUrl).replace(/"/g, '%22')}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
      )
    }
    return (
      <FormField
        label={field.label}
        type={field.type === 'number' ? 'number' : 'text'}
        value={field.type === 'number' ? String(value ?? '') : (value || '')}
        onChange={(v) => updateContent(field.key, field.type === 'number' ? Number(v) : v)}
      />
    )
  }

  if (field.scope === 'styles') {
    if (field.type === 'color') {
      return (
        <ColorField
          label={field.label}
          value={resolved[field.key] || ''}
          onChange={(v) => updateStyle(field.key, v)}
          inherited={isStyleInherited(block.styles, previewMode, field.key)}
        />
      )
    }
    if (field.type === 'slider') {
      return (
        <SliderField
          label={field.label}
          value={resolved[field.key] ?? 0}
          onChange={(v) => updateStyle(field.key, v)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          inherited={isStyleInherited(block.styles, previewMode, field.key)}
        />
      )
    }
    if (field.type === 'image') {
      const imageUrl = resolved[field.key] || ''
      return (
        <div className="space-y-2">
          <FormField
            label={field.label}
            value={imageUrl}
            onChange={(v) => updateStyle(field.key, v)}
            placeholder="https://example.com/background.jpg"
          />
          {imageUrl && (
            <div
              className="h-20 rounded-lg border border-border overflow-hidden bg-bg-muted"
              style={{
                backgroundImage: `url("${imageUrl.replace(/"/g, '%22')}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
        </div>
      )
    }
    return (
      <FormField
        label={field.label}
        value={resolved[field.key] || ''}
        onChange={(v) => updateStyle(field.key, v)}
      />
    )
  }

  return null
}

function TextSettingsPanel({ block, updateBlock, previewMode }) {
  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }
  
  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const fontSizeNum = parseInt(resolved.fontSize, 10) || 16
  const letterSpacingNum = parseInt(resolved.letterSpacing, 10) || 0
  const lineHeightNum = parseFloat(resolved.lineHeight) || 1.5

  return (
    <div className="space-y-4">
      {/* Font Family */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-fg-muted uppercase tracking-wider block">Font Family</label>
        <select
          value={resolved.fontFamily || 'Inter'}
          onChange={(e) => updateStyle('fontFamily', e.target.value)}
          className="w-full bg-[#111111] border border-border rounded-lg px-3 py-2 text-xs text-neutral-200 outline-none focus:border-accent"
        >
          <option value="Inter">Inter</option>
          <option value="Outfit">Outfit</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Monospace</option>
        </select>
      </div>

      {/* Font Size */}
      <SliderField
        label="Font Size (px)"
        value={fontSizeNum}
        onChange={(v) => updateStyle('fontSize', `${v}px`)}
        min={10}
        max={72}
        inherited={isStyleInherited(block.styles, previewMode, 'fontSize')}
      />

      {/* Font Weight */}
      <SliderField
        label="Font Weight"
        value={parseInt(resolved.fontWeight, 10) || 400}
        onChange={(v) => updateStyle('fontWeight', String(v))}
        min={300}
        max={800}
        inherited={isStyleInherited(block.styles, previewMode, 'fontWeight')}
      />

      {/* Text Color */}
      <ColorField
        label="Text Color"
        value={resolved.color || '#1e293b'}
        onChange={(v) => updateStyle('color', v)}
        inherited={isStyleInherited(block.styles, previewMode, 'color')}
      />

      {/* Alignment */}
      <ToggleGroup
        label="Alignment"
        value={resolved.textAlign || 'left'}
        onChange={(val) => updateStyle('textAlign', val)}
        options={[
          { id: 'left', label: 'Left' },
          { id: 'center', label: 'Center' },
          { id: 'right', label: 'Right' }
        ]}
      />

      {/* Letter Spacing */}
      <SliderField
        label="Letter Spacing (px)"
        value={letterSpacingNum}
        onChange={(v) => updateStyle('letterSpacing', `${v}px`)}
        min={0}
        max={10}
        inherited={isStyleInherited(block.styles, previewMode, 'letterSpacing')}
      />

      {/* Line Height */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-neutral-400">Line Height</span>
          <span className="font-mono text-accent">{lineHeightNum.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.1"
          value={lineHeightNum}
          onChange={(e) => updateStyle('lineHeight', e.target.value)}
          className="w-full accent-accent cursor-pointer mt-1"
        />
      </div>
    </div>
  )
}

function TextDesignEffectsTab({ block, updateBlock, previewMode }) {
  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }

  return (
    <div className="space-y-4">
      {/* Background */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Background</h4>
        <ColorField
          label="Background Color"
          value={resolved.backgroundColor || 'transparent'}
          onChange={(v) => updateStyle('backgroundColor', v)}
          inherited={isStyleInherited(block.styles, previewMode, 'backgroundColor')}
        />
      </div>

      {/* Borders & Corners */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Borders & Corners (Effects)</h4>
        <SliderField
          label="Corner Radius"
          value={resolved.borderRadius ?? 0}
          onChange={(v) => updateStyle('borderRadius', v)}
          min={0}
          max={48}
          inherited={isStyleInherited(block.styles, previewMode, 'borderRadius')}
        />
        <SliderField
          label="Border Width"
          value={resolved.borderWidth ?? 0}
          onChange={(v) => updateStyle('borderWidth', v)}
          min={0}
          max={10}
          inherited={isStyleInherited(block.styles, previewMode, 'borderWidth')}
        />
        {parseInt(resolved.borderWidth, 10) > 0 && (
          <ColorField
            label="Border Color"
            value={resolved.borderColor || '#cbd5e1'}
            onChange={(v) => updateStyle('borderColor', v)}
            inherited={isStyleInherited(block.styles, previewMode, 'borderColor')}
          />
        )}
      </div>

      {/* Spacing */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Spacing</h4>
        {['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom'].map((key) => (
          <SliderField
            key={key}
            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
            value={resolved[key] ?? (key.startsWith('padding') ? 16 : 0)}
            onChange={(v) => updateStyle(key, v)}
            min={0}
            max={key.includes('margin') ? 80 : 120}
            inherited={isStyleInherited(block.styles, previewMode, key)}
          />
        ))}
      </div>
    </div>
  )
}

function ImageReplaceTab({ block, updateBlock, onUploadError }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const updateContent = useCallback((key, value) => {
    updateBlock(block.id, { content: { [key]: value } })
  }, [block.id, updateBlock])

  const imageUrl = block.content?.imageUrl || ''

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const asset = await uploadAsset(file)
      updateContent('imageUrl', asset.url || asset.data)
    } catch (err) {
      onUploadError?.(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        label="Image URL"
        value={imageUrl}
        onChange={(v) => updateContent('imageUrl', v)}
        placeholder="https://example.com/image.jpg"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full py-2 bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
        <span>{uploading ? 'Uploading image...' : 'Upload Image File'}</span>
      </button>

      <FormField
        label="Alt Text"
        value={block.content?.altText || ''}
        onChange={(v) => updateContent('altText', v)}
        placeholder="Describe the image context"
      />
      <FormField
        label="Caption"
        value={block.content?.caption || ''}
        onChange={(v) => updateContent('caption', v)}
        placeholder="Optional caption below image"
      />
    </div>
  )
}

function ImageResizeCropTab({ block, updateBlock }) {
  const width = block.content?.width ?? 400
  const height = block.content?.height ?? 300
  const lockRatio = block.content?.lockRatio ?? true
  const objectFit = block.content?.objectFit ?? 'cover'
  const objectPosition = block.content?.objectPosition ?? 'center'

  const updateContent = useCallback((updates) => {
    updateBlock(block.id, { content: updates })
  }, [block.id, updateBlock])

  const cropRatio = block.content?.cropRatio || 'free'

  const handleCropRatioChange = (val) => {
    const updates = { cropRatio: val }
    if (val === '1:1') {
      updates.height = width
      updates.lockRatio = true
    } else if (val === '4:3') {
      updates.height = Math.round(width * 3 / 4)
      updates.lockRatio = true
    } else if (val === '16:9') {
      updates.height = Math.round(width * 9 / 16)
      updates.lockRatio = true
    } else if (val === 'free') {
      updates.lockRatio = false
    }
    updateContent(updates)
  }

  return (
    <div className="space-y-4">
      <ImageResizeCard
        width={width}
        height={height}
        lockRatio={lockRatio}
        objectFit={objectFit}
        objectPosition={objectPosition}
        onChange={updateContent}
      />
      
      <div className="p-3 bg-bg-muted/40 border border-border/40 rounded-xl space-y-2.5">
        <span className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider block">Crop Constraints</span>
        <ToggleGroup
          value={cropRatio}
          onChange={handleCropRatioChange}
          options={[
            { id: 'free', label: 'Free' },
            { id: '1:1', label: '1:1' },
            { id: '4:3', label: '4:3' },
            { id: '16:9', label: '16:9' }
          ]}
        />
      </div>
    </div>
  )
}

function ContainerSizePaddingTab({ block, updateBlock, previewMode }) {
  const columns = block.content?.columns || 2
  const gap = block.styles?.[previewMode]?.gap ?? block.styles?.desktop?.gap ?? 16

  const updateContent = useCallback((key, value) => {
    updateBlock(block.id, { content: { [key]: value } })
  }, [block.id, updateBlock])

  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }

  return (
    <div className="space-y-4">
      {/* Grid Columns */}
      <SliderField
        label="Grid Columns"
        value={columns}
        onChange={(v) => updateContent('columns', v)}
        min={1}
        max={4}
      />

      {/* Grid Gap */}
      <SliderField
        label="Layout Spacing Gap"
        value={gap}
        onChange={(v) => updateStyle('gap', v)}
        min={0}
        max={64}
        inherited={isStyleInherited(block.styles, previewMode, 'gap')}
      />

      {/* Container Width */}
      <FormField
        label="Container Width"
        value={resolved.width || '100%'}
        onChange={(v) => updateStyle('width', v)}
        placeholder="e.g. 100% or 1200px"
      />

      {/* Padding Settings */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Container Padding</h4>
        {['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].map((key) => (
          <SliderField
            key={key}
            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
            value={resolved[key] ?? 16}
            onChange={(v) => updateStyle(key, v)}
            min={0}
            max={120}
            inherited={isStyleInherited(block.styles, previewMode, key)}
          />
        ))}
      </div>
    </div>
  )
}

function ContainerStyleBorderTab({ block, updateBlock, previewMode }) {
  const updateStyle = useCallback((key, value) => {
    updateBlock(block.id, { styles: { [key]: value } })
  }, [block.id, updateBlock])

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolved = { ...s.desktop, ...s[previewMode] }

  return (
    <div className="space-y-4">
      {/* Background Section */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Background</h4>
        <ColorField
          label="Background Color"
          value={resolved.backgroundColor || 'transparent'}
          onChange={(v) => updateStyle('backgroundColor', v)}
          inherited={isStyleInherited(block.styles, previewMode, 'backgroundColor')}
        />
        <FormField
          label="Background Image URL"
          value={resolved.backgroundImage || ''}
          onChange={(v) => updateStyle('backgroundImage', v)}
          placeholder="https://example.com/bg.jpg"
        />
      </div>

      {/* Border Section */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Borders & Corners</h4>
        <SliderField
          label="Corner Radius"
          value={resolved.borderRadius ?? 0}
          onChange={(v) => updateStyle('borderRadius', v)}
          min={0}
          max={48}
          inherited={isStyleInherited(block.styles, previewMode, 'borderRadius')}
        />
        <SliderField
          label="Border Width"
          value={resolved.borderWidth ?? 0}
          onChange={(v) => updateStyle('borderWidth', v)}
          min={0}
          max={10}
          inherited={isStyleInherited(block.styles, previewMode, 'borderWidth')}
        />
        {parseInt(resolved.borderWidth, 10) > 0 && (
          <ColorField
            label="Border Color"
            value={resolved.borderColor || '#cbd5e1'}
            onChange={(v) => updateStyle('borderColor', v)}
            inherited={isStyleInherited(block.styles, previewMode, 'borderColor')}
          />
        )}
      </div>
    </div>
  )
}

function GenericContentTab({ block, updateBlock, onUploadError }) {
  const def = getBlock(block.type)
  const contentFields = (def?.propertyPanel || []).filter((f) => f.scope === 'content')

  if (!contentFields.length) {
    return <p className="text-xs text-fg-subtle italic py-4 text-center">No configurable content parameters.</p>
  }

  return (
    <div className="space-y-4">
      {contentFields.map((field) => (
        <RegistryField
          key={field.key}
          field={field}
          block={block}
          updateBlock={updateBlock}
          onUploadError={onUploadError}
        />
      ))}
    </div>
  )
}

function GenericDesignTab({ block, updateBlock, previewMode }) {
  const def = getBlock(block.type)
  const styleFields = (def?.propertyPanel || []).filter((f) => f.scope === 'styles')

  return (
    <div className="space-y-4">
      {styleFields.map((field) => (
        <RegistryField
          key={field.key}
          field={field}
          block={block}
          updateBlock={updateBlock}
          previewMode={previewMode}
        />
      ))}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Spacing</h4>
        {['paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'].map((key) => (
          <SliderField
            key={key}
            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
            value={block.styles?.[previewMode]?.[key] ?? block.styles?.desktop?.[key] ?? 0}
            onChange={(v) => updateBlock(block.id, { styles: { [key]: v } })}
            min={0}
            max={120}
          />
        ))}
      </div>
    </div>
  )
}

const DEFAULT_TAB_MAP = {
  text: 'content',
  image: 'resize',
  container: 'layout',
}

function PropertiesPanel({ className = '', onClose }) {
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const layout = useStore((s) => s.layout)
  const updateBlock = useStore((s) => s.updateBlock)
  const previewMode = useStore((s) => s.previewMode)
  const addToast = useStore((s) => s.addToast)

  const block = useMemo(
    () => (selectedBlockId ? getBlockById(layout, selectedBlockId) : null),
    [selectedBlockId, layout]
  )

  const [tab, setTab] = useState('content')

  // Automatically adjust property tab to contextual default when selected element changes
  useEffect(() => {
    if (block) {
      setTab(DEFAULT_TAB_MAP[block.type] || 'content')
    }
  }, [selectedBlockId, block])

  // Contextual tabs configuration
  const tabs = useMemo(() => {
    if (!block) return []
    if (block.type === 'text') {
      return [
        { id: 'content', label: 'Content', icon: Settings },
        { id: 'typography', label: 'Typography', icon: Type },
        { id: 'design', label: 'Design & Effects', icon: Palette }
      ]
    }
    if (block.type === 'image') {
      return [
        { id: 'resize', label: 'Resize & Crop', icon: Sliders },
        { id: 'replace', label: 'Replace Src', icon: Image }
      ]
    }
    if (block.type === 'container') {
      return [
        { id: 'layout', label: 'Size & Padding', icon: Layout },
        { id: 'design', label: 'Style & Border', icon: Palette }
      ]
    }
    return [
      { id: 'content', label: 'Content', icon: Settings },
      { id: 'design', label: 'Design & Spacing', icon: Palette }
    ]
  }, [block])

  const renderActiveTab = () => {
    if (!block) return null
    
    // Text contextual subpanels
    if (block.type === 'text') {
      if (tab === 'content') {
        return <GenericContentTab block={block} updateBlock={updateBlock} onUploadError={(msg) => addToast(msg, 'error')} />
      }
      if (tab === 'typography') {
        return <TextSettingsPanel block={block} updateBlock={updateBlock} previewMode={previewMode} />
      }
      return <TextDesignEffectsTab block={block} updateBlock={updateBlock} previewMode={previewMode} />
    }

    // Image contextual subpanels
    if (block.type === 'image') {
      if (tab === 'resize') {
        return <ImageResizeCropTab block={block} updateBlock={updateBlock} />
      }
      return <ImageReplaceTab block={block} updateBlock={updateBlock} onUploadError={(msg) => addToast(msg, 'error')} />
    }

    // Container contextual subpanels
    if (block.type === 'container') {
      if (tab === 'layout') {
        return <ContainerSizePaddingTab block={block} updateBlock={updateBlock} previewMode={previewMode} />
      }
      return <ContainerStyleBorderTab block={block} updateBlock={updateBlock} previewMode={previewMode} />
    }

    // Standard fallback subpanels
    if (tab === 'content') {
      return <GenericContentTab block={block} updateBlock={updateBlock} onUploadError={(msg) => addToast(msg, 'error')} />
    }
    return <GenericDesignTab block={block} updateBlock={updateBlock} previewMode={previewMode} />
  }

  return (
    <Panel title="Properties" className={`w-full lg:w-[280px] border-l border-border bg-bg-elevated flex flex-col h-full min-h-0 ${className}`} onClose={onClose}>
      {!block ? (
        <EmptyState
          title="No element selected"
          description="Click any canvas element to display its contextual formatting panels."
        />
      ) : (
        <>
          {/* Dynamic Tabs bar */}
          <div className="flex border-b border-border shrink-0 bg-bg-muted/10" role="tablist">
            {tabs.map((t) => {
              const TabIcon = t.icon
              const isActive = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-[11px] font-semibold tracking-wide capitalize transition-all flex flex-col items-center gap-1.5 border-b-2 ${
                    isActive
                      ? 'text-accent border-accent bg-accent-muted/20'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-muted/30 border-transparent'
                  }`}
                >
                  {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Lazy Rendering Content */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin" role="tabpanel">
            <div className="text-[10px] text-fg-subtle capitalize mb-4 bg-bg-subtle p-2 rounded-lg border border-border flex items-center justify-between">
              <span>Preview Mode: <span className="font-bold text-fg">{previewMode}</span></span>
              {previewMode !== 'desktop' && <span className="text-[9px] text-accent font-semibold">(overriding desktop)</span>}
            </div>
            {renderActiveTab()}
          </div>
        </>
      )}
    </Panel>
  )
}

export default memo(PropertiesPanel)
