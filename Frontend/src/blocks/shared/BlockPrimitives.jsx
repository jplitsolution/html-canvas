import { memo } from 'react'
import { blockTokens, ctaButtonStyle, navCtaStyle, linkStyle, inputStyle } from './blockTokens'
import { getButtonLinks, openButtonLinks } from '../../utils/buttonLinks'

export const NavLinks = memo(function NavLinks({ links = [] }) {
  return (links || []).map((link, i) => (
    <a key={i} href={link.url} style={linkStyle}>{link.label}</a>
  ))
})

export const NavBarContent = memo(function NavBarContent({ content, style }) {
  const { logoText, buttonText, buttonLink, links } = content
  return (
    <nav style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontWeight: 700, fontSize: blockTokens.fontSize.xl }}>{logoText}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: blockTokens.spacing.sm }}>
        <NavLinks links={links} />
        {buttonText && <a href={buttonLink} style={navCtaStyle}>{buttonText}</a>}
      </div>
    </nav>
  )
})

export const HeaderContent = memo(function HeaderContent({ content, style }) {
  const { title, subtitle } = content
  return (
    <header style={{ ...style, textAlign: 'center' }}>
      <h1 style={{ fontSize: blockTokens.fontSize['3xl'], fontWeight: 700, margin: '0 0 8px' }}>{title}</h1>
      <p style={{ fontSize: blockTokens.fontSize.lg, opacity: 0.8, margin: 0 }}>{subtitle}</p>
    </header>
  )
})

export const HeroContent = memo(function HeroContent({ content, style }) {
  const { title, subtitle, buttonText, buttonLink, imageUrl } = content
  return (
    <section style={{ ...style, textAlign: 'center' }}>
      <h1 style={{ fontSize: blockTokens.fontSize['4xl'], fontWeight: 800, margin: '0 0 16px' }}>{title}</h1>
      <p style={{ fontSize: blockTokens.fontSize.xl, opacity: 0.9, margin: '0 0 32px' }}>{subtitle}</p>
      {buttonText && (
        <a href={buttonLink} style={{ ...ctaButtonStyle, background: blockTokens.surface, color: blockTokens.primary }}>
          {buttonText}
        </a>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="" style={{ maxWidth: '100%', marginTop: '40px', borderRadius: blockTokens.radius.lg }} />
      )}
    </section>
  )
})

export const TextContent = memo(function TextContent({ content, style }) {
  return (
    <div style={style}>
      <p style={{ margin: 0, lineHeight: 1.7 }}>{content.text}</p>
    </div>
  )
})

export const ButtonContent = memo(function ButtonContent({ content, style }) {
  const { buttonText } = content
  const buttonLinks = getButtonLinks(content)
  const urls = buttonLinks.map((link) => link.url)
  const primaryUrl = urls[0] || '#'

  return (
    <div style={{ ...style, textAlign: 'center' }}>
      <a
        href={primaryUrl}
        style={ctaButtonStyle}
        onClick={(e) => openButtonLinks(urls, e)}
      >
        {buttonText}
      </a>
    </div>
  )
})

export const ImageContent = memo(function ImageContent({ content, style }) {
  const { imageUrl, altText, caption } = content
  return (
    <figure style={{ ...style, textAlign: 'center' }}>
      {imageUrl && (
        <img src={imageUrl} alt={altText || ''} style={{ maxWidth: '100%', borderRadius: blockTokens.radius.md }} />
      )}
      {caption && (
        <figcaption style={{ marginTop: blockTokens.spacing.sm, fontSize: blockTokens.fontSize.sm, opacity: 0.7 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  )
})

export const CardContent = memo(function CardContent({ content, style }) {
  const { title, bodyText, imageUrl } = content
  return (
    <div style={style}>
      {imageUrl && (
        <img src={imageUrl} alt="" style={{ width: '100%', borderRadius: blockTokens.radius.md, marginBottom: blockTokens.spacing.md }} />
      )}
      <h3 style={{ fontSize: blockTokens.fontSize.xl, fontWeight: 600, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.8 }}>{bodyText}</p>
    </div>
  )
})

export const FormContent = memo(function FormContent({ content, style }) {
  const { title, buttonText, fields } = content
  return (
    <form style={{ ...style, maxWidth: '480px', margin: '0 auto' }} onSubmit={(e) => e.preventDefault()}>
      <h2 style={{ fontSize: blockTokens.fontSize['2xl'], fontWeight: 600, margin: '0 0 24px', textAlign: 'center' }}>{title}</h2>
      {(fields || []).map((field, i) => (
        <div key={i} style={{ marginBottom: blockTokens.spacing.md }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea rows={4} style={inputStyle} readOnly />
          ) : (
            <input type={field.type} style={inputStyle} readOnly />
          )}
        </div>
      ))}
      <button type="button" style={{ ...ctaButtonStyle, width: '100%', border: 'none', cursor: 'pointer' }}>
        {buttonText}
      </button>
    </form>
  )
})

export const FooterContent = memo(function FooterContent({ content, style }) {
  const { footerText, links } = content
  return (
    <footer style={{ ...style, textAlign: 'center' }}>
      <p style={{ margin: '0 0 8px' }}>{footerText}</p>
      <div><NavLinks links={links} /></div>
    </footer>
  )
})

export const DividerContent = memo(function DividerContent({ style }) {
  return <hr style={{ border: 'none', borderTop: `1px solid ${blockTokens.border}`, margin: 0, ...style }} />
})
