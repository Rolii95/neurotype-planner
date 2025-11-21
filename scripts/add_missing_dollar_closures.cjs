#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const bak = file + '.preclose2.bak';
let txt = fs.readFileSync(file, 'utf8');
const lines = txt.split(/\r?\n/);
let changed = 0;
for (let i = 0; i < lines.length - 1; i++) {
  if (/^\s*END;\s*$/.test(lines[i])) {
    // look ahead up to 4 lines for CREATE TRIGGER
    let foundTrigger = false;
    let foundDollar = false;
    for (let j = i+1; j <= Math.min(i+4, lines.length-1); j++) {
      if (/\$\$/.test(lines[j])) { foundDollar = true; break; }
      if (/^\s*CREATE\s+TRIGGER/i.test(lines[j])) { foundTrigger = true; break; }
    }
    if (foundTrigger && !foundDollar) {
      // insert $$ LANGUAGE plpgsql; after line i
      lines.splice(i+1, 0, "$$ LANGUAGE plpgsql;", "");
      changed++;
      i += 2; // skip inserted
    }
  }
}
if (changed > 0) {
  fs.writeFileSync(bak, txt, 'utf8');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Inserted', changed, 'closing $$ LANGUAGE plpgsql; markers. Backup at', bak);
} else console.log('No insertions needed.');
