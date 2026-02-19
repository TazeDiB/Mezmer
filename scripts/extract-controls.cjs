const fs = require('fs');
const path = require('path');
const legacyPath = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const outPath = path.join(__dirname, '..', 'src', 'components', 'Controls.jsx');
const lines = fs.readFileSync(legacyPath, 'utf8').split('\n');

let startQL = -1, endQL = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('function QL({')) startQL = i;
  if (startQL >= 0 && endQL < 0 && lines[i].trim() === '}' && lines[i + 1]?.includes('const JL = rt.memo(QL)')) endQL = i;
}
if (startQL < 0 || endQL < 0) {
  console.error('QL boundaries not found', { startQL, endQL });
  process.exit(1);
}

let qlBody = lines.slice(startQL, endQL + 1).join('\n');
qlBody = qlBody.replace(/^function QL\(/, 'function Controls(');
qlBody = qlBody.replace(/\bP\.useState\b/g, 'useState');
qlBody = qlBody.replace(/\bP\.useCallback\b/g, 'useCallback');
qlBody = qlBody.replace(/\brt\.useMemo\b/g, 'useMemo');
qlBody = qlBody.replace(/\brt\.useCallback\b/g, 'useCallback');
const withImports = `/**
 * Controls panel: layers, audio, randomization, global settings, Joyride tour.
 * Extracted from legacy bundle.
 */
import React, { useCallback, useState, useMemo, memo } from 'react';
import Joyride from 'react-joyride';
import { TOOLTIP_COPY as cn, JOYRIDE_STEPS as ZL, AUDIO_REACTIVE_COLOR_MODES as W0 } from '../constants/joyrideSteps.js';
import { CONTROL_STYLES as Qe } from '../constants/controlStyles.js';

const ne = { jx: React.createElement, jsxs: React.createElement };
const Bb = Joyride;

` + qlBody + `

export default memo(Controls);
`;

fs.writeFileSync(outPath, withImports, 'utf8');
console.log('Wrote', outPath, '(lines', startQL + 1, '-', endQL + 1, ')');
process.exit(0);
