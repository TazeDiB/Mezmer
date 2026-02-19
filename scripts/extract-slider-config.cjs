const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const content = fs.readFileSync(p, 'utf8');
const lines = content.split('\n');

let startSt = -1, endSt = -1, startMx = -1, endVa = -1, endDc = -1, endHi = -1, endBi = -1, endJ0 = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('St = {')) startSt = i;
  if (startSt >= 0 && endSt < 0 && lines[i].trim() === '},' && lines[i + 1]?.includes('Mx = [')) endSt = i;
  if (lines[i].includes('Mx = [')) startMx = i;
  if (lines[i].includes('Va = [')) endVa = i;
  if (lines[i].includes('Dc = [')) endDc = i;
  if (lines[i].includes('hi = {')) endHi = i;
  if (lines[i].includes('Bi = [')) endBi = i;
  if (lines[i].includes('j0 = [')) endJ0 = i;
}

const stBlock = lines.slice(startSt, endSt + 1).join('\n')
  .replace(/^\s*St = /, '')
  .replace(/\s*},\s*$/, '}');

const out = `/**
 * Slider/param config and mode constants (extracted from legacy bundle).
 */
export const SLIDER_CONFIG = ${stBlock};

export const PATTERN_TYPES_LIST = ["invisible", "wovenGrid", "hyperTuring", "hyperVoronoi", "spiralArms", "reactionDiff", "hyperFlow", "cubeGrid"];
export const PATTERN_TYPE_OPTIONS_LIST = ["invisible", ...PATTERN_TYPES_LIST.filter(t => t !== "invisible")];
export const GLOBAL_PARAM_KEYS = ["feedbackMix", "globalTimeScale", "globalDistortionScale", "uvScale", "globalAudioSensitivity", "blendSpeedFactor", "pixelationFactor", "rainbowAnimationSpeed", "asciiCharSize"];
export const VISUAL_MODES = ["normal", "glow", "edgeDetect", "pixelate", "moire", "cartoon", "hashGrid", "ascii"];
export const VISUAL_MODE_INDEX = {
    normal: 0,
    glow: 1,
    edgeDetect: 2,
    pixelate: 3,
    moire: 4,
    cartoon: 5,
    hashGrid: 6,
    ascii: 7,
    stainedGlass: 8
};
export const COLOR_MODES = ["rainbow", "fire", "ice", "monochrome", "audioRGB", "spectrum", "reactivePulse", "velocity"];
export const AUDIO_COLOR_MODES_LIST = ["audioRGB", "spectrum", "reactivePulse"];
`;

const outPath = path.join(__dirname, '..', 'src', 'constants', 'sliderConfig.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
process.exit(0);
