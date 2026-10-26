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

  it('reads PinInfo.ID when the configured requestId path is missing', async () => {
    const http = {
      request: async () => ({
        status: 200,
        data: {
          success: true,
          requestId: 'envelope-uuid',
          data: {
            PinInfo: { ID: '16726123', PinCode: '0000' },
          },
        },
      }),
    };
    const provider = createUniverseDcbProvider(http);
    const response = await provider.requestPincode(
      {
        ...config,
        responsePaths: { requestId: 'data.requestId' },
      },
      {
        msisdn: '972500000000',
        serviceId: '581',
        purchaseTypeId: '2',
        transactionChannel: 'Wifi',
      },
    );
    assert.equal(response.providerRequestId, '16726123');
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

  it('uses PUT /api/dcb/confirmation with id and pinCode for confirm', async () => {
    let capturedRequest = null;
    const http = {
      request: async (req) => {
        capturedRequest = req;
        return {
          status: 200,
          data: { Success: true, message: 'PIN confirmed' },
        };
      },
    };
    const provider = createUniverseDcbProvider(http);
    const response = await provider.confirm(config, {
      providerRequestId: 'req-98765',
      pin: '5678',
    });

    assert.equal(response.status, 200);
    assert.equal(capturedRequest.method, 'PUT');
    assert.equal(
      capturedRequest.url,
      'https://provider.example/api/dcb/confirmation',
    );
    assert.deepEqual(capturedRequest.data, {
      id: 'req-98765',
      pinCode: '5678',
    });
  });

  it('extracts providerRequestId from top-level and providerResponse.PinInfo.ID', async () => {
    const http = {
      request: async () => ({
        status: 200,
        data: {
          Success: true,
          providerRequestId: 'top-req-111',
          providerResponse: {
            PinInfo: { ID: 'nested-pin-222' },
          },
        },
      }),
    };
    const provider = createUniverseDcbProvider(http);
    const response = await provider.requestPincode(config, {
      msisdn: '972500000000',
      serviceId: '581',
      purchaseTypeId: '2',
      transactionChannel: 'Wifi',
    });
    assert.equal(response.providerRequestId, 'top-req-111');
  });

  it('rejects with error when upstream returns Capital S Success: false', async () => {
    const http = {
      request: async () => ({
        status: 200,
        data: {
          Success: false,
          ErrorCode: 'InvalidPin',
          MessageEn: 'Invalid PIN entered',
        },
      }),
    };
    const provider = createUniverseDcbProvider(http);
    await assert.rejects(
      provider.confirm(config, {
        providerRequestId: 'req-123',
        pin: '0000',
      }),
      (err) => {
        assert.equal(err.code, 'DCB_PROVIDER_ERROR');
        assert.equal(err.providerData.Success, false);
        return true;
      },
    );
  });

  it('supports configurable confirmMethod (POST and GET)', async () => {
    let capturedMethod = null;
    let capturedData = null;
    let capturedParams = null;
    const http = {
      request: async (req) => {
        capturedMethod = req.method;
        capturedData = req.data;
        capturedParams = req.params;
        return {
          status: 200,
          data: { Success: true },
        };
      },
    };
    const provider = createUniverseDcbProvider(http);

    // Test POST
    await provider.confirm(
      { ...config, confirmMethod: 'POST' },
      { providerRequestId: 'req-post', pin: '1111' },
    );
    assert.equal(capturedMethod, 'POST');
    assert.deepEqual(capturedData, { id: 'req-post', pinCode: '1111' });

    // Test GET
    await provider.confirm(
      { ...config, confirmMethod: 'GET' },
      { providerRequestId: 'req-get', pin: '2222' },
    );
    assert.equal(capturedMethod, 'GET');
    assert.deepEqual(capturedParams, { id: 'req-get', pinCode: '2222' });
  });

  it('auto-rewrites legacy /api/dcb/confirm endpoint to /api/dcb/confirmation', async () => {
    let capturedUrl = null;
    const http = {
      request: async (req) => {
        capturedUrl = req.url;
        return { status: 200, data: { Success: true } };
      },
    };
    const provider = createUniverseDcbProvider(http);
    await provider.confirm(
      {
        ...config,
        endpoints: { confirm: '/api/dcb/confirm' },
      },
      { id: '17134651', pinCode: '0000' },
    );
    assert.equal(capturedUrl, 'https://provider.example/api/dcb/confirmation');
  });

  it('parses numeric id into a number and extracts operator error message', async () => {
    let capturedData = null;
    const http = {
      request: async (req) => {
        capturedData = req.data;
        const err = new Error('Request failed with status code 400');
        err.response = {
          status: 400,
          data: {
            Success: false,
            ErrorCode: 'WrongPincode',
            MessageEn: 'wrong pincode, try agian using the correct pincode!',
          },
        };
        throw err;
      },
    };
    const provider = createUniverseDcbProvider(http);
    await assert.rejects(
      provider.confirm(config, {
        providerRequestId: '17134651',
        pin: '1234',
      }),
      (err) => {
        assert.equal(capturedData.id, 17134651);
        assert.equal(capturedData.pinCode, '1234');
        assert.equal(err.code, 'DCB_PROVIDER_ERROR');
        assert.equal(err.providerErrorCode, 'WrongPincode');
        assert.equal(
          err.operatorMessage,
          'wrong pincode, try agian using the correct pincode!',
        );
        assert.equal(
          err.message,
          'wrong pincode, try agian using the correct pincode!',
        );
        return true;
      },
    );
  });
});


