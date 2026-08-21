import { randomUUID } from 'node:crypto';

export const DUMMY_DCB_MASTER_PIN = '1234';
export const DUMMY_DCB_SERVICE_ID = 581;

const PIN_TTL_SECONDS = 10 * 60;
const STATE_TTL_SECONDS = 30 * 60;
const POLLS_UNTIL_ACTIVE = 2;

export const createMemoryCache = () => {
  const localStore = new Map();
  return {
    get: async (key) => {
      const local = localStore.get(key);
      if (!local) return null;
      if (local.expiresAt <= Date.now()) {
        localStore.delete(key);
        return null;
      }
      return local.value;
    },
    set: async (key, value, ttlSeconds) => {
      const ttl = Math.max(30, Number(ttlSeconds) || 60);
      localStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
  };
};

export const createRedisBackedCache = (redis) => {
  const memory = createMemoryCache();
  return {
    get: async (key) => {
      const cached = await redis.get(key);
      if (cached) return cached;
      return memory.get(key);
    },
    set: async (key, value, ttlSeconds) => {
      await memory.set(key, value, ttlSeconds);
      await redis.set(key, value, ttlSeconds);
    },
  };
};

export const DUMMY_DCB_NUMBERS = Object.freeze({
  '500000001': {
    label: 'Already subscribed (ACTIVE)',
    status: 'ACTIVE',
    entitlementActive: true,
    current: true,
  },
  '500000002': {
    label: 'New user — choose a pack',
    status: 'NEW',
    entitlementActive: false,
    current: true,
  },
  '500000003': {
    label: 'Low balance / parking',
    status: 'PARKED_NO_BALANCE',
    entitlementActive: false,
    current: true,
  },
  '500000004': {
    label: 'Suspended / low balance',
    status: 'SUSPENDED',
    entitlementActive: false,
    current: true,
  },
  '500000005': {
    label: 'Pending PIN',
    status: 'PENDING_PIN',
    entitlementActive: false,
    current: true,
  },
  '500000006': {
    label: 'Deactivated / failed',
    status: 'DEACTIVATED',
    entitlementActive: false,
    current: true,
  },
});

export const DUMMY_DCB_PURCHASE_TYPES = Object.freeze([
  { id: 2, code: 'RenewalDaily' },
  { id: 3, code: 'RenewalWeekly' },
  { id: 4, code: 'RenewalMonthly' },
  { id: 10, code: 'RenewalYearly' },
  { id: 11, code: 'RenewalMonthlyWithAds' },
  { id: 12, code: 'RenewalThreeMonths' },
]);

export const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export const matchDummyNumber = (msisdn) => {
  const digits = digitsOnly(msisdn);
  if (!digits) return null;
  return (
    Object.keys(DUMMY_DCB_NUMBERS).find(
      (key) => digits === key || digits.endsWith(key),
    ) || null
  );
};

const envelope = (message, data = {}, extra = {}) => ({
  success: true,
  requestId: extra.requestId || randomUUID(),
  message,
  data,
});

const failure = (message, extra = {}) => ({
  success: false,
  requestId: extra.requestId || randomUUID(),
  message,
  data: extra.data || null,
});

const pinKey = (msisdn) => `dummy-dcb:pin:${digitsOnly(msisdn)}`;
const stateKey = (msisdn) => `dummy-dcb:state:${digitsOnly(msisdn)}`;

const subscriptionItem = ({
  status,
  entitlementActive,
  current,
  purchaseTypeId,
  serviceId = DUMMY_DCB_SERVICE_ID,
}) => ({
  providerServiceId: Number(serviceId) || DUMMY_DCB_SERVICE_ID,
  serviceId: Number(serviceId) || DUMMY_DCB_SERVICE_ID,
  status,
  entitlementActive: Boolean(entitlementActive),
  current: current !== false,
  purchaseTypeId: purchaseTypeId ? Number(purchaseTypeId) : null,
});

const fixtureItems = (msisdn, serviceId) => {
  const matched = matchDummyNumber(msisdn);
  if (!matched) return [];
  const fixture = DUMMY_DCB_NUMBERS[matched];
  if (fixture.status === 'NEW') return [];
  return [
    subscriptionItem({
      ...fixture,
      serviceId: serviceId || DUMMY_DCB_SERVICE_ID,
    }),
  ];
};

export const createDummyDcbHandlers = ({
  log = console.log,
  cache = createMemoryCache(),
} = {}) => {
  const readStore = (key) => cache.get(key);
  const writeStore = (key, value, ttlSeconds) =>
    cache.set(key, value, ttlSeconds);
  const publicConfig = (_req, res) => {
    res.json(
      envelope('Public configuration', {
        merchantId: 169,
        serviceId: DUMMY_DCB_SERVICE_ID,
        callbackUrl: 'http://localhost:3000/api/flow/callback',
        purchaseTypes: DUMMY_DCB_PURCHASE_TYPES.map((item) => ({ ...item })),
      }),
    );
  };

  const directory = (_req, res) => {
    res.json({
      success: true,
      message: 'Dummy Universe DCB numbers. PIN also always accepts 1234.',
      baseUrl: 'http://localhost:3000',
      endpoints: {
        publicConfig: '/api/test/dcb/config/public',
        subscriptions: '/api/test/dcb/subscriptions',
        pincode: '/api/test/dcb/pincode',
        confirm: '/api/test/dcb/confirm',
      },
      masterPin: DUMMY_DCB_MASTER_PIN,
      numbers: Object.entries(DUMMY_DCB_NUMBERS).map(([msisdn, fixture]) => ({
        msisdn,
        ...fixture,
      })),
    });
  };

  const subscriptions = async (req, res) => {
    const msisdn = digitsOnly(
      req.query?.msisdn || req.body?.msisdn || req.query?.phone || req.body?.phone,
    );
    const serviceId =
      req.query?.serviceId || req.body?.serviceId || DUMMY_DCB_SERVICE_ID;
    if (!msisdn) {
      return res.status(400).json(failure('msisdn is required'));
    }

    const runtime = await readStore(stateKey(msisdn));
    if (runtime?.status === 'PENDING_CONFIRMATION') {
      const polls = Number(runtime.polls || 0) + 1;
      const activated = polls >= POLLS_UNTIL_ACTIVE;
      const next = activated
        ? {
            status: 'ACTIVE',
            entitlementActive: true,
            current: true,
            purchaseTypeId: runtime.purchaseTypeId,
            polls,
          }
        : { ...runtime, polls };
      await writeStore(stateKey(msisdn), next, STATE_TTL_SECONDS);
      return res.json(
        envelope('Subscriptions', {
          items: [
            subscriptionItem({
              status: next.status,
              entitlementActive: next.entitlementActive,
              current: true,
              purchaseTypeId: next.purchaseTypeId,
              serviceId,
            }),
          ],
        }),
      );
    }

    if (runtime?.status === 'ACTIVE') {
      return res.json(
        envelope('Subscriptions', {
          items: [
            subscriptionItem({
              status: 'ACTIVE',
              entitlementActive: true,
              current: true,
              purchaseTypeId: runtime.purchaseTypeId,
              serviceId,
            }),
          ],
        }),
      );
    }

    return res.json(
      envelope('Subscriptions', {
        items: fixtureItems(msisdn, serviceId),
      }),
    );
  };

  const pincode = async (req, res) => {
    const body = req.body || {};
    const msisdn = digitsOnly(body.msisdn || body.phone);
    const purchaseTypeId = String(body.purchaseTypeId || '').trim();
    if (!msisdn) {
      return res.status(400).json(failure('msisdn is required'));
    }
    if (!purchaseTypeId) {
      return res.status(400).json(failure('purchaseTypeId is required'));
    }

    const pinRequestId = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    await writeStore(
      pinKey(msisdn),
      { pin, requestId: pinRequestId, purchaseTypeId, msisdn },
      PIN_TTL_SECONDS,
    );

    log(
      `[Dummy DCB] billing PIN for ${msisdn}: ${pin}  (PinInfo.ID=${pinRequestId}, purchaseTypeId=${purchaseTypeId})`,
    );
    log(`[Dummy DCB] you can also verify with master PIN ${DUMMY_DCB_MASTER_PIN}`);

    return res.json(
      envelope(
        'PIN request processed',
        {
          Success: true,
          MessageEn: 'Success',
          ErrorCode: 'Ok',
          PinInfo: { ID: pinRequestId, PinCode: pin },
          requestId: pinRequestId,
          pin,
          pinCode: pin,
        },
        { requestId: randomUUID() },
      ),
    );
  };

  const confirm = async (req, res) => {
    const body = req.body || {};
    const msisdn = digitsOnly(body.msisdn || body.phone);
    const pin = String(body.pinCode || body.pin || body.otp || '').trim();
    const requestId = String(body.id || body.requestId || '').trim();
    const purchaseTypeId = String(body.purchaseTypeId || '').trim();
    if (!msisdn || !pin || !requestId) {
      return res
        .status(400)
        .json(failure('requestId, pinCode and msisdn are required'));
    }

    const saved = await readStore(pinKey(msisdn));
    if (!saved) {
      return res.status(409).json(failure('PIN request expired or missing'));
    }
    if (saved.requestId !== requestId) {
      return res.status(409).json(failure('requestId does not match PIN request'));
    }
    if (
      purchaseTypeId &&
      String(saved.purchaseTypeId) !== purchaseTypeId
    ) {
      return res
        .status(409)
        .json(failure('purchaseTypeId does not match PIN request'));
    }
    const pinOk = pin === String(saved.pin) || pin === DUMMY_DCB_MASTER_PIN;
    if (!pinOk) {
      log(`[Dummy DCB] confirm failed for ${msisdn}: invalid PIN`);
      return res.status(422).json(failure('Invalid PIN'));
    }

    await writeStore(
      stateKey(msisdn),
      {
        status: 'PENDING_CONFIRMATION',
        entitlementActive: false,
        current: true,
        purchaseTypeId: saved.purchaseTypeId,
        polls: 0,
      },
      STATE_TTL_SECONDS,
    );
    log(
      `[Dummy DCB] PIN confirmed for ${msisdn}. Next subscription polls will stay pending, then become ACTIVE.`,
    );
    return res.json(
      envelope('PIN confirmed', { success: true }, { requestId }),
    );
  };

  return { directory, publicConfig, subscriptions, pincode, confirm };
};
