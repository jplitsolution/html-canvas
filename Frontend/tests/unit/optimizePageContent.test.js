import { describe, it, expect } from 'vitest'
import { optimizePageContent } from '../../src/editor/services/exportSite'

describe('optimizePageContent Link Rewriting', () => {
  const pages = [
    { id: 'home', name: 'Home', filename: 'index.html', html: '', css: '' },
    { id: 'about', name: 'About Us', filename: 'about-us.html', html: '', css: '' },
    { id: 'contact', name: 'Contact', filename: 'contact.html', html: '', css: '' },
    { id: 'features', name: 'Features', filename: 'features.html', html: '', css: '' }
  ]

  it('keeps same-page anchors if the section exists on the page', () => {
    const html = `
      <div>
        <a href="#contact">Contact</a>
        <a href="/features">Features</a>
        <section id="contact"></section>
        <section id="features"></section>
      </div>
    `
    const { optimizedHtml } = optimizePageContent(html, '', pages, 'index.html')
    expect(optimizedHtml).toContain('href="#contact"')
    expect(optimizedHtml).toContain('href="#features"')
  })

  it('rewrites anchor or route to page filename if section does not exist on the page but page exists in project', () => {
    const html = `
      <div>
        <a href="#contact">Contact Page</a>
        <a href="/about">About Page</a>
      </div>
    `
    const { optimizedHtml } = optimizePageContent(html, '', pages, 'index.html')
    expect(optimizedHtml).toContain('href="contact.html"')
    expect(optimizedHtml).toContain('href="about-us.html"')
  })

  it('preserves case sensitivity of IDs when querying the DOM', () => {
    const html = `
      <div>
        <a href="#Contact">Contact Us</a>
        <section id="Contact"></section>
      </div>
    `
    const { optimizedHtml } = optimizePageContent(html, '', pages, 'index.html')
    expect(optimizedHtml).toContain('href="#Contact"')
  })
})
