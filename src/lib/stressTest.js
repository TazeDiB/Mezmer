/**
 * Stress-test utilities: grid layout, per-tile RT bundles, and param variation.
 */
import { copyLayerParamsToUniform, createFaceAccumulatedTimes } from './galleryStack.js';
import { PATTERN_TYPES } from '../constants/patternTypes.js';
import { VISUAL_MODES, COLOR_MODES } from '../constants/sliderConfig.js';
import { createHeightMapTarget } from './galleryDisplacement.js';

export const STRESS_TEST_MAX_2D = 64;
export const STRESS_TEST_MAX_3D = 32;
export const STRESS_TEST_MAX_CASTLE = 10000;
/** Max pooled RT slots (castle10k). */
export const STRESS_TEST_MAX_OBJECTS = STRESS_TEST_MAX_CASTLE;

export const CASTLE_OBJECT_COUNTS = {
  castle100: 100,
  castle1000: 1000,
  castle10000: 10000,
};

export const STRESS_TEST_MAX_PARTICLES = 256;

export const STRESS_TEST_MODES = [
  'off',
  'plane2d',
  'cubes3d',
  'particles3d',
  'castle100',
  'castle1000',
  'castle10000',
];

export function isParticleStressMode(mode) {
  return mode === 'particles3d';
}

export function isCastleStressMode(mode) {
  return mode === 'castle100' || mode === 'castle1000' || mode === 'castle10000';
}

export function isStressTestMode(mode) {
  return mode !== 'off' && mode != null;
}

export function isStressTest3DMode(mode) {
  return mode === 'cubes3d' || isCastleStressMode(mode) || isParticleStressMode(mode);
}

export function getStressTestObjectCount(mode, stressTestCount) {
  if (isCastleStressMode(mode)) {
    return CASTLE_OBJECT_COUNTS[mode] ?? 100;
  }
  return clampStressTestCount(mode, stressTestCount);
}

export function getStressTestMaxCount(mode) {
  if (isCastleStressMode(mode)) return CASTLE_OBJECT_COUNTS[mode] ?? 100;
  if (mode === 'particles3d') return STRESS_TEST_MAX_PARTICLES;
  if (mode === 'cubes3d') return STRESS_TEST_MAX_3D;
  if (mode === 'plane2d') return STRESS_TEST_MAX_2D;
  return 1;
}

export function clampStressTestCount(mode, count) {
  const max = getStressTestMaxCount(mode);
  return Math.max(1, Math.min(max, Math.round(count ?? 1)));
}

/** Near-square grid for N active tiles. */
export function computeStressGrid(count) {
  const activeCount = Math.max(1, count);
  const cols = Math.ceil(Math.sqrt(activeCount));
  const rows = Math.ceil(activeCount / cols);
  return { cols, rows, activeCount };
}

export function getStressTileRenderSize(canvasWidth, canvasHeight, count, mode = 'plane2d') {
  if (isCastleStressMode(mode)) {
    if (count >= 10000) return 32;
    if (count >= 1000) return 48;
    return 64;
  }
  if (mode === 'particles3d') {
    if (count >= 128) return 32;
    if (count >= 64) return 48;
    return 64;
  }
  const { cols, rows } = computeStressGrid(count);
  const maxDim = Math.max(cols, rows, 1);
  const minSide = Math.min(canvasWidth, canvasHeight);
  return Math.max(128, Math.floor(minSide / maxDim));
}

export function createStressTileTargets(
  THREE,
  maxCount,
  canvasWidth,
  canvasHeight,
  options,
  mode = 'plane2d'
) {
  const tileSize = getStressTileRenderSize(canvasWidth, canvasHeight, maxCount, mode);
  return Array.from({ length: maxCount }, () => ({
    w: tileSize,
    h: tileSize,
    fbA: new THREE.WebGLRenderTarget(tileSize, tileSize, options),
    fbB: new THREE.WebGLRenderTarget(tileSize, tileSize, options),
    fbIdx: 0,
    outA: new THREE.WebGLRenderTarget(tileSize, tileSize, options),
    outB: new THREE.WebGLRenderTarget(tileSize, tileSize, options),
    heightMap: createHeightMapTarget(THREE, tileSize, tileSize),
    latestTexture: null,
    blendFlip: true,
  }));
}

