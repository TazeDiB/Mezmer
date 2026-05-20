import { describe, it, expect } from 'vitest';
import { generateCastleParts, getCastleBounds } from './stressTestCastle.js';

function partKey(part) {
  const [x, y, z] = part.position;
  return `${part.type}:${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
}

function tileGridKey(part) {
  const [x, , z] = part.position;
  return `${x.toFixed(3)},${z.toFixed(3)}`;
}

describe('generateCastleParts', () => {
  for (const count of [100, 1000, 10000]) {
    it(`produces exactly ${count} parts without duplicate positions`, () => {
      const parts = generateCastleParts(count);
      expect(parts).toHaveLength(count);

      const keys = new Set();
      for (const part of parts) {
        const key = partKey(part);
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    });
  }

  it('fills the entire courtyard floor in castle1000 mode', () => {
    const parts = generateCastleParts(1000);
    const tiles = parts.filter((p) => p.type === 'tile');
    const tileKeys = new Set(tiles.map(tileGridKey));

    expect(tiles.length).toBeGreaterThan(50);
    expect(tileKeys.size).toBe(tiles.length);

    const xs = [...tileKeys].map((k) => Number(k.split(',')[0]));
    const zs = [...tileKeys].map((k) => Number(k.split(',')[1]));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const pitch = 0.44;

    const cols = Math.round((maxX - minX) / pitch) + 1;
    const rows = Math.round((maxZ - minZ) / pitch) + 1;
    expect(tiles.length).toBe(cols * rows);
  });

  it('uses uniform brick scale for all wall bricks', () => {
    const parts = generateCastleParts(100);
    const bricks = parts.filter((p) => p.type === 'brick');
    expect(bricks.length).toBeGreaterThan(20);
    for (const brick of bricks) {
      expect(brick.scale[0]).toBeCloseTo(0.44, 3);
      expect(brick.scale[1]).toBeCloseTo(0.16, 3);
      expect(brick.scale[2]).toBeCloseTo(0.44, 3);
    }
  });

  it('returns sensible bounds', () => {
    const parts = generateCastleParts(100);
    const { center, radius } = getCastleBounds(parts);
    expect(center).toHaveLength(3);
    expect(radius).toBeGreaterThan(2);
  });
});
