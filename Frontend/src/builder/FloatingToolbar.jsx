import { memo, useRef, useState } from 'react'
import { 
  Trash2, Copy, AlignLeft, AlignCenter, AlignRight, 
  Upload, Type, Sliders, Layout, Link, Lock, Loader2
} from 'lucide-react'
import useStore from '../store/useStore'
import { uploadAsset } from '../assets/assetManager'

function FloatingToolbar({ block }) {
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const duplicateBlock = useStore((s) => s.duplicateBlock)
  const previewMode = useStore((s) => s.previewMode)
  const addToast = useStore((s) => s.addToast)

  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const isLocked = !!block?.content?.locked

  const s = block.styles?.desktop ? block.styles : { desktop: block.styles || {}, tablet: {}, mobile: {} }
  const resolvedStyles = { ...s.desktop, ...s[previewMode] }

  const handleAlign = (align) => {
    updateBlock(block.id, { styles: { textAlign: align } })
  }

  const handleFontSizeChange = (e) => {
    const size = e.target.value
    updateBlock(block.id, { styles: { fontSize: `${size}px` } })
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const asset = await uploadAsset(file)
      updateBlock(block.id, { content: { imageUrl: asset.url || asset.data, status: 'loaded' } })
      addToast('Image uploaded successfully!', 'success')
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleLockRatioToggle = () => {
    const lockRatio = !(block.content?.lockRatio ?? true)
    updateBlock(block.id, { content: { lockRatio } })
    addToast(lockRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked', 'info')
  }

  const handleCropChange = (ratio) => {
    const width = block.content?.width || 400
    const updates = { cropRatio: ratio }
    if (ratio === '1:1') {
      updates.height = width
      updates.lockRatio = true
    } else if (ratio === '4:3') {
      updates.height = Math.round(width * 3 / 4)
      updates.lockRatio = true
    } else if (ratio === '16:9') {
      updates.height = Math.round(width * 9 / 16)
      updates.lockRatio = true
    } else if (ratio === 'free') {
      updates.lockRatio = false
    }
    updateBlock(block.id, { content: updates })
    addToast(`Crop constraint: ${ratio}`, 'info')
  }

  const handleColumnsChange = (e) => {
    updateBlock(block.id, { content: { columns: Number(e.target.value) } })
  }

  const handlePaddingChange = (e) => {
    const pad = Number(e.target.value)
    updateBlock(block.id, { styles: { paddingTop: pad, paddingBottom: pad } })
  }

  const handleBackgroundColorChange = (e) => {
    updateBlock(block.id, { styles: { backgroundColor: e.target.value } })
  }

  return (
    <div 
      className="floating-toolbar-container absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-40 flex items-center gap-1.5 p-1.5 bg-[#18181b]/95 border border-[#27272a] shadow-2xl rounded-xl backdrop-blur-md text-neutral-300 animate-slide-up select-none pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {isLocked ? (
        <span className="text-[10px] px-2 text-warning font-semibold flex items-center gap-1">
          <Lock className="w-3 h-3" /> Locked
        </span>
      ) : (
        <>
          {/* Custom Typography Elements Toolbar */}
          {(block.type === 'typography' || block.type === 'text') && (
            <div className="flex items-center gap-1.5 px-1 flex-wrap max-w-full">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Text</span>
              <div className="divider-v" />
              
              {/* Font Family Select */}
              <select
                value={resolvedStyles.fontFamily || 'Inter'}
                onChange={(e) => updateBlock(block.id, { styles: { fontFamily: e.target.value } })}
                className="bg-black/40 border border-[#27272a] rounded px-1.5 py-0.5 text-xs outline-none text-neutral-300 focus:border-accent"
                title="Font Family"
              >
                <option value="Inter">Inter</option>
                <option value="Outfit">Outfit</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Monospace</option>
              </select>

              {/* Font Size Input */}
              <div className="flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-neutral-400" />
                <input 
                  type="number" 
                  value={parseInt(resolvedStyles.fontSize, 10) || 16}
                  onChange={handleFontSizeChange}
                  className="w-10 bg-black/40 border border-[#27272a] rounded px-1 py-0.5 text-xs text-center outline-none focus:border-accent"
                  title="Font Size (px)"
                />
              </div>

              {/* Bold Weight Toggle */}
              <button
                onClick={() => {
                  const isBold = resolvedStyles.fontWeight === '700' || resolvedStyles.fontWeight === 'bold'
                  updateBlock(block.id, { styles: { fontWeight: isBold ? '400' : '700' } })
                }}
                onMouseDown={(e) => e.preventDefault()}
                className={`p-1 rounded text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors ${
                  (resolvedStyles.fontWeight === '700' || resolvedStyles.fontWeight === 'bold')
                    ? 'bg-accent text-white'
                    : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                }`}
                title="Bold"
              >
                B
              </button>

              {/* Italic Style Toggle */}
              <button
                onClick={() => {
                  const isItalic = resolvedStyles.fontStyle === 'italic'
                  updateBlock(block.id, { styles: { fontStyle: isItalic ? 'normal' : 'italic' } })
                }}
                onMouseDown={(e) => e.preventDefault()}
                className={`p-1 rounded text-xs italic font-serif w-6 h-6 flex items-center justify-center transition-colors ${
                  resolvedStyles.fontStyle === 'italic'
                    ? 'bg-accent text-white'
                    : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                }`}
                title="Italic"
              >
                I
              </button>

              {/* Alignment Controls */}
              <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-[#27272a]">
                <button 
                  onClick={() => handleAlign('left')}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-1 rounded ${resolvedStyles.textAlign === 'left' ? 'bg-accent text-white' : 'hover:bg-white/5'}`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleAlign('center')}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-1 rounded ${resolvedStyles.textAlign === 'center' ? 'bg-accent text-white' : 'hover:bg-white/5'}`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleAlign('right')}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`p-1 rounded ${resolvedStyles.textAlign === 'right' ? 'bg-accent text-white' : 'hover:bg-white/5'}`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Text Color Picker */}
              <input 
                type="color" 
                value={resolvedStyles.color && resolvedStyles.color.startsWith('#') ? resolvedStyles.color : '#1e293b'}
                onChange={(e) => updateBlock(block.id, { styles: { color: e.target.value } })}
                className="w-5 h-5 rounded border border-[#27272a] bg-transparent cursor-pointer overflow-hidden p-0"
                title="Text Color"
              />

              {/* Line Height Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400">LH:</span>
                <select
                  value={resolvedStyles.lineHeight || '1.5'}
                  onChange={(e) => updateBlock(block.id, { styles: { lineHeight: e.target.value } })}
                  className="bg-black/40 border border-[#27272a] rounded px-1.5 py-0.5 text-xs outline-none text-neutral-300 focus:border-accent"
                  title="Line Height"
                >
                  <option value="1.0">1.0</option>
                  <option value="1.2">1.2</option>
                  <option value="1.4">1.4</option>
                  <option value="1.5">1.5</option>
                  <option value="1.6">1.6</option>
                  <option value="1.8">1.8</option>
                  <option value="2.0">2.0</option>
                </select>
              </div>

              {/* Letter Spacing Selector */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-neutral-400">LS:</span>
                <select
                  value={resolvedStyles.letterSpacing || '0px'}
                  onChange={(e) => updateBlock(block.id, { styles: { letterSpacing: e.target.value } })}
                  className="bg-black/40 border border-[#27272a] rounded px-1.5 py-0.5 text-xs outline-none text-neutral-300 focus:border-accent"
                  title="Letter Spacing"
                >
                  <option value="0px">0px</option>
                  <option value="1px">1px</option>
                  <option value="2px">2px</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                  <option value="5px">5px</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Image Toolbar */}
          {block.type === 'image' && (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Image</span>
              <div className="divider-v" />
              {/* Replace trigger */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 rounded-lg bg-black/40 border border-[#27272a] hover:bg-neutral-800 text-xs font-semibold flex items-center gap-1 transition"
                title="Replace image file"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-accent" />}
                <span>Replace</span>
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <div className="divider-v" />
              {/* Aspect Ratio Lock Toggle */}
              <button 
                onClick={handleLockRatioToggle}
                className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
                  (block.content?.lockRatio ?? true) ? 'bg-accent/20 border-accent text-accent' : 'border-[#27272a] hover:bg-neutral-800'
                }`}
                title="Lock aspect ratio"
              >
                <Link className="w-3.5 h-3.5" />
              </button>
              <div className="divider-v" />
              {/* Crop ratios */}
              <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-[#27272a]">
                {['free', '1:1', '4:3', '16:9'].map((ratio) => {
                  const isActive = (block.content?.cropRatio || 'free') === ratio
                  return (
                    <button 
                      key={ratio}
                      onClick={() => handleCropChange(ratio)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                        isActive ? 'bg-accent text-white' : 'hover:bg-white/5 text-neutral-400'
                      }`}
                      title={`Crop ratio: ${ratio}`}
                    >
                      {ratio}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Custom Container Layout Toolbar */}
          {block.type === 'container' && (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Grid</span>
              <div className="divider-v" />
              {/* Columns range slider */}
              <div className="flex items-center gap-1">
                <Layout className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[10px] text-neutral-400">Cols:</span>
                <input 
                  type="range" 
                  min={1}
                  max={4}
                  value={block.content?.columns || 2}
                  onChange={handleColumnsChange}
                  className="w-12 accent-accent cursor-pointer"
                  title="Columns count"
                />
                <span className="text-xs font-semibold tabular-nums">{block.content?.columns || 2}</span>
              </div>
              <div className="divider-v" />
              {/* Padding slider */}
              <div className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[10px] text-neutral-400">Pad:</span>
                <input 
                  type="range" 
                  min={0}
                  max={120}
                  value={resolvedStyles.paddingTop ?? 16}
                  onChange={handlePaddingChange}
                  className="w-12 accent-accent cursor-pointer"
                  title="Padding Y"
                />
              </div>
              <div className="divider-v" />
              {/* Background Color Swatch Picker */}
              <div className="flex items-center gap-1">
                <input 
                  type="color" 
                  value={resolvedStyles.backgroundColor === 'transparent' ? '#ffffff' : (resolvedStyles.backgroundColor || '#ffffff')}
                  onChange={handleBackgroundColorChange}
                  className="w-5 h-5 rounded-full border border-[#27272a] bg-transparent cursor-pointer overflow-hidden p-0"
                  title="Background Color"
                />
              </div>
            </div>
          )}

          {/* Common Layout Operations */}
          <div className="divider-v" />
          <button 
            onClick={() => duplicateBlock(block.id)}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Duplicate Block"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => removeBlock(block.id)}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-neutral-400 hover:text-red-400 transition"
            title="Delete Block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

export default memo(FloatingToolbar)
