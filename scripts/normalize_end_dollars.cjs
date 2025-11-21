#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function ts() { return new Date().toISOString().replace(/[:.]/g, '-'); }
if (process.argv.length < 2) {
  console.error('Usage: node scripts/normalize_end_dollars.cjs');
  process.exit(2);
}
const fileRel = 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const absPath = path.resolve(process.cwd(), fileRel);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(3);
}
const original = fs.readFileSync(absPath, 'utf8');
const backup = absPath + '.normalize.' + ts() + '.backup';
fs.writeFileSync(backup, original, 'utf8');
console.log('Backup written to', backup);

let repaired = original;
// Insert space between END and $$ when they are adjacent (fixes END$$; -> END $$;)
repaired = repaired.replace(/END\$\$;/g, 'END $$;');
// Remove stray double-semicolon lines that sometimes follow a $$; closing (e.g. $$; ; )
repaired = repaired.replace(/\$\$;\s*;\s*/g, '$$;\n');

fs.writeFileSync(absPath, repaired, 'utf8');
console.log('Normalized END$$; occurrences and stray semicolons.');
process.exit(0);
