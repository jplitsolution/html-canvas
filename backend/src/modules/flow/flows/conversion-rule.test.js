import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConversionRule,
  countFlowConversions,
  resolveConversionRule,
} from './conversion-rule.js';

describe('resolveConversionRule', () => {
  it('keeps CG on operator callback even if someone marks api expose', () => {
    const flow = {
      conversionRule: ConversionRule.OPERATOR_CALLBACK,
      allowsApiExpose: false,
    };
    assert.equal(
      resolveConversionRule(flow, { apiExpose: true }),
      ConversionRule.OPERATOR_CALLBACK,
    );
  });

  it('OTP/DCB API expose uses PIN/OTP verify rule', () => {
    const flow = {
      conversionRule: ConversionRule.SUBSCRIBE_OR_CALLBACK,
      allowsApiExpose: true,
    };
    assert.equal(
      resolveConversionRule(flow, { apiExpose: true }),
      ConversionRule.API_EXPOSE,
    );
  });

  it('Orange BF stays OTP-payout for WAP and expose', () => {
    const flow = {
      conversionRule: ConversionRule.OTP_PAYOUT,
      allowsApiExpose: true,
    };
    assert.equal(resolveConversionRule(flow), ConversionRule.OTP_PAYOUT);
    assert.equal(
      resolveConversionRule(flow, { apiExpose: true }),
      ConversionRule.OTP_PAYOUT,
    );
  });
});

describe('countFlowConversions', () => {
  it('does not count Orange BF fires as CG callbacks', () => {
    const grain = {
      billingReceived: 12,
      vendorSent: 5,
      subscribeSuccess: 9,
    };
    assert.equal(
      countFlowConversions(grain, ConversionRule.OPERATOR_CALLBACK),
      12,
    );
    assert.equal(countFlowConversions(grain, ConversionRule.OTP_PAYOUT), 5);
    assert.equal(
      countFlowConversions(grain, ConversionRule.SUBSCRIBE_OR_CALLBACK),
      12,
    );
  });
});
