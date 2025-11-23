#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fp = process.argv[2] || path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
if (!fs.existsSync(fp)) { console.error('File not found:', fp); process.exit(2); }
const original = fs.readFileSync(fp, 'utf8');
const backup = fp + `.dedup_enums.bak-${new Date().toISOString().replace(/[:.]/g,'-')}`;
fs.writeFileSync(backup, original, 'utf8');
console.log('Backup created:', backup);
let modified = original;
const enumRegex = /CREATE\s+TYPE\s+([A-Za-z0-9_]+)\s+AS\s+ENUM\s*\(([^;]*?)\);/gims;
let match;
let changes = 0;
while ((match = enumRegex.exec(original)) !== null) {
  const full = match[0];
  const name = match[1];
  const body = match[2];
  const lower = name.toLowerCase();
  // Check if this exact block is already guarded nearby in the original
  const before = original.slice(Math.max(0, match.index-200), match.index + full.length + 200);
  if (/IF NOT EXISTS\s*\(\s*SELECT 1 FROM pg_type\s+WHERE\s+typname\s*=\s*'"?\s*${lower}\s*"?'\s*\)/i.test(before)) {
    continue; // already guarded
  }
  // Compose guarded block
  const guarded = `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${lower}') THEN\n    ${full}\n  END IF;\nEND $$;`;
  // Replace only the first occurrence in modified (to keep indices in sync)
  const idx = modified.indexOf(full);
  if (idx !== -1) {
    modified = modified.slice(0, idx) + guarded + modified.slice(idx + full.length);
    changes++;
  }
}
if (changes === 0) {
  console.log('No enum blocks wrapped (no duplicates or already guarded).');
  process.exit(0);
}
fs.writeFileSync(fp, modified, 'utf8');
console.log('Wrapped', changes, 'CREATE TYPE enum blocks with idempotent guards. Wrote file:', fp);
process.exit(0);
