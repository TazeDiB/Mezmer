/**
 * One-time startup snapshot: share URL, or random chaotic theme.
 */

import { parseShareUrl } from './presets.js';
import { createRandomStartupState } from './randomizer.js';
import { DEFAULT_GLOBALS, DEFAULT_LAYERS } from '../constants/index.js';

function buildDefaultParams() {
  return {
    ...DEFAULT_GLOBALS,
    layer1: { ...DEFAULT_LAYERS.layer1 },
    layer2: { ...DEFAULT_LAYERS.layer2 },
    layer3: { ...DEFAULT_LAYERS.layer3 },
    layer4: { ...DEFAULT_LAYERS.layer4 },
  };
}

let startupSnapshot;

export function getStartupState() {
  if (!startupSnapshot) {
    if (typeof window !== 'undefined' && parseShareUrl()) {
      startupSnapshot = {
        params: buildDefaultParams(),
        visualMode: 'normal',
        globalColorMode: 'rainbow',
        forceGlobalColor: false,
      };
    } else {
      startupSnapshot = createRandomStartupState({
        theme: 'chaotic',
        randomizeGlobals: true,
        randomizeColorModes: true,
        randomizeVisualMode: true,
      });
    }
  }
  return startupSnapshot;
}
