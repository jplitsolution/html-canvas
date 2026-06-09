export const PREBUILT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty canvas',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop',
    layout: [],
  },
  {
    id: 'saas-landing',
    name: 'SaaS Landing',
    description: 'Modern SaaS product landing page with hero, features, and CTA',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
    layout: [
      {
        id: 'saas-nav',
        type: 'navbar',
        parentId: null,
        content: {
          logoText: 'CloudFlow',
          buttonText: 'Start Free Trial',
          buttonLink: '#signup',
          links: [
            { label: 'Features', url: '#features' },
            { label: 'Pricing', url: '#pricing' },
            { label: 'Docs', url: '#docs' },
          ],
        },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-hero',
        type: 'hero',
        parentId: null,
        content: {
          title: 'Ship Faster with CloudFlow',
          subtitle: 'The all-in-one platform for modern teams to build, deploy, and scale applications.',
          buttonText: 'Get Started Free',
          buttonLink: '#signup',
          imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
        },
        styles: {
          color: '#ffffff', backgroundColor: '#2563eb', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 80, paddingBottom: 80, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-header',
        type: 'header',
        parentId: null,
        content: { title: 'Why Choose CloudFlow?', subtitle: 'Everything you need to succeed' },
        styles: {
          color: '#1e293b', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 48, paddingBottom: 24, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-container',
        type: 'container',
        parentId: null,
        content: { columns: 3 },
        styles: {
          color: '#1e293b', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 16, paddingBottom: 48, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
        children: ['saas-card-1', 'saas-card-2', 'saas-card-3'],
      },
      {
        id: 'saas-card-1',
        type: 'card',
        parentId: 'saas-container',
        content: {
          title: 'Lightning Fast',
          bodyText: 'Deploy in seconds with our optimized infrastructure.',
          imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop',
        },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24,
          marginTop: 0, marginBottom: 0, borderRadius: 12, borderWidth: 1, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-card-2',
        type: 'card',
        parentId: 'saas-container',
        content: {
          title: 'Secure by Default',
          bodyText: 'Enterprise-grade security built into every layer.',
          imageUrl: 'https://images.unsplash.com/photo-1563986768608-18e3dcd3451c?w=400&h=250&fit=crop',
        },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24,
          marginTop: 0, marginBottom: 0, borderRadius: 12, borderWidth: 1, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-card-3',
        type: 'card',
        parentId: 'saas-container',
        content: {
          title: 'Scale Infinitely',
          bodyText: 'Grow from startup to enterprise without changing tools.',
          imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop',
        },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24,
          marginTop: 0, marginBottom: 0, borderRadius: 12, borderWidth: 1, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-cta',
        type: 'button',
        parentId: null,
        content: { buttonText: 'Start Your Free Trial', buttonLinks: [{ url: '#signup' }] },
        styles: {
          color: '#ffffff', backgroundColor: '#7c3aed', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 8, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'saas-footer',
        type: 'footer',
        parentId: null,
        content: {
          footerText: '© 2026 CloudFlow Inc. All rights reserved.',
          links: [
            { label: 'Privacy Policy', url: '#' },
            { label: 'Terms of Service', url: '#' },
            { label: 'Contact', url: '#' },
          ],
        },
        styles: {
          color: '#94a3b8', backgroundColor: '#0f172a', fontSize: '14px', fontWeight: '400',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
    ],
  },
  {
    id: 'minimal-portfolio',
    name: 'Minimal Portfolio',
    description: 'Clean personal portfolio with about section and contact form',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1e37b8?w=400&h=250&fit=crop',
    layout: [
      {
        id: 'port-header',
        type: 'header',
        parentId: null,
        content: { title: 'Alex Morgan', subtitle: 'Product Designer & Developer' },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 64, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'port-hero',
        type: 'hero',
        parentId: null,
        content: {
          title: 'Crafting Digital Experiences',
          subtitle: 'I design and build beautiful, functional products for the web.',
          buttonText: 'View My Work',
          buttonLink: '#work',
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
        },
        styles: {
          color: '#1e293b', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'port-text',
        type: 'text',
        parentId: null,
        content: {
          text: 'With over 8 years of experience in product design and front-end development, I help startups and established companies create intuitive digital products that users love.',
        },
        styles: {
          color: '#475569', backgroundColor: '#ffffff', fontSize: '18px', fontWeight: '400',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 48, paddingRight: 48,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'port-divider',
        type: 'divider',
        parentId: null,
        content: { style: 'solid' },
        styles: {
          color: '#e2e8f0', backgroundColor: 'transparent', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 16, paddingBottom: 16, paddingLeft: 48, paddingRight: 48,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 1, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'port-form',
        type: 'form',
        parentId: null,
        content: {
          title: "Let's Work Together",
          buttonText: 'Send Message',
          fields: [
            { label: 'Name', type: 'text' },
            { label: 'Email', type: 'email' },
            { label: 'Message', type: 'textarea' },
          ],
        },
        styles: {
          color: '#1e293b', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'port-footer',
        type: 'footer',
        parentId: null,
        content: {
          footerText: '© 2026 Alex Morgan. Built with TemplateCraft.',
          links: [
            { label: 'LinkedIn', url: '#' },
            { label: 'GitHub', url: '#' },
            { label: 'Dribbble', url: '#' },
          ],
        },
        styles: {
          color: '#64748b', backgroundColor: '#ffffff', fontSize: '14px', fontWeight: '400',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Product launch page with countdown feel and feature highlights',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=250&fit=crop',
    layout: [
      {
        id: 'launch-nav',
        type: 'navbar',
        parentId: null,
        content: {
          logoText: 'NovaWatch',
          buttonText: 'Pre-Order',
          buttonLink: '#order',
          links: [
            { label: 'Features', url: '#features' },
            { label: 'Specs', url: '#specs' },
          ],
        },
        styles: {
          color: '#ffffff', backgroundColor: '#0f172a', fontSize: '16px', fontWeight: '400',
          textAlign: 'left', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'launch-hero',
        type: 'hero',
        parentId: null,
        content: {
          title: 'The Future on Your Wrist',
          subtitle: 'Introducing NovaWatch — reimagining what a smartwatch can be.',
          buttonText: 'Pre-Order Now — $299',
          buttonLink: '#order',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=400&fit=crop',
        },
        styles: {
          color: '#ffffff', backgroundColor: '#0f172a', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 64, paddingBottom: 64, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'launch-image',
        type: 'image',
        parentId: null,
        content: {
          imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=500&fit=crop',
          altText: 'NovaWatch product shot',
          caption: 'Sleek design. Powerful performance.',
        },
        styles: {
          color: '#1e293b', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'launch-text',
        type: 'text',
        parentId: null,
        content: {
          text: 'NovaWatch combines cutting-edge health monitoring, seamless connectivity, and a stunning AMOLED display in a package that weighs just 38 grams. Available in Midnight Black, Arctic Silver, and Rose Gold.',
        },
        styles: {
          color: '#475569', backgroundColor: '#ffffff', fontSize: '17px', fontWeight: '400',
          textAlign: 'center', paddingTop: 24, paddingBottom: 24, paddingLeft: 48, paddingRight: 48,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'launch-cta',
        type: 'button',
        parentId: null,
        content: { buttonText: 'Reserve Yours Today', buttonLinks: [{ url: '#order' }] },
        styles: {
          color: '#ffffff', backgroundColor: '#dc2626', fontSize: '16px', fontWeight: '600',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 8, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
      {
        id: 'launch-footer',
        type: 'footer',
        parentId: null,
        content: {
          footerText: '© 2026 NovaWatch. All rights reserved.',
          links: [
            { label: 'Support', url: '#' },
            { label: 'Warranty', url: '#' },
          ],
        },
        styles: {
          color: '#94a3b8', backgroundColor: '#0f172a', fontSize: '14px', fontWeight: '400',
          textAlign: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32,
          marginTop: 0, marginBottom: 0, borderRadius: 0, borderWidth: 0, borderStyle: 'solid',
          borderColor: '#e2e8f0', width: '100%', height: 'auto',
        },
      },
    ],
  },
]

export function getTemplateById(id) {
  return PREBUILT_TEMPLATES.find((t) => t.id === id) || PREBUILT_TEMPLATES[0]
}

export function cloneLayout(layout) {
  return layout.map((block) => ({
    ...block,
    content: { ...block.content },
    styles: { ...block.styles },
    children: block.children ? [...block.children] : undefined,
  }))
}
