const { Client } = require('pg');

async function fixSequence() {
  const client = new Client({
    host: '103.131.24.113',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'templatecraft',
  });

  try {
    await client.connect();
    console.log('Connected to db');
    const res = await client.query('SELECT MAX(id) FROM visits;');
    const maxId = res.rows[0].max || 0;
    console.log('Max visit id:', maxId);
    
    const seqRes = await client.query(`SELECT last_value FROM visits_id_seq;`);
    console.log('Current sequence value:', seqRes.rows[0].last_value);

    if (maxId > seqRes.rows[0].last_value) {
        console.log('Fixing sequence...');
        await client.query(`SELECT setval('visits_id_seq', $1);`, [maxId]);
        console.log('Sequence fixed.');
    } else {
        console.log('Sequence looks correct.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixSequence();
