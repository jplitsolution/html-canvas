import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

// HEADER_INJECTION (1-Click Direct Network Billing)

const heCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #0b0f19;
  color: #f8fafc;
  -webkit-font-smoothing: antialiased;
}
.he-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 14px 28px;
  background: radial-gradient(130% 120% at 50% 0%, #1e293b 0%, #0f172a 50%, #020617 100%);
  font-family: ${ff};
}
.he-card {
  width: 100%;
  max-width: 420px;
  background: #0f172a;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.2);
  overflow: hidden;
  position: relative;
  color: #f8fafc;
}
.he-card-header-bar {
  height: 6px;
  background: linear-gradient(90deg, #0284c7 0%, #06b6d4 50%, #38bdf8 100%);
}
.he-card-body {
  padding: 28px 22px 24px;
  text-align: center;
}
@media (max-width: 380px) {
  .he-card-body { padding: 22px 16px 20px; }
}
.he-network-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: rgba(14, 165, 233, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 18px;
  letter-spacing: 0.02em;
}
.he-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  animation: he-pulse 2s infinite;
}
@keyframes he-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
.he-icon-wrap {
  width: 68px;
  height: 68px;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}
.he-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #ffffff;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.he-subtitle {
  font-size: 14px;
  line-height: 1.55;
  color: #94a3b8;
  margin-bottom: 20px;
}
.he-detected-box {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}
.he-detected-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.he-detected-val {
  font-size: 15px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.02em;
}
.he-verified-tag {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 3px 8px;
  border-radius: 6px;
}
.he-feature-list {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #1e293b;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.he-feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
}
.he-feature-check {
  color: #38bdf8;
  font-weight: 800;
}
.he-btn {
  width: 100%;
  min-height: 52px;
  border: none;
  cursor: pointer;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.he-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -4px rgba(2, 132, 199, 0.6);
}
.he-btn:active { transform: scale(0.985); }
.he-footnote {
  margin-top: 14px;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.5;
}
.he-brand-footer {
  margin-top: 18px;
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}
.he-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: he-spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes he-spin { to { transform: rotate(360deg); } }
`;

export const headerInjectionPages = {
  [CampaignPageType.HOME]: {
    css: heCss,
    html: `
