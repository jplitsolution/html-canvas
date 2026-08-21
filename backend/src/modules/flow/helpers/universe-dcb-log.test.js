import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildUniverseDcbLogRecord,
  sanitizeUniverseDcbLogValue,
} from './universe-dcb-log.js';

describe('Universe DCB API logging', () => {
  it('keeps PINs, OTPs, and provider request IDs in log payloads', () => {
    assert.deepEqual(
      sanitizeUniverseDcbLogValue({
        pinCode: '1234',
        nested: { otp: '9999', requestId: 'provider-secret' },
        code: 'RenewalDaily',
      }),
      {
        pinCode: '1234',
        nested: { otp: '9999', requestId: 'provider-secret' },
        code: 'RenewalDaily',
      },
    );
  });

  it('builds a visit-attributed log with request metadata and latency', () => {
    const record = buildUniverseDcbLogRecord({
      ctx: {
        visitId: 42,
        campaign: { id: 19 },
        visit: { clickId: 'click-1', rcid: 'rcid-1' },
        msisdn: '972500000000',
        serviceId: '581',
        purchaseTypeId: '4',
        transactionChannel: 'Wifi',
        source: 'confirm',
      },
      callType: 'dcb_confirm',
      action: 'confirm',
      response: {
        status: 200,
        data: { success: true, requestId: 'provider-secret' },
        logMeta: {
          endpointName: 'confirm',
          method: 'POST',
          url: 'https://provider.example/api/dcb/confirm',
          latencyMs: 125,
          serverRequestId: 'server-request',
          payload: { pinCode: '1234', requestId: 'provider-secret' },
        },
      },
      statusLabel: 'POLLING',
    });

    assert.equal(record.visitId, 42);
    assert.equal(record.clickId, 'click-1');
    assert.equal(record.rcid, 'rcid-1');
    assert.equal(record.success, true);
    assert.equal(record.statusLabel, 'POLLING');
    assert.match(record.requestBody, /"latencyMs":125/);
    assert.match(record.requestBody, /"pinCode":"1234"/);
    assert.match(record.requestBody, /provider-secret/);
    assert.match(record.responseBody, /provider-secret/);
  });
});
