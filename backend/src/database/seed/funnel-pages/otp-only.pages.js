import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

// OTP_ONLY (Dedicated 2-Step SMS Verification)

const otpFlowCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #f8fafc;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
.otp-flow-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 14px 28px;
  background: radial-gradient(130% 120% at 50% 0%, #ffffff 0%, #f5f3ff 55%, #ede9fe 100%);
  font-family: ${ff};
}
.otp-flow-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 50px -10px rgba(99, 102, 241, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.85);
  overflow: hidden;
  position: relative;
}
.otp-flow-card-bar {
  height: 6px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
}
.otp-flow-card-body {
  padding: 28px 22px 24px;
  text-align: center;
}
@media (max-width: 380px) {
  .otp-flow-card-body { padding: 22px 16px 20px; }
}
.otp-sec-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #6d28d9;
  margin-bottom: 16px;
}
.otp-shield-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}
.otp-flow-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.otp-flow-subtitle {
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
  margin-bottom: 20px;
}
.otp-flow-field-group {
  margin-bottom: 14px;
  text-align: left;
}
.otp-flow-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.otp-flow-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  background: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.otp-flow-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.otp-code-box {
  letter-spacing: 0.25em;
  text-align: center;
  font-size: 20px;
  font-weight: 800;
}
.otp-flow-btn {
  width: 100%;
  min-height: 50px;
  border: none;
  cursor: pointer;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.otp-flow-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -4px rgba(99, 102, 241, 0.45);
}
.otp-flow-btn:active { transform: scale(0.985); }
.otp-resend-row {
  margin: 10px 0 14px;
  font-size: 13px;
  color: #64748b;
}
.otp-link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
  cursor: pointer;
  text-decoration: underline;
}
.otp-error-slot {
  min-height: 18px;
  font-size: 13px;
  color: #dc2626;
  font-weight: 600;
  margin-bottom: 8px;
}
.otp-status-slot {
  min-height: 18px;
  font-size: 12.5px;
  color: #16a34a;
  font-weight: 600;
  margin-bottom: 8px;
}
.otp-footnote {
  margin-top: 14px;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.otp-brand-footer {
  margin-top: 18px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}
.otp-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: otp-spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes otp-spin { to { transform: rotate(360deg); } }
`;

export const otpOnlyPages = {
  [CampaignPageType.HOME]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-home">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar"></div>
    <div class="otp-flow-card-body">
      <div class="otp-sec-pill">&#x1F512; Secure SMS Verification &#xB7; {{operator}}</div>
      <div class="otp-shield-icon">&#x1F4F1;</div>
      <h1 class="otp-flow-title">Premium Access Pass</h1>
      <p class="otp-flow-subtitle">Join thousands of subscribers on <strong>{{operator}}</strong> for unlimited entertainment &amp; exclusive content.</p>

      <button type="button" data-action="SUBSCRIBE" class="otp-flow-btn" style="margin-top:12px;">
        Continue with Mobile SMS &#x2192;
      </button>

      <p class="otp-footnote">We'll send a one-time verification code via SMS to verify your subscription.</p>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.OTP]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-verify">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar"></div>
    <div class="otp-flow-card-body">
      <div class="otp-sec-pill">&#x1F6E1;&#xFE0F; SMS Verification &#xB7; {{operator}}</div>
      <div class="otp-shield-icon">&#x1F510;</div>
      <h1 class="otp-flow-title">Verify Mobile Number</h1>
      <p class="otp-flow-subtitle">Enter your mobile number to receive a one-time SMS verification code.</p>

      <div class="otp-flow-field-group">
        <label class="otp-flow-label">Mobile Number</label>
        <input data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210" class="otp-flow-input" />
      </div>

      <button type="button" data-otp-action="send" class="otp-flow-btn" style="margin-bottom:16px;">
        Get OTP
      </button>

      <div class="otp-flow-field-group">
        <label class="otp-flow-label">Verification Code (SMS PIN)</label>
        <input data-otp-field="otp" inputmode="numeric" placeholder="Enter OTP" class="otp-flow-input otp-code-box" />
      </div>

      <div class="otp-resend-row">
        <button type="button" data-otp-action="send" class="otp-link-btn">Resend code</button>
        <span> &#xB7; Didn't receive SMS?</span>
      </div>

      <div data-otp-slot="error" class="otp-error-slot"></div>
      <div data-otp-slot="status" class="otp-status-slot"></div>

      <button type="button" data-otp-action="verify" class="otp-flow-btn">
        Verify &amp; Continue
      </button>

      <p class="otp-footnote">You'll receive a one-time code via SMS. Standard carrier rates apply.</p>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.CONFIRM]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-confirm">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar"></div>
    <div class="otp-flow-card-body">
      <div class="otp-sec-pill">&#x2713; Phone Verified</div>
      <div class="otp-shield-icon">&#x1F4CB;</div>
      <h1 class="otp-flow-title">Confirm Subscription</h1>
      <p class="otp-flow-subtitle">Please confirm your subscription on <strong>{{operator}}</strong> for {{phone}}.</p>

      <button type="button" data-action="CONFIRM" class="otp-flow-btn" style="margin-top:16px;">
        Confirm Subscription
      </button>

      <p class="otp-footnote">Charges will be deducted from {{phone}} upon confirmation.</p>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-thankyou">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar" style="background:linear-gradient(90deg, #10b981, #059669);"></div>
    <div class="otp-flow-card-body">
      <div class="otp-shield-icon" style="background:#ecfdf5;color:#10b981;">&#x1F389;</div>
      <h1 class="otp-flow-title">You're Subscribed!</h1>
      <p class="otp-flow-subtitle">Your mobile number <strong>{{phone}}</strong> is now active on <strong>{{operator}}</strong>.</p>

      <button type="button" data-action="HOME" class="otp-flow-btn" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);margin-top:16px;">
        Explore Content
      </button>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.INPROGRESS]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-inprogress">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar"></div>
    <div class="otp-flow-card-body">
      <div class="otp-spinner"></div>
      <h1 class="otp-flow-title">Verifying SMS Code</h1>
      <p class="otp-flow-subtitle">Validating with <strong>{{operator}}</strong> network. Please wait a moment...</p>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.LOW_BALANCE]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-lowbalance">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar" style="background:linear-gradient(90deg, #f59e0b, #d97706);"></div>
    <div class="otp-flow-card-body">
      <div class="otp-shield-icon" style="background:#fffbeb;color:#f59e0b;">&#x1F4B3;</div>
      <h1 class="otp-flow-title">Low Balance</h1>
      <p class="otp-flow-subtitle">You have insufficient mobile balance on <strong>{{operator}}</strong> to complete subscription.</p>

      <button type="button" data-action="HOME" class="otp-flow-btn" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);margin-top:16px;">
        Try Again
      </button>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.BLOCKED]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-blocked">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="otp-flow-card-body">
      <div class="otp-shield-icon" style="background:#fef2f2;color:#ef4444;">&#x1F6AB;</div>
      <h1 class="otp-flow-title">Verification Blocked</h1>
      <p class="otp-flow-subtitle">Number <strong>{{phone}}</strong> cannot be subscribed due to operator restriction.</p>

      <button type="button" data-action="HOME" class="otp-flow-btn" style="background:linear-gradient(135deg, #64748b 0%, #475569 100%);margin-top:16px;">
        Back to Home
      </button>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: otpFlowCss,
    html: `
<div class="otp-flow-page otp-flow-error">
  <div class="otp-flow-card">
    <div class="otp-flow-card-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="otp-flow-card-body">
      <div class="otp-shield-icon" style="background:#fef2f2;color:#ef4444;">&#x2715;</div>
      <h1 class="otp-flow-title">Verification Failed</h1>
      <p class="otp-flow-subtitle">We couldn't verify your mobile code on <strong>{{operator}}</strong>. Please retry.</p>

      <button type="button" data-action="HOME" class="otp-flow-btn" style="margin-top:16px;">
        Retry Verification
      </button>
    </div>
  </div>
  <div class="otp-brand-footer">Powered by {{operator}} Mobile Services</div>
</div>`,
  },
};

// ============================================================================
