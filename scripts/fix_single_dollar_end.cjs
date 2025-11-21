const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const p = path.resolve(process.cwd(), file);
const bak = p + '.fixsingle.end.backup';
console.log('Reading', p);
let s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(bak, s);
console.log('Backup written to', bak);
const regex = /END\s*\$\s*;/g;
const matches = s.match(regex);
console.log('Found', matches ? matches.length : 0, 'occurrences of "END $;"');
if (matches && matches.length>0) {
  s = s.replace(regex, 'END $$;');
  fs.writeFileSync(p, s);
  console.log('Replaced occurrences with "END $$;"');
  process.exit(0);
}
console.log('No matches to replace.');
process.exit(2);
