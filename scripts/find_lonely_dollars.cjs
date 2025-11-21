const fs=require('fs');
const p=process.argv[2]||'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const s=fs.readFileSync(p,'utf8').split('\n');
for(let i=0;i<s.length;i++){
  if(s[i].includes('$$')){
    const prev = s.slice(Math.max(0,i-3), i);
    const hasEnd = prev.some(l=>/\bEND\b/i.test(l));
    if(!hasEnd){
      console.log('Line',i+1, JSON.stringify(s[i]));
    }
  }
}
