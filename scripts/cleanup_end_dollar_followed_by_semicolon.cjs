const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const p = path.resolve(process.cwd(), file);
let s = fs.readFileSync(p, 'utf8');
const bak = p + '.cleanup_endsemicolons.backup';
fs.writeFileSync(bak, s);
const lines = s.split(/\r?\n/);
let removed = 0;
for (let i = 0; i < lines.length-1; i++){
  if (lines[i].trim() === 'END $$;' && lines[i+1].trim() === ';'){
    lines.splice(i+1,1); removed++;
  }
}
if (removed>0){
  fs.writeFileSync(p, lines.join('\n'));
  console.log('Removed', removed, "lone ';' lines immediately following 'END $$;'. Backup at:", bak);
  process.exit(0);
}
console.log('No occurrences found.');
process.exit(2);
