const fs = require('fs');
const path = require('path');
const MIG = path.join(__dirname,'..','supabase','migrations','20251120_all_migrations_gap_fix.sql');
const s = fs.readFileSync(MIG,'utf8');

const regex = /\$[A-Za-z0-9_]*\$/g;
let m;
const stack = [];
while ((m = regex.exec(s)) !== null) {
  const tag = m[0];
  const idx = m.index;
  if (stack.length && stack[stack.length-1].tag === tag) {
    // closing
    stack.pop();
  } else {
    // opening
    stack.push({tag, idx});
  }
}

if (stack.length === 0) {
  console.log('No unmatched dollar-quote tags found.');
  process.exit(0);
}

console.log('Unmatched dollar-quote tags found:', stack.length);
for (const item of stack) {
  const contextStart = Math.max(0, item.idx - 80);
  const context = s.slice(contextStart, item.idx + 80).replace(/\n/g,'\\n');
  console.log('---');
  console.log('Tag:', item.tag, 'Offset:', item.idx);
  console.log('Context:', context);
}
process.exit(0);
