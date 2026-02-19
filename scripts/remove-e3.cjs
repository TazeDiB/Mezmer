const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
let content = fs.readFileSync(p, 'utf8');
const lines = content.split('\n');

let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('e3 = (t, e = 256, n = null) => {')) startIdx = i;
  if (startIdx >= 0 && endIdx < 0 && lines[i].includes('inputStream: n') && lines[i + 1]?.trim() === '}' && lines[i + 2]?.trim() === '},') {
    endIdx = i + 2;
    break;
  }
}
if (startIdx < 0 || endIdx < 0) {
  console.error('Could not find e3 block', { startIdx, endIdx });
  process.exit(1);
}

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const newLines = before.concat(after);
const newContent = newLines.join('\n');

const fixed = newContent.replace('const JL = rt.memo(QL),', 'const JL = rt.memo(QL);');
fs.writeFileSync(p, fixed, 'utf8');
console.log('Removed e3 function from line', startIdx + 1, 'to', endIdx + 1);
process.exit(0);
