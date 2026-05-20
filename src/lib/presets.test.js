import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_LAYERS, DEFAULT_GLOBALS } from '../constants/index.js';
import {
  PRESET_VERSION,
  encodePreset,
  decodePreset,
  validateGalleryStacks,
  applyGalleryStacksFromPreset,
} from './presets.js';
import {
  DEFAULT_GALLERY_WALL_STACKS,
  commitGalleryWallTransition,
  getGalleryWallStacks,
  resetGalleryWallStacks,
} from './galleryStack.js';
import {
  DEFAULT_FLOATING_OBJECT_STACKS,
  commitFloatingObjectTransition,
  getFloatingObjectStacks,
  resetFloatingObjectStacks,
} from './galleryFloatingObjects.js';

function basePresetState(overrides = {}) {
  return {
    ...DEFAULT_GLOBALS,
    layer1: { ...DEFAULT_LAYERS.layer1 },
    layer2: { ...DEFAULT_LAYERS.layer2 },
    layer3: { ...DEFAULT_LAYERS.layer3 },
    layer4: { ...DEFAULT_LAYERS.layer4 },
    visualMode: 'glow',
    globalColorMode: 'fire',
    forceGlobalColor: true,
    ...overrides,
  };
}

function v2PresetState(overrides = {}) {
  return basePresetState({
    galleryWallStacks: JSON.parse(JSON.stringify(DEFAULT_GALLERY_WALL_STACKS)),
    floatingObjectStacks: JSON.parse(JSON.stringify(DEFAULT_FLOATING_OBJECT_STACKS)),
    ...overrides,
  });
}

describe('presets', () => {
  beforeEach(() => {
    resetGalleryWallStacks();
    resetFloatingObjectStacks();
  });

  it('round-trips v2 preset with gallery stacks', () => {
    const state = v2PresetState();
    const code = encodePreset(state);
    expect(code).toBeTruthy();

    const decoded = decodePreset(code);
    expect(decoded).not.toBeNull();
    expect(decoded.layer1.patternType).toBe(state.layer1.patternType);
    expect(decoded.visualMode).toBe('glow');
    expect(decoded.galleryWallStacks).toHaveLength(6);
    expect(decoded.floatingObjectStacks).toHaveLength(3);
    expect(decoded.galleryWallStacks[0].visualMode).toBe(
      DEFAULT_GALLERY_WALL_STACKS[0].visualMode
    );
  });

  it('decodes v1 payloads without gallery stacks', () => {
    const v1Payload = {
      ...basePresetState(),
    };
    delete v1Payload.galleryWallStacks;
    delete v1Payload.floatingObjectStacks;

    const json = JSON.stringify(v1Payload);
    const code = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const decoded = decodePreset(code);
    expect(decoded).not.toBeNull();
    expect(decoded.galleryWallStacks).toBeUndefined();
    expect(decoded.floatingObjectStacks).toBeUndefined();
    expect(decoded.version).toBeUndefined();
  });

  it('rejects invalid v2 gallery stacks', () => {
    const badWallStacks = DEFAULT_GALLERY_WALL_STACKS.slice(0, 5);
    expect(validateGalleryStacks(badWallStacks, DEFAULT_FLOATING_OBJECT_STACKS)).toBe(false);

    const state = v2PresetState({ galleryWallStacks: badWallStacks });
    const code = encodePreset(state);
    expect(decodePreset(code)).toBeNull();
  });

  it('rejects malformed preset codes', () => {
    expect(decodePreset('')).toBeNull();
    expect(decodePreset('not-valid-base64!!!')).toBeNull();
    expect(encodePreset({ layer1: null })).toBe('');
  });

  it('applyGalleryStacksFromPreset updates module state', () => {
    const customWalls = JSON.parse(JSON.stringify(DEFAULT_GALLERY_WALL_STACKS));
    customWalls[0].visualMode = 'crt';
    const customFloats = JSON.parse(JSON.stringify(DEFAULT_FLOATING_OBJECT_STACKS));
    customFloats[1].visualMode = 'thermal';

    const applied = applyGalleryStacksFromPreset({
      galleryWallStacks: customWalls,
      floatingObjectStacks: customFloats,
    });

    expect(applied).toBe(true);
    const afterTransition = performance.now() + 1e7;
    commitGalleryWallTransition(afterTransition, 1);
    commitFloatingObjectTransition(afterTransition, 1);
    expect(getGalleryWallStacks()[0].visualMode).toBe('crt');
    expect(getFloatingObjectStacks()[1].visualMode).toBe('thermal');
  });

  it('exports PRESET_VERSION = 2', () => {
    expect(PRESET_VERSION).toBe(2);
    const code = encodePreset(v2PresetState());
    const raw = JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/')))));
    expect(raw.version).toBe(2);
  });
});
