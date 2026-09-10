import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

// CG_HOME (Operator Consent Gateway Landing)

const cgFlowCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #f8fafc;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
.cg-flow-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 14px 28px;
  background: radial-gradient(130% 120% at 50% 0%, #ffffff 0%, #fefce8 55%, #f1f5f9 100%);
  font-family: ${ff};
}
.cg-flow-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 50px -10px rgba(217, 119, 6, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.85);
  overflow: hidden;
  position: relative;
}
.cg-flow-card-bar {
  height: 6px;
  background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #2563eb 100%);
}
.cg-flow-card-body {
  padding: 28px 22px 24px;
  text-align: center;
}
@media (max-width: 380px) {
  .cg-flow-card-body { padding: 22px 16px 20px; }
}
.cg-trust-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #b45309;
  margin-bottom: 16px;
}
.cg-icon-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}
.cg-flow-title {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.cg-flow-subtitle {
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
  margin-bottom: 20px;
}
.cg-trust-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cg-trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
}
.cg-flow-btn {
  width: 100%;
  min-height: 52px;
  border: none;
  cursor: pointer;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  box-shadow: 0 10px 25px -5px rgba(217, 119, 6, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.cg-flow-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -4px rgba(217, 119, 6, 0.45);
}
.cg-flow-btn:active { transform: scale(0.985); }
.cg-footnote {
  margin-top: 14px;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.5;
}
.cg-brand-footer {
  margin-top: 18px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
}
`;

export const cgHomePages = {
  [CampaignPageType.HOME]: {
    css: cgFlowCss,
    html: `
<div class="cg-flow-page cg-flow-home">
  <div class="cg-flow-card">
    <div class="cg-flow-card-bar"></div>
    <div class="cg-flow-card-body">
      <div class="cg-trust-pill">&#x1F512; Official Partner Portal &#xB7; {{operator}}</div>
      <div class="cg-icon-wrap">&#x1F6E1;&#xFE0F;</div>
      <h1 class="cg-flow-title">Official Service Access</h1>
      <p class="cg-flow-subtitle">Authorized partner portal for <strong>{{operator}}</strong> subscribers in {{country}}.</p>

      <div class="cg-trust-box">
        <div class="cg-trust-item">
          <span>&#x1F512;</span>
          <span>100% Encrypted Payment via {{operator}} Gateway</span>
        </div>
        <div class="cg-trust-item">
          <span>&#x26A1;</span>
          <span>Billed directly to your mobile account balance</span>
        </div>
        <div class="cg-trust-item">
          <span>&#x2713;</span>
          <span>No credit card or banking details required</span>
        </div>
      </div>

      <button type="button" data-action="SUBSCRIBE" class="cg-flow-btn">
        Proceed to {{operator}} Gateway &#x2192;
      </button>

      <p class="cg-footnote">You will be securely redirected to {{operator}}'s official payment authorization screen to complete your request.</p>
    </div>
  </div>
  <div class="cg-brand-footer">Authorized by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: cgFlowCss,
    html: `
<div class="cg-flow-page cg-flow-thankyou">
  <div class="cg-flow-card">
    <div class="cg-flow-card-bar" style="background:linear-gradient(90deg, #10b981, #059669);"></div>
    <div class="cg-flow-card-body">
      <div class="cg-icon-wrap" style="background:#ecfdf5;color:#10b981;">&#x2713;</div>
      <h1 class="cg-flow-title">Authorization Complete!</h1>
      <p class="cg-flow-subtitle">Your subscription has been confirmed by <strong>{{operator}}</strong>.</p>

      <button type="button" data-action="HOME" class="cg-flow-btn" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);">
        Access Content
      </button>
    </div>
  </div>
  <div class="cg-brand-footer">Authorized by {{operator}} Mobile Services</div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: cgFlowCss,
    html: `
<div class="cg-flow-page cg-flow-error">
  <div class="cg-flow-card">
    <div class="cg-flow-card-bar" style="background:linear-gradient(90deg, #ef4444, #b91c1c);"></div>
    <div class="cg-flow-card-body">
      <div class="cg-icon-wrap" style="background:#fef2f2;color:#ef4444;">&#x2715;</div>
      <h1 class="cg-flow-title">Authorization Incomplete</h1>
      <p class="cg-flow-subtitle">The payment session with <strong>{{operator}}</strong> was not completed.</p>

      <button type="button" data-action="SUBSCRIBE" class="cg-flow-btn">
        Retry Gateway Redirect
      </button>
    </div>
  </div>
  <div class="cg-brand-footer">Authorized by {{operator}} Mobile Services</div>
</div>`,
  },
};

// ============================================================================
