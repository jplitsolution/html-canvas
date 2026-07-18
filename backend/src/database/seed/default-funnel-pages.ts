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
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #7c4dff, #6d28d9);
  box-shadow: 0 8px 24px rgba(124, 77, 255, 0.35);
}
.flow-btn:active { transform: scale(0.98); }
.flow-info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  text-align: left;
  margin-bottom: 12px;
}
.flow-info-card--accent {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.flow-info-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin-bottom: 8px;
}
.flow-info-card--accent .flow-info-label { color: #6366f1; }
.flow-info-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-all;
}
.flow-info-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
}
.flow-pack-picker { margin-bottom: 24px; text-align: left; }
.flow-pack-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin-bottom: 12px;
}
.flow-pack-list { display: flex; flex-direction: column; gap: 8px; }
.flow-pack-option {
  width: 100%;
  text-align: left;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.flow-pack-option:hover { border-color: #c7d2fe; background: #fafaff; }
.flow-pack-option.flow-pack-selected {
  border-color: #7c4dff !important;
  background: #f5f3ff !important;
  box-shadow: 0 0 0 1px #7c4dff;
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
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #334155;
}
.flow-feature-list li:last-child { margin-bottom: 0; }
.flow-check { color: #10b981; font-weight: 700; }
.flow-footnote {
  margin-top: 14px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}
`;

function wrapPage(body: string, accent = '#7c4dff'): string {
  return `
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;background:linear-gradient(160deg,#f8fafc 0%,#eef2ff 100%);font-family:${ff};">
  <div style="width:100%;max-width:420px;background:#fff;border-radius:20px;box-shadow:0 20px 50px rgba(15,23,42,0.08);overflow:hidden;border:1px solid #e2e8f0;">
    <div style="height:6px;background:linear-gradient(90deg,${accent},#00e5ff);"></div>
    ${body}
  </div>
  <p style="margin-top:20px;font-size:12px;color:#94a3b8;">Powered by TemplateCraft</p>
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
      <div style="padding:32px 28px 28px;text-align:center;">
        <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:16px;background:linear-gradient(135deg,#7c4dff,#00e5ff);display:flex;align-items:center;justify-content:center;font-size:28px;">📱</div>
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#7c4dff;text-transform:uppercase;letter-spacing:0.05em;">{{operator}} · {{country}}</p>
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;line-height:1.2;color:#0f172a;">Premium Mobile Service</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#64748b;">
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
      <div style="padding:32px 28px 28px;text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:24px;">🔒</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Confirm Subscription</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b;">
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
      <div style="padding:32px 28px 28px;text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:24px;">🔐</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Verify Mobile Number</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#64748b;">
          We couldn't detect your number automatically. Enter it to continue.
        </p>

        <div style="text-align:left;margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Mobile number</label>
          <input data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210"
            style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
        </div>

        <button type="button" data-otp-action="send" class="flow-btn" style="margin-bottom:12px;">Get OTP</button>

        <div style="text-align:left;margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">OTP</label>
          <input data-otp-field="otp" inputmode="numeric" placeholder="Enter OTP"
            style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
        </div>

        <div data-otp-slot="error" style="min-height:18px;color:#dc2626;font-size:13px;margin-bottom:8px;"></div>
        <div data-otp-slot="status" style="min-height:18px;color:#64748b;font-size:12px;margin-bottom:10px;"></div>

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
      <div style="padding:36px 28px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;font-size:36px;">🎉</div>
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#0f172a;">You're Subscribed!</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748b;">
          Your <strong>{{plan}}</strong> is now active on <strong>{{operator}}</strong>.
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;">
          A confirmation SMS will be sent to {{phone}} shortly.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;font-size:13px;color:#166534;text-align:left;">
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
