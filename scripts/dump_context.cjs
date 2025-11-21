const fs = require('fs');
const path = require('path');
const file = 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const key = process.argv[2] || "users_can_view_own_profile";
const s = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const idx = s.indexOf(key);
if (idx === -1) { console.error('Key not found:', key); process.exit(2); }
const start = Math.max(0, idx - 80);
const snippet = s.slice(start, start + 200);
console.log('Context snippet:\n', snippet.replace(/\r/g,'\\r').replace(/\n/g,'\\n\n'));
console.log('\nHex codes around the snippet:');
for (let i = 0; i < snippet.length; i++) {
  process.stdout.write(snippet.charCodeAt(i).toString(16) + ' ');
}
console.log();
process.exit(0);
