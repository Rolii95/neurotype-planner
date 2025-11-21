#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function ts() { return new Date().toISOString().replace(/[:.]/g, '-'); }

if (process.argv.length < 3) {
  console.error('Usage: node scripts/close_unmatched_dollars.cjs <path-to-sql-file>');
  process.exit(2);
}

const filePath = process.argv[2];
const absPath = path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(3);
}

const original = fs.readFileSync(absPath, 'utf8');
const backupPath = absPath + '.autorepair.' + ts() + '.backup';
fs.writeFileSync(backupPath, original, 'utf8');
console.log('Backup written to', backupPath);

const tagRegex = /\$[A-Za-z0-9_]*\$/g;
const topLevelRegex = /\n\s*(?:CREATE|ALTER|DO|COMMENT|SET|GRANT|REVOKE|INSERT|UPDATE|DELETE|BEGIN|--|\/\*)\b/ig;

// Gather all dollar-tag occurrences
let occurrences = [];
let m;
while ((m = tagRegex.exec(original)) !== null) {
  occurrences.push({ tag: m[0], index: m.index });
}

if (occurrences.length === 0) {
  console.log('No dollar-quote tags found; nothing to do.');
  process.exit(0);
}

// Determine unmatched openings using stack logic
let stack = [];
for (let occ of occurrences) {
  const top = stack.length ? stack[stack.length - 1] : null;
  if (top && top.tag === occ.tag) {
    // matched closing
    stack.pop();
  } else {
    // opening
    stack.push({ tag: occ.tag, index: occ.index });
  }
}

const unmatchedOpenings = stack.slice();

if (unmatchedOpenings.length === 0) {
  console.log('No unmatched dollar-quote openings detected.');
  process.exit(0);
}

console.log('Detected', unmatchedOpenings.length, 'unmatched dollar-quote opening(s).');

// Build insertion operations: for each unmatched opening, find next top-level keyword and insert a conservative closer before it.
let insertions = [];
for (let u of unmatchedOpenings) {
  // search for next top-level keyword after u.index
  topLevelRegex.lastIndex = u.index + 1;
  const topMatch = topLevelRegex.exec(original);
  let insertPos = topMatch ? topMatch.index + 1 : original.length;
  // Build conservative closer: END; then the same tag and a semicolon
  const closer = '\nEND;\n' + u.tag + ';\n';
  insertions.push({ pos: insertPos, text: closer, tag: u.tag });
}

// Apply insertions in reverse order so indexes remain valid
insertions.sort((a,b) => b.pos - a.pos);
let repaired = original;
for (let ins of insertions) {
  repaired = repaired.slice(0, ins.pos) + ins.text + repaired.slice(ins.pos);
  console.log('Inserted closer for', ins.tag, 'at pos', ins.pos);
}

const outPath = absPath; // overwrite
fs.writeFileSync(outPath, repaired, 'utf8');
console.log('Wrote repaired file to', outPath);
console.log('Inserted', insertions.length, 'closer(s). Review the backup before proceeding.');

process.exit(0);
