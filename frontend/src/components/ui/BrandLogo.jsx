import { memo } from 'react'

const LOGO_HEIGHTS = {
  sm: 'h-6',
  md: 'h-7',
  lg: 'h-10',
}

const WORDMARK_SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

/**
 * Primary platform brand mark. The logo is placed on a white chip with a subtle
 * ring so it reads cleanly on both light and dark surfaces (Stripe-style).
 */
function BrandLogo({ size = 'md', showWordmark = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="inline-flex items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5">
        <img
          src="/logos/platform-logo.png"
          alt="TemplateCraft"
          className={`${LOGO_HEIGHTS[size]} w-auto object-contain`}
          draggable="false"
        />
      </span>
      {showWordmark && (
        <span className={`font-semibold text-fg tracking-tight ${WORDMARK_SIZES[size]}`}>
          TemplateCraft
        </span>
      )}
    </span>
  )
}

/**
 * Co-branding partner mark (Zain). Meant to sit at the top of a surface next to
 * the primary brand — never in a footer.
 */
export const PartnerBadge = memo(function PartnerBadge({
  label = 'In partnership with',
  className = '',
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle whitespace-nowrap">
        {label}
      </span>
      <span className="inline-flex items-center justify-center rounded-md bg-white px-1.5 py-1 shadow-sm ring-1 ring-black/5">
        <img
          src="/logos/zain-logo.png"
          alt="Zain"
          className="h-4 w-auto object-contain"
          draggable="false"
        />
      </span>
    </span>
  )
})

export default memo(BrandLogo)
