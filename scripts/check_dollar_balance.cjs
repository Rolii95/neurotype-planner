#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = process.argv[2];
if (!fp) {
  console.error('Usage: node check_dollar_balance.cjs <file>');
  process.exit(2);
}
const content = fs.readFileSync(fp, 'utf8');
const regex = /\$[A-Za-z0-9_]*\$/g;
let match;
const stack = [];
const occurrences = [];
while ((match = regex.exec(content)) !== null) {
  const tag = match[0];
  const index = match.index;
  // Track line number
  const line = content.slice(0, index).split('\n').length;
  occurrences.push({tag, index, line});
}
for (const occ of occurrences) {
  if (stack.length > 0 && stack[stack.length-1].tag === occ.tag) {
    stack.pop();
  } else {
    stack.push(occ);
  }
}
console.log('Total dollar-tag tokens found:', occurrences.length);
if (stack.length === 0) {
  console.log('All dollar-tags appear balanced.');
  process.exit(0);
}
console.log('Unbalanced dollar-tags (openings without matching closings):');
stack.forEach(s => {
  console.log(`  ${s.tag} at line ${s.line}`);
});
process.exit(1);
