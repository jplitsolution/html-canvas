import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

// BOTH (Smart Auto-Detection with SMS Fallback)

const bothFlowCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #f8fafc;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
.both-flow-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 14px 28px;
  background: radial-gradient(130% 120% at 50% 0%, #ffffff 0%, #f0fdf4 55%, #e2e8f0 100%);
  font-family: ${ff};
}
.both-flow-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 50px -10px rgba(16, 185, 129, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.85);
  overflow: hidden;
  position: relative;
}
.both-flow-card-bar {
  height: 6px;
  background: linear-gradient(90deg, #059669 0%, #10b981 50%, #0284c7 100%);
}
.both-flow-card-body {
  padding: 28px 22px 24px;
  text-align: center;
}
@media (max-width: 380px) {
  .both-flow-card-body { padding: 22px 16px 20px; }
}
.both-network-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #047857;
  margin-bottom: 16px;
}
.both-icon-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}
.both-flow-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.both-flow-subtitle {
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
  margin-bottom: 20px;
}
.both-flow-btn {
  width: 100%;
  min-height: 50px;
  border: none;
  cursor: pointer;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.both-flow-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -4px rgba(5, 150, 105, 0.45);
}
.both-flow-btn:active { transform: scale(0.985); }
.both-flow-field-group {
  margin-bottom: 14px;
  text-align: left;
}
.both-flow-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.both-flow-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
}
.both-flow-input:focus {
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
}
.both-error-slot {
  min-height: 18px;
  font-size: 13px;
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 8px;
}
.both-status-slot {
  min-height: 18px;
  font-size: 12.5px;
  color: #16a34a;
  font-weight: 600;
  margin-bottom: 8px;
}
.both-footnote {
  margin-top: 14px;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.both-brand-footer {
  margin-top: 18px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}
`;

export const bothPages = {
  [CampaignPageType.HOME]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-home">
  <div class="both-flow-card">
    <div class="both-flow-card-bar"></div>
    <div class="both-flow-card-body">
      <div class="both-network-pill">&#x1F4F6; Smart Carrier Billing &#xB7; {{operator}}</div>
      <div class="both-icon-wrap">&#x1F4F1;</div>
      <h1 class="both-flow-title">Instant Digital Pass</h1>
      <p class="both-flow-subtitle">Instant cellular detection with SMS fallback on <strong>{{operator}}</strong>.</p>

      <button type="button" data-action="SUBSCRIBE" class="both-flow-btn" style="margin-top:16px;">
        Subscribe Now
      </button>

      <p class="both-footnote">Cellular users connect instantly; Wi-Fi users verify via SMS.</p>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.OTP]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-otp">
  <div class="both-flow-card">
    <div class="both-flow-card-bar"></div>
    <div class="both-flow-card-body">
      <div class="both-network-pill">&#x1F4F2; SMS Verification Fallback</div>
      <div class="both-icon-wrap">&#x1F510;</div>
      <h1 class="both-flow-title">Verify Mobile Number</h1>
      <p class="both-flow-subtitle">We couldn't detect your mobile line automatically. Please enter your number to receive an SMS verification code.</p>

      <div class="both-flow-field-group">
        <label class="both-flow-label">Mobile Number</label>
        <input data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" class="both-flow-input" />
      </div>

      <button type="button" data-otp-action="send" class="both-flow-btn" style="margin-bottom:16px;">
        Get OTP
      </button>

      <div class="both-flow-field-group">
        <label class="both-flow-label">Enter OTP</label>
        <input data-otp-field="otp" inputmode="numeric" placeholder="Enter code" class="both-flow-input" />
      </div>

      <div data-otp-slot="error" class="both-error-slot"></div>
      <div data-otp-slot="status" class="both-status-slot"></div>

      <button type="button" data-otp-action="verify" class="both-flow-btn">
        Verify &amp; Continue
      </button>

      <p class="both-footnote">You'll receive a one-time code via SMS on {{operator}}.</p>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.CONFIRM]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-confirm">
  <div class="both-flow-card">
    <div class="both-flow-card-bar"></div>
    <div class="both-flow-card-body">
      <div class="both-network-pill">&#x2713; Ready to Subscribe</div>
      <div class="both-icon-wrap">&#x1F512;</div>
      <h1 class="both-flow-title">Confirm Subscription</h1>
      <p class="both-flow-subtitle">Review your details before subscribing on <strong>{{operator}}</strong> for {{phone}}.</p>

      <button type="button" data-action="CONFIRM" class="both-flow-btn" style="margin-top:16px;">
        Confirm Subscription
      </button>

      <p class="both-footnote">Billed directly on your {{operator}} mobile account.</p>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-thankyou">
  <div class="both-flow-card">
    <div class="both-flow-card-bar" style="background:linear-gradient(90deg, #10b981, #059669);"></div>
    <div class="otp-flow-card-body" style="padding:28px 22px 24px;text-align:center;">
      <div class="both-icon-wrap" style="background:#ecfdf5;color:#10b981;">&#x1F389;</div>
      <h1 class="both-flow-title">You're Subscribed!</h1>
      <p class="both-flow-subtitle">Your subscription is now active on <strong>{{operator}}</strong>.</p>

      <button type="button" data-action="HOME" class="both-flow-btn" style="margin-top:16px;">
        Continue
      </button>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.INPROGRESS]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-inprogress">
  <div class="both-flow-card">
    <div class="both-flow-card-bar"></div>
    <div class="both-flow-card-body">
      <div class="both-icon-wrap">&#x23F3;</div>
      <h1 class="both-flow-title">Processing Request</h1>
      <p class="both-flow-subtitle">Connecting with <strong>{{operator}}</strong> network. Please wait a moment...</p>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.LOW_BALANCE]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-lowbalance">
  <div class="both-flow-card">
    <div class="both-flow-card-bar" style="background:linear-gradient(90deg, #f59e0b, #d97706);"></div>
    <div class="both-flow-card-body">
      <div class="both-icon-wrap" style="color:#f59e0b;">&#x1F4B3;</div>
      <h1 class="both-flow-title">Low Balance</h1>
      <p class="both-flow-subtitle">Insufficient credit on <strong>{{operator}}</strong> to activate your subscription.</p>

      <button type="button" data-action="HOME" class="both-flow-btn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);margin-top:16px;">
        Try Again
      </button>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.BLOCKED]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-blocked">
  <div class="both-flow-card">
    <div class="both-flow-card-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="both-flow-card-body">
      <div class="both-icon-wrap" style="color:#ef4444;">&#x1F6AB;</div>
      <h1 class="both-flow-title">Service Restricted</h1>
      <p class="both-flow-subtitle">Subscription is restricted on your {{operator}} line.</p>

      <button type="button" data-action="HOME" class="both-flow-btn" style="background:linear-gradient(135deg, #64748b 0%, #475569 100%);margin-top:16px;">
        Return Home
      </button>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: bothFlowCss,
    html: `
<div class="both-flow-page both-flow-error">
  <div class="both-flow-card">
    <div class="both-flow-card-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="both-flow-card-body">
      <div class="both-icon-wrap" style="color:#ef4444;">&#x2715;</div>
      <h1 class="both-flow-title">Something Went Wrong</h1>
      <p class="both-flow-subtitle">We couldn't activate your subscription on <strong>{{operator}}</strong>. Please retry.</p>

      <button type="button" data-action="HOME" class="both-flow-btn" style="margin-top:16px;">
        Try Again
      </button>
    </div>
  </div>
  <div class="both-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },
};

// ============================================================================
