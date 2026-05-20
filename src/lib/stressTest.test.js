import { describe, it, expect } from 'vitest';
import {
  pickStressVisualMode,
  pickStressColorMode,
  isParticleStressMode,
  getStressTestMaxCount,
  STRESS_TEST_MODES,
} from './stressTest.js';
import { VISUAL_MODES, COLOR_MODES } from '../constants/sliderConfig.js';

describe('stress test particle mode', () => {
  it('registers particles3d in stress modes', () => {
    expect(STRESS_TEST_MODES).toContain('particles3d');
    expect(isParticleStressMode('particles3d')).toBe(true);
    expect(getStressTestMaxCount('particles3d')).toBe(256);
  });

  it('biases particle visual and color picks', () => {
    expect(VISUAL_MODES).toContain(pickStressVisualMode(0, 'particle'));
    expect(COLOR_MODES).toContain(pickStressColorMode(0, 'particle'));
    expect(pickStressVisualMode(0, 'particle')).not.toBe(pickStressVisualMode(0, 'brick'));
  });
});

describe('stress test per-object modes', () => {
  it('cycles visual modes across tiles', () => {
    const modes = new Set();
    for (let i = 0; i < VISUAL_MODES.length * 2; i++) {
      modes.add(pickStressVisualMode(i, 'brick'));
    }
    expect(modes.size).toBeGreaterThan(1);
    for (let i = 0; i < 20; i++) {
      expect(VISUAL_MODES).toContain(pickStressVisualMode(i, null));
    }
  });

  it('cycles color modes across tiles and part types', () => {
    const brickColors = new Set();
    const tileColors = new Set();
    for (let i = 0; i < COLOR_MODES.length * 2; i++) {
      brickColors.add(pickStressColorMode(i, 'brick'));
      tileColors.add(pickStressColorMode(i, 'tile'));
    }
    expect(brickColors.size).toBeGreaterThan(1);
    expect(tileColors.size).toBeGreaterThan(1);
    expect(pickStressColorMode(0, 'brick')).not.toBe(pickStressColorMode(0, 'tile'));
  });
});
