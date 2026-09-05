import React from 'react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { ApiField } from '../common/ApiField';
import { TemplateVariablesLegend } from '../common/TemplateVariablesLegend';
import { testSendOtp, testVerifyOtp } from '../../../../services/api/campaigns';

export function OrangeBfTab({
  orangeBfConfig,
  setOrangeBfConfig,
  campaignId,
  testPhone,
  setTestPhone,
  testOtp,
  setTestOtp,
  testing,
  setTesting,
  testResult,
  setTestResult,
  lastProviderRequestId,
  setLastProviderRequestId,
  formatTestResult,
}) {
  const handleOrangeBfTestSend = async () => {
    if (!testPhone) {
      alert('Please enter a phone number (+226...) for testing');
      return;
    }
    setTesting(true);
    setTestResult('');
    try {
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '');
      const sendUrl =
        orangeBfConfig.sendUrl?.trim() ||
        `${baseClean}/subapi/auth/otp/generate?msisdn={{msisdn}}&language=${
          orangeBfConfig.language || '_E'
        }`;
      const res = await testSendOtp({
        phone: testPhone,
        provider: 'partner',
        config: JSON.stringify({
          sendUrl,
          method: orangeBfConfig.sendMethod || 'GET',
          bodyJson: orangeBfConfig.sendBodyJson || '',
          headersJson: orangeBfConfig.headersJson || '',
          successKey: orangeBfConfig.successKey || 'responseCode',
          successValue: orangeBfConfig.successValue || '0',
        }),
        campaignId,
      });
      if (res.providerRequestId) setLastProviderRequestId(res.providerRequestId);
      setTestResult(formatTestResult('SEND OTP', res));
    } catch (err) {
      setTestResult(`🔴 Dispatch error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleOrangeBfTestVerify = async () => {
    if (!testPhone || !testOtp) {
      alert('Please enter phone and OTP code');
      return;
    }
    setTesting(true);
    setTestResult('');
    try {
      const baseClean = (orangeBfConfig.baseUrl || 'http://103.153.58.55').replace(/\/$/, '');
      const verifyUrl =
        orangeBfConfig.verifyUrl?.trim() ||
        `${baseClean}/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}`;
      const res = await testVerifyOtp({
        phone: testPhone,
        otp: testOtp,
        provider: 'partner',
        config: JSON.stringify({
          verifyUrl,
          verifyMethod: orangeBfConfig.verifyMethod || 'GET',
          verifyBodyJson: orangeBfConfig.verifyBodyJson || '',
          headersJson: orangeBfConfig.headersJson || '',
          successKey: orangeBfConfig.successKey || 'responseCode',
          successValue: orangeBfConfig.successValue || '0',
        }),
        providerRequestId: lastProviderRequestId || undefined,
        campaignId,
      });
      setTestResult(formatTestResult('VERIFY OTP', res));
    } catch (err) {
      setTestResult(`🔴 Verify error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#ff7900] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            Orange BF
          </span>
          <p className="text-xs font-semibold text-fg">
            Orange Burkina Faso — Subscription REST API v1.0.0
          </p>
        </div>
        <p className="mt-1 text-xs text-fg-muted">
          Fully dynamic OTP & CheckSub engine. You can configure carrier parameters, custom endpoint
          URLs, GET/POST methods, request JSON bodies, and chain variables across requests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ApiField label="API Base URL" hint="Carrier API Host">
            <Input
              value={orangeBfConfig.baseUrl}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, baseUrl: e.target.value }))}
              placeholder="http://103.153.58.55"
            />
          </ApiField>
        </div>

        <ApiField label="Parent Service ID (serviceId)" hint="e.g. Health Portal Livliness">
          <Input
            value={orangeBfConfig.serviceId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, serviceId: e.target.value }))}
            placeholder="Health Portal Livliness"
          />
        </ApiField>

        <ApiField
          label="Sub-Service Plan ID (subServiceId)"
          hint="e.g. Health Portal Livliness pass jour"
        >
          <Input
            value={orangeBfConfig.subServiceId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, subServiceId: e.target.value }))}
            placeholder="Health Portal Livliness pass jour"
          />
        </ApiField>

        <ApiField label="Content Provider ID (cpId)" hint="Default: 100">
          <Input
            value={orangeBfConfig.cpId}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, cpId: e.target.value }))}
            placeholder="100"
          />
        </ApiField>

        <ApiField label="Channel" hint="Default: ussd">
          <Input
            value={orangeBfConfig.channel}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, channel: e.target.value }))}
            placeholder="ussd"
          />
        </ApiField>

        <ApiField label="Country Code" hint="Default: BF">
          <Input
            value={orangeBfConfig.country}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, country: e.target.value }))}
            placeholder="BF"
          />
        </ApiField>

        <ApiField label="Operator Code" hint="Default: ORG">
          <Input
            value={orangeBfConfig.operator}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, operator: e.target.value }))}
            placeholder="ORG"
          />
        </ApiField>

        <ApiField label="SMS Language" hint="_E (English) or _A (Arabic)">
          <select
            className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
            value={orangeBfConfig.language}
            onChange={(e) => setOrangeBfConfig((s) => ({ ...s, language: e.target.value }))}
          >
            <option value="_E">English (_E)</option>
            <option value="_A">Arabic (_A)</option>
          </select>
        </ApiField>

        <div className="grid grid-cols-2 gap-2">
          <ApiField label="Success Key" hint="default: responseCode">
            <Input
              value={orangeBfConfig.successKey}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successKey: e.target.value }))}
              placeholder="responseCode"
            />
          </ApiField>
          <ApiField label="Success Value" hint="default: 0">
            <Input
              value={orangeBfConfig.successValue}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, successValue: e.target.value }))}
              placeholder="0"
            />
          </ApiField>
        </div>
      </div>

      {/* Collapsible Advanced Custom Endpoints & Request Payloads */}
      <details className="rounded-xl border border-border bg-bg-elevated p-4">
        <summary className="cursor-pointer text-sm font-semibold text-fg select-none">
          ⚙️ Advanced Custom Endpoints, Methods & Request Payloads
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-xs text-fg-muted">
            Override default URL paths, HTTP methods (GET/POST), request body JSON, and custom headers. You can use dynamic template variables.
          </p>

          <TemplateVariablesLegend />

          {/* Send OTP Custom Config */}
          <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
            <p className="text-xs font-semibold text-fg">1. Send / Generate OTP API</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <ApiField
                  label="Custom Send OTP URL (optional)"
                  hint="Leave blank for default /subapi/auth/otp/generate"
                >
                  <Input
                    value={orangeBfConfig.sendUrl || ''}
                    onChange={(e) => setOrangeBfConfig((s) => ({ ...s, sendUrl: e.target.value }))}
                    placeholder="http://103.153.58.55/subapi/auth/otp/generate?msisdn={{msisdn}}&language=_E"
                  />
                </ApiField>
              </div>
              <div>
                <ApiField label="Method">
                  <select
                    className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                    value={orangeBfConfig.sendMethod || 'GET'}
                    onChange={(e) =>
                      setOrangeBfConfig((s) => ({ ...s, sendMethod: e.target.value }))
                    }
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </ApiField>
              </div>
            </div>
            {orangeBfConfig.sendMethod === 'POST' && (
              <ApiField
                label="Send OTP Request Body (JSON)"
                hint="Variables like {{msisdn}}, {{serviceId}} supported"
              >
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.sendBodyJson || ''}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, sendBodyJson: e.target.value }))
                  }
                  placeholder='{"msisdn": "{{msisdn}}", "serviceId": "{{serviceId}}", "channel": "{{channel}}"}'
                />
              </ApiField>
            )}
          </div>

          {/* Verify OTP Custom Config */}
          <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
            <p className="text-xs font-semibold text-fg">2. Validate / Verify OTP API</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <ApiField
                  label="Custom Verify OTP URL (optional)"
                  hint="Leave blank for default /subapi/auth/otp/validate"
                >
                  <Input
                    value={orangeBfConfig.verifyUrl || ''}
                    onChange={(e) =>
                      setOrangeBfConfig((s) => ({ ...s, verifyUrl: e.target.value }))
                    }
                    placeholder="http://103.153.58.55/subapi/auth/otp/validate?msisdn={{msisdn}}&otp={{otp}}"
                  />
                </ApiField>
              </div>
              <div>
                <ApiField label="Method">
                  <select
                    className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                    value={orangeBfConfig.verifyMethod || 'GET'}
                    onChange={(e) =>
                      setOrangeBfConfig((s) => ({ ...s, verifyMethod: e.target.value }))
                    }
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </ApiField>
              </div>
            </div>
            {orangeBfConfig.verifyMethod === 'POST' && (
              <ApiField
                label="Verify OTP Request Body (JSON)"
                hint="Can include chained {{transactionId}}, {{msisdn}}, {{otp}}"
              >
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.verifyBodyJson || ''}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, verifyBodyJson: e.target.value }))
                  }
                  placeholder='{"msisdn": "{{msisdn}}", "otp": "{{otp}}", "transactionId": "{{transactionId}}"}'
                />
              </ApiField>
            )}
          </div>

          {/* CheckSub Custom Config */}
          <div className="space-y-2 rounded-lg border border-border/80 p-3 bg-bg-base">
            <p className="text-xs font-semibold text-fg">3. Check Subscription (CheckSub) API</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <ApiField
                  label="Custom CheckSub URL (optional)"
                  hint="Leave blank for default /subapi/checksub"
                >
                  <Input
                    value={orangeBfConfig.checksubUrl || ''}
                    onChange={(e) =>
                      setOrangeBfConfig((s) => ({ ...s, checksubUrl: e.target.value }))
                    }
                    placeholder="http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId={{serviceId}}"
                  />
                </ApiField>
              </div>
              <div>
                <ApiField label="Method">
                  <select
                    className="w-full rounded-lg border border-border bg-bg-base px-3 py-2 text-sm text-fg outline-none focus:border-primary"
                    value={orangeBfConfig.checksubMethod || 'GET'}
                    onChange={(e) =>
                      setOrangeBfConfig((s) => ({ ...s, checksubMethod: e.target.value }))
                    }
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </ApiField>
              </div>
            </div>
            {orangeBfConfig.checksubMethod === 'POST' && (
              <ApiField label="CheckSub Request Body (JSON)">
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
                  value={orangeBfConfig.checksubBodyJson || ''}
                  onChange={(e) =>
                    setOrangeBfConfig((s) => ({ ...s, checksubBodyJson: e.target.value }))
                  }
                  placeholder='{"msisdn": "{{msisdn}}", "serviceId": "{{serviceId}}"}'
                />
              </ApiField>
            )}
          </div>

          {/* Custom Request Headers */}
          <ApiField
            label="Custom Request Headers (JSON, optional)"
            hint='e.g. {"Authorization": "Bearer ..."}'
          >
            <textarea
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-base p-2 font-mono text-xs text-fg outline-none focus:border-primary"
              value={orangeBfConfig.headersJson || ''}
              onChange={(e) => setOrangeBfConfig((s) => ({ ...s, headersJson: e.target.value }))}
              placeholder='{"Content-Type": "application/json"}'
            />
          </ApiField>
        </div>
      </details>

      <div className="space-y-3 rounded-xl border border-dashed border-border bg-bg-subtle/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Orange BF Live OTP Test
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ApiField label="Test Phone (+226...)">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. 56864685"
            />
          </ApiField>
          <ApiField label="OTP from SMS">
            <Input
              value={testOtp}
              onChange={(e) => setTestOtp(e.target.value)}
              placeholder="e.g. 4827"
            />
          </ApiField>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={handleOrangeBfTestSend} disabled={testing}>
            {testing ? 'Sending...' : 'Send Orange BF OTP'}
          </Button>
          <Button variant="primary" size="sm" onClick={handleOrangeBfTestVerify} disabled={testing}>
            Verify Orange BF OTP
          </Button>
        </div>
        {testResult && (
          <div className="mt-2 max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg-base p-2 font-mono text-xs">
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
