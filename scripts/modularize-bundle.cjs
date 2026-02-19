/**
 * Converts public/recovered-app.js to an ES module that:
 * - Imports React and jsx from npm (removes inlined React + jsx runtime)
 * - Imports createRoot from react-dom/client (removes inlined ReactDOM)
 * - Exports the root component as App (removes bootstrap)
 *
 * Run from repo root: node scripts/modularize-bundle.cjs
 */

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'public', 'recovered-app.js');
let content = fs.readFileSync(bundlePath, 'utf8');
const lines = content.split('\n');

// Find key line indices (0-based)
let startReact, endReact, startReactDOM, endReactDOM, bootstrapStart, bootstrapEnd;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('var X0 = {')) startReact = i;
  if (startReact != null && endReact == null && line.includes('var ne = X0.exports,')) endReact = i;
  if (line.trim() === 'fd = {},') startReactDOM = i;
  if (startReactDOM != null && endReactDOM == null && line.includes('fd.createRoot = Xg.createRoot')) endReactDOM = i;
  if (line.includes('const h3 = fd.createRoot(document.getElementById("root"))')) bootstrapStart = i;
  if (bootstrapStart != null && line.includes('children: ne.jsx(d3, {})')) bootstrapEnd = i;
}

if ([startReact, endReact, startReactDOM, endReactDOM, bootstrapStart, bootstrapEnd].some((x) => x == null)) {
  console.error('Could not find all markers.', { startReact, endReact, startReactDOM, endReactDOM, bootstrapStart, bootstrapEnd });
  process.exit(1);
}

// Build new content: keep everything before React, skip React + ReactDOM, keep app code, export App
const beforeReact = lines.slice(0, startReact).join('\n');
const afterReactDOM = lines.slice(endReactDOM + 1, bootstrapStart).join('\n');

const preamble = `import React from 'react';
import { jsx } from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';

const P = React;
const rt = React;
const ne = jsx;
const pt = React;
const fd = { createRoot, hydrateRoot: () => {} };
`;

const newContent =
  beforeReact +
  '\n' +
  preamble +
  '\n' +
  afterReactDOM +
  '\n' +
  'export { d3 as App };\n';

fs.writeFileSync(bundlePath, newContent, 'utf8');
console.log('Modularized recovered-app.js: added React/jsx/createRoot imports, removed inlined libs, exported App.');
console.log('Removed lines: React', endReact - startReact + 1, ', ReactDOM', endReactDOM - startReactDOM + 1, ', bootstrap', bootstrapEnd - bootstrapStart + 1);
console.log('New length:', newContent.split('\n').length, 'lines');
console.log('You can now import { App } from the bundle in src/main.jsx.');
process.exit(0);
