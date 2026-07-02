/**
 * Design token reference — runtime values live in index.css as CSS custom properties.
 * Components should use Tailwind semantic classes (bg-bg-base, text-fg, text-accent, etc.)
 * rather than importing colors from this file.
 */
export const theme = {
  fonts: {
    sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
    display: "'Outfit', ui-sans-serif, system-ui, sans-serif",
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
  zIndex: {
    dropdown: 10,
    sticky: 20,
    modal: 50,
    toast: 100,
    tooltip: 110,
  },
  motion: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

export default theme
