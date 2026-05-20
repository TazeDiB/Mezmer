/**
 * Shared texture/pattern randomization for main canvas, gallery walls (planes), and floating shapes.
 *
 * Profiles control how randomized layer stacks are finalized and applied:
 * - main: crossfade transition (blendAmount 0 → animated in App)
 * - wall: per-face stacks, immediate blend (blendAmount 1), gallery face UV projection
 * - shape: per-object stacks, immediate blend, flat UV for mesh surfaces
 */
import {
  SLIDER_CONFIG,
  GLOBAL_PARAM_KEYS,
  MOUSE_PARAM_KEYS,
  PATTERN_TYPES_LIST,
  PATTERN_TYPE_OPTIONS_LIST,
  VISUAL_MODES,
  VISUAL_MODE_INDEX,
  COLOR_MODES,
  AUDIO_COLOR_MODES_LIST,
  RANDOMIZER_THEMES,
} from '../constants/sliderConfig.js';
import { DEFAULT_LAYER_PARAMS, DEFAULT_GLOBALS, PARAM_CONFIG } from '../constants/index.js';
import { GALLERY_FACE_COUNT, startGalleryWallTransition, markGalleryWarmup } from './galleryStack.js';
import {
  FLOATING_OBJECT_COUNT,
  startFloatingObjectTransition,
} from './galleryFloatingObjects.js';
import { randomInRange } from './utils.js';

const AUDIO_PARAMS = ['audioSensitivity', 'bassSensitivity', 'midSensitivity', 'highSensitivity'];
const SYMMETRY_CAP = 4 * Math.PI;

/** @typedef {'main'|'wall'|'shape'|'gallery'} TextureTargetKind */

/**
 * Per-target randomization + application behavior.
 * Rendering differences (face UV vs flat shape UV) live in the WebGL/gallery modules;
 * profiles only change what data we generate and how transitions are started.
 */
export const TEXTURE_TARGET_PROFILES = {
  main: {
    kind: 'main',
    count: 0,
    layerMode: 'transition',
    forceGlobalColor: false,
    syncLayerColorToGlobal: false,
    invisibleLayer4Chance: 0,
    uvScale: null,
    timeOffset: null,
    perSlotVisualMode: false,
    perSlotColorMode: false,
  },
  wall: {
    kind: 'wall',
    count: GALLERY_FACE_COUNT,
    layerMode: 'immediate',
    forceGlobalColor: true,
    syncLayerColorToGlobal: true,
    invisibleLayer4Chance: 0.35,
    uvScale: () => 0.65 + Math.random() * 0.75,
    timeOffset: (slotIndex) => slotIndex * 19.7 + Math.random() * 12,
    perSlotVisualMode: true,
    perSlotColorMode: true,
  },
  shape: {
    kind: 'shape',
    count: FLOATING_OBJECT_COUNT,
    layerMode: 'immediate',
    forceGlobalColor: true,
    syncLayerColorToGlobal: true,
    invisibleLayer4Chance: 0.35,
    /** Tighter zoom range — shapes use repeating flat UV, not wall aspect ratios */
    uvScale: () => 0.85 + Math.random() * 0.55,
    timeOffset: (slotIndex) => slotIndex * 19.7 + Math.random() * 12 + 7.3,
    perSlotVisualMode: true,
    perSlotColorMode: true,
  },
};

export function getTextureTargetProfile(kind) {
  return TEXTURE_TARGET_PROFILES[kind] ?? TEXTURE_TARGET_PROFILES.main;
}

function getNonAudioColorFallbackPool() {
  return COLOR_MODES.filter((mode) => !AUDIO_COLOR_MODES_LIST.includes(mode));
}

/** Strip audio-reactive color modes unless audio is currently active. */
export function filterColorPoolForAudio(colorPool, audioActive) {
  if (audioActive) return colorPool;
  const filtered = colorPool.filter((mode) => !AUDIO_COLOR_MODES_LIST.includes(mode));
  return filtered.length > 0 ? filtered : getNonAudioColorFallbackPool();
}

export function resolveRandomizerTheme(theme = 'chaotic', { audioActive = false } = {}) {
  const themeConfig = RANDOMIZER_THEMES[theme] || RANDOMIZER_THEMES.chaotic;
  const rawColorPool = themeConfig.colors || COLOR_MODES;
  return {
    theme,
    patternPool: themeConfig.patterns || PATTERN_TYPES_LIST,
    colorPool: filterColorPoolForAudio(rawColorPool, audioActive),
    visualPool: themeConfig.visualModes || VISUAL_MODES,
  };
}

