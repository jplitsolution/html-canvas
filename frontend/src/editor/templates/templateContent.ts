import { IMG } from './templateImages'

const ff = 'Inter, system-ui, sans-serif'

export const sharedCss = `
* { box-sizing: border-box; }
body { margin: 0; font-family: ${ff}; color: #0f172a; }
img { max-width: 100%; height: auto; display: block; }
a { transition: opacity 0.15s ease; }
a:hover { opacity: 0.88; }
`

export const landingHtml = `
<header style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#fff;border-bottom:1px solid #e2e8f0;">
  <div style="font-size:22px;font-weight:700;">LaunchPad</div>
  <input type="checkbox" id="tc-nav-toggle-landing" class="tc-nav-toggle" style="display:none;" />
  <label for="tc-nav-toggle-landing" class="tc-nav-hamburger" style="display:none;cursor:pointer;font-size:24px;user-select:none;color:#0f172a;">☰</label>
  <nav style="display:flex;align-items:center;gap:24px;">
    <a href="#features" style="color:#64748b;text-decoration:none;">Features</a>
    <a href="#testimonials" style="color:#64748b;text-decoration:none;">Reviews</a>
    <a href="#signup" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Get Started</a>
  </nav>
</header>
<section style="display:flex;align-items:center;gap:48px;padding:72px 32px;max-width:1100px;margin:0 auto;flex-wrap:wrap;">
  <div style="flex:1;min-width:280px;">
    <p style="color:#2563eb;font-weight:600;font-size:14px;margin:0 0 12px;">NEW · Product launch kit</p>
    <h1 style="font-size:clamp(32px, 8vw, 44px);font-weight:800;line-height:1.1;margin:0 0 16px;">Launch your next big idea faster</h1>
    <p style="font-size:clamp(16px, 3vw, 18px);color:#64748b;line-height:1.6;margin:0 0 28px;">Everything you need to ship a polished landing page — hero, features, social proof, and CTAs.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <a href="#signup" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Start Free</a>
      <a href="#demo" style="border:1px solid #cbd5e1;color:#0f172a;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">See demo</a>
    </div>
  </div>
  <div style="flex:1;min-width:280px;">
    <img src="${IMG.heroDashboard}" alt="Dashboard preview" style="width:100%;border-radius:16px;box-shadow:0 24px 48px rgba(15,23,42,0.12);"/>
  </div>
</section>
<section id="features" style="padding:64px 32px;background:#f8fafc;">
  <h2 style="text-align:center;font-size:clamp(24px, 5vw, 32px);font-weight:700;margin:0 0 40px;">Why teams choose LaunchPad</h2>
  <div style="display:flex;gap:20px;flex-wrap:wrap;max-width:960px;margin:0 auto;">
    <div style="flex:1;min-width:220px;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">⚡</div>
      <h3 style="margin:0 0 8px;">Fast setup</h3>
      <p style="margin:0;color:#64748b;line-height:1.5;">Go live in minutes with ready-made sections.</p>
    </div>
    <div style="flex:1;min-width:220px;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">🎨</div>
      <h3 style="margin:0 0 8px;">Beautiful UI</h3>
      <p style="margin:0;color:#64748b;line-height:1.5;">Modern layouts with real imagery out of the box.</p>
    </div>
    <div style="flex:1;min-width:220px;background:#fff;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="font-size:28px;margin-bottom:12px;">📱</div>
      <h3 style="margin:0 0 8px;">Fully responsive</h3>
      <p style="margin:0;color:#64748b;line-height:1.5;">Looks great on desktop, tablet, and mobile.</p>
    </div>
  </div>
</section>
<section id="testimonials" style="padding:64px 32px;">
  <h2 style="text-align:center;font-size:clamp(24px, 5vw, 32px);font-weight:700;margin:0 0 40px;">Loved by founders</h2>
  <div style="display:flex;gap:24px;flex-wrap:wrap;max-width:900px;margin:0 auto;">
    <div style="flex:1;min-width:260px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <p style="color:#475569;line-height:1.6;margin:0 0 16px;">"We shipped our MVP landing page in one afternoon. The templates saved us weeks."</p>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${IMG.avatar1}" alt="Alex" style="width:44px;height:44px;border-radius:50%;object-fit:cover;"/>
        <div><strong style="display:block;">Alex Rivera</strong><span style="color:#64748b;font-size:14px;">CEO, Nova Labs</span></div>
      </div>
    </div>
    <div style="flex:1;min-width:260px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <p style="color:#475569;line-height:1.6;margin:0 0 16px;">"Clean design, easy to customize. Our conversion rate went up 28%."</p>
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${IMG.avatar2}" alt="Priya" style="width:44px;height:44px;border-radius:50%;object-fit:cover;"/>
        <div><strong style="display:block;">Priya Sharma</strong><span style="color:#64748b;font-size:14px;">Growth, Stackline</span></div>
      </div>
    </div>
  </div>
</section>
<section id="signup" style="padding:56px 32px;background:#2563eb;text-align:center;">
  <h2 style="color:#fff;font-size:clamp(20px, 4vw, 28px);margin:0 0 12px;">Ready to launch?</h2>
  <p style="color:rgba(255,255,255,0.85);margin:0 0 24px;">Join 2,000+ teams building with LaunchPad.</p>
  <a href="#" style="background:#fff;color:#2563eb;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Get started today</a>
</section>
<footer style="padding:32px;text-align:center;background:#0f172a;color:#94a3b8;font-size:14px;">
  <p style="margin:0;">© 2026 LaunchPad · hello@launchpad.io</p>
</footer>
`

