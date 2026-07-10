import { CampaignPageType } from '../../modules/campaigns/entities/campaign-page.entity';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

const sharedCss = `
* { box-sizing: border-box; margin: 0; }
img { max-width: 100%; height: auto; }
button { font-family: inherit; }
.flow-btn {
  width: 100%;
  border: none;
  cursor: pointer;
  padding: 16px 24px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 750;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.35);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.flow-btn:active { transform: scale(0.98); }
.flow-info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  text-align: left;
  margin-bottom: 14px;
}
.flow-info-card--accent {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.flow-info-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 8px;
}
.flow-info-card--accent .flow-info-label { color: #6366f1; }
.flow-info-value {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-all;
}
.flow-info-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 12px;
}
.flow-pack-list { display: flex; flex-direction: column; gap: 10px; }
.flow-pack-option {
  width: 100%;
  text-align: left;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}
.flow-pack-option:hover { border-color: #c7d2fe; background: #fafaff; }
.flow-pack-option.flow-pack-selected {
  border-color: #6366f1 !important;
  background: #f5f3ff !important;
  box-shadow: 0 0 0 1px #6366f1;
}
.flow-pack-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.flow-pack-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.flow-feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  text-align: left;
}
.flow-feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 14px;
  color: #475569;
  font-weight: 550;
}
.flow-feature-list li:last-child { margin-bottom: 0; }
.flow-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #dcfce7;
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
}
.flow-footnote {
  margin-top: 14px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}
`;

function wrapPage(body: string, accent = '#6366f1'): string {
  return `
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;background:linear-gradient(160deg,#f8fafc 0%,#f1f5f9 100%);font-family:${ff};">
  <div style="width:100%;max-width:420px;background:#fff;border-radius:24px;box-shadow:0 25px 50px -12px rgba(15,23,42,0.08),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
    <div style="height:6px;background:linear-gradient(90deg,${accent},#3b82f6);"></div>
    ${body}
  </div>
  <p style="margin-top:20px;font-size:12px;color:#94a3b8;font-weight:500;">Powered by <span style="font-weight:700;color:#64748b;">TemplateCraft</span></p>
</div>`;
}

function packPicker(): string {
  return `
    <div data-flow-pack-picker class="flow-pack-picker">
      <p class="flow-pack-title">Choose your pack</p>
      <div class="flow-pack-list">
        <button type="button" data-pack="daily" class="flow-pack-option flow-pack-selected">
          <span class="flow-pack-name">Daily Pack</span>
          <span class="flow-pack-desc">Billed every day · Best for short trials</span>
        </button>
        <button type="button" data-pack="weekly" class="flow-pack-option">
          <span class="flow-pack-name">Weekly Pack</span>
          <span class="flow-pack-desc">Billed every week · Most popular</span>
        </button>
        <button type="button" data-pack="monthly" class="flow-pack-option">
          <span class="flow-pack-name">Monthly Pack</span>
          <span class="flow-pack-desc">Billed every month · Best value</span>
        </button>
      </div>
    </div>`;
}

function infoCard(
  label: string,
  value: string,
  accent = false,
  hint = '',
 ): string {
  return `
    <div class="flow-info-card${accent ? ' flow-info-card--accent' : ''}">
      <p class="flow-info-label">${label}</p>
      <p class="flow-info-value">${value}</p>
      ${hint ? `<p class="flow-info-hint">${hint}</p>` : ''}
    </div>`;
}

