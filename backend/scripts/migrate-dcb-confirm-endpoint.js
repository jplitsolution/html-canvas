import { initDatabase, getDataSource } from '../src/database/index.js';

async function migrate() {
  await initDatabase();
  const ds = getDataSource();
  const rows = await ds.query(
    'SELECT id, campaign_id, dcb_config_json FROM api_configs WHERE dcb_config_json IS NOT NULL',
  );
  let updatedCount = 0;
  for (const row of rows) {
    if (
      row.dcb_config_json &&
      row.dcb_config_json.includes('"/api/dcb/confirm"')
    ) {
      const updated = row.dcb_config_json.replaceAll(
        '"/api/dcb/confirm"',
        '"/api/dcb/confirmation"',
      );
      await ds.query('UPDATE api_configs SET dcb_config_json = $1 WHERE id = $2', [
        updated,
        row.id,
      ]);
      console.log(`Updated api_configs ID ${row.id} for campaign ${row.campaign_id}`);
      updatedCount++;
    }
  }
  console.log(`Migration finished. Total rows updated: ${updatedCount}`);
  await ds.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
