const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const p = path.resolve(process.cwd(), file);
const bak = p + '.normalize_step_enum.backup';
console.log('Reading', p);
let s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(bak, s);
console.log('Backup written to', bak);
const regex = /CREATE\s+TYPE\s+step_execution_status\s+AS\s+ENUM\s*\([\s\S]*?\);/i;
const m = s.match(regex);
if (!m) {
  console.log('No matching step_execution_status enum block found.');
  process.exit(2);
}
console.log('Matched enum block (length', m[0].length, '). Replacing with normalized form.');
const replacement = "CREATE TYPE step_execution_status AS ENUM ('pending', 'active', 'paused', 'completed', 'skipped');";
// Replace only the first occurrence
s = s.replace(regex, replacement);
fs.writeFileSync(p, s, 'utf8');
console.log('Replaced malformed enum with normalized single-line declaration.');
process.exit(0);
