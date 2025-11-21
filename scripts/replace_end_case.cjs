const fs = require('fs');
const path = require('path');
const fileRel = 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const absPath = path.resolve(process.cwd(), fileRel);
if (!fs.existsSync(absPath)) { console.error('Missing file', absPath); process.exit(2); }
const content = fs.readFileSync(absPath, 'utf8');
const backup = absPath + '.casefix.' + new Date().toISOString().replace(/[:.]/g,'-') + '.backup';
fs.writeFileSync(backup, content, 'utf8');
console.log('Backup written to', backup);
const repaired = content.replace(/end\s+\$;/gi, 'END $$;');
fs.writeFileSync(absPath, repaired, 'utf8');
const countBefore = (content.match(/end\s+\$;/gi)||[]).length;
const countAfter = (repaired.match(/END \$\$;/g)||[]).length;
console.log('Replaced', countBefore, 'occurrences; now', countAfter, 'double-dollar closers present.');
