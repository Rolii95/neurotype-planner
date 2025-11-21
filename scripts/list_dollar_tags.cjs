const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const s = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const regex = /\$[A-Za-z0-9_]*\$/g;
let m;
const tags = {};
while ((m = regex.exec(s)) !== null) {
  const tag = m[0];
  tags[tag] = (tags[tag] || 0) + 1;
}
const entries = Object.entries(tags).sort((a,b)=>b[1]-a[1]);
console.log('Found', entries.length, 'unique dollar-tags. Counts (top 50):');
entries.slice(0,50).forEach(([k,v])=>console.log(k, v));
// List any tags with odd counts
const odd = entries.filter(([k,v])=>v%2!==0);
console.log('\nTags with odd occurrence counts:', odd.length);
odd.slice(0,50).forEach(([k,v])=>console.log(k, v));
process.exit(0);
