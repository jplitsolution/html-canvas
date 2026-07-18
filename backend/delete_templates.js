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
  await client.query("DELETE FROM templates WHERE is_prebuilt = true");
  console.log("Deleted prebuilt templates. Now backend should re-seed.");
  client.end();
}
run();