function getRelevantParams(patternType) {
  const patternParams = PARAM_CONFIG[patternType] || [];
  const audio = patternType !== 'invisible' ? AUDIO_PARAMS : [];
  return [...new Set([...patternParams, ...audio])];
}

function pickVisualMode(currentMode, pool) {
  let attempts = 0;
  let next = currentMode;
  while (attempts < 10 && next === currentMode) {
    next = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  }
  return next !== currentMode ? next : pool[Math.floor(Math.random() * pool.length)];
}

export function randomizeGlobal(key, config) {
  let value = randomInRange(config);
  if (key === 'globalSymmetryOffsetSpeed') {
    value = Math.max(config.min * 0.15, Math.min(config.max * 0.15, value));
  }
  const centered = {
    globalTimeScale: 0.5,
    uvScale: 0.6,
    globalDistortionScale: 0.5,
  };
  if (centered[key]) {
    const bias = centered[key];
    const mid = (config.max + config.min) / 2;
    const half = (config.max - config.min) / 2;
    value = Math.max(mid - half * bias, Math.min(mid + half * bias, value));
  }
  return value;
}

export function randomizePatternParam(key, config) {
  let value = randomInRange(config);
  const slowKeys = {
    turingSpeed: 0.15,
    spiralNoiseSpeed: 0.15,
    flowSpeed: 0.15,
    cubeRotationSpeed: 0.15,
    smoothSpiralSpeed: 0.15,
  };
  if (key === 'layerSymmetryOffsetSpeed') {
    return Math.max(-SYMMETRY_CAP, Math.min(SYMMETRY_CAP, value));
  }
  if (slowKeys[key]) {
    const scale = slowKeys[key];
    return Math.max(config.min * scale, Math.min(config.max * scale, value));
  }
  const centered = {
    distortion: 0.5,
    turingScale: 0.6,
    voronoiScale: 0.6,
    spiralTightness: 0.6,
    spiralNoiseScale: 0.5,
    smoothSpiralTightness: 0.6,
    lineAngle: 0.5,
    fractalAngle: 0.5,
  };
  if (centered[key]) {
    const bias = centered[key];
    const mid = (config.max + config.min) / 2;
    const half = (config.max - config.min) / 2;
    value = Math.max(mid - half * bias, Math.min(mid + half * bias, value));
  }
  return value;
}

/**
 * Randomize one layer. Main canvas passes current layer as baseLayer to preserve untouched fields.
 */
export function randomizeLayer(
  patternPool,
  colorPool,
  randomizeColors,
  { baseLayer = DEFAULT_LAYER_PARAMS, layerMode = 'transition' } = {}
) {
  const pattern = patternPool[Math.floor(Math.random() * patternPool.length)];

  if (pattern === 'invisible') {
    return {
      ...DEFAULT_LAYER_PARAMS,
      ...baseLayer,
      patternType: 'invisible',
      blendTargetType: 'invisible',
      blendAmount: 0,
      colorMode: randomizeColors
        ? colorPool[Math.floor(Math.random() * colorPool.length)]
        : baseLayer.colorMode ?? DEFAULT_LAYER_PARAMS.colorMode,
    };
  }

  const layer = { ...DEFAULT_LAYER_PARAMS, ...baseLayer };

  AUDIO_PARAMS.forEach((key) => {
    if (SLIDER_CONFIG[key] && layer[key] !== undefined) {
      layer[key] = Math.max(0.8, randomInRange(SLIDER_CONFIG[key]));
    }
  });

  layer.patternType = pattern;
  if (layerMode === 'immediate') {
    layer.blendTargetType = pattern;
    layer.blendAmount = 1;
  } else {
    layer.blendTargetType =
      PATTERN_TYPE_OPTIONS_LIST[Math.floor(Math.random() * PATTERN_TYPE_OPTIONS_LIST.length)];
    layer.blendAmount = 0;
  }

  if (SLIDER_CONFIG.symmetry && layer.symmetry !== undefined) {
    layer.symmetry = Math.round(randomInRange(SLIDER_CONFIG.symmetry));
  }
  if (SLIDER_CONFIG.distortion && layer.distortion !== undefined) {
    layer.distortion = randomInRange(SLIDER_CONFIG.distortion);
  }

  getRelevantParams(pattern).forEach((key) => {
    if (key === 'symmetry' || key === 'distortion') return;
    const resolved = key === 'freq' || key === 'layer2Freq' ? 'layer2Freq' : key;
    const config = SLIDER_CONFIG[resolved];
    if (config && layer[key] !== undefined) {
      layer[key] = randomizePatternParam(key, config);
    }
  });

  layer.colorMode = randomizeColors
    ? colorPool[Math.floor(Math.random() * colorPool.length)]
    : baseLayer.colorMode ?? DEFAULT_LAYER_PARAMS.colorMode;

  return layer;
}

