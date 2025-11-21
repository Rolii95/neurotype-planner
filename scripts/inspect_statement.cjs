const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const idx = parseInt(process.argv[3] || '45', 10) - 1;
const sql = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
function splitSqlStatements(sqlText) {
  const stmts = [];
  let i = 0;
  let start = 0;
  let dollarTag = null;
  let inSingle = false;
  let inDouble = false;
  while (i < sqlText.length) {
    const ch = sqlText[i];
    if (!inSingle && !inDouble && ch === '$') {
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
        const stmt = sqlText.substring(start, i+1).trim();
        if (stmt && !stmt.startsWith('--')) stmts.push(stmt);
        start = i+1;
      }
    }
    i++;
  }
  const tail = sqlText.substring(start).trim(); if (tail) stmts.push(tail);
  return stmts;
}

let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '\n');
cleaned = cleaned.replace(/--.*$/gm, '\n');
const stmts = splitSqlStatements(cleaned);
console.log('Parsed', stmts.length, 'statements.');
if (idx < 0 || idx >= stmts.length) {
  console.error('Index out of range', idx+1);
  process.exit(2);
}
console.log('--- Statement', idx+1, 'preview: ---');
console.log(stmts[idx].slice(0,2000));
process.exit(0);
