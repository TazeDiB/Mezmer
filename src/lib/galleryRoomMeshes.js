/**
 * Six inward-facing wall planes — same material order as BoxGeometry (+x, -x, +y, -y, +z, -z).
 */
import * as THREE from 'three';
import { GALLERY_ROOM } from './galleryMapping.js';
import { GALLERY_FACE_COUNT, GALLERY_FACE_DIMENSIONS } from './galleryStack.js';

const { width: ROOM_WIDTH, height: ROOM_HEIGHT, depth: ROOM_DEPTH } = GALLERY_ROOM;
const HW = ROOM_WIDTH * 0.5;
const HH = ROOM_HEIGHT * 0.5;
const HD = ROOM_DEPTH * 0.5;

/** Plane rotation so local +Z normal points toward room center. */
const WALL_POSITIONS = [
  [HW, 0, 0],
  [-HW, 0, 0],
  [0, HH, 0],
  [0, -HH, 0],
  [0, 0, HD],
  [0, 0, -HD],
];

const ROOM_CENTER = new THREE.Vector3(0, 0, 0);

function planeSegments(w, h, baseSegments) {
  const maxDim = Math.max(w, h);
  const minDim = Math.min(w, h);
  if (maxDim === w) {
    return {
      wSeg: baseSegments,
      hSeg: Math.max(16, Math.round(baseSegments * (minDim / maxDim))),
    };
  }
  return {
    wSeg: Math.max(16, Math.round(baseSegments * (minDim / maxDim))),
    hSeg: baseSegments,
  };
}

/**
 * @param {THREE.Material[]} faceMaterials — length GALLERY_FACE_COUNT
 * @param {number} [displacementSegments=64]
 * @returns {{ roomGroup: THREE.Group, wallMeshes: THREE.Mesh[] }}
 */
export function createGalleryRoomMeshes(faceMaterials, displacementSegments = 64) {
  const roomGroup = new THREE.Group();
  const wallMeshes = [];

  for (let face = 0; face < GALLERY_FACE_COUNT; face++) {
    const [fw, fh] = GALLERY_FACE_DIMENSIONS[face] ?? [ROOM_WIDTH, ROOM_HEIGHT];
    const { wSeg, hSeg } = planeSegments(fw, fh, displacementSegments);
    const geometry = new THREE.PlaneGeometry(fw, fh, wSeg, hSeg);
    const material = faceMaterials[face] ?? faceMaterials[0];
    const mesh = new THREE.Mesh(geometry, material);
    const pos = WALL_POSITIONS[face];
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(ROOM_CENTER);
    mesh.userData.faceIndex = face;
    mesh.frustumCulled = false;
    roomGroup.add(mesh);
    wallMeshes.push(mesh);
  }

  return { roomGroup, wallMeshes };
}

/** Toggle flat vs displaced material on each wall mesh. */
export function setWallMeshDisplacement(wallMeshes, flatMaterials, displacedMaterials, useHeightmap) {
  if (!wallMeshes) return;
  for (let i = 0; i < wallMeshes.length; i++) {
    const mesh = wallMeshes[i];
    if (!mesh) continue;
    mesh.material = useHeightmap && displacedMaterials?.[i]
      ? displacedMaterials[i]
      : flatMaterials?.[i] ?? mesh.material;
  }
}

export function disposeGalleryRoomMeshes(wallMeshes) {
  if (!wallMeshes) return;
  for (const mesh of wallMeshes) {
    mesh.geometry?.dispose();
  }
}
