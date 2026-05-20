/**
 * Stress-test Three.js display scenes (2D tile grid, 3D cubes, 3D castle).
 */
import { useEffect, useRef } from 'react';
import {
  STRESS_TEST_MAX_OBJECTS,
  STRESS_TEST_MAX_PARTICLES,
  isCastleStressMode,
  isParticleStressMode,
  isStressTest3DMode,
  isStressTestMode,
  getStressTestObjectCount,
} from '../lib/stressTest.js';
import { generateCastleParts } from '../lib/stressTestCastle.js';
import { createFlyState, attachFlyControls } from '../lib/flyControls.js';
import {
  createStressTestScene,
  layoutStressPlaneGrid,
  layoutStressCubeGrid,
  layoutCastleScene,
  updateStressTestSceneSize,
  disposeStressTestScene,
} from '../lib/stressTestScene.js';
import {
  createStressParticleScene,
  layoutStressParticles,
  updateStressParticleMotion,
  updateStressParticleSceneSize,
  disposeStressParticleScene,
} from '../lib/stressTestParticles.js';

function attachStressFlyControls(containerRef, state) {
  if (
    !state?.camera ||
    (state.mode !== 'cubes3d' && state.mode !== 'castle' && state.mode !== 'particles3d')
  ) {
    return null;
  }

  const flyState = createFlyState(state.flySpawn ?? { x: 0, y: 1.6, z: 4, yaw: 0, pitch: 0 });
  const controls = attachFlyControls({
    getContainer: () => containerRef.current,
    getCanvas: () => containerRef.current?.querySelector('canvas') ?? null,
    camera: state.camera,
    flyState,
  });

  if (state.flySpawn) {
    controls.applySpawn(state.flySpawn);
  }

  state.updateFly = controls.update;
  state.flyControls = controls;
  return controls;
}

export function useStressTestMode(containerRef, stressTestMode, stressTestCount, stressStateRef) {
  const flyControlsRef = useRef(null);

  useEffect(() => {
    flyControlsRef.current?.dispose();
    flyControlsRef.current = null;

    if (!isStressTestMode(stressTestMode)) {
      if (stressStateRef.current?.scene) {
        if (isParticleStressMode(stressStateRef.current.mode)) {
          disposeStressParticleScene(stressStateRef.current);
        } else {
          disposeStressTestScene(stressStateRef.current);
        }
      }
      stressStateRef.current = { enabled: false, mode: 'off' };
      return undefined;
    }

    const objectCount = getStressTestObjectCount(stressTestMode, stressTestCount);

    if (isParticleStressMode(stressTestMode)) {
      const state = createStressParticleScene(STRESS_TEST_MAX_PARTICLES);
      state.enabled = true;
      state.activeCount = objectCount;

      const container = containerRef.current;
      const w = container?.clientWidth ?? window.innerWidth;
      const h = container?.clientHeight ?? window.innerHeight;
      const aspect = w / Math.max(h, 1);

      layoutStressParticles(state, objectCount);
      updateStressParticleMotion(state, 1 / 60, 1);
      state.camera.aspect = aspect;
      state.camera.updateProjectionMatrix();
      flyControlsRef.current = attachStressFlyControls(containerRef, state);
      stressStateRef.current = state;

      return () => {
        flyControlsRef.current?.dispose();
        flyControlsRef.current = null;
        disposeStressParticleScene(state);
        if (stressStateRef.current === state) {
          stressStateRef.current = { enabled: false, mode: 'off' };
        }
      };
    }

    const sceneMode = isCastleStressMode(stressTestMode)
      ? 'castle'
      : stressTestMode === 'cubes3d'
        ? 'cubes3d'
        : 'plane2d';

    const poolSize = isCastleStressMode(stressTestMode)
      ? STRESS_TEST_MAX_OBJECTS
      : objectCount;

    const state = createStressTestScene(sceneMode, poolSize);
    if (!state) {
      stressStateRef.current = { enabled: false, mode: 'off' };
      return undefined;
    }

    state.enabled = true;
    state.activeCount = objectCount;

    const container = containerRef.current;
    const w = container?.clientWidth ?? window.innerWidth;
    const h = container?.clientHeight ?? window.innerHeight;
    const aspect = w / Math.max(h, 1);

    if (sceneMode === 'plane2d') {
      layoutStressPlaneGrid(state, objectCount, aspect);
    } else if (sceneMode === 'cubes3d') {
      layoutStressCubeGrid(state, objectCount);
      state.camera.aspect = aspect;
      state.camera.updateProjectionMatrix();
      flyControlsRef.current = attachStressFlyControls(containerRef, state);
    } else if (sceneMode === 'castle') {
      const parts = generateCastleParts(objectCount);
      layoutCastleScene(state, parts);
      state.camera.aspect = aspect;
      state.camera.updateProjectionMatrix();
      flyControlsRef.current = attachStressFlyControls(containerRef, state);
    }

    stressStateRef.current = state;

    return () => {
      flyControlsRef.current?.dispose();
      flyControlsRef.current = null;
      disposeStressTestScene(state);
      if (stressStateRef.current === state) {
        stressStateRef.current = { enabled: false, mode: 'off' };
      }
    };
  }, [containerRef, stressStateRef, stressTestMode, stressTestCount]);

  useEffect(() => {
    const state = stressStateRef.current;
    if (!state?.enabled || !state.scene) return;

    const objectCount = getStressTestObjectCount(stressTestMode, stressTestCount);
    state.activeCount = objectCount;

    if (isCastleStressMode(stressTestMode)) {
      layoutCastleScene(state, generateCastleParts(objectCount));
      state.flyControls?.applySpawn(state.flySpawn);
    } else if (stressTestMode === 'cubes3d') {
      layoutStressCubeGrid(state, objectCount);
    } else if (stressTestMode === 'particles3d') {
      layoutStressParticles(state, objectCount);
      updateStressParticleMotion(state, 1 / 60, 1);
      state.flyControls?.applySpawn(state.flySpawn);
    }

    const container = containerRef.current;
    const w = container?.clientWidth ?? window.innerWidth;
    const h = container?.clientHeight ?? window.innerHeight;
    if (state.mode === 'particles3d') {
      updateStressParticleSceneSize(state, w, h);
    } else {
      updateStressTestSceneSize(state, w, h);
    }
  }, [containerRef, stressStateRef, stressTestMode, stressTestCount]);
}

export function isStressTestFlyMode(mode) {
  return isStressTest3DMode(mode);
}
