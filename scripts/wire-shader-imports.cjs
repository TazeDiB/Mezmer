const fs = require('fs');
const file = 'src/hooks/useWebGL.js';
let content = fs.readFileSync(file, 'utf8');
const start = content.indexOf('var yL = ');
const end = content.indexOf('const ld = {');
if (start === -1 || end === -1) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const header = content.slice(0, start);
const tail = content.slice(end);
const replacement = `import mainVert from '../shaders/main.vert?raw';
import mainFrag from '../shaders/main.frag?raw';
import blendFrag from '../shaders/blend.frag?raw';

const yL = mainVert,
    SL = mainFrag,
    xL = mainVert,
    ML = blendFrag;

`;
fs.writeFileSync(file, header + replacement + tail);
console.log('Done: wired shader file imports');