export const saasHtml = `
<header style="display:flex;justify-content:space-between;align-items:center;padding:16px 32px;border-bottom:1px solid #e2e8f0;">
  <div style="font-weight:700;font-size:20px;">CloudFlow</div>
  <input type="checkbox" id="tc-nav-toggle-saas" class="tc-nav-toggle" style="display:none;" />
  <label for="tc-nav-toggle-saas" class="tc-nav-hamburger" style="display:none;cursor:pointer;font-size:24px;user-select:none;color:#0f172a;">☰</label>
  <nav style="display:flex;gap:20px;align-items:center;">
    <a href="#features" style="color:#64748b;text-decoration:none;">Features</a>
    <a href="#pricing" style="color:#64748b;text-decoration:none;">Pricing</a>
    <a href="#" style="background:#2563eb;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Sign up</a>
  </nav>
</header>
<section style="padding:72px 32px;text-align:center;background:linear-gradient(180deg,#eef2ff,#fff);">
  <h1 style="font-size:clamp(32px, 8vw, 46px);font-weight:800;margin:0 0 12px;">Ship products faster</h1>
  <p style="color:#64748b;font-size:clamp(16px, 3vw, 18px);max-width:520px;margin:0 auto 32px;">The all-in-one platform for modern SaaS teams — analytics, billing, and growth tools.</p>
  <img src="${IMG.heroWorkspace}" alt="Team workspace" style="max-width:900px;width:100%;margin:0 auto;border-radius:16px;box-shadow:0 20px 40px rgba(79,70,229,0.15);"/>
</section>
<section id="features" style="padding:64px 32px;display:flex;align-items:center;gap:48px;max-width:1000px;margin:0 auto;flex-wrap:wrap;">
  <img src="${IMG.saasFeature}" alt="Analytics dashboard" style="flex:1;min-width:280px;border-radius:12px;"/>
  <div style="flex:1;min-width:280px;">
    <h2 style="font-size:clamp(24px, 5vw, 32px);margin:0 0 16px;">Real-time insights</h2>
    <p style="color:#64748b;line-height:1.7;margin:0 0 20px;">Track MRR, churn, and activation from a single dashboard built for founders.</p>
    <ul style="color:#475569;line-height:2;padding-left:20px;margin:0;">
      <li>Custom funnels & cohorts</li>
      <li>Stripe & Paddle sync</li>
      <li>Slack alerts</li>
    </ul>
  </div>
</section>
<section id="pricing" style="padding:64px 32px;background:#f8fafc;text-align:center;">
  <h2 style="font-size:clamp(24px, 5vw, 32px);margin:0 0 32px;">Simple pricing</h2>
  <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
    <div style="background:#fff;padding:32px;border-radius:12px;border:1px solid #e2e8f0;min-width:240px;text-align:left;">
      <h3 style="margin:0 0 8px;">Starter</h3>
      <p style="font-size:36px;font-weight:700;margin:0 0 16px;">$19<span style="font-size:16px;color:#64748b;">/mo</span></p>
      <p style="color:#64748b;margin:0 0 20px;">Up to 3 team members</p>
      <a href="#" style="display:block;text-align:center;background:#f1f5f9;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;color:#0f172a;">Choose plan</a>
    </div>
    <div style="background:#2563eb;color:#fff;padding:32px;border-radius:12px;min-width:240px;text-align:left;">
      <h3 style="margin:0 0 8px;">Pro</h3>
      <p style="font-size:36px;font-weight:700;margin:0 0 16px;">$49<span style="font-size:16px;opacity:0.8;">/mo</span></p>
      <p style="opacity:0.85;margin:0 0 20px;">Unlimited seats + API</p>
      <a href="#" style="display:block;text-align:center;background:#fff;color:#2563eb;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">Choose plan</a>
    </div>
  </div>
</section>
`

