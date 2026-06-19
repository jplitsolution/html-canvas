import { memo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useBlockStyles } from '../hooks/useBlockStyles'
import { ImageContent } from './shared/BlockPrimitives'
import useStore from '../store/useStore'
import { uploadAsset } from '../assets/assetManager'

function ImagePlaceholder({ onUploadStart, onUploadSuccess, onUploadError }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  const uploadFile = async (file) => {
    const allowed = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      onUploadError('Invalid format. Only PNG, JPG, JPEG, and WEBP allowed.')
      return
    }
    setUploading(true)
    onUploadStart?.()
    try {
      const asset = await uploadAsset(file)
      onUploadSuccess?.(asset.url || asset.data)
    } catch (err) {
      onUploadError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        e.stopPropagation()
        fileInputRef.current?.click()
      }}
      style={{
        backgroundColor: '#111111',
        border: isDragOver ? '2.5px dashed var(--accent, #6B5CE7)' : '1px dashed rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        minHeight: '240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '24px',
        transition: 'all 0.2s ease-in-out',
        color: '#e8e8e8'
      }}
      className="group/placeholder relative overflow-hidden"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B5CE7]" />
          <span className="text-xs font-semibold text-[#aaaaaa]">Uploading...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-3 bg-white/5 rounded-full border border-white/10 group-hover/placeholder:border-[#6B5CE7]/30 group-hover/placeholder:bg-[#6B5CE7]/10 transition-all duration-200">
            <span className="text-xl">⬆</span>
          </div>
          <div className="text-xs font-semibold text-[#e8e8e8]">
            <span className="text-[#6B5CE7] hover:underline">Import Image</span> or <span className="text-[#6B5CE7] hover:underline">Browse</span>
          </div>
          <div className="text-[10px] text-[#666666]">
            Supports PNG, JPG, JPEG, WEBP (Max 5MB)
          </div>
        </div>
      )}
    </div>
  )
}

