const fs = require('fs');
const path = process.argv[2];
if(!path){console.error('Usage: node list_dollar_positions.cjs <file>'); process.exit(2)}
const s = fs.readFileSync(path,'utf8').split('\n');
let idx=0;
for(let i=0;i<s.length;i++){
  const line=s[i];
  let start=0;
  while(true){
    const pos=line.indexOf('$$', start);
    if(pos===-1) break;
    idx++;
    console.log(idx, i+1, JSON.stringify(line.trim()));
    start=pos+2;
  }
}
console.log('Total $$ occurrences:',idx);
