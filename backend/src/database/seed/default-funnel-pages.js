import { CampaignPageType } from '../entities/campaign-page.entity.js';
import { resolveFlow } from '../../modules/flow/flows/index.js';

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

function wrapPage(body, accent = '#7c4dff') {
  return `
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;background:linear-gradient(160deg,#f8fafc 0%,#eef2ff 100%);font-family:${ff};">
  <div style="width:100%;max-width:420px;background:#fff;border-radius:20px;box-shadow:0 20px 50px rgba(15,23,42,0.08);overflow:hidden;border:1px solid #e2e8f0;">
    <div style="height:6px;background:linear-gradient(90deg,${accent},#00e5ff);"></div>
    ${body}
  </div>
  <p style="margin-top:20px;font-size:12px;color:#94a3b8;">Powered by TemplateCraft</p>
</div>`;
}

function packPicker() {
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

function infoCard(label, value, accent = false, hint = '') {
  return `
    <div class="flow-info-card${accent ? ' flow-info-card--accent' : ''}">
      <p class="flow-info-label">${label}</p>
      <p class="flow-info-value">${value}</p>
      ${hint ? `<p class="flow-info-hint">${hint}</p>` : ''}
    </div>`;
}

const defaultPages = {
  [CampaignPageType.HOME]: {
    css:
      sharedCss +
      `
.home-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(160deg,#f8fafc 0%,#eef2ff 100%); font-family: ${ff}; }
.home-card { width: 100%; max-width: 420px; background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(15,23,42,0.08); border: 1px solid #e2e8f0; padding: 32px 28px; text-align: center; }
.home-logo { width: 64px; height: 64px; margin: 0 auto 16px; display: block; border-radius: 16px; object-fit: cover; }
.home-badge { display: inline-block; margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #7c4dff; text-transform: uppercase; letter-spacing: 0.05em; }
.home-title { margin: 0 0 12px; font-size: 26px; font-weight: 800; line-height: 1.2; color: #0f172a; }
.home-subtitle { margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #64748b; }
.home-feature { margin: 0 0 10px; padding: 10px 12px; font-size: 14px; color: #334155; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
.home-feature:last-of-type { margin-bottom: 20px; }
.home-footnote { margin-top: 16px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
`,
    html: `
<div class="home-page">
  <div class="home-card">
    <img data-tc-type="image" class="home-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%237c4dff'/%3E%3Ctext x='32' y='40' text-anchor='middle' font-size='28'%3E%F0%9F%93%B1%3C/text%3E%3C/svg%3E" alt="Service logo" />
    <p class="home-badge">{{operator}} &#xB7; {{country}}</p>
    <h1 class="home-title">Premium Mobile Service</h1>
    <p class="home-subtitle">Get unlimited access to exclusive content and premium features &#x2014; billed directly on your {{operator}} number.</p>
    <p class="home-feature">&#x2713; Instant activation on {{operator}}</p>
    <p class="home-feature">&#x2713; Cancel anytime from your phone</p>
    <p class="home-feature">&#x2713; Secure operator billing</p>
    <button type="button" data-action="SUBSCRIBE" class="flow-btn">Subscribe Now</button>
    <p class="home-footnote">By subscribing you agree to the service terms. Standard data charges may apply.</p>
  </div>
</div>`,
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

  [CampaignPageType.INPROGRESS]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 28px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:36px;">⏳</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Subscription In Progress</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748b;">
          Your subscription request is currently being processed.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">
          Please wait a moment. You may receive an SMS on {{phone}} once it completes.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;font-size:13px;color:#1e40af;text-align:left;">
          No further action is needed right now. If this takes too long, try again later or contact {{operator}} support.
        </div>
      </div>
    `,
      '#3b82f6',
    ),
  },

  [CampaignPageType.LOW_BALANCE]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div style="padding:36px 28px 32px;text-align:center;">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:#fff7ed;display:flex;align-items:center;justify-content:center;font-size:36px;">💳</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Low Balance</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#64748b;">
          You currently have insufficient balance to complete your subscription.
        </p>
        <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;">
          Top up {{phone}} on {{operator}} and try again.
        </p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;font-size:13px;color:#9a3412;text-align:left;">
          Your number may already be registered. After recharging, the service can activate automatically or on your next visit.
        </div>
      </div>
    `,
      '#f59e0b',
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

const DCB_HOME_PACKS = [
  { packKey: 'daily', period: 'Daily', name: 'Daily Access', desc: 'Flexible access for one day' },
  {
    packKey: 'weekly',
    period: 'Weekly',
    name: 'Weekly Access',
    desc: 'Access for the full week',
    badge: 'POPULAR',
  },
  { packKey: 'monthly', period: 'Monthly', name: 'Monthly Access', desc: 'A complete monthly pack' },
  {
    packKey: 'yearly',
    period: 'Yearly',
    name: 'Yearly Access',
    desc: 'Long-term annual access',
    badge: 'BEST VALUE',
  },
  {
    packKey: 'monthly-with-ads',
    period: 'Monthly',
    name: 'Monthly with Ads',
    desc: 'Monthly access with advertisements',
  },
  {
    packKey: 'three-months',
    period: '3 months',
    name: 'Three Months',
    desc: 'Convenient three-month access',
  },
];

function dcbPackButtons() {
  return DCB_HOME_PACKS.map(
    (pack) => `
      <button type="button" data-action="SUBSCRIBE" data-pack="${pack.packKey}" class="dcb-plan${
        pack.badge ? ' dcb-plan-featured' : ''
      }">
        ${pack.badge ? `<span class="dcb-badge">${pack.badge}</span>` : ''}
        <span class="dcb-plan-period">${pack.period}</span>
        <span class="dcb-plan-name">${pack.name}</span>
        <span class="dcb-plan-desc">${pack.desc}</span>
      </button>`,
  ).join('');
}

const dcbPages = {
  [CampaignPageType.HOME]: {
    css:
      sharedCss +
      `
.dcb-home { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; background: linear-gradient(160deg,#f8fafc 0%,#eef2ff 100%); font-family: ${ff}; }
.dcb-shell { width: 100%; max-width: 420px; background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(15,23,42,0.08); border: 1px solid #e2e8f0; padding: 28px 22px; text-align: center; }
.dcb-kicker { display: inline-block; margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #7c4dff; text-transform: uppercase; letter-spacing: 0.06em; }
.dcb-title { margin: 0 0 8px; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0f172a; }
.dcb-subtitle { margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #64748b; }
.dcb-plans { display: flex; flex-direction: column; gap: 10px; text-align: left; }
.dcb-plan { position: relative; width: 100%; border: 2px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; background: #fff; cursor: pointer; text-align: left; }
.dcb-plan:hover { border-color: #c7d2fe; background: #fafaff; }
.dcb-plan-featured { border-color: #7c4dff; background: #f5f3ff; }
.dcb-badge { position: absolute; top: 10px; right: 12px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: #6d28d9; background: #ede9fe; border-radius: 999px; padding: 3px 8px; }
.dcb-plan-period { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #7c4dff; margin-bottom: 2px; }
.dcb-plan-name { display: block; font-size: 16px; font-weight: 800; color: #0f172a; }
.dcb-plan-desc { display: block; font-size: 12px; color: #64748b; margin-top: 2px; }
.dcb-footnote { margin-top: 16px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
`,
    html: `
<div class="dcb-home">
  <div class="dcb-shell">
    <p class="dcb-kicker">{{operator}} &#xB7; {{country}}</p>
    <h1 class="dcb-title">Choose your access pack</h1>
    <p class="dcb-subtitle">Select a plan. A billing PIN will be sent to your mobile to confirm the subscription.</p>
    <div class="dcb-plans">${dcbPackButtons()}
    </div>
    <p class="dcb-footnote">By continuing you agree to the service terms. Standard data charges may apply.</p>
  </div>
</div>`,
  },

  [CampaignPageType.OTP]: {
    css: sharedCss,
    html: wrapPage(
      `
      <div class="dcb-otp" style="padding:32px 28px 28px;text-align:center;">
        <div style="width:56px;height:56px;margin:0 auto 18px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:24px;">🔐</div>
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#0f172a;">Confirm billing PIN</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#64748b;">
          Enter your number if we could not detect it, then confirm the billing PIN sent by SMS.
        </p>

        <div style="text-align:left;margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Mobile number</label>
          <input data-dcb-field="phone" data-otp-field="phone" inputmode="numeric" placeholder="e.g. 919876543210"
            style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
        </div>

        <button type="button" data-dcb-action="manual-check" data-otp-action="send" class="flow-btn" style="margin-bottom:12px;">Check subscription</button>

        <div style="text-align:left;margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;">Billing PIN</label>
          <input data-dcb-field="pin" data-otp-field="otp" inputmode="numeric" placeholder="Enter billing PIN"
            style="width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;" />
        </div>

        <div data-dcb-slot="error" data-otp-slot="error" style="min-height:18px;color:#dc2626;font-size:13px;margin-bottom:8px;"></div>
        <div data-dcb-slot="status" data-otp-slot="status" style="min-height:18px;color:#64748b;font-size:12px;margin-bottom:10px;"></div>

        <button type="button" data-dcb-action="confirm-pin" data-otp-action="verify" class="flow-btn">Confirm billing PIN</button>
        <p class="flow-footnote">The PIN is sent after you choose a pack on Home. Dummy PIN 1234 also works in test.</p>
      </div>
    `,
      '#6366f1',
    ),
  },
};

export const orangeBfPages = {
  // Screen 1 (HOME) - Stepper 1/4: Mobile number entry
  [CampaignPageType.HOME]: {
    css: `
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
`,
    html: `
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
`,
  },

  // Screen 2 (CONFIRM) - Stepper 2/4: Plan details & S'abonner
  [CampaignPageType.CONFIRM]: {
    css: `
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
.bf-category-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 24px; }
.bf-cat-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 12px 4px; background: #faf8ff; border: 1px solid #eee8fc; border-radius: 12px; }
.bf-cat-icon { color: #5b36d6; }
.bf-cat-label { font-size: 11px; font-weight: 700; color: #453e66; }
.bf-plan-card { background: #faf8ff; border: 1.5px solid #dcd3f8; border-radius: 16px; padding: 18px; margin-bottom: 20px; }
.bf-plan-badge { display: inline-block; font-size: 11px; font-weight: 800; color: #5b36d6; background: #ede7fc; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.05em; margin-bottom: 8px; }
.bf-plan-price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
.bf-plan-amount { font-size: 34px; font-weight: 900; color: #18113c; letter-spacing: -0.02em; }
.bf-plan-unit { font-size: 15px; font-weight: 500; color: #64748b; }
.bf-plan-desc { font-size: 14px; color: #453e66; line-height: 1.45; }
.bf-primary-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 52px; background: #5b36d6; color: #ffffff; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(91, 54, 214, 0.25); text-decoration: none; }
.bf-primary-btn:hover { background: #4e2ac9; }
.bf-primary-btn:active { transform: scale(0.985); }
.bf-legal-note { font-size: 12px; color: #7c7793; line-height: 1.5; margin-top: 18px; text-align: left; }
.bf-error-slot { min-height: 18px; color: #dc2626; font-size: 12.5px; margin-top: 8px; text-align: center; font-weight: 600; }
.bf-status-slot { min-height: 18px; color: #16a34a; font-size: 12.5px; margin-top: 8px; text-align: center; font-weight: 600; }
`,
    html: `
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
`,
  },

  // Screen 3 (OTP) - Stepper 3/4: Code verification
  [CampaignPageType.OTP]: {
    css: `
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
`,
    html: `
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
  <p class="bf-sub-title">Nous avons envoyé un code OTP par SMS.</p>
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
`,
  },

  // Screen 4 (THANKYOU) - Stepper 4/4: Merci confirmation
  [CampaignPageType.THANKYOU]: {
    css: `
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
`,
    html: `
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
    <div class="bf-step-pill active"></div>
  </div>
  <div class="bf-thankyou-body">
    <div class="bf-success-badge">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
`,
  },
};

function pageRecord(page) {
  return {
    editor: 'grapesjs',
    projectData: {},
    html: page.html.trim(),
    css: page.css.trim(),
  };
}

export function getDefaultFunnelPageData(pageType, options = {}) {
  const mode = String(options.verificationMode || options.mode || '').toUpperCase();
  const flow = resolveFlow(mode);
  const page =
    (mode === 'ORANGE_BF' && orangeBfPages[pageType]) ||
    (flow?.useDcbDummyPages && dcbPages[pageType]) ||
    defaultPages[pageType];
  if (!page) {
    return { editor: 'grapesjs', projectData: {}, html: '', css: '' };
  }
  return pageRecord(page);
}

export function isClassicDefaultFunnelHtml(pageType, html) {
  const source = String(html || '');
  if (pageType === CampaignPageType.OTP) {
    return (
      source.includes('Verify Mobile Number') &&
      source.includes('Get OTP') &&
      !source.includes('dcb-otp') &&
      !source.includes('Confirm billing PIN')
    );
  }
  if (pageType === CampaignPageType.HOME) {
    return (
      source.includes('Premium Mobile Service') &&
      source.includes('Subscribe Now') &&
      !source.includes('data-pack=') &&
      !source.includes('dcb-home')
    );
  }
  return false;
}
