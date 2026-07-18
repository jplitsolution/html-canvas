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
    
    // Insert Vendors
    const v1 = await client.query(`
      INSERT INTO vendors (name, code, user_id, active) 
      VALUES ('AdMobi', 'ADM01', $1, true) 
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `, [userId]);
    const vendor1Id = v1.rows[0].id;

    const v2 = await client.query(`
      INSERT INTO vendors (name, code, user_id, active) 
      VALUES ('Mobite', 'MB02', $1, true) 
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `, [userId]);
    const vendor2Id = v2.rows[0].id;

    console.log('Vendors inserted:', vendor1Id, vendor2Id);

    // Insert Affiliates for Vendor 1
    await client.query(`
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Alpha', 'AFF_AL', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `, [vendor1Id, userId]);
    await client.query(`
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Beta', 'AFF_BE', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `, [vendor1Id, userId]);

    // Insert Affiliates for Vendor 2
    await client.query(`
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Gamma', 'AFF_GA', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `, [vendor2Id, userId]);

    console.log('Affiliates inserted');
    
    // Assign vendors to campaigns
    await client.query(`UPDATE campaigns SET vendor_id = $1 WHERE name = 'AE Etisalat Games'`, [vendor1Id]);
    await client.query(`UPDATE campaigns SET vendor_id = $1 WHERE name = 'SA STC Videos'`, [vendor2Id]);
    
    console.log('Assigned vendors to campaigns successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
