export const COMPONENT_GROUPS = [
  {
    id: 'NAVIGATION',
    title: 'NAVIGATION',
    items: [
      {
        id: 'navbar-section',
        title: 'Navbar Section',
        description: 'Floating glass panel menu with logo, links and CTA action',
        icon: 'ti-layout-navbar',
        defaultProps: {
          logoText: 'SPECTRA',
          btnText: 'Launch App',
          btnLink: '#launch',
          links: [
            { id: '1', text: 'Features', link: '#features' },
            { id: '2', text: 'Pricing', link: '#pricing' },
            { id: '3', text: 'Showcase', link: '#showcase' }
          ],
          textColor: '#e8e8e8',
          bgColor: '#181818',
          bgImage: '',
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
          marginTop: 16,
          marginBottom: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#252525',
          logoImageWidth: 24,
          logoImageHeight: 24,
          logoImageFit: 'contain',
          logoImagePosition: 'center'
        }
      }
    ]
  },
  {
    id: 'HERO_SECTIONS',
    title: 'HERO SECTIONS',
    items: [
      {
        id: 'header-section',
        title: 'Header Section',
        description: 'Neutral chip header with 42px titles, subtitle and button pairs',
        icon: 'ti-layout-board-split',
        defaultProps: {
          chipText: 'PREMIUM RELEASE',
          title: 'We design things that feel futuristic and alive.',
          subtitle: 'Interactive page builders tailored for modern editorial websites, featuring responsive design systems.',
          primaryBtnText: 'Start Building',
          primaryBtnLink: '#start',
          secondaryBtnText: 'View Docs',
          secondaryBtnLink: '#docs',
          textColor: '#e8e8e8',
          bgColor: '#181818',
          bgImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
          paddingTop: 64,
          paddingBottom: 64,
          paddingLeft: 32,
          paddingRight: 32,
          marginTop: 0,
          marginBottom: 0,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#252525',
          heroImageWidth: 500,
          heroImageHeight: 300,
          heroImageFit: 'cover',
          heroImagePosition: 'center',
          lockRatio: true
        }
      }
    ]
  },
  {
    id: 'TYPOGRAPHY',
    title: 'TYPOGRAPHY',
    items: [
      {
        id: 'typography-block',
        title: 'Editorial Heading',
        description: 'Bold typeface heading for structured typography',
        icon: 'ti-typography',
        defaultProps: {
          title: 'Premium Typography',
          subtitle: 'Clean subtitle details below the heading text block',
          textColor: '#e8e8e8',
          bgColor: '#111111',
          paddingTop: 24,
          paddingBottom: 24,
          marginTop: 0,
          marginBottom: 0
        }
      }
    ]
  },
  {
    id: 'ACTIONS',
    title: 'ACTIONS',
    items: [
      {
        id: 'actions-block',
        title: 'CTA Buttons',
        description: 'Centered button group for main and secondary interactions',
        icon: 'ti-click',
        defaultProps: {
          btnText: 'Primary Action',
          secondaryBtnText: 'Learn More',
          textColor: '#e8e8e8',
          bgColor: '#111111',
          paddingTop: 16,
          paddingBottom: 16,
          borderRadius: 8
        }
      }
    ]
  },
  {
    id: 'MEDIA',
    title: 'MEDIA',
    items: [
      {
        id: 'media-block',
        title: 'Single Image',
        description: 'Custom scaled image element with position alignment control',
        icon: 'ti-photo',
        defaultProps: {
          imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80',
          imageWidth: 600,
          imageHeight: 350,
          imageFit: 'cover',
          imagePosition: 'center',
          lockRatio: false,
          bgColor: '#181818',
          paddingTop: 16,
          paddingBottom: 16,
          borderRadius: 12
        }
      }
    ]
  },
  {
    id: 'COMPONENTS',
    title: 'COMPONENTS',
    items: [
      {
        id: 'bento-card',
        title: 'Bento Card Item',
        description: 'Editorial grid item with title, copy and modern accents',
        icon: 'ti-subgrid',
        defaultProps: {
          title: 'Bento Cell',
          subtitle: 'Bento grids represent the ultimate visual showcase pattern.',
          textColor: '#e8e8e8',
          bgColor: '#1e1e1e',
          borderRadius: 12,
          paddingTop: 32,
          paddingBottom: 32,
          borderWidth: 1
        }
      }
    ]
  },
  {
    id: 'LAYOUT',
    title: 'LAYOUT',
    items: [
      {
        id: 'layout-columns',
        title: 'Two Column Flex',
        description: 'Two columns wrapper for custom side-by-side elements',
        icon: 'ti-columns',
        defaultProps: {
          leftColText: 'Left Column Content block',
          rightColText: 'Right Column Content block',
          bgColor: '#181818',
          textColor: '#e8e8e8',
          borderRadius: 12,
          paddingTop: 24,
          paddingBottom: 24
        }
      }
    ]
  },
  {
    id: 'FOOTER',
    title: 'FOOTER',
    items: [
      {
        id: 'footer-block',
        title: 'Clean Footer',
        description: 'Refined editorial page footer with metadata',
        icon: 'ti-layout-bottombar',
        defaultProps: {
          footerText: '© 2026 Spectra Inc. All rights reserved.',
          bgColor: '#111111',
          textColor: '#666666',
          paddingTop: 24,
          paddingBottom: 24
        }
      }
    ]
  }
];
