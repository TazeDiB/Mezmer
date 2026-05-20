/**
 * Three.js display scenes for stress-test modes (2D tile grid, 3D cubes, 3D castle).
 */
import * as THREE from 'three';
import {
  STRESS_TEST_MAX_OBJECTS,
  computeStressGrid,
} from './stressTest.js';
import { generateCastleParts, getCastleBounds } from './stressTestCastle.js';
import {
  bindDisplaceableMeshTextures,
  bindFacePatternTextures,
  createDisplaceableMesh,
  createGalleryWallDisplacedMaterial,
  createGalleryWallFlatMaterial,
  updateDisplacementStrength,
} from './galleryDisplacement.js';

const STRESS_DISPLACEMENT_SEGMENTS = 20;

export function createStressTestScene(mode, maxCount = STRESS_TEST_MAX_OBJECTS) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const meshes = [];
  /** @type {import('./galleryDisplacement.js').createDisplaceableMesh extends Function ? ReturnType<createDisplaceableMesh>[] : never} */
  const meshEntries = [];
  /** @type {THREE.MeshBasicMaterial[]} */
  const flatMaterials = [];
  /** @type {import('three').ShaderMaterial[]} */
  const displacedMaterials = [];

  if (mode === 'plane2d') {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    camera.position.z = 5;

    const planeGeo = new THREE.PlaneGeometry(1, 1, STRESS_DISPLACEMENT_SEGMENTS, STRESS_DISPLACEMENT_SEGMENTS);
    for (let i = 0; i < maxCount; i++) {
      const flat = createGalleryWallFlatMaterial({ side: THREE.DoubleSide });
      const displaced = createGalleryWallDisplacedMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(planeGeo, flat);
      mesh.visible = false;
      mesh.renderOrder = i;
      scene.add(mesh);
      meshes.push(mesh);
      flatMaterials.push(flat);
      displacedMaterials.push(displaced);
    }

    return { scene, camera, meshes, meshEntries, flatMaterials, displacedMaterials, mode: 'plane2d' };
  }

  if (mode === 'cubes3d' || mode === 'castle') {
    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
    camera.rotation.order = 'YXZ';

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    const key = new THREE.DirectionalLight(0xffffff, 0.65);
    key.position.set(4, 10, 6);
    scene.add(ambient, key);

    const brickGeo = new THREE.BoxGeometry(
      1,
      1,
      1,
      STRESS_DISPLACEMENT_SEGMENTS,
      STRESS_DISPLACEMENT_SEGMENTS,
      STRESS_DISPLACEMENT_SEGMENTS
    );
    for (let i = 0; i < maxCount; i++) {
      const entry = createDisplaceableMesh({
        geometry: brickGeo,
        displacementPreset: 'box',
        meshOptions: { frustumCulled: false },
      });
      entry.mesh.visible = false;
      scene.add(entry.mesh);
      meshes.push(entry.mesh);
      meshEntries.push(entry);
    }

    return {
      scene,
      camera,
      meshes,
      meshEntries,
      flatMaterials,
      displacedMaterials,
      mode,
      castleParts: [],
      flySpawn: null,
    };
  }

  return null;
}

export function layoutStressPlaneGrid(state, count, aspect = 1) {
  if (!state || state.mode !== 'plane2d') return;
  const { cols, rows } = computeStressGrid(count);
  const safeAspect = Math.max(0.25, aspect || 1);

  const fullW = 2 * safeAspect;
  const fullH = 2;
  const cellW = fullW / cols;
  const cellH = fullH / rows;
  const pad = 0.02;

  for (let i = 0; i < state.meshes.length; i++) {
    const mesh = state.meshes[i];
    if (i >= count) {
      mesh.visible = false;
      continue;
    }
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = -safeAspect + cellW * (col + 0.5);
    const cy = 1 - cellH * (row + 0.5);
    mesh.position.set(cx, cy, 0);
    mesh.scale.set(cellW * (1 - pad), cellH * (1 - pad), 1);
    mesh.visible = true;
  }

  state.camera.left = -safeAspect;
  state.camera.right = safeAspect;
  state.camera.top = 1;
  state.camera.bottom = -1;
  state.camera.updateProjectionMatrix();
}

