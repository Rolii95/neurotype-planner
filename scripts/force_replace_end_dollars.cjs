const fs = require('fs');
const path = require('path');
const fileRel = 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const absPath = path.resolve(process.cwd(), fileRel);
if (!fs.existsSync(absPath)) { console.error('Missing file', absPath); process.exit(2); }
const content = fs.readFileSync(absPath, 'utf8');
const backup = absPath + '.forcereplace.' + new Date().toISOString().replace(/[:.]/g,'-') + '.backup';
fs.writeFileSync(backup, content, 'utf8');
console.log('Backup written to', backup);
const replaced = content.split('END $;').join('END $$;');
fs.writeFileSync(absPath, replaced, 'utf8');
console.log('Done.');
