const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const p = path.resolve(process.cwd(), file);
const bak = p + '.forcereplace.end.backup';
console.log('Reading', p);
let s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(bak, s);
console.log('Backup written to', bak);
let count = 0;
let idx = s.indexOf('END $;');
while (idx !== -1) {
  s = s.slice(0, idx) + 'END $$;' + s.slice(idx + 'END $;'.length);
  count++;
  idx = s.indexOf('END $;', idx + 'END $$;'.length);
}
if (count > 0) {
  fs.writeFileSync(p, s);
  console.log('Replaced', count, 'occurrences of "END $;"');
  process.exit(0);
}
console.log('No occurrences found.');
process.exit(2);
