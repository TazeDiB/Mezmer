import { describe, it, expect } from 'vitest';
import { worldHitToGallerySurface, GALLERY_ROOM } from './galleryMapping.js';

function vec3(x, y, z) {
  return {
    x,
    y,
    z,
    clone() {
      return vec3(this.x, this.y, this.z);
    },
    normalize() {
      const len = Math.hypot(this.x, this.y, this.z) || 1;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    },
  };
}

const HW = GALLERY_ROOM.width * 0.5;
const HH = GALLERY_ROOM.height * 0.5;
const HD = GALLERY_ROOM.depth * 0.5;

describe('worldHitToGallerySurface', () => {
  it('maps +x face center to face 0 with UV 0.5, 0.5', () => {
    const point = vec3(HW, 0, 0);
    const normal = vec3(1, 0, 0);
    const { face, faceUV } = worldHitToGallerySurface(point, normal);

    expect(face).toBe(0);
    expect(faceUV.x).toBeCloseTo(0.5, 5);
    expect(faceUV.y).toBeCloseTo(0.5, 5);
  });

  it('maps -x face to face 1', () => {
    const point = vec3(-HW, 0, 0);
    const normal = vec3(-1, 0, 0);
    const { face } = worldHitToGallerySurface(point, normal);
    expect(face).toBe(1);
  });

  it('maps +y face to face 2', () => {
    const point = vec3(0, HH, 0);
    const normal = vec3(0, 1, 0);
    const { face } = worldHitToGallerySurface(point, normal);
    expect(face).toBe(2);
  });

  it('maps -y face to face 3', () => {
    const point = vec3(0, -HH, 0);
    const normal = vec3(0, -1, 0);
    const { face } = worldHitToGallerySurface(point, normal);
    expect(face).toBe(3);
  });

  it('maps +z face to face 4', () => {
    const point = vec3(0, 0, HD);
    const normal = vec3(0, 0, 1);
    const { face } = worldHitToGallerySurface(point, normal);
    expect(face).toBe(4);
  });

  it('maps -z face to face 5', () => {
    const point = vec3(0, 0, -HD);
    const normal = vec3(0, 0, -1);
    const { face } = worldHitToGallerySurface(point, normal);
    expect(face).toBe(5);
  });

  it('clamps UV coordinates to [0, 1]', () => {
    const point = vec3(HW, HH * 3, -HD * 5);
    const normal = vec3(1, 0, 0);
    const { faceUV } = worldHitToGallerySurface(point, normal);

    expect(faceUV.x).toBeGreaterThanOrEqual(0);
    expect(faceUV.x).toBeLessThanOrEqual(1);
    expect(faceUV.y).toBeGreaterThanOrEqual(0);
    expect(faceUV.y).toBeLessThanOrEqual(1);
  });
});
