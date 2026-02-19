const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const lines = fs.readFileSync(p, 'utf8').split('\n');
let startQL = -1, endJL = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('function QL({')) startQL = i;
  if (startQL >= 0 && endJL < 0 && lines[i].includes('const JL = rt.memo(QL)')) endJL = i;
}
if (startQL < 0 || endJL < 0) {
  console.error('Markers not found', { startQL, endJL });
  process.exit(1);
}
const before = lines.slice(0, startQL);
const after = lines.slice(endJL + 1);
const newContent = before.join('\n') + '\nconst JL = Controls;\n' + after.join('\n');
fs.writeFileSync(p, newContent, 'utf8');
console.log('Removed QL and JL definition, added JL = Controls');
process.exit(0);