export function ensureStressTileTargetPool({
  THREE,
  targetsRef,
  requiredCount,
  canvasWidth,
  canvasHeight,
  rtOptions,
  mode,
}) {
  const needed = Math.max(1, requiredCount);
  let targets = targetsRef.current;
  if (!targets || targets.length < needed) {
    if (targets) disposeStressTileTargets(targets);
    targetsRef.current = createStressTileTargets(
      THREE,
      needed,
      canvasWidth,
      canvasHeight,
      rtOptions,
      mode
    );
    return targetsRef.current;
  }
  resizeStressTileTargets(targets, canvasWidth, canvasHeight, needed, mode);
  return targets;
}

export function resizeStressTileTargets(targets, canvasWidth, canvasHeight, activeCount, mode = 'plane2d') {
  if (!targets?.length) return;
  const tileSize = getStressTileRenderSize(
    canvasWidth,
    canvasHeight,
    activeCount || targets.length,
    mode
  );
  for (const t of targets) {
    t.w = tileSize;
    t.h = tileSize;
    t.fbA.setSize(tileSize, tileSize);
    t.fbB.setSize(tileSize, tileSize);
    t.outA.setSize(tileSize, tileSize);
    t.outB.setSize(tileSize, tileSize);
    t.heightMap?.setSize(tileSize, tileSize);
  }
}

export function disposeStressTileTargets(targets) {
  if (!targets) return;
  for (const t of targets) {
    t.fbA.dispose();
    t.fbB.dispose();
    t.outA.dispose();
    t.outB.dispose();
    t.heightMap?.dispose();
  }
}

export function ensureStressTileStatePool(stateRef, requiredCount) {
  const needed = Math.max(1, requiredCount);
  if (!stateRef.current || stateRef.current.length < needed) {
    stateRef.current = createStressTileState(needed);
  }
  return stateRef.current;
}

export function createStressTileState(maxCount) {
  return Array.from({ length: maxCount }, (_, tileIndex) => ({
    integrated: tileIndex * 4.2 + 2.5,
    symmetry: [
      tileIndex * 0.35,
      tileIndex * 0.48,
      tileIndex * 0.61,
      tileIndex * 0.74,
    ],
    times: createFaceAccumulatedTimes().map((slot, layerIndex) => ({
      ...slot,
      turing: tileIndex * 1.3 + layerIndex * 0.8,
      spiralNoise: tileIndex * 1.7 + layerIndex * 0.6,
      flow: tileIndex * 0.9 + layerIndex * 0.5,
      cube: tileIndex * 0.6 + layerIndex * 1.1,
      smoothSpiral: tileIndex * 1.1 + layerIndex * 0.4,
    })),
  }));
}

const VARIATION_PATTERNS = PATTERN_TYPES.filter((p) => p !== 'invisible');

const PART_PATTERN_BIAS = {
  brick: ['wovenGrid', 'hyperTuring', 'reactionDiff', 'cubeGrid', 'fractal'],
  tile: ['kaleidoWave', 'crystal', 'stainedGlass', 'hyperVoronoi', 'prism'],
  shingle: ['plasma', 'aurora', 'spiralArms', 'inkDrop', 'morph'],
  particle: ['plasma', 'aurora', 'inkDrop', 'smoothSpiral', 'kaleidoWave', 'hypnotic'],
};

function pickPatternForPart(tileIndex, partType) {
  const pool = PART_PATTERN_BIAS[partType] ?? VARIATION_PATTERNS;
  return pool[tileIndex % pool.length];
}

