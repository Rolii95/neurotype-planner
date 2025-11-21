#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(process.cwd(), 'supabase/migrations/20251120_all_migrations_gap_fix.sql');
const backupPath = filePath + '.quicklock.bak';
if (!fs.existsSync(filePath)) { console.error('Migration file not found'); process.exit(2); }
fs.copyFileSync(filePath, backupPath);
console.log('Backup written to', backupPath);
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let changed = false;

for (let i=0;i<lines.length;i++){
  if (/^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION\s+update_board_quick_lock_updated_at\(\)/i.test(lines[i])){
    // find RETURNS TRIGGER AS tag
    let tagLine = -1; let tag='';
    for(let j=i+1;j< i+10 && j<lines.length;j++){
      const m = lines[j].match(/RETURNS\s+TRIGGER\s+AS\s+(\$[^\$]*\$|\$\$)/i);
      if(m){ tagLine=j; tag=m[1]; break; }
    }
    if(tagLine === -1) continue;
    // scan forward up to 50 lines to find END; or closing tag or the privacy trigger
    let foundEnd=false; let foundCloser=false; let triggerIdx=-1;
    for(let k=tagLine+1;k< Math.min(lines.length, tagLine+60); k++){
      if (/^\s*END;/.test(lines[k])) foundEnd=true;
      if (lines[k].includes('LANGUAGE plpgsql') || lines[k].match(/^\s*\$[\w\d_]*\$\s*;$/)) foundCloser=true;
      if (lines[k].includes('CREATE TRIGGER trigger_update_board_privacy_settings_updated_at')){ triggerIdx=k; break; }
    }
    if(triggerIdx !== -1 && !(foundEnd && foundCloser)){
      // insert before triggerIdx
      const insertion = ['  RETURN NEW;','  END;', `  ${tag} LANGUAGE plpgsql;`];
      lines.splice(triggerIdx,0,...insertion);
      changed=true;
      console.log(`Inserted closer before trigger at line ${triggerIdx+1}`);
      i = triggerIdx + insertion.length;
    }
  }
}

if(changed){ fs.writeFileSync(filePath, lines.join('\n'),'utf8'); console.log('File updated'); } else { console.log('No changes necessary'); }
