#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname,'..','supabase','migrations','20251120_all_migrations_gap_fix.sql');
const txt = fs.readFileSync(file,'utf8');
const lines = txt.split('\n');
const starts = [];
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('-- SIMPLE Demo User Creation')) starts.push(i+1);
}
console.log('Found SIMPLE starts at lines:', starts.join(', '));
const ranges = [];
for(let k=1;k<starts.length;k++){ // skip first
  const s = starts[k];
  let end = -1;
  for(let j=s;j<Math.min(lines.length,s+500);j++){
    if(lines[j].trim()==='END $$;' ) { end = j+1; break; }
  }
  if(end===-1){
    console.log('No END found after',s);
  } else {
    // include following semicolon-only line if present
    let after = end+1;
    if(after<=lines.length && lines[after-1].trim()===';') end = after;
    ranges.push({start:s, end});
  }
}
console.log('Ranges to remove (skip first):');
ranges.forEach(r=>console.log(r.start+'-'+r.end));
