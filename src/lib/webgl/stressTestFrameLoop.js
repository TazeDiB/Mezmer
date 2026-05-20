/**
 * Stress-test render loop: N independent pattern RTs per frame.
 */
import * as THREE from 'three';
import { COLOR_MODE_INDEX, VISUAL_MODE_INDEX } from './constants.js';
import { copyAccumulatedTimesTo } from '../galleryStack.js';
import {
  getStressTestObjectCount,
  ensureStressTileTargetPool,
  ensureStressTileStatePool,
  applyStressTileLayerUniforms,
  applyStressTileModes,
  isParticleStressMode,
} from '../stressTest.js';
import { blitPatternHeightMap } from '../galleryDisplacement.js';
import { updateStressFlyCamera } from '../stressTestScene.js';
import { updateStressParticleMotion } from '../stressTestParticles.js';

const HALF_FLOAT_RT = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  stencilBuffer: false,
};

/**
 * Render N textured surfaces using the main shader pipeline.
 * @returns {{ tileOutputs: import('three').Texture[], activeCount: number }}
 */
export function runStressTestFrameLoop({
  nowMs,
  deltaSec,
  timeScale,
  containerRef,
  renderer,
  uniforms,
  params,
  shaderScene,
  shaderCamera,
  blendScene,
  blendMaterial,
  stressTileTargetsRef,
  stressTileStateRef,
  patternNameToIndexRef,
  accumulatedTimesRef,
  stressTestMode,
  stressTestCount,
  stressStateRef,
  galleryInitializedRef,
  galleryWarmupRef,
  heightBlitSceneRef,
  heightBlitMeshRef,
  blitCameraRef,
}) {
  galleryInitializedRef.current = false;
  galleryWarmupRef.current = false;

  const patternMap = patternNameToIndexRef.current ?? {};
  const count = getStressTestObjectCount(stressTestMode, stressTestCount);
  const canvasResW = containerRef.current?.clientWidth ?? 800;
  const canvasResH = containerRef.current?.clientHeight ?? 600;

  ensureStressTileTargetPool({
    THREE,
    targetsRef: stressTileTargetsRef,
    requiredCount: count,
    canvasWidth: canvasResW,
    canvasHeight: canvasResH,
    rtOptions: HALF_FLOAT_RT,
    mode: stressTestMode,
  });
  ensureStressTileStatePool(stressTileStateRef, count);

  const tileTargets = stressTileTargetsRef.current;
  const tileStates = stressTileStateRef.current;
  const stressState = stressStateRef?.current;
  const castleParts = stressState?.castleParts;
  const tileOutputs = [];

  if (!tileTargets?.length || !tileStates?.length) {
    return { tileOutputs, activeCount: count };
  }

  if (isParticleStressMode(stressTestMode) && stressState) {
    updateStressParticleMotion(stressState, deltaSec, timeScale);
  }

  const savedResolution = uniforms.u_resolution.value.clone();
  const savedIntegrated = uniforms.u_integratedTime.value;
  const savedUvScale = uniforms.u_uvScale.value;
  const savedVisualFrom = uniforms.u_visualModeFromIndex?.value;
  const savedVisualTo = uniforms.u_visualModeToIndex?.value;
  const savedVisualBlend = uniforms.u_visualModeBlend?.value;
  const savedGlobalColor = uniforms.u_globalColorMode?.value;
  const savedForceGlobal = uniforms.u_forceGlobalColor?.value;
  const savedMainTimes = accumulatedTimesRef.current.map((slot) => ({ ...slot }));

  if (uniforms.u_galleryFaceIndex) uniforms.u_galleryFaceIndex.value = -1;

  for (let tileIndex = 0; tileIndex < count; tileIndex++) {
    const target = tileTargets[tileIndex];
    const tileState = tileStates[tileIndex];
    if (!target || !tileState) continue;

    const partType =
      castleParts?.[tileIndex]?.type ?? (isParticleStressMode(stressTestMode) ? 'particle' : null);

    const { colorIdx: tileColorIdx } =
      applyStressTileModes(uniforms, tileIndex, VISUAL_MODE_INDEX, COLOR_MODE_INDEX, partType) ??
      {};

    applyStressTileLayerUniforms(
      uniforms.u_layers.value,
      tileIndex,
      params,
      patternMap,
      COLOR_MODE_INDEX,
      partType,
      tileColorIdx
    );

    for (let layerIndex = 0; layerIndex < 4; layerIndex++) {
      const layerUni = uniforms.u_layers.value[layerIndex];
      if (layerUni) layerUni.accumulatedSymmetryAngle = tileState.symmetry[layerIndex];
    }

    copyAccumulatedTimesTo(accumulatedTimesRef.current, tileState.times);

    uniforms.u_integratedTime.value = tileState.integrated + tileIndex * 1.15;
    uniforms.u_accumulatedTimes.value = accumulatedTimesRef.current;
    uniforms.u_resolution.value.set(target.w, target.h);
    uniforms.u_uvScale.value = params.uvScale ?? 0.8;

    if (uniforms.u_galleryFaceSeed) {
      uniforms.u_galleryFaceSeed.value = 1.7 + tileIndex * 2.31;
    }

    tileState.integrated += deltaSec * timeScale;

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
      const blendUniforms = blendMaterial.uniforms;
      blendUniforms.u_textureA.value = blendRead.texture;
      blendUniforms.u_textureB.value = fbWrite.texture;
      if (blendUniforms.u_blendFactor && blendUniforms.u_blendFactor.value !== 1) {
        blendUniforms.u_blendFactor.value = 1;
      }
    }

    renderer.setRenderTarget(blendWrite);
    renderer.clear();
    renderer.render(blendScene, shaderCamera);
    target.blendFlip = !target.blendFlip;
    target.latestTexture = blendWrite.texture;
    tileOutputs[tileIndex] = blendWrite.texture;

    if (
      params.patternDisplacementEnabled &&
      heightBlitSceneRef?.current &&
      heightBlitMeshRef?.current &&
      blitCameraRef?.current &&
      target.heightMap
    ) {
      blitPatternHeightMap(
        renderer,
        heightBlitSceneRef.current,
        blitCameraRef.current,
        heightBlitMeshRef.current,
        blendWrite.texture,
        target.heightMap
      );
    }

    const layerConfigs = [params.layer1, params.layer2, params.layer3, params.layer4];
    for (let layerIndex = 0; layerIndex < 4; layerIndex++) {
      const layerParams = layerConfigs[layerIndex];
      if (!layerParams) continue;
      const times = tileState.times[layerIndex];
      const symmetrySpeed = layerParams.layerSymmetryOffsetSpeed ?? 0;
      times.turing += deltaSec * (layerParams.turingSpeed ?? 0) * timeScale;
      times.spiralNoise += deltaSec * (layerParams.spiralNoiseSpeed ?? 0) * timeScale;
      times.flow += deltaSec * (layerParams.flowSpeed ?? 0) * timeScale;
      times.cube += deltaSec * (0.2 + (layerParams.cubeRotationSpeed ?? 0)) * timeScale;
      times.smoothSpiral += deltaSec * (layerParams.smoothSpiralSpeed ?? 0) * timeScale;
      tileState.symmetry[layerIndex] += deltaSec * symmetrySpeed * timeScale;
    }
  }

  uniforms.u_integratedTime.value = savedIntegrated;
  uniforms.u_uvScale.value = savedUvScale;
  uniforms.u_resolution.value.copy(savedResolution);
  if (uniforms.u_visualModeFromIndex && savedVisualFrom != null) {
    uniforms.u_visualModeFromIndex.value = savedVisualFrom;
  }
  if (uniforms.u_visualModeToIndex && savedVisualTo != null) {
    uniforms.u_visualModeToIndex.value = savedVisualTo;
  }
  if (uniforms.u_visualModeBlend != null && savedVisualBlend != null) {
    uniforms.u_visualModeBlend.value = savedVisualBlend;
  }
  if (uniforms.u_globalColorMode && savedGlobalColor != null) {
    uniforms.u_globalColorMode.value = savedGlobalColor;
  }
  if (uniforms.u_forceGlobalColor != null && savedForceGlobal != null) {
    uniforms.u_forceGlobalColor.value = savedForceGlobal;
  }
  copyAccumulatedTimesTo(accumulatedTimesRef.current, savedMainTimes);
  uniforms.u_accumulatedTimes.value = accumulatedTimesRef.current;

  return { tileOutputs, activeCount: count };
}

export function renderStressTestScene({ renderer, stressState, deltaSec }) {
  if (!renderer || !stressState?.scene || !stressState?.camera) return;
  if (stressState.mode === 'cubes3d' || stressState.mode === 'castle' || stressState.mode === 'particles3d') {
    updateStressFlyCamera(stressState, deltaSec);
  }
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(stressState.scene, stressState.camera);
}
