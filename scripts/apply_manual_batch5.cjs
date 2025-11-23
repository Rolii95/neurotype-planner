#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = process.argv[2] || path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
if (!fs.existsSync(fp)) {
  console.error('File not found:', fp);
  process.exit(2);
}
const backupDir = path.dirname(fp);
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `20251120_all_migrations_gap_fix.sql.batch5.bak-${ts}`);
const original = fs.readFileSync(fp, 'utf8');
fs.writeFileSync(backupPath, original, 'utf8');
console.log('Backup created:', backupPath);
let modified = original;
let totalReplacements = 0;
function applyRegex(re, replaceStr) {
  const matches = [...modified.matchAll(re)];
  if (matches.length === 0) return 0;
  modified = modified.replace(re, replaceStr);
  return matches.length;
}
// Conservative replacements (global):
// 1) Replace DO $BEGIN (invalid) with DO $$
const r1 = /DO \$BEGIN/g;
const c1 = applyRegex(r1, 'DO $$');
totalReplacements += c1;
// 2) Replace any occurrences of 'skipped' with embedded whitespace/newline inside the single-quoted enum element
const r2 = /'skipped\s*'/g; // catches 'skipped' even if newline or spaces present
const c2 = applyRegex(r2, "'skipped'");
totalReplacements += c2;
// 3) Normalize stray $$; sequences: replace "$$;" with "$$;\n\n" (ensure newline after function end) — only if present
const r3 = /\$\$;(?=[^\n])/g;
const c3 = applyRegex(r3, '\\$\\$;\n\n');
totalReplacements += c3;
// 4) Remove accidental AS $$" patterns (AS $$") -> AS $$
const r4 = /AS \$\$\"/g;
const c4 = applyRegex(r4, 'AS $$');
totalReplacements += c4;
// 5) Collapse stray single-quote-only lines that are alone (a line with just "';" or "' ;") — remove the lone quote semicolon
const r5 = /^\s*'\s*;\s*$/gmu;
let c5 = 0;
modified = modified.replace(r5, (m) => { c5++; return ''; });
totalReplacements += c5;
// Write back if changed
if (modified === original) {
  console.log('No changes required; migration unchanged.');
  process.exit(0);
}
fs.writeFileSync(fp, modified, 'utf8');
console.log('Applied replacements summary:');
console.log(`  DO $BEGIN -> DO $$ : ${c1}`);
console.log(`  'skipped' normalization : ${c2}`);
console.log(`  '$$;' newline normalization : ${c3}`);
console.log(`  AS $$" -> AS $$ : ${c4}`);
console.log(`  removed lone quote-only lines : ${c5}`);
console.log('Total replacements/changes:', totalReplacements);
// Print first few changed contexts
console.log('\nSample changed lines (first 10 matches):');
const diffLines = [];
const origLines = original.split(/\r?\n/);
const newLines = modified.split(/\r?\n/);
for (let i = 0; i < Math.min(origLines.length, newLines.length); i++) {
  if (origLines[i] !== newLines[i]) {
    diffLines.push({line: i+1, before: origLines[i], after: newLines[i]});
    if (diffLines.length >= 10) break;
  }
}
if (diffLines.length === 0) {
  console.log('  (no single-line diffs found; changes may be whitespace or multi-line replacements)');
} else {
  diffLines.forEach(d => {
    console.log(`  Line ${d.line}:`);
    console.log(`    - ${d.before}`);
    console.log(`    + ${d.after}`);
  });
}
console.log('\nBackup committed; changes written to migration file.');
process.exit(0);
