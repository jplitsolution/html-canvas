import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUniverseDcbProvider } from './universe-dcb.provider.js';

const config = {
  baseUrl: 'https://provider.example',
  serviceId: '581',
  merchantId: '169',
  operatorCode: 'WM',
};

describe('Universe DCB provider logging metadata', () => {
  it('returns request metadata for successful calls', async () => {
    const http = {
      request: async () => ({
        status: 200,
        data: { success: true, data: { requestId: 'provider-request' } },
      }),
    };
    const provider = createUniverseDcbProvider(http);
    const response = await provider.requestPincode(config, {
      msisdn: '972500000000',
      serviceId: '581',
      purchaseTypeId: '2',
      transactionChannel: 'Wifi',
    });

    assert.equal(response.status, 200);
    assert.equal(response.logMeta.endpointName, 'pincode');
    assert.equal(response.logMeta.method, 'POST');
    assert.equal(response.logMeta.url, 'https://provider.example/api/dcb/pincode');
    assert.equal(response.logMeta.payload.purchaseTypeId, '2');
    assert.equal(typeof response.logMeta.latencyMs, 'number');
  });

  it('attaches request metadata and provider response to errors', async () => {
    const http = {
      request: async () => {
        const error = new Error('upstream rejected');
        error.response = {
          status: 422,
          data: { success: false, requestId: 'provider-request' },
        };
        throw error;
      },
    };
    const provider = createUniverseDcbProvider(http);

    await assert.rejects(
      provider.confirm(config, {
        msisdn: '972500000000',
        serviceId: '581',
        purchaseTypeId: '2',
        providerRequestId: 'provider-request',
        pin: '1234',
      }),
      (error) => {
        assert.equal(error.providerStatus, 422);
        assert.equal(error.logMeta.endpointName, 'confirm');
        assert.equal(error.logMeta.payload.pinCode, '1234');
        assert.deepEqual(error.providerData, {
          success: false,
          requestId: 'provider-request',
        });
        return true;
      },
    );
  });
});
