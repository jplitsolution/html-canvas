import { memo, useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { blockTokens, ctaButtonStyle, navCtaStyle, linkStyle, inputStyle, getDeviceFontSizes, isCompactDevice } from './blockTokens'
import { getButtonLinks, openButtonLinks } from '../../utils/buttonLinks'
import { usePreviewMode } from '../../hooks/usePreviewMode'
import EditableText from './EditableText'

export const NavLinks = memo(function NavLinks({ links = [], stacked = false }) {
  return (links || []).map((link, i) => (
    <a
      key={i}
      href={link.url}
      style={stacked
        ? { ...linkStyle, margin: 0, display: 'block', padding: '10px 0', fontSize: '1rem' }
        : linkStyle}
    >
      {link.label}
    </a>
  ))
})

export const NavBarContent = memo(function NavBarContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setMenuOpen(false) }, [device])
  const { logoText, buttonText, buttonLink, links } = content
  const fonts = getDeviceFontSizes(device)
  const isMobile = device === 'mobile'

  if (isMobile) {
    return (
      <nav style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(24, 24, 24, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
        ...style,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontWeight: 800, fontSize: fonts.xl, flexShrink: 0, color: '#ffffff', letterSpacing: '-0.025em' }}>
            <EditableText blockId={blockId} field="logoText" value={logoText} />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((open) => !open) }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingTop: 12,
            marginTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
          >
            <NavLinks links={links} stacked />
            {buttonText && (
              <a
                href={buttonLink}
                style={{
                  ...navCtaStyle,
                  background: '#6B5CE7',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '8px',
                  marginLeft: 0,
                  marginTop: 8,
                  textAlign: 'center',
                  display: 'block',
                  boxShadow: '0 4px 12px rgba(107, 92, 231, 0.2)'
                }}
              >
                <EditableText blockId={blockId} field="buttonText" value={buttonText} />
              </a>
            )}
          </div>
        )}
      </nav>
    )
  }

  const compact = isCompactDevice(device)

  return (
    <nav style={{
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: 'rgba(24, 24, 24, 0.75)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
      ...style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: compact ? 'wrap' : 'nowrap',
      gap: compact ? 8 : 0,
    }}
    >
      <div style={{ fontWeight: 800, fontSize: fonts.xl, color: '#ffffff', letterSpacing: '-0.025em' }}>
        <EditableText blockId={blockId} field="logoText" value={logoText} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : blockTokens.spacing.sm, flexWrap: 'wrap' }}>
        <NavLinks links={links} />
        {buttonText && (
          <a
            href={buttonLink}
            style={{
              ...navCtaStyle,
              background: '#6B5CE7',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '8px',
              marginLeft: compact ? 0 : '16px',
              fontSize: fonts.sm,
              padding: compact ? '6px 14px' : '8px 20px',
              boxShadow: '0 4px 12px rgba(107, 92, 231, 0.2)',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <EditableText blockId={blockId} field="buttonText" value={buttonText} />
          </a>
        )}
      </div>
    </nav>
  )
})

