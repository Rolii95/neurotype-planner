#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const bak = file + '.preclosure.bak';
let txt = fs.readFileSync(file, 'utf8');
const lines = txt.split(/\r?\n/);
let changed = 0;
for (let i = 0; i < lines.length; i++) {
  if (/RETURNS\s+TRIGGER\s+AS\s+\$\$/.test(lines[i])) {
    // find next CREATE TRIGGER or next $$
    let j = i+1;
    let foundClosing = false;
    let foundTrigger = -1;
    while (j < Math.min(lines.length, i+200)) {
      if (/^\s*\$\$/.test(lines[j])) { foundClosing = true; break; }
      if (/^\s*CREATE\s+TRIGGER/i.test(lines[j])) { foundTrigger = j; break; }
      j++;
    }
    // if no closing found and a trigger is next and no END; present between i and trigger
    if (!foundClosing && foundTrigger !== -1) {
      let hasEnd = false;
      for (let k = i+1; k < foundTrigger; k++) { if (/\bEND;\b/.test(lines[k])) { hasEnd = true; break; } }
      if (!hasEnd) {
        // insert canonical body before foundTrigger
        const canonical = [
          'BEGIN',
          '  NEW.updated_at = NOW();',
          '  RETURN NEW;',
          'END;'
        ];
        const before = lines.slice(0, foundTrigger);
        const after = lines.slice(foundTrigger);
        const newLines = before.concat(canonical).concat(after);
        fs.writeFileSync(bak, txt, 'utf8');
        fs.writeFileSync(file, newLines.join('\n'), 'utf8');
        console.log('Inserted closure before CREATE TRIGGER at approx line', foundTrigger+1);
        changed++;
        // reload and restart scanning from top to avoid index issues
        txt = fs.readFileSync(file, 'utf8');
        const newArr = txt.split(/\r?\n/);
        // reset variables
        i = -1; // will become 0 after i++
        Object.assign(lines, newArr);
      }
    }
  }
}
if (changed === 0) console.log('No insertions needed.'); else console.log('Inserted', changed, 'closures. Backup at', bak);
