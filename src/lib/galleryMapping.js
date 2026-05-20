/** Gallery room dimensions — must match useThreeDMode.js / GLSL constants. */
export const GALLERY_ROOM = {
  width: 18,
  height: 10,
  depth: 18,
};

const HW = GALLERY_ROOM.width * 0.5;
const HH = GALLERY_ROOM.height * 0.5;
const HD = GALLERY_ROOM.depth * 0.5;

/**
 * Map a world hit to a box face index matching Three.js BoxGeometry material order:
 * 0=+x, 1=-x, 2=+y, 3=-y, 4=+z, 5=-z
 *
 * @param {THREE.Vector3} point world hit
 * @param {THREE.Vector3} normal world normal (from mesh, outward)
 */
export function worldHitToGallerySurface(point, normal) {
  const n = normal.clone().normalize();
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);

  let face = 0;
  let fu = 0.5;
  let fv = 0.5;

  if (ax >= ay && ax >= az) {
    if (n.x > 0) {
      face = 0;
      fu = (-point.z + HD) / (2 * HD);
      fv = (point.y + HH) / (2 * HH);
    } else {
      face = 1;
      fu = (point.z + HD) / (2 * HD);
      fv = (point.y + HH) / (2 * HH);
    }
  } else if (ay >= ax && ay >= az) {
    if (n.y > 0) {
      face = 2;
      fu = (point.x + HW) / (2 * HW);
      fv = (-point.z + HD) / (2 * HD);
    } else {
      face = 3;
      fu = (point.x + HW) / (2 * HW);
      fv = (point.z + HD) / (2 * HD);
    }
  } else if (n.z > 0) {
    face = 4;
    fu = (-point.x + HW) / (2 * HW);
    fv = (point.y + HH) / (2 * HH);
  } else {
    face = 5;
    fu = (point.x + HW) / (2 * HW);
    fv = (point.y + HH) / (2 * HH);
  }

  fu = Math.max(0, Math.min(1, fu));
  fv = Math.max(0, Math.min(1, fv));

  return {
    face,
    faceUV: { x: fu, y: fv },
  };
}
