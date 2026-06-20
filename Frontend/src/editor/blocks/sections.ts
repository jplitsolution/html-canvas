import type { Editor } from 'grapesjs'
import { thumbnails } from './thumbnails'

function addSection(editor: Editor, id: string, label: string, thumb: keyof typeof thumbnails, content: string) {
  editor.BlockManager.add(id, {
    label,
    category: 'Sections',
    media: thumbnails[thumb],
    content,
    select: true,
    activate: true,
    attributes: {
      class: 'tc-cat-section',
      'data-block-id': id,
      title: `Drag ${label} to canvas`,
    },
  })
}

export function registerSectionBlocks(editor: Editor) {
  addSection(editor, 'navbar-block', 'Navbar', 'navbar', `
    <header data-tc-type="section" style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#ffffff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif;">
      <div data-gjs-type="text" style="font-size:20px;font-weight:700;color:#0f172a;">Brand</div>
      <nav style="display:flex;align-items:center;gap:24px;">
        <a href="#features" style="color:#475569;text-decoration:none;font-size:15px;">Features</a>
        <a href="#pricing" style="color:#475569;text-decoration:none;font-size:15px;">Pricing</a>
        <a href="#contact" style="color:#475569;text-decoration:none;font-size:15px;">Contact</a>
        <a data-tc-type="button" href="#signup" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Get Started</a>
      </nav>
    </header>
  `)

  addSection(editor, 'hero-block', 'Hero Section', 'hero', `
    <section data-tc-type="section" style="padding:80px 32px;text-align:center;background:linear-gradient(135deg,#eef2ff 0%,#ffffff 100%);font-family:Inter,sans-serif;">
      <h1 data-gjs-type="text" style="font-size:48px;font-weight:700;color:#0f172a;margin:0 0 16px;line-height:1.1;">Build beautiful websites faster</h1>
      <p data-gjs-type="text" style="font-size:18px;color:#64748b;max-width:560px;margin:0 auto 32px;line-height:1.6;">Create stunning landing pages with drag and drop. No code required.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <a data-tc-type="button" href="#signup" style="background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Start Free Trial</a>
        <a data-tc-type="button" href="#demo" style="background:#fff;color:#4f46e5;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;border:1px solid #4f46e5;">Watch Demo</a>
      </div>
    </section>
  `)

  addSection(editor, 'features-block', 'Feature Grid', 'features', `
    <section data-tc-type="section" id="features" style="padding:64px 32px;background:#ffffff;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:36px;font-weight:700;color:#0f172a;margin:0 0 48px;">Features</h2>
      <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:960px;margin:0 auto;">
        <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:28px;margin-bottom:12px;">⚡</div>
          <h3 data-gjs-type="text" style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Lightning Fast</h3>
          <p data-gjs-type="text" style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Optimized for speed and performance.</p>
        </div>
        <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:28px;margin-bottom:12px;">🎨</div>
          <h3 data-gjs-type="text" style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Beautiful Design</h3>
          <p data-gjs-type="text" style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Professional components ready to use.</p>
        </div>
        <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:28px;margin-bottom:12px;">📱</div>
          <h3 data-gjs-type="text" style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Responsive</h3>
          <p data-gjs-type="text" style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Looks great on every device.</p>
        </div>
      </div>
    </section>
  `)

  addSection(editor, 'pricing-block', 'Pricing Section', 'pricing', `
    <section data-tc-type="section" id="pricing" style="padding:64px 32px;background:#f8fafc;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:36px;font-weight:700;color:#0f172a;margin:0 0 48px;">Simple Pricing</h2>
      <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:960px;margin:0 auto;justify-content:center;">
        <div style="flex:1;min-width:260px;max-width:300px;padding:32px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
          <h3 data-gjs-type="text" style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Starter</h3>
          <div data-gjs-type="text" style="font-size:36px;font-weight:700;color:#0f172a;margin-bottom:16px;">$9/mo</div>
          <a data-tc-type="button" href="#" style="display:block;text-align:center;background:#f1f5f9;color:#0f172a;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">Choose Plan</a>
        </div>
        <div style="flex:1;min-width:260px;max-width:300px;padding:32px;background:#4f46e5;border-radius:12px;color:#fff;">
          <h3 data-gjs-type="text" style="font-size:18px;font-weight:600;margin:0 0 8px;">Pro</h3>
          <div data-gjs-type="text" style="font-size:36px;font-weight:700;margin-bottom:16px;">$29/mo</div>
          <a data-tc-type="button" href="#" style="display:block;text-align:center;background:#fff;color:#4f46e5;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">Choose Plan</a>
        </div>
      </div>
    </section>
  `)

  addSection(editor, 'testimonials-block', 'Testimonials', 'testimonials', `
    <section data-tc-type="section" style="padding:64px 32px;background:#ffffff;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:36px;font-weight:700;color:#0f172a;margin:0 0 48px;">What customers say</h2>
      <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:960px;margin:0 auto;">
        <div style="flex:1;min-width:280px;padding:24px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <p data-gjs-type="text" style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;font-style:italic;">"This builder saved us weeks of development time!"</p>
          <div data-gjs-type="text" style="font-weight:600;color:#0f172a;font-size:14px;">Sarah Chen · CEO</div>
        </div>
        <div style="flex:1;min-width:280px;padding:24px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <p data-gjs-type="text" style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;font-style:italic;">"Smooth, intuitive, and professional."</p>
          <div data-gjs-type="text" style="font-weight:600;color:#0f172a;font-size:14px;">Mike Johnson · Designer</div>
        </div>
      </div>
    </section>
  `)

  addSection(editor, 'faq-block', 'FAQ', 'faq', `
    <section data-tc-type="section" style="padding:64px 32px;background:#f8fafc;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:36px;font-weight:700;color:#0f172a;margin:0 0 32px;">Frequently asked questions</h2>
      <div style="max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">
        <div style="padding:20px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;">
          <h3 data-gjs-type="text" style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">How does the free trial work?</h3>
          <p data-gjs-type="text" style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Start building immediately with full access for 14 days.</p>
        </div>
        <div style="padding:20px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;">
          <h3 data-gjs-type="text" style="margin:0 0 8px;font-size:16px;font-weight:600;color:#0f172a;">Can I use my own domain?</h3>
          <p data-gjs-type="text" style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Yes, connect a custom domain on any paid plan.</p>
        </div>
      </div>
    </section>
  `)

  addSection(editor, 'cta-block', 'CTA Section', 'cta', `
    <section data-tc-type="section" style="padding:64px 32px;background:#4f46e5;text-align:center;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="font-size:32px;font-weight:700;color:#fff;margin:0 0 12px;">Ready to get started?</h2>
      <p data-gjs-type="text" style="color:rgba(255,255,255,0.85);font-size:16px;margin:0 0 28px;">Join thousands of creators building with our platform.</p>
      <a data-tc-type="button" href="#signup" style="display:inline-block;background:#fff;color:#4f46e5;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Start Building Free</a>
    </section>
  `)

  addSection(editor, 'contact-form-block', 'Contact Form', 'contact', `
    <section data-tc-type="section" id="contact" style="padding:64px 32px;background:#f8fafc;font-family:Inter,sans-serif;">
      <div style="max-width:480px;margin:0 auto;">
        <h2 data-gjs-type="text" style="text-align:center;font-size:32px;font-weight:700;color:#0f172a;margin:0 0 32px;">Get in touch</h2>
        <form style="display:flex;flex-direction:column;gap:16px;">
          <input type="text" placeholder="Your name" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;font-family:inherit;"/>
          <input type="email" placeholder="Email address" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;font-family:inherit;"/>
          <textarea placeholder="Your message" rows="4" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;font-family:inherit;resize:vertical;"></textarea>
          <button data-tc-type="button" type="submit" style="background:#4f46e5;color:#fff;padding:14px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;">Send Message</button>
        </form>
      </div>
    </section>
  `)

  addSection(editor, 'gallery-block', 'Gallery', 'gallery', `
    <section data-tc-type="section" style="padding:64px 32px;background:#fff;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:32px;font-weight:700;color:#0f172a;margin:0 0 32px;">Gallery</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:960px;margin:0 auto;">
        <img data-tc-type="image" src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop" alt="Gallery 1" style="width:100%;border-radius:10px;aspect-ratio:4/3;object-fit:cover;"/>
        <img data-tc-type="image" src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop" alt="Gallery 2" style="width:100%;border-radius:10px;aspect-ratio:4/3;object-fit:cover;"/>
        <img data-tc-type="image" src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop" alt="Gallery 3" style="width:100%;border-radius:10px;aspect-ratio:4/3;object-fit:cover;"/>
      </div>
    </section>
  `)

  addSection(editor, 'team-block', 'Team Section', 'team', `
    <section data-tc-type="section" style="padding:64px 32px;background:#f8fafc;font-family:Inter,sans-serif;">
      <h2 data-gjs-type="text" style="text-align:center;font-size:32px;font-weight:700;color:#0f172a;margin:0 0 32px;">Meet the team</h2>
      <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:960px;margin:0 auto;justify-content:center;">
        <div style="text-align:center;min-width:160px;">
          <img data-tc-type="image" src="https://i.pravatar.cc/120?img=3" alt="Team member" style="width:96px;height:96px;border-radius:50%;margin:0 auto 12px;display:block;object-fit:cover;"/>
          <h3 data-gjs-type="text" style="margin:0 0 4px;font-size:16px;font-weight:600;color:#0f172a;">Alex Rivera</h3>
          <p data-gjs-type="text" style="margin:0;color:#64748b;font-size:14px;">Founder</p>
        </div>
        <div style="text-align:center;min-width:160px;">
          <img data-tc-type="image" src="https://i.pravatar.cc/120?img=5" alt="Team member" style="width:96px;height:96px;border-radius:50%;margin:0 auto 12px;display:block;object-fit:cover;"/>
          <h3 data-gjs-type="text" style="margin:0 0 4px;font-size:16px;font-weight:600;color:#0f172a;">Jordan Lee</h3>
          <p data-gjs-type="text" style="margin:0;color:#64748b;font-size:14px;">Design Lead</p>
        </div>
      </div>
    </section>
  `)

  addSection(editor, 'logos-block', 'Logo Cloud', 'logos', `
    <section data-tc-type="section" style="padding:48px 32px;background:#fff;font-family:Inter,sans-serif;">
      <p data-gjs-type="text" style="text-align:center;color:#64748b;font-size:14px;margin:0 0 24px;text-transform:uppercase;letter-spacing:0.05em;">Trusted by leading brands</p>
      <div style="display:flex;gap:32px;flex-wrap:wrap;align-items:center;justify-content:center;max-width:800px;margin:0 auto;opacity:0.7;">
        <div data-gjs-type="text" style="font-size:20px;font-weight:700;color:#94a3b8;">Acme</div>
        <div data-gjs-type="text" style="font-size:20px;font-weight:700;color:#94a3b8;">Globex</div>
        <div data-gjs-type="text" style="font-size:20px;font-weight:700;color:#94a3b8;">Umbrella</div>
        <div data-gjs-type="text" style="font-size:20px;font-weight:700;color:#94a3b8;">Initech</div>
      </div>
    </section>
  `)

  addSection(editor, 'footer-block', 'Footer', 'footer', `
    <footer data-tc-type="section" style="padding:48px 32px 24px;background:#0f172a;color:#94a3b8;font-family:Inter,sans-serif;">
      <div style="display:flex;gap:32px;flex-wrap:wrap;max-width:960px;margin:0 auto 32px;">
        <div style="flex:1;min-width:200px;">
          <div data-gjs-type="text" style="font-size:18px;font-weight:700;color:#fff;margin-bottom:12px;">Brand</div>
          <p data-gjs-type="text" style="font-size:14px;line-height:1.6;margin:0;">Building the future of web design.</p>
        </div>
      </div>
      <div data-gjs-type="text" style="text-align:center;border-top:1px solid #1e293b;padding-top:24px;font-size:13px;max-width:960px;margin:0 auto;">© 2026 Brand. All rights reserved.</div>
    </footer>
  `)
}
