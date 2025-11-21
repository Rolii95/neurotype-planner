const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const p = path.resolve(process.cwd(), file);
const bak = p + '.removesemicolon.backup';
console.log('Reading', p);
let s = fs.readFileSync(p, 'utf8');
fs.writeFileSync(bak, s);
console.log('Backup written to', bak);
// Remove occurrences of a lone semicolon line immediately following an END $$; line
const before = "END $$;\n;\n";
if (s.indexOf(before) !== -1) {
  s = s.replace(before, "END $$;\n");
  fs.writeFileSync(p, s);
  console.log('Removed lone semicolon after END $$; (first occurrence).');
  process.exit(0);
}
// Try more flexible pattern: END $$; followed by optional whitespace and a line with only ;
const regex = /(END \$\$;\s*\n)\s*;\s*\n/;
if (regex.test(s)) {
  s = s.replace(regex, '$1');
  fs.writeFileSync(p, s);
  console.log('Removed lone semicolon after END $$; (regex match).');
  process.exit(0);
}
console.log('No matching stray semicolon pattern found.');
process.exit(2);
