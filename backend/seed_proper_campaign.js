/**
 * Seed one complete demo campaign with all funnel pages + TickHighs partner APIs.
 *
 * Usage: node seed_proper_campaign.js
 */
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import { getDefaultFunnelPageData } from './src/database/seed/default-funnel-pages.js';
import { flowEngineService } from './src/modules/flow/flow-engine.service.js';

const PAGE_TYPES = ['HOME', 'CONFIRM', 'OTP', 'THANKYOU', 'BLOCKED', 'ERROR'];
const USER_ID = 1;

const OTP_CONFIG = {
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
};

async function upsertCountry(client, name, code) {
  const res = await client.query(
    `
    INSERT INTO countries (name, code, user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name
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
    ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `,
    [name, code, countryId, USER_ID],
  );
  return res.rows[0].id;
}

async function upsertCampaign(client, { name, country, operator, operatorId, verificationMode, flowConfig, serviceId }) {
  const existing = await client.query(
    `SELECT id FROM campaigns WHERE operator_id = $1 AND name = $2`,
    [operatorId, name],
  );

  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    await client.query(
      `
      UPDATE campaigns
      SET active = true,
          country = $2,
          operator = $3,
          verification_mode = $4,
          flow_config = $5,
          service_id = $6,
          updated_at = NOW()
      WHERE id = $1
    `,
      [id, country, operator, verificationMode, flowConfig, serviceId],
    );
    return id;
  }

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
  const existing = await client.query(
    `
    SELECT cp.id as page_id, cp.template_id
    FROM campaign_pages cp
    WHERE cp.campaign_id = $1 AND cp.page_type = $2
  `,
    [campaignId, pageType],
  );

  if (existing.rows[0]?.template_id) {
    await client.query(
      `
      UPDATE templates
      SET name = $2,
          data = $3::json,
          updated_at = NOW()
      WHERE id = $1
    `,
      [
        existing.rows[0].template_id,
        `${campaignName} - ${pageType}`,
        JSON.stringify(data),
      ],
    );
    return existing.rows[0].template_id;
  }

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
    ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id
  `,
    [campaignId, pageType, templateId],
  );

  return templateId;
}

async function upsertApiConfig(client, campaignId) {
  const existing = await client.query(
    `SELECT id FROM api_configs WHERE campaign_id = $1`,
    [campaignId],
  );

  const payload = {
    subscriptionApi:
      'https://wbilzss.tickhighs.com/sub/checksub?msisdn={{msisdn}}&serviceId=WELLNESS',
    blocklistApi: '',
    subscribeApi: '',
    headersJson: '',
    otpProvider: 'partner',
    otpConfigJson: JSON.stringify(OTP_CONFIG),
  };

  if (existing.rows[0]) {
    await client.query(
      `
      UPDATE api_configs
      SET subscription_api = $2,
          blocklist_api = $3,
          subscribe_api = $4,
          headers_json = $5,
          otp_provider = $6,
          otp_config_json = $7,
          updated_at = NOW()
      WHERE campaign_id = $1
    `,
      [
        campaignId,
        payload.subscriptionApi,
        payload.blocklistApi,
        payload.subscribeApi,
        payload.headersJson,
        payload.otpProvider,
        payload.otpConfigJson,
      ],
    );
    return existing.rows[0].id;
  }

  const res = await client.query(
    `
    INSERT INTO api_configs (
      campaign_id, subscription_api, blocklist_api, subscribe_api,
      headers_json, otp_provider, otp_config_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `,
    [
      campaignId,
      payload.subscriptionApi,
      payload.blocklistApi,
      payload.subscribeApi,
      payload.headersJson,
      payload.otpProvider,
      payload.otpConfigJson,
    ],
  );
  return res.rows[0].id;
}

async function rebuildCampaignPages(client, campaignId, campaignName) {
  for (const pageType of PAGE_TYPES) {
    const templateId = await ensurePage(client, campaignId, campaignName, pageType);
    console.log(`  ✓ ${pageType} → template #${templateId}`);
  }
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
    console.log('Creating South Sudan / Zain market...');
    const ssId = await upsertCountry(client, 'South Sudan', 'SS');
    const zainId = await upsertOperator(client, 'Zain', 'ZAIN', ssId);

    const mode = 'BOTH';
    const flowConfig = JSON.stringify(flowEngineService.getDefaultFlowConfig(mode));
    const campaignName = 'SS Zain Wellness';

    console.log(`Upserting campaign "${campaignName}"...`);
    const campaignId = await upsertCampaign(client, {
      name: campaignName,
      country: 'South Sudan',
      operator: 'Zain',
      operatorId: zainId,
      verificationMode: mode,
      flowConfig,
      serviceId: 'WELLNESS',
    });

    console.log(`Campaign #${campaignId} — writing all funnel pages...`);
    await rebuildCampaignPages(client, campaignId, campaignName);

    console.log('Writing TickHighs API + Partner OTP config...');
    await upsertApiConfig(client, campaignId);

    // Also repair SA STC Videos (#3) broken HOME + missing proper content
    const sa = await client.query(`SELECT id, name FROM campaigns WHERE id = 3`);
    if (sa.rows[0]) {
      console.log(`Repairing campaign #3 "${sa.rows[0].name}" pages...`);
      await rebuildCampaignPages(client, 3, sa.rows[0].name);
      await client.query(
        `
        UPDATE campaigns
        SET verification_mode = COALESCE(verification_mode, 'BOTH'),
            flow_config = CASE
              WHEN flow_config IS NULL OR flow_config = '' THEN $1::text
              ELSE flow_config
            END,
            updated_at = NOW()
        WHERE id = 3
      `,
        [flowConfig],
      );
    }

    const check = await client.query(
      `
      SELECT cp.page_type, length(t.data->>'html') as html_len
      FROM campaign_pages cp
      JOIN templates t ON t.id = cp.template_id
      WHERE cp.campaign_id = $1
        AND cp.page_type = ANY($2::text[])
      ORDER BY cp.page_type
    `,
      [campaignId, PAGE_TYPES],
    );

    console.log('\nDone. Campaign pages:');
    console.table(check.rows);
    console.log(`\nOpen in dashboard: Campaign #${campaignId} — ${campaignName}`);
    console.log(`Preview URL: /subscription?country=South+Sudan&operator=Zain&campid=SS-ZAIN-${campaignId}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
