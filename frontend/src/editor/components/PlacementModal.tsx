import { useState, useEffect } from 'react'
import { Image, Layout, X, Type } from 'lucide-react'

interface PlacementModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (placement: 'inline' | 'background', overlayText?: string) => void
  imageUrl: string | null
  uploading?: boolean
}

export function PlacementModal({
  isOpen,
  onClose,
  onConfirm,
  imageUrl,
  uploading = false,
}: PlacementModalProps) {
  const [selected, setSelected] = useState<'inline' | 'background'>('inline')
  const [overlayText, setOverlayText] = useState('Your headline here')

  useEffect(() => {
    if (isOpen) {
      setSelected('inline')
      setOverlayText('Your headline here')
    }
  }, [isOpen, imageUrl])

  if (!isOpen || !imageUrl) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay animate-fade-in">
      <div className="bg-bg-elevated rounded-xl border border-border max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-fg">Add this image</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors p-1 rounded-md hover:bg-bg-subtle"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full h-36 rounded-lg overflow-hidden mb-4 border border-border bg-bg-subtle">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>

        <p className="text-sm text-fg-muted mb-4">
          Choose how you want this image to appear on your page.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setSelected('inline')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selected === 'inline'
                ? 'border-accent bg-accent-muted'
                : 'border-border hover:border-border-strong bg-bg-subtle'
            }`}
          >
            <Image className="w-6 h-6 mb-2 text-accent" />
            <p className="text-sm font-medium text-fg">Regular image</p>
            <p className="text-xs text-fg-muted mt-0.5">Shows as a normal photo on the page</p>
          </button>

          <button
            type="button"
            onClick={() => setSelected('background')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selected === 'background'
                ? 'border-accent bg-accent-muted'
                : 'border-border hover:border-border-strong bg-bg-subtle'
            }`}
          >
            <Layout className="w-6 h-6 mb-2 text-accent" />
            <p className="text-sm font-medium text-fg">Banner with text</p>
            <p className="text-xs text-fg-muted mt-0.5">Full-width background with headline</p>
          </button>
        </div>

        {selected === 'background' && (
          <div className="mb-4 space-y-1.5 animate-fade-in">
            <label className="text-xs font-medium text-fg-muted flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Headline text on image
            </label>
            <input
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Enter your headline..."
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-bg-subtle text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            onConfirm(selected, selected === 'background' ? overlayText : undefined)
          }
          disabled={uploading || (selected === 'background' && !overlayText.trim())}
          className="w-full py-2.5 bg-accent text-accent-fg rounded-md font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Adding...' : 'Add to page'}
        </button>
      </div>
    </div>
  )
}

export default PlacementModal
