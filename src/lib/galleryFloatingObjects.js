/** Floating gallery props — cube, cone, sphere with independent generated textures. */
import { VISUAL_MODE_INDEX } from '../constants/index.js';
import {
  copyAccumulatedTimesTo,
  copyLayerParamsToUniform,
  cloneWallStacks,
  normalizeWallStack,
  interpolateWallStacks,
  getGalleryTransitionDuration,
  hasGalleryWallTransition,
  isGalleryTransitionActive,
  isGalleryWallTransitionPendingCommit,
} from './galleryStack.js';
import { createHeightMapTarget, HEIGHT_MAP_RT_OPTIONS } from './galleryDisplacement.js';

export const FLOATING_OBJECT_COUNT = 3;
export const FLOATING_OBJECTS_PER_FRAME = 1;
export const FLOATING_OBJECT_RENDER_SCALE = 0.32;
export const FLOATING_OBJECT_SEEDS = [11.31, 14.73, 18.19];

export const DEFAULT_FLOATING_OBJECT_STACKS = [
  {
    timeOffset: 14.2,
    uvScale: 1.05,
    visualMode: 'hologram',
    globalColorMode: 'cyberpunk',
    forceGlobalColor: true,
    layers: [
      { patternType: 'plasma', colorMode: 'cyberpunk', symmetry: 5, blendAmount: 1 },
      { patternType: 'fractal', colorMode: 'cyberpunk', symmetry: 4, blendAmount: 1 },
      { patternType: 'hyperVoronoi', colorMode: 'cyberpunk', symmetry: 6, blendAmount: 1 },
      { patternType: 'invisible', colorMode: 'cyberpunk', blendAmount: 0 },
    ],
  },
  {
    timeOffset: 27.8,
    uvScale: 0.92,
    visualMode: 'glow',
    globalColorMode: 'vaporwave',
    forceGlobalColor: true,
    layers: [
      { patternType: 'aurora', colorMode: 'vaporwave', symmetry: 4, blendAmount: 1 },
      { patternType: 'lissajous', colorMode: 'vaporwave', symmetry: 3, blendAmount: 1 },
      { patternType: 'kaleidoWave', colorMode: 'vaporwave', symmetry: 8, blendAmount: 1 },
      { patternType: 'invisible', colorMode: 'vaporwave', blendAmount: 0 },
    ],
  },
  {
    timeOffset: 41.5,
    uvScale: 1.15,
    visualMode: 'thermal',
    globalColorMode: 'fire',
    forceGlobalColor: true,
    layers: [
      { patternType: 'hyperTuring', colorMode: 'fire', symmetry: 3, blendAmount: 1 },
      { patternType: 'spiralArms', colorMode: 'fire', symmetry: 5, blendAmount: 1 },
      { patternType: 'reactionDiff', colorMode: 'fire', symmetry: 4, blendAmount: 1 },
      { patternType: 'invisible', colorMode: 'fire', blendAmount: 0 },
    ],
  },
];

let activeFloatingObjectStacks = cloneWallStacks(DEFAULT_FLOATING_OBJECT_STACKS);
let floatingTransition = null;

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

function finalizeCommittedWallStack(wall) {
  const globalColor = wall.globalColorMode;
  return {
    ...wall,
    visualModeFrom: undefined,
    visualModeTo: undefined,
    visualModeBlend: undefined,
    layers: wall.layers.map((layer) => {
      const patternType = layer.patternType;
      const colorMode =
        wall.forceGlobalColor && globalColor ? globalColor : layer.colorMode;
      return {
        ...layer,
        patternType,
        colorMode,
        blendTargetType: 'invisible',
        blendTargetColorMode: colorMode,
        blendAmount: 0,
      };
    }),
  };
}

function getFloatingTransitionProgress(now, blendSpeedFactor) {
  if (!floatingTransition) return null;
  const duration =
    floatingTransition.duration ?? getGalleryTransitionDuration(blendSpeedFactor);
  const rawT = Math.min(1, (now - floatingTransition.startTime) / duration);
  return { rawT, dt: smoothStep(rawT) };
}

export function getFloatingObjectStacks() {
  return activeFloatingObjectStacks;
}

export function resetFloatingObjectStacks() {
  activeFloatingObjectStacks = cloneWallStacks(DEFAULT_FLOATING_OBJECT_STACKS);
  floatingTransition = null;
}

export function setFloatingObjectStacks(stacks) {
  activeFloatingObjectStacks = cloneWallStacks(stacks).map(normalizeWallStack);
  floatingTransition = null;
}

export function startFloatingObjectTransition(toStacks, blendSpeedFactor = 1) {
  floatingTransition = {
    from: cloneWallStacks(activeFloatingObjectStacks).map(normalizeWallStack),
    to: cloneWallStacks(toStacks).map(normalizeWallStack),
    startTime: performance.now(),
    duration: getGalleryTransitionDuration(blendSpeedFactor),
  };
}

export function hasFloatingObjectTransition() {
  return floatingTransition != null;
}

export function isFloatingObjectTransitionActive(
  now = performance.now(),
  blendSpeedFactor = 1
) {
  const progress = getFloatingTransitionProgress(now, blendSpeedFactor);
  return progress != null && progress.rawT < 1;
}