export function layoutStressCubeGrid(state, count) {
  if (!state || state.mode !== 'cubes3d') return;
  const { cols, rows } = computeStressGrid(count);
  const spacing = 1.35;
  const gridW = (cols - 1) * spacing;
  const gridD = (rows - 1) * spacing;

  for (let i = 0; i < state.meshes.length; i++) {
    const mesh = state.meshes[i];
    if (i >= count) {
      mesh.visible = false;
      continue;
    }
    const col = i % cols;
    const row = Math.floor(i / cols);
    mesh.position.set(col * spacing - gridW * 0.5, 0, row * spacing - gridD * 0.5);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(1);
    mesh.visible = true;
  }

  const span = Math.max(cols, rows, 1);
  state.flySpawn = {
    x: 0,
    y: Math.max(1.6, span * 0.25 + 1.2),
    z: span * spacing * 0.45 + 2,
    yaw: 0,
    pitch: -0.12,
  };
}

export function layoutCastleScene(state, parts) {
  if (!state || state.mode !== 'castle' || !parts?.length) return;

  state.castleParts = parts;
  const { center, radius } = getCastleBounds(parts);

  for (let i = 0; i < state.meshes.length; i++) {
    const mesh = state.meshes[i];
    const part = parts[i];
    if (!part) {
      mesh.visible = false;
      continue;
    }

    mesh.position.set(part.position[0], part.position[1], part.position[2]);
    mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
    mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
    mesh.visible = true;
  }

  const [cx, cy, cz] = center;
  state.flySpawn = {
    x: cx,
    y: cy + 1.6,
    z: cz,
    yaw: 0,
    pitch: -0.08,
  };
  state.castleCenter = center;
  state.castleRadius = radius;
}

export function bindStressTileTextures(
  state,
  textures,
  tileTargets,
  count,
  { useHeightmap = false, displacementStrength = 0.12 } = {}
) {
  if (!state?.meshes || !textures) return;

  const displacedMats = [];

  for (let i = 0; i < state.meshes.length; i++) {
    const displayTexture = i < count ? textures[i] : null;
    const heightMapTexture = i < count ? tileTargets?.[i]?.heightMap?.texture ?? null : null;

    if (state.mode === 'plane2d') {
      const flat = state.flatMaterials?.[i];
      const displaced = state.displacedMaterials?.[i];
      const mesh = state.meshes[i];
      if (!flat || !mesh) continue;

      if (displayTexture) {
        bindFacePatternTextures(flat, displaced, {
          displayTexture,
          heightMapTexture,
          useHeightmap,
        });
        mesh.material = useHeightmap && displaced ? displaced : flat;
        if (displaced) displacedMats.push(displaced);
      } else {
        flat.map = null;
        mesh.material = flat;
      }
      continue;
    }

    const entry = state.meshEntries?.[i];
    if (!entry) continue;

    if (displayTexture) {
      bindDisplaceableMeshTextures(entry, {
        displayTexture,
        heightMapTexture,
        useHeightmap,
      });
      if (entry.displacedMaterial) displacedMats.push(entry.displacedMaterial);
    } else {
      bindDisplaceableMeshTextures(entry, { displayTexture: null, useHeightmap: false });
    }
  }

  if (useHeightmap && displacedMats.length) {
    updateDisplacementStrength(displacedMats, displacementStrength);
  }
}

export function updateStressTestSceneSize(state, width, height) {
  if (!state?.camera || width <= 0 || height <= 0) return;
  const aspect = width / height;
  if (state.mode === 'plane2d') {
    layoutStressPlaneGrid(state, state.activeCount ?? 1, aspect);
  } else if (state.mode === 'cubes3d') {
    state.camera.aspect = aspect;
    state.camera.updateProjectionMatrix();
    layoutStressCubeGrid(state, state.activeCount ?? 1);
  } else if (state.mode === 'castle') {
    state.camera.aspect = aspect;
    state.camera.updateProjectionMatrix();
    if (state.castleParts?.length) {
      layoutCastleScene(state, state.castleParts);
    }
  }
}

export function updateStressFlyCamera(state, deltaSec) {
  if (!state?.camera || !state.updateFly) return;
  state.updateFly(deltaSec);
}

export function disposeStressTestScene(state) {
  if (!state) return;

  state.meshEntries?.forEach((entry) => {
    entry.flatMaterial?.dispose();
    entry.displacedMaterial?.dispose();
  });

  state.flatMaterials?.forEach((mat) => {
    mat.map = null;
    mat.dispose();
  });
  state.displacedMaterials?.forEach((mat) => mat.dispose());

  if (state.meshes?.length) {
    state.meshes[0]?.geometry?.dispose();
  }
  state.meshes?.forEach((mesh) => {
    state.scene?.remove(mesh);
  });
  if (state.scene?.background?.isColor) {
    state.scene.background = null;
  }
}
