#!/usr/bin/env node
/**
 * Universe DCB Gateway CLI & Manual Testing Tool
 *
 * Usage:
 *   node scripts/test-dcb-gateway.js pincode <msisdn> [purchaseTypeId]
 *   node scripts/test-dcb-gateway.js confirm <requestId> <pin>
 *   node scripts/test-dcb-gateway.js status <msisdn> [serviceId]
 *   node scripts/test-dcb-gateway.js --help
 */

import axios from 'axios';
import { normalizeUniverseDcbResponse } from '../src/modules/flow/helpers/universe-dcb-normalizer.js';

const DEFAULTS = {
  baseUrl: process.env.DCB_BASE_URL || 'https://bilunipal.tickhighs.com',
  merchantId: process.env.DCB_MERCHANT_ID || '169',
  serviceId: process.env.DCB_SERVICE_ID || '581',
  operator: process.env.DCB_OPERATOR || 'WM',
  purchaseTypeId: '3',
  transactionChannel: 'Wifi',
};

const args = process.argv.slice(2);
const command = (args[0] || '').toLowerCase();

function printHelp() {
  console.log(`
=============================================================================
             UNIVERSE DCB GATEWAY MANUAL TESTING CLI
=============================================================================

Base URL: ${DEFAULTS.baseUrl} (Service: ${DEFAULTS.serviceId}, Merchant: ${DEFAULTS.merchantId})

COMMANDS:
  1. Request PIN (API 06):
     node scripts/test-dcb-gateway.js pincode <msisdn> [purchaseTypeId]
     Example: node scripts/test-dcb-gateway.js pincode 566891023 3

  2. Confirm PIN (API 07):
     node scripts/test-dcb-gateway.js confirm <requestId> <pin> [PUT|POST|GET]
     Example: node scripts/test-dcb-gateway.js confirm 12345678 1234 PUT

  3. Subscriptions Status (API 13):
     node scripts/test-dcb-gateway.js status <msisdn> [serviceId]
     Example: node scripts/test-dcb-gateway.js status 566891023 581

OPTIONS / ENV VARS:
  DCB_BASE_URL     Override base URL (default: ${DEFAULTS.baseUrl})
  DCB_SERVICE_ID   Override service ID (default: ${DEFAULTS.serviceId})
  DCB_MERCHANT_ID  Override merchant ID (default: ${DEFAULTS.merchantId})
=============================================================================
`);
}

function extractRequestId(data) {
  if (!data || typeof data !== 'object') return null;
  const candidates = [
    data.providerRequestId,
    data.PinInfo?.ID,
    data.PinInfo?.Id,
    data.providerResponse?.PinInfo?.ID,
    data.providerResponse?.PinInfo?.Id,
    data.data?.PinInfo?.ID,
    data.data?.providerRequestId,
    data.data?.requestId,
    data.requestId,
    data.id,
    data.ID,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim()) {
      return String(c).trim();
    }
  }
  return null;
}

