const fs=require('fs');
const p=process.argv[2]||'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const bkp=p+'.pairanon.bak';
const txt=fs.readFileSync(p,'utf8');
fs.writeFileSync(bkp,txt);
let idx=0;
const parts=txt.split('$$');
if(parts.length<=1){console.log('No anonymous $$ found.'); process.exit(0)}
let out='';
for(let i=0;i<parts.length;i++){
  out+=parts[i];
  if(i<parts.length-1){
    idx++;
    if(idx%2===1){
      // opening -> assign tag
      const tagName='$anon_'+Math.floor(idx/2+1)+'$';
      out+=tagName;
    } else {
      // closing -> use same tag as previous opening
      const tagName='$anon_'+Math.floor((idx-1)/2+1)+'$';
      out+=tagName;
    }
  }
}
fs.writeFileSync(p,out,'utf8');
console.log('Rewrote file with paired anonymous tags. Backup at',bkp);
