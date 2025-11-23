#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const base = '20251120_all_migrations_gap_fix.sql.auto_fix_all.bak-';
const files = fs.readdirSync(dir).filter(f=>f.startsWith('20251120_all_migrations_gap_fix.sql.auto_fix_all.bak-')).map(f=>({f, m:fs.statSync(path.join(dir,f)).mtimeMs})).sort((a,b)=>b.m-a.m);
if (files.length===0) { console.error('No auto_fix_all backup found in',dir); process.exit(2); }
const backupFile = path.join(dir, files[0].f);
const currentFile = path.join(dir, '20251120_all_migrations_gap_fix.sql');
console.log('Comparing', backupFile, '->', currentFile);
const a = fs.readFileSync(backupFile,'utf8').split(/\r?\n/);
const b = fs.readFileSync(currentFile,'utf8').split(/\r?\n/);
let diffs = [];
const maxLines = Math.max(a.length,b.length);
for (let i=0;i<maxLines;i++){
  const la = a[i]||'';
  const lb = b[i]||'';
  if (la!==lb) diffs.push({line:i+1, before: la, after: lb});
  if (diffs.length>=30) break;
}
console.log('Total lines in backup:', a.length, 'current:', b.length);
console.log('First', diffs.length, 'differences:');
diffs.forEach(d=>{
  console.log(`Line ${d.line}:`);
  console.log('  -', d.before);
  console.log('  +', d.after);
});
console.log('\n(Showing up to 30 diffs)');
process.exit(0);
