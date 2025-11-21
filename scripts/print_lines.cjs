#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname,'..','supabase','migrations','20251120_all_migrations_gap_fix.sql');
const txt = fs.readFileSync(file,'utf8');
const lines = txt.split('\n');
const start = parseInt(process.argv[2]||29520,10);
const end = parseInt(process.argv[3]||29540,10);
for(let i=start;i<=end && i<=lines.length;i++){
  console.log((i).toString().padStart(6)+": "+lines[i-1]);
}
