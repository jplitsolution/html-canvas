import { CampaignPageType } from '../../entities/campaign-page.entity.js';

const ff = 'Inter, system-ui, -apple-system, sans-serif';

// NONE (Direct Redirect Splash Screen)

const noneFlowCss = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${ff};
  background-color: #0f172a;
  color: #f8fafc;
  -webkit-font-smoothing: antialiased;
}
.none-flow-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 14px 28px;
  background: radial-gradient(130% 120% at 50% 0%, #1e293b 0%, #0f172a 60%, #020617 100%);
  font-family: ${ff};
}
.none-flow-card {
  width: 100%;
  max-width: 420px;
  background: #0f172a;
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.15);
  overflow: hidden;
  position: relative;
  text-align: center;
  padding: 36px 24px;
}
.none-spinner-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.none-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: none-spin 0.9s linear infinite;
}
@keyframes none-spin {
  to { transform: rotate(360deg); }
}
.none-flow-title {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8px;
}
.none-flow-subtitle {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 24px;
}
.none-flow-btn {
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(56, 189, 248, 0.4);
  cursor: pointer;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.1);
  transition: all 0.15s ease;
}
.none-flow-btn:hover {
  background: rgba(14, 165, 233, 0.2);
}
.none-footnote {
  margin-top: 20px;
  font-size: 11.5px;
  color: #64748b;
}
`;

export const nonePages = {
  [CampaignPageType.HOME]: {
    css: noneFlowCss,
    html: `
<div class="none-flow-page none-flow-home">
  <div class="none-flow-card">
    <div class="none-spinner-wrap">
      <div class="none-spinner"></div>
    </div>
    <h1 class="none-flow-title">Connecting to {{operator}}...</h1>
    <p class="none-flow-subtitle">Redirecting you to the secure operator payment portal. Please wait a moment.</p>

    <button type="button" data-action="SUBSCRIBE" class="none-flow-btn">
      Tap here if not redirected automatically &#x2192;
    </button>

    <p class="none-footnote">Secured by {{operator}} Mobile Services</p>
  </div>
</div>`,
  },

  [CampaignPageType.THANKYOU]: {
    css: noneFlowCss,
    html: `
<div class="none-flow-page none-flow-thankyou">
  <div class="none-flow-card">
    <h1 class="none-flow-title" style="color:#34d399;">Subscription Complete</h1>
    <p class="none-flow-subtitle">Your subscription has been confirmed by <strong>{{operator}}</strong>.</p>
    <button type="button" data-action="HOME" class="none-flow-btn">
      Return to Portal
    </button>
  </div>
</div>`,
  },

  [CampaignPageType.ERROR]: {
    css: noneFlowCss,
    html: `
<div class="none-flow-page none-flow-error">
  <div class="none-flow-card">
    <h1 class="none-flow-title" style="color:#f87171;">Connection Failed</h1>
    <p class="none-flow-subtitle">Unable to connect to {{operator}} gateway. Please try again.</p>
    <button type="button" data-action="HOME" class="none-flow-btn">
      Try Again
    </button>
  </div>
</div>`,
  },
};
