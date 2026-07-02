import type { ThumbnailKey } from '../blocks/thumbnails'
import { PREVIEW } from './templateImages'
import {
  sharedCss,
  landingHtml,
  saasHtml,
  portfolioHtml,
  agencyHtml,
  restaurantHtml,
  blogHtml,
  ecommerceHtml,
  travelHtml,
  fitnessHtml,
} from './templateContent'

export interface StarterTemplate {
  id: string
  name: string
  description: string
  thumb: ThumbnailKey
  previewImage: string
  html: string
  css?: string
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero with dashboard image, features, testimonials & CTA',
    thumb: 'hero',
    previewImage: PREVIEW.landing,
    css: sharedCss,
    html: landingHtml,
  },
  {
    id: 'saas',
    name: 'SaaS Website',
    description: 'Product shots, feature section, pricing cards',
    thumb: 'pricing',
    previewImage: PREVIEW.saas,
    css: sharedCss,
    html: saasHtml,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Profile photo + 6-project image gallery',
    thumb: 'gallery',
    previewImage: PREVIEW.portfolio,
    css: sharedCss,
    html: portfolioHtml,
  },
  {
    id: 'agency',
    name: 'Agency Website',
    description: 'Full-bleed hero, services, team headshots',
    thumb: 'team',
    previewImage: PREVIEW.agency,
    css: sharedCss,
    html: agencyHtml,
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Food hero, dish photos with prices, reservations',
    thumb: 'hero',
    previewImage: PREVIEW.restaurant,
    css: sharedCss,
    html: restaurantHtml,
  },
  {
    id: 'blog',
    name: 'Blog',
    description: 'Featured post banner + 3 article cards with images',
    thumb: 'text',
    previewImage: PREVIEW.blog,
    css: sharedCss,
    html: blogHtml,
  },
  {
    id: 'ecommerce',
    name: 'Ecommerce Homepage',
    description: 'Promo banner, 4 product cards with photos & prices',
    thumb: 'card',
    previewImage: PREVIEW.ecommerce,
    css: sharedCss,
    html: ecommerceHtml,
  },
  {
    id: 'travel',
    name: 'Travel & Resort',
    description: 'Beach hero, room photos, booking CTA',
    thumb: 'image',
    previewImage: PREVIEW.travel,
    css: sharedCss,
    html: travelHtml,
  },
  {
    id: 'fitness',
    name: 'Fitness Gym',
    description: 'Bold gym hero, membership plans, member review',
    thumb: 'cta',
    previewImage: PREVIEW.fitness,
    css: sharedCss,
    html: fitnessHtml,
  },
]

export const DEFAULT_PAGES = [
  { id: 'home', name: 'Home' },
  { id: 'about', name: 'About' },
  { id: 'services', name: 'Services' },
  { id: 'contact', name: 'Contact' },
  { id: 'blog', name: 'Blog' },
]
