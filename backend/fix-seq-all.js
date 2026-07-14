const { Client } = require('pg');

async function fixAllSequences() {
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

    // Get all sequences
    const res = await client.query(`
      SELECT sequence_schema, sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);

    for (const row of res.rows) {
      const seqName = row.sequence_name;
      // Typical convention is table_column_seq
      // So let's try to extract table name and column name
      let tableName, colName;
      if (seqName.endsWith('_id_seq')) {
        tableName = seqName.replace('_id_seq', '');
        colName = 'id';
      } else {
        // Find if any table owns this sequence by checking pg_class/pg_depend, but it's easier to just do it for common ones
        console.log(`Skipping unknown format sequence: ${seqName}`);
        continue;
      }

      try {
        const maxRes = await client.query(`SELECT MAX(${colName}) FROM "${tableName}";`);
        const maxId = maxRes.rows[0].max || 0;
        
        const seqRes = await client.query(`SELECT last_value FROM "${seqName}";`);
        const seqVal = seqRes.rows[0].last_value;

        if (maxId > seqVal) {
          console.log(`Fixing sequence ${seqName} for table ${tableName}... (maxId: ${maxId}, seqVal: ${seqVal})`);
          await client.query(`SELECT setval('"${seqName}"', $1);`, [maxId]);
          console.log(`Sequence ${seqName} fixed.`);
        } else {
          console.log(`Sequence ${seqName} for table ${tableName} looks fine (maxId: ${maxId}, seqVal: ${seqVal}).`);
        }
      } catch (err) {
        console.log(`Error checking sequence ${seqName} for table ${tableName}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixAllSequences();
