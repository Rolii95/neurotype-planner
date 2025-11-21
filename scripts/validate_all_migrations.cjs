#!/usr/bin/env node
// Validate all SQL files under supabase/migrations against remote DB.
// - Parse each .sql file into statements (handles dollar-quoted, comments, quotes)
// - For each statement detect object type and check existence
// - Aggregate missing statements into a single delta file and apply it
// - Produce a report of missing objects and candidate files to delete (non-migration helpers)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// CLI args: --apply to actually run statements, --db=<connectionString> to override env
const argv = process.argv.slice(2);
const dbArg = argv.find(a => a.startsWith('--db='));
const DB_URL = dbArg ? dbArg.split('=')[1] : (process.env.DB_URL || process.env.DATABASE_URL);
const APPLY = argv.includes('--apply');
if (!DB_URL) {
  console.error('Missing DB_URL environment variable. Provide via env or --db=<connectionString>');
  process.exit(2);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const outDelta = path.join(migrationsDir, '20251120_all_migrations_gap_fix.sql');
const reportPath = path.join(migrationsDir, '20251120_all_migrations_report.json');

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

function classifyStatement(s) {
  const up = s.replace(/\n+/g,' ').trim().toUpperCase();
  if (up.startsWith('CREATE EXTENSION')) return { type: 'extension', stmt: s };
  if (up.startsWith('CREATE TABLE')) return { type: 'table', name: (s.match(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z0-9_.\"]+)/i)||[])[1], stmt: s };
  if (up.startsWith('CREATE OR REPLACE VIEW') || up.startsWith('CREATE VIEW')) return { type: 'view', name: (s.match(/CREATE(?: OR REPLACE)? VIEW\s+([A-Za-z0-9_.\"]+)/i)||[])[1], stmt: s };
  if (up.startsWith('CREATE FUNCTION') || up.startsWith('CREATE OR REPLACE FUNCTION')) return { type: 'function', name: (s.match(/CREATE(?: OR REPLACE)? FUNCTION\s+([A-Za-z0-9_.\"]+)\s*\(/i)||[])[1], stmt: s };
  if (up.startsWith('CREATE INDEX')) return { type: 'index', name: (s.match(/CREATE INDEX IF NOT EXISTS\s+([A-Za-z0-9_\"]+)/i)||[])[1], stmt: s };
  if (up.startsWith('CREATE POLICY')) return { type: 'policy', name: (s.match(/CREATE POLICY\s+"?([^\"]+)"?\s+ON\s+([A-Za-z0-9_.\"]+)/i)||[])[1], table: (s.match(/CREATE POLICY\s+"?([^\"]+)"?\s+ON\s+([A-Za-z0-9_.\"]+)/i)||[])[2], stmt: s };
  if (up.startsWith('ALTER TABLE') && up.includes('ENABLE ROW LEVEL SECURITY')) return { type: 'rls_enable', stmt: s };
  if (up.startsWith('CREATE TRIGGER')) return { type: 'trigger', name: (s.match(/CREATE TRIGGER\s+([A-Za-z0-9_\"]+)/i)||[])[1], stmt: s };
  if (up.startsWith('GRANT')) return { type: 'grant', stmt: s };
  if (up.startsWith('DO $$') || up.startsWith('SELECT')) return { type: 'other', stmt: s };
  return { type: 'other', stmt: s };
}

(async function main(){
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const files = fs.readdirSync(migrationsDir).filter(f=>f.endsWith('.sql'));
  files.sort();

  const delta = [];
  const report = { checkedFiles: [], missing: [], skipped: [] };

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const content = fs.readFileSync(full, 'utf8');
    const stmts = splitSqlStatements(content);
    report.checkedFiles.push({ file, statements: stmts.length });
    for (const s of stmts) {
      const c = classifyStatement(s);
      try {
        if (c.type === 'extension') {
          const m = s.match(/CREATE EXTENSION IF NOT EXISTS\s+"?([A-Za-z0-9_\-]+)"?/i);
          if (m) {
            const ext = m[1];
            const res = await client.query('SELECT extname FROM pg_extension WHERE extname = $1', [ext]);
            if (res.rowCount === 0) { delta.push(s+'\n;'); report.missing.push({file, type:'extension', name: ext}); }
          }
        } else if (c.type === 'table') {
          const tbl = (c.name||'').replace(/"/g,'').split('.').pop();
          if (!tbl) { report.skipped.push({file, reason:'unnamed table statement'}); continue; }
          const res = await client.query('SELECT to_regclass($1) as exists', [tbl]);
          if (!res.rows[0].exists) { delta.push(s+'\n;'); report.missing.push({file, type:'table', name: tbl}); }
          else {
            // check for missing columns
            // extract columns block
            const cols = (s.match(/\((.|\n)+\)/m)||[])[0];
            if (cols) {
              // crude extract of column names
              const colLines = cols.slice(1,-1).split(/,\n/);
              for (const cl of colLines) {
                const mcol = cl.match(/^\s*"?([A-Za-z0-9_]+)"?\s+/);
                if (mcol) {
                  const col = mcol[1];
                  const cres = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`, [tbl, col]);
                  if (cres.rowCount === 0) {
                    // attempt to build ADD COLUMN statement (keep type fragment)
                    const frag = cl.trim();
                    const add = `ALTER TABLE ${tbl} ADD COLUMN ${frag};`;
                    delta.push(add+'\n');
                    report.missing.push({file, type:'column', table:tbl, column:col});
                  }
                }
              }
            }
          }
        } else if (c.type === 'view') {
          const v = (c.name||'').replace(/"/g,'').split('.').pop();
          if (!v) { report.skipped.push({file, reason:'unnamed view'}); continue; }
          const res = await client.query('SELECT to_regclass($1) as exists', [v]);
          if (!res.rows[0].exists) { delta.push(s+'\n;'); report.missing.push({file, type:'view', name: v}); }
        } else if (c.type === 'function') {
          const f = (c.name||'').replace(/"/g,'').split('.').pop();
          if (!f) { report.skipped.push({file, reason:'unnamed function'}); continue; }
          const res = await client.query('SELECT proname FROM pg_proc WHERE proname = $1', [f]);
          if (res.rowCount === 0) { delta.push(s+'\n;'); report.missing.push({file, type:'function', name: f}); }
        } else if (c.type === 'index') {
          const idx = (c.name||'').replace(/"/g,'');
          if (!idx) { report.skipped.push({file, reason:'unnamed index'}); continue; }
          const res = await client.query('SELECT indexname FROM pg_indexes WHERE indexname = $1', [idx]);
          if (res.rowCount === 0) { delta.push(s+'\n;'); report.missing.push({file, type:'index', name: idx}); }
        } else if (c.type === 'policy') {
          const p = c.name;
          const rawTable = c.table || '';
          const t = (rawTable.replace(/"/g,'').split('.').pop() || rawTable);
          if (!p || !t) { report.skipped.push({file, reason:'unnamed policy or table'}); continue; }
          const res = await client.query(`SELECT * FROM pg_policies WHERE policyname = $1 AND tablename = $2`, [p, t]);
          if (res.rowCount === 0) {
            // Emit DROP before CREATE to avoid duplicate-policy errors on reapply
            const targetTable = rawTable || t;
            delta.push(`DROP POLICY IF EXISTS "${p}" ON ${targetTable};\n` + s + '\n;');
            report.missing.push({file, type:'policy', name: p, table: t});
          }
        } else if (c.type === 'rls_enable') {
          const m = s.match(/ALTER TABLE\s+([A-Za-z0-9_.\"]+)\s+ENABLE ROW LEVEL SECURITY/i);
          if (m) {
            const t = m[1].replace(/"/g,'').split('.').pop();
            const res = await client.query(`SELECT relrowsecurity FROM pg_class WHERE relname = $1`, [t]);
            if (res.rowCount === 0 || !res.rows[0].relrowsecurity) { delta.push(s+'\n;'); report.missing.push({file, type:'rls_enable', table: t}); }
          }
        } else if (c.type === 'trigger') {
          const tn = (c.name||'').replace(/"/g,'');
          const res = await client.query('SELECT tgname FROM pg_trigger WHERE tgname = $1', [tn]);
          if (res.rowCount === 0) { delta.push(s+'\n;'); report.missing.push({file, type:'trigger', name: tn}); }
        } else if (c.type === 'grant') {
          delta.push(s+'\n;'); report.missing.push({file, type:'grant'});
        } else {
          // other statements included by default
          delta.push(s+'\n;'); report.missing.push({file, type:'other', snippet: s.slice(0,80)});
        }
      } catch (e) {
        console.error('Error checking statement from', file, e.message);
        delta.push(s+'\n;'); report.missing.push({file, type:'error', err: e.message});
      }
    }
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (delta.length === 0) {
    console.log('No deltas found across all migration files; remote DB matches all migration objects.');
    await client.end();
    process.exit(0);
  }

  const header = `-- Generated all-migrations gap-fix\n-- Generated at ${new Date().toISOString()}\n\n`;
  fs.writeFileSync(outDelta, header + delta.join('\n'));
  console.log('Wrote delta to', outDelta, 'with', delta.length, 'statements. Report at', reportPath);

  if (APPLY) {
    // Apply statements individually (no single transaction)
    for (const stmt of delta) {
      try {
        await client.query(stmt);
        console.log('Executed statement:', stmt.split('\n')[0]);
      } catch (e) {
        console.error('Failed to execute statement:', e.message, '\nstmt:', stmt.split('\n')[0]);
        // Attempt to reset session state in case a statement left the session in an aborted transaction
        try {
          await client.query('ROLLBACK');
        } catch (err) {
          // ignore rollback errors
        }
        // continue to next statement
      }
    }
    console.log('Finished applying delta statements (non-transactional).');
  } else {
    console.log('Dry-run (default): not applying any statements.');
    console.log('Run with --apply to execute the generated delta against the target DB.');
    console.log('Delta written to:', outDelta, 'with', delta.length, 'statements.');
    // Print a short preview of the first few statements
    const previewCount = Math.min(10, delta.length);
    if (previewCount > 0) {
      console.log('Preview of first', previewCount, 'statements:');
      for (let i = 0; i < previewCount; i++) {
        console.log('---', i + 1, '---\n', delta[i].split('\n')[0]);
      }
    }
  }


  // Prepare candidate deletions: non-migration helper scripts
  const candidates = files.filter(f => /(demo|RUN_ALL|reload_schema_cache|verify|check_|create_demo_user)/i.test(f));
  console.log('Candidate files for deletion (preview):', candidates);
  fs.writeFileSync(path.join(migrationsDir, '20251120_all_migrations_candidates.json'), JSON.stringify(candidates, null, 2));

  await client.end();
  console.log('Finished. Review report and candidates before deleting files.');
})();
