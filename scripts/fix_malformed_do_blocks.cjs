#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const text = fs.readFileSync(file, 'utf8');

let out = text;
let changes = 0;

// Find DO $$ ... $$ blocks and detect those containing 'RETURN NEW'
const doOpenRegex = /DO\s+\$\$\s*BEGIN/gi;
let match;
while ((match = doOpenRegex.exec(text)) !== null) {
  const start = match.index;
  // find next $$ that closes the block
  const closeIdx = text.indexOf('$$', start + 10);
  if (closeIdx === -1) break;
  // find end of the $$ block (search for first occurrence of "$" followed by optional LANGUAGE etc) by finding next "$$" after start
  const secondClose = text.indexOf('$$', closeIdx + 2);
  if (secondClose === -1) continue;
  const blockEnd = secondClose + 2; // position after closing $$
  const block = text.substring(start, blockEnd);
  if (block.includes('RETURN NEW')) {
    // look ahead for next CREATE TRIGGER and following END IF;
    const after = text.substring(blockEnd, blockEnd + 1000);
    const createTrigMatch = /CREATE\s+TRIGGER[\s\S]*?;\s*/i.exec(after);
    const endIfMatch = /END\s*IF;/.exec(after);
    if (createTrigMatch && endIfMatch) {
      // determine span to replace: from start to blockEnd + endIfMatch.index + length
      const replaceEnd = blockEnd + endIfMatch.index + endIfMatch[0].length;
      const createStmt = createTrigMatch[0].trim();
      // extract trigger name for logging
      const nameMatch = /CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)/i.exec(createStmt);
      const trigName = nameMatch ? nameMatch[1] : '(unknown)';

      const canonical = `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${trigName}') THEN\n    ${createStmt}\n  END IF;\nEND$$;\n`;

      out = out.slice(0, start) + canonical + out.slice(replaceEnd);
      changes++;
    }
  }
}

if (changes > 0) {
  const backup = file + '.autofix.ADO.backup';
  fs.writeFileSync(backup, text, 'utf8');
  fs.writeFileSync(file, out, 'utf8');
  console.log(`Fixed ${changes} malformed DO block(s). Backup saved to ${backup}`);
  process.exit(0);
} else {
  console.log('No malformed DO blocks found needing auto-repair.');
  process.exit(0);
}
