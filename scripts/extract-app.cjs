const fs = require('fs');
const path = require('path');
const legacyPath = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const outPath = path.join(__dirname, '..', 'src', 'App.jsx');
const lines = fs.readFileSync(legacyPath, 'utf8').split('\n');

let startD3 = -1;
let endD3 = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('function d3()')) startD3 = i;
  if (startD3 >= 0 && lines[i].trim() === '}' && lines[i + 1]?.includes('export { d3 as App')) {
    endD3 = i;
    break;
  }
}
if (startD3 < 0 || endD3 < 0) {
  console.error('d3 boundaries not found', { startD3, endD3 });
  process.exit(1);
}

let body = lines.slice(startD3, endD3 + 1).join('\n');
body = body.replace(/^function d3\(\)/, 'function App()');
body = body.replace(/\bP\./g, 'React.');
body = body.replace(/\brt\./g, 'React.');
body = body.replace(/\bne\.jsxs\(/g, 'jsxs(');
body = body.replace(/\bne\.jsx\(/g, 'jsx(');
body = body.replace(/\bqn\./g, 'EVENTS.');
body = body.replace(/\bft\./g, 'STATUS.');
body = body.replace(/\bPt\./g, 'ACTIONS.');
body = body.replace(/\bCL\b/g, 'WebGLCanvas');
body = body.replace(/\bJL\b/g, 'Controls');
// Remove inline mt block (we use imported DEFAULT_LAYER_PARAMS as mt)
body = body.replace(/\s*const mt = \{\s*\n[\s\S]*?layerSymmetryOffsetSpeed: 0\s*\n\s*\},\s*\n\s*\[Dt,/,
  '    [Dt,');

const header = `/**
 * App root: layout, WebGL canvas, controls panel, welcome/tour modal.
 * Extracted from legacy bundle.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { EVENTS, STATUS, ACTIONS } from 'react-joyride';
import { useAudio } from './hooks/useAudio.js';
import Controls from './components/Controls.jsx';
import { WebGLCanvas } from './legacy/recovered-app.js';
import {
  SLIDER_CONFIG as St,
  PATTERN_TYPES_LIST as Mx,
  PATTERN_TYPE_OPTIONS_LIST as cd,
  GLOBAL_PARAM_KEYS as Va,
  VISUAL_MODES as Dc,
  VISUAL_MODE_INDEX as hi,
  COLOR_MODES as Bi,
  AUDIO_COLOR_MODES_LIST as j0,
} from './constants/sliderConfig.js';
import { APP_STYLES as To } from './constants/controlStyles.js';
import { DEFAULT_LAYER_PARAMS as mt } from './constants/index.js';
import { lerp as ud, randomInRange as Rr, isElectron as f3 } from './lib/utils.js';

const l3 = 1e3;
const c3 = 2500;
const u3 = 2500;
const vs = Mx;

`;

const footer = `

export default App;
`;

const full = header + body + footer;
fs.writeFileSync(outPath, full, 'utf8');
console.log('Wrote', outPath, '(d3 lines', startD3 + 1, '-', endD3 + 1, ')');
process.exit(0);
