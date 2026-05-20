/**
 * Preset encode/decode, clipboard copy, and URL hash loading (presets v2 + gallery stacks).
 */

import { useState, useCallback, useEffect } from 'react';
import { encodePreset, decodePreset, parseShareUrl, applyGalleryStacksFromPreset } from '../lib/presets.js';
import { getGalleryWallStacks } from '../lib/galleryStack.js';
import { getFloatingObjectStacks } from '../lib/galleryFloatingObjects.js';

export function usePresetShare({
  params,
  visualMode,
  globalColorMode,
  forceGlobalColor,
  applyPresetToState,
}) {
  const [presetCode, setPresetCode] = useState('');

  const loadPresetIntoApp = useCallback(
    (preset) => {
      if (!preset) return;
      applyGalleryStacksFromPreset(
        preset,
        preset.blendSpeedFactor ?? params.blendSpeedFactor ?? 1
      );
      applyPresetToState(preset);
    },
    [applyPresetToState, params.blendSpeedFactor]
  );

  const handleCopyPreset = useCallback(async () => {
    const encoded = encodePreset({
      ...params,
      visualMode,
      globalColorMode,
      forceGlobalColor,
      galleryWallStacks: getGalleryWallStacks(),
      floatingObjectStacks: getFloatingObjectStacks(),
    });
    if (!encoded) return;
    setPresetCode(encoded);
    try {
      await navigator.clipboard.writeText(encoded);
    } catch (err) {
      console.warn('Failed to copy preset to clipboard:', err);
    }
  }, [params, visualMode, globalColorMode, forceGlobalColor]);

  const handleLoadPreset = useCallback(() => {
    const preset = decodePreset(presetCode);
    if (preset) loadPresetIntoApp(preset);
  }, [presetCode, loadPresetIntoApp]);

  const handleLoadFromUrl = useCallback(() => {
    const hash = parseShareUrl();
    if (!hash) return;
    const preset = decodePreset(hash);
    if (preset) {
      setPresetCode(hash);
      loadPresetIntoApp(preset);
    }
  }, [loadPresetIntoApp]);

  useEffect(() => {
    const hash = parseShareUrl();
    if (!hash) return;
    const preset = decodePreset(hash);
    if (preset) {
      setPresetCode(hash);
      loadPresetIntoApp(preset);
    }
  }, [loadPresetIntoApp]);

  return {
    presetCode,
    setPresetCode,
    handleCopyPreset,
    handleLoadPreset,
    handleLoadFromUrl,
  };
}
