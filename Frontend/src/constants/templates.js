const SAAS_LANDING_HTML = `
<header style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#ffffff;border-bottom:1px solid #e2e8f0;font-family:Inter,sans-serif;">
  <div style="font-size:20px;font-weight:700;color:#0f172a;">CloudFlow</div>
  <nav style="display:flex;align-items:center;gap:24px;">
    <a href="#features" style="color:#475569;text-decoration:none;font-size:15px;">Features</a>
    <a href="#pricing" style="color:#475569;text-decoration:none;font-size:15px;">Pricing</a>
    <a href="#contact" style="color:#475569;text-decoration:none;font-size:15px;">Contact</a>
    <a href="#signup" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Start Free Trial</a>
  </nav>
</header>
<section style="padding:80px 32px;text-align:center;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%);font-family:Inter,sans-serif;">
  <h1 style="font-size:48px;font-weight:700;color:#0f172a;margin:0 0 16px;line-height:1.1;">Ship products faster with CloudFlow</h1>
  <p style="font-size:18px;color:#64748b;max-width:560px;margin:0 auto 32px;line-height:1.6;">The all-in-one platform for modern teams to build, launch, and scale.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <a href="#signup" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Start Free Trial</a>
    <a href="#demo" style="background:#fff;color:#2563eb;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;border:1px solid #2563eb;">Watch Demo</a>
  </div>
</section>
<section id="features" style="padding:64px 32px;background:#ffffff;font-family:Inter,sans-serif;">
  <h2 style="text-align:center;font-size:36px;font-weight:700;color:#0f172a;margin:0 0 48px;">Features</h2>
  <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:960px;margin:0 auto;">
    <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">⚡</div>
      <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Lightning Fast</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Optimized for speed and performance out of the box.</p>
    </div>
    <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">🎨</div>
      <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Beautiful Design</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Professional templates and components ready to use.</p>
    </div>
    <div style="flex:1;min-width:240px;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">📱</div>
      <h3 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Responsive</h3>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Looks great on desktop, tablet, and mobile devices.</p>
    </div>
  </div>
</section>
<section style="padding:64px 32px;background:#2563eb;text-align:center;font-family:Inter,sans-serif;">
  <h2 style="font-size:32px;font-weight:700;color:#fff;margin:0 0 12px;">Ready to get started?</h2>
  <p style="color:rgba(255,255,255,0.85);font-size:16px;margin:0 0 28px;">Join thousands of teams building with CloudFlow.</p>
  <a href="#signup" style="display:inline-block;background:#fff;color:#2563eb;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Start Building Free</a>
</section>
<footer style="padding:48px 32px 24px;background:#0f172a;color:#94a3b8;font-family:Inter,sans-serif;">
  <div style="text-align:center;font-size:13px;">© 2026 CloudFlow. All rights reserved.</div>
</footer>
`.trim()

export const PREBUILT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty canvas',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop',
    editor: 'grapesjs',
    projectData: {},
    html: '',
    css: '',
  },
  {
    id: 'saas-landing',
    name: 'SaaS Landing',
    description: 'Modern SaaS product landing page with hero, features, and CTA',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
    editor: 'grapesjs',
    projectData: {},
    html: SAAS_LANDING_HTML,
    css: '',
  },
  {
    id: 'minimal-portfolio',
    name: 'Minimal Portfolio',
    description: 'Clean portfolio layout for creatives and freelancers',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1a37ab?w=400&h=250&fit=crop',
    editor: 'grapesjs',
    projectData: {},
    html: `
<section style="padding:80px 32px;text-align:center;font-family:Inter,sans-serif;background:#fafafa;">
  <h1 style="font-size:42px;font-weight:700;color:#0f172a;margin:0 0 12px;">Jane Designer</h1>
  <p style="font-size:18px;color:#64748b;margin:0 0 24px;">UI/UX Designer · Brand Strategist</p>
  <a href="#work" style="color:#2563eb;text-decoration:none;font-weight:600;">View my work →</a>
</section>
<section id="work" style="padding:64px 32px;max-width:960px;margin:0 auto;font-family:Inter,sans-serif;">
  <h2 style="font-size:28px;font-weight:700;color:#0f172a;margin:0 0 32px;">Selected Work</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><img src="https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop" alt="Project 1" style="width:100%;display:block;"/><div style="padding:16px;"><h3 style="margin:0 0 4px;font-size:16px;">Brand Identity</h3><p style="margin:0;color:#64748b;font-size:14px;">Visual identity system</p></div></div>
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><img src="https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&h=400&fit=crop" alt="Project 2" style="width:100%;display:block;"/><div style="padding:16px;"><h3 style="margin:0 0 4px;font-size:16px;">Mobile App</h3><p style="margin:0;color:#64748b;font-size:14px;">iOS product design</p></div></div>
  </div>
</section>
    `.trim(),
    css: '',
  },
]

export function getTemplateById(id) {
  return PREBUILT_TEMPLATES.find((t) => t.id === id) || PREBUILT_TEMPLATES[0]
}
