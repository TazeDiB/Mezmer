/**
 * Pattern type identifiers (single source of truth).
 */

export const PATTERN_TYPES = [
  'invisible',
  'wovenGrid',
  'hyperTuring',
  'hyperVoronoi',
  'spiralArms',
  'reactionDiff',
  'hyperFlow',
  'cubeGrid',
  'kaleidoWave',
  'crystal',
  'plasma',
  'aurora',
  'inkDrop',
  'stainedGlass',
  'morph',
  'prism',
  'fractal',
  'lissajous',
];

export const PATTERN_TYPE_OPTIONS = [
  'invisible',
  ...PATTERN_TYPES.filter((t) => t !== 'invisible'),
];