/** Deterministic visual mode per stress object. */
export function pickStressVisualMode(tileIndex, partType = null) {
  const offset =
    partType === 'tile'
      ? 2
      : partType === 'shingle'
        ? 5
        : partType === 'particle'
          ? 7
          : partType === 'brick'
            ? 0
            : 1;
  return VISUAL_MODES[(tileIndex + offset) % VISUAL_MODES.length];
}

/** Deterministic global color mode per stress object. */
export function pickStressColorMode(tileIndex, partType = null) {
  const offset =
    partType === 'tile'
      ? 3
      : partType === 'shingle'
        ? 8
        : partType === 'particle'
          ? 9
          : partType === 'brick'
            ? 1
            : 4;
  return COLOR_MODES[(tileIndex * 2 + offset) % COLOR_MODES.length];
}

/**
 * Per-object visual mode + global color (independent from main canvas settings).
 */
export function applyStressTileModes(uniforms, tileIndex, visualModeIndex, colorModeIndex, partType = null) {
  if (!uniforms) return null;

  const visualName = pickStressVisualMode(tileIndex, partType);
  const colorName = pickStressColorMode(tileIndex, partType);
  const visualIdx = visualModeIndex[visualName] ?? 0;
  const colorIdx = colorModeIndex[colorName] ?? 0;

  if (uniforms.u_visualModeFromIndex != null) uniforms.u_visualModeFromIndex.value = visualIdx;
  if (uniforms.u_visualModeToIndex != null) uniforms.u_visualModeToIndex.value = visualIdx;
  if (uniforms.u_visualModeBlend != null) uniforms.u_visualModeBlend.value = 1;
  if (uniforms.u_globalColorMode != null) uniforms.u_globalColorMode.value = colorIdx;
  if (uniforms.u_forceGlobalColor != null) uniforms.u_forceGlobalColor.value = true;

  return { visualName, colorName, visualIdx, colorIdx };
}

/**
 * Apply main-canvas layer params with per-part variation for stress runs.
 */
export function applyStressTileLayerUniforms(
  uniformLayers,
  tileIndex,
  params,
  patternNameToIndex,
  colorModeIndex,
  partType = null,
  tileColorIdx = null
) {
  if (!uniformLayers || !params || !patternNameToIndex) return;

  const typeOffset =
    partType === 'tile' ? 5 : partType === 'shingle' ? 11 : partType === 'brick' ? 0 : 0;
  const patternOffset = tileIndex + typeOffset;
  const resolvedColorIdx =
    tileColorIdx ?? colorModeIndex[pickStressColorMode(tileIndex, partType)] ?? 0;

  for (let layerIndex = 0; layerIndex < 4; layerIndex++) {
    const layerKey = `layer${layerIndex + 1}`;
    const layer = params[layerKey];
    const uni = uniformLayers[layerIndex];
    if (!layer || !uni) continue;

    copyLayerParamsToUniform(uni, layer);

    let patternName = layer.patternType;
    if (partType && layerIndex === 0) {
      patternName = pickPatternForPart(tileIndex, partType);
    } else if (patternName === 'invisible' && layerIndex < 3) {
      patternName = VARIATION_PATTERNS[(patternOffset + layerIndex) % VARIATION_PATTERNS.length];
    }

    const targetName = layer.blendTargetType ?? patternName;
    uni.patternType = patternNameToIndex[patternName] ?? 0;
    uni.blendTargetType = patternNameToIndex[targetName] ?? uni.patternType;
    uni.blendAmount = layer.blendAmount ?? 0;
    uni.colorMode = resolvedColorIdx;
    uni.blendTargetColorMode = resolvedColorIdx;
    uni.symmetry = (layer.symmetry ?? 1) + (tileIndex % 6) * 0.25;
    uni.distortionStrength = layer.distortion ?? layer.distortionStrength ?? 0;
  }
}

/** @deprecated use STRESS_TEST_MAX_OBJECTS */
export const STRESS_TEST_MAX_TILES = STRESS_TEST_MAX_2D;
