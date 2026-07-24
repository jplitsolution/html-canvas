const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '192.142.3.54',
    port: 5432,
    user: 'postgres',
    password: 'AAbbCC456775',
    database: 'templatecraft',
  });
  await client.connect();

  try {
    const userId = 1;

    // Upsert markets (country + operator), then campaigns under each
    const ae = await client.query(
      `
      INSERT INTO countries (name, code, user_id)
      VALUES ('UAE', 'AE', $1)
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
      [userId],
    );
    const aeId = ae.rows[0].id;

    const etisalat = await client.query(
      `
      INSERT INTO operators (name, code, country_id, user_id)
      VALUES ('Etisalat', 'ETISALAT', $1, $2)
      ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
      [aeId, userId],
    );
    const etisalatId = etisalat.rows[0].id;

    const sa = await client.query(
      `
      INSERT INTO countries (name, code, user_id)
      VALUES ('Saudi Arabia', 'SA', $1)
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
      [userId],
    );
    const saId = sa.rows[0].id;

    const stc = await client.query(
      `
      INSERT INTO operators (name, code, country_id, user_id)
      VALUES ('STC', 'STC', $1, $2)
      ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
      [saId, userId],
    );
    const stcId = stc.rows[0].id;

    const camp1 = await client.query(
      `
      INSERT INTO campaigns (name, country, operator, operator_id, active, user_id)
      VALUES ('AE Etisalat Games', 'UAE', 'Etisalat', $1, true, $2)
      ON CONFLICT (operator_id, name) DO UPDATE SET active = EXCLUDED.active
      RETURNING id
    `,
      [etisalatId, userId],
    );
    const camp1Id = camp1.rows[0].id;

    // Second campaign under same market (multi-campaign)
    const camp1b = await client.query(
      `
      INSERT INTO campaigns (name, country, operator, operator_id, active, user_id)
      VALUES ('AE Etisalat Videos', 'UAE', 'Etisalat', $1, true, $2)
      ON CONFLICT (operator_id, name) DO UPDATE SET active = EXCLUDED.active
      RETURNING id
    `,
      [etisalatId, userId],
    );
    const camp1bId = camp1b.rows[0].id;

    const camp2 = await client.query(
      `
      INSERT INTO campaigns (name, country, operator, operator_id, active, user_id)
      VALUES ('SA STC Videos', 'Saudi Arabia', 'STC', $1, true, $2)
      ON CONFLICT (operator_id, name) DO UPDATE SET active = EXCLUDED.active
      RETURNING id
    `,
      [stcId, userId],
    );
    const camp2Id = camp2.rows[0].id;

    console.log('Campaigns inserted:', camp1Id, camp1bId, camp2Id);
    console.log(
      'Tracking IDs:',
      `AE-ETISALAT-${camp1Id}`,
      `AE-ETISALAT-${camp1bId}`,
      `SA-STC-${camp2Id}`,
    );

    const tplRes = await client.query(
      `SELECT id, data->>'slug' as slug FROM templates WHERE is_prebuilt = true`,
    );
    const templates = tplRes.rows;

    const landingTpl = templates.find((t) => t.slug === 'sub-landing');
    const paymentTpl = templates.find((t) => t.slug === 'sub-payment');
    const successTpl = templates.find((t) => t.slug === 'sub-success');

    if (landingTpl && paymentTpl && successTpl) {
      for (const campId of [camp1Id, camp1bId, camp2Id]) {
        await client.query(
          `INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'LANDING', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`,
          [campId, landingTpl.id],
        );
        await client.query(
          `INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'OTP_PROMPT', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`,
          [campId, paymentTpl.id],
        );
        await client.query(
          `INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'SUCCESS', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`,
          [campId, successTpl.id],
        );
      }
      console.log('Campaign pages mapped successfully');
    } else {
      console.log(
        'Templates not found. Run backend dev server first so that templates are seeded!',
      );
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