export function isFloatingObjectTransitionPendingCommit(
  now = performance.now(),
  blendSpeedFactor = 1
) {
  const progress = getFloatingTransitionProgress(now, blendSpeedFactor);
  return progress != null && progress.rawT >= 1;
}

/** Interpolate floating stacks for rendering; does not commit. */
export function peekFloatingObjectStacksForRender(
  now = performance.now(),
  blendSpeedFactor = 1
) {
  if (!floatingTransition) return activeFloatingObjectStacks;
  const progress = getFloatingTransitionProgress(now, blendSpeedFactor);
  if (!progress) return activeFloatingObjectStacks;
  return interpolateWallStacks(floatingTransition.from, floatingTransition.to, progress.dt);
}

/** Commit float transition when rawT >= 1; returns true if stacks were finalized. */
export function commitFloatingObjectTransition(now = performance.now(), blendSpeedFactor = 1) {
  const progress = getFloatingTransitionProgress(now, blendSpeedFactor);
  if (!progress || progress.rawT < 1) return false;
  activeFloatingObjectStacks = cloneWallStacks(floatingTransition.to).map(
    finalizeCommittedWallStack
  );
  floatingTransition = null;
  return true;
}

/** @deprecated use peekFloatingObjectStacksForRender — no longer commits */
export function getFloatingObjectStacksForRender(now = performance.now(), blendSpeedFactor = 1) {
  return peekFloatingObjectStacksForRender(now, blendSpeedFactor);
}

export function isGalleryContentTransitionActive() {
  return hasGalleryWallTransition() || hasFloatingObjectTransition();
}

export function getFloatingObjectRenderSize(canvasWidth, canvasHeight, scale = FLOATING_OBJECT_RENDER_SCALE) {
  const dim = Math.max(192, Math.floor(Math.min(canvasWidth, canvasHeight) * scale));
  return { w: dim, h: dim };
}

export function createFloatingObjectState() {
  return Array.from({ length: FLOATING_OBJECT_COUNT }, (_, index) => ({
    integrated: FLOATING_OBJECT_SEEDS[index] * 8.5,
    symmetry: [index * 0.35, index * 0.5, index * 0.65, index * 0.8],
    times: Array.from({ length: 4 }, (_, layer) => ({
      turing: index * 2.1 + layer * 1.2,
      spiralNoise: index * 1.8 + layer * 0.9,
      flow: index * 1.4 + layer * 0.8,
      cube: index * 1.1 + layer * 1.3,
      smoothSpiral: index * 1.6 + layer * 0.7,
    })),
  }));
}

