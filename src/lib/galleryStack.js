/** Six independent gallery wall stacks — each face gets its own full render pipeline. */
import { VISUAL_MODE_INDEX } from '../constants/index.js';
import { LAYER_SPEED_PARAM_KEYS } from './transitionSpeedParams.js';

export const GALLERY_FACE_COUNT = 6;
export const GALLERY_RENDER_SCALE = 0.5;
export const GALLERY_FACES_PER_FRAME = 2;

/** Three.js BoxGeometry material order: +x, -x, +y, -y, +z, -z */
export const GALLERY_FACE_SEEDS = [1.17, 2.83, 4.51, 6.19, 7.87, 9.53];

/** Room face sizes (w×h) — matches GALLERY_ROOM; order: +x, -x, +y, -y, +z, -z */
export const GALLERY_FACE_DIMENSIONS = [
  [18, 10],
  [18, 10],
  [18, 18],
  [18, 18],
  [18, 10],
  [18, 10],
];

export function getGalleryFaceRenderSize(faceIndex, canvasWidth, canvasHeight, scale = GALLERY_RENDER_SCALE) {
  const [fw, fh] = GALLERY_FACE_DIMENSIONS[faceIndex] ?? [18, 10];
  const base = Math.max(256, Math.floor(Math.max(canvasWidth, canvasHeight) * scale));
  if (fw >= fh) {
    return { w: base, h: Math.max(128, Math.floor((base * fh) / fw)) };
  }
  return { w: Math.max(128, Math.floor((base * fw) / fh)), h: base };
}

export function getGalleryRenderSize(width, height) {
  return getGalleryFaceRenderSize(0, width, height);
}

/**
 * Per-wall layer stacks (pattern + color). Independent from the main 2D canvas stack.
 * Order matches BoxGeometry face materials.
 */
export const DEFAULT_GALLERY_WALL_STACKS = [
  {
    timeOffset: 0,
    uvScale: 0.72,
    visualMode: 'glow',
    globalColorMode: 'fire',
    forceGlobalColor: true,
    layers: [
      { patternType: 'wovenGrid', colorMode: 'rainbow', symmetry: 4 },
      { patternType: 'hyperTuring', colorMode: 'fire', symmetry: 3 },
      { patternType: 'hyperVoronoi', colorMode: 'ice', symmetry: 5 },
      { patternType: 'invisible', colorMode: 'monochrome' },
    ],
  },
  {
    timeOffset: 21.5,
    uvScale: 1.05,
    visualMode: 'moire',
    globalColorMode: 'vaporwave',
    forceGlobalColor: true,
    layers: [
      { patternType: 'spiralArms', colorMode: 'vaporwave', symmetry: 6 },
      { patternType: 'reactionDiff', colorMode: 'cyberpunk', symmetry: 4 },
      { patternType: 'plasma', colorMode: 'spectrum', symmetry: 3 },
      { patternType: 'morph', colorMode: 'velocity' },
    ],
  },
  {
    timeOffset: 43.8,
    uvScale: 0.88,
    visualMode: 'crt',
    globalColorMode: 'matrix',
    forceGlobalColor: true,
    layers: [
      { patternType: 'hyperFlow', colorMode: 'matrix', symmetry: 5 },
      { patternType: 'cubeGrid', colorMode: 'audioRGB', symmetry: 4 },
      { patternType: 'crystal', colorMode: 'ice', symmetry: 7 },
      { patternType: 'prism', colorMode: 'rainbow' },
    ],
  },
  {
    timeOffset: 67.2,
    uvScale: 1.18,
    visualMode: 'thermal',
    globalColorMode: 'reactivePulse',
    forceGlobalColor: true,
    layers: [
      { patternType: 'fractal', colorMode: 'fire', symmetry: 3 },
      { patternType: 'lissajous', colorMode: 'reactivePulse', symmetry: 5 },
      { patternType: 'stainedGlass', colorMode: 'vaporwave', symmetry: 6 },
      { patternType: 'invisible', colorMode: 'monochrome' },
    ],
  },
  {
    timeOffset: 89.6,
    uvScale: 0.95,
    visualMode: 'hologram',
    globalColorMode: 'spectrum',
    forceGlobalColor: true,
    layers: [
      { patternType: 'aurora', colorMode: 'spectrum', symmetry: 4 },
      { patternType: 'kaleidoWave', colorMode: 'cyberpunk', symmetry: 8 },
      { patternType: 'inkDrop', colorMode: 'velocity', symmetry: 3 },
      { patternType: 'hyperVoronoi', colorMode: 'ice', symmetry: 5 },
    ],
  },
  {
    timeOffset: 112.4,
    uvScale: 1.22,
    visualMode: 'hashGrid',
    globalColorMode: 'cyberpunk',
    forceGlobalColor: true,
    layers: [
      { patternType: 'wovenGrid', colorMode: 'matrix', symmetry: 5 },
      { patternType: 'spiralArms', colorMode: 'fire', symmetry: 4 },
      { patternType: 'reactionDiff', colorMode: 'rainbow', symmetry: 6 },
      { patternType: 'plasma', colorMode: 'audioRGB', symmetry: 3 },
    ],
  },
];

