import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiCallType } from '../../../database/entities/api-call-log.entity.js';
import {
  DCB_EXPOSE_INBOUND_CALL_TYPES,
  DCB_EXPOSE_INBOUND_EVENT_TYPES,
  DCB_EXPOSE_VISIT_POLICY,
  serializeDcbExposeInboundBody,
} from './dcb-expose-inbound.js';

describe('DCB expose inbound logging', () => {
  it('uses call types that fit api_call_logs.call_type varchar(32)', () => {
    for (const callType of Object.values(DCB_EXPOSE_INBOUND_CALL_TYPES)) {
      assert.ok(String(callType).length <= 32, callType);
    }
    assert.equal(
      DCB_EXPOSE_INBOUND_CALL_TYPES.config,
      ApiCallType.DCB_EXPOSE_CONFIG_IN,
    );
    assert.equal(
      DCB_EXPOSE_INBOUND_CALL_TYPES.pincode,
      ApiCallType.DCB_EXPOSE_PINCODE_IN,
    );
  });

  it('maps pincode/confirm hits to visit events so campaign sessions show failures', () => {
    assert.equal(DCB_EXPOSE_INBOUND_EVENT_TYPES.config, null);
    assert.equal(DCB_EXPOSE_INBOUND_EVENT_TYPES.pincode, 'OTP_SEND');
    assert.equal(DCB_EXPOSE_INBOUND_EVENT_TYPES.confirm, 'OTP_VERIFY');
  });

  it('keeps MSISDN, PIN, and requestId in the inbound body', () => {
    const body = JSON.parse(
      serializeDcbExposeInboundBody({
        campaignId: 22,
        vendorId: 2,
        msisdn: '566891023',
        pin: '1234',
        requestId: '16726123',
        purchaseTypeId: 3,
        pack: 'weekly',
      }),
    );
    assert.equal(body.msisdn, '566891023');
    assert.equal(body.pin, '1234');
    assert.equal(body.requestId, '16726123');
    assert.equal(body.pack, 'weekly');
    assert.equal(body.campaignId, 22);
    assert.equal(body.vendorId, 2);
  });

  it('does not reuse MSISDN visits or mint click ids', () => {
    assert.equal(DCB_EXPOSE_VISIT_POLICY.reuseVisitByMsisdn, false);
    assert.equal(DCB_EXPOSE_VISIT_POLICY.mintClickId, false);
    assert.equal(DCB_EXPOSE_VISIT_POLICY.confirmUsesPincodeVisit, true);
  });

  it('timeline hops are inbound expose then provider DCB', () => {
    assert.deepEqual(
      [
        ApiCallType.DCB_EXPOSE_CONFIG_IN,
        ApiCallType.DCB_CONFIG,
        ApiCallType.DCB_EXPOSE_PINCODE_IN,
        ApiCallType.DCB_PINCODE,
      ],
      [
        'dcb_expose_config_in',
        'dcb_config',
        'dcb_expose_pincode_in',
        'dcb_pincode',
      ],
    );
  });
});
