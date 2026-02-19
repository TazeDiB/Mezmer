const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const lines = fs.readFileSync(p, 'utf8').split('\n');
let startIdx = -1, endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('St = {')) startIdx = i;
  if (startIdx >= 0 && endIdx < 0 && lines[i].includes('j0 = ["audioRGB"')) endIdx = i;
}
if (startIdx < 0 || endIdx < 0) {
  console.error('Markers not found', { startIdx, endIdx });
  process.exit(1);
}
const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const newContent = before.join('\n') + '\n    vs = Mx,\n    ' + after.join('\n');
fs.writeFileSync(p, newContent, 'utf8');
console.log('Removed St through j0 block, added vs = Mx');
process.exit(0);
