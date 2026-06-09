import { lazy } from 'react'
import {
  Navigation, PanelTop, Sparkles, Type, MousePointerClick,
  FormInput, Image, CreditCard, Grid3x3, Minus, Link,
} from 'lucide-react'
import { registerBlock } from './index'
import { DEFAULT_STYLES, DEFAULT_CONTENT } from '../constants/blocks'
import { blockHtmlGenerators } from '../blocks/shared/blockHtml'

const STYLE_FIELDS = [
  { key: 'color', label: 'Text Color', type: 'color', scope: 'styles' },
  { key: 'backgroundColor', label: 'Background', type: 'color', scope: 'styles' },
  { key: 'backgroundImage', label: 'Background Image', type: 'image', scope: 'styles' },
  { key: 'fontSize', label: 'Font Size', type: 'text', scope: 'styles' },
  { key: 'paddingTop', label: 'Padding Top', type: 'slider', scope: 'styles', min: 0, max: 120 },
  { key: 'paddingBottom', label: 'Padding Bottom', type: 'slider', scope: 'styles', min: 0, max: 120 },
]

export function registerAllBlocks() {
  registerBlock({
    type: 'navbar', icon: Navigation, category: 'Navigation', label: 'Navbar Menu',
    description: 'Top navigation bar with logo and links',
    component: lazy(() => import('../blocks/NavbarBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.navbar,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'logoText', label: 'Logo Text', type: 'text', scope: 'content' },
      { key: 'buttonText', label: 'Button Text', type: 'text', scope: 'content' },
      { key: 'buttonLink', label: 'Button Link', type: 'text', scope: 'content' },
      { key: 'links', label: 'Links', type: 'links', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.navbar,
  })

  registerBlock({
    type: 'header', icon: PanelTop, category: 'Navigation', label: 'Title Header',
    description: 'Centered page title and subtitle',
    component: lazy(() => import('../blocks/HeaderBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.header,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'title', label: 'Title', type: 'text', scope: 'content' },
      { key: 'subtitle', label: 'Subtitle', type: 'text', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.header,
  })

  registerBlock({
    type: 'hero', icon: Sparkles, category: 'Hero Sections', label: 'Hero Banner',
    description: 'Full-width hero with CTA button',
    component: lazy(() => import('../blocks/HeroBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.hero,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'title', label: 'Title', type: 'text', scope: 'content' },
      { key: 'subtitle', label: 'Subtitle', type: 'text', scope: 'content' },
      { key: 'buttonText', label: 'Button Text', type: 'text', scope: 'content' },
      { key: 'buttonLink', label: 'Button Link', type: 'text', scope: 'content' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.hero,
  })

  registerBlock({
    type: 'text', icon: Type, category: 'Typography', label: 'Paragraph Text',
    description: 'Rich paragraph text block',
    component: lazy(() => import('../blocks/TextBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.text,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'text', label: 'Paragraph Text', type: 'textarea', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.text,
  })

  registerBlock({
    type: 'button', icon: MousePointerClick, category: 'Actions', label: 'Call-to-Action',
    description: 'Standalone CTA button',
    component: lazy(() => import('../blocks/ButtonBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.button,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'buttonText', label: 'Button Text', type: 'text', scope: 'content' },
      { key: 'buttonLinks', label: 'Button URLs', type: 'urls', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.button,
  })

  registerBlock({
    type: 'form', icon: FormInput, category: 'Actions', label: 'Lead Form',
    description: 'Contact or lead capture form',
    component: lazy(() => import('../blocks/FormBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.form,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'title', label: 'Title', type: 'text', scope: 'content' },
      { key: 'buttonText', label: 'Button Text', type: 'text', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.form,
  })

  registerBlock({
    type: 'image', icon: Image, category: 'Media', label: 'Image Section',
    description: 'Image with caption support',
    component: lazy(() => import('../blocks/ImageBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.image,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'imageUrl', label: 'Image URL', type: 'text', scope: 'content' },
      { key: 'altText', label: 'Alt Text', type: 'text', scope: 'content' },
      { key: 'caption', label: 'Caption', type: 'text', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.image,
  })

  registerBlock({
    type: 'card', icon: CreditCard, category: 'Components', label: 'Feature Card',
    description: 'Card with image, title and body',
    component: lazy(() => import('../blocks/CardBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.card,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'title', label: 'Title', type: 'text', scope: 'content' },
      { key: 'bodyText', label: 'Body Text', type: 'textarea', scope: 'content' },
      { key: 'imageUrl', label: 'Image URL', type: 'text', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.card,
  })

  registerBlock({
    type: 'container', icon: Grid3x3, category: 'Layout', label: 'Grid Container',
    description: 'Grid layout for nested blocks',
    component: lazy(() => import('../blocks/ContainerBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.container,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'columns', label: 'Columns', type: 'number', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: null,
  })

  registerBlock({
    type: 'divider', icon: Minus, category: 'Layout', label: 'Spacer Line',
    description: 'Horizontal divider line',
    component: lazy(() => import('../blocks/DividerBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.divider,
    defaultStyles: { ...DEFAULT_STYLES, borderWidth: 1 },
    propertyPanel: STYLE_FIELDS,
    generateHTML: blockHtmlGenerators.divider,
  })

  registerBlock({
    type: 'footer', icon: Link, category: 'Footer', label: 'Footer Links',
    description: 'Footer with text and links',
    component: lazy(() => import('../blocks/FooterBlock.jsx')),
    defaultContent: DEFAULT_CONTENT.footer,
    defaultStyles: DEFAULT_STYLES,
    propertyPanel: [
      { key: 'footerText', label: 'Footer Text', type: 'text', scope: 'content' },
      { key: 'links', label: 'Links', type: 'links', scope: 'content' },
      ...STYLE_FIELDS,
    ],
    generateHTML: blockHtmlGenerators.footer,
  })
}
