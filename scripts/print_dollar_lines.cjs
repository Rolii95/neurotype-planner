const fs = require('fs');
const path = process.argv[2];
const start = parseInt(process.argv[3]||0,10);
const end = parseInt(process.argv[4]||1e9,10);
if(!path){console.error('Usage: node print_dollar_lines.cjs <file> [startLine] [endLine]'); process.exit(2)}
const s = fs.readFileSync(path,'utf8').split('\n');
for(let i=Math.max(0,start-1); i<Math.min(s.length,end); i++){
  if(s[i].includes('$$')) console.log((i+1)+': '+s[i]);
}
