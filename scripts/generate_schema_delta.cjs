#!/usr/bin/env node
// Generates a delta SQL file containing only CREATE statements from
// src/features/collaboration/database/schema.sql that do not exist in the target DB.

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
const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_collaboration_delta.sql');

const sql = fs.readFileSync(schemaPath, 'utf8');
// Split statements by semicolon but keep semicolon so we can rebuild
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

    // line comment start --
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

    // block comment start /*
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

    // dollar-quote start $tag$
    if (!inSingle && !inDouble && !inDollar && ch === '$') {
      // read possible tag
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

    // single quote
    if (!inDouble && ch === "'") {
      inSingle = true;
      buf += ch;
      i++;
      continue;
    }
    if (inSingle) {
      // handle escaped ''
      if (ch === "'" && sql[i + 1] === "'") {
        buf += "''";
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
      }
      buf += ch;
      i++;
      continue;
    }

    // double quote (identifiers)
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

    // statement delimiter at top level
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

const rawStatements = splitSqlStatements(sql);

function extractObject(stmt) {
  const s = stmt.replace(/\n+/g, ' ').trim().toUpperCase();
  if (s.startsWith('CREATE EXTENSION')) {
    const m = stmt.match(/CREATE EXTENSION IF NOT EXISTS\s+"?([A-Za-z0-9_\-]+)"?/i);
    return m ? { type: 'extension', name: m[1], stmt } : null;
  }
  if (s.startsWith('CREATE TABLE')) {
    const m = stmt.match(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_."]+)/i);
    if (m) return { type: 'table', name: m[1].replace(/"/g,''), stmt };
  }
  if (s.startsWith('CREATE POLICY')) {
    const m = stmt.match(/CREATE POLICY\s+"?([^"]+)"?\s+ON\s+([A-Za-z0-9_."]+)/i);
    if (m) return { type: 'policy', name: m[1], on: m[2].replace(/"/g,''), stmt };
  }
  if (s.startsWith('CREATE OR REPLACE VIEW') || s.startsWith('CREATE VIEW')) {
    const m = stmt.match(/CREATE(?: OR REPLACE)? VIEW\s+([A-Za-z0-9_."]+)/i);
    if (m) return { type: 'view', name: m[1].replace(/"/g,''), stmt };
  }
  if (s.startsWith('CREATE OR REPLACE FUNCTION') || s.startsWith('CREATE FUNCTION')) {
    const m = stmt.match(/CREATE(?: OR REPLACE)? FUNCTION\s+([A-Za-z0-9_."]+)\s*\(/i);
    if (m) return { type: 'function', name: m[1].replace(/"/g,''), stmt };
  }
  if (s.startsWith('CREATE TRIGGER')) {
    const m = stmt.match(/CREATE TRIGGER\s+([A-Za-z0-9_\"]+)\s+/i);
    if (m) return { type: 'trigger', name: m[1].replace(/"/g,''), stmt };
  }
  if (s.startsWith('CREATE INDEX')) {
    const m = stmt.match(/CREATE INDEX IF NOT EXISTS\s+([A-Za-z0-9_\"]+)\s+ON\s+([A-Za-z0-9_."]+)/i);
    if (m) return { type: 'index', name: m[1].replace(/"/g,''), on: m[2].replace(/"/g,''), stmt };
  }
  if (s.startsWith('ALTER TABLE') && s.includes('ENABLE ROW LEVEL SECURITY')) {
    const m = stmt.match(/ALTER TABLE\s+([A-Za-z0-9_."]+)\s+ENABLE ROW LEVEL SECURITY/i);
    if (m) return { type: 'rls_enable', name: m[1].replace(/"/g,''), stmt };
  }
  if (s.startsWith('GRANT ')) {
    return { type: 'grant', name: null, stmt };
  }
  return null;
}

(async function main(){
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const parsed = rawStatements.map(extractObject).filter(Boolean);

  const missingStmts = [];

  for (const obj of parsed) {
    try {
      if (obj.type === 'table') {
        const res = await client.query("SELECT to_regclass($1) as exists", [obj.name]);
        if (!res.rows[0].exists) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'extension') {
        const res = await client.query("SELECT extname FROM pg_extension WHERE extname = $1", [obj.name]);
        if (res.rowCount === 0) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'policy') {
        const res = await client.query(
          `SELECT * FROM pg_policies WHERE policyname = $1 AND schemaname = $2`,
          [obj.name, (obj.on.includes('.')? obj.on.split('.')[0] : 'public')]
        );
        // pg_policies returns policyname only for policies
        if (res.rowCount === 0) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'view') {
        const res = await client.query("SELECT to_regclass($1) as exists", [obj.name]);
        if (!res.rows[0].exists) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'function') {
        const res = await client.query(
          `SELECT proname FROM pg_proc WHERE proname = $1`, [obj.name.split('.').pop()]
        );
        if (res.rowCount === 0) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'trigger') {
        const res = await client.query(`SELECT tgname FROM pg_trigger WHERE tgname = $1`, [obj.name]);
        if (res.rowCount === 0) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'index') {
        const res = await client.query(`SELECT indexname FROM pg_indexes WHERE indexname = $1`, [obj.name]);
        if (res.rowCount === 0) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'rls_enable') {
        // Check if RLS is enabled
        const res = await client.query(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = $1 AND c.relname = $2`, (obj.name.includes('.')? obj.name.split('.') : ['public', obj.name]));
        if (res.rowCount === 0 || !res.rows[0].relrowsecurity) missingStmts.push(obj.stmt + '\n;');
      } else if (obj.type === 'grant') {
        // include grants as deltas by default
        missingStmts.push(obj.stmt + '\n;');
      }
    } catch (err) {
      console.error('Check error for', obj, err.message);
      // conservative: include statement
      missingStmts.push(obj.stmt + '\n;');
    }
  }

  if (missingStmts.length === 0) {
    console.log('No deltas found; remote DB already has objects from schema.');
    await client.end();
    process.exit(0);
  }

  const header = `-- Generated delta: only include statements missing from remote DB\n-- Source: src/features/collaboration/database/schema.sql\n-- Generated at ${new Date().toISOString()}\n\n`;
  fs.writeFileSync(outPath, header + missingStmts.join('\n\n'));
  console.log('Wrote delta file with', missingStmts.length, 'statements to', outPath);

  await client.end();
})();