export const portfolioHtml = `
<section style="padding:80px 32px;display:flex;align-items:center;gap:40px;max-width:1000px;margin:0 auto;flex-wrap:wrap;">
  <img src="${IMG.portrait}" alt="Jane Designer" style="width:280px;height:340px;object-fit:cover;border-radius:16px;"/>
  <div style="flex:1;min-width:260px;">
    <h1 style="font-size:clamp(30px, 8vw, 42px);margin:0 0 8px;">Jane Designer</h1>
    <p style="color:#64748b;font-size:clamp(16px, 3vw, 18px);margin:0 0 20px;">UI/UX · Brand · Product Design</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px;">I help startups and agencies craft memorable digital experiences. Based in Mumbai, working worldwide.</p>
    <a href="#work" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View my work</a>
  </div>
</section>
<section id="work" style="padding:48px 32px;background:#f8fafc;">
  <h2 style="text-align:center;font-size:clamp(24px, 5vw, 32px);margin:0 0 32px;">Selected projects</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;max-width:960px;margin:0 auto;">
    <img src="${IMG.gallery1}" alt="Brand identity" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
    <img src="${IMG.gallery2}" alt="Mobile app UI" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
    <img src="${IMG.gallery3}" alt="Web redesign" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
    <img src="${IMG.gallery4}" alt="Design system" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
    <img src="${IMG.gallery5}" alt="Marketing site" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
    <img src="${IMG.gallery6}" alt="Dashboard" style="width:100%;border-radius:12px;aspect-ratio:4/3;object-fit:cover;"/>
  </div>
</section>
<section style="padding:64px 32px;text-align:center;">
  <h2 style="margin:0 0 12px;font-size:clamp(24px, 5vw, 32px);">Let's collaborate</h2>
  <p style="color:#64748b;margin:0 0 20px;">Available for freelance & full-time roles</p>
  <a href="mailto:jane@design.studio" style="color:#2563eb;font-weight:600;text-decoration:none;">jane@design.studio</a>
</section>
`

