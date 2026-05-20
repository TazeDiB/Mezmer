/**
 * Pure utilities and non-React helpers.
 */
export { lerp, randomInRange, isElectron } from './utils.js';
export {
  PRESET_VERSION,
  encodePreset,
  decodePreset,
  validateGalleryStacks,
  applyGalleryStacksFromPreset,
  generateShareUrl,
  parseShareUrl,
} from './presets.js';
export {
  createRandomStartupState,
  randomizeGalleryWallStacks,
  randomizeTextures,
  createRandomMainCanvasTransition,
  TEXTURE_TARGET_PROFILES,
} from './randomizer.js';