function ImageBlock({ block }) {
  const style = useBlockStyles(block)
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const updateBlock = useStore((s) => s.updateBlock)
  const updateBlockImmediate = useStore((s) => s.updateBlockImmediate)
  const addToast = useStore((s) => s.addToast)
  
  const containerRef = useRef(null)
  const replaceFileInputRef = useRef(null)
  const isSelected = selectedBlockId === block.id

  const [resizingDimensions, setResizingDimensions] = useState(null)
  const [replacing, setReplacing] = useState(false)

  const handleMouseDown = (e, direction) => {
    e.preventDefault()
    e.stopPropagation()

    const imgElement = containerRef.current?.querySelector('img')
    if (!imgElement) return

    const startX = e.clientX
    const startY = e.clientY
    const rect = imgElement.getBoundingClientRect()
    const initialWidth = rect.width
    const initialHeight = rect.height
    const parentWidth = containerRef.current?.parentElement?.getBoundingClientRect().width || 800
    const lockRatio = block.content?.lockRatio ?? true
    const aspectRatio = initialHeight > 0 ? initialWidth / initialHeight : 4 / 3

    let currentWidth = initialWidth
    let currentHeight = initialHeight

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      let w = initialWidth
      let h = initialHeight

      // Horizontal resizing
      if (direction === 'br' || direction === 'tr' || direction === 'right') {
        w = Math.max(40, Math.min(parentWidth, initialWidth + deltaX))
      } else if (direction === 'bl' || direction === 'tl' || direction === 'left') {
        w = Math.max(40, Math.min(parentWidth, initialWidth - deltaX))
      }

      // Vertical resizing
      if (direction === 'br' || direction === 'bl' || direction === 'bottom') {
        h = Math.max(40, initialHeight + deltaY)
      } else if (direction === 'tr' || direction === 'tl' || direction === 'top') {
        h = Math.max(40, initialHeight - deltaY)
      }

      // Aspect ratio lock constraints
      if (lockRatio) {
        if (direction === 'right' || direction === 'left' || direction === 'br' || direction === 'bl') {
          h = Math.round(w / aspectRatio)
        } else if (direction === 'top' || direction === 'bottom' || direction === 'tr' || direction === 'tl') {
          w = Math.round(h * aspectRatio)
        }
      }

      currentWidth = w
      currentHeight = h

      const dims = {
        width: Math.round(currentWidth),
        height: Math.round(currentHeight),
      }
      setResizingDimensions(dims)
      updateBlockImmediate(block.id, { content: dims })
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      setResizingDimensions(null)
      updateBlock(block.id, {
        content: {
          width: Math.round(currentWidth),
          height: Math.round(currentHeight),
        }
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    const isLocked = !!block.content?.locked
    if (!isLocked) {
      replaceFileInputRef.current?.click()
    }
  }

  const handleReplaceFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      addToast('Invalid format. Only PNG, JPG, JPEG, and WEBP allowed.', 'error')
      return
    }
    setReplacing(true)
    try {
      const asset = await uploadAsset(file)
      updateBlock(block.id, {
        content: {
          imageUrl: asset.url || asset.data,
          status: 'loaded'
        }
      })
      addToast('Image replaced successfully!', 'success')
    } catch (err) {
      addToast(err.message || 'Replacement failed', 'error')
    } finally {
      setReplacing(false)
    }
  }

  const imageUrl = block.content?.imageUrl
  const status = block.content?.status || (imageUrl ? 'loaded' : 'empty')

  const widthVal = block.content?.width
  const wrapperStyle = {
    position: 'relative',
    display: 'block',
    width: widthVal ? `${widthVal}px` : '100%',
    maxWidth: '100%',
    margin: '0 auto',
  }

  if (status === 'empty' || !imageUrl) {
    return (
      <ImagePlaceholder
        onUploadStart={() => {}}
        onUploadSuccess={(url) => {
          updateBlock(block.id, { content: { imageUrl: url, status: 'loaded' } })
          addToast('Image uploaded successfully!', 'success')
        }}
        onUploadError={(msg) => addToast(msg, 'error')}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      style={wrapperStyle}
      onDoubleClick={handleDoubleClick}
      className="group/image-wrapper relative animate-fade-in"
      title="Double click image to replace source"
    >
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleReplaceFileChange}
        className="hidden"
      />
      {replacing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg z-30 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-white" />
          <span className="text-xs text-white font-medium">Replacing...</span>
        </div>
      )}
      <ImageContent content={block.content} style={style} />
      
      {isSelected && (
        <>
          {/* Corner Resizing Handles */}
          {/* Top-Left */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'tl')}
            className="image-resize-handle-square cursor-nwse-resize"
            style={{ top: 0, left: 0, transform: 'translate(-50%, -50%)' }}
            title="Resize Image"
          />
          {/* Top-Right */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'tr')}
            className="image-resize-handle-square cursor-nesw-resize"
            style={{ top: 0, right: 0, transform: 'translate(50%, -50%)' }}
            title="Resize Image"
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'bl')}
            className="image-resize-handle-square cursor-nesw-resize"
            style={{ bottom: 0, left: 0, transform: 'translate(-50%, 50%)' }}
            title="Resize Image"
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'br')}
            className="image-resize-handle-square cursor-nwse-resize"
            style={{ bottom: 0, right: 0, transform: 'translate(50%, 50%)' }}
            title="Resize Image"
          />

          {/* Side Resizing Handles */}
          {/* Left */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'left')}
            className="image-resize-handle-square cursor-ew-resize"
            style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)' }}
            title="Resize Width"
          />
          {/* Right */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'right')}
            className="image-resize-handle-square cursor-ew-resize"
            style={{ top: '50%', right: 0, transform: 'translate(50%, -50%)' }}
            title="Resize Width"
          />
          {/* Top */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'top')}
            className="image-resize-handle-square cursor-ns-resize"
            style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
            title="Resize Height"
          />
          {/* Bottom */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'bottom')}
            className="image-resize-handle-square cursor-ns-resize"
            style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }}
            title="Resize Height"
          />
          
          {/* Resizing Tooltip */}
          {resizingDimensions && (
            <div className="resize-tooltip-badge">
              {resizingDimensions.width} × {resizingDimensions.height} px
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default memo(ImageBlock)