export function applyFloatingObjectStack(
  uniformLayers,
  objectIndex,
  patternNameToIndex,
  colorModeIndex,
  globalParams,
  renderTimeMs,
  blendSpeedFactor
) {
  const stack = peekFloatingObjectStacksForRender(renderTimeMs, blendSpeedFactor)[objectIndex];
  if (!stack || !uniformLayers || !patternNameToIndex) return stack;

  for (let i = 0; i < 4; i++) {
    const cfg = stack.layers[i];
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

  return stack;
}

export function applyFloatingObjectModes(
  shaderUniforms,
  objectIndex,
  colorModeIndex,
  visualModeIndex = VISUAL_MODE_INDEX,
  renderTimeMs,
  blendSpeedFactor
) {
  const stack = peekFloatingObjectStacksForRender(renderTimeMs, blendSpeedFactor)[objectIndex];
  if (!stack || !shaderUniforms) return stack;

  const transitioning = floatingTransition != null && stack.visualModeFrom != null;

  if (transitioning) {
    const fromIdx = visualModeIndex[stack.visualModeFrom] ?? 0;
    const toIdx = visualModeIndex[stack.visualModeTo ?? stack.visualMode] ?? fromIdx;
    if (shaderUniforms.u_visualModeFromIndex) shaderUniforms.u_visualModeFromIndex.value = fromIdx;
    if (shaderUniforms.u_visualModeToIndex) shaderUniforms.u_visualModeToIndex.value = toIdx;
    if (shaderUniforms.u_visualModeBlend) shaderUniforms.u_visualModeBlend.value = stack.visualModeBlend;
    if (shaderUniforms.u_forceGlobalColor) shaderUniforms.u_forceGlobalColor.value = 0;
  } else if (stack.visualMode != null) {
    const modeIdx = visualModeIndex[stack.visualMode] ?? 0;
    if (shaderUniforms.u_visualModeFromIndex) shaderUniforms.u_visualModeFromIndex.value = modeIdx;
    if (shaderUniforms.u_visualModeToIndex) shaderUniforms.u_visualModeToIndex.value = modeIdx;
    if (shaderUniforms.u_visualModeBlend) shaderUniforms.u_visualModeBlend.value = 1;

    const colorIdx =
      stack.globalColorMode != null && colorModeIndex
        ? colorModeIndex[stack.globalColorMode] ?? 0
        : null;
    if (colorIdx != null && shaderUniforms.u_globalColorMode) {
      shaderUniforms.u_globalColorMode.value = colorIdx;
    }
    if (stack.forceGlobalColor != null && shaderUniforms.u_forceGlobalColor) {
      shaderUniforms.u_forceGlobalColor.value = stack.forceGlobalColor ? 1 : 0;
    }
  }

  return stack;
}

export function createFloatingObjectTargets(THREE, canvasWidth, canvasHeight, options, scale = FLOATING_OBJECT_RENDER_SCALE) {
  const { w, h } = getFloatingObjectRenderSize(canvasWidth, canvasHeight, scale);
  return Array.from({ length: FLOATING_OBJECT_COUNT }, () => ({
    w,
    h,
    fbA: new THREE.WebGLRenderTarget(w, h, options),
    fbB: new THREE.WebGLRenderTarget(w, h, options),
    fbIdx: 0,
    outA: new THREE.WebGLRenderTarget(w, h, options),
    outB: new THREE.WebGLRenderTarget(w, h, options),
    heightMap: createHeightMapTarget(THREE, w, h, HEIGHT_MAP_RT_OPTIONS),
    latestTexture: null,
    blendFlip: true,
  }));
}

export function resizeFloatingObjectTargets(targets, canvasWidth, canvasHeight, scale = FLOATING_OBJECT_RENDER_SCALE) {
  if (!targets) return;
  const { w, h } = getFloatingObjectRenderSize(canvasWidth, canvasHeight, scale);
  for (const t of targets) {
    t.w = w;
    t.h = h;
    t.fbA.setSize(w, h);
    t.fbB.setSize(w, h);
    t.outA.setSize(w, h);
    t.outB.setSize(w, h);
    t.heightMap?.setSize(w, h);
  }
}

export function disposeFloatingObjectTargets(targets) {
  if (!targets) return;
  for (const t of targets) {
    t.fbA.dispose();
    t.fbB.dispose();
    t.outA.dispose();
    t.outB.dispose();
    t.heightMap?.dispose();
  }
}

/**
 * Run feedback + blend passes for one floating-object texture.
 * Uses u_galleryFaceIndex = -1 so the shader renders flat UV space (wraps on mesh).
 */
export function renderFloatingObjectTexture({
  renderer,
  shaderScene,
  shaderCamera,
  blendScene,
  blendMaterial,
  uniforms,
  objectIndex,
  objectState,
  target,
  patternNameToIndex,
  colorModeIndex,
  visualModeIndex,
  globalParams,
  je,
  Je,
  renderTimeMs,
  blendSpeedFactor,
}) {
  const stack = applyFloatingObjectStack(
    uniforms.u_layers.value,
    objectIndex,
    patternNameToIndex,
    colorModeIndex,
    globalParams,
    renderTimeMs,
    blendSpeedFactor
  );
  applyFloatingObjectModes(uniforms, objectIndex, colorModeIndex, visualModeIndex, renderTimeMs, blendSpeedFactor);

  for (let layer = 0; layer < 4; layer++) {
    const layerUni = uniforms.u_layers.value[layer];
    if (layerUni) layerUni.accumulatedSymmetryAngle = objectState.symmetry[layer];
  }
  copyAccumulatedTimesTo(je, objectState.times);

  uniforms.u_galleryFaceIndex && (uniforms.u_galleryFaceIndex.value = -1);
  uniforms.u_galleryFaceSeed && (uniforms.u_galleryFaceSeed.value = FLOATING_OBJECT_SEEDS[objectIndex]);
  uniforms.u_integratedTime.value = objectState.integrated + (stack?.timeOffset ?? 0);
  uniforms.u_accumulatedTimes.value = je;
  uniforms.u_resolution.value.set(target.w, target.h);
  uniforms.u_uvScale.value = stack?.uvScale ?? globalParams.uvScale ?? 0.8;

  const fbRead = target.fbIdx === 0 ? target.fbA : target.fbB;
  const fbWrite = target.fbIdx === 0 ? target.fbB : target.fbA;
  uniforms.u_feedback_texture.value = fbRead.texture;
  renderer.setRenderTarget(fbWrite);
  renderer.clear();
  renderer.render(shaderScene, shaderCamera);
  target.fbIdx = 1 - target.fbIdx;

  const blendRead = target.blendFlip ? target.outA : target.outB;
  const blendWrite = target.blendFlip ? target.outB : target.outA;
  if (blendMaterial?.uniforms) {
    blendMaterial.uniforms.u_textureA.value = blendRead.texture;
    blendMaterial.uniforms.u_textureB.value = fbWrite.texture;
    if (blendMaterial.uniforms.u_blendFactor) blendMaterial.uniforms.u_blendFactor.value = 1;
  }
  renderer.setRenderTarget(blendWrite);
  renderer.clear();
  renderer.render(blendScene, shaderCamera);
  target.blendFlip = !target.blendFlip;
  target.latestTexture = blendWrite.texture;

  for (let layer = 0; layer < 4; layer++) {
    const layerUni = uniforms.u_layers.value[layer];
    if (layerUni && Je) layerUni.accumulatedSymmetryAngle = Je[layer];
  }

  return blendWrite.texture;
}
