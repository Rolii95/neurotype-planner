const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const index = parseInt(process.argv[3] || '6126', 10) - 1;
const p = path.resolve(process.cwd(), file);
const bak = p + '.split_and_fix.backup';
console.log('Reading', p);
let s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(bak, s);
console.log('Backup written to', bak);
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
const stmts = splitSqlStatements(s);
console.log('Parsed', stmts.length, 'statements.');
if (index < 0 || index >= stmts.length) { console.error('Index out of range', index+1); process.exit(2); }
console.log('Original statement length:', stmts[index].length);
const target = stmts[index];
// Heuristic: split the statement at the first occurrence of "CREATE TYPE routine_step_type".
const splitMarker = 'CREATE TYPE routine_step_type';
const pos = target.indexOf(splitMarker);
if (pos === -1) { console.error('Split marker not found in target statement.'); process.exit(3); }
const before = target.substring(0,pos).trim();
const after = target.substring(pos).trim();
// Further split 'after' by semicolons (safe because it should contain only non-dollar blocks)
const parts = after.split(';').map(p=>p.trim()).filter(Boolean).map(p=>p.trim()+';');
const newStmts = [];
if (before) newStmts.push(before);
for (const part of parts) newStmts.push(part);
console.log('Replacing statement', index+1, 'with', newStmts.length, 'statements.');
// Replace in array
const newArray = stmts.slice(0,index).concat(newStmts).concat(stmts.slice(index+1));
console.log('New statement count:', newArray.length);
// Reconstruct SQL file with two newlines between statements
const out = newArray.join('\n\n');
fs.writeFileSync(p, out, 'utf8');
console.log('Wrote updated file.');
process.exit(0);
