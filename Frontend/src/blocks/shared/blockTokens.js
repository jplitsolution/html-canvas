export const blockTokens = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  surface: '#ffffff',
  radius: { sm: '6px', md: '8px', lg: '12px' },
  fontSize: {
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2.5rem',
    '4xl': '3rem',
  },
  spacing: { sm: '8px', md: '16px', lg: '24px', xl: '32px' },
}

export const ctaButtonStyle = {
  display: 'inline-block',
  background: blockTokens.primary,
  color: blockTokens.surface,
  padding: '12px 32px',
  borderRadius: blockTokens.radius.md,
  textDecoration: 'none',
  fontWeight: 600,
}

export const navCtaStyle = {
  background: blockTokens.primary,
  color: blockTokens.surface,
  padding: '8px 20px',
  borderRadius: blockTokens.radius.sm,
  textDecoration: 'none',
  marginLeft: '16px',
}

export const linkStyle = {
  color: 'inherit',
  textDecoration: 'none',
  margin: '0 12px',
}

export const inputStyle = {
  width: '100%',
  padding: '10px',
  border: `1px solid ${blockTokens.border}`,
  borderRadius: blockTokens.radius.sm,
  boxSizing: 'border-box',
}
