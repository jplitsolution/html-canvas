const { Client } = require('pg');
const client = new Client({
  host: '192.142.3.54',
  port: 5432,
  user: 'postgres',
  password: 'AAbbCC456775',
  database: 'templatecraft',
});
client.connect();
client.query("SELECT * FROM users LIMIT 1", (err, res) => {
  console.log(err ? err.stack : res.rows);
  client.end();
});