export const agencyHtml = `
<header style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:absolute;width:100%;z-index:1;">
  <div style="font-weight:700;font-size:22px;color:#fff;">Studio Apex</div>
  <a href="#contact" style="text-decoration:none;color:#fff;font-weight:600;background:rgba(255,255,255,0.15);padding:10px 20px;border-radius:8px;">Contact us</a>
</header>
<section style="position:relative;padding:120px 32px 80px;background:url('${IMG.agencyHero}') center/cover no-repeat;color:#fff;text-align:center;">
  <div style="background:rgba(15,23,42,0.55);position:absolute;inset:0;"></div>
  <div style="position:relative;max-width:640px;margin:0 auto;">
    <h1 style="font-size:clamp(32px, 8vw, 48px);font-weight:800;margin:0 0 16px;">We build brands that stand out</h1>
    <p style="font-size:clamp(16px, 3vw, 18px);opacity:0.9;line-height:1.6;">Strategy, design, and development for ambitious teams ready to grow.</p>
  </div>
</section>
<section style="padding:64px 32px;">
  <h2 style="text-align:center;margin:0 0 40px;font-size:clamp(24px, 5vw, 32px);">Our services</h2>
  <div style="display:flex;gap:20px;flex-wrap:wrap;max-width:960px;margin:0 auto;">
    <div style="flex:1;min-width:220px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 8px;">Brand strategy</h3><p style="margin:0;color:#64748b;">Positioning, messaging, visual identity.</p></div>
    <div style="flex:1;min-width:220px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 8px;">Web design</h3><p style="margin:0;color:#64748b;">Marketing sites & product UI.</p></div>
    <div style="flex:1;min-width:220px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 8px;">Development</h3><p style="margin:0;color:#64748b;">React, headless CMS, e-commerce.</p></div>
  </div>
</section>
<section style="padding:64px 32px;background:#f8fafc;text-align:center;">
  <h2 style="margin:0 0 32px;font-size:clamp(24px, 5vw, 32px);">Meet the team</h2>
  <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;max-width:900px;margin:0 auto;">
    <div style="max-width:180px;"><img src="${IMG.team1}" alt="Rahul" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 12px;"/><strong>Rahul K.</strong><p style="margin:4px 0 0;color:#64748b;font-size:14px;">Creative Director</p></div>
    <div style="max-width:180px;"><img src="${IMG.team2}" alt="Sara" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 12px;"/><strong>Sara M.</strong><p style="margin:4px 0 0;color:#64748b;font-size:14px;">Lead Designer</p></div>
    <div style="max-width:180px;"><img src="${IMG.team3}" alt="Dev" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 12px;"/><strong>Dev P.</strong><p style="margin:4px 0 0;color:#64748b;font-size:14px;">Tech Lead</p></div>
    <div style="max-width:180px;"><img src="${IMG.team4}" alt="Anya" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto 12px;"/><strong>Anya L.</strong><p style="margin:4px 0 0;color:#64748b;font-size:14px;">Strategy</p></div>
  </div>
</section>
<section id="contact" style="padding:64px 32px;text-align:center;">
  <h2 style="font-size:clamp(24px, 5vw, 32px);">Let's work together</h2>
  <p style="color:#64748b;margin:0 0 16px;">Tell us about your project</p>
  <a href="mailto:hello@studioapex.com" style="color:#2563eb;font-weight:600;font-size:18px;text-decoration:none;">hello@studioapex.com</a>
</section>
`