/** @deprecated use getGalleryWallStacks() */
export const GALLERY_WALL_STACKS = DEFAULT_GALLERY_WALL_STACKS;

function cloneWallStacks(stacks) {
  return JSON.parse(JSON.stringify(stacks));
}

export { cloneWallStacks, normalizeWallStack, interpolateWallStacks };

let activeGalleryWallStacks = cloneWallStacks(DEFAULT_GALLERY_WALL_STACKS);
let galleryWarmupPending = false;
let galleryTransition = null;

const GALLERY_TRANSITION_BASE_MS = 2500;

const LAYER_LERP_KEYS = [
  'freq', 'weaveThickness', 'turingScale', 'turingFeed', 'turingKill',
  'turingDiffusionA', 'turingDiffusionB', 'voronoiScale', 'voronoiEdgeWidth',
  'spiralArms', 'spiralTightness', 'spiralNoiseScale',
  'audioSensitivity', 'bassSensitivity', 'midSensitivity', 'highSensitivity',
  'flowComplexity', 'cubeSize', 'flowCurl', 'rdComplexity', 'rdSpotSize',
  'fractalIterations', 'fractalAngle', 'fractalThickness',
  'lissajousFreqX', 'lissajousFreqY', 'lissajousThickness',
  'symmetry', 'distortion',
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

function normalizeWallLayers(layers) {
  return layers.map((layer) => ({
    ...layer,
    blendTargetType: layer.patternType,
    blendTargetColorMode: layer.colorMode,
    blendAmount: layer.patternType === 'invisible' ? 0 : 1,
  }));
}

function normalizeWallStack(wall) {
  return {
    ...wall,
    layers: normalizeWallLayers(wall.layers),
  };
}

function interpolateWallLayer(fromLayer, toLayer, dt, fromGlobalColor, toGlobalColor) {
  const result = { ...toLayer };
  result.patternType = fromLayer.patternType;
  result.blendTargetType = toLayer.patternType;
  result.blendAmount = dt;
  result.colorMode = fromGlobalColor ?? fromLayer.colorMode;
  result.blendTargetColorMode = toGlobalColor ?? toLayer.colorMode;

  for (const key of LAYER_LERP_KEYS) {
    const a = fromLayer[key];
    const b = toLayer[key];
    if (typeof a === 'number' && typeof b === 'number') {
      let v = lerp(a, b, dt);
      if (key === 'symmetry') v = Math.round(v);
      result[key] = v;
    } else if (a !== undefined) {
      result[key] = a;
    }
  }

  for (const key of LAYER_SPEED_PARAM_KEYS) {
    if (dt >= 1) {
      if (toLayer[key] !== undefined) result[key] = toLayer[key];
    } else if (fromLayer[key] !== undefined) {
      result[key] = fromLayer[key];
    }
  }

  return result;
}

function interpolateWallStacks(fromStacks, toStacks, dt) {
  return fromStacks.map((fromWall, wallIndex) => {
    const toWall = toStacks[wallIndex];
    return {
      timeOffset: fromWall.timeOffset ?? 0,
      uvScale: lerp(fromWall.uvScale ?? 0.8, toWall.uvScale ?? 0.8, dt),
      visualMode: toWall.visualMode,
      visualModeFrom: fromWall.visualMode,
      visualModeTo: toWall.visualMode,
      visualModeBlend: dt,
      globalColorMode: toWall.globalColorMode,
      forceGlobalColor: dt >= 0.999 ? toWall.forceGlobalColor : false,
      layers: fromWall.layers.map((fromLayer, layerIndex) =>
        interpolateWallLayer(
          fromLayer,
          toWall.layers[layerIndex],
          dt,
          fromWall.globalColorMode,
          toWall.globalColorMode
        )
      ),
    };
  });
}

export function getGalleryTransitionDuration(blendSpeedFactor = 1) {
  return Math.max(50, GALLERY_TRANSITION_BASE_MS / Math.max(0.01, blendSpeedFactor ?? 1));
}

export function startGalleryWallTransition(toStacks, blendSpeedFactor = 1) {
  galleryTransition = {
    from: cloneWallStacks(activeGalleryWallStacks).map(normalizeWallStack),
    to: cloneWallStacks(toStacks).map(normalizeWallStack),
    startTime: performance.now(),
    duration: getGalleryTransitionDuration(blendSpeedFactor),
  };
}

export function isGalleryTransitionActive(now = performance.now()) {
  if (!galleryTransition) return false;
  const duration = galleryTransition.duration ?? GALLERY_TRANSITION_BASE_MS;
  return (now - galleryTransition.startTime) / duration < 1;
}

export function getGalleryWallStacksForRender(now = performance.now(), blendSpeedFactor = 1) {
  if (!galleryTransition) return activeGalleryWallStacks;

  const duration = galleryTransition.duration ?? getGalleryTransitionDuration(blendSpeedFactor);
  const rawT = Math.min(1, (now - galleryTransition.startTime) / duration);
  const dt = smoothStep(rawT);

  if (rawT >= 1) {
    activeGalleryWallStacks = cloneWallStacks(galleryTransition.to).map(normalizeWallStack);
    galleryTransition = null;
    return activeGalleryWallStacks;
  }

  return interpolateWallStacks(galleryTransition.from, galleryTransition.to, dt);
}

export function getGalleryWallStacks() {
  return activeGalleryWallStacks;
}

export function setGalleryWallStacks(stacks) {
  activeGalleryWallStacks = cloneWallStacks(stacks).map(normalizeWallStack);
  galleryTransition = null;
}

export function resetGalleryWallStacks() {
  activeGalleryWallStacks = cloneWallStacks(DEFAULT_GALLERY_WALL_STACKS);
  galleryTransition = null;
}

export function markGalleryWarmup() {
  galleryWarmupPending = true;
}

export function consumeGalleryWarmupRequest() {
  const pending = galleryWarmupPending;
  galleryWarmupPending = false;
  return pending;
}

/** @deprecated use markGalleryWarmup */
export function markGalleryForRefresh() {
  markGalleryWarmup();
}

/** @deprecated use consumeGalleryWarmupRequest */
export function consumeGalleryRefreshRequest() {
  return consumeGalleryWarmupRequest();
}

export function createFaceAccumulatedTimes() {
  return Array.from({ length: 4 }, () => ({
    turing: 0,
    spiralNoise: 0,
    flow: 0,
    cube: 0,
    smoothSpiral: 0,
  }));
}

export function createGalleryFaceState() {
  return Array.from({ length: GALLERY_FACE_COUNT }, (_, face) => ({
    integrated: GALLERY_FACE_SEEDS[face] * 8.5,
    symmetry: [face * 0.4, face * 0.55, face * 0.7, face * 0.85],
    times: createFaceAccumulatedTimes().map((slot, layer) => ({
      ...slot,
      turing: face * 1.7 + layer * 0.9,
      spiralNoise: face * 2.1 + layer * 1.1,
      flow: face * 1.3 + layer * 0.7,
      cube: face * 0.8 + layer * 1.4,
      smoothSpiral: face * 1.5 + layer * 0.6,
    })),
  }));
}

export function copyAccumulatedTimesTo(target, source) {
  for (let i = 0; i < 4; i++) {
    const dst = target[i];
    const src = source[i];
    if (!dst || !src) continue;
    dst.turing = src.turing;
    dst.spiralNoise = src.spiralNoise;
    dst.flow = src.flow;
    dst.cube = src.cube;
    dst.smoothSpiral = src.smoothSpiral;
  }
}

/** Copy numeric layer params from app state into shader uniform layer (gallery baseline). */
export function copyLayerParamsToUniform(uni, layer) {
  if (!uni || !layer) return;
  uni.freq = layer.freq ?? layer.layer2Freq ?? 10;
  uni.weaveThickness = layer.weaveThickness ?? 0.02;
  uni.turingScale = layer.turingScale ?? 15;
  uni.turingSpeed = layer.turingSpeed ?? 0.5;
  uni.turingFeed = layer.turingFeed ?? 0.035;
  uni.turingKill = layer.turingKill ?? 0.065;
  uni.turingDiffusionA = layer.turingDiffusionA ?? 1;
  uni.turingDiffusionB = layer.turingDiffusionB ?? 0.5;
  uni.voronoiScale = layer.voronoiScale ?? 5;
  uni.voronoiEdgeWidth = layer.voronoiEdgeWidth ?? 0.02;
  uni.spiralArms = layer.spiralArms ?? 5;
  uni.spiralTightness = layer.spiralTightness ?? 0.5;
  uni.spiralNoiseScale = layer.spiralNoiseScale ?? 1;
  uni.spiralNoiseSpeed = layer.spiralNoiseSpeed ?? 0.1;
  uni.audioSensitivity = layer.audioSensitivity ?? 1;
  uni.bassSensitivity = layer.bassSensitivity ?? 1;
  uni.midSensitivity = layer.midSensitivity ?? 1;
  uni.highSensitivity = layer.highSensitivity ?? 1;
  uni.flowComplexity = layer.flowComplexity ?? 0.6;
  uni.cubeSize = layer.cubeSize ?? 0.5;
  uni.flowCurl = layer.flowCurl ?? 0.4;
  uni.flowSpeed = layer.flowSpeed ?? 0;
  uni.rdComplexity = layer.rdComplexity ?? 0.5;
  uni.rdSpotSize = layer.rdSpotSize ?? 0.5;
  uni.fractalIterations = layer.fractalIterations ?? 4;
  uni.fractalAngle = layer.fractalAngle ?? 0.5;
  uni.fractalSpeed = layer.fractalSpeed ?? 0.3;
  uni.fractalThickness = layer.fractalThickness ?? 0.02;
  uni.lissajousFreqX = layer.lissajousFreqX ?? 3;
  uni.lissajousFreqY = layer.lissajousFreqY ?? 4;
  uni.lissajousSpeed = layer.lissajousSpeed ?? 0.2;
  uni.lissajousThickness = layer.lissajousThickness ?? 0.03;
  uni.layerSymmetryOffsetSpeed = layer.layerSymmetryOffsetSpeed ?? 0;
}

export function applyGalleryWallStack(uniformLayers, wallIndex, patternNameToIndex, colorModeIndex, globalParams, renderTimeMs, blendSpeedFactor) {
  const wall = getGalleryWallStacksForRender(renderTimeMs, blendSpeedFactor)[wallIndex];
  if (!wall || !uniformLayers || !patternNameToIndex) return wall;

  for (let i = 0; i < 4; i++) {
    const cfg = wall.layers[i];
    const uni = uniformLayers[i];
    const globalLayer = globalParams[`layer${i + 1}`];
    if (!cfg || !uni || !globalLayer) continue;

    copyLayerParamsToUniform(uni, { ...globalLayer, ...cfg });

    uni.patternType = patternNameToIndex[cfg.patternType] ?? 0;
    uni.blendTargetType = patternNameToIndex[cfg.blendTargetType ?? cfg.patternType] ?? uni.patternType;
    uni.blendAmount = cfg.blendAmount != null ? cfg.blendAmount : 1;
    uni.colorMode = colorModeIndex[cfg.colorMode] ?? 0;
    uni.blendTargetColorMode = colorModeIndex[cfg.blendTargetColorMode ?? cfg.colorMode] ?? uni.colorMode;
    uni.symmetry = cfg.symmetry ?? globalLayer.symmetry ?? 1;
    uni.distortionStrength = cfg.distortion ?? globalLayer.distortion ?? globalLayer.distortionStrength ?? 0;
  }

  return wall;
}

/** Apply per-wall visual mode + global color overrides for gallery face passes. */
export function applyGalleryWallModes(shaderUniforms, wallIndex, colorModeIndex, visualModeIndex = VISUAL_MODE_INDEX, renderTimeMs, blendSpeedFactor) {
  const wall = getGalleryWallStacksForRender(renderTimeMs, blendSpeedFactor)[wallIndex];
  if (!wall || !shaderUniforms) return wall;

  const transitioning =
    wall.visualModeBlend != null && wall.visualModeBlend < 0.999 && wall.visualModeFrom != null;

  if (transitioning) {
    const fromIdx = visualModeIndex[wall.visualModeFrom] ?? 0;
    const toIdx = visualModeIndex[wall.visualModeTo ?? wall.visualMode] ?? fromIdx;
    if (shaderUniforms.u_visualModeFromIndex) shaderUniforms.u_visualModeFromIndex.value = fromIdx;
    if (shaderUniforms.u_visualModeToIndex) shaderUniforms.u_visualModeToIndex.value = toIdx;
    if (shaderUniforms.u_visualModeBlend) shaderUniforms.u_visualModeBlend.value = wall.visualModeBlend;
    if (shaderUniforms.u_forceGlobalColor) shaderUniforms.u_forceGlobalColor.value = 0;
  } else if (wall.visualMode != null) {
    const modeIdx = visualModeIndex[wall.visualMode] ?? 0;
    if (shaderUniforms.u_visualModeFromIndex) shaderUniforms.u_visualModeFromIndex.value = modeIdx;
    if (shaderUniforms.u_visualModeToIndex) shaderUniforms.u_visualModeToIndex.value = modeIdx;
    if (shaderUniforms.u_visualModeBlend) shaderUniforms.u_visualModeBlend.value = 1;

    const wallColorIdx =
      wall.globalColorMode != null && colorModeIndex
        ? colorModeIndex[wall.globalColorMode] ?? 0
        : null;

    if (wallColorIdx != null && shaderUniforms.u_globalColorMode) {
      shaderUniforms.u_globalColorMode.value = wallColorIdx;
    }
    if (wall.forceGlobalColor != null && shaderUniforms.u_forceGlobalColor) {
      shaderUniforms.u_forceGlobalColor.value = wall.forceGlobalColor ? 1 : 0;
    }
  }

  if (wall.pixelationFactor != null && shaderUniforms.u_pixelationFactor) {
    shaderUniforms.u_pixelationFactor.value = wall.pixelationFactor;
  }
  if (wall.asciiCharSize != null && shaderUniforms.u_asciiCharSize) {
    shaderUniforms.u_asciiCharSize.value = wall.asciiCharSize;
  }

  return wall;
}

export function createGalleryFaceTargets(THREE, canvasWidth, canvasHeight, options, scale = GALLERY_RENDER_SCALE) {
  const heightOpts = {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
  };
  return Array.from({ length: GALLERY_FACE_COUNT }, (_, faceIndex) => {
    const { w, h } = getGalleryFaceRenderSize(faceIndex, canvasWidth, canvasHeight, scale);
    return {
      w,
      h,
      fbA: new THREE.WebGLRenderTarget(w, h, options),
      fbB: new THREE.WebGLRenderTarget(w, h, options),
      fbIdx: 0,
      outA: new THREE.WebGLRenderTarget(w, h, options),
      outB: new THREE.WebGLRenderTarget(w, h, options),
      heightMap: new THREE.WebGLRenderTarget(w, h, heightOpts),
      displayMap: new THREE.WebGLRenderTarget(w, h, heightOpts),
      latestTexture: null,
      blendFlip: true,
    };
  });
}

export function resizeGalleryFaceTargets(targets, canvasWidth, canvasHeight, scale = GALLERY_RENDER_SCALE) {
  if (!targets) return;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const { w, h } = getGalleryFaceRenderSize(i, canvasWidth, canvasHeight, scale);
    t.w = w;
    t.h = h;
    t.fbA.setSize(w, h);
    t.fbB.setSize(w, h);
    t.outA.setSize(w, h);
    t.outB.setSize(w, h);
    t.heightMap?.setSize(w, h);
    t.displayMap?.setSize(w, h);
  }
}

export function disposeGalleryFaceTargets(targets) {
  if (!targets) return;
  for (const t of targets) {
    t.fbA.dispose();
    t.fbB.dispose();
    t.outA.dispose();
    t.outB.dispose();
    t.heightMap?.dispose();
    t.displayMap?.dispose();
  }
}
