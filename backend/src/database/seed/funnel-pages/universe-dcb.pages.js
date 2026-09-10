import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const dcbBrandSvg = `
<div class="dcb-brand">
  <div class="dcb-brand-icon">
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#0f172a"/>
      <path d="M16 21C16 19.3431 17.3431 18 19 18H29C30.6569 18 32 19.3431 32 21V27C32 28.6569 30.6569 30 29 30H19C17.3431 30 16 28.6569 16 27V21Z" fill="#38bdf8"/>
      <rect x="12" y="20" width="3" height="8" rx="1.5" fill="#60a5fa"/>
      <rect x="33" y="20" width="3" height="8" rx="1.5" fill="#60a5fa"/>
      <path d="M19 23.5H29V24.5H19V23.5Z" fill="#ffffff"/>
      <circle cx="24" cy="14" r="3" fill="#38bdf8"/>
    </svg>
  </div>
  <div class="dcb-brand-title">WELLNESS 360</div>
</div>
`;

const dcbFitnessArtSvg = `
<div class="dcb-art">
  <svg width="220" height="135" viewBox="0 0 280 170" fill="none" xmlns="http://www.w3.org/2000/svg" class="dcb-illustration">
    <!-- Ambient ground glow -->
    <ellipse cx="140" cy="146" rx="120" ry="18" fill="#ede9fe" opacity="0.6"/>
    
    <!-- Center yogi in meditation -->
    <circle cx="140" cy="74" r="9" fill="#fcd34d"/>
    <path d="M133 87C133 82 147 82 147 87L150 112H130L133 87Z" fill="#4f46e5"/>
    <path d="M123 114C123 109 157 109 157 114L152 122H128L123 114Z" fill="#6366f1"/>
    <path d="M130 94L119 101M150 94L161 101" stroke="#fcd34d" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="140" cy="122" rx="20" ry="5" fill="#c7d2fe"/>

    <!-- Person lifting weights (right) -->
    <circle cx="196" cy="62" r="10" fill="#fbcfe8"/>
    <path d="M188 77C188 72 204 72 204 77L206 112H186L188 77Z" fill="#8b5cf6"/>
    <path d="M186 112L182 144M206 112L210 144" stroke="#1e1b4b" stroke-width="5" stroke-linecap="round"/>
    <path d="M188 81L177 68M204 81L215 68" stroke="#fbcfe8" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="173" y="64" width="7" height="6" rx="2" fill="#38bdf8"/>
    <rect x="212" y="64" width="7" height="6" rx="2" fill="#38bdf8"/>

    <!-- Person stretching/aerobics (left) -->
    <circle cx="84" cy="64" r="10" fill="#fed7aa"/>
    <path d="M76 79C76 74 92 74 92 79L94 112H74L76 79Z" fill="#ec4899"/>
    <path d="M74 112L68 144M94 112L102 144" stroke="#1e1b4b" stroke-width="5" stroke-linecap="round"/>
    <path d="M76 83L64 70M92 83L104 70" stroke="#fed7aa" stroke-width="3.5" stroke-linecap="round"/>
  </svg>
</div>
`;

const dcbCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #271f45;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
.dcb-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px 32px;
  background: radial-gradient(circle at top center, #352a5c 0%, #241c3d 60%, #1a142c 100%);
  font-family: ${ff};
}
.dcb-shell {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}
.dcb-card {
  width: 100%;
  background: #ffffff;
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(10, 6, 28, 0.45);
  overflow: hidden;
  padding: 30px 22px 24px;
  text-align: center;
  position: relative;
}
@media (max-width: 380px) {
  .dcb-card { padding: 24px 16px 20px; border-radius: 22px; }
}

/* Brand header */
.dcb-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.dcb-brand-icon {
  margin-bottom: 4px;
}
.dcb-brand-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #3b82f6;
  text-transform: uppercase;
}

/* Art illustration */
.dcb-art {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 4px 0 14px;
}
.dcb-illustration {
  max-width: 100%;
  height: auto;
}

