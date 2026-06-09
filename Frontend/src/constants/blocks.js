import { getBlock } from '../registry/index'
import { normalizeStyles } from '../schemas/block.schema'

export const DEFAULT_STYLES = {
  color: '#1e293b',
  backgroundColor: 'transparent',
  backgroundImage: '',
  fontSize: '16px',
  fontWeight: '400',
  textAlign: 'left',
  paddingTop: 16,
  paddingBottom: 16,
  paddingLeft: 16,
  paddingRight: 16,
  marginTop: 0,
  marginBottom: 0,
  borderRadius: 0,
  borderWidth: 0,
  borderStyle: 'solid',
  borderColor: '#e2e8f0',
  width: '100%',
  height: 'auto',
}

export const DEFAULT_CONTENT = {
  navbar: {
    logoText: 'Brand',
    buttonText: 'Get Started',
    buttonLink: '#',
    links: [
      { label: 'Home', url: '#' },
      { label: 'About', url: '#' },
      { label: 'Contact', url: '#' },
    ],
  },
  header: {
    title: 'Page Title',
    subtitle: 'A brief subtitle for your page',
  },
  hero: {
    title: 'Welcome to Your Site',
    subtitle: 'Build something amazing with TemplateCraft',
    buttonText: 'Learn More',
    buttonLink: '#',
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
  },
  text: {
    text: 'Add your paragraph text here. Click to edit in the properties panel.',
  },
  button: {
    buttonText: 'Click Me',
    buttonLinks: [{ url: '#' }],
  },
  image: {
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop',
    altText: 'Placeholder image',
    caption: '',
  },
  card: {
    title: 'Feature Title',
    bodyText: 'Describe your feature or service here with compelling copy.',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop',
  },
  form: {
    title: 'Get in Touch',
    buttonText: 'Submit',
    fields: [
      { label: 'Name', type: 'text' },
      { label: 'Email', type: 'email' },
    ],
  },
  divider: {
    style: 'solid',
  },
  container: {
    columns: 2,
  },
  footer: {
    footerText: '© 2026 Your Company. All rights reserved.',
    links: [
      { label: 'Privacy', url: '#' },
      { label: 'Terms', url: '#' },
    ],
  },
}

export const COLOR_PRESETS = [
  '#1e293b', '#ffffff', '#2563eb', '#7c3aed', '#059669',
  '#dc2626', '#d97706', '#64748b', '#0f172a', '#f8fafc',
]

export const BLOCK_LABELS = {
  navbar: 'navbar',
  header: 'header',
  hero: 'hero',
  text: 'text',
  button: 'button',
  image: 'image',
  card: 'card',
  form: 'form',
  divider: 'divider',
  container: 'container',
  footer: 'footer',
}

export function createBlock(type, parentId = null) {
  const def = getBlock(type)
  return {
    id: crypto.randomUUID(),
    type,
    parentId,
    content: structuredClone(def?.defaultContent || DEFAULT_CONTENT[type] || {}),
    styles: normalizeStyles(def?.defaultStyles || DEFAULT_STYLES),
    children: type === 'container' ? [] : undefined,
  }
}
