const fs = require('fs');
const path = require('path');

const file = 'd:/Taze/Programming/mezmer-dev/src/hooks/useWebGL.js';
let content = fs.readFileSync(file, 'utf8');

// The original file has:
// var yL = `...`,
//     SL = `...`,
//     xL = `...`,
//     ML = `...`;

const yLMatch = content.match(/var yL = `([\s\S]*?)`,/);
const SLMatch = content.match(/SL = `([\s\S]*?)`,/);
const xLMatch = content.match(/xL = `([\s\S]*?)`,/);
const MLMatch = content.match(/ML = `([\s\S]*?)`;/);

if (!yLMatch || !SLMatch || !xLMatch || !MLMatch) {
  console.error("Could not find all shader strings.");
  process.exit(1);
}

const dir = 'd:/Taze/Programming/mezmer-dev/src/shaders';
fs.mkdirSync(dir, { recursive: true });

// Note: writing back with \n instead of mixed line endings to be clean, but just passing the exact match string is safest. 
// We will replace \r\n with \n to normalize it, and remove trailing \r from the string literals
fs.writeFileSync(path.join(dir, 'main.vert'), yLMatch[1].replace(/\\r/g, '').replace(/\r/g, ''));
fs.writeFileSync(path.join(dir, 'main.frag'), SLMatch[1].replace(/\\r/g, '').replace(/\r/g, ''));
fs.writeFileSync(path.join(dir, 'blend.frag'), MLMatch[1].replace(/\\r/g, '').replace(/\r/g, ''));

let newContent = `import mainVert from '../shaders/main.vert?raw';
import mainFrag from '../shaders/main.frag?raw';
import blendFrag from '../shaders/blend.frag?raw';\n` + content;

const fullMatch = content.match(/var yL = `[\s\S]*?ML = `[\s\S]*?`;/);
if (fullMatch) {
  const replacement = `var yL = mainVert,
    SL = mainFrag,
    xL = mainVert,
    ML = blendFrag;`;
  newContent = newContent.replace(fullMatch[0], replacement);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("Success");
} else {
  console.error("Could not find full declaration block.");
  process.exit(1);
}