export const restaurantHtml = `
<section style="position:relative;padding:100px 32px;text-align:center;color:#fff;background:url('${IMG.heroFood}') center/cover no-repeat;">
  <div style="position:absolute;inset:0;background:rgba(28,25,23,0.65);"></div>
  <div style="position:relative;">
    <h1 style="font-size:clamp(32px, 8vw, 48px);margin:0 0 8px;font-family:Georgia,serif;">Bella Cucina</h1>
    <p style="opacity:0.9;font-size:clamp(16px, 3vw, 18px);margin:0 0 24px;">Authentic Italian dining since 1998</p>
    <a href="#reserve" style="display:inline-block;background:#d97706;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Reserve a table</a>
  </div>
</section>
<section style="padding:64px 32px;text-align:center;">
  <h2 style="margin:0 0 8px;font-size:clamp(24px, 5vw, 32px);font-family:Georgia,serif;">Featured dishes</h2>
  <p style="color:#64748b;margin:0 0 40px;">Seasonal ingredients, timeless recipes</p>
  <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;max-width:960px;margin:0 auto;">
    <div style="max-width:280px;text-align:left;">
      <img src="${IMG.dish1}" alt="Garden salad" style="width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:0 0 4px;">Truffle Risotto</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">Creamy arborio · wild mushrooms · parmesan</p>
      <p style="margin:8px 0 0;font-weight:600;color:#d97706;">₹850</p>
    </div>
    <div style="max-width:280px;text-align:left;">
      <img src="${IMG.dish2}" alt="Pizza" style="width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:0 0 4px;">Margherita Pizza</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">San Marzano · fresh basil · bufala</p>
      <p style="margin:8px 0 0;font-weight:600;color:#d97706;">₹650</p>
    </div>
    <div style="max-width:280px;text-align:left;">
      <img src="${IMG.dish3}" alt="Dessert" style="width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:0 0 4px;">Tiramisu</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">Espresso-soaked ladyfingers · mascarpone</p>
      <p style="margin:8px 0 0;font-weight:600;color:#d97706;">₹420</p>
    </div>
  </div>
</section>
<section id="reserve" style="padding:56px 32px;background:#1c1917;color:#fff;text-align:center;">
  <h2 style="margin:0 0 12px;font-size:clamp(24px, 5vw, 32px);font-family:Georgia,serif;">Book your evening</h2>
  <p style="opacity:0.8;margin:0 0 20px;">Open Tue–Sun · 6pm–11pm · Bandra West, Mumbai</p>
  <a href="tel:+912212345678" style="color:#d97706;font-weight:600;text-decoration:none;">+91 22 1234 5678</a>
</section>
`

export const blogHtml = `
<header style="padding:20px 32px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
  <div style="font-weight:700;font-size:22px;">The Daily Edit</div>
  <a href="#" style="color:#64748b;text-decoration:none;font-size:14px;">Subscribe</a>
</header>
<section style="padding:48px 32px;max-width:900px;margin:0 auto;">
  <img src="${IMG.blogFeatured}" alt="Featured article" style="width:100%;border-radius:12px;margin-bottom:24px;aspect-ratio:16/9;object-fit:cover;"/>
  <p style="color:#2563eb;font-size:13px;font-weight:600;margin:0 0 8px;">FEATURED</p>
  <h1 style="font-size:clamp(28px, 6vw, 36px);margin:0 0 12px;line-height:1.2;">Stories worth reading every morning</h1>
  <p style="color:#64748b;line-height:1.7;margin:0;">Insights on design, technology, and creative work from builders around the world.</p>
</section>
<section style="padding:0 32px 48px;max-width:900px;margin:0 auto;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;">
    <article>
      <img src="${IMG.blog1}" alt="Article" style="width:100%;border-radius:8px;margin-bottom:12px;aspect-ratio:16/10;object-fit:cover;"/>
      <h2 style="margin:0 0 8px;font-size:clamp(16px, 4vw, 18px);">Getting started with visual builders</h2>
      <p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">A practical guide for teams moving to no-code workflows.</p>
    </article>
    <article>
      <img src="${IMG.blog2}" alt="Article" style="width:100%;border-radius:8px;margin-bottom:12px;aspect-ratio:16/10;object-fit:cover;"/>
      <h2 style="margin:0 0 8px;font-size:clamp(16px, 4vw, 18px);">Design systems that scale</h2>
      <p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">How we unified 40 products under one token library.</p>
    </article>
    <article>
      <img src="${IMG.blog3}" alt="Article" style="width:100%;border-radius:8px;margin-bottom:12px;aspect-ratio:16/10;object-fit:cover;"/>
      <h2 style="margin:0 0 8px;font-size:clamp(16px, 4vw, 18px);">Shipping faster with AI</h2>
      <p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">What actually helps developers in 2026 — and what doesn't.</p>
    </article>
  </div>
</section>
`