export const HeaderContent = memo(function HeaderContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const { title, subtitle } = content
  const customTitleSize = device === 'desktop' ? '2.5rem' : fonts['3xl']

  return (
    <header style={{ ...style, textAlign: 'center', padding: '40px 20px' }}>
      <h1 style={{ fontSize: customTitleSize, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.025em', color: '#ffffff' }}>
        <EditableText blockId={blockId} field="title" value={title} />
      </h1>
      <p style={{ fontSize: fonts.lg, color: '#aaaaaa', margin: 0, lineHeight: 1.6, maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto' }}>
        <EditableText blockId={blockId} field="subtitle" value={subtitle} isTextarea />
      </p>
    </header>
  )
})

export const HeroContent = memo(function HeroContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const isMobile = device === 'mobile'
  const { title, subtitle, buttonText, buttonLink, imageUrl } = content
  return (
    <section style={{ ...style, textAlign: 'center' }}>
      <h1 style={{
        fontSize: fonts['4xl'],
        fontWeight: 800,
        margin: isMobile ? '0 0 12px' : '0 0 16px',
        lineHeight: 1.15,
        wordBreak: 'break-word',
      }}
      >
        <EditableText blockId={blockId} field="title" value={title} />
      </h1>
      <p style={{
        fontSize: fonts.lg,
        opacity: 0.9,
        margin: isMobile ? '0 0 20px' : '0 0 32px',
        lineHeight: 1.5,
        maxWidth: isMobile ? '100%' : '640px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      >
        <EditableText blockId={blockId} field="subtitle" value={subtitle} isTextarea />
      </p>
      {buttonText && (
        <a
          href={buttonLink}
          style={{
            ...ctaButtonStyle,
            background: blockTokens.surface,
            color: blockTokens.primary,
            fontSize: fonts.base,
            padding: isMobile ? '10px 20px' : '12px 32px',
            maxWidth: '100%',
            wordBreak: 'break-word',
          }}
        >
          <EditableText blockId={blockId} field="buttonText" value={buttonText} />
        </a>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{
            maxWidth: '100%',
            width: '100%',
            height: 'auto',
            marginTop: isMobile ? '24px' : '40px',
            borderRadius: blockTokens.radius.lg,
          }}
        />
      )}
    </section>
  )
})

export const TextContent = memo(function TextContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  return (
    <div style={style}>
      <p style={{ margin: 0, lineHeight: 1.7, fontSize: fonts.base }}>
        <EditableText blockId={blockId} field="text" value={content.text} isTextarea />
      </p>
    </div>
  )
})

export const ButtonContent = memo(function ButtonContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const isMobile = device === 'mobile'
  const { buttonText } = content
  const buttonLinks = getButtonLinks(content)
  const urls = buttonLinks.map((link) => link.url)
  const primaryUrl = urls[0] || '#'

  return (
    <div style={{ ...style, textAlign: 'center' }}>
      <a
        href={primaryUrl}
        style={{ ...ctaButtonStyle, fontSize: fonts.base, padding: isMobile ? '10px 20px' : '12px 32px' }}
        onClick={(e) => openButtonLinks(urls, e)}
      >
        <EditableText blockId={blockId} field="buttonText" value={buttonText} />
      </a>
    </div>
  )
})

export const ImageContent = memo(function ImageContent({ content, style }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const { imageUrl, altText, caption, width, height, objectFit, objectPosition } = content
  return (
    <figure style={{ ...style, textAlign: 'center' }}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={altText || ''}
          style={{
            maxWidth: '100%',
            width: width ? `${width}px` : '100%',
            height: height ? `${height}px` : 'auto',
            objectFit: objectFit || 'cover',
            objectPosition: objectPosition || 'center',
            borderRadius: style?.borderRadius || blockTokens.radius.md,
            display: 'block',
            margin: '0 auto',
          }}
        />
      )}
      {caption && (
        <figcaption style={{ marginTop: blockTokens.spacing.sm, fontSize: fonts.sm, opacity: 0.7 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
})

export const CardContent = memo(function CardContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const { title, bodyText, imageUrl } = content
  return (
    <div style={{ ...style, borderRadius: '12px', padding: '24px', border: '1px solid rgba(255, 255, 255, 0.05)', background: '#1e1e1e' }}>
      {imageUrl && (
        <img src={imageUrl} alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', objectFit: 'cover' }} />
      )}
      <h3 style={{ fontSize: fonts.xl, fontWeight: 700, margin: '0 0 10px', color: '#ffffff' }}>
        <EditableText blockId={blockId} field="title" value={title} />
      </h3>
      <p style={{ margin: 0, lineHeight: 1.6, color: '#aaaaaa', fontSize: fonts.base }}>
        <EditableText blockId={blockId} field="bodyText" value={bodyText} isTextarea />
      </p>
    </div>
  )
})

export const FormContent = memo(function FormContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const { title, buttonText, fields } = content
  return (
    <form style={{ ...style, maxWidth: '480px', margin: '0 auto', width: '100%' }} onSubmit={(e) => e.preventDefault()}>
      <h2 style={{ fontSize: fonts['2xl'], fontWeight: 600, margin: '0 0 24px', textAlign: 'center' }}>
        <EditableText blockId={blockId} field="title" value={title} />
      </h2>
      {(fields || []).map((field, i) => (
        <div key={i} style={{ marginBottom: blockTokens.spacing.md }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: fonts.base }}>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea rows={4} style={inputStyle} readOnly />
          ) : (
            <input type={field.type} style={inputStyle} readOnly />
          )}
        </div>
      ))}
      <button type="button" style={{ ...ctaButtonStyle, width: '100%', border: 'none', cursor: 'pointer', fontSize: fonts.base }}>
        <EditableText blockId={blockId} field="buttonText" value={buttonText} />
      </button>
    </form>
  )
})

export const FooterContent = memo(function FooterContent({ content, style, blockId }) {
  const device = usePreviewMode()
  const fonts = getDeviceFontSizes(device)
  const isMobile = device === 'mobile'
  const { footerText, links } = content
  return (
    <footer style={{ ...style, textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px', fontSize: fonts.sm }}>
        <EditableText blockId={blockId} field="footerText" value={footerText} />
      </p>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', gap: isMobile ? 8 : 0 }}>
        <NavLinks links={links} stacked={isMobile} />
      </div>
    </footer>
  )
})

export const DividerContent = memo(function DividerContent({ style }) {
  return <hr style={{ border: 'none', borderTop: `1px solid ${blockTokens.border}`, margin: 0, ...style }} />
})
