/**
 * Stress-test particle field — each particle owns a full pattern RT (sprite billboard).
 */
import * as THREE from 'three';
import { computeStressGrid } from './stressTest.js';

const DEFAULT_PARTICLE_SIZE = 0.42;

function createSpriteMaterial() {
  return new THREE.SpriteMaterial({
    map: null,
    toneMapped: false,
    transparent: true,
    depthWrite: true,
  });
}

export function createStressParticleScene(maxCount) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
  camera.rotation.order = 'YXZ';

  const particles = [];

  for (let i = 0; i < maxCount; i++) {
    const material = createSpriteMaterial();
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.frustumCulled = false;
    scene.add(sprite);
    particles.push({
      sprite,
      material,
      anchor: [0, 0, 0],
      orbitRadius: 1,
      orbitSpeed: 0.4,
      driftSpeed: 0.25,
      phase: i * 1.73,
      size: DEFAULT_PARTICLE_SIZE,
    });
  }

  return {
    scene,
    camera,
    particles,
    mode: 'particles3d',
    simTime: 0,
    flySpawn: { x: 0, y: 2.2, z: 10, yaw: 0, pitch: -0.1 },
  };
}

export function layoutStressParticles(state, count) {
  if (!state || state.mode !== 'particles3d') return;

  const { cols, rows } = computeStressGrid(count);
  const span = Math.max(cols, rows, 1);
  const spread = span * 0.55 + 2.5;
  const size = Math.max(0.12, DEFAULT_PARTICLE_SIZE * (6 / Math.max(6, Math.sqrt(count))));

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (i >= count) {
      p.sprite.visible = false;
      continue;
    }

    const golden = i * 2.399963;
    const yBand = ((i % rows) / Math.max(rows - 1, 1) - 0.5) * spread * 1.2;
    const radius = spread * (0.35 + ((i % cols) + 1) / (cols + 1) * 0.55);

    p.anchor = [
      Math.cos(golden) * radius,
      yBand + Math.sin(golden * 0.7) * 0.8,
      Math.sin(golden) * radius,
    ];
    p.orbitRadius = 0.75 + (i % 5) * 0.22;
    p.driftRadius = 1.1 + (i % 4) * 0.35;
    p.orbitSpeed = 0.45 + (i % 7) * 0.11;
    p.driftSpeed = 0.28 + (i % 4) * 0.08;
    p.phase = i * 1.91 + golden;
    p.size = size;
    p.sprite.scale.set(size, size, 1);
    p.sprite.visible = true;
  }

  state.flySpawn = {
    x: 0,
    y: spread * 0.35 + 1.2,
    z: spread * 1.35 + 4,
    yaw: 0,
    pitch: -0.08,
  };
}

export function updateStressParticleMotion(state, deltaSec, timeScale = 1) {
  if (!state || state.mode !== 'particles3d') return;
  const dt = deltaSec * timeScale;
  if (!Number.isFinite(dt) || dt <= 0) return;

  state.simTime += dt;

  for (const p of state.particles) {
    if (!p.sprite.visible) continue;
    const t = state.simTime;
    const [ax, ay, az] = p.anchor;
    const orbitR = p.orbitRadius ?? 0.75;
    const driftR = p.driftRadius ?? orbitR * 1.4;

    const ox = orbitR * Math.cos(t * p.orbitSpeed + p.phase);
    const oy = orbitR * 0.65 * Math.sin(t * p.orbitSpeed * 1.25 + p.phase * 1.05);
    const oz = orbitR * Math.sin(t * p.orbitSpeed * 0.95 + p.phase * 0.8);

    const dx = driftR * Math.sin(t * p.driftSpeed + p.phase * 0.6);
    const dy = driftR * 0.45 * Math.cos(t * p.driftSpeed * 0.85 + p.phase * 1.2);
    const dz = driftR * Math.cos(t * p.driftSpeed * 1.15 + p.phase * 0.45);

    p.sprite.position.set(ax + ox + dx, ay + oy + dy, az + oz + dz);
  }
}

export function bindStressParticleTextures(state, textures, count) {
  if (!state?.particles || !textures) return;

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (i < count && textures[i]) {
      const tex = textures[i];
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      p.material.map = tex;
      p.material.needsUpdate = true;
    } else {
      p.material.map = null;
    }
  }
}

export function updateStressParticleSceneSize(state, width, height) {
  if (!state?.camera || width <= 0 || height <= 0) return;
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

export function disposeStressParticleScene(state) {
  if (!state) return;
  state.particles?.forEach((p) => {
    p.material.map = null;
    p.material.dispose();
    state.scene?.remove(p.sprite);
  });
  if (state.scene?.background?.isColor) {
    state.scene.background = null;
  }
}
