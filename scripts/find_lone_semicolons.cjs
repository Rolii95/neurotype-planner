const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'supabase/migrations/20251120_all_migrations_gap_fix.sql';
const s = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const lines = s.split(/\r?\n/);
const indices = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === ';') indices.push(i+1);
}
console.log('Found', indices.length, 'lines that contain only a semicolon. Showing first 20 with context:');
indices.slice(0,20).forEach((ln)=>{
  const start = Math.max(1, ln-3);
  const end = Math.min(lines.length, ln+3);
  console.log('--- line', ln, '---');
  for (let j = start; j <= end; j++) {
    console.log((j===ln?'>':' ')+(''+j).padStart(6), lines[j-1]);
  }
});
process.exit(0);
