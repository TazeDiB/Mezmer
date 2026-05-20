/**
 * Preset seed encoding/decoding and share-URL helpers.
 */
import { GLOBAL_PARAM_KEYS, MOUSE_PARAM_KEYS, THREE_D_PARAM_KEYS } from '../constants/sliderConfig.js';
import {
  GALLERY_FACE_COUNT,
  startGalleryWallTransition,
  markGalleryWarmup,
} from './galleryStack.js';
import {
  FLOATING_OBJECT_COUNT,
  startFloatingObjectTransition,
} from './galleryFloatingObjects.js';

export const PRESET_VERSION = 2;

const LAYER_KEYS = ['layer1', 'layer2', 'layer3', 'layer4'];

const RUNTIME_KEYS = new Set([
  'visualModeFromIndex',
  'visualModeToIndex',
  'visualModeBlend',
]);

const EXTRA_GLOBAL_KEYS = ['globalSymmetryOffsetSpeed', 'patternDisplacementEnabled'];

function toUrlSafeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromUrlSafeBase64(code) {
  let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return decodeURIComponent(escape(atob(base64)));
}

function pickGlobals(state) {
  const globals = {};
  for (const key of [...GLOBAL_PARAM_KEYS, ...MOUSE_PARAM_KEYS, ...THREE_D_PARAM_KEYS]) {
    if (state[key] !== undefined) globals[key] = state[key];
  }
  for (const key of EXTRA_GLOBAL_KEYS) {
    if (state[key] !== undefined) globals[key] = state[key];
  }
  return globals;
}

function isValidGalleryStackEntry(stack) {
  if (!stack || typeof stack !== 'object') return false;
  if (!Array.isArray(stack.layers) || stack.layers.length !== 4) return false;
  for (const layer of stack.layers) {
    if (!layer || typeof layer !== 'object') return false;
    if (typeof layer.patternType !== 'string' || typeof layer.colorMode !== 'string') return false;
  }
  return true;
}

/**
 * Validate v2 gallery stack arrays (6 wall + 3 floating stacks, 4 layers each).
 * @param {unknown} galleryWallStacks
 * @param {unknown} floatingObjectStacks
 * @returns {boolean}
 */
export function validateGalleryStacks(galleryWallStacks, floatingObjectStacks) {
  if (!Array.isArray(galleryWallStacks) || galleryWallStacks.length !== GALLERY_FACE_COUNT) {
    return false;
  }
  if (!Array.isArray(floatingObjectStacks) || floatingObjectStacks.length !== FLOATING_OBJECT_COUNT) {
    return false;
  }
  return (
    galleryWallStacks.every(isValidGalleryStackEntry) &&
    floatingObjectStacks.every(isValidGalleryStackEntry)
  );
}

/**
 * Crossfade gallery stacks from preset data (walls and/or floats) and request warmup.
 * @param {Record<string, unknown> | null | undefined} state
 * @param {number} [blendSpeedFactor=1]
 * @returns {boolean} true if any stack transition was started
 */
export function applyGalleryStacksFromPreset(state, blendSpeedFactor = 1) {
  if (!state) return false;

  let applied = false;
  if (state.galleryWallStacks) {
    startGalleryWallTransition(state.galleryWallStacks, blendSpeedFactor);
    applied = true;
  }
  if (state.floatingObjectStacks) {
    startFloatingObjectTransition(state.floatingObjectStacks, blendSpeedFactor);
    applied = true;
  }
  if (applied) markGalleryWarmup();
  return applied;
}

/**
 * @param {Record<string, unknown>} state - layer1–4, globals, visualMode, globalColorMode, forceGlobalColor, optional gallery stacks
 * @returns {string} URL-safe base64 preset code, or empty string if invalid
 */
export function encodePreset(state) {
  if (!state || typeof state !== 'object') return '';

  const payload = {};
  for (const key of LAYER_KEYS) {
    if (!state[key] || typeof state[key] !== 'object') return '';
    payload[key] = state[key];
  }

  Object.assign(payload, pickGlobals(state));

  if (state.visualMode != null) payload.visualMode = String(state.visualMode);
  if (state.globalColorMode != null) payload.globalColorMode = state.globalColorMode;
  if (state.forceGlobalColor != null) payload.forceGlobalColor = Boolean(state.forceGlobalColor);

  payload.version = PRESET_VERSION;
  if (state.galleryWallStacks != null) payload.galleryWallStacks = state.galleryWallStacks;
  if (state.floatingObjectStacks != null) payload.floatingObjectStacks = state.floatingObjectStacks;

  return toUrlSafeBase64(JSON.stringify(payload));
}

/**
 * @param {string} code - preset code from encodePreset
 * @returns {Record<string, unknown> | null}
 */
export function decodePreset(code) {
  if (!code || typeof code !== 'string') return null;

  try {
    const trimmed = code.trim();
    const json = fromUrlSafeBase64(trimmed);
    const state = JSON.parse(json);
    if (!state || typeof state !== 'object') return null;

    for (const key of LAYER_KEYS) {
      if (!state[key] || typeof state[key] !== 'object') return null;
    }

    const version = state.version;
    if (version === PRESET_VERSION) {
      if (!validateGalleryStacks(state.galleryWallStacks, state.floatingObjectStacks)) {
        return null;
      }
    } else if (version != null && version !== 1) {
      return null;
    } else {
      delete state.galleryWallStacks;
      delete state.floatingObjectStacks;
    }

    delete state.version;

    for (const key of RUNTIME_KEYS) {
      delete state[key];
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * @param {string} code - preset code
 * @returns {string} hash fragment e.g. `#seed=CODE`
 */
export function generateShareUrl(code) {
  return `#seed=${encodeURIComponent(code)}`;
}

/**
 * @param {string} [hash] - defaults to window.location.hash
 * @returns {string | null} preset code or null
 */
export function parseShareUrl(hash) {
  const raw =
    hash !== undefined
      ? hash
      : typeof window !== 'undefined'
        ? window.location.hash
        : '';
  const fragment = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!fragment) return null;

  const seed = new URLSearchParams(fragment).get('seed');
  return seed ? decodeURIComponent(seed) : null;
}