/** Surface layer (wall plane or shape): optional layer-4 invisibility bias. */
export function randomizeSurfaceLayer(
  layerIndex,
  patternPool,
  colorPool,
  randomizeColors,
  profile
) {
  if (layerIndex === 3 && Math.random() < (profile.invisibleLayer4Chance ?? 0)) {
    return {
      ...DEFAULT_LAYER_PARAMS,
      patternType: 'invisible',
      blendTargetType: 'invisible',
      blendAmount: 0,
      colorMode: randomizeColors
        ? colorPool[Math.floor(Math.random() * colorPool.length)]
        : DEFAULT_LAYER_PARAMS.colorMode,
    };
  }

  const layer = randomizeLayer(patternPool, colorPool, randomizeColors, {
    layerMode: profile.layerMode,
  });

  if (profile.layerMode === 'immediate') {
    layer.blendTargetType = layer.patternType;
    layer.blendAmount = layer.patternType === 'invisible' ? 0 : 1;
  }

  return layer;
}

function pickPerSlotValues(count, pool, enabled, fallback) {
  if (!enabled || !pool?.length) return Array.from({ length: count }, () => fallback);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);
}

/**
 * Build one texture stack for a wall face or floating shape.
 */
export function buildRandomTextureStack(kind, slotIndex, options = {}) {
  const profile = getTextureTargetProfile(kind);
  if (profile.kind === 'main') {
    throw new Error('Use buildRandomMainCanvasParams for main canvas targets');
  }

  const {
    theme = 'chaotic',
    randomizeColorModes = true,
    randomizeVisualMode = true,
    audioActive = false,
  } = options;
  const { patternPool, colorPool, visualPool } = resolveRandomizerTheme(theme, { audioActive });

  const visualModes = pickPerSlotValues(
    profile.count,
    visualPool,
    profile.perSlotVisualMode && randomizeVisualMode,
    'normal'
  );
  const colorModes = pickPerSlotValues(
    profile.count,
    colorPool,
    profile.perSlotColorMode && randomizeColorModes,
    'rainbow'
  );

  const globalColorMode = colorModes[slotIndex];
  const stack = {
    timeOffset: profile.timeOffset ? profile.timeOffset(slotIndex) : 0,
    uvScale: profile.uvScale ? profile.uvScale() : DEFAULT_GLOBALS.uvScale,
    visualMode: visualModes[slotIndex],
    globalColorMode,
    forceGlobalColor: profile.forceGlobalColor,
    layers: [0, 1, 2, 3].map((layerIndex) => {
      const layer = randomizeSurfaceLayer(
        layerIndex,
        patternPool,
        colorPool,
        randomizeColorModes,
        profile
      );
      if (profile.syncLayerColorToGlobal) {
        layer.colorMode = globalColorMode;
      }
      return layer;
    }),
  };

  return stack;
}

/**
 * Build randomized texture stacks for walls, shapes, or other surface targets.
 */
export function buildRandomTextureStacks(kind, count = null, options = {}) {
  const profile = getTextureTargetProfile(kind);
  const n = count ?? profile.count;
  return Array.from({ length: n }, (_, slotIndex) =>
    buildRandomTextureStack(kind, slotIndex, options)
  );
}

function applyVisualModeToParams(params, visualMode, randomizeVisualMode, currentVisualMode, visualPool) {
  const nextVisualMode = randomizeVisualMode
    ? pickVisualMode(currentVisualMode, visualPool)
    : currentVisualMode;

  const fromIndex = VISUAL_MODE_INDEX[currentVisualMode] ?? 0;
  const toIndex = VISUAL_MODE_INDEX[nextVisualMode] ?? fromIndex;

  params.visualModeFromIndex = fromIndex;
  params.visualModeToIndex = toIndex;
  params.visualModeBlend = 0;

  if (nextVisualMode === 'pixelate') {
    params.pixelationFactor = randomInRange(SLIDER_CONFIG.pixelationFactor);
    if (params.asciiCharSize === undefined) {
      params.asciiCharSize = SLIDER_CONFIG.asciiCharSize?.default ?? 12;
    }
  } else if (nextVisualMode === 'ascii') {
    params.asciiCharSize = randomInRange(SLIDER_CONFIG.asciiCharSize);
    if (params.pixelationFactor === undefined) {
      params.pixelationFactor = SLIDER_CONFIG.pixelationFactor?.default ?? 100;
    }
  } else {
    if (params.pixelationFactor === undefined) {
      params.pixelationFactor = SLIDER_CONFIG.pixelationFactor?.default ?? 100;
    }
    if (params.asciiCharSize === undefined) {
      params.asciiCharSize = SLIDER_CONFIG.asciiCharSize?.default ?? 12;
    }
  }

  return nextVisualMode;
}

