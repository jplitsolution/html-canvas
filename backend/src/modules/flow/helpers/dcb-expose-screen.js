/**
 * Vendor-facing DCB billing HTML: packs → number → PIN → poll status.
 * Same contract as the downloaded API JSON (config → pincode → confirm → status).
 */

export function buildDcbExposeScreenUrls(origin, campaignId, vendorId) {
  const host = String(origin || 'https://your-domain.com').replace(/\/$/, '');
  const cid = campaignId || '{campaignId}';
  const vid = vendorId || '{vendorId}';
  const base = `${host}/api/flow/dcb/${cid}/${vid}`;
  return {
    base,
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status`,
    screenUrl: `${base}/screen`,
  };
}

function jsLiteral(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildDcbExposeHtmlScreen({
  origin,
  campaignId,
  vendorId,
  absolute = false,
} = {}) {
  const cid = campaignId || '{campaignId}';
  const vid = vendorId || '{vendorId}';
  const host = absolute ? String(origin || '').replace(/\/$/, '') : '';
  const base = `${host}/api/flow/dcb/${cid}/${vid}`;
  const cfg = jsLiteral({
    configUrl: `${base}/config`,
    pincodeUrl: `${base}/pincode`,
    confirmUrl: `${base}/confirm`,
    statusUrl: `${base}/status`,
    purchaseTypeId: '',
    transactionChannel: 'Wifi',
    pollMs: 2000,
    timeoutMs: 60000,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Subscribe</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      min-height: 100vh;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%);
      color: #0f172a;
    }
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .accent { height: 6px; background: linear-gradient(90deg, #7c4dff, #00e5ff); }
    .inner { padding: 32px 28px 28px; text-align: center; }
    .icon {
      width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
      background: #eef2ff;
    }
    .icon.ok { background: #ecfdf5; }
    .icon.warn { background: #fff7ed; }
    .icon.err { background: #fef2f2; }
    h1 { margin: 0 0 10px; font-size: 22px; font-weight: 800; line-height: 1.25; }
    .sub { margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #64748b; }
    label {
      display: block; text-align: left; font-size: 12px; font-weight: 600;
      color: #64748b; margin-bottom: 6px;
    }
    input {
      width: 100%; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 12px 14px; font-size: 16px; outline: none; font-family: inherit;
    }
    input:focus { border-color: #7c4dff; box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.15); }
    .field { text-align: left; margin-bottom: 12px; }
    .plans { display: flex; flex-direction: column; gap: 10px; text-align: left; margin: 0 0 16px; }
    .plan {
      position: relative; width: 100%; border: 2px solid #e2e8f0; border-radius: 14px;
      padding: 14px 16px; background: #fff; cursor: pointer; text-align: left; font-family: inherit;
    }
    .plan:hover { border-color: #c7d2fe; background: #fafaff; }
    .plan.on { border-color: #7c4dff; background: #f5f3ff; box-shadow: 0 0 0 1px #7c4dff; }
    .plan-period { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #7c4dff; }
    .plan-name { display: block; font-size: 16px; font-weight: 800; }
    .plan-desc { display: block; font-size: 12px; color: #64748b; margin-top: 2px; }
    .btn {
      width: 100%; border: none; cursor: pointer; padding: 16px 24px; border-radius: 12px;
      font-size: 16px; font-weight: 700; color: #fff; font-family: inherit;
      background: linear-gradient(135deg, #7c4dff, #6d28d9);
      box-shadow: 0 8px 24px rgba(124, 77, 255, 0.35);
    }
    .btn:active { transform: scale(0.98); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-ghost {
      background: transparent; box-shadow: none; color: #7c4dff; padding: 12px;
      font-size: 13px; font-weight: 600;
    }
    .err { min-height: 18px; color: #dc2626; font-size: 13px; margin-bottom: 8px; }
    .status { min-height: 18px; color: #64748b; font-size: 12px; margin-bottom: 10px; }
    .note { margin-top: 14px; font-size: 11px; color: #94a3b8; line-height: 1.5; }
    .spin {
      width: 36px; height: 36px; margin: 0 auto 16px; border-radius: 50%;
      border: 3px solid #e2e8f0; border-top-color: #7c4dff; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .info {
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
      padding: 14px; font-size: 13px; color: #166534; text-align: left; margin-top: 8px;
    }
    .info.warn { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
    .info.err { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="accent"></div>
      <div class="inner" id="app"></div>
    </div>
  </div>
  <script>
  (function () {
    var CFG = ${cfg};
    var PACKS = [];
    var packsLoaded = false;
    var state = {
      view: 'number',
      msisdn: '',
      pin: '',
      purchaseTypeId: CFG.purchaseTypeId || '',
      requestId: '',
      error: '',
      status: '',
      busy: false
    };
    var pollTimer = null;

    function el(html) {
      document.getElementById('app').innerHTML = html;
    }
    function digits(value) { return String(value || '').replace(/\\D/g, ''); }
    function esc(value) {
      return String(value || '').replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    }
    function setError(message) {
      state.error = message || '';
      var node = document.getElementById('err');
      if (node) node.textContent = state.error;
    }
    function setStatus(message) {
      state.status = message || '';
      var node = document.getElementById('status');
      if (node) node.textContent = state.status;
    }
    function setBusy(busy) {
      state.busy = !!busy;
      var buttons = document.querySelectorAll('.btn:not(.btn-ghost)');
      for (var i = 0; i < buttons.length; i++) buttons[i].disabled = state.busy;
    }

    async function api(url, options) {
      var res = await fetch(url, options);
      var data = {};
      try { data = await res.json(); } catch (e) { data = {}; }
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }
      return data;
    }

    function renderLoading() {
      el(
        '<div class="spin"></div>' +
        '<h1>Loading packs…</h1>' +
        '<p class="sub">Fetching billing plans for this campaign.</p>'
      );
    }

    function renderNumber() {
      var packs = PACKS.map(function (pack) {
        var on = String(state.purchaseTypeId) === String(pack.id) ? ' on' : '';
        return '<button type="button" class="plan' + on + '" data-pack="' + pack.id + '">' +
          '<span class="plan-period">' + pack.period + '</span>' +
          '<span class="plan-name">' + pack.name + '</span>' +
          '<span class="plan-desc">' + pack.desc + '</span></button>';
      }).join('');
      el(
        '<div class="icon">📱</div>' +
        '<h1>Enter your number</h1>' +
        '<p class="sub">Choose a pack. A billing PIN will be sent by SMS to confirm the subscription.</p>' +
        '<div class="field"><label for="msisdn">Mobile number</label>' +
        '<input id="msisdn" inputmode="numeric" autocomplete="tel" placeholder="e.g. 566891023" value="' + esc(state.msisdn) + '" /></div>' +
        '<div class="plans">' + packs + '</div>' +
        '<div class="err" id="err">' + esc(state.error) + '</div>' +
        '<div class="status" id="status">' + esc(state.status) + '</div>' +
        '<button type="button" class="btn" id="send">Send billing PIN</button>' +
        '<p class="note">This page calls WAP Manager billing APIs only. Operator billing, logs, and payout hold run on the server.</p>'
      );
      document.getElementById('msisdn').addEventListener('input', function (e) {
        state.msisdn = digits(e.target.value);
        e.target.value = state.msisdn;
      });
      document.querySelectorAll('[data-pack]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.purchaseTypeId = btn.getAttribute('data-pack');
          renderNumber();
        });
      });
      document.getElementById('send').addEventListener('click', sendPin);
    }

    function renderPin() {
      el(
        '<div class="icon">🔐</div>' +
        '<h1>Confirm billing PIN</h1>' +
        '<p class="sub">Enter the billing PIN sent to <strong>' + esc(state.msisdn) + '</strong>.</p>' +
        '<div class="field"><label for="pin">Billing PIN</label>' +
        '<input id="pin" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter billing PIN" value="' + esc(state.pin) + '" /></div>' +
        '<div class="err" id="err">' + esc(state.error) + '</div>' +
        '<div class="status" id="status">' + esc(state.status) + '</div>' +
        '<button type="button" class="btn" id="confirm">Confirm billing PIN</button>' +
        '<button type="button" class="btn btn-ghost" id="back">Change number</button>' +
        '<p class="note">Dummy PIN 1234 also works in test.</p>'
      );
      document.getElementById('pin').addEventListener('input', function (e) {
        state.pin = digits(e.target.value).slice(0, 8);
        e.target.value = state.pin;
      });
      document.getElementById('confirm').addEventListener('click', confirmPin);
      document.getElementById('back').addEventListener('click', function () {
        state.pin = '';
        state.requestId = '';
        state.error = '';
        state.status = '';
        state.view = 'number';
        render();
      });
    }

    function renderPoll() {
      el(
        '<div class="spin"></div>' +
        '<h1>Activating…</h1>' +
        '<p class="sub">PIN confirmed. Waiting until the subscription is entitled.</p>' +
        '<div class="status" id="status">' + esc(state.status || 'Checking status…') + '</div>'
      );
    }

    function renderSuccess() {
      el(
        '<div class="icon ok">🎉</div>' +
        '<h1>You\\'re subscribed!</h1>' +
        '<p class="sub">Your pack is now active on this number.</p>' +
        '<div class="info">A confirmation SMS will be sent to ' + esc(state.msisdn) + ' shortly.</div>'
      );
    }

    function renderLowBalance() {
      el(
        '<div class="icon warn">💳</div>' +
        '<h1>Low balance</h1>' +
        '<p class="sub">This number does not have enough credit to complete the subscription.</p>' +
        '<div class="info warn">Top up ' + esc(state.msisdn) + ' and try again.</div>' +
        '<button type="button" class="btn" id="retry" style="margin-top:16px">Try another number</button>'
      );
      document.getElementById('retry').addEventListener('click', resetToNumber);
    }

    function renderError(title, message) {
      el(
        '<div class="icon err">⚠️</div>' +
        '<h1>' + esc(title || 'Something went wrong') + '</h1>' +
        '<p class="sub">' + esc(message || 'Please try again.') + '</p>' +
        '<div class="info err">If this keeps happening, wait a moment and retry with the same number.</div>' +
        '<button type="button" class="btn" id="retry" style="margin-top:16px">Try again</button>'
      );
      document.getElementById('retry').addEventListener('click', resetToNumber);
    }

    function resetToNumber() {
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
      state.view = 'number';
      state.pin = '';
      state.requestId = '';
      state.error = '';
      state.status = '';
      state.busy = false;
      render();
    }

    function render() {
      if (!packsLoaded) return renderLoading();
      if (state.view === 'pin') return renderPin();
      if (state.view === 'poll') return renderPoll();
      if (state.view === 'success') return renderSuccess();
      if (state.view === 'low_balance') return renderLowBalance();
      if (state.view === 'error') return renderError(state.error, state.status);
      return renderNumber();
    }

    async function sendPin() {
      state.msisdn = digits(document.getElementById('msisdn') && document.getElementById('msisdn').value || state.msisdn);
      if (!state.msisdn) { setError('Enter a mobile number'); return; }
      if (!state.purchaseTypeId) { setError('Choose a pack'); return; }
      setError('');
      setStatus('Sending PIN…');
      setBusy(true);
      try {
        var data = await api(CFG.pincodeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msisdn: state.msisdn,
            purchaseTypeId: Number(state.purchaseTypeId),
            pack: (PACKS.find(function (pack) { return String(pack.id) === String(state.purchaseTypeId); }) || {}).packKey || undefined,
            transactionChannel: CFG.transactionChannel
          })
        });
        state.requestId = String(data.requestId || data.request_id || data.id || '');
        if (!state.requestId) throw new Error('PIN was sent but requestId is missing');
        state.pin = '';
        state.error = '';
        state.status = data.message || 'PIN requested successfully';
        state.view = 'pin';
        render();
      } catch (err) {
        setError(err.message || 'Could not send PIN');
        setStatus('');
      } finally {
        setBusy(false);
      }
    }

    async function confirmPin() {
      state.pin = digits(document.getElementById('pin') && document.getElementById('pin').value || state.pin);
      if (!state.pin) { setError('Enter the billing PIN'); return; }
      if (!state.requestId) { setError('Send a PIN first'); return; }
      setError('');
      setStatus('Confirming PIN…');
      setBusy(true);
      try {
        await api(CFG.confirmUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: state.requestId, pin: state.pin })
        });
        state.view = 'poll';
        state.status = 'PIN confirmed. Checking entitlement…';
        render();
        pollStatus(Date.now());
      } catch (err) {
        setError(err.message || 'PIN confirmation failed');
        setStatus('');
        setBusy(false);
      }
    }

    function outcomeOf(data) {
      return String(data && (data.outcome || data.status) || '').toUpperCase();
    }

    async function pollStatus(startedAt) {
      if (Date.now() - startedAt >= CFG.timeoutMs) {
        state.view = 'error';
        state.error = 'Still processing';
        state.status = 'The subscription did not become entitled in time. You can retry or wait for the SMS.';
        render();
        return;
      }
      try {
        var data = await api(CFG.statusUrl + '?msisdn=' + encodeURIComponent(state.msisdn), { method: 'GET' });
        var outcome = outcomeOf(data);
        if (outcome === 'ENTITLED' || data.entitlementActive === true) {
          state.view = 'success';
          render();
          return;
        }
        if (outcome === 'LOW_BALANCE') {
          state.view = 'low_balance';
          render();
          return;
        }
        if (outcome === 'TERMINAL_FAILURE' || outcome === 'PARSE_ERROR') {
          state.view = 'error';
          state.error = 'Subscription failed';
          state.status = data.message || 'The operator could not complete billing.';
          render();
          return;
        }
        setStatus('Waiting for entitlement…');
      } catch (err) {
        setStatus(err.message || 'Retrying status…');
      }
      pollTimer = setTimeout(function () { pollStatus(startedAt); }, CFG.pollMs);
    }

    async function loadPacks() {
      try {
        var data = await api(CFG.configUrl, { method: 'GET' });
        var list = data.purchaseTypes || data.purchaseTypeMappings || [];
        PACKS = list.map(function (item) {
          var id = String(item.purchaseTypeId || item.id || '');
          var label = item.label || item.packKey || item.code || ('Pack ' + id);
          return {
            id: id,
            packKey: item.packKey || '',
            period: label,
            name: label,
            desc: item.code || item.packKey || ''
          };
        }).filter(function (pack) { return pack.id; });
        if (!PACKS.length) throw new Error('No packs are mapped for this campaign');
        var selected = PACKS.some(function (pack) {
          return String(pack.id) === String(state.purchaseTypeId);
        });
        if (!selected) state.purchaseTypeId = PACKS[0].id;
        if (data.pollIntervalMs) CFG.pollMs = Number(data.pollIntervalMs) || CFG.pollMs;
        if (data.pollTimeoutMs) CFG.timeoutMs = Number(data.pollTimeoutMs) || CFG.timeoutMs;
      } catch (err) {
        state.view = 'error';
        state.error = 'Could not load packs';
        state.status = err.message || 'Config request failed';
      }
      packsLoaded = true;
      render();
    }

    loadPacks();
  })();
  </script>
</body>
</html>`;
}