async function requestPincode(msisdn, purchaseTypeId = DEFAULTS.purchaseTypeId) {
  const url = `${DEFAULTS.baseUrl.replace(/\/+$/, '')}/api/dcb/pincode`;
  const payload = {
    merchantId: Number(DEFAULTS.merchantId) || DEFAULTS.merchantId,
    serviceId: Number(DEFAULTS.serviceId) || DEFAULTS.serviceId,
    purchaseTypeId: Number(purchaseTypeId) || purchaseTypeId,
    msisdn: String(msisdn).trim(),
    transactionChannel: DEFAULTS.transactionChannel,
    operator: DEFAULTS.operator,
    subscription: '',
  };

  console.log('\n--- [API 06] REQUEST PINCODE ---');
  console.log(`Endpoint: POST ${url}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const started = Date.now();
    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });
    const latency = Date.now() - started;

    console.log(`\nHTTP Status: ${res.status} (${latency}ms)`);
    console.log('Response Body:\n', JSON.stringify(res.data, null, 2));

    const reqId = extractRequestId(res.data);
    if (reqId) {
      console.log(`\n============================================================`);
      console.log(`>> Extracted Provider Request ID: ${reqId}`);
      console.log(`>> Next Step (Confirm PIN):`);
      console.log(`   node scripts/test-dcb-gateway.js confirm ${reqId} <PIN>`);
      console.log(`============================================================\n`);
    } else {
      console.log('\n[NOTE] No request ID could be extracted from response.');
    }
    return res.data;
  } catch (err) {
    console.error(`\n[ERROR] Request failed: ${err.message}`);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

async function confirmPin(id, pin, method = 'PUT') {
  const httpMethod = String(method || 'PUT').toUpperCase();
  const url = `${DEFAULTS.baseUrl.replace(/\/+$/, '')}/api/dcb/confirmation`;
  const payload = {
    id: String(id).trim(),
    pinCode: String(pin).trim(),
  };

  console.log('\n--- [API 07] CONFIRM PIN ---');
  console.log(`Endpoint: ${httpMethod} ${url}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const started = Date.now();
    const reqConfig = {
      method: httpMethod,
      url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true,
    };
    if (httpMethod === 'GET') reqConfig.params = payload;
    else reqConfig.data = payload;

    const res = await axios(reqConfig);
    const latency = Date.now() - started;

    console.log(`\nHTTP Status: ${res.status} (${latency}ms)`);
    console.log('Response Body:\n', JSON.stringify(res.data, null, 2));

    if (res.data?.success !== false && res.data?.Success !== false && res.status < 400) {
      console.log(`\n>> PIN Confirmation Successful / Accepted!`);
      console.log(`>> Next Step: Poll/Check subscriptions to verify entitlement.`);
    } else {
      console.log(`\n>> Upstream rejected confirmation (Invalid or expired PIN).`);
    }
    return res.data;
  } catch (err) {
    console.error(`\n[ERROR] Request failed: ${err.message}`);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

async function checkSubscriptions(msisdn, serviceId = DEFAULTS.serviceId) {
  const cleanMsisdn = String(msisdn).trim().replace(/\D/g, '');
  const url = `${DEFAULTS.baseUrl.replace(/\/+$/, '')}/api/dcb/subscriptions`;
  const params = {
    msisdn: cleanMsisdn,
    serviceId: Number(serviceId) || serviceId,
    current: true,
  };

  console.log('\n--- [API 13] SUBSCRIPTION STATUS ---');
  console.log(`Endpoint: GET ${url}`);
  console.log('Query Params:', params);

  try {
    const started = Date.now();
    const res = await axios.get(url, {
      params,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true,
    });
    const latency = Date.now() - started;

    console.log(`\nHTTP Status: ${res.status} (${latency}ms)`);
    console.log('Response Body:\n', JSON.stringify(res.data, null, 2));

    const normalized = normalizeUniverseDcbResponse(res.data, {}, { serviceId });
    console.log('\n============================================================');
    console.log('>> NORMALIZED OUTCOME EVALUATION:');
    console.log(`   Outcome:           ${normalized.outcome}`);
    console.log(`   Status:            ${normalized.status || 'N/A'}`);
    console.log(`   EntitlementActive: ${normalized.entitlementActive}`);
    console.log(`   Current:           ${normalized.current}`);
    if (normalized.reason) {
      console.log(`   Reason:            ${normalized.reason}`);
    }
    console.log('============================================================\n');
    return normalized;
  } catch (err) {
    console.error(`\n[ERROR] Request failed: ${err.message}`);
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

async function main() {
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }

  if (command === 'pincode' || command === 'pin') {
    const msisdn = args[1];
    const purchaseTypeId = args[2] || DEFAULTS.purchaseTypeId;
    if (!msisdn) {
      console.error('\nError: MSISDN is required. Example: node scripts/test-dcb-gateway.js pincode 566891023\n');
      process.exit(1);
    }
    await requestPincode(msisdn, purchaseTypeId);
    return;
  }

  if (command === 'confirm' || command === 'confirmation') {
    const reqId = args[1];
    const pin = args[2];
    if (!reqId || !pin) {
      console.error('\nError: Request ID and PIN are required. Example: node scripts/test-dcb-gateway.js confirm 12345678 1234\n');
      process.exit(1);
    }
    const method = args[3] || 'PUT';
    await confirmPin(reqId, pin, method);
    return;
  }

  if (command === 'status' || command === 'sub' || command === 'subscriptions') {
    const msisdn = args[1];
    const serviceId = args[2] || DEFAULTS.serviceId;
    if (!msisdn) {
      console.error('\nError: MSISDN is required. Example: node scripts/test-dcb-gateway.js status 566891023\n');
      process.exit(1);
    }
    await checkSubscriptions(msisdn, serviceId);
    return;
  }

  console.error(`\nUnknown command: "${command}"`);
  printHelp();
  process.exit(1);
}

main().catch(() => process.exit(1));