function ensureVisibleMainLayers(params, patternPool, colorPool, randomizeColorModes) {
  if ([1, 2, 3, 4].every((i) => params[`layer${i}`].patternType === 'invisible')) {
    const visible = patternPool.filter((p) => p !== 'invisible');
    const fallback = visible[Math.floor(Math.random() * visible.length)];
    params.layer1 = randomizeLayer([fallback], colorPool, randomizeColorModes, {
      baseLayer: params.layer1,
      layerMode: 'transition',
    });
  }
}

/**
 * Build full main-canvas param snapshot (startup / preset load).
 */
export function buildRandomMainCanvasParams(options = {}) {
  const {
    theme = 'chaotic',
    randomizeGlobals = true,
    randomizeColorModes = true,
    randomizeVisualMode = true,
    currentVisualMode = 'normal',
    currentParams = null,
    audioActive = false,
  } = options;

  const { patternPool, colorPool, visualPool } = resolveRandomizerTheme(theme, { audioActive });
  const baseGlobals = currentParams
    ? { ...DEFAULT_GLOBALS, ...currentParams }
    : { ...DEFAULT_GLOBALS };

  const params = {
    ...baseGlobals,
    layer1: randomizeLayer(patternPool, colorPool, randomizeColorModes, {
      baseLayer: currentParams?.layer1,
      layerMode: 'transition',
    }),
    layer2: randomizeLayer(patternPool, colorPool, randomizeColorModes, {
      baseLayer: currentParams?.layer2,
      layerMode: 'transition',
    }),
    layer3: randomizeLayer(patternPool, colorPool, randomizeColorModes, {
      baseLayer: currentParams?.layer3,
      layerMode: 'transition',
    }),
    layer4: randomizeLayer(patternPool, colorPool, randomizeColorModes, {
      baseLayer: currentParams?.layer4,
      layerMode: 'transition',
    }),
  };

  MOUSE_PARAM_KEYS.forEach((key) => {
    if (DEFAULT_GLOBALS[key] !== undefined) params[key] = DEFAULT_GLOBALS[key];
  });

  if (randomizeGlobals) {
    GLOBAL_PARAM_KEYS.forEach((key) => {
      if (
        key !== 'blendSpeedFactor' &&
        key !== 'pixelationFactor' &&
        key !== 'asciiCharSize' &&
        key !== 'rainbowAnimationSpeed' &&
        SLIDER_CONFIG[key] &&
        params[key] !== undefined
      ) {
        params[key] = randomizeGlobal(key, SLIDER_CONFIG[key]);
      }
    });
    if (SLIDER_CONFIG.rainbowAnimationSpeed) {
      params.rainbowAnimationSpeed = randomInRange(SLIDER_CONFIG.rainbowAnimationSpeed);
    }
  }

  const visualMode = applyVisualModeToParams(
    params,
    null,
    randomizeVisualMode,
    currentVisualMode,
    visualPool
  );
  params.visualModeBlend = 1;

  ensureVisibleMainLayers(params, patternPool, colorPool, randomizeColorModes);

  return {
    params,
    visualMode,
    globalColorMode: randomizeColorModes
      ? colorPool[Math.floor(Math.random() * colorPool.length)]
      : 'rainbow',
    forceGlobalColor: false,
  };
}

/**
 * Build from/to pair for an in-app main canvas randomize (matches legacy App.jsx behavior).
 */