export const ecommerceHtml = `
<header style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;">
  <div style="font-weight:700;font-size:20px;">ShopWave</div>
  <input type="checkbox" id="tc-nav-toggle-ecommerce" class="tc-nav-toggle" style="display:none;" />
  <label for="tc-nav-toggle-ecommerce" class="tc-nav-hamburger" style="display:none;cursor:pointer;font-size:24px;user-select:none;color:#0f172a;">☰</label>
  <nav style="display:flex;gap:20px;align-items:center;">
    <a href="#" style="color:#64748b;text-decoration:none;">New in</a>
    <a href="#" style="color:#64748b;text-decoration:none;">Sale</a>
    <a href="#" style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;">Cart (0)</a>
  </nav>
</header>
<section style="padding:64px 32px;background:#fef3c7;display:flex;align-items:center;gap:40px;max-width:1000px;margin:0 auto;flex-wrap:wrap;">
  <div style="flex:1;min-width:260px;">
    <h1 style="font-size:clamp(28px, 8vw, 40px);margin:0 0 8px;">Summer collection</h1>
    <p style="color:#92400e;margin:0 0 20px;">Up to 40% off selected items · Free shipping over ₹999</p>
    <a href="#products" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Shop now</a>
  </div>
  <img src="${IMG.product4}" alt="Summer sneakers" style="flex:1;min-width:260px;max-width:400px;border-radius:12px;"/>
</section>
<section id="products" style="padding:48px 32px;">
  <h2 style="text-align:center;margin:0 0 32px;font-size:clamp(24px, 5vw, 32px);">Best sellers</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;max-width:960px;margin:0 auto;">
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <img src="${IMG.product1}" alt="Watch" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:12px 0 4px;">Classic Watch</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">Minimal leather strap</p>
      <p style="margin:8px 0 0;color:#2563eb;font-weight:600;">₹4,299</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <img src="${IMG.product2}" alt="Headphones" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:12px 0 4px;">Wireless Headphones</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">Noise cancelling · 30hr battery</p>
      <p style="margin:8px 0 0;color:#2563eb;font-weight:600;">₹2,899</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <img src="${IMG.product3}" alt="Sunglasses" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:12px 0 4px;">Polarized Sunglasses</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">UV400 protection</p>
      <p style="margin:8px 0 0;color:#2563eb;font-weight:600;">₹1,599</p>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <img src="${IMG.product4}" alt="Sneakers" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover;"/>
      <h3 style="margin:12px 0 4px;">Running Sneakers</h3>
      <p style="margin:0;color:#64748b;font-size:14px;">Lightweight mesh upper</p>
      <p style="margin:8px 0 0;color:#2563eb;font-weight:600;">₹3,499</p>
    </div>
  </div>
</section>
`

