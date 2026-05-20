/**
 * 3D gallery room — six walls, each with its own independent pattern stack texture.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GALLERY_ROOM } from '../lib/galleryMapping.js';
import { GALLERY_FACE_COUNT } from '../lib/galleryStack.js';
import {
  DEFAULT_DISPLACEMENT_SEGMENTS,
  AUDIO_DISPLACEMENT_PULSE,
  createDisplaceableMesh,
  addDisplaceableMeshToScene,
  collectDisplacementMaterials,
  updateDisplacementStrength,
  createGalleryWallFlatMaterials,
  createGalleryWallDisplacedMaterials,
} from '../lib/galleryDisplacement.js';
import {
  createGalleryRoomMeshes,
  setWallMeshDisplacement,
  disposeGalleryRoomMeshes,
} from '../lib/galleryRoomMeshes.js';

const { width: ROOM_WIDTH, height: ROOM_HEIGHT, depth: ROOM_DEPTH } = GALLERY_ROOM;
const MOVE_SPEED = 5.5;
const VERT_SPEED = 3.5;
const MOUSE_SENSITIVITY = 0.0022;
const MAX_MOUSE_DELTA_PER_FRAME = 90;
const POINTER_LOCK_SETTLE_MS = 120;
const DEFAULT_SPAWN = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0 };
const DISPLACEMENT_SEGMENTS = DEFAULT_DISPLACEMENT_SEGMENTS;

function createFaceMaterials() {
  return createGalleryWallFlatMaterials();
}

function createDisplacedFaceMaterials() {
  return createGalleryWallDisplacedMaterials();
}

function averageFrequency(frequencyData) {
  if (!frequencyData?.length) return 0;
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i];
  return sum / frequencyData.length / 255;
}

function clampCameraInRoom(camera) {
  const margin = 0.6;
  const hx = ROOM_WIDTH * 0.5 - margin;
  const hy = ROOM_HEIGHT * 0.5 - margin;
  const hz = ROOM_DEPTH * 0.5 - margin;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -hx, hx);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, -hy + 0.8, hy - 0.3);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -hz, hz);
}

export function useThreeDMode(containerRef, enabled, threeDStateRef, audioData) {
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;

  const flyRef = useRef({
    keys: Object.create(null),
    yaw: DEFAULT_SPAWN.yaw,
    pitch: DEFAULT_SPAWN.pitch,
    pointerLocked: false,
    pendingMouseDX: 0,
    pendingMouseDY: 0,
    ignoreMovesUntil: 0,
  });
  const sessionPersistRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const disposeState = (state) => {
      if (!state) return;
      disposeGalleryRoomMeshes(state.wallMeshes);
      state.faceMaterials?.forEach((mat) => mat.dispose());
      state.faceDisplacedMaterials?.forEach((mat) => mat.dispose());
      state.floatingObjects?.forEach((obj) => {
        obj.geometry?.dispose();
        obj.flatMaterial?.dispose();
        obj.displacedMaterial?.dispose();
      });
    };

    const getCanvas = () => containerRef.current?.querySelector('canvas') ?? null;

    if (!enabled) {
      if (document.pointerLockElement) document.exitPointerLock();
      if (threeDStateRef.current) {
        threeDStateRef.current.enabled = false;
        threeDStateRef.current.brushActive = false;
      }
      return undefined;
    }

    const fly = flyRef.current;
    const saved = sessionPersistRef.current;
    sessionPersistRef.current = null;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);
    if (saved) {
      camera.position.set(saved.x, saved.y, saved.z);
      fly.yaw = saved.yaw;
      fly.pitch = saved.pitch;
    } else {
      camera.position.set(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z);
      fly.yaw = DEFAULT_SPAWN.yaw;
      fly.pitch = DEFAULT_SPAWN.pitch;
    }
    camera.rotation.order = 'YXZ';

    const faceMaterials = createFaceMaterials();
    const faceDisplacedMaterials = createDisplacedFaceMaterials();
    const { roomGroup, wallMeshes } = createGalleryRoomMeshes(faceMaterials, DISPLACEMENT_SEGMENTS);
    scene.add(roomGroup);

    const floatingDefs = [
      {
        geometry: new THREE.BoxGeometry(1.15, 1.15, 1.15, 48, 48, 48),
        position: [-2.4, 1.45, -0.6],
        phase: 0.4,
        displacementPreset: 'box',
      },
      {
        geometry: new THREE.ConeGeometry(0.72, 1.45, 32, 48),
        position: [2.15, 1.25, 0.85],
        phase: 2.3,
        displacementPreset: 'cone',
      },
      {
        geometry: new THREE.SphereGeometry(0.82, 48, 36),
        position: [0.15, 1.05, 2.35],
        phase: 4.1,
        displacementPreset: 'sphere',
      },
    ];

    const floatingObjects = floatingDefs.map((def) =>
      addDisplaceableMeshToScene(
        scene,
        createDisplaceableMesh({
          geometry: def.geometry,
          side: THREE.FrontSide,
          displacementPreset: def.displacementPreset,
          meshOptions: {
            position: { x: def.position[0], y: def.position[1], z: def.position[2] },
            userData: { baseY: def.position[1], phase: def.phase },
            frustumCulled: false,
          },
        })
      )
    );

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    };
    updateSize();

    const applyCameraRotation = () => {
      fly.pitch = THREE.MathUtils.clamp(fly.pitch, -Math.PI * 0.47, Math.PI * 0.47);
      camera.rotation.set(fly.pitch, fly.yaw, 0, 'YXZ');
    };

    const applyPendingLook = () => {
      if (!fly.pointerLocked) {
        fly.pendingMouseDX = 0;
        fly.pendingMouseDY = 0;
        return;
      }
      if (performance.now() < fly.ignoreMovesUntil) {
        fly.pendingMouseDX = 0;
        fly.pendingMouseDY = 0;
        return;
      }
      if (fly.pendingMouseDX === 0 && fly.pendingMouseDY === 0) return;

      const mx = THREE.MathUtils.clamp(fly.pendingMouseDX, -MAX_MOUSE_DELTA_PER_FRAME, MAX_MOUSE_DELTA_PER_FRAME);
      const my = THREE.MathUtils.clamp(fly.pendingMouseDY, -MAX_MOUSE_DELTA_PER_FRAME, MAX_MOUSE_DELTA_PER_FRAME);
      fly.pendingMouseDX = 0;
      fly.pendingMouseDY = 0;

      fly.yaw -= mx * MOUSE_SENSITIVITY;
      fly.pitch -= my * MOUSE_SENSITIVITY;
      applyCameraRotation();
    };
    applyCameraRotation();

    const setKey = (code, down) => {
      fly.keys[code] = down;
    };

    const onKeyDown = (event) => {
      if (event.code === 'Escape' && document.pointerLockElement) {
        document.exitPointerLock();
        if (threeDStateRef.current) threeDStateRef.current.brushActive = false;
        event.preventDefault();
        return;
      }
      setKey(event.code, true);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => setKey(event.code, false);

    const container = containerRef.current;

    const onPointerLockChange = () => {
      const canvas = getCanvas();
      const wasLocked = fly.pointerLocked;
      fly.pointerLocked = document.pointerLockElement === canvas;
      if (containerRef.current) {
        containerRef.current.style.cursor = fly.pointerLocked ? 'none' : 'crosshair';
      }
      if (fly.pointerLocked && !wasLocked) {
        fly.pendingMouseDX = 0;
        fly.pendingMouseDY = 0;
        fly.ignoreMovesUntil = performance.now() + POINTER_LOCK_SETTLE_MS;
        fly.yaw = camera.rotation.y;
        fly.pitch = camera.rotation.x;
        applyCameraRotation();
      }
      if (!fly.pointerLocked) {
        fly.pendingMouseDX = 0;
        fly.pendingMouseDY = 0;
        if (threeDStateRef.current) {
          threeDStateRef.current.brushActive = false;
        }
      }
    };

    const onPointerLockError = () => {
      fly.pointerLocked = false;
      fly.pendingMouseDX = 0;
      fly.pendingMouseDY = 0;
      if (threeDStateRef.current) {
        threeDStateRef.current.brushActive = false;
      }
    };

    const onMouseMove = (event) => {
      if (!fly.pointerLocked) return;
      if (performance.now() < fly.ignoreMovesUntil) return;
      const dx = event.movementX ?? 0;
      const dy = event.movementY ?? 0;
      if (dx === 0 && dy === 0) return;
      fly.pendingMouseDX += dx;
      fly.pendingMouseDY += dy;
    };

    const onBlur = () => {
      if (threeDStateRef.current) threeDStateRef.current.brushActive = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);

    if (container) container.style.cursor = 'crosshair';

    threeDStateRef.current = {
      enabled: true,
      isGallery: true,
      scene,
      camera,
      mesh: roomGroup,
      wallMeshes,
      faceMaterials,
      faceDisplacedMaterials,
      floatingObjects,
      mouseOnSphere: false,
      brushActive: false,
      brushStartTime: 0,
      galleryFace: -1,
      updateSize,
      update(delta) {
        applyPendingLook();
        applyCameraRotation();

        const k = fly.keys;
        const forward = new THREE.Vector3(-Math.sin(fly.yaw), 0, -Math.cos(fly.yaw));
        const right = new THREE.Vector3(Math.cos(fly.yaw), 0, -Math.sin(fly.yaw));

        let speed = MOVE_SPEED;
        if (k.ShiftLeft || k.ShiftRight) speed *= 2;

        if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(forward, speed * delta);
        if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(forward, -speed * delta);
        if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(right, speed * delta);
        if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(right, -speed * delta);
        if (k.KeyE || k.Space) camera.position.y += VERT_SPEED * delta;
        if (k.KeyQ || k.ControlLeft || k.ControlRight) camera.position.y -= VERT_SPEED * delta;

        clampCameraInRoom(camera);

        const bobT = performance.now() * 0.001;
        if (threeDStateRef.current?.floatingObjects) {
          for (const obj of threeDStateRef.current.floatingObjects) {
            const { mesh: floatMesh } = obj;
            const phase = floatMesh.userData.phase ?? 0;
            floatMesh.rotation.y += delta * 0.42;
            floatMesh.rotation.x = Math.sin(bobT * 0.38 + phase) * 0.14;
            floatMesh.rotation.z = Math.cos(bobT * 0.29 + phase * 1.3) * 0.08;
            floatMesh.position.y = (floatMesh.userData.baseY ?? floatMesh.position.y)
              + Math.sin(bobT * 0.52 + phase) * 0.16;
          }
        }

        const level = averageFrequency(audioDataRef.current?.frequencyData);
        if (threeDStateRef.current?._displacementEnabled) {
          const base = threeDStateRef.current._baseDisplacement ?? 0.12;
          const strength = base + level * AUDIO_DISPLACEMENT_PULSE;
          updateDisplacementStrength(
            collectDisplacementMaterials(faceDisplacedMaterials, floatingObjects),
            strength
          );
        }
      },
      setBaseDisplacement(strength) {
        if (threeDStateRef.current) {
          threeDStateRef.current._baseDisplacement = strength;
        }
      },
      setDisplacementEnabled(enabled) {
        if (threeDStateRef.current) {
          threeDStateRef.current._displacementEnabled = enabled;
          setWallMeshDisplacement(wallMeshes, faceMaterials, faceDisplacedMaterials, enabled);
          for (const entry of floatingObjects) {
            entry.mesh.material = enabled ? entry.displacedMaterial : entry.flatMaterial;
          }
        }
      },
      dispose() {
        disposeGalleryRoomMeshes(wallMeshes);
        faceMaterials.forEach((mat) => mat.dispose());
        faceDisplacedMaterials.forEach((mat) => mat.dispose());
        floatingObjects.forEach((obj) => {
          obj.geometry?.dispose();
          obj.flatMaterial?.dispose();
          obj.displacedMaterial?.dispose();
        });
      },
    };

    return () => {
      const canvas = getCanvas();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      if (containerRef.current) containerRef.current.style.cursor = '';

      sessionPersistRef.current = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: fly.yaw,
        pitch: fly.pitch,
      };

      if (!enabledRef.current) {
        fly.keys = Object.create(null);
        fly.pointerLocked = false;
        fly.pendingMouseDX = 0;
        fly.pendingMouseDY = 0;
      }

      disposeState(threeDStateRef.current);
      threeDStateRef.current = { enabled: false };
    };
  }, [enabled]);
}
