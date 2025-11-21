#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function ts() { return new Date().toISOString().replace(/[:.]/g, '-'); }
const fileRel = 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const absPath = path.resolve(process.cwd(), fileRel);
if (!fs.existsSync(absPath)) {
  console.error('File not found:', absPath);
  process.exit(2);
}
const original = fs.readFileSync(absPath, 'utf8');
const backup = absPath + '.fixsingle.' + ts() + '.backup';
fs.writeFileSync(backup, original, 'utf8');
console.log('Backup written to', backup);


let repaired = original;
// Fix accidental single-dollar closers like 'END $;' -> 'END $$;'
repaired = repaired.replace(/END\s+\$;/gi, 'END $$;');
repaired = repaired.replace(/end\s+\$;/gi, 'end $$;');

// Also normalize accidental 'END; $;' -> 'END; $$;'
repaired = repaired.replace(/END;\s+\$;/gi, 'END; $$;');
repaired = repaired.replace(/end;\s+\$;/gi, 'end; $$;');

fs.writeFileSync(absPath, repaired, 'utf8');
console.log('Replaced single-dollar closers with double-dollar closers.');
process.exit(0);
