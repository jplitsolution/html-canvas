import { initDatabase } from '../src/database/index.js';

async function run() {
  const ds = await initDatabase();
  const camp = await ds.query('SELECT id, name, capping_enabled, capping_limit, capping_action, verification_mode, flow_config FROM campaigns WHERE id = 33');
  console.log('Campaign 33:', JSON.stringify(camp, null, 2));

  const pages = await ds.query('SELECT cp.id, cp.campaign_id, cp.page_type, cp.template_id, t.name as template_name FROM campaign_pages cp LEFT JOIN templates t ON t.id = cp.template_id WHERE cp.campaign_id = 33');
  console.log('Campaign 33 Pages:', JSON.stringify(pages, null, 2));

  const trackings = await ds.query('SELECT * FROM campaign_trackings WHERE campaign_id = 33');
  console.log('Campaign 33 Trackings:', JSON.stringify(trackings, null, 2));

  await ds.destroy();
}

run().catch(console.error);
