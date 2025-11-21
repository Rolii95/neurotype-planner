#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'supabase/migrations/20251120_all_migrations_gap_fix.sql');
const backupPath = filePath + '.autofix.bak';
if (!fs.existsSync(filePath)) {
  console.error('Migration file not found:', filePath);
  process.exit(2);
}
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log('Backup written to', backupPath);
} else {
  console.log('Backup already exists at', backupPath);
}

let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let changed = false;

for (let i = 0; i < lines.length; i++) {
  const openMatch = lines[i].match(/RETURNS\s+TRIGGER\s+AS\s+(\$[\w\d_]*\$)/i);
  if (!openMatch) continue;
  const openTag = openMatch[1];
  // scan forward for LANGUAGE plpgsql or closing tag
  let foundLangIdx = -1;
  let foundTriggerIdx = -1;
  for (let j = i + 1; j < Math.min(lines.length, i + 5000); j++) {
    if (/^\s*CREATE\s+TRIGGER\b/i.test(lines[j])) { foundTriggerIdx = j; break; }
    if (/LANGUAGE\s+plpgsql/i.test(lines[j])) { foundLangIdx = j; break; }
    // also consider line that is exactly a closing tag like "$anon$;"
    if (lines[j].trim().match(/^\$[\w\d_]*\$\s*;$/)) { foundLangIdx = j; break; }
  }

  if (foundLangIdx !== -1) {
    // ensure the tag before LANGUAGE (or the closing tag line) matches openTag
    const langLine = lines[foundLangIdx];
    const tagMatch = langLine.match(/(\$[\w\d_]*\$)/);
    if (tagMatch) {
      const closeTag = tagMatch[1];
      if (closeTag !== openTag) {
        // replace closeTag with openTag in this line
        lines[foundLangIdx] = langLine.replace(closeTag, openTag);
        changed = true;
        console.log(`Rewrote closer tag at line ${foundLangIdx+1}: ${closeTag} -> ${openTag}`);
      }
    } else {
      // no tag on language line (unlikely) - insert a new closing tag line before it
      lines.splice(foundLangIdx, 0, `${openTag} LANGUAGE plpgsql;`);
      changed = true;
      console.log(`Inserted missing closer with LANGUAGE at line ${foundLangIdx+1}`);
    }
    // also ensure there's a 'RETURN NEW;' and 'END;' before the closing tag
    // look backwards from foundLangIdx to find END; or RETURN
    let hasEnd = false;
    let hasReturn = false;
    for (let k = i+1; k < foundLangIdx; k++) {
      if (/\bEND\s*;\s*$/i.test(lines[k])) hasEnd = true;
      if (/RETURN\s+NEW\s*;?/i.test(lines[k])) hasReturn = true;
    }
    const insertAt = foundLangIdx;
    const toInsert = [];
    if (!hasReturn) { toInsert.push('  RETURN NEW;'); }
    if (!hasEnd) { toInsert.push('END;'); }
    if (toInsert.length) {
      lines.splice(insertAt, 0, ...toInsert);
      changed = true;
      console.log(`Inserted missing lines before closer at approx ${insertAt+1}: ${toInsert.join(' | ')}`);
    }
  } else if (foundTriggerIdx !== -1) {
    // No language/closer found before next CREATE TRIGGER - insert closing block just before trigger
    const insertAt = foundTriggerIdx;
    const insertion = ['  RETURN NEW;', 'END;', `${openTag} LANGUAGE plpgsql;`];
    lines.splice(insertAt, 0, ...insertion);
    changed = true;
    console.log(`Inserted missing closer and RETURN/END before CREATE TRIGGER at line ${insertAt+1}`);
  } else {
    console.warn(`No closer or trigger found within 5000 lines for function opened at line ${i+1}`);
  }
  // advance i to skip past inserted/verified block
}

if (changed) {
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('File updated. Please run your validator/dry-run again.');
} else {
  console.log('No changes necessary.');
}

process.exit(changed ? 0 : 0);
