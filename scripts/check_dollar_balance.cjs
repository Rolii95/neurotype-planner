#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const txt = fs.readFileSync(file, 'utf8');
const lines = txt.split(/\n/);

function findDollarTags(text) {
  const tags = [];
  const re = /\$[A-Za-z0-9_]*\$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tags.push({tag: m[0], index: m.index});
  }
  return tags;
}

const tags = findDollarTags(txt);
if (tags.length === 0) {
  console.log('No dollar-tags found.');
  process.exit(0);
}

// Walk and pair tags
const stack = [];
for (const t of tags) {
  const tag = t.tag;
  if (stack.length === 0 || stack[stack.length-1].tag !== tag) {
    stack.push(t);
  } else {
    stack.pop();
  }
}

if (stack.length === 0) {
  console.log('All dollar-quoted tags appear balanced.');
  process.exit(0);
}

console.log('Unbalanced dollar-quoted tags found:');
for (const s of stack) {
  // compute line number
  const prefix = txt.slice(0, s.index);
  const line = prefix.split('\n').length;
  console.log(`- Tag ${s.tag} at approx line ${line}`);
}

process.exit(1);
