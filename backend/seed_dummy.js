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
    // Insert some campaigns
    const camp1 = await client.query(`
      INSERT INTO campaigns (name, country, operator, active, user_id) 
      VALUES ('AE Etisalat Games', 'AE', 'Etisalat', true, $1) 
      ON CONFLICT (country, operator) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `, [userId]);
    const camp1Id = camp1.rows[0].id;

    const camp2 = await client.query(`
      INSERT INTO campaigns (name, country, operator, active, user_id) 
      VALUES ('SA STC Videos', 'SA', 'STC', true, $1) 
      ON CONFLICT (country, operator) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `, [userId]);
    const camp2Id = camp2.rows[0].id;

    console.log('Campaigns inserted:', camp1Id, camp2Id);
    
    // Retrieve some template IDs for Landing, Payment, Success
    const tplRes = await client.query(`SELECT id, data->>'slug' as slug FROM templates WHERE is_prebuilt = true`);
    const templates = tplRes.rows;
    
    const landingTpl = templates.find(t => t.slug === 'sub-landing');
    const paymentTpl = templates.find(t => t.slug === 'sub-payment');
    const successTpl = templates.find(t => t.slug === 'sub-success');
    
    if (landingTpl && paymentTpl && successTpl) {
      // Map pages for camp1
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'LANDING', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp1Id, landingTpl.id]);
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'OTP_PROMPT', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp1Id, paymentTpl.id]);
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'SUCCESS', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp1Id, successTpl.id]);
      
      // Map pages for camp2
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'LANDING', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp2Id, landingTpl.id]);
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'OTP_PROMPT', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp2Id, paymentTpl.id]);
      await client.query(`INSERT INTO campaign_pages (campaign_id, page_type, template_id) VALUES ($1, 'SUCCESS', $2) ON CONFLICT (campaign_id, page_type) DO UPDATE SET template_id = EXCLUDED.template_id`, [camp2Id, successTpl.id]);
      console.log('Campaign pages mapped successfully');
    } else {
      console.log('Templates not found. Run backend dev server first so that templates are seeded!');
    }
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
