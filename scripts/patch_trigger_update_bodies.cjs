#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const bak = file + '.bak';
const txt = fs.readFileSync(file, 'utf8');
const lines = txt.split(/\r?\n/);
let changed = 0;
let i = 0;
while (i < lines.length) {
  const l = lines[i];
  if (/RETURNS\s+TRIGGER\s+AS\s+\$\$/.test(l)) {
    // find next closing $$ line index
    let j = i+1;
    let closing = -1;
    while (j < lines.length) {
      if (/^\s*\$\$/.test(lines[j])) { closing = j; break; }
      j++;
    }
    if (closing === -1) { i++; continue; }
    const body = lines.slice(i+1, closing).join('\n');
    const hasReturn = /\bRETURN\b/i.test(body);
    const hasEnd = /\bEND;\b/.test(body);
    const hasNewUpdated = /NEW\.updated_at/.test(body);
    const hasDeclare = /\bDECLARE\b/.test(body);
    if (hasNewUpdated && !hasReturn && !hasEnd && !hasDeclare) {
      // Replace the body between i and closing with canonical body
      const canonical = [
        "BEGIN",
        "  NEW.updated_at = NOW();",
        "  RETURN NEW;",
        "END;"
      ];
      const before = lines.slice(0, i+1);
      const after = lines.slice(closing);
      // insert canonical then keep the closing $$ and possible LANGUAGE line if present
      // we will ensure closing $$ and LANGUAGE plpgsql exists: if after[0] already is $$ LANGUAGE... keep it
      // replace body
      const newLines = before.concat(canonical).concat(after);
      fs.writeFileSync(bak, txt, 'utf8');
      fs.writeFileSync(file, newLines.join('\n'), 'utf8');
      console.log('Patched trigger function at approx line', i+1);
      changed++;
      break; // restart because indices changed
    }
    i = closing + 1;
    continue;
  }
  i++;
}
if (changed === 0) console.log('No simple update-trigger bodies needed patching.');
else console.log('Patched', changed, 'function(s). Backup at', bak);
