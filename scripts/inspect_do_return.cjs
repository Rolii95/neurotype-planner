#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname,'..','supabase','migrations','20251120_all_migrations_gap_fix.sql');
const sql = fs.readFileSync(file,'utf8');
function splitSqlStatements(sqlText) {
  const stmts = [];
  let i = 0;
  let start = 0;
  let dollarTag = null;
  let inSingle = false;
  let inDouble = false;
  while (i < sqlText.length) {
    const ch = sqlText[i];
    if (!inSingle && !inDouble && ch === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sqlText.substring(i));
      if (m) {
        const tag = m[0];
        if (dollarTag === null) { dollarTag = tag; i += tag.length; continue; }
        if (dollarTag === tag) { dollarTag = null; i += tag.length; continue; }
      }
    }
    if (!dollarTag) {
      if (ch === "'") { inSingle = !inSingle; }
      else if (ch === '"') { inDouble = !inDouble; }
      else if (!inSingle && !inDouble && ch === ';') {
        const stmt = sqlText.substring(start, i+1).trim();
        if (stmt && !stmt.startsWith('--')) stmts.push(stmt);
        start = i+1;
      }
    }
    i++;
  }
  const tail = sqlText.substring(start).trim(); if (tail) stmts.push(tail);
  return stmts;
}

let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g,'\n');
cleaned = cleaned.replace(/--.*$/gm,'\n');
const stmts = splitSqlStatements(cleaned);
console.log('Parsed', stmts.length, 'statements');
let found = 0;
for (let idx=0; idx<stmts.length; idx++){
  const s = stmts[idx];
  const trimmed = s.trimStart();
  if (/^DO\s+\$\$/i.test(trimmed) && trimmed.includes('RETURN NEW')){
    found++;
    console.log('----');
    console.log('Statement', idx+1);
    console.log(s.split('\n').slice(0,40).join('\n'));
  }
}
if(found===0) console.log('No DO blocks with RETURN NEW found');
else console.log('Found',found,'problematic DO block(s)');
