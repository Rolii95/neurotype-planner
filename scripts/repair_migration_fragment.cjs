const fs = require('fs');
const path = require('path');

const MIG = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const BAK = MIG + '.repair.backup';

console.log('Reading', MIG);
let s = fs.readFileSync(MIG, 'utf8');
fs.writeFileSync(BAK, s, 'utf8');
console.log('Backup written to', BAK);

// Conservative repair: locate the corrupted pattern around the step_executions table.
// Replace the interleaved DO block starting at 'started_at TIMESTDO $$' up to the following 'END$$;' with a correct column.

const pattern = /started_at\s+TIMESTDO\s+\$\$[\s\S]*?END\$\$;\s*ULT\s+NOW\(\),/m;
if (pattern.test(s)) {
  s = s.replace(pattern, "started_at TIMESTAMPTZ NOT NULL,");
  console.log('Applied replacement for corrupted started_at + DO block.');
} else {
  console.log('Pattern not found; trying alternate weaker match...');
  const alt = /started_at\s+TIMESTDO\s+\$\$[\s\S]*?END\$\$;\s*/m;
  if (alt.test(s)) {
    s = s.replace(alt, "started_at TIMESTAMPTZ NOT NULL,\n");
    console.log('Applied alternate replacement.');
  } else {
    console.log('Alternate pattern not found. Will not modify file.');
    process.exit(2);
  }
}

// Also remove any duplicate stray double-semicolon right before enum/CREATE TYPE blocks like '\nEND$$; ;\nCREATE TYPE'
s = s.replace(/END\$\$;\s*;\s*(CREATE TYPE)/g, 'END$$;\n$1');

fs.writeFileSync(MIG, s, 'utf8');
console.log('Wrote repaired migration file.');
console.log('Done. Please run the applier/dry-run to verify.');
