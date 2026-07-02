import type { ThumbnailKey } from '../blocks/thumbnails'

export interface BlockDefinition {
  id: string
  label: string
  thumb: ThumbnailKey
  keywords?: string[]
}

export const SECTION_BLOCKS: BlockDefinition[] = [
  { id: 'navbar-block', label: 'Navbar', thumb: 'navbar', keywords: ['header', 'nav', 'menu'] },
  { id: 'hero-block', label: 'Hero Section', thumb: 'hero', keywords: ['banner', 'headline'] },
  { id: 'features-block', label: 'Feature Grid', thumb: 'features', keywords: ['grid', 'features'] },
  { id: 'pricing-block', label: 'Pricing Section', thumb: 'pricing', keywords: ['plans', 'price'] },
  { id: 'testimonials-block', label: 'Testimonials', thumb: 'testimonials', keywords: ['reviews', 'quotes'] },
  { id: 'faq-block', label: 'FAQ', thumb: 'faq', keywords: ['questions', 'accordion'] },
  { id: 'cta-block', label: 'CTA Section', thumb: 'cta', keywords: ['call to action'] },
  { id: 'contact-form-block', label: 'Contact Form', thumb: 'contact', keywords: ['form', 'email'] },
  { id: 'gallery-block', label: 'Gallery', thumb: 'gallery', keywords: ['photos', 'images'] },
  { id: 'team-block', label: 'Team Section', thumb: 'team', keywords: ['people', 'staff'] },
  { id: 'logos-block', label: 'Logo Cloud', thumb: 'logos', keywords: ['brands', 'clients'] },
  { id: 'footer-block', label: 'Footer', thumb: 'footer', keywords: ['bottom'] },
]

export const COMPONENT_BLOCKS: BlockDefinition[] = [
  { id: 'text-block', label: 'Text', thumb: 'text', keywords: ['paragraph', 'heading'] },
  { id: 'button-block', label: 'Button', thumb: 'button', keywords: ['link', 'cta'] },
  { id: 'image-block', label: 'Image', thumb: 'image', keywords: ['photo', 'picture'] },
  { id: 'card-block', label: 'Card', thumb: 'card', keywords: ['box', 'container'] },
  { id: 'divider-block', label: 'Divider', thumb: 'divider', keywords: ['line', 'separator'] },
]

export const ALL_BLOCKS = [...SECTION_BLOCKS, ...COMPONENT_BLOCKS]

export function filterBlocks(query: string, blocks: BlockDefinition[]) {
  const q = query.trim().toLowerCase()
  if (!q) return blocks
  return blocks.filter(
    (b) =>
      b.label.toLowerCase().includes(q) ||
      b.keywords?.some((k) => k.includes(q))
  )
}