<div class="he-page he-home">
  <div class="he-card">
    <div class="he-card-header-bar"></div>
    <div class="he-card-body">
      <div class="he-network-pill">
        <span class="he-live-dot"></span>
        <span>{{operator}} &#xB7; 4G/5G Network</span>
      </div>
      <div class="he-icon-wrap">&#x26A1;</div>
      <h1 class="he-title">1-Click Direct Access</h1>
      <p class="he-subtitle">Instant subscription via <strong>{{operator}}</strong> network billing. No SMS or password needed.</p>

      <div class="he-detected-box">
        <div>
          <div class="he-detected-label">Mobile Connection</div>
          <div class="he-detected-val">{{phone}}</div>
        </div>
        <span class="he-verified-tag">&#x2713; Auto-Detected</span>
      </div>

      <div class="he-feature-list">
        <div class="he-feature-item">
          <span class="he-feature-check">&#x2713;</span>
          <span>Instant activation on {{operator}} mobile network</span>
        </div>
        <div class="he-feature-item">
          <span class="he-feature-check">&#x2713;</span>
          <span>Unlimited high-speed access &amp; exclusive content</span>
        </div>
        <div class="he-feature-item">
          <span class="he-feature-check">&#x2713;</span>
          <span>Cancel anytime directly from your phone</span>
        </div>
      </div>

      <button type="button" data-action="SUBSCRIBE" class="he-btn">
        &#x26A1; 1-Click Activate
      </button>

      <p class="he-footnote">Direct carrier billing on {{operator}}. Standard data rates may apply.</p>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.CONFIRM]: {
    css: heCss,
    html: `
<div class="he-page he-confirm">
  <div class="he-card">
    <div class="he-card-header-bar"></div>
    <div class="he-card-body">
      <div class="he-network-pill">
        <span class="he-live-dot"></span>
        <span>{{operator}} &#xB7; Confirmation</span>
      </div>
      <div class="he-icon-wrap">&#x1F512;</div>
      <h1 class="he-title">Confirm Subscription</h1>
      <p class="he-subtitle">Verify your details before 1-click activation on <strong>{{operator}}</strong>.</p>

      <div class="he-detected-box">
        <div>
          <div class="he-detected-label">Detected Phone</div>
          <div class="he-detected-val">{{phone}}</div>
        </div>
        <span class="he-verified-tag">&#x2713; {{operator}}</span>
      </div>

      <button type="button" data-action="CONFIRM" class="he-btn">
        Confirm 1-Click Activation
      </button>

      <p class="he-footnote">By confirming, charges will apply to {{phone}} as per your selected plan.</p>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: heCss,
    html: `
<div class="he-page he-thankyou">
  <div class="he-card">
    <div class="he-card-header-bar" style="background:linear-gradient(90deg, #10b981, #06b6d4);"></div>
    <div class="he-card-body">
      <div class="he-icon-wrap" style="background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.3);color:#10b981;">&#x2713;</div>
      <h1 class="he-title">Subscription Activated!</h1>
      <p class="he-subtitle">Your service is now fully active on <strong>{{operator}}</strong> ({{phone}}).</p>

      <div class="he-detected-box">
        <div>
          <div class="he-detected-label">Status</div>
          <div class="he-detected-val" style="color:#34d399;">Active &#xB7; Entitled</div>
        </div>
        <span class="he-verified-tag" style="background:rgba(16,185,129,0.2);color:#34d399;">&#x2713; Live</span>
      </div>

      <button type="button" data-action="HOME" class="he-btn" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
        Access Service
      </button>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.INPROGRESS]: {
    css: heCss,
    html: `
<div class="he-page he-inprogress">
  <div class="he-card">
    <div class="he-card-header-bar"></div>
    <div class="he-card-body">
      <div class="he-spinner"></div>
      <h1 class="he-title">Activating Subscription</h1>
      <p class="he-subtitle">Connecting to <strong>{{operator}}</strong> network billing gateway. Please do not close this window.</p>
      <div data-dcb-slot="status" style="min-height:20px;font-size:13px;color:#38bdf8;font-weight:600;"></div>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.LOW_BALANCE]: {
    css: heCss,
    html: `
<div class="he-page he-lowbalance">
  <div class="he-card">
    <div class="he-card-header-bar" style="background:linear-gradient(90deg, #f59e0b, #d97706);"></div>
    <div class="he-card-body">
      <div class="he-icon-wrap" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#f59e0b;">&#x1F4B3;</div>
      <h1 class="he-title">Low Mobile Balance</h1>
      <p class="he-subtitle">Your mobile account on <strong>{{operator}}</strong> has insufficient balance to complete activation.</p>

      <div class="he-detected-box">
        <div>
          <div class="he-detected-label">Mobile Line</div>
          <div class="he-detected-val">{{phone}}</div>
        </div>
        <span class="he-verified-tag" style="background:rgba(245,158,11,0.2);color:#fbbf24;">Top-up Required</span>
      </div>

      <button type="button" data-action="HOME" class="he-btn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        Try Again
      </button>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.BLOCKED]: {
    css: heCss,
    html: `
<div class="he-page he-blocked">
  <div class="he-card">
    <div class="he-card-header-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="he-card-body">
      <div class="he-icon-wrap" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.3);color:#ef4444;">&#x1F6AB;</div>
      <h1 class="he-title">Network Restricted</h1>
      <p class="he-subtitle">Header injection is unavailable or your line <strong>{{phone}}</strong> is restricted on {{operator}}.</p>

      <button type="button" data-action="HOME" class="he-btn" style="background:linear-gradient(135deg, #64748b 0%, #475569 100%);">
        Return Home
      </button>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: heCss,
    html: `
<div class="he-page he-error">
  <div class="he-card">
    <div class="he-card-header-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="he-card-body">
      <div class="he-icon-wrap" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.3);color:#ef4444;">&#x2715;</div>
      <h1 class="he-title">Activation Failed</h1>
      <p class="he-subtitle">We could not complete carrier billing with <strong>{{operator}}</strong>. Please check your data connection and retry.</p>

      <button type="button" data-action="HOME" class="he-btn">
        Retry
      </button>
    </div>
  </div>
  <div class="he-brand-footer">Powered by {{operator}} Cellular Services</div>
</div>`,
  },
};

// ============================================================================
