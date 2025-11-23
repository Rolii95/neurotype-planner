#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = process.argv[2] || path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
if (!fs.existsSync(fp)) { console.error('File not found:', fp); process.exit(2); }
const original = fs.readFileSync(fp, 'utf8');
const backupPath = fp + `.auto_fix_all.bak-${new Date().toISOString().replace(/[:.]/g,'-')}`;
fs.writeFileSync(backupPath, original, 'utf8');
console.log('Backup created:', backupPath);
let modified = original;
let report = [];
function apply(re, sub, desc) {
  const before = modified;
  modified = modified.replace(re, sub);
  const count = (before.length - modified.length) === 0 ? (before.match(re) || []).length : (before.match(re) || []).length;
  if (count) report.push({desc, count});
  return count;
}
// 1) DO $BEGIN -> DO $$
apply(/DO \$BEGIN/g, 'DO $$', "Replace 'DO $BEGIN' -> 'DO $$'");
// 2) AS $$" -> AS $$
apply(/AS \$\$\"/g, 'AS $$', 'Remove stray double-quote after AS $$');
// 3) Normalize $$; to ensure newline after function ends (only if not followed by blank line)
apply(/\$\$;(?=[^\n\r\n])/g, '\\$\\$;\n\n', "Ensure newline after '$$;' (function end)");
// 4) Normalize END $$; followed immediately by CREATE/COMMENT/DO to have a blank line
apply(/END \$\$;\s*(?=CREATE|COMMENT|DO|GRANT|ALTER|INSERT|CREATE INDEX|CREATE TRIGGER)/g, 'END $$;\n\n', "Insert spacing after 'END $$;' before next statement");
// 5) Normalize 'skipped' with accidental whitespace/newline
apply(/'skipped\s*'/g, "'skipped'", "Normalize 'skipped' enum element");
// 6) Remove lone quote-only lines like "';" or "' ;"
const loneQuoteRegex = /^\s*'\s*;\s*$/gmu;
let loneCount = 0;
modified = modified.replace(loneQuoteRegex, (m)=>{ loneCount++; return ''; });
if (loneCount) report.push({desc: "Remove lone quote-only lines (" + loneCount + ")", count: loneCount});
// 7) Remove stray control characters except common ones (keep \n, \r, \t)
const beforeControl = modified.length;
modified = modified.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
const controlRemoved = (beforeControl - modified.length) ? 'yes' : 'no';
if (controlRemoved === 'yes') report.push({desc: 'Remove non-printable control characters', count: 1});
// 8) Replace AS $$" patterns with AS $$ (duplicate safety)
apply(/AS \$\$\"/g, 'AS $$', 'Second pass: AS $$" -> AS $$');
// 9) Ensure there is exactly one blank line between top-level statements by collapsing >3 newlines to two
const nlBefore = (modified.match(/\n\n\n+/g) || []).length;
modified = modified.replace(/\n\n\n+/g, '\n\n');
const nlAfter = (modified.match(/\n\n+/g) || []).length;
if (nlBefore) report.push({desc: 'Collapse excessive blank lines', count: nlBefore});
// 10) Quick check for unbalanced single quotes (heuristic) — count single quote characters not part of doubled ''
function countSingleQuotes(s) {
  // naive: count occurrences of ' and occurrences of '' pairs
  const total = (s.match(/'/g) || []).length;
  const doubled = (s.match(/''/g) || []).length * 2;
  return total - doubled; // remaining single quotes that are not doubled
}
const singleRemains = countSingleQuotes(modified);
if (singleRemains % 2 !== 0) report.push({desc: 'Heuristic: unbalanced single quote count (may indicate problems)', count: singleRemains});
// finish
if (modified === original) {
  console.log('No changes made by auto-fixer.');
  process.exit(0);
}
fs.writeFileSync(fp, modified, 'utf8');
console.log('Auto-fix applied. Summary:');
report.forEach(r => console.log(` - ${r.desc}: ${r.count}`));
console.log('\nWrote file:', fp);
process.exit(0);
