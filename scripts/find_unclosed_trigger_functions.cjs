#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const txt = fs.readFileSync(file, 'utf8');
const lines = txt.split(/\r?\n/);
const candidates = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/RETURNS\s+TRIGGER\s+AS\s+\$\$/.test(l)) {
    // look ahead for closing $$ within next 200 lines
    let found = false;
    let endLine = -1;
    for (let j = i+1; j < Math.min(lines.length, i+400); j++) {
      if (/^\s*\$\$/.test(lines[j])) {
        // check if this $$ line contains LANGUAGE or next line does
        const rest = lines[j].trim();
        if (/\$\$.*LANGUAGE|\$\$\s*$/.test(rest)) {
          found = true; endLine = j; break;
        }
        // also check next few lines
        if (j+1 < lines.length && /LANGUAGE\s+plpgsql/i.test(lines[j+1])) { found = true; endLine = j+1; break; }
      }
    }
    // also check for END; before closing
    let hasEnd = false;
    for (let k = i+1; k < Math.min(lines.length, i+400); k++) {
      if (/\bEND;\b/.test(lines[k])) { hasEnd = true; break; }
    }
    if (!found || !hasEnd) {
      candidates.push({start:i+1, preview: lines.slice(i, Math.min(lines.length, i+30)).join('\n'), hasEnd, found});
    }
  }
}
if (candidates.length === 0) {
  console.log('No problematic trigger function blocks detected.');
  process.exit(0);
}
console.log('Detected', candidates.length, 'candidate trigger function blocks that may be incomplete:');
for (const c of candidates) {
  console.log('---');
  console.log('At approx line', c.start, 'hasEnd:', c.hasEnd, 'hasClosingTag:', c.found);
  console.log(c.preview);
}
process.exit(0);
