import { describe, it, expect } from 'vitest';
import {
  buildRandomTextureStacks,
  resolveRandomizerTheme,
  TEXTURE_TARGET_PROFILES,
} from './randomizer.js';
import { GALLERY_FACE_COUNT } from './galleryStack.js';
import { FLOATING_OBJECT_COUNT } from './galleryFloatingObjects.js';
import { AUDIO_COLOR_MODES_LIST, RANDOMIZER_THEMES } from '../constants/sliderConfig.js';

describe('randomizer', () => {
  it('buildRandomTextureStacks wall profile returns six stacks', () => {
    const stacks = buildRandomTextureStacks('wall');
    expect(stacks).toHaveLength(GALLERY_FACE_COUNT);
    expect(TEXTURE_TARGET_PROFILES.wall.count).toBe(6);

    for (const stack of stacks) {
      expect(stack.layers).toHaveLength(4);
      expect(stack.forceGlobalColor).toBe(true);
      expect(typeof stack.visualMode).toBe('string');
      expect(typeof stack.globalColorMode).toBe('string');
    }
  });

  it('buildRandomTextureStacks shape profile returns three stacks', () => {
    const stacks = buildRandomTextureStacks('shape');
    expect(stacks).toHaveLength(FLOATING_OBJECT_COUNT);
    expect(TEXTURE_TARGET_PROFILES.shape.count).toBe(3);

    for (const stack of stacks) {
      expect(stack.layers).toHaveLength(4);
      expect(stack.forceGlobalColor).toBe(true);
    }
  });

  it('resolveRandomizerTheme excludes audio color modes when audio inactive', () => {
    const { colorPool } = resolveRandomizerTheme('chaotic', { audioActive: false });
    for (const mode of AUDIO_COLOR_MODES_LIST) {
      expect(colorPool).not.toContain(mode);
    }
    expect(colorPool.length).toBeGreaterThan(0);
  });

  it('resolveRandomizerTheme keeps audio color modes when audio active', () => {
    const { colorPool } = resolveRandomizerTheme('chaotic', { audioActive: true });
    const themeColors = RANDOMIZER_THEMES.chaotic.colors;
    const hasAudioMode = themeColors.some((c) => AUDIO_COLOR_MODES_LIST.includes(c));
    if (hasAudioMode) {
      expect(colorPool.some((c) => AUDIO_COLOR_MODES_LIST.includes(c))).toBe(true);
    }
  });

  it('buildRandomTextureStacks respects geometric theme pattern pool', () => {
    const stacks = buildRandomTextureStacks('wall', null, { theme: 'geometric' });
    const allowed = new Set([...RANDOMIZER_THEMES.geometric.patterns, 'invisible']);

    for (const stack of stacks) {
      for (const layer of stack.layers) {
        expect(allowed.has(layer.patternType)).toBe(true);
      }
    }
  });
});
