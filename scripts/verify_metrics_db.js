#!/usr/bin/env node
/**
 * Simple verification script to check that `app_metrics` table and expected views exist.
 * Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (or copy .env) and run:
 *   node scripts/verify_metrics_db.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function existsInInformationSchema(kind, name) {
  // kind: 'tables' or 'views'
  const schemaTable = kind === 'tables' ? 'information_schema.tables' : 'information_schema.views';
  try {
    const { data, error } = await supabase.from(schemaTable).select(kind === 'tables' ? 'table_name' : 'table_name').eq('table_name', name).limit(1);
    if (error) {
      console.error('Error querying information_schema:', error.message || error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error('Exception querying information_schema:', err);
    return false;
  }
}

async function run() {
  const checks = [];
  checks.push({ type: 'table', name: 'app_metrics' });
  checks.push({ type: 'view', name: 'view_avg_matrix_init_ms' });
  checks.push({ type: 'view', name: 'view_failure_counts' });
  checks.push({ type: 'view', name: 'view_last_upload_per_user' });
  checks.push({ type: 'view', name: 'view_metrics_daily_counts' });

  let ok = true;
  for (const c of checks) {
    const found = await existsInInformationSchema(c.type === 'table' ? 'tables' : 'views', c.name);
    if (!found) {
      console.error(`MISSING: ${c.type} ${c.name}`);
      ok = false;
    } else {
      console.log(`OK: ${c.type} ${c.name}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

run();
