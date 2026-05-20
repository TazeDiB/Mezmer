/**
 * Gallery wall edge neighbor graph and motion-sync helpers.
 * Interior faces stay independent; edge bands can blend motion via shader uniforms.
 */
import { GALLERY_FACE_COUNT } from './galleryStack.js';

/** Edge band width in face UV space (0–1). */
export const GALLERY_EDGE_BLEND = 0.1;

/**
 * Per-face edge neighbors: [uMin, uMax, vMin, vMax].
 * BoxGeometry order: +x, -x, +y, -y, +z, -z.
 */
export const GALLERY_FACE_EDGE_NEIGHBORS = [
  [4, 5, 3, 2],
  [5, 4, 3, 2],
  [1, 0, 4, 5],
  [1, 0, 5, 4],
  [0, 1, 3, 2],
  [1, 0, 3, 2],
];

/** Integrated animation time per face (integrated + wall timeOffset). */
export function getGalleryFaceIntegratedTimes(faceStates, wallStacks) {
  return Array.from({ length: GALLERY_FACE_COUNT }, (_, face) => {
    const fs = faceStates[face];
    const wall = wallStacks[face];
    return (fs?.integrated ?? 0) + (wall?.timeOffset ?? 0);
  });
}

/** Edge-neighbor integrated times for one face (vec4: uMin, uMax, vMin, vMax). */
export function getGalleryEdgeNeighborTimes(faceIndex, integratedTimes) {
  const neighbors = GALLERY_FACE_EDGE_NEIGHBORS[faceIndex] ?? GALLERY_FACE_EDGE_NEIGHBORS[0];
  return neighbors.map((n) => integratedTimes[n] ?? 0);
}

/** Edge-neighbor motion distortion driver (global scale + average layer distortion). */
export function getGalleryEdgeNeighborDistortion(faceIndex, wallStacks, globalScale = 1) {
  const neighbors = GALLERY_FACE_EDGE_NEIGHBORS[faceIndex] ?? GALLERY_FACE_EDGE_NEIGHBORS[0];
  return neighbors.map((n) => {
    const wall = wallStacks[n];
    if (!wall?.layers?.length) return globalScale;
    const avgLayerDistortion =
      wall.layers.reduce((sum, layer) => sum + (layer.distortion ?? 0), 0) / wall.layers.length;
    return globalScale + avgLayerDistortion;
  });
}