export const travelHtml = `
<header style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;background:#fff;">
  <div style="font-weight:700;font-size:20px;color:#0ea5e9;">Azure Resort</div>
  <a href="#book" style="background:#0ea5e9;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Book stay</a>
</header>
<section style="position:relative;padding:100px 32px;text-align:center;color:#fff;background:url('${IMG.heroBeach}') center/cover no-repeat;">
  <div style="position:absolute;inset:0;background:rgba(14,165,233,0.35);"></div>
  <div style="position:relative;">
    <h1 style="font-size:clamp(30px, 8vw, 44px);margin:0 0 12px;">Escape to paradise</h1>
    <p style="font-size:clamp(16px, 3vw, 18px);opacity:0.95;margin:0;">Luxury beachfront villas · Spa · Infinity pool</p>
  </div>
</section>
<section style="padding:64px 32px;">
  <h2 style="text-align:center;margin:0 0 32px;font-size:clamp(24px, 5vw, 32px);">Our accommodations</h2>
  <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;max-width:900px;margin:0 auto;">
    <div style="max-width:400px;">
      <img src="${IMG.travelRoom}" alt="Ocean suite" style="width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:3/2;object-fit:cover;"/>
      <h3 style="margin:0 0 4px;">Ocean Suite</h3>
      <p style="margin:0;color:#64748b;">King bed · private balcony · sea view</p>
      <p style="margin:8px 0 0;font-weight:600;color:#0ea5e9;">From ₹12,500/night</p>
    </div>
    <div style="max-width:400px;">
      <img src="${IMG.travelPool}" alt="Pool villa" style="width:100%;border-radius:12px;margin-bottom:12px;aspect-ratio:3/2;object-fit:cover;"/>
      <h3 style="margin:0 0 4px;">Pool Villa</h3>
      <p style="margin:0;color:#64748b;">Plunge pool · butler service · garden</p>
      <p style="margin:8px 0 0;font-weight:600;color:#0ea5e9;">From ₹18,900/night</p>
    </div>
  </div>
</section>
<section id="book" style="padding:56px 32px;background:#f0f9ff;text-align:center;">
  <h2 style="margin:0 0 12px;font-size:clamp(24px, 5vw, 32px);">Plan your getaway</h2>
  <p style="color:#64748b;margin:0 0 20px;">Limited summer availability — book 30 days ahead and save 15%</p>
  <a href="#" style="background:#0ea5e9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Check availability</a>
</section>
`

export const fitnessHtml = `
<header style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;">
  <div style="font-weight:800;font-size:20px;letter-spacing:0.05em;">IRON<span style="color:#ef4444;">FIT</span></div>
  <a href="#join" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;text-transform:uppercase;font-size:13px;">Join now</a>
</header>
<section style="display:flex;align-items:center;gap:40px;padding:64px 32px;max-width:1000px;margin:0 auto;flex-wrap:wrap;background:#0f172a;color:#fff;">
  <div style="flex:1;min-width:280px;">
    <h1 style="font-size:clamp(30px, 8vw, 42px);font-weight:800;margin:0 0 12px;text-transform:uppercase;">Train harder.<br/>Live stronger.</h1>
    <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px;">24/7 access · personal trainers · group classes · nutrition coaching.</p>
    <a href="#join" style="background:#ef4444;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">Free 7-day trial</a>
  </div>
  <img src="${IMG.heroGym}" alt="Gym interior" style="flex:1;min-width:280px;border-radius:8px;aspect-ratio:4/3;object-fit:cover;"/>
</section>
<section style="padding:64px 32px;text-align:center;">
  <h2 style="margin:0 0 32px;font-size:clamp(24px, 5vw, 32px);">Membership plans</h2>
  <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
    <div style="border:2px solid #e2e8f0;padding:28px;border-radius:8px;min-width:220px;">
      <h3 style="margin:0 0 8px;">Basic</h3>
      <p style="font-size:32px;font-weight:800;margin:0 0 12px;">₹999<span style="font-size:14px;color:#64748b;">/mo</span></p>
      <p style="color:#64748b;margin:0;">Gym floor access</p>
    </div>
    <div style="border:2px solid #ef4444;padding:28px;border-radius:8px;min-width:220px;background:#fef2f2;">
      <h3 style="margin:0 0 8px;color:#ef4444;">Pro</h3>
      <p style="font-size:32px;font-weight:800;margin:0 0 12px;">₹1,999<span style="font-size:14px;color:#64748b;">/mo</span></p>
      <p style="color:#64748b;margin:0;">Classes + trainer sessions</p>
    </div>
  </div>
</section>
<section style="padding:48px 32px;background:#f8fafc;text-align:center;">
  <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
    <img src="${IMG.avatar3}" alt="Member" style="width:56px;height:56px;border-radius:50%;object-fit:cover;"/>
    <p style="margin:0;color:#475569;max-width:480px;text-align:left;">"Best gym in the city. Lost 8kg in 3 months with their coaching program." — <strong>Vikram S.</strong></p>
  </div>
</section>
`
