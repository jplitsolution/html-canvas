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
    css: `* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-home-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }`,
    html: `
<div class="wellness-home-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
</div>
`,
  },

  [CampaignPageType.CONFIRM]: {
    css: `* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-confirm-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }`,
    html: `
<div class="wellness-confirm-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
  
  <!-- Invisible button for Confirm -->
  <button type="button" data-action="CONFIRM" style="position:absolute;width:50%;height:10%;top:70%;left:25%;background:rgba(255,255,255,0.1);border:1px dashed rgba(255,255,255,0.4);color:transparent;cursor:pointer;"></button>
</div>
`,
  },

  [CampaignPageType.OTP]: {
    css: `* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-otp-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }
.invisible-input { position: absolute; background: rgba(255,255,255,0.1); border: 1px dashed rgba(255,255,255,0.4); outline: none; color: transparent; text-shadow: 0 0 0 #000; font-size: 16px; text-align: center; }`,
    html: `
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
`,
  },

  [CampaignPageType.THANKYOU]: {
    css: `* { box-sizing: border-box; margin: 0; }
body { font-family: Inter, system-ui, sans-serif; background-color: transparent; margin: 0; padding: 0; }
.wellness-thankyou-container { position: relative; width: 100%; max-width: 480px; margin: 0 auto; background-color: transparent; min-height: 100vh; }
.wellness-img { width: 100%; height: auto; display: block; }`,
    html: `
<div class="wellness-thankyou-container">
  <img data-tc-type="image" class="wellness-img" src="/templates/wellness360.jpg" alt="Wellness 360" />
</div>
`,
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
