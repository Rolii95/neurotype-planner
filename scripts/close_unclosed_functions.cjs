#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'supabase/migrations/20251120_all_migrations_gap_fix.sql');
const backupPath = filePath + '.closerfix.bak';
if (!fs.existsSync(filePath)) {
  console.error('Migration file not found:', filePath);
  process.exit(2);
}
fs.copyFileSync(filePath, backupPath);
console.log('Backup written to', backupPath);

let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let changed = false;

function isTopLevel(line){
  return /^\s*(CREATE\s+TRIGGER|GRANT\b|CREATE\s+OR\s+REPLACE\s+FUNCTION|DO\s+\$|--\s+Generated delta|DROP\s+TRIGGER|DROP\s+FUNCTION)/i.test(line);
}

for(let i=0;i<lines.length;i++){
  const m = lines[i].match(/RETURNS\s+TRIGGER\s+AS\s+(\$[^\$]*\$|\$\$)/i);
  if(!m) continue;
  const openerTag = m[1];
  // find next top-level line after opener
  let nextTop = -1;
  for(let j=i+1;j<lines.length;j++){
    if(isTopLevel(lines[j])){ nextTop = j; break; }
  }
  if(nextTop === -1) nextTop = lines.length; // EOF

  // search for closer between i and nextTop
  let foundCloser = false;
  if(openerTag === '$$'){
    for(let k=i+1;k<nextTop;k++){
      if(/\$\$\s+LANGUAGE\s+plpgsql/i.test(lines[k]) || /^\s*\$\$\s*;\s*$/.test(lines[k])){ foundCloser = true; break; }
    }
  } else {
    const esc = openerTag.replace(/\$/g,'\\$');
    const rx = new RegExp(esc);
    for(let k=i+1;k<nextTop;k++){
      if(rx.test(lines[k])){ foundCloser = true; break; }
    }
  }

  if(!foundCloser){
    // conservative insertion: before nextTop, add RETURN NEW; END; <openerTag> LANGUAGE plpgsql;
    const insertAt = nextTop;
    const insertLines = ['  RETURN NEW;','END;', `${openerTag} LANGUAGE plpgsql;`];
    lines.splice(insertAt,0,...insertLines);
    changed = true;
    console.log(`Inserted closer for function opened at line ${i+1} before line ${insertAt+1}`);
    // advance i past inserted lines to avoid reprocessing
    i = insertAt + insertLines.length;
  }
}

if(changed){
  fs.writeFileSync(filePath, lines.join('\n'),'utf8');
  console.log('File updated. Please run your validator/dry-run again.');
} else {
  console.log('No changes necessary.');
}

process.exit(changed?0:0);
