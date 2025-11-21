#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(process.cwd(), 'supabase/migrations/20251120_all_migrations_gap_fix.sql');
const backupPath = filePath + '.doblock.bak';
if(!fs.existsSync(filePath)){ console.error('Migration file not found'); process.exit(2); }
fs.copyFileSync(filePath, backupPath);
console.log('Backup written to', backupPath);
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
let changed = false;

function isTopLevel(line){
  return /^\s*(CREATE\s+TRIGGER|CREATE\s+OR\s+REPLACE\s+FUNCTION|CREATE\s+POLICY|GRANT\b|DO\s+\$|--\s+Generated delta|DROP\s+TRIGGER|DROP\s+FUNCTION|CREATE\s+EXTENSION)\b/i.test(line);
}

for(let i=0;i<lines.length;i++){
  const m = lines[i].match(/^\s*DO\s+(\$[^\$]*\$)/i);
  if(!m) continue;
  const tag = m[1];
  // search for tag in following 2000 lines
  let found=false; let tagLine=-1;
  for(let j=i+1;j<Math.min(lines.length, i+2000); j++){
    if(lines[j].indexOf(tag) !== -1){ found=true; tagLine=j; break; }
  }
  if(found) continue;
  // find next top-level
  let nextTop = -1;
  for(let j=i+1;j<Math.min(lines.length, i+2000); j++){
    if(isTopLevel(lines[j])){ nextTop=j; break; }
  }
  if(nextTop === -1) nextTop = lines.length;
  // insert conservative closer: END<tag>;
  const insertAt = nextTop;
  const insertion = [`END${tag};`];
  lines.splice(insertAt,0,...insertion);
  changed = true;
  console.log(`Inserted DO closer ${tag} before line ${insertAt+1}`);
  i = insertAt + insertion.length;
}

if(changed){ fs.writeFileSync(filePath, lines.join('\n'),'utf8'); console.log('File updated'); } else { console.log('No DO blocks needed closing'); }
