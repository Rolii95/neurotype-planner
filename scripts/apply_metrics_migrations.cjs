#!/usr/bin/env node
/* Apply only the metrics-related SQL files directly using node-postgres.
   Usage: set DB_URL in env and run: node scripts/apply_metrics_migrations.cjs
*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dbUrl = process.env.DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Missing DB_URL environment variable.');
  process.exit(2);
}

const migrations = [
  path.join(__dirname, '..', 'supabase', 'migrations', '20251120_add_app_metrics_table.sql'),
  path.join(__dirname, '..', 'supabase', 'migrations', '20251120_app_metrics_views.sql')
];

async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    for (const m of migrations) {
      console.log('Applying', m);
      const sql = fs.readFileSync(m, 'utf8');
      try {
        await client.query(sql);
        console.log('Applied', m);
      } catch (err) {
        console.error('Error applying', m, err.message || err);
        // continue to next migration to allow idempotent statements
      }
    }
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
