/**
 * Randomizer public API — thin wrappers around textureRandomize profiles.
 */
import { GALLERY_FACE_COUNT } from './galleryStack.js';
import { FLOATING_OBJECT_COUNT } from './galleryFloatingObjects.js';
import {
  buildRandomTextureStacks,
  buildRandomMainCanvasParams,
  randomizeTextures,
} from './textureRandomize.js';

export {
  TEXTURE_TARGET_PROFILES,
  getTextureTargetProfile,
  resolveRandomizerTheme,
  randomizeGlobal,
  randomizePatternParam,
  randomizeLayer,
  randomizeSurfaceLayer,
  buildRandomTextureStack,
  buildRandomTextureStacks,
  buildRandomMainCanvasParams,
  createRandomMainCanvasTransition,
  randomizeTextures,
} from './textureRandomize.js';

/** @deprecated use buildRandomTextureStacks('wall', ...) */
export function buildRandomGalleryWallStacks(options = {}) {
  return buildRandomTextureStacks('wall', GALLERY_FACE_COUNT, options);
}

/** @deprecated use buildRandomTextureStacks('shape', ...) */
export function buildRandomFloatingObjectStacks(options = {}) {
  return buildRandomTextureStacks('shape', FLOATING_OBJECT_COUNT, options);
}

/** Randomize floating gallery objects with smooth crossfade. */
export function randomizeFloatingObjectStacks(options = {}) {
  return randomizeTextures('shape', options);
}

/** Randomize gallery walls + floating shapes with smooth crossfade. */
export function randomizeGalleryWallStacks(options = {}) {
  return randomizeTextures('gallery', options);
}

/** Startup / preset random state for the main 2D canvas. */
export function createRandomStartupState(options = {}) {
  return buildRandomMainCanvasParams(options);
}