export function createRandomMainCanvasTransition(options = {}) {
  const {
    currentParams,
    currentVisualMode = 'normal',
    currentGlobalColorMode = 'rainbow',
    forceGlobalColor = false,
    theme = 'chaotic',
    randomizeGlobals = true,
    randomizeColorModes = true,
    randomizeVisualMode = true,
    audioActive = false,
  } = options;

  if (!currentParams) {
    throw new Error('createRandomMainCanvasTransition requires currentParams');
  }

  const { patternPool, colorPool, visualPool } = resolveRandomizerTheme(theme, { audioActive });
  const fromParams = { ...currentParams };
  const toParams = JSON.parse(JSON.stringify(currentParams));

  let nextGlobalColorMode = currentGlobalColorMode;
  if (randomizeGlobals) {
    GLOBAL_PARAM_KEYS.forEach((key) => {
      if (
        key !== 'blendSpeedFactor' &&
        key !== 'pixelationFactor' &&
        key !== 'asciiCharSize' &&
        key !== 'rainbowAnimationSpeed' &&
        SLIDER_CONFIG[key] &&
        fromParams.hasOwnProperty(key)
      ) {
        toParams[key] = randomizeGlobal(key, SLIDER_CONFIG[key]);
      } else if (key === 'blendSpeedFactor' && fromParams.hasOwnProperty(key)) {
        toParams[key] = fromParams[key];
      }
    });
    if (randomizeColorModes) {
      nextGlobalColorMode = colorPool[Math.floor(Math.random() * colorPool.length)];
    }
    toParams.globalColorMode = nextGlobalColorMode;
    toParams.forceGlobalColor = forceGlobalColor;
    if (SLIDER_CONFIG.rainbowAnimationSpeed && fromParams.hasOwnProperty('rainbowAnimationSpeed')) {
      toParams.rainbowAnimationSpeed = randomInRange(SLIDER_CONFIG.rainbowAnimationSpeed);
    }
  } else {
    GLOBAL_PARAM_KEYS.forEach((key) => {
      if (fromParams.hasOwnProperty(key)) toParams[key] = fromParams[key];
    });
    toParams.globalColorMode = currentGlobalColorMode;
    toParams.forceGlobalColor = forceGlobalColor;
  }

  const nextVisualMode = applyVisualModeToParams(
    toParams,
    null,
    randomizeVisualMode,
    currentVisualMode,
    visualPool
  );

  for (let i = 1; i <= 4; i++) {
    const key = `layer${i}`;
    const baseLayer = currentParams[key];
    const preserved = fromParams[key];
    if (!baseLayer || !preserved) continue;

    toParams[key] = randomizeLayer(patternPool, colorPool, randomizeColorModes, {
      baseLayer,
      layerMode: 'transition',
    });

    if (!randomizeColorModes) {
      toParams[key].colorMode = preserved.colorMode ?? baseLayer.colorMode;
    }
  }

  ensureVisibleMainLayers(toParams, patternPool, colorPool, randomizeColorModes);

  const fromSnapshot = { ...fromParams };
  for (let i = 1; i <= 4; i++) {
    const key = `layer${i}`;
    const fromLayer = fromSnapshot[key];
    const toLayer = toParams[key];
    if (
      fromLayer &&
      toLayer &&
      fromLayer.patternType === 'invisible' &&
      toLayer.patternType !== 'invisible'
    ) {
      fromSnapshot[key] = { ...fromLayer, layerSymmetryOffsetSpeed: 0 };
    }
  }

  return {
    fromParams: fromSnapshot,
    toParams,
    visualMode: nextVisualMode,
    globalColorMode: nextGlobalColorMode,
    forceGlobalColor,
  };
}

function startSurfaceTransition(kind, toStacks, blendSpeedFactor = 1) {
  if (kind === 'wall') {
    startGalleryWallTransition(toStacks, blendSpeedFactor);
    return;
  }
  if (kind === 'shape') {
    startFloatingObjectTransition(toStacks, blendSpeedFactor);
  }
}

/**
 * Randomize and crossfade texture stacks for one target kind.
 * Use kind `'gallery'` to randomize walls + floating shapes together.
 */
export function randomizeTextures(kind, options = {}) {
  const { blendSpeedFactor = 1, ...rest } = options;

  if (kind === 'main') {
    return createRandomMainCanvasTransition(rest);
  }

  if (kind === 'gallery') {
    const wallStacks = buildRandomTextureStacks('wall', GALLERY_FACE_COUNT, rest);
    startGalleryWallTransition(wallStacks, blendSpeedFactor);
    const shapeStacks = buildRandomTextureStacks('shape', FLOATING_OBJECT_COUNT, rest);
    startFloatingObjectTransition(shapeStacks, blendSpeedFactor);
    markGalleryWarmup();
    return { walls: wallStacks, shapes: shapeStacks };
  }

  const profile = getTextureTargetProfile(kind);
  const stacks = buildRandomTextureStacks(kind, profile.count, rest);
  startSurfaceTransition(kind, stacks, blendSpeedFactor);
  if (kind === 'wall') markGalleryWarmup();
  return stacks;
}
