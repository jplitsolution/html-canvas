/**
 * Clean demo seed — markets, campaigns, funnel pages, TickHighs APIs, vendors.
 *
 * Usage (from backend/):
 *   node seed_clean.js
 *
 * See docs/WAP_MANAGER_DESIGN.md
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { getDefaultFunnelPageData } from './src/database/seed/default-funnel-pages.js';
import { flowEngineService } from './src/modules/flow/flow-engine.service.js';

const USER_ID = 1;
const PAGE_TYPES = ['HOME', 'CONFIRM', 'OTP', 'THANKYOU', 'BLOCKED', 'ERROR'];

const TICK = {
  checksub:
    'https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS',
  subscribe: '', // Tick queues subscribe inside validate_otp
  blocklist: '', // skipped for now
  otp: {
    sendUrl:
      'https://wbilzss.tickhighs.com/otp/subscribe?msisdn={{msisdn}}&subServiceId={{subServiceId}}&serviceId=WELLNESS&cpId=100&channel=wap&country=SS&operator=ZAIN&reqType=1&language=_E',
    verifyUrl:
      'https://wbilzss.tickhighs.com/otp/validate_otp?msisdn={{msisdn}}&otp={{otp}}',
    method: 'GET',
    verifyMethod: 'GET',
    headersJson: '',
    bodyJson: '',
    verifyBodyJson: '',
    successKey: 'responseCode',
    successValue: '0',
  },
};

async function upsertCountry(client, name, code) {
  const res = await client.query(
    `
    INSERT INTO countries (name, code, user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id
  `,
    [name, code, USER_ID],
  );
  return res.rows[0].id;
}

async function upsertOperator(client, name, code, countryId) {
  const res = await client.query(
    `
    INSERT INTO operators (name, code, country_id, user_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
    RETURNING id
  `,
    [name, code, countryId, USER_ID],
  );
  return res.rows[0].id;
}

async function wipeFunnelData(client) {
  console.log('Wiping visits / pages / trackings / api_configs / demo campaigns…');
  await client.query(`DELETE FROM visit_events`);
  await client.query(`DELETE FROM visits`);
  await client.query(`DELETE FROM campaign_pages`);
  await client.query(`DELETE FROM campaign_trackings`);
  await client.query(`DELETE FROM api_configs`);
  // Keep templates that are prebuilt; delete campaign-linked templates via pages already deleted
  await client.query(`DELETE FROM campaigns WHERE user_id = $1`, [USER_ID]);
}

async function upsertVendor(client, name, code) {
  const res = await client.query(
    `
    INSERT INTO vendors (name, code, user_id, active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name, active = true, updated_at = NOW()
    RETURNING id
  `,
    [name, code, USER_ID],
  );
  return res.rows[0].id;
}

async function upsertAffiliate(client, vendorId, name, code) {
  const res = await client.query(
    `
    INSERT INTO affiliates (vendor_id, name, code, user_id, active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name, vendor_id = EXCLUDED.vendor_id, active = true, updated_at = NOW()
    RETURNING id
  `,
    [vendorId, name, code, USER_ID],
  );
  return res.rows[0].id;
}

async function createCampaign(client, { name, country, operator, operatorId, verificationMode, serviceId }) {
  const flowConfig = JSON.stringify(flowEngineService.getDefaultFlowConfig(verificationMode));
  const res = await client.query(
    `
    INSERT INTO campaigns (
      name, country, operator, operator_id, active, user_id,
      verification_mode, flow_config, service_id
    )
    VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)
    RETURNING id
  `,
    [name, country, operator, operatorId, USER_ID, verificationMode, flowConfig, serviceId],
  );
  return res.rows[0].id;
}

async function ensurePage(client, campaignId, campaignName, pageType) {
  const data = getDefaultFunnelPageData(pageType);
  const tpl = await client.query(
    `
    INSERT INTO templates (name, data, user_id, is_prebuilt)
    VALUES ($1, $2::json, $3, false)
    RETURNING id
  `,
    [`${campaignName} - ${pageType}`, JSON.stringify(data), USER_ID],
  );
  const templateId = tpl.rows[0].id;
  await client.query(
    `
    INSERT INTO campaign_pages (campaign_id, page_type, template_id)
    VALUES ($1, $2, $3)
  `,
    [campaignId, pageType, templateId],
  );
  return templateId;
}

async function upsertApiConfig(client, campaignId) {
  await client.query(
    `
    INSERT INTO api_configs (
      campaign_id, subscription_api, blocklist_api, subscribe_api,
      headers_json, otp_config_json
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
    [
      campaignId,
      TICK.checksub,
      TICK.blocklist,
      TICK.subscribe,
      '',
      JSON.stringify(TICK.otp),
    ],
  );
}

async function linkTracking(client, campaignId, vendorId, affiliateId) {
  await client.query(
    `
    INSERT INTO campaign_trackings (campaign_id, vendor_id, affiliate_id, active)
    VALUES ($1, $2, $3, true)
  `,
    [campaignId, vendorId, affiliateId],
  );
}

function trackingId(cc, oc, id) {
  return `${String(cc).toUpperCase()}-${String(oc).toUpperCase()}-${id}`;
}

async function run() {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  try {
    const user = await client.query(`SELECT id, email FROM users WHERE id = $1`, [USER_ID]);
    if (!user.rows[0]) {
      throw new Error(`User id=${USER_ID} missing — create an admin user first`);
    }
    console.log(`Using admin user #${USER_ID} (${user.rows[0].email})`);

    await wipeFunnelData(client);

    console.log('Markets…');
    const uaeId = await upsertCountry(client, 'UAE', 'AE');
    const etisalatId = await upsertOperator(client, 'Etisalat', 'ETISALAT', uaeId);
    const ssId = await upsertCountry(client, 'South Sudan', 'SS');
    const zainId = await upsertOperator(client, 'Zain', 'ZAIN', ssId);

    console.log('Vendors / affiliates…');
    const vendorId = await upsertVendor(client, 'AdMobi', 'ADM01');
    const affBe = await upsertAffiliate(client, vendorId, 'Affiliate Beta', 'AFF_BE');
    await upsertAffiliate(client, vendorId, 'Affiliate Alpha', 'AFF_AL');
    const vendor2 = await upsertVendor(client, 'Mobite', 'MB02');
    await upsertAffiliate(client, vendor2, 'Affiliate Gamma', 'AFF_GA');

    const demos = [
      {
        name: 'AE Etisalat Wellness',
        country: 'UAE',
        operator: 'Etisalat',
        operatorId: etisalatId,
        cc: 'AE',
        oc: 'ETISALAT',
      },
      {
        name: 'SS Zain Wellness',
        country: 'South Sudan',
        operator: 'Zain',
        operatorId: zainId,
        cc: 'SS',
        oc: 'ZAIN',
      },
    ];

    for (const demo of demos) {
      console.log(`Campaign "${demo.name}"…`);
      const campaignId = await createCampaign(client, {
        name: demo.name,
        country: demo.country,
        operator: demo.operator,
        operatorId: demo.operatorId,
        verificationMode: 'BOTH',
        serviceId: 'WELLNESS',
      });

      for (const pageType of PAGE_TYPES) {
        const tid = await ensurePage(client, campaignId, demo.name, pageType);
        console.log(`  ✓ ${pageType} → template #${tid}`);
      }

      await upsertApiConfig(client, campaignId);
      await linkTracking(client, campaignId, vendorId, affBe);

      const campid = trackingId(demo.cc, demo.oc, campaignId);
      console.log(`  campid=${campid}`);
      console.log(
        `  URL: http://localhost:5173/subscription?country=${encodeURIComponent(demo.country)}&operator=${encodeURIComponent(demo.operator)}&campid=${campid}&vid=ADM01&aff_id=AFF_BE`,
      );
    }

    console.log('\nDone. Test MSISDN (Swagger): 211911961169');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
