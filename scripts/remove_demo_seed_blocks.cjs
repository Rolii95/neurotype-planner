const fs=require('fs');
const p=process.argv[2]||'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const bkp=p+'.removedemo.bak';
const s=fs.readFileSync(p,'utf8');
fs.writeFileSync(bkp,s);
const lines=s.split('\n');
let out=[];
let i=0;
while(i<lines.length){
  const l=lines[i];
  if(/demo@neurotypeplanner\.com/.test(lines.slice(i, i+40).join('\n'))){
    // if within next 200 lines there's a DO $...$
    let found=false; let start=-1; let end=-1;
    for(let j=Math.max(0,i-60); j<i+60 && j<lines.length; j++){
      if(/^\s*DO\s+\$/.test(lines[j])){ start=j; break }
    }
    if(start!==-1){
      for(let k=start+1;k<lines.length && k<start+400;k++){
        if(/^\s*END\s+\$/.test(lines[k])){ end=k; found=true; break }
      }
    }
    if(found && start!==-1 && end!==-1){
      // skip the block
      console.log('Removing demo block lines', start+1, 'to', end+1);
      i = end+1; continue;
    }
  }
  out.push(l); i++;
}
fs.writeFileSync(p,out.join('\n'),'utf8');
console.log('Removed demo seed blocks. Backup at',bkp);
