#!/usr/bin/env node
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  const db = process.env.DB_URL || process.argv[3];
  if (!file) {
    console.error('Usage: node apply_sql_file.cjs <sql-file> [db-url]');
    process.exit(2);
  }
  if (!db) {
    console.error('Missing DB URL. Set DB_URL env var or pass as second arg.');
    process.exit(2);
  }

  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString: db });
  function splitSqlStatements(sqlText) {
    const stmts = [];
    let i = 0;
    let start = 0;
    let dollarTag = null;
    let inSingle = false;
    let inDouble = false;
    while (i < sqlText.length) {
      const ch = sqlText[i];
      // handle dollar tag open/close
      if (!inSingle && !inDouble && ch === '$') {
        // try to read a tag like $tag$
        const m = /^\$[A-Za-z0-9_]*\$/.exec(sqlText.substring(i));
        if (m) {
          const tag = m[0];
          if (dollarTag === null) { dollarTag = tag; i += tag.length; continue; }
          if (dollarTag === tag) { dollarTag = null; i += tag.length; continue; }
        }
      }
      if (!dollarTag) {
        if (ch === "'") { inSingle = !inSingle; }
        else if (ch === '"') { inDouble = !inDouble; }
        else if (!inSingle && !inDouble && ch === ';') {
          // statement boundary
          const stmt = sqlText.substring(start, i+1).trim();
          if (stmt && !stmt.startsWith('--')) stmts.push(stmt);
          start = i+1;
        }
      }
      i++;
    }
    // trailing
    const tail = sqlText.substring(start).trim(); if (tail) stmts.push(tail);
    return stmts;
  }

  try {
    await client.connect();
    console.log('Connected to DB, executing file:', file);
    // Remove block comments (/* ... */) and line comments (-- ...) so
    // they are not executed as SQL and do not contain stray semicolons.
    let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '\n');
    // Remove line comments (till end of line). Use multiline flag.
    cleaned = cleaned.replace(/--.*$/gm, '\n');
    const stmts = splitSqlStatements(cleaned);
    console.log('Parsed', stmts.length, 'statements.');
    for (let idx = 0; idx < stmts.length; idx++) {
      const s = stmts[idx];
      const preview = s.replace(/\s+/g,' ').slice(0,200);
      console.log(`Executing statement ${idx+1}/${stmts.length}: ${preview}`);
      try {
        // If a DO $$ ... $$ anonymous block mistakenly contains 'RETURN NEW', it
        // will fail because DO blocks do not return values. Skip such statements
        // and log a warning so they can be inspected and fixed manually.
        const trimmed = s.trimStart();
        if (/^DO\s+\$\$/i.test(trimmed) && trimmed.includes('RETURN NEW')) {
          console.warn(`Skipping DO block at statement ${idx+1} because it contains 'RETURN NEW' (invalid in DO blocks).`);
          continue;
        }
        await client.query(s);
      } catch (err) {
        // Treat common idempotent "already exists" errors as warnings and continue.
        const nonFatal = new Set(['42710', '42701', '42P07', '23505']);
        if (err && err.code && nonFatal.has(err.code)) {
          console.warn(`Non-fatal error for statement ${idx+1} (code ${err.code}):`, err.message || err);
          // If a statement failed inside a transaction, the transaction is now aborted.
          // Issue a ROLLBACK to reset session state before continuing.
          try {
            await client.query('ROLLBACK');
            console.warn('Issued ROLLBACK to clear aborted transaction.');
          } catch (rbErr) {
            // ignore rollback errors
          }
          continue;
        }
        console.error('Error executing statement index', idx+1);
        console.error(err);
        throw err;
      }
    }
    console.log('All statements executed successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing SQL file:');
    console.error(err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

main();
