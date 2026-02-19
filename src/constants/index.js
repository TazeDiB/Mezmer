/**
 * App-wide constants: pattern types, default layer config, and param metadata.
 */

export { JOYRIDE_STEPS, TOOLTIP_COPY, AUDIO_REACTIVE_COLOR_MODES } from './joyrideSteps.js';
export { SLIDER_CONFIG, GLOBAL_PARAM_KEYS, VISUAL_MODES, VISUAL_MODE_INDEX, COLOR_MODES } from './sliderConfig.js';
export { CONTROL_STYLES, CANVAS_STYLES, APP_STYLES } from './controlStyles.js';
export const PATTERN_TYPES = [
  'invisible',
  'wovenGrid',
  'hyperTuring',
  'hyperVoronoi',
  'spiralArms',
  'reactionDiff',
  'hyperFlow',
  'cubeGrid',
];

export const PATTERN_TYPE_OPTIONS = ['invisible', ...PATTERN_TYPES.filter((t) => t !== 'invisible')];

/** Which params each pattern type exposes in the UI */
export const PARAM_CONFIG = {
  invisible: [],
  wovenGrid: ['symmetry', 'distortion', 'layer2Freq', 'weaveThickness'],
  hyperTuring: [
    'symmetry',
    'distortion',
    'turingScale',
    'turingSpeed',
    'turingFeed',
    'turingKill',
    'turingDiffusionA',
    'turingDiffusionB',
  ],
  hyperVoronoi: ['symmetry', 'distortion', 'voronoiScale', 'voronoiEdgeWidth'],
  spiralArms: [
    'symmetry',
    'distortion',
    'spiralArms',
    'spiralTightness',
    'spiralNoiseScale',
    'spiralNoiseSpeed',
  ],
  reactionDiff: ['symmetry', 'distortion', 'rdComplexity', 'rdSpotSize'],
  hyperFlow: [
    'symmetry',
    'distortion',
    'flowSpeed',
    'flowComplexity',
    'flowCurl',
    'layerSymmetryOffsetSpeed',
  ],
  cubeGrid: [
    'symmetry',
    'distortion',
    'cubeSize',
    'cubeRotationSpeed',
    'layerSymmetryOffsetSpeed',
  ],
};

export const DEFAULT_LAYER_PARAMS = {
  isVisible: true,
  patternType: 'wovenGrid',
  blendTargetType: 'invisible',
  blendAmount: 0,
  colorMode: 'rainbow',
  symmetry: 1,
  distortion: 0,
  freq: 10,
  weaveThickness: 0.02,
  turingScale: 15,
  turingSpeed: 0.5,
  turingFeed: 0.035,
  turingKill: 0.065,
  turingDiffusionA: 1,
  turingDiffusionB: 0.5,
  voronoiScale: 5,
  voronoiEdgeWidth: 0.02,
  spiralArms: 5,
  spiralTightness: 0.5,
  spiralNoiseScale: 1,
  spiralNoiseSpeed: 0.1,
  rdComplexity: 0.5,
  rdSpotSize: 0.5,
  flowSpeed: 0.3,
  flowComplexity: 0.6,
  flowCurl: 0.4,
  audioSensitivity: 3,
  bassSensitivity: 1.5,
  midSensitivity: 1.5,
  highSensitivity: 1.5,
  cubeSize: 0.5,
  cubeRotationSpeed: 0.5,
  smoothSpiralSpeed: 0.8,
  smoothSpiralTightness: 2.5,
  smoothSpiralThickness: 0.3,
  layerSymmetryOffsetSpeed: 0,
};

export const DEFAULT_LAYERS = {
  layer1: {
    ...DEFAULT_LAYER_PARAMS,
    patternType: 'wovenGrid',
    blendTargetType: 'wovenGrid',
    colorMode: 'rainbow',
  },
  layer2: {
    ...DEFAULT_LAYER_PARAMS,
    patternType: 'hyperTuring',
    colorMode: 'fire',
    symmetry: 3,
    audioSensitivity: 2.5,
  },
  layer3: {
    ...DEFAULT_LAYER_PARAMS,
    patternType: 'hyperVoronoi',
    colorMode: 'ice',
    symmetry: 5,
    midSensitivity: 1.8,
  },
  layer4: {
    ...DEFAULT_LAYER_PARAMS,
    patternType: 'invisible',
    colorMode: 'monochrome',
    bassSensitivity: 1,
    highSensitivity: 2,
  },
};

export const DEFAULT_GLOBALS = {
  feedbackMix: 0,
  globalTimeScale: 1,
  globalDistortionScale: 0,
  globalSymmetryOffsetSpeed: 0,
  uvScale: 0.8,
  globalAudioSensitivity: 5,
  pixelationFactor: 100,
  rainbowAnimationSpeed: 0.1,
  asciiCharSize: 12,
};
