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
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 13px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; color: #fff; background: #2563eb; transition: background 0.2s; margin-bottom: 12px; }
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
.flow-btn { width: 100%; border: 3px solid #111827; cursor: pointer; padding: 16px 24px; border-radius: 0px; font-size: 15.5px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0px #111827; transition: transform 0.1s; margin-bottom: 16px; text-transform: uppercase; }
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
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 16px 24px; border-radius: 16px; font-size: 15.5px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #ec4899, #8b5cf6); box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3); transition: all 0.2s; margin-bottom: 16px; }
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
.flow-btn { width: 100%; border: 1px solid #d4af37; cursor: pointer; padding: 16px 24px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; transition: all 0.2s; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
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
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-otp-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }
.invisible-input { position: absolute; background: rgba(255,255,255,0.1); border: 1px dashed rgba(255,255,255,0.4); outline: none; color: transparent; text-shadow: 0 0 0 #000; font-size: 16px; text-align: center; }
`

const wellnessOtpHtml = `
<div class="wellness-otp-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
  
  <!-- Invisible input for phone -->
  <input class="invisible-input" data-otp-field="phone" inputmode="numeric" style="width:50%; height:8%; top:50%; left:25%;" />
  
  <!-- Invisible button for Get Verification -->
  <button type="button" data-otp-action="send" style="position:absolute;width:50%;height:8%;top:60%;left:25%;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.4);color:transparent;cursor:pointer;"></button>
  
  <!-- Invisible input for OTP -->
  <input class="invisible-input" data-otp-field="otp" inputmode="numeric" style="width:50%; height:8%; top:70%; left:25%;" />
  
  <!-- Invisible button for Verify -->
  <button type="button" data-otp-action="verify" style="position:absolute;width:50%;height:8%;top:80%;left:25%;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.4);color:transparent;cursor:pointer;"></button>
</div>
`

export const OTP_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'otp-wellness',
    name: 'Wellness 360',
    description: 'Image-based Wellness 360 OTP with invisible interactive hotspots.',
    thumb: 'image',
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
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 14px 20px; border-radius: 8px; font-size: 15px; font-weight: 600; color: #fff; background: #4f46e5; transition: background 0.2s; }
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
.flow-btn { width: 100%; border: 3px solid #111827; cursor: pointer; padding: 16px 24px; border-radius: 0px; font-size: 15.5px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0px #111827; transition: transform 0.1s; text-transform: uppercase; margin-bottom: 0; }
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
.flow-btn { width: 100%; border: 1px solid #d4af37; cursor: pointer; padding: 16px 24px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0; }
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
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-confirm-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }
`

const wellnessConfirmHtml = `
<div class="wellness-confirm-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
  
  <!-- Invisible button for Confirm -->
  <button type="button" data-action="CONFIRM" style="position:absolute;width:50%;height:10%;top:70%;left:25%;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.4);color:transparent;cursor:pointer;"></button>
</div>
`

export const CONFIRM_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'confirm-wellness',
    name: 'Wellness 360',
    description: 'Image-based Wellness 360 Confirm with invisible interactive hotspots.',
    thumb: 'image',
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
// ----------------------------------------------------
const homeTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; }
.home-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%); }
.home-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.04); overflow: hidden; }
.home-bar { height: 6px; background: linear-gradient(90deg, #6366f1, #3b82f6); }
.home-body { padding: 36px 32px 32px; text-align: center; }
.home-icon { width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #3b82f6); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2); }
.home-title { margin: 0 0 12px; font-size: 24px; font-weight: 850; line-height: 1.25; color: #0f172a; letter-spacing: -0.02em; }
.home-subtitle { margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569; font-weight: 500; }
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 16px 24px; border-radius: 16px; font-size: 16px; font-weight: 750; color: #fff; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.35); transition: all 0.2s; }
.flow-btn:active { transform: scale(0.98); }
.flow-feature-list { list-style: none; padding: 0; margin: 0 0 24px; text-align: left; }
.flow-feature-list li { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 14px; color: #475569; font-weight: 550; }
.flow-check { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; }
.home-footnote { margin-top: 16px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
`

const homeTemplate1Html = `
<div class="home-container">
  <div class="home-card">
    <div class="home-bar"></div>
    <div class="home-body">
      <div class="home-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
      </div>
      <p style="display:inline-block;margin:0 0 12px;padding:4px 12px;font-size:11px;font-weight:700;color:#4f46e5;background:#e0e7ff;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;">{{operator}} &#xB7; {{country}}</p>
      <h1 class="home-title">Premium Mobile Service</h1>
      <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
      <ul class="flow-feature-list">
        <li><span class="flow-check">&#x2713;</span> Instant activation on {{operator}}</li>
        <li><span class="flow-check">&#x2713;</span> Cancel anytime from your phone</li>
        <li><span class="flow-check">&#x2713;</span> Secure operator billing</li>
      </ul>
      <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
      <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
    </div>
  </div>
</div>
`

const homeTemplate2Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #111827; }
.home-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.home-card { width: 100%; max-width: 400px; background: #ffffff; border: 3px solid #111827; border-radius: 0px; padding: 40px 32px; text-align: center; box-shadow: 8px 8px 0px #111827; }
.home-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #fef08a; border: 3px solid #111827; border-radius: 0px; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 4px 4px 0px #111827; }
.home-title { font-size: 26px; font-weight: 900; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: -0.01em; }
.home-subtitle { font-size: 13.5px; color: #374151; margin-bottom: 24px; line-height: 1.6; font-weight: 500; }
.flow-btn { width: 100%; border: 3px solid #111827; cursor: pointer; padding: 16px 24px; border-radius: 0px; font-size: 15.5px; font-weight: 900; color: #111827; background: #fef08a; box-shadow: 4px 4px 0px #111827; transition: transform 0.1s; text-transform: uppercase; margin-bottom: 0; }
.flow-btn:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0px #111827; }
.flow-feature-list { list-style: none; padding: 0; margin: 0 0 24px; text-align: left; }
.flow-feature-list li { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 14px; color: #374151; font-weight: 600; }
.flow-check { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 0px; background: #fef08a; border: 2px solid #111827; color: #111827; font-size: 11px; font-weight: 900; box-shadow: 2px 2px 0px #111827; flex-shrink: 0; }
.home-footnote { font-size: 11px; color: #4b5563; margin-top: 16px; font-weight: 600; text-transform: uppercase; }
`

const homeTemplate2Html = `
<div class="home-container">
  <div class="home-card">
    <div class="home-icon">&#x1F4F1;</div>
    <p style="display:inline-block;margin:0 0 12px;padding:4px 12px;font-size:11px;font-weight:900;color:#111827;background:#fef08a;border-radius:0;text-transform:uppercase;letter-spacing:0.05em;border:2px solid #111827;">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <ul class="flow-feature-list">
      <li><span class="flow-check">&#x2713;</span> Instant activation on {{operator}}</li>
      <li><span class="flow-check">&#x2713;</span> Cancel anytime from your phone</li>
      <li><span class="flow-check">&#x2713;</span> Secure operator billing</li>
    </ul>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`

const homeTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; color: #e4e4e7; }
.home-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
.home-card { width: 100%; max-width: 400px; background: #18181b; border: 1px solid #d4af37; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.home-icon { width: 64px; height: 64px; margin: 0 auto 20px; border: 1px solid #d4af37; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(212, 175, 55, 0.05); }
.home-title { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 12px; font-family: Georgia, serif; letter-spacing: 0.02em; }
.home-subtitle { font-size: 13.5px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
.flow-btn { width: 100%; border: 1px solid #d4af37; cursor: pointer; padding: 16px 24px; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f0f11; background: #d4af37; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
.flow-btn:hover { background: transparent; color: #d4af37; }
.flow-feature-list { list-style: none; padding: 0; margin: 0 0 24px; text-align: left; }
.flow-feature-list li { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 14px; color: #a1a1aa; }
.flow-check { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #d4af37; color: #d4af37; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.home-footnote { margin-top: 16px; font-size: 11px; color: #71717a; line-height: 1.5; letter-spacing: 0.02em; }
`

const homeTemplate3Html = `
<div class="home-container">
  <div class="home-card">
    <div class="home-icon">&#x269C;</div>
    <p style="display:inline-block;margin:0 0 12px;padding:4px 12px;font-size:11px;font-weight:700;color:#d4af37;background:rgba(212,175,55,0.1);border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #d4af37;">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <ul class="flow-feature-list">
      <li><span class="flow-check">&#x2713;</span> Instant activation on {{operator}}</li>
      <li><span class="flow-check">&#x2713;</span> Cancel anytime from your phone</li>
      <li><span class="flow-check">&#x2713;</span> Secure operator billing</li>
    </ul>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the terms. Data charges may apply.</p>
  </div>
</div>
`
const wellnessHomeCss = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-home-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }
`
const wellnessHomeHtml = `
<div class="wellness-home-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
  <a data-tc-type="hotspot" href="#" style="position:absolute;width:30%;height:12%;top:57%;left:8%;display:block;text-decoration:none;"></a>
  <a data-tc-type="hotspot" href="#" style="position:absolute;width:30%;height:14%;top:55%;left:60%;display:block;text-decoration:none;"></a>
</div>
`

export const HOME_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'home-wellness',
    name: 'Wellness 360',
    description: 'Custom Zain Wellness template with image hotspots ready for routing.',
    thumb: 'image',
    previewImage: '',
    css: wellnessHomeCss,
    html: wellnessHomeHtml,
  },
  {
    id: 'home-indigo',
    name: 'Classic Royal Blue',
    description: 'Modern indigo card layout with circular checkmarks and rounded primary buttons.',
    thumb: 'hero',
    previewImage: '',
    css: homeTemplate1Css,
    html: homeTemplate1Html,
  },
  {
    id: 'home-brutalist',
    name: 'Neo-Brutalist Yellow',
    description: 'High contrast yellow layout with thick black borders and bold uppercase typography.',
    thumb: 'gallery',
    previewImage: '',
    css: homeTemplate2Css,
    html: homeTemplate2Html,
  },
  {
    id: 'home-luxury',
    name: 'Elegant Charcoal Gold',
    description: 'Charcoal card layout with refined golden outline borders and clean serif typography.',
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
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-thankyou-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }
`

const wellnessThankyouHtml = `
<div class="wellness-thankyou-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
</div>
`

export const THANKYOU_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'thankyou-wellness',
    name: 'Wellness 360',
    description: 'Image-based Wellness 360 Thank You page.',
    thumb: 'image',
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

export const BLOCKED_STARTER_TEMPLATES: StarterTemplate[] = [
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

export const ERROR_STARTER_TEMPLATES: StarterTemplate[] = [
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

