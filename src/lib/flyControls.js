/**
 * Shared noclip fly controls (WASD + mouse look + pointer lock).
 */
import * as THREE from 'three';

export const FLY_MOVE_SPEED = 6;
export const FLY_VERT_SPEED = 4;
export const FLY_SPRINT_MULT = 2;
export const FLY_MOUSE_SENSITIVITY = 0.0022;
export const FLY_MAX_MOUSE_DELTA = 90;
export const FLY_POINTER_LOCK_SETTLE_MS = 120;

export function createFlyState(spawn = { x: 0, y: 1.6, z: 4, yaw: 0, pitch: 0 }) {
  return {
    keys: Object.create(null),
    yaw: spawn.yaw ?? 0,
    pitch: spawn.pitch ?? 0,
    pointerLocked: false,
    pendingMouseDX: 0,
    pendingMouseDY: 0,
    ignoreMovesUntil: 0,
    spawn: { ...spawn },
    appliedSpawn: false,
  };
}

/**
 * @param {object} options
 * @param {() => HTMLElement | null} options.getContainer
 * @param {() => HTMLCanvasElement | null} options.getCanvas
 * @param {import('three').PerspectiveCamera} options.camera
 * @param {ReturnType<typeof createFlyState>} options.flyState
 * @param {(pos: import('three').Vector3) => void} [options.clampPosition]
 */
export function attachFlyControls({
  getContainer,
  getCanvas,
  camera,
  flyState,
  clampPosition,
  moveSpeed = FLY_MOVE_SPEED,
  vertSpeed = FLY_VERT_SPEED,
}) {
  const fly = flyState;
  camera.rotation.order = 'YXZ';

  const applyCameraRotation = () => {
    fly.pitch = THREE.MathUtils.clamp(fly.pitch, -Math.PI * 0.47, Math.PI * 0.47);
    camera.rotation.set(fly.pitch, fly.yaw, 0, 'YXZ');
  };

  const applySpawn = (spawn = fly.spawn) => {
    if (!spawn) return;
    fly.spawn = { ...spawn };
    camera.position.set(spawn.x ?? 0, spawn.y ?? 1.6, spawn.z ?? 4);
    fly.yaw = spawn.yaw ?? 0;
    fly.pitch = spawn.pitch ?? 0;
    applyCameraRotation();
    fly.appliedSpawn = true;
  };

  if (!fly.appliedSpawn) {
    applySpawn();
  } else {
    applyCameraRotation();
  }

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

    const mx = THREE.MathUtils.clamp(fly.pendingMouseDX, -FLY_MAX_MOUSE_DELTA, FLY_MAX_MOUSE_DELTA);
    const my = THREE.MathUtils.clamp(fly.pendingMouseDY, -FLY_MAX_MOUSE_DELTA, FLY_MAX_MOUSE_DELTA);
    fly.pendingMouseDX = 0;
    fly.pendingMouseDY = 0;

    fly.yaw -= mx * FLY_MOUSE_SENSITIVITY;
    fly.pitch -= my * FLY_MOUSE_SENSITIVITY;
    applyCameraRotation();
  };

  const setKey = (code, down) => {
    fly.keys[code] = down;
  };

  const onKeyDown = (event) => {
    if (event.code === 'Escape' && document.pointerLockElement) {
      document.exitPointerLock();
      event.preventDefault();
      return;
    }
    setKey(event.code, true);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  };

  const onKeyUp = (event) => setKey(event.code, false);

  const onPointerLockChange = () => {
    const canvas = getCanvas();
    const wasLocked = fly.pointerLocked;
    fly.pointerLocked = !!canvas && document.pointerLockElement === canvas;
    const container = getContainer();
    if (container) {
      container.style.cursor = fly.pointerLocked ? 'none' : 'crosshair';
    }
    if (fly.pointerLocked && !wasLocked) {
      fly.pendingMouseDX = 0;
      fly.pendingMouseDY = 0;
      fly.ignoreMovesUntil = performance.now() + FLY_POINTER_LOCK_SETTLE_MS;
      fly.yaw = camera.rotation.y;
      fly.pitch = camera.rotation.x;
      applyCameraRotation();
    }
    if (!fly.pointerLocked) {
      fly.pendingMouseDX = 0;
      fly.pendingMouseDY = 0;
    }
  };

  const onPointerLockError = () => {
    fly.pointerLocked = false;
    fly.pendingMouseDX = 0;
    fly.pendingMouseDY = 0;
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

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);

  const container = getContainer();
  if (container) container.style.cursor = 'crosshair';

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  const update = (deltaSec) => {
    applyPendingLook();
    applyCameraRotation();

    const k = fly.keys;
    forward.set(-Math.sin(fly.yaw), 0, -Math.cos(fly.yaw));
    right.set(Math.cos(fly.yaw), 0, -Math.sin(fly.yaw));

    let speed = moveSpeed;
    if (k.ShiftLeft || k.ShiftRight) speed *= FLY_SPRINT_MULT;

    if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(forward, speed * deltaSec);
    if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(forward, -speed * deltaSec);
    if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(right, speed * deltaSec);
    if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(right, -speed * deltaSec);
    if (k.KeyE || k.Space) camera.position.y += vertSpeed * deltaSec;
    if (k.KeyQ || k.ControlLeft || k.ControlRight) camera.position.y -= vertSpeed * deltaSec;

    if (clampPosition) clampPosition(camera.position);
  };

  const dispose = () => {
    const canvas = getCanvas();
    if (canvas && document.pointerLockElement === canvas) document.exitPointerLock();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('pointerlockerror', onPointerLockError);
    if (getContainer()) getContainer().style.cursor = '';
    fly.keys = Object.create(null);
    fly.pointerLocked = false;
    fly.pendingMouseDX = 0;
    fly.pendingMouseDY = 0;
  };

  return { update, applySpawn, dispose, flyState: fly };
}
