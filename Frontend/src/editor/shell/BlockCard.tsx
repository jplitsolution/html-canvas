import { thumbnails, type ThumbnailKey } from '../blocks/thumbnails'

interface BlockCardProps {
  label: string
  thumb: ThumbnailKey
  onClick: () => void
}

export function BlockCard({ label, thumb, onClick }: BlockCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 p-2 rounded-lg border border-border bg-bg-elevated hover:border-accent hover:shadow-sm transition-all text-left w-full"
    >
      <div
        className="aspect-[5/3] rounded-md bg-bg-subtle border border-border overflow-hidden flex items-center justify-center p-2 group-hover:border-accent/30"
        dangerouslySetInnerHTML={{ __html: thumbnails[thumb] }}
      />
      <span className="text-xs font-medium text-fg truncate px-0.5">{label}</span>
    </button>
  )
}

interface TemplateCardProps {
  name: string
  description: string
  thumb: ThumbnailKey
  previewImage?: string
  onApply: () => void
}

export function TemplateCard({ name, description, thumb, previewImage, onApply }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="group flex flex-col gap-2 p-2 rounded-xl border border-border bg-bg-elevated hover:border-accent hover:shadow-md transition-all text-left w-full"
    >
      <div className="aspect-video rounded-lg bg-bg-subtle border border-border overflow-hidden group-hover:border-accent/30">
        {previewImage ? (
          <img src={previewImage} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-3"
            dangerouslySetInnerHTML={{ __html: thumbnails[thumb] }}
          />
        )}
      </div>
      <div className="px-0.5">
        <div className="text-sm font-semibold text-fg">{name}</div>
        <div className="text-xs text-fg-muted line-clamp-2 mt-0.5">{description}</div>
      </div>
    </button>
  )
}