/* Headings */
.dcb-headline {
  font-size: 14.5px;
  font-weight: 700;
  color: #2b2553;
  line-height: 1.45;
  margin-bottom: 18px;
}
.dcb-welcome-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #6366f1;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.dcb-welcome-title {
  font-size: 26px;
  font-weight: 800;
  color: #4f46e5;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.dcb-welcome-sub {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 18px;
}

/* Form Inputs */
.dcb-phone-group {
  margin-bottom: 14px;
}
.dcb-phone-row {
  display: flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.dcb-phone-row:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.dcb-prefix-box {
  padding: 12px 14px;
  background: #f8fafc;
  border-right: 1px solid #cbd5e1;
  color: #475569;
  font-size: 13.5px;
  font-weight: 700;
  user-select: none;
}
.dcb-phone-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #0f172a;
}
.dcb-phone-input::placeholder {
  color: #94a3b8;
}

/* PIN segment input */
.dcb-pin-pill {
  display: inline-block;
  padding: 5px 18px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 14px;
}
.dcb-pin-segmented-wrap {
  margin: 0 auto 16px;
  max-width: 260px;
}
.dcb-pin-segmented-input {
  width: 100%;
  border: 1.5px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 20px;
  text-align: center;
  outline: none;
  font-family: monospace, ${ff};
  color: #1e1b4b;
  background: #f8fafc;
  transition: all 0.15s ease;
}
.dcb-pin-segmented-input:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

/* Buttons */
.dcb-primary-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 14px 20px;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.dcb-primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -4px rgba(79, 70, 229, 0.5);
}
.dcb-primary-btn:active {
  transform: scale(0.985);
}

/* Plan Selection Cards */
.dcb-recommend-card {
  background: linear-gradient(180deg, #f8faff 0%, #f1f5fd 100%);
  border: 1.5px solid #e0e7ff;
  border-radius: 18px;
  padding: 18px 16px;
  margin-bottom: 14px;
  text-align: center;
}
.dcb-recommend-header {
  margin-bottom: 6px;
}
.dcb-recommend-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #4f46e5;
  text-transform: uppercase;
  background: #e0e7ff;
  padding: 2px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
}
.dcb-recommend-name {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}
.dcb-recommend-price {
  font-size: 14px;
  font-weight: 800;
  color: #4f46e5;
  margin-bottom: 12px;
}
.dcb-vat {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}
.dcb-choose-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.35);
  transition: all 0.15s ease;
}
.dcb-choose-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -2px rgba(79, 70, 229, 0.45);
}

/* Secondary plan list */
.dcb-more-plans {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.dcb-sub-plan-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dcb-sub-plan-btn:hover {
  border-color: #a5b4fc;
  background: #fafaff;
}
.dcb-sub-price {
  font-size: 12px;
  color: #6366f1;
  font-weight: 700;
}

/* Legal / disclaimer */
.dcb-disclaimer {
  margin-top: 14px;
  font-size: 10.5px;
  line-height: 1.5;
  color: #94a3b8;
  text-align: left;
}
.dcb-helper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}
.dcb-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
}
.dcb-link:hover {
  text-decoration: underline;
}

/* Feedback slots */
.dcb-error-slot {
  min-height: 18px;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
  margin-top: 10px;
  line-height: 1.4;
}
.dcb-status-slot {
  min-height: 18px;
  color: #64748b;
  font-size: 12px;
  margin-top: 6px;
  line-height: 1.4;
}