const defaultPages: Record<CampaignPageType, { html: string; css: string }> = {
  [CampaignPageType.HOME]: {
    css: sharedCss,
    html: wrapPage(`
      <div style="padding:36px 32px 32px;text-align:center;">
        <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:20px;background:linear-gradient(135deg,#6366f1,#3b82f6);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(99,102,241,0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
        </div>
        <p style="display:inline-block;margin:0 0 12px;padding:4px 12px;font-size:11px;font-weight:700;color:#4f46e5;background:#e0e7ff;border-radius:100px;text-transform:uppercase;letter-spacing:0.05em;">{{operator}} · {{country}}</p>
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:850;line-height:1.25;color:#0f172a;letter-spacing:-0.02em;">Premium Mobile Service</h1>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;font-weight:500;">
          Get unlimited access to exclusive content and premium features — billed directly on your {{operator}} number.
        </p>
        <ul class="flow-feature-list">
          <li><span class="flow-check">✓</span> Instant activation on {{operator}}</li>
          <li><span class="flow-check">✓</span> Cancel anytime from your phone</li>
          <li><span class="flow-check">✓</span> Secure operator billing</li>
        </ul>
        <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
        <p class="flow-footnote" style="margin-top:16px;">
          By subscribing you agree to the service terms. Standard data charges may apply.
        </p>
      </div>
    `),
  },

  [CampaignPageType.CONFIRM]: {
    css: sharedCss,
    html: wrapPage(`
      <div style="padding:36px 32px 32px;text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 18px;border-radius:18px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:850;color:#0f172a;letter-spacing:-0.01em;">Confirm Subscription</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;font-weight:500;">
          Review your details before subscribing on <strong>{{operator}}</strong> ({{country}}).
        </p>
        ${infoCard('Mobile number', '{{phone}}', false, 'Detected automatically from your network')}
        ${packPicker()}
        <button type="button" data-action="CONFIRM" class="flow-btn">Confirm Subscription</button>
        <p class="flow-footnote">Select your pack above, then confirm to subscribe.</p>
      </div>
    `),
  },

  [CampaignPageType.OTP]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 32px 32px;text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 18px;border-radius:18px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:850;color:#0f172a;letter-spacing:-0.01em;">Verify Mobile Number</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#475569;font-weight:500;">
          We couldn't detect your number automatically. Enter it to continue.
        </p>

        <div style="text-align:left;margin-bottom:14px;">
          <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Mobile number</label>
          <input data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210"
            style="width:100%;border:2px solid #e2e8f0;border-radius:14px;padding:12px 16px;font-size:14px;outline:none;font-weight:550;transition:border-color 0.2s;" />
        </div>

        <button type="button" data-otp-action="send" class="flow-btn" style="margin-bottom:14px;">Get OTP</button>

        <div style="text-align:left;margin-bottom:14px;">
          <label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">OTP</label>
          <input data-otp-field="otp" inputmode="numeric" placeholder="Enter OTP"
            style="width:100%;border:2px solid #e2e8f0;border-radius:14px;padding:12px 16px;font-size:14px;outline:none;font-weight:550;transition:border-color 0.2s;" />
        </div>

        <div data-otp-slot="error" style="min-height:18px;color:#dc2626;font-size:13px;margin-bottom:8px;font-weight:550;"></div>
        <div data-otp-slot="status" style="min-height:18px;color:#475569;font-size:12px;margin-bottom:10px;font-weight:550;"></div>

        <button type="button" data-otp-action="verify" class="flow-btn">Verify &amp; Continue</button>
        <p class="flow-footnote">You'll receive a one-time code via SMS (dev: returned in response).</p>
      </div>
    `,
      '#6366f1',
    ),
  },

  [CampaignPageType.THANKYOU]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 32px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:850;color:#0f172a;letter-spacing:-0.02em;">You're Subscribed!</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;font-weight:500;">
          Your <strong>{{plan}}</strong> is now active on <strong>{{operator}}</strong>.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;font-weight:500;">
          A confirmation SMS will be sent to {{phone}} shortly.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:16px;font-size:13px;color:#166534;text-align:left;line-height:1.6;">
          <strong>What's next?</strong><br />
          Open the service from your mobile browser or follow the SMS instructions to start using premium content.
        </div>
      </div>
    `,
      '#10b981',
    ),
  },

  [CampaignPageType.BLOCKED]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 28px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;font-size:36px;">🚫</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Not Eligible</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748b;">
          Sorry, <strong>{{phone}}</strong> cannot subscribe to this service right now.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">
          This may be due to DND settings or {{operator}} operator restrictions.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;font-size:13px;color:#991b1b;text-align:left;">
          Try again later or contact {{operator}} customer support if you believe this is an error.
        </div>
      </div>
    `,
      '#ef4444',
    ),
  },

  [CampaignPageType.ERROR]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 28px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#fff7ed;display:flex;align-items:center;justify-content:center;font-size:36px;">⚠️</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Something Went Wrong</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748b;">
          We couldn't activate your <strong>{{plan}}</strong> subscription. Please try again.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">
          No charge was applied to {{phone}}.
        </p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;font-size:13px;color:#9a3412;text-align:left;">
          If the problem continues, contact {{operator}} support or try again in a few minutes.
        </div>
      </div>
    `,
      '#f59e0b',
    ),
  },
};

export function getDefaultFunnelPageData(pageType: CampaignPageType): {
  editor: string;
  projectData: Record<string, unknown>;
  html: string;
  css: string;
} {
  const page = defaultPages[pageType];
  return {
    editor: 'grapesjs',
    projectData: {},
    html: page.html.trim(),
    css: page.css.trim(),
  };
}
