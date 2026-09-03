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

export const STARTER_TEMPLATES = [
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

// ----------------------------------------------------
// OTP Page Templates
// ----------------------------------------------------
const otpTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }
.otp-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; overflow: hidden; }
.otp-bar { height: 6px; background: #2563eb; }
.otp-body { padding: 32px 24px; text-align: center; }
.otp-icon { width: 48px; height: 48px; margin: 0 auto 16px; background: #eff6ff; color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.otp-title { font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
.otp-subtitle { font-size: 13px; color: #4b5563; margin-bottom: 24px; line-height: 1.5; }
.otp-input-group { text-align: left; margin-bottom: 16px; }
.otp-label { display: block; font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 6px; }
.otp-input { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 11px 14px; font-size: 14px; outline: none; transition: border-color 0.2s; }
.otp-input:focus { border-color: #2563eb; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: none; cursor: pointer; padding: 13px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; color: #fff; background: #2563eb; transition: background 0.2s; margin-bottom: 12px; }
.flow-btn:hover { background: #1d4ed8; }
.flow-btn:active { transform: scale(0.99); }
.otp-status { min-height: 16px; color: #4b5563; font-size: 12px; margin-top: 4px; margin-bottom: 8px; text-align: left; }
.otp-error { min-height: 16px; color: #ef4444; font-size: 12px; margin-top: 4px; margin-bottom: 8px; text-align: left; }
.otp-footnote { font-size: 11px; color: #6b7280; margin-top: 16px; }
`

const otpTemplate1Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-bar"></div>
    <div class="otp-body">
      <div class="otp-icon">&#x1F511;</div>
      <h1 class="otp-title">Verify Phone Number</h1>
      <p class="otp-subtitle">Enter your mobile number to receive a secure validation code via SMS.</p>
      
      <div class="otp-input-group">
        <label class="otp-label">Mobile Number</label>
        <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
      </div>
      
      <button type="button" data-otp-action="send" class="flow-btn">Get OTP</button>
      
      <div style="margin-top: 16px;" class="otp-input-group">
        <label class="otp-label">Verification Code</label>
        <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Enter code" />
      </div>
      
      <div data-otp-slot="error" class="otp-error"></div>
      <div data-otp-slot="status" class="otp-status"></div>
      
      <button type="button" data-otp-action="verify" class="flow-btn" style="background: #10b981; margin-bottom: 0;">Verify & Continue</button>
      <p class="otp-footnote">Powered by TemplateCraft</p>
    </div>
  </div>
</div>
`

const otpTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.otp-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.otp-icon { width: 56px; height: 56px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 4px 4px 0px #111827; }
.otp-title { font-size: 24px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.otp-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.otp-label { display: block; font-size: 11px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; text-align: left; }
.otp-input { width: 100%; border: 3px solid #111827; background: #ffffff; color: #111827; border-radius: 0px; padding: 14px 16px; font-size: 15px; outline: none; margin-bottom: 16px; font-weight: 700; text-align: center; box-shadow: 4px 4px 0px rgba(0,0,0,0.05); }
.otp-input:focus { background: #fef08a; outline: none; box-shadow: 4px 4px 0px #111827; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: 3px solid #111827; cursor: pointer; padding: 16px 24px; border-radius: 0px; font-size: 15.5px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0px #111827; transition: transform 0.1s; margin-bottom: 16px; text-transform: uppercase; }
.flow-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #111827; }
.otp-error { min-height: 18px; color: #dc2626; font-size: 12.5px; margin-bottom: 8px; font-weight: 800; text-align: left; text-transform: uppercase; }
.otp-status { min-height: 18px; color: #16a34a; font-size: 12px; margin-bottom: 10px; font-weight: 800; text-align: left; }
.otp-footnote { font-size: 11px; color: #4b5563; margin-top: 16px; font-weight: 600; text-transform: uppercase; }
`

const otpTemplate2Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-icon">&#x26A1;</div>
    <h1 class="otp-title">Verify Phone</h1>
    <p class="otp-subtitle">Enter your mobile number to receive a secure validation code via SMS.</p>
    
    <div style="margin-bottom: 16px;">
      <label class="otp-label">Mobile Number</label>
      <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
    </div>
    
    <button type="button" data-otp-action="send" class="flow-btn">Get Verification</button>
    
    <div style="margin-bottom: 12px;">
      <label class="otp-label">Verification Code</label>
      <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Enter code" style="text-align: center;" />
    </div>
    
    <div data-otp-slot="error" class="otp-error"></div>
    <div data-otp-slot="status" class="otp-status"></div>
    
    <button type="button" data-otp-action="verify" class="flow-btn" style="background: #ffffff;">Confirm Activation</button>
    <p class="otp-footnote">Secured by TemplateCraft</p>
  </div>
</div>
`

const otpTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%); color: #f8fafc; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.otp-card { width: 100%; max-width: 400px; background: rgba(255, 255, 255, 0.05); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 40px 32px; text-align: center; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 0 25px 50px rgba(0,0,0,0.3); }
.otp-icon { width: 60px; height: 60px; margin: 0 auto 20px; background: rgba(255, 255, 255, 0.08); color: #c084fc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.otp-title { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 12px; background: linear-gradient(135deg, #f472b6, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.otp-subtitle { font-size: 13.5px; color: #cbd5e1; margin-bottom: 24px; line-height: 1.6; }
.otp-label { display: block; font-size: 11px; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; text-align: left; }
.otp-input { width: 100%; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.03); color: #fff; border-radius: 16px; padding: 14px 16px; font-size: 15px; outline: none; margin-bottom: 16px; font-weight: 600; text-align: center; }
.otp-input:focus { border-color: #c084fc; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: none; cursor: pointer; padding: 16px 24px; border-radius: 16px; font-size: 15.5px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #ec4899, #8b5cf6); box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3); transition: all 0.2s; margin-bottom: 16px; }
.flow-btn:hover { opacity: 0.95; }
.otp-error { min-height: 18px; color: #f87171; font-size: 12.5px; margin-bottom: 8px; font-weight: 600; text-align: left; }
.otp-status { min-height: 18px; color: #38bdf8; font-size: 12px; margin-bottom: 10px; font-weight: 600; text-align: left; }
.otp-footnote { font-size: 11px; color: #94a3b8; margin-top: 16px; }
`

const otpTemplate3Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-icon">&#x2728;</div>
    <h1 class="otp-title">Secure Login</h1>
    <p class="otp-subtitle">Enter your mobile number to receive a secure validation code via SMS.</p>
    
    <div style="margin-bottom: 16px;">
      <label class="otp-label">Mobile Number</label>
      <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
    </div>
    
    <button type="button" data-otp-action="send" class="flow-btn">Send OTP Code</button>
    
    <div style="margin-bottom: 12px;">
      <label class="otp-label">Verification Code</label>
      <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Enter code" style="text-align: center;" />
    </div>
    
    <div data-otp-slot="error" class="otp-error"></div>
    <div data-otp-slot="status" class="otp-status"></div>
    
    <button type="button" data-otp-action="verify" class="flow-btn" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);">Verify & Confirm</button>
    <p class="otp-footnote">Authentication secured by TemplateCraft</p>
  </div>
</div>
`

const otpTemplate4Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.otp-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.otp-icon { width: 56px; height: 56px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: rgba(212, 175, 55, 0.05); }
.otp-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.otp-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.otp-label { display: block; font-size: 10px; font-weight: 700; color: #d4af37; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; text-align: left; }
.otp-input { width: 100%; border: 1px solid #3f3f46; background: #0f0f11; color: #ffffff; border-radius: 6px; padding: 14px 16px; font-size: 15px; outline: none; margin-bottom: 16px; font-weight: 600; text-align: center; }
.otp-input:focus { border-color: #d4af37; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: 1px solid #d4af37; cursor: pointer; padding: 16px 24px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; transition: all 0.2s; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
.flow-btn:hover { background: transparent; color: #d4af37; }
.otp-error { min-height: 18px; color: #f87171; font-size: 12.5px; margin-bottom: 8px; font-weight: 600; text-align: left; }
.otp-status { min-height: 18px; color: #a1a1aa; font-size: 12px; margin-bottom: 10px; font-weight: 600; text-align: left; }
.otp-footnote { font-size: 11px; color: #71717a; margin-top: 16px; letter-spacing: 0.02em; }
`

const otpTemplate4Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-icon">&#x269C;</div>
    <h1 class="otp-title">Secure Access</h1>
    <p class="otp-subtitle">Enter your mobile number to receive a secure validation code via SMS.</p>
    
    <div style="margin-bottom: 16px;">
      <label class="otp-label">Mobile Number</label>
      <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
    </div>
    
    <button type="button" data-otp-action="send" class="flow-btn">Request Key</button>
    
    <div style="margin-bottom: 12px;">
      <label class="otp-label">Verification Code</label>
      <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Enter key" style="text-align: center;" />
    </div>
    
    <div data-otp-slot="error" class="otp-error"></div>
    <div data-otp-slot="status" class="otp-status"></div>
    
    <button type="button" data-otp-action="verify" class="flow-btn" style="background: transparent; color: #d4af37;">Confirm Entry</button>
    <p class="otp-footnote">Authentication secured by TemplateCraft</p>
  </div>
</div>
`
const wellnessOtpCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #1e1b4b; -webkit-font-smoothing: antialiased; }
.bf-wellness-container { width: 100%; max-width: 440px; margin: 0 auto; min-height: 100vh; padding: 24px 20px 40px; background: #ffffff; display: flex; flex-direction: column; }
.bf-brand-bar { display: flex; align-items: center; margin-bottom: 24px; }
.bf-orange-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.bf-orange-logo { background: #ff7900; color: #ffffff; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; text-transform: lowercase; }
.bf-orange-sub strong { color: #1e293b; }
.bf-service-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bf-dot-bullet { width: 10px; height: 10px; border-radius: 50%; background: #5b36d6; }
.bf-service-title { font-size: 15px; font-weight: 800; color: #281861; letter-spacing: 0.04em; }
.bf-stepper { display: flex; gap: 8px; margin-bottom: 28px; }
.bf-step-pill { height: 5px; flex: 1; border-radius: 99px; background: #e8e2fb; transition: background 0.3s; }
.bf-step-pill.active { background: #5b36d6; }
.bf-main-title { font-size: 28px; font-weight: 800; line-height: 1.2; color: #18113c; margin-bottom: 12px; letter-spacing: -0.02em; }
.bf-sub-title { font-size: 14.5px; color: #534d6f; line-height: 1.5; margin-bottom: 28px; }
.bf-field-group { margin-bottom: 20px; text-align: center; }
.bf-otp-input-wrap { display: flex; justify-content: center; margin-bottom: 14px; }
.bf-otp-code-input { width: 100%; max-width: 280px; height: 56px; border: 1.5px solid #dcd3f8; border-radius: 14px; background: #faf8ff; text-align: center; font-size: 24px; font-weight: 800; letter-spacing: 0.35em; color: #18113c; outline: none; }
.bf-otp-code-input:focus { border-color: #5b36d6; background: #ffffff; box-shadow: 0 0 0 3px rgba(91, 54, 214, 0.12); }
.bf-resend-row { margin: 10px 0 22px; text-align: center; font-size: 13.5px; }
.bf-resend-btn { background: none; border: none; padding: 0; color: #5b36d6; font-size: 13.5px; font-weight: 700; cursor: pointer; text-decoration: underline; }
.bf-resend-text { color: #7c7793; }
.bf-primary-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; background: #5b36d6; color: #ffffff; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(91, 54, 214, 0.25); margin-bottom: 12px; }
.bf-primary-btn:hover { background: #4e2ac9; }
.bf-primary-btn:active { transform: scale(0.985); }
.bf-error-slot { min-height: 18px; color: #dc2626; font-size: 12.5px; margin-bottom: 8px; text-align: center; font-weight: 600; }
.bf-status-slot { min-height: 18px; color: #16a34a; font-size: 12.5px; margin-bottom: 8px; text-align: center; font-weight: 600; }
`

const wellnessOtpHtml = `
<div class="bf-wellness-container">
  <div class="bf-brand-bar">
    <div class="bf-orange-pill">
      <span class="bf-orange-logo">orange</span>
      <span class="bf-orange-sub">Propulsé par <strong>Orange Burkina Faso</strong></span>
    </div>
  </div>
  <div class="bf-service-head">
    <div class="bf-dot-bullet"></div>
    <span class="bf-service-title">WELLNESS360</span>
  </div>
  <div class="bf-stepper">
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill"></div>
  </div>
  <h1 class="bf-main-title">Vérifiez votre<br />numéro</h1>
  <p class="bf-sub-title">Entrez le code de confirmation à 4 chiffres envoyé par SMS.</p>
  <div class="bf-field-group">
    <div class="bf-otp-input-wrap">
      <input class="bf-otp-code-input" data-otp-field="otp" inputmode="numeric" maxlength="4" placeholder="• • • •" />
    </div>
  </div>
  <div class="bf-resend-row">
    <button type="button" data-otp-action="send" class="bf-resend-btn">Renvoyer le code</button>
    <span class="bf-resend-text"> · vous n'avez rien reçu ?</span>
  </div>
  <div data-otp-slot="error" class="bf-error-slot"></div>
  <div data-otp-slot="status" class="bf-status-slot"></div>
  <button type="button" data-otp-action="verify" class="bf-primary-btn">Vérifier et continuer</button>
</div>
`

export const OTP_STARTER_TEMPLATES = [
  {
    id: 'otp-wellness',
    name: 'Wellness 360 (Orange BF)',
    description: 'Orange Burkina Faso Wellness 360 native French mobile entry & 4-digit OTP screen.',
    thumb: 'contact',
    previewImage: '',
    css: wellnessOtpCss,
    html: wellnessOtpHtml,
  },
  {
    id: 'otp-royal',
    name: 'Classic Royal Blue',
    description: 'Clean and modern card layout with blue details and solid verify buttons.',
    thumb: 'contact',
    previewImage: '',
    css: otpTemplate1Css,
    html: otpTemplate1Html,
  },
  {
    id: 'otp-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow layout card with thick black solid borders and bold outline styles.',
    thumb: 'gallery',
    previewImage: '',
    css: otpTemplate2Css,
    html: otpTemplate2Html,
  },
  {
    id: 'otp-aurora',
    name: 'Aurora Liquid Mesh',
    description: 'Liquid mesh gradient background with transparent frosted glass content card.',
    thumb: 'hero',
    previewImage: '',
    css: otpTemplate3Css,
    html: otpTemplate3Html,
  },
  {
    id: 'otp-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal card layout with refined golden outline borders and clean serif typography.',
    thumb: 'card',
    previewImage: '',
    css: otpTemplate4Css,
    html: otpTemplate4Html,
  },
]

// ----------------------------------------------------
// CONFIRM Page Templates
// ----------------------------------------------------
const confirmTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.confirm-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); }
.confirm-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; }
.confirm-bar { height: 6px; background: #4f46e5; }
.confirm-body { padding: 32px 24px; text-align: center; }
.confirm-icon { width: 56px; height: 56px; margin: 0 auto 16px; background: #eef2ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.confirm-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
.confirm-subtitle { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
.flow-info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 20px; }
.flow-info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; letter-spacing: 0.05em; }
.flow-info-value { font-size: 16px; font-weight: 700; color: #0f172a; word-break: break-all; }
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; letter-spacing: 0.05em; }
.flow-pack-list { display: flex; flex-direction: column; gap: 8px; }
.flow-pack-option { width: 100%; text-align: left; border: 2px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #fff; cursor: pointer; transition: all 0.15s; }
.flow-pack-option:hover { border-color: #cbd5e1; }
.flow-pack-option.flow-pack-selected { border-color: #4f46e5 !important; background: #f5f3ff !important; }
.flow-pack-name { display: block; font-size: 14px; font-weight: 700; color: #0f172a; }
.flow-pack-desc { display: block; font-size: 11px; color: #64748b; margin-top: 1px; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: none; cursor: pointer; padding: 14px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; color: #fff; background: #4f46e5; transition: background 0.2s; }
.flow-btn:hover { background: #4338ca; }
.flow-footnote { font-size: 11px; color: #94a3b8; margin-top: 14px; line-height: 1.5; }
`

const confirmTemplate1Html = `
<div class="confirm-container">
  <div class="confirm-card">
    <div class="confirm-bar"></div>
    <div class="confirm-body">
      <div class="confirm-icon">&#x1F48E;</div>
      <h1 class="confirm-title">Confirm Pack Plan</h1>
      <p class="confirm-subtitle">Select your subscription pack below to enable service delivery.</p>
      
      <div class="flow-info-card">
        <div class="flow-info-label">Active Account</div>
        <div class="flow-info-value">{{phone}}</div>
      </div>
      
      <div data-flow-pack-picker class="flow-pack-picker">
        <p class="flow-pack-title">Choose your pack</p>
        <div class="flow-pack-list">
          <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
            <span class="flow-pack-name">Daily Plan</span>
            <span class="flow-pack-desc">Standard daily pack</span>
          </button>
          <button type="button" data-pack="weekly" class="flow-pack-option">
            <span class="flow-pack-name">Weekly Plan</span>
            <span class="flow-pack-desc">Billed weekly</span>
          </button>
          <button type="button" data-pack="monthly" class="flow-pack-option">
            <span class="flow-pack-name">Monthly Plan</span>
            <span class="flow-pack-desc">Save up to 30% monthly</span>
          </button>
        </div>
      </div>
      
      <button type="button" data-action="CONFIRM" class="flow-btn">Confirm Subscription</button>
      <p class="flow-footnote">Charges will be billed to your mobile operator account. Cancel anytime.</p>
    </div>
  </div>
</div>
`

const confirmTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.confirm-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.confirm-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.confirm-icon { width: 56px; height: 56px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 4px 4px 0px #111827; }
.confirm-title { font-size: 24px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.confirm-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.flow-info-card { background: #fef08a; border: 3px solid #111827; border-radius: 0px; padding: 14px; text-align: left; margin-bottom: 20px; box-shadow: 4px 4px 0px #111827; }
.flow-info-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #111827; margin-bottom: 4px; letter-spacing: 0.08em; }
.flow-info-value { font-size: 16px; font-weight: 900; color: #111827; word-break: break-all; }
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #111827; margin-bottom: 10px; letter-spacing: 0.05em; }
.flow-pack-list { display: flex; flex-direction: column; gap: 8px; }
.flow-pack-option { width: 100%; text-align: left; border: 3px solid #111827; border-radius: 0px; padding: 12px 14px; background: #fff; cursor: pointer; transition: all 0.1s; box-shadow: 3px 3px 0px #111827; }
.flow-pack-option:hover { background: #fef9c3; }
.flow-pack-option.flow-pack-selected { background: #fef08a !important; }
.flow-pack-name { display: block; font-size: 14px; font-weight: 800; color: #111827; text-transform: uppercase; }
.flow-pack-desc { display: block; font-size: 11px; color: #374151; margin-top: 1px; font-weight: 600; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: 3px solid #111827; cursor: pointer; padding: 16px 24px; border-radius: 0px; font-size: 15.5px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0px #111827; transition: transform 0.1s; text-transform: uppercase; margin-bottom: 0; }
.flow-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #111827; }
.flow-footnote { font-size: 11px; color: #4b5563; margin-top: 16px; font-weight: 600; text-transform: uppercase; }
`

const confirmTemplate2Html = `
<div class="confirm-container">
  <div class="confirm-card">
    <div class="confirm-icon">&#x26A1;</div>
    <h1 class="confirm-title">Confirm Pack Plan</h1>
    <p class="confirm-subtitle">Select your subscription pack below to enable service delivery.</p>
    
    <div class="flow-info-card">
      <div class="flow-info-label">Active Account</div>
      <div class="flow-info-value">{{phone}}</div>
    </div>
    
    <div data-flow-pack-picker class="flow-pack-picker">
      <p class="flow-pack-title">Choose your pack</p>
      <div class="flow-pack-list">
        <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
          <span class="flow-pack-name">Daily Plan</span>
          <span class="flow-pack-desc">Standard daily pack</span>
        </button>
        <button type="button" data-pack="weekly" class="flow-pack-option">
          <span class="flow-pack-name">Weekly Plan</span>
          <span class="flow-pack-desc">Billed weekly</span>
        </button>
        <button type="button" data-pack="monthly" class="flow-pack-option">
          <span class="flow-pack-name">Monthly Plan</span>
          <span class="flow-pack-desc">Save up to 30% monthly</span>
        </button>
      </div>
    </div>
    
    <button type="button" data-action="CONFIRM" class="flow-btn">Confirm Subscription</button>
    <p class="flow-footnote">Charges billed to mobile operator account. Cancel anytime.</p>
  </div>
</div>
`

const confirmTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.confirm-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.confirm-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.confirm-icon { width: 56px; height: 56px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(212, 175, 55, 0.05); }
.confirm-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.confirm-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.flow-info-card { background: rgba(212, 175, 55, 0.05); border: 1px solid #d4af37; border-radius: 8px; padding: 14px; text-align: left; margin-bottom: 20px; }
.flow-info-label { font-size: 10px; font-weight: 700; color: #d4af37; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
.flow-info-value { font-size: 16px; font-weight: 700; color: #ffffff; word-break: break-all; }
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title { font-size: 10px; font-weight: 700; color: #d4af37; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
.flow-pack-list { display: flex; flex-direction: column; gap: 8px; }
.flow-pack-option { width: 100%; text-align: left; border: 1px solid #3f3f46; border-radius: 6px; padding: 12px 14px; background: #0f0f11; cursor: pointer; transition: all 0.15s; color: #e4e4e7; }
.flow-pack-option:hover { border-color: #d4af37; }
.flow-pack-option.flow-pack-selected { border-color: #d4af37 !important; background: rgba(212, 175, 55, 0.08) !important; }
.flow-pack-name { display: block; font-size: 14px; font-weight: 700; color: #ffffff; }
.flow-pack-desc { display: block; font-size: 11px; color: #71717a; margin-top: 1px; }
.flow-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; line-height: 1.25; width: 100%; border: 1px solid #d4af37; cursor: pointer; padding: 16px 24px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0; }
.flow-btn:hover { background: transparent; color: #d4af37; }
.flow-footnote { font-size: 11px; color: #71717a; margin-top: 16px; letter-spacing: 0.02em; }
`

const confirmTemplate3Html = `
<div class="confirm-container">
  <div class="confirm-card">
    <div class="confirm-icon">&#x269C;</div>
    <h1 class="confirm-title">Confirm Pack Plan</h1>
    <p class="confirm-subtitle">Select your subscription pack below to enable service delivery.</p>
    
    <div class="flow-info-card">
      <div class="flow-info-label">Active Account</div>
      <div class="flow-info-value">{{phone}}</div>
    </div>
    
    <div data-flow-pack-picker class="flow-pack-picker">
      <p class="flow-pack-title">Choose your pack</p>
      <div class="flow-pack-list">
        <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
          <span class="flow-pack-name">Daily Plan</span>
          <span class="flow-pack-desc">Standard daily pack</span>
        </button>
        <button type="button" data-pack="weekly" class="flow-pack-option">
          <span class="flow-pack-name">Weekly Plan</span>
          <span class="flow-pack-desc">Billed weekly</span>
        </button>
        <button type="button" data-pack="monthly" class="flow-pack-option">
          <span class="flow-pack-name">Monthly Plan</span>
          <span class="flow-pack-desc">Save up to 30% monthly</span>
        </button>
      </div>
    </div>
    
    <button type="button" data-action="CONFIRM" class="flow-btn">Confirm Subscription</button>
    <p class="flow-footnote">Charges billed to mobile operator account. Cancel anytime.</p>
  </div>
</div>
`
const wellnessConfirmCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #1e1b4b; -webkit-font-smoothing: antialiased; }
.bf-wellness-container { width: 100%; max-width: 440px; margin: 0 auto; min-height: 100vh; padding: 24px 20px 40px; background: #ffffff; display: flex; flex-direction: column; }
.bf-brand-bar { display: flex; align-items: center; margin-bottom: 24px; }
.bf-orange-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.bf-orange-logo { background: #ff7900; color: #ffffff; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; text-transform: lowercase; }
.bf-orange-sub strong { color: #1e293b; }
.bf-service-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bf-dot-bullet { width: 10px; height: 10px; border-radius: 50%; background: #5b36d6; }
.bf-service-title { font-size: 15px; font-weight: 800; color: #281861; letter-spacing: 0.04em; }
.bf-stepper { display: flex; gap: 8px; margin-bottom: 28px; }
.bf-step-pill { height: 5px; flex: 1; border-radius: 99px; background: #e8e2fb; transition: background 0.3s; }
.bf-step-pill.active { background: #5b36d6; }
.bf-main-title { font-size: 30px; font-weight: 800; line-height: 1.2; color: #18113c; margin-bottom: 20px; letter-spacing: -0.02em; }
.bf-category-grid { display: flex; gap: 8px; justify-content: space-between; margin-bottom: 24px; }
.bf-cat-card { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
.bf-cat-icon { width: 52px; height: 52px; border-radius: 14px; background: #f3f0fc; color: #5b36d6; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.bf-cat-label { font-size: 11px; font-weight: 600; color: #281861; white-space: nowrap; }
.bf-plan-card { background: #f8f6fe; border: 1.5px solid #e7dffc; border-radius: 20px; padding: 22px 20px; margin-bottom: 24px; }
.bf-plan-badge { display: inline-block; background: #5b36d6; color: #ffffff; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 8px; letter-spacing: 0.05em; margin-bottom: 12px; }
.bf-plan-price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px; }
.bf-plan-amount { font-size: 34px; font-weight: 900; color: #18113c; letter-spacing: -0.02em; }
.bf-plan-unit { font-size: 15px; font-weight: 500; color: #64748b; }
.bf-plan-desc { font-size: 14px; color: #453e66; line-height: 1.45; }
.bf-primary-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; background: #5b36d6; color: #ffffff; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(91, 54, 214, 0.25); text-decoration: none; }
.bf-primary-btn:hover { background: #4e2ac9; }
.bf-primary-btn:active { transform: scale(0.985); }
.bf-legal-note { font-size: 12px; color: #7c7793; line-height: 1.5; margin-top: 18px; text-align: left; }
.bf-error-slot { min-height: 18px; color: #dc2626; font-size: 12.5px; margin-top: 8px; text-align: center; font-weight: 600; }
.bf-status-slot { min-height: 18px; color: #16a34a; font-size: 12.5px; margin-top: 8px; text-align: center; font-weight: 600; }
`

const wellnessConfirmHtml = `
<div class="bf-wellness-container">
  <div class="bf-brand-bar">
    <div class="bf-orange-pill">
      <span class="bf-orange-logo">orange</span>
      <span class="bf-orange-sub">Propulsé par <strong>Orange Burkina Faso</strong></span>
    </div>
  </div>
  <div class="bf-service-head">
    <div class="bf-dot-bullet"></div>
    <span class="bf-service-title">WELLNESS360</span>
  </div>
  <div class="bf-stepper">
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill"></div>
    <div class="bf-step-pill"></div>
  </div>
  <h1 class="bf-main-title">Votre bien-être.<br />Chaque jour.</h1>
  <div class="bf-category-grid">
    <div class="bf-cat-card">
      <div class="bf-cat-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z"/></svg>
      </div>
      <span class="bf-cat-label">Exercice</span>
    </div>
    <div class="bf-cat-card">
      <div class="bf-cat-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"></circle><path d="M12 7v7l-4 3"></path><path d="M12 14l4 3"></path><path d="M7 11h10"></path></svg>
      </div>
      <span class="bf-cat-label">Yoga</span>
    </div>
    <div class="bf-cat-card">
      <div class="bf-cat-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="2"></circle><path d="M6 18c0-3 3-5 6-5s6 2 6 5"></path><path d="M4 21c0-2 4-3 8-3s8 1 8 3"></path></svg>
      </div>
      <span class="bf-cat-label">Méditation</span>
    </div>
    <div class="bf-cat-card">
      <div class="bf-cat-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="5" r="2"></circle><path d="M14 8l-3 4-4-1"></path><path d="M11 12l2 4 4 4"></path><path d="M13 16l-4 5"></path></svg>
      </div>
      <span class="bf-cat-label">Zumba</span>
    </div>
    <div class="bf-cat-card">
      <div class="bf-cat-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M12 7v2"></path><path d="M11 8h2"></path></svg>
      </div>
      <span class="bf-cat-label">Expert IA</span>
    </div>
  </div>
  <div class="bf-plan-card">
    <div class="bf-plan-badge">FORFAIT JOUR</div>
    <div class="bf-plan-price-row">
      <span class="bf-plan-amount">50 FCFA</span>
      <span class="bf-plan-unit">/ jour</span>
    </div>
    <p class="bf-plan-desc">Accédez aux contenus et services bien-être de Wellness360.</p>
  </div>
  <button type="button" data-otp-action="send" class="bf-primary-btn">S'abonner</button>
  <div data-otp-slot="error" class="bf-error-slot"></div>
  <div data-otp-slot="status" class="bf-status-slot"></div>
  <p class="bf-legal-note">
    En appuyant sur « S'abonner », vous acceptez de vous abonner au Forfait Jour Wellness360 à 50 FCFA/jour. Les frais d'abonnement seront déduits de votre solde mobile.
  </p>
</div>
`

export const CONFIRM_STARTER_TEMPLATES = [
  {
    id: 'confirm-wellness',
    name: 'Wellness 360 (Orange BF)',
    description: 'Orange Burkina Faso Wellness 360 Plan Selection and Subscription screen.',
    thumb: 'pricing',
    previewImage: '',
    css: wellnessConfirmCss,
    html: wellnessConfirmHtml,
  },
  {
    id: 'confirm-classic',
    name: 'Classic Royal Blue',
    description: 'Clean white container card with pack option selectors and Indigo buttons.',
    thumb: 'pricing',
    previewImage: '',
    css: confirmTemplate1Css,
    html: confirmTemplate1Html,
  },
  {
    id: 'confirm-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow layout with thick black borders and bold uppercase typography.',
    thumb: 'card',
    previewImage: '',
    css: confirmTemplate2Css,
    html: confirmTemplate2Html,
  },
  {
    id: 'confirm-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal card layout with refined golden outline borders and clean serif typography.',
    thumb: 'card',
    previewImage: '',
    css: confirmTemplate3Css,
    html: confirmTemplate3Html,
  },
]

// ----------------------------------------------------
// HOME Page Templates
// Flat, mobile-first cards — every text/button is a single
// GrapesJS-selectable node (no nested span+text that breaks editing).
// ----------------------------------------------------
const homeTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.home-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%); }
.home-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px -12px rgba(15,23,42,0.1); border: 1px solid #e2e8f0; padding: 32px 28px; text-align: center; }
.home-logo { width: 64px; height: 64px; margin: 0 auto 16px; display: block; border-radius: 16px; object-fit: cover; }
.home-badge { display: inline-block; margin: 0 0 12px; padding: 5px 12px; font-size: 11px; font-weight: 700; color: #4f46e5; background: #e0e7ff; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
.home-title { margin: 0 0 10px; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0f172a; letter-spacing: -0.02em; }
.home-subtitle { margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #64748b; }
.home-feature { margin: 0 0 10px; padding: 10px 12px; font-size: 13px; line-height: 1.4; color: #334155; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
.home-feature:last-of-type { margin-bottom: 20px; }
.flow-btn { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; border: none; cursor: pointer; padding: 14px 20px; border-radius: 12px; font-size: 16px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.35); }
.flow-btn:active { transform: scale(0.98); }
.home-footnote { margin-top: 14px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
`

const homeTemplate1Html = `
<div class="home-page">
  <div class="home-card">
    <img data-tc-type="image" class="home-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%236366f1'/%3E%3Crect x='22' y='14' width='20' height='36' rx='3' fill='none' stroke='%23ffffff' stroke-width='2.5'/%3E%3Ccircle cx='32' cy='42' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E" alt="Service logo" />
    <p class="home-badge">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <p class="home-feature">&#x2713; Instant activation on {{operator}}</p>
    <p class="home-feature">&#x2713; Cancel anytime from your phone</p>
    <p class="home-feature">&#x2713; Secure operator billing</p>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`

const homePacksHtml = `
<div class="home-page">
  <div class="home-card">
    <p class="home-badge">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Choose your pack</h1>
    <p class="home-subtitle">Daily, weekly, or monthly &#x2014; billed on your {{operator}} number. Optional pattern; Home can be anything.</p>
    <button type="button" data-action="CONFIRM" data-pack="daily" class="flow-btn" style="margin-bottom:8px;">Daily Pack</button>
    <button type="button" data-action="CONFIRM" data-pack="weekly" class="flow-btn" style="margin-bottom:8px;">Weekly Pack</button>
    <button type="button" data-action="CONFIRM" data-pack="monthly" class="flow-btn">Monthly Pack</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`

const homeTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.home-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: #fefce8; }
.home-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0; padding: 36px 28px; text-align: center; box-shadow: 8px 8px 0 #111827; }
.home-logo { width: 56px; height: 56px; margin: 0 auto 16px; display: block; border: 3px solid #111827; box-shadow: 3px 3px 0 #111827; object-fit: cover; }
.home-badge { display: inline-block; margin: 0 0 12px; padding: 4px 10px; font-size: 11px; font-weight: 900; color: #111827; background: #fef08a; border: 2px solid #111827; text-transform: uppercase; letter-spacing: 0.04em; }
.home-title { margin: 0 0 10px; font-size: 24px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: -0.01em; line-height: 1.2; }
.home-subtitle { margin: 0 0 20px; font-size: 13.5px; color: #374151; line-height: 1.6; font-weight: 500; }
.home-feature { margin: 0 0 10px; padding: 10px 12px; font-size: 13px; color: #111827; text-align: left; font-weight: 700; background: #fff; border: 2px solid #111827; box-shadow: 2px 2px 0 #111827; }
.home-feature:last-of-type { margin-bottom: 20px; }
.flow-btn { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; border: 3px solid #111827; cursor: pointer; padding: 14px 20px; border-radius: 0; font-size: 15px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0 #111827; text-transform: uppercase; }
.flow-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #111827; }
.home-footnote { margin-top: 14px; font-size: 11px; color: #4b5563; font-weight: 600; text-transform: uppercase; }
`

const homeTemplate2Html = `
<div class="home-page">
  <div class="home-card">
    <img data-tc-type="image" class="home-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Crect width='56' height='56' fill='%23fef08a'/%3E%3Ctext x='28' y='36' text-anchor='middle' font-size='28'%3E%F0%9F%93%B1%3C/text%3E%3C/svg%3E" alt="Service logo" />
    <p class="home-badge">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <p class="home-feature">&#x2713; Instant activation on {{operator}}</p>
    <p class="home-feature">&#x2713; Cancel anytime from your phone</p>
    <p class="home-feature">&#x2713; Secure operator billing</p>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`

const homeTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.home-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: #0a0a0b; }
.home-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 36px 28px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.home-logo { width: 56px; height: 56px; margin: 0 auto 16px; display: block; border: 1px solid #d4af37; border-radius: 50%; object-fit: cover; background: rgba(212,175,55,0.08); }
.home-badge { display: inline-block; margin: 0 0 12px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #d4af37; background: rgba(212,175,55,0.1); border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #d4af37; }
.home-title { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #ffffff; font-family: Georgia, serif; letter-spacing: 0.02em; line-height: 1.25; }
.home-subtitle { margin: 0 0 20px; font-size: 13.5px; color: #a1a1aa; line-height: 1.6; }
.home-feature { margin: 0 0 10px; padding: 10px 12px; font-size: 13px; color: #e4e4e7; text-align: left; background: #0f0f11; border: 1px solid #3f3f46; border-radius: 8px; }
.home-feature:last-of-type { margin-bottom: 20px; }
.flow-btn { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; border: 1px solid #d4af37; cursor: pointer; padding: 14px 20px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; text-transform: uppercase; letter-spacing: 0.04em; }
.flow-btn:hover { background: transparent; color: #d4af37; }
.home-footnote { margin-top: 14px; font-size: 11px; color: #71717a; line-height: 1.5; letter-spacing: 0.02em; }
`

const homeTemplate3Html = `
<div class="home-page">
  <div class="home-card">
    <img data-tc-type="image" class="home-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Ccircle cx='28' cy='28' r='27' fill='%2318181b' stroke='%23d4af37'/%3E%3Ctext x='28' y='34' text-anchor='middle' font-size='22' fill='%23d4af37'%3E%E2%99%9C%3C/text%3E%3C/svg%3E" alt="Service logo" />
    <p class="home-badge">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <p class="home-feature">&#x2713; Instant activation on {{operator}}</p>
    <p class="home-feature">&#x2713; Cancel anytime from your phone</p>
    <p class="home-feature">&#x2713; Secure operator billing</p>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`
const wellnessHomeCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #1e1b4b; -webkit-font-smoothing: antialiased; }
.bf-wellness-container { width: 100%; max-width: 440px; margin: 0 auto; min-height: 100vh; padding: 24px 20px 40px; background: #ffffff; display: flex; flex-direction: column; }
.bf-brand-bar { display: flex; align-items: center; margin-bottom: 24px; }
.bf-orange-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.bf-orange-logo { background: #ff7900; color: #ffffff; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; text-transform: lowercase; }
.bf-orange-sub strong { color: #1e293b; }
.bf-service-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bf-dot-bullet { width: 10px; height: 10px; border-radius: 50%; background: #5b36d6; }
.bf-service-title { font-size: 15px; font-weight: 800; color: #281861; letter-spacing: 0.04em; }
.bf-stepper { display: flex; gap: 8px; margin-bottom: 28px; }
.bf-step-pill { height: 5px; flex: 1; border-radius: 99px; background: #e8e2fb; transition: background 0.3s; }
.bf-step-pill.active { background: #5b36d6; }
.bf-main-title { font-size: 30px; font-weight: 800; line-height: 1.2; color: #18113c; margin-bottom: 12px; letter-spacing: -0.02em; }
.bf-sub-title { font-size: 15px; color: #534d6f; line-height: 1.5; margin-bottom: 28px; }
.bf-field-group { margin-bottom: 20px; text-align: left; }
.bf-input-label { display: block; font-size: 11.5px; font-weight: 800; color: #534d6f; letter-spacing: 0.06em; margin-bottom: 10px; }
.bf-phone-input-wrap { display: flex; align-items: center; border: 1.5px solid #dcd3f8; border-radius: 14px; background: #faf8ff; padding: 4px 14px; height: 56px; transition: border-color 0.2s; }
.bf-phone-input-wrap:focus-within { border-color: #5b36d6; background: #ffffff; box-shadow: 0 0 0 3px rgba(91, 54, 214, 0.12); }
.bf-country-prefix { font-size: 17px; font-weight: 800; color: #18113c; padding-right: 10px; }
.bf-input-divider { width: 1.5px; height: 24px; background: #dcd3f8; margin-right: 12px; }
.bf-phone-input { flex: 1; border: none; background: transparent; font-size: 17px; font-weight: 600; color: #18113c; outline: none; letter-spacing: 0.05em; }
.bf-primary-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; background: #5b36d6; color: #ffffff; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(91, 54, 214, 0.25); text-decoration: none; }
.bf-primary-btn:hover { background: #4e2ac9; }
.bf-primary-btn:active { transform: scale(0.985); }
.bf-error-slot { min-height: 18px; color: #dc2626; font-size: 12.5px; margin-top: 8px; text-align: center; font-weight: 600; }
`

const wellnessHomeHtml = `
<div class="bf-wellness-container">
  <div class="bf-brand-bar">
    <div class="bf-orange-pill">
      <span class="bf-orange-logo">orange</span>
      <span class="bf-orange-sub">Propulsé par <strong>Orange Burkina Faso</strong></span>
    </div>
  </div>
  <div class="bf-service-head">
    <div class="bf-dot-bullet"></div>
    <span class="bf-service-title">WELLNESS360</span>
  </div>
  <div class="bf-stepper">
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill"></div>
    <div class="bf-step-pill"></div>
    <div class="bf-step-pill"></div>
  </div>
  <h1 class="bf-main-title">Bienvenue sur<br />Wellness360</h1>
  <p class="bf-sub-title">Votre compagnon quotidien pour une vie plus saine.</p>
  <div class="bf-field-group">
    <label class="bf-input-label">ENTREZ VOTRE NUMÉRO DE MOBILE</label>
    <div class="bf-phone-input-wrap">
      <div class="bf-country-prefix">+226</div>
      <div class="bf-input-divider"></div>
      <input class="bf-phone-input" data-otp-field="phone" inputmode="numeric" placeholder="XX XX XX XX" />
    </div>
  </div>
  <button type="button" data-action="SUBSCRIBE" class="bf-primary-btn">Continuer</button>
  <div data-otp-slot="error" class="bf-error-slot"></div>
</div>
`

export const HOME_STARTER_TEMPLATES = [
  {
    id: 'home-wellness',
    name: 'Wellness 360 (Orange BF)',
    description: 'Orange Burkina Faso Wellness 360 native French plan & offer landing page.',
    thumb: 'hero',
    previewImage: '',
    css: wellnessHomeCss,
    html: wellnessHomeHtml,
  },
  {
    id: 'home-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'Bold yellow card with thick borders — every line editable.',
    thumb: 'gallery',
    previewImage: '',
    css: homeTemplate2Css,
    html: homeTemplate2Html,
  },
  {
    id: 'home-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Dark charcoal + gold — logo and copy fully editable.',
    thumb: 'card',
    previewImage: '',
    css: homeTemplate3Css,
    html: homeTemplate3Html,
  },
]

// ----------------------------------------------------
// THANKYOU Page Templates
// ----------------------------------------------------
const thankyouTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.thankyou-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); }
.thankyou-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.05); border: 1px solid #e2e8f0; overflow: hidden; padding: 36px 28px; text-align: center; }
.thankyou-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.thankyou-title { font-size: 22px; font-weight: 850; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.02em; }
.thankyou-subtitle { font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.5; font-weight: 500; }
.thankyou-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 16px; text-align: left; font-size: 13px; color: #166534; line-height: 1.6; }
.thankyou-footnote { font-size: 11px; color: #94a3b8; margin-top: 20px; }
`

const thankyouTemplate1Html = `
<div class="thankyou-container">
  <div class="thankyou-card">
    <div class="thankyou-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    <h1 class="thankyou-title">You're Subscribed!</h1>
    <p class="thankyou-subtitle">Your subscription plan is now active on <strong>{{operator}}</strong>.</p>
    <div class="thankyou-box">
      <strong>What's next?</strong><br />
      A confirmation SMS has been sent to {{phone}}. Start using your premium service by opening it from your mobile browser.
    </div>
    <p class="thankyou-footnote">Authentication powered by TemplateCraft</p>
  </div>
</div>
`

const thankyouTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.thankyou-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.thankyou-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.thankyou-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 4px 4px 0px #111827; }
.thankyou-title { font-size: 26px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.thankyou-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.thankyou-box { background: #fef08a; border: 3px solid #111827; border-radius: 0px; padding: 16px; text-align: left; font-size: 13px; color: #111827; line-height: 1.6; font-weight: 600; box-shadow: 4px 4px 0px #111827; }
.thankyou-footnote { font-size: 11px; color: #4b5563; margin-top: 20px; font-weight: 600; text-transform: uppercase; }
`

const thankyouTemplate2Html = `
<div class="thankyou-container">
  <div class="thankyou-card">
    <div class="thankyou-icon">&#x2713;</div>
    <h1 class="thankyou-title">Subscribed!</h1>
    <p class="thankyou-subtitle">Your subscription plan is now active on <strong>{{operator}}</strong>.</p>
    <div class="thankyou-box">
      <strong>What's next?</strong><br />
      A confirmation SMS has been sent to {{phone}}. Start using your premium service by opening it from your mobile browser.
    </div>
    <p class="thankyou-footnote">Powered by TemplateCraft</p>
  </div>
</div>
`

const thankyouTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.thankyou-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.thankyou-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.thankyou-icon { width: 64px; height: 64px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(212, 175, 55, 0.05); }
.thankyou-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.thankyou-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.thankyou-box { background: rgba(212, 175, 55, 0.05); border: 1px solid #d4af37; border-radius: 8px; padding: 16px; text-align: left; font-size: 13px; color: #d4af37; line-height: 1.6; }
.thankyou-footnote { font-size: 11px; color: #71717a; margin-top: 20px; letter-spacing: 0.02em; }
`

const thankyouTemplate3Html = `
<div class="thankyou-container">
  <div class="thankyou-card">
    <div class="thankyou-icon">&#x269C;</div>
    <h1 class="thankyou-title">You're Subscribed!</h1>
    <p class="thankyou-subtitle">Your subscription plan is now active on <strong>{{operator}}</strong>.</p>
    <div class="thankyou-box">
      <strong>What's next?</strong><br />
      A confirmation SMS has been sent to {{phone}}. Start using your premium service by opening it from your mobile browser.
    </div>
    <p class="thankyou-footnote">Authentication powered by TemplateCraft</p>
  </div>
</div>
`
const wellnessThankyouCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #1e1b4b; -webkit-font-smoothing: antialiased; }
.bf-wellness-container { width: 100%; max-width: 440px; margin: 0 auto; min-height: 100vh; padding: 24px 20px 40px; background: #ffffff; display: flex; flex-direction: column; }
.bf-brand-bar { display: flex; align-items: center; margin-bottom: 24px; }
.bf-orange-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.bf-orange-logo { background: #ff7900; color: #ffffff; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px; text-transform: lowercase; }
.bf-orange-sub strong { color: #1e293b; }
.bf-service-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bf-dot-bullet { width: 10px; height: 10px; border-radius: 50%; background: #5b36d6; }
.bf-service-title { font-size: 15px; font-weight: 800; color: #281861; letter-spacing: 0.04em; }
.bf-stepper { display: flex; gap: 8px; margin-bottom: 32px; }
.bf-step-pill { height: 5px; flex: 1; border-radius: 99px; background: #e8e2fb; transition: background 0.3s; }
.bf-step-pill.active { background: #5b36d6; }
.bf-thankyou-body { padding-top: 24px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.bf-success-badge { width: 72px; height: 72px; border-radius: 50%; background: #e8faec; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
.bf-thankyou-title { font-size: 28px; font-weight: 800; color: #18113c; margin-bottom: 14px; }
.bf-thankyou-message { font-size: 15px; color: #534d6f; line-height: 1.6; margin-bottom: 36px; max-width: 320px; }
.bf-separator { width: 100%; height: 1px; background: #e8e2fb; margin-bottom: 24px; }
.bf-footer-brand { text-align: center; }
.bf-footer-logo { font-size: 15px; font-weight: 800; color: #281861; letter-spacing: 0.04em; margin-bottom: 4px; }
.bf-footer-tagline { font-size: 13px; color: #7c7793; }
`

const wellnessThankyouHtml = `
<div class="bf-wellness-container">
  <!-- Brand Top Bar -->
  <div class="bf-brand-bar">
    <div class="bf-orange-pill">
      <span class="bf-orange-logo">orange</span>
      <span class="bf-orange-sub">Propulsé par <strong>Orange Burkina Faso</strong></span>
    </div>
  </div>

  <!-- Service Sub-brand -->
  <div class="bf-service-head">
    <div class="bf-dot-bullet"></div>
    <span class="bf-service-title">WELLNESS360</span>
  </div>

  <!-- Progress Bar (Step 4 of 4) -->
  <div class="bf-stepper">
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
    <div class="bf-step-pill active"></div>
  </div>

  <!-- Thank You Body -->
  <div class="bf-thankyou-body">
    <div class="bf-success-badge">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <h1 class="bf-thankyou-title">Merci !</h1>
    <p class="bf-thankyou-message">
      Votre demande a été traitée.<br />
      Vous recevrez un message de confirmation sous peu.
    </p>

    <div class="bf-separator"></div>

    <div class="bf-footer-brand">
      <div class="bf-footer-logo">WELLNESS360</div>
      <div class="bf-footer-tagline">Vous connecter à une vie saine</div>
    </div>
  </div>
</div>
`

export const THANKYOU_STARTER_TEMPLATES = [
  {
    id: 'thankyou-wellness',
    name: 'Wellness 360 (Orange BF)',
    description: 'Orange Burkina Faso Wellness 360 native French confirmation & success page.',
    thumb: 'cta',
    previewImage: '',
    css: wellnessThankyouCss,
    html: wellnessThankyouHtml,
  },
  {
    id: 'thankyou-classic',
    name: 'Classic Royal Blue',
    description: 'Clean success card featuring verification tick mark SVGs and helper boxes.',
    thumb: 'cta',
    previewImage: '',
    css: thankyouTemplate1Css,
    html: thankyouTemplate1Html,
  },
  {
    id: 'thankyou-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow success layout with thick black borders and bold uppercase typography.',
    thumb: 'cta',
    previewImage: '',
    css: thankyouTemplate2Css,
    html: thankyouTemplate2Html,
  },
  {
    id: 'thankyou-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal success layout with refined golden borders and clean serif typography.',
    thumb: 'cta',
    previewImage: '',
    css: thankyouTemplate3Css,
    html: thankyouTemplate3Html,
  },
]

// ----------------------------------------------------
// BLOCKED Page Templates
// ----------------------------------------------------
const blockedTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.blocked-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.blocked-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.05); border: 1px solid #e2e8f0; overflow: hidden; padding: 36px 28px; text-align: center; }
.blocked-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.blocked-title { font-size: 20px; font-weight: 855; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.01em; }
.blocked-subtitle { font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5; font-weight: 500; }
.blocked-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 16px; text-align: left; font-size: 13px; color: #991b1b; line-height: 1.6; }
`

const blockedTemplate1Html = `
<div class="blocked-container">
  <div class="blocked-card">
    <div class="blocked-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>
    </div>
    <h1 class="blocked-title">Not Eligible</h1>
    <p class="blocked-subtitle">Sorry, <strong>{{phone}}</strong> is not eligible to subscribe to this service.</p>
    <div class="blocked-box">
      This may be due to active DND (Do Not Disturb) settings, carrier restriction profiles, or insufficient account balance.
    </div>
  </div>
</div>
`

const blockedTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.blocked-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.blocked-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.blocked-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 4px 4px 0px #111827; }
.blocked-title { font-size: 26px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.blocked-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.blocked-box { background: #fef08a; border: 3px solid #111827; border-radius: 0px; padding: 16px; text-align: left; font-size: 13px; color: #111827; line-height: 1.6; font-weight: 600; box-shadow: 4px 4px 0px #111827; }
`

const blockedTemplate2Html = `
<div class="blocked-container">
  <div class="blocked-card">
    <div class="blocked-icon">&#x2717;</div>
    <h1 class="blocked-title">Not Eligible</h1>
    <p class="blocked-subtitle">Sorry, <strong>{{phone}}</strong> is not eligible to subscribe to this service.</p>
    <div class="blocked-box">
      This may be due to active DND (Do Not Disturb) settings, carrier restriction profiles, or insufficient account balance.
    </div>
  </div>
</div>
`

const blockedTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.blocked-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.blocked-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.blocked-icon { width: 64px; height: 64px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(212, 175, 55, 0.05); }
.blocked-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.blocked-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.blocked-box { background: rgba(212, 175, 55, 0.05); border: 1px solid #d4af37; border-radius: 8px; padding: 16px; text-align: left; font-size: 13px; color: #d4af37; line-height: 1.6; }
`

const blockedTemplate3Html = `
<div class="blocked-container">
  <div class="blocked-card">
    <div class="blocked-icon">&#x269C;</div>
    <h1 class="blocked-title">Not Eligible</h1>
    <p class="blocked-subtitle">Sorry, <strong>{{phone}}</strong> is not eligible to subscribe to this service.</p>
    <div class="blocked-box">
      This may be due to active DND (Do Not Disturb) settings, carrier restriction profiles, or insufficient account balance.
    </div>
  </div>
</div>
`

export const BLOCKED_STARTER_TEMPLATES = [
  {
    id: 'blocked-classic',
    name: 'Classic Royal Blue',
    description: 'Polished restriction card screen layout with clear descriptions and warning indicators.',
    thumb: 'contact',
    previewImage: '',
    css: blockedTemplate1Css,
    html: blockedTemplate1Html,
  },
  {
    id: 'blocked-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow restriction layout with thick black borders and bold uppercase typography.',
    thumb: 'contact',
    previewImage: '',
    css: blockedTemplate2Css,
    html: blockedTemplate2Html,
  },
  {
    id: 'blocked-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal restriction layout with refined golden borders and clean serif typography.',
    thumb: 'contact',
    previewImage: '',
    css: blockedTemplate3Css,
    html: blockedTemplate3Html,
  },
]

// ----------------------------------------------------
// ERROR Page Templates
// ----------------------------------------------------
const errorTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.error-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.error-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.05); border: 1px solid #e2e8f0; overflow: hidden; padding: 36px 28px; text-align: center; }
.error-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fff7ed; color: #f97316; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.error-title { font-size: 20px; font-weight: 855; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.01em; }
.error-subtitle { font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5; font-weight: 500; }
.error-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 16px; padding: 16px; text-align: left; font-size: 13px; color: #9a3412; line-height: 1.6; }
`

const errorTemplate1Html = `
<div class="error-container">
  <div class="error-card">
    <div class="error-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <h1 class="error-title">Transaction Failed</h1>
    <p class="error-subtitle">We encountered an issue during activation on {{phone}}.</p>
    <div class="error-box">
      No billing charges were applied. Please try again in a few minutes, or verify your network connection details.
    </div>
  </div>
</div>
`

const errorTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.error-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.error-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.error-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 4px 4px 0px #111827; }
.error-title { font-size: 26px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.error-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.error-box { background: #fef08a; border: 3px solid #111827; border-radius: 0px; padding: 16px; text-align: left; font-size: 13px; color: #111827; line-height: 1.6; font-weight: 600; box-shadow: 4px 4px 0px #111827; }
`

const errorTemplate2Html = `
<div class="error-container">
  <div class="error-card">
    <div class="error-icon">&#x26A0;</div>
    <h1 class="error-title">Transaction Failed</h1>
    <p class="error-subtitle">We encountered an issue during activation on {{phone}}.</p>
    <div class="error-box">
      No billing charges were applied. Please try again in a few minutes, or verify your network connection details.
    </div>
  </div>
</div>
`

const errorTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.error-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.error-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.error-icon { width: 64px; height: 64px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(212, 175, 55, 0.05); }
.error-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.error-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.error-box { background: rgba(212, 175, 55, 0.05); border: 1px solid #d4af37; border-radius: 8px; padding: 16px; text-align: left; font-size: 13px; color: #d4af37; line-height: 1.6; }
`

const errorTemplate3Html = `
<div class="error-container">
  <div class="error-card">
    <div class="error-icon">&#x269C;</div>
    <h1 class="error-title">Transaction Failed</h1>
    <p class="error-subtitle">We encountered an issue during activation on {{phone}}.</p>
    <div class="error-box">
      No billing charges were applied. Please try again in a few minutes, or verify your network connection details.
    </div>
  </div>
</div>
`

const statusPageCss = `
.flow-root { font-family: Inter, system-ui, sans-serif; min-height: 100vh; background: #f8fafc; padding: 24px 16px; }
.flow-card { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 20px; box-shadow: 0 12px 40px rgba(15,23,42,0.08); overflow: hidden; }
.flow-accent { height: 6px; }
.flow-body { padding: 36px 28px 32px; text-align: center; }
.flow-icon { width: 72px; height: 72px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; }
.flow-title { margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #0f172a; }
.flow-text { margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #64748b; }
.flow-note { margin: 0 0 20px; font-size: 13px; color: #94a3b8; }
.flow-box { border-radius: 12px; padding: 14px; font-size: 13px; text-align: left; }
`

export const INPROGRESS_STARTER_TEMPLATES = [
  {
    id: 'inprogress-classic',
    name: 'In Progress (Safwap)',
    description: 'Subscription pending / in-progress status page.',
    thumb: 'hero',
    previewImage: '',
    css: statusPageCss,
    html: `
<div class="flow-root">
  <div class="flow-card">
    <div class="flow-accent" style="background:#3b82f6;"></div>
    <div class="flow-body">
      <div class="flow-icon" style="background:#eff6ff;">⏳</div>
      <h1 class="flow-title">Subscription In Progress</h1>
      <p class="flow-text">Your subscription request is currently being processed.</p>
      <p class="flow-note">Please wait a moment. You may receive an SMS on {{phone}} once it completes.</p>
      <div class="flow-box" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;">
        No further action is needed right now. If this takes too long, try again later or contact {{operator}} support.
      </div>
    </div>
  </div>
</div>
`,
  },
]

export const LOW_BALANCE_STARTER_TEMPLATES = [
  {
    id: 'low-balance-classic',
    name: 'Low Balance (Safwap)',
    description: 'Parking / grace / insufficient balance status page.',
    thumb: 'hero',
    previewImage: '',
    css: statusPageCss,
    html: `
<div class="flow-root">
  <div class="flow-card">
    <div class="flow-accent" style="background:#f59e0b;"></div>
    <div class="flow-body">
      <div class="flow-icon" style="background:#fff7ed;">💳</div>
      <h1 class="flow-title">Low Balance</h1>
      <p class="flow-text">You currently have insufficient balance to complete your subscription.</p>
      <p class="flow-note">Top up {{phone}} on {{operator}} and try again.</p>
      <div class="flow-box" style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;">
        Your number may already be registered. After recharging, the service can activate automatically or on your next visit.
      </div>
    </div>
  </div>
</div>
`,
  },
]

export const ERROR_STARTER_TEMPLATES = [
  {
    id: 'error-classic',
    name: 'Classic Royal Blue',
    description: 'Polished error page layout featuring clean alert boxes and warning illustrations.',
    thumb: 'hero',
    previewImage: '',
    css: errorTemplate1Css,
    html: errorTemplate1Html,
  },
  {
    id: 'error-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow error layout with thick black borders and bold uppercase typography.',
    thumb: 'hero',
    previewImage: '',
    css: errorTemplate2Css,
    html: errorTemplate2Html,
  },
  {
    id: 'error-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal error layout with refined golden borders and clean serif typography.',
    thumb: 'hero',
    previewImage: '',
    css: errorTemplate3Css,
    html: errorTemplate3Html,
  },
]

export const DEFAULT_PAGES = [
  { id: 'home', name: 'Home' },
  { id: 'about', name: 'About' },
  { id: 'services', name: 'Services' },
  { id: 'contact', name: 'Contact' },
  { id: 'blog', name: 'Blog' },
]