/* Status / feedback icons */
.dcb-icon-circle {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
}
.dcb-icon-circle.ok { background: #ecfdf5; border-color: #d1fae5; color: #059669; }
.dcb-icon-circle.warn { background: #fffbeb; border-color: #fef3c7; color: #d97706; }
.dcb-icon-circle.err { background: #fef2f2; border-color: #fee2e2; color: #dc2626; }

.dcb-spinner {
  width: 44px;
  height: 44px;
  margin: 0 auto 18px;
  border-radius: 50%;
  border: 3.5px solid #e0e7ff;
  border-top-color: #6366f1;
  animation: dcb-spin 0.85s linear infinite;
}
@keyframes dcb-spin { to { transform: rotate(360deg); } }

.dcb-brand-footer {
  margin-top: 16px;
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}
`;

const dcbPages = {
  [CampaignPageType.HOME]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-home" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}

      <div class="dcb-welcome-kicker">✦ WELCOME TO ✦</div>
      <h1 class="dcb-welcome-title">Wellness 360</h1>
      <p class="dcb-welcome-sub">Choose your access pack below. Make fitness your priority for just 1 shekel a day (tax excluded). Choose your package now!</p>

      <!-- Primary Recommended Pack (PurchaseTypeID 2) -->
      <div class="dcb-recommend-card">
        <div class="dcb-recommend-header">
          <span class="dcb-recommend-tag">Recommended</span>
          <h2 class="dcb-recommend-name">Daily Pack</h2>
        </div>
        <div class="dcb-recommend-price">1 NIS / day <span class="dcb-vat">(tax excluded)</span></div>
        <button type="button" data-action="SUBSCRIBE" data-pack="daily" data-purchase-type-id="2" class="dcb-choose-btn">
          Choose the package
        </button>
      </div>

      <!-- Additional Packs for Multi-Pack Campaigns -->
      <div class="dcb-more-plans">
        <button type="button" data-action="SUBSCRIBE" data-pack="weekly" data-purchase-type-id="3" class="dcb-sub-plan-btn">
          <span>Weekly Access</span>
          <span class="dcb-sub-price">7 NIS / week</span>
        </button>
        <button type="button" data-action="SUBSCRIBE" data-pack="monthly" data-purchase-type-id="4" class="dcb-sub-plan-btn">
          <span>Monthly Access</span>
          <span class="dcb-sub-price">25 NIS / month</span>
        </button>
      </div>

      <div data-dcb-slot="error" data-otp-slot="error" class="dcb-error-slot"></div>
      <div data-dcb-slot="status" data-otp-slot="status" class="dcb-status-slot"></div>

      <p class="dcb-disclaimer">
        Wellness 360 is a fitness service offering yoga, exercise, meditation, BMI tracking, and personalized guidance from an AI-powered trainer. The service is available to {{operator}} subscribers. The cost is 1 NIS per day including VAT to unsubscribe send UNSUB WEL to a free text message to 7902. The service renews automatically daily unless cancelled.
      </p>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },

  [CampaignPageType.OTP]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-otp" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}
      ${dcbFitnessArtSvg}

      <!-- Stage 1: Manual Number Entry (Page 1 of PDF) -->
      <div data-dcb-stage="number">
        <h1 class="dcb-headline" data-dcb-custom="true">Wellness 360 - Your comprehensive platform for health and wellness</h1>

        <div class="dcb-phone-group">
          <div class="dcb-phone-row">
            <div class="dcb-prefix-box">+972</div>
            <input data-dcb-field="phone" data-otp-field="phone" type="tel" inputmode="numeric" placeholder="Enter your mobile phone number" class="dcb-phone-input" />
          </div>
        </div>

        <button type="button" data-dcb-action="manual-check" data-otp-action="send" data-dcb-custom="true" class="dcb-primary-btn">
          Subscribe
        </button>
      </div>

      <!-- Stage 2: PIN Confirmation (Page 3 of PDF) -->
      <div data-dcb-stage="pin">
        <div class="dcb-pin-pill">Enter the PIN</div>

        <div class="dcb-pin-segmented-wrap">
          <input data-dcb-field="pin" data-otp-field="otp" type="tel" inputmode="numeric" maxlength="4" placeholder="••••" class="dcb-pin-segmented-input" />
        </div>

        <button type="button" data-dcb-action="confirm-pin" data-otp-action="verify" data-dcb-custom="true" title="Confirm billing PIN" aria-label="Confirm billing PIN" class="dcb-primary-btn">
          to be sure
        </button>

        <div class="dcb-helper-row">
          <span>Didn't receive code?</span>
          <a href="#" data-dcb-action="manual-check" data-otp-action="send" class="dcb-link">Resend PIN</a>
        </div>
      </div>

      <!-- Live feedback slots -->
      <div data-dcb-slot="error" data-otp-slot="error" class="dcb-error-slot"></div>
      <div data-dcb-slot="status" data-otp-slot="status" class="dcb-status-slot"></div>

      <p class="dcb-disclaimer">
        Wellness 360 is a fitness service offering yoga, exercise, meditation, BMI tracking, and personalized guidance from an AI-powered trainer. The service is available to {{operator}} subscribers. The cost is 1 NIS per day including VAT to unsubscribe send UNSUB WEL to a free text message to 7902. The service renews automatically daily unless cancelled.
      </p>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },

  [CampaignPageType.INPROGRESS]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-inprogress" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}
      <div class="dcb-spinner"></div>
      <h1 class="dcb-headline" style="font-size:18px;">Activating Your Wellness 360 Access</h1>
      <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:16px;">
        Verifying your subscription with <strong>{{operator}}</strong> carrier network. Please wait a moment...
      </p>

      <div data-dcb-slot="status" data-otp-slot="status" class="dcb-status-slot" style="font-weight:600;color:#6366f1;">
        Waiting for confirmation…
      </div>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-thankyou" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}
      <div class="dcb-icon-circle ok">✓</div>
      <h1 class="dcb-welcome-title" style="font-size:24px;margin-bottom:6px;">You're Subscribed!</h1>
      <p style="color:#64748b;font-size:14px;line-height:1.5;margin-bottom:18px;">
        Your <strong>Wellness 360 Daily Pack</strong> is now active on <strong>{{operator}}</strong>.
      </p>

      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:14px;padding:14px;margin-bottom:18px;text-align:left;font-size:13px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:#64748b;">Plan</span>
          <strong style="color:#1e1b4b;">Daily Access</strong>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">Billing Status</span>
          <strong style="color:#10b981;">Active</strong>
        </div>
      </div>

      <button type="button" data-action="REDIRECT" class="dcb-primary-btn">
        Start Your Workout Now &#x2192;
      </button>

      <p class="dcb-disclaimer" style="text-align:center;margin-top:14px;">
        A confirmation SMS has been sent to your mobile. Enjoy full access!
      </p>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },

  [CampaignPageType.LOW_BALANCE]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-low-balance" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}
      <div class="dcb-icon-circle warn">⚠️</div>
      <h1 class="dcb-headline" style="font-size:18px;">Insufficient Balance</h1>
      <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:18px;">
        Your <strong>{{operator}}</strong> account does not have sufficient balance to complete this subscription.
      </p>

      <button type="button" data-action="HOME" class="dcb-primary-btn" style="background:linear-gradient(90deg, #f59e0b, #d97706);">
        Try Again
      </button>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: dcbCss,
    html: `
<div class="dcb-page dcb-error" data-dcb-custom="true">
  <div class="dcb-shell">
    <div class="dcb-card">
      ${dcbBrandSvg}
      <div class="dcb-icon-circle err">✕</div>
      <h1 class="dcb-headline" style="font-size:18px;">Subscription Failed</h1>
      <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:16px;">
        We were unable to complete billing with <strong>{{operator}}</strong>.
      </p>

      <div data-dcb-slot="error" data-otp-slot="error" class="dcb-error-slot" style="margin-bottom:14px;"></div>

      <button type="button" data-action="HOME" class="dcb-primary-btn" style="background:linear-gradient(90deg, #64748b, #475569);">
        Try Again
      </button>
    </div>
    <div class="dcb-brand-footer">Powered by {{operator}} &#xB7; {{country}}</div>
  </div>
</div>`,
  },
};

export { dcbPages };
