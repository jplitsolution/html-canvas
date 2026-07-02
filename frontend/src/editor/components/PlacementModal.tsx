import { useState } from 'react';
import { Image, Layout, X } from 'lucide-react';

interface PlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (placement: 'inline' | 'background') => void;
  imageUrl: string | null;
  uploading?: boolean;
}

export function PlacementModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  imageUrl,
  uploading = false 
}: PlacementModalProps) {
  const [selected, setSelected] = useState<'inline' | 'background'>('inline');

  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-elevated rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-fg">Place your image</h3>
          <button 
            onClick={onClose} 
            className="text-fg-muted hover:text-fg transition-colors p-1 rounded-lg hover:bg-bg-subtle"
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full h-40 rounded-lg overflow-hidden mb-4 border border-border bg-bg-subtle">
          <img 
            src={imageUrl} 
            alt="Preview" 
            className="w-full h-full object-cover" 
          />
        </div>

        <p className="text-sm text-fg-muted mb-4 text-center">
          How would you like to place this image on the canvas?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setSelected('inline')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selected === 'inline' 
                ? 'border-accent bg-accent-muted shadow-sm' 
                : 'border-border hover:border-border-strong bg-bg-subtle'
            }`}
          >
            <Image className="w-8 h-8 mx-auto mb-2 text-accent" />
            <p className="text-sm font-medium text-fg">As Image</p>
            <p className="text-xs text-fg-muted mt-0.5">Inline &lt;img&gt; element</p>
          </button>

          <button
            onClick={() => setSelected('background')}
            className={`p-4 rounded-xl border-2 transition-all ${
              selected === 'background' 
                ? 'border-accent bg-accent-muted shadow-sm' 
                : 'border-border hover:border-border-strong bg-bg-subtle'
            }`}
          >
            <Layout className="w-8 h-8 mx-auto mb-2 text-accent" />
            <p className="text-sm font-medium text-fg">As Background</p>
            <p className="text-xs text-fg-muted mt-0.5">Section with overlay + text</p>
          </button>
        </div>

        <button
          onClick={() => onConfirm(selected)}
          disabled={uploading}
          className="w-full py-3 bg-accent text-accent-fg rounded-xl font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Inserting...' : 'Insert Image'}
        </button>
      </div>
    </div>
  );
}