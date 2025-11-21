#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'supabase', 'migrations', '20251120_all_migrations_gap_fix.sql');
const txt = fs.readFileSync(file, 'utf8');
const re = /\$[A-Za-z0-9_]*\$/g;
let m; const tags=[];
while((m=re.exec(txt))!==null){
  const prefix = txt.slice(0,m.index);
  const line = prefix.split('\n').length;
  tags.push({tag:m[0], index:m.index, line});
}
console.log(`Found ${tags.length} dollar-tags`);
const stack=[];
for(const t of tags){
  if(stack.length===0 || stack[stack.length-1].tag!==t.tag){
    stack.push(t);
    console.log(`PUSH  ${t.tag} (line ${t.line})`);
  } else {
    const popped = stack.pop();
    console.log(`POP   ${t.tag} (line ${t.line}) matched with line ${popped.line}`);
  }
}
if(stack.length>0){
  console.log('\nUNMATCHED TAGS:');
  for(const s of stack) console.log(`${s.tag} at line ${s.line}`);
} else {
  console.log('\nAll tags matched');
}
