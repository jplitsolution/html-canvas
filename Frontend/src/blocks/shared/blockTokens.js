export const blockTokens = {
  primary: '#6B5CE7',
  primaryHover: '#5b4cd4',
  text: '#e8e8e8',
  textMuted: '#aaaaaa',
  border: '#252525',
  surface: '#181818',
  radius: { sm: '8px', md: '12px', lg: '14px' },
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

const DEVICE_FONT_SIZES = {
  desktop: blockTokens.fontSize,
  tablet: {
    sm: '0.875rem',
    base: '1rem',
    lg: '1.0625rem',
    xl: '1.125rem',
    '2xl': '1.375rem',
    '3xl': '2rem',
    '4xl': '2.25rem',
  },
  mobile: {
    sm: '0.8125rem',
    base: '0.9375rem',
    lg: '1rem',
    xl: '1.0625rem',
    '2xl': '1.25rem',
    '3xl': '1.75rem',
    '4xl': '2rem',
  },
}

export function getDeviceFontSizes(device = 'desktop') {
  return DEVICE_FONT_SIZES[device] || DEVICE_FONT_SIZES.desktop
}

export function isCompactDevice(device) {
  return device === 'mobile' || device === 'tablet'
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
  background: '#111111',
  color: '#e8e8e8',
  border: `1px solid ${blockTokens.border}`,
  borderRadius: blockTokens.radius.sm,
  boxSizing: 'border-box',
}
