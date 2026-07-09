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
body { font-family: Inter, system-ui, sans-serif; background-color: #f3f4f6; }
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
      <div class="otp-icon">🔑</div>
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
body { font-family: Inter, system-ui, sans-serif; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }
.otp-card { width: 100%; max-width: 400px; background: #ffffff; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; padding: 36px 28px; text-align: center; }
.otp-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #f3e8ff; color: #7c3aed; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.otp-title { font-size: 22px; font-weight: 800; color: #1e1b4b; margin-bottom: 8px; }
.otp-subtitle { font-size: 13px; color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
.otp-input-group { text-align: left; margin-bottom: 16px; }
.otp-label { display: block; font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.otp-input { width: 100%; border: 2px solid #e0e7ff; border-radius: 12px; padding: 12px 16px; font-size: 15px; outline: none; transition: all 0.2s; font-weight: 500; }
.otp-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.15); }
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 15px 24px; border-radius: 12px; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #7c3aed, #4f46e5); box-shadow: 0 8px 20px rgba(124, 77, 255, 0.3); transition: all 0.2s; margin-bottom: 12px; }
.flow-btn:hover { opacity: 0.95; transform: translateY(-1px); }
.flow-btn:active { transform: translateY(0) scale(0.99); }
.otp-status { min-height: 16px; color: #4b5563; font-size: 12px; margin-top: 4px; margin-bottom: 8px; text-align: left; }
.otp-error { min-height: 16px; color: #dc2626; font-size: 12px; margin-top: 4px; margin-bottom: 8px; font-weight: 500; text-align: left; }
.otp-footnote { font-size: 11px; color: #94a3b8; margin-top: 20px; line-height: 1.5; }
`

const otpTemplate2Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-icon">🔒</div>
    <h1 class="otp-title">Secure Login</h1>
    <p class="otp-subtitle">Verify your identity to authenticate secure subscription billing.</p>
    
    <div class="otp-input-group">
      <label class="otp-label">Mobile Phone</label>
      <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
    </div>
    
    <button type="button" data-otp-action="send" class="flow-btn">Get Verification Code</button>
    
    <div style="margin-top: 16px;" class="otp-input-group">
      <label class="otp-label">Verification Code</label>
      <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Code" style="text-align: center;" />
    </div>
    
    <div data-otp-slot="error" class="otp-error"></div>
    <div data-otp-slot="status" class="otp-status"></div>
    
    <button type="button" data-otp-action="verify" class="flow-btn" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); margin-bottom: 0;">Confirm & Continue</button>
    <p class="otp-footnote">Powered by TemplateCraft</p>
  </div>
</div>
`

const otpTemplate3Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: #0b0f19; color: #f3f4f6; }
.otp-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: radial-gradient(circle at center, #111827 0%, #030712 100%); }
.otp-card { width: 100%; max-width: 400px; background: #1f2937; border-radius: 20px; border: 1px solid #374151; overflow: hidden; padding: 36px 28px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5); }
.otp-icon { width: 56px; height: 56px; margin: 0 auto 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.otp-title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
.otp-subtitle { font-size: 13px; color: #9ca3af; margin-bottom: 24px; line-height: 1.5; }
.otp-input-group { text-align: left; margin-bottom: 16px; }
.otp-label { display: block; font-size: 11px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.otp-input { width: 100%; border: 1px solid #4b5563; border-radius: 10px; padding: 11px 14px; font-size: 14px; outline: none; background: #111827; color: #ffffff; transition: border-color 0.2s; }
.otp-input:focus { border-color: #10b981; }
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; color: #fff; background: #10b981; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); margin-bottom: 12px; }
.flow-btn:hover { background: #059669; }
.flow-btn:active { transform: scale(0.99); }
.otp-status { min-height: 16px; color: #9ca3af; font-size: 12px; margin-top: 4px; margin-bottom: 8px; text-align: left; }
.otp-error { min-height: 16px; color: #f87171; font-size: 12px; margin-top: 4px; margin-bottom: 8px; text-align: left; }
.otp-footnote { font-size: 11px; color: #6b7280; margin-top: 20px; }
`

const otpTemplate3Html = `
<div class="otp-container">
  <div class="otp-card">
    <div class="otp-icon">🛡️</div>
    <h1 class="otp-title">Identity Verification</h1>
    <p class="otp-subtitle">A verification code is required to establish secure operator billing.</p>
    
    <div class="otp-input-group">
      <label class="otp-label">Subscriber Phone</label>
      <input class="otp-input" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" />
    </div>
    
    <button type="button" data-otp-action="send" class="flow-btn">Verify Phone</button>
    
    <div style="margin-top: 16px;" class="otp-input-group">
      <label class="otp-label">Secure Passcode</label>
      <input class="otp-input" data-otp-field="otp" inputmode="numeric" placeholder="Enter code" style="text-align: center;" />
    </div>
    
    <div data-otp-slot="error" class="otp-error"></div>
    <div data-otp-slot="status" class="otp-status"></div>
    
    <button type="button" data-otp-action="verify" class="flow-btn" style="background: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); margin-bottom: 0;">Verify & Confirm</button>
    <p class="otp-footnote">Authentication powered by TemplateCraft security protocols.</p>
  </div>
</div>
`

export const OTP_STARTER_TEMPLATES: StarterTemplate[] = [
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
    id: 'otp-vibrant',
    name: 'Vibrant Purple Gradient',
    description: 'Beautiful full-bleed purple-to-indigo gradient background with glossy buttons.',
    thumb: 'gallery',
    previewImage: '',
    css: otpTemplate2Css,
    html: otpTemplate2Html,
  },
  {
    id: 'otp-dark',
    name: 'Premium Dark Mode',
    description: 'Glossy dark card with glowing neon accents and customized status messaging.',
    thumb: 'hero',
    previewImage: '',
    css: otpTemplate3Css,
    html: otpTemplate3Html,
  },
]

// ----------------------------------------------------
// CONFIRM Page Templates
// ----------------------------------------------------
const confirmTemplate1Css = `
* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: #f8fafc; }
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
      <div class="confirm-icon">💎</div>
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
body { font-family: Inter, system-ui, sans-serif; background-color: #0f172a; color: #f3f4f6; }
.confirm-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: radial-gradient(circle at center, #1e1b4b 0%, #090514 100%); }
.confirm-card { width: 100%; max-width: 400px; background: #111827; border-radius: 24px; border: 1px solid #374151; overflow: hidden; padding: 36px 28px; text-align: center; }
.confirm-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: rgba(124, 77, 255, 0.1); color: #a855f7; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.confirm-title { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px; }
.confirm-subtitle { font-size: 13px; color: #9ca3af; margin-bottom: 24px; line-height: 1.5; }
.flow-info-card { background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; text-align: left; margin-bottom: 20px; }
.flow-info-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #a855f7; margin-bottom: 2px; }
.flow-info-value { font-size: 16px; font-weight: 700; color: #ffffff; }
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #9ca3af; margin-bottom: 10px; }
.flow-pack-list { display: flex; flex-direction: column; gap: 8px; }
.flow-pack-option { width: 100%; text-align: left; border: 2px solid #374151; border-radius: 14px; padding: 12px 16px; background: #111827; cursor: pointer; transition: all 0.2s; color: #ffffff; }
.flow-pack-option:hover { border-color: #4b5563; }
.flow-pack-option.flow-pack-selected { border-color: #a855f7 !important; background: rgba(168, 85, 247, 0.08) !important; }
.flow-pack-name { display: block; font-size: 14px; font-weight: 700; color: #ffffff; }
.flow-pack-desc { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
.flow-btn { width: 100%; border: none; cursor: pointer; padding: 16px 20px; border-radius: 14px; font-size: 15px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #a855f7, #6366f1); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3); }
.flow-footnote { font-size: 11px; color: #6b7280; margin-top: 16px; }
`

const confirmTemplate2Html = `
<div class="confirm-container">
  <div class="confirm-card">
    <div class="confirm-icon">🚀</div>
    <h1 class="confirm-title">Unlock Premium Access</h1>
    <p class="confirm-subtitle">Complete confirmation below to gain unrestricted service updates.</p>
    
    <div class="flow-info-card">
      <div class="flow-info-label">Subscriber Account</div>
      <div class="flow-info-value">{{phone}}</div>
    </div>
    
    <div data-flow-pack-picker class="flow-pack-picker">
      <p class="flow-pack-title">Select Pack Type</p>
      <div class="flow-pack-list">
        <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
          <span class="flow-pack-name">Daily Access</span>
          <span class="flow-pack-desc">Standard daily billing cycle</span>
        </button>
        <button type="button" data-pack="weekly" class="flow-pack-option">
          <span class="flow-pack-name">Weekly Bundle</span>
          <span class="flow-pack-desc">Recurring weekly subscription</span>
        </button>
        <button type="button" data-pack="monthly" class="flow-pack-option">
          <span class="flow-pack-name">Monthly VIP</span>
          <span class="flow-pack-desc">Full 30-day package at a discount</span>
        </button>
      </div>
    </div>
    
    <button type="button" data-action="CONFIRM" class="flow-btn">Activate Subscription</button>
    <p class="flow-footnote">Powered by TemplateCraft encryption protocols.</p>
  </div>
</div>
`

export const CONFIRM_STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'confirm-classic',
    name: 'Classic Indigo',
    description: 'Clean white container card with pack option selectors and Indigo buttons.',
    thumb: 'pricing',
    previewImage: '',
    css: confirmTemplate1Css,
    html: confirmTemplate1Html,
  },
  {
    id: 'confirm-premium',
    name: 'Premium Dark Gradient',
    description: 'High-end dark layout featuring purple-indigo gradients and modern card fields.',
    thumb: 'card',
    previewImage: '',
    css: confirmTemplate2Css,
    html: confirmTemplate2Html,
  },
]

export const DEFAULT_PAGES = [
  { id: 'home', name: 'Home' },
  { id: 'about', name: 'About' },
  { id: 'services', name: 'Services' },
  { id: 'contact', name: 'Contact' },
  { id: 'blog', name: 'Blog' },
]
