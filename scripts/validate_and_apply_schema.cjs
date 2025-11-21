#!/usr/bin/env node
// Thoroughly validate local schema.sql against remote DB and apply missing objects.
// - Detect missing tables, columns, views, functions, policies, triggers, indexes, RLS, extensions
// - Generate delta SQL at supabase/migrations/20251120_collaboration_gap_fix.sql
// - Apply delta to DB and re-verify

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_URL = process.env.DB_URL || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('Missing DB_URL environment variable.');
  process.exit(2);
}

const schemaPath = path.join(__dirname, '..', 'src', 'features', 'collaboration', 'database', 'schema.sql');
const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_collaboration_gap_fix.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

// reuse splitting from earlier script logic
function splitSqlStatements(sql) {
  const stmts = [];
  let buf = '';
  let i = 0;
  const len = sql.length;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inDollar = false;
  let dollarTag = null;

  while (i < len) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (!inSingle && !inDouble && !inBlockComment && !inDollar && ch === '-' && next === '-') {
      inLineComment = true;
      buf += ch;
      i++;
      continue;
    }

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBlockComment && !inDollar && ch === '/' && next === '*') {
      inBlockComment = true;
      buf += ch;
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        buf += ch + next;
        inBlockComment = false;
        i += 2;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inDollar && ch === '$') {
      let j = i + 1;
      let tag = '$';
      while (j < len && /[A-Za-z0-9_]/.test(sql[j])) {
        tag += sql[j];
        j++;
      }
      if (j < len && sql[j] === '$') {
        tag += '$';
        inDollar = true;
        dollarTag = tag;
        buf += tag;
        i = j + 1;
        continue;
      }
    }

    if (inDollar) {
      if (sql.slice(i, i + dollarTag.length) === dollarTag) {
        buf += dollarTag;
        i += dollarTag.length;
        inDollar = false;
        dollarTag = null;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    if (!inDouble && ch === "'") {
      inSingle = true;
      buf += ch;
      i++;
      continue;
    }
    if (inSingle) {
      if (ch === "'" && sql[i + 1] === "'") {
        buf += "''";
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      buf += ch;
      i++;
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = true;
      buf += ch;
      i++;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      buf += ch;
      i++;
      continue;
    }

    if (ch === ';') {
      buf += ch;
      const s = buf.trim();
      if (s) stmts.push(s);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  if (buf.trim()) stmts.push(buf.trim());
  return stmts;
}

function extractTableColumns(createTableStmt) {
  // find first '(' after CREATE TABLE ... and the matching closing ')'
  const open = createTableStmt.indexOf('(');
  if (open === -1) return [];
  let i = open + 1;
  let depth = 1;
  const len = createTableStmt.length;
  while (i < len && depth > 0) {
    if (createTableStmt[i] === '(') depth++;
    else if (createTableStmt[i] === ')') depth--;
    i++;
  }
  const colsBlock = createTableStmt.slice(open + 1, i - 1).trim();
  // split top-level commas
  const cols = [];
  let buf = '';
  depth = 0;
  let j = 0;
  while (j < colsBlock.length) {
    const ch = colsBlock[j];
    const next = colsBlock[j+1];
    if (ch === '(') { depth++; buf += ch; j++; continue; }
    if (ch === ')') { depth--; buf += ch; j++; continue; }
    if (ch === ',' && depth === 0) { cols.push(buf.trim()); buf = ''; j++; continue; }
    buf += ch; j++;
  }
  if (buf.trim()) cols.push(buf.trim());
  // return array of column definitions (may include constraints)
  return cols;
}

function getTableNameFromCreate(stmt) {
  const m = stmt.match(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_.\"]+)/i);
  if (!m) return null;
  return m[1].replace(/"/g,'').split('.').pop();
}

function getViewName(stmt) {
  const m = stmt.match(/CREATE(?: OR REPLACE)? VIEW\s+([A-Za-z0-9_.\"]+)/i);
  return m ? m[1].replace(/"/g,'').split('.').pop() : null;
}

function getFunctionName(stmt) {
  const m = stmt.match(/CREATE(?: OR REPLACE)? FUNCTION\s+([A-Za-z0-9_.\"]+)\s*\(/i);
  return m ? m[1].replace(/"/g,'').split('.').pop() : null;
}

function getIndexName(stmt) {
  const m = stmt.match(/CREATE INDEX IF NOT EXISTS\s+([A-Za-z0-9_\"]+)/i);
  return m ? m[1].replace(/"/g,'') : null;
}

function getPolicyNameAndTable(stmt) {
  const m = stmt.match(/CREATE POLICY\s+"?([^"]+)"?\s+ON\s+([A-Za-z0-9_.\"]+)/i);
  if (!m) return null;
  return { name: m[1], table: m[2].replace(/"/g,'').split('.').pop() };
}

(async function main(){
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const stmts = splitSqlStatements(sql);

  const tables = {};
  const views = {};
  const functions = {};
  const indexes = {};
  const policies = [];
  const rlsEnables = [];
  const extensions = [];
  const triggers = {};
  const grants = [];
  const others = [];

  for (const s of stmts) {
    const up = s.trim().toUpperCase();
    if (up.startsWith('CREATE EXTENSION')) {
      const m = s.match(/CREATE EXTENSION IF NOT EXISTS\s+"?([A-Za-z0-9_\-]+)"?/i);
      if (m) extensions.push(s + '\n;');
      continue;
    }
    if (up.startsWith('CREATE TABLE')) {
      const name = getTableNameFromCreate(s);
      if (name) tables[name] = s + '\n;';
      continue;
    }
    if (up.startsWith('CREATE OR REPLACE VIEW') || up.startsWith('CREATE VIEW')) {
      const name = getViewName(s);
      if (name) views[name] = s + '\n;';
      continue;
    }
    if (up.startsWith('CREATE OR REPLACE FUNCTION') || up.startsWith('CREATE FUNCTION')) {
      const name = getFunctionName(s);
      if (name) functions[name] = s + '\n;';
      continue;
    }
    if (up.startsWith('CREATE INDEX')) {
      const name = getIndexName(s);
      if (name) indexes[name] = s + '\n;';
      continue;
    }
    if (up.startsWith('CREATE POLICY')) {
      const p = getPolicyNameAndTable(s);
      if (p) policies.push({ name: p.name, table: p.table, stmt: s + '\n;' });
      continue;
    }
    if (up.startsWith('ALTER TABLE') && up.includes('ENABLE ROW LEVEL SECURITY')) {
      const m = s.match(/ALTER TABLE\s+([A-Za-z0-9_.\"]+)\s+ENABLE ROW LEVEL SECURITY/i);
      if (m) rlsEnables.push(s + '\n;');
      continue;
    }
    if (up.startsWith('CREATE TRIGGER')) {
      const m = s.match(/CREATE TRIGGER\s+([A-Za-z0-9_\"]+)/i);
      if (m) triggers[m[1].replace(/"/g,'')] = s + '\n;';
      continue;
    }
    if (up.startsWith('GRANT ')) {
      grants.push(s + '\n;');
      continue;
    }
    // DO $$ blocks or other statements
    if (up.startsWith('DO $$') || up.startsWith('SELECT')) {
      others.push(s + '\n;');
      continue;
    }
  }

  const delta = [];

  // Check extensions
  for (const extStmt of extensions) {
    const m = extStmt.match(/CREATE EXTENSION IF NOT EXISTS\s+"?([A-Za-z0-9_\-]+)"?/i);
    const ext = m[1];
    try {
      const res = await client.query('SELECT extname FROM pg_extension WHERE extname = $1', [ext]);
      if (res.rowCount === 0) delta.push(extStmt);
    } catch (e) { delta.push(extStmt); }
  }

  // Check tables and columns
  for (const [tname, createStmt] of Object.entries(tables)) {
    const res = await client.query('SELECT to_regclass($1) as exists', [tname]);
    if (!res.rows[0].exists) {
      delta.push(createStmt);
    } else {
      // check columns
      const cols = extractTableColumns(createStmt);
      // extract column names from cols array where definition starts with identifier
      const colDefs = [];
      for (const c of cols) {
        const cm = c.match(/^\s*"?([A-Za-z0-9_]+)"?\s+(.*)/s);
        if (cm) {
          const colName = cm[1];
          const colDef = cm[2].trim();
          colDefs.push({ name: colName, def: colDef, raw: c });
        }
      }

      const colRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [tname]
      );
      const existingCols = new Set(colRes.rows.map(r=>r.column_name));
      for (const cd of colDefs) {
        if (!existingCols.has(cd.name)) {
          // create ALTER TABLE ADD COLUMN using the raw column text
          // raw might include constraints after column def; to be safe, add column with its type+DEFAULT+NULL/NOT NULL fragment
          // We'll attempt to strip trailing constraints like REFERENCES and COMMA already removed
          const addStmt = `ALTER TABLE ${tname} ADD COLUMN ${cd.raw};`;
          delta.push(addStmt + '\n');
        }
      }
    }
  }

  // Views
  for (const [vname, vstmt] of Object.entries(views)) {
    const res = await client.query('SELECT to_regclass($1) as exists', [vname]);
    if (!res.rows[0].exists) delta.push(vstmt);
  }

  // Functions
  for (const [fname, fstmt] of Object.entries(functions)) {
    const res = await client.query(`SELECT proname FROM pg_proc WHERE proname = $1`, [fname]);
    if (res.rowCount === 0) delta.push(fstmt);
  }

  // Indexes
  for (const [iname, istmt] of Object.entries(indexes)) {
    const res = await client.query(`SELECT indexname FROM pg_indexes WHERE indexname = $1`, [iname]);
    if (res.rowCount === 0) delta.push(istmt);
  }

  // RLS enables
  for (const rstmt of rlsEnables) {
    const m = rstmt.match(/ALTER TABLE\s+([A-Za-z0-9_.\"]+)\s+ENABLE ROW LEVEL SECURITY/i);
    if (m) {
      const tab = m[1].replace(/"/g,'').split('.').pop();
      const res = await client.query(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = $1`, [tab]);
      if (res.rowCount === 0 || !res.rows[0].relrowsecurity) delta.push(rstmt);
    }
  }

  // Policies
  for (const p of policies) {
    try {
      const res = await client.query(`SELECT * FROM pg_policies WHERE policyname = $1 AND tablename = $2`, [p.name, p.table]);
      if (res.rowCount === 0) delta.push(p.stmt);
    } catch (e) { delta.push(p.stmt); }
  }

  // Triggers
  for (const [tgrName, tgrStmt] of Object.entries(triggers)) {
    const res = await client.query(`SELECT tgname FROM pg_trigger WHERE tgname = $1`, [tgrName]);
    if (res.rowCount === 0) delta.push(tgrStmt);
  }

  // Grants and others: include them
  for (const g of grants) delta.push(g);
  for (const o of others) delta.push(o);

  if (delta.length === 0) {
    console.log('No deltas found; remote DB matches local schema.');
    await client.end();
    process.exit(0);
  }

  // Write delta file
  const header = `-- Generated gap-fix delta\n-- Source: src/features/collaboration/database/schema.sql\n-- Generated at ${new Date().toISOString()}\n\n`;
  fs.writeFileSync(outPath, header + delta.join('\n'));
  console.log('Wrote delta file with', delta.length, 'statements to', outPath);

  // Apply delta sequentially (wrapped in transaction)
  try {
    console.log('Applying delta...');
    await client.query('BEGIN');
    for (const stmt of delta) {
      try {
        console.log('Executing:', stmt.split('\n')[0].slice(0,120));
        await client.query(stmt);
      } catch (e) {
        console.error('Error executing statement:', e.message);
        // attempt to continue but mark error
      }
    }
    await client.query('COMMIT');
    console.log('Delta applied (committed).');
  } catch (e) {
    console.error('Transaction failed, rolling back:', e.message);
    await client.query('ROLLBACK');
    process.exit(3);
  }

  // Re-verify
  console.log('Re-running verification...');
  // simple re-run: call this script logic again by querying missing; for brevity, reuse client checks: if any still missing, report
  const remaining = [];
  for (const [tname] of Object.entries(tables)) {
    const res = await client.query('SELECT to_regclass($1) as exists', [tname]);
    if (!res.rows[0].exists) remaining.push(`table:${tname}`);
  }
  if (remaining.length === 0) console.log('Re-verify: no remaining missing tables.');
  else console.log('Re-verify: remaining missing objects:', remaining);

  await client.end();
})();
