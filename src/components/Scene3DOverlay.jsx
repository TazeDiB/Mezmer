/**
 * Full-viewport 3D sample overlay; samples the live 2D WebGL canvas as mesh texture.
 */
import React from 'react';
import { useThreeDMode } from '../hooks/useThreeDMode.js';

export default function Scene3DOverlay({
  enabled,
  sourceCanvas,
  containerRef,
  audioData,
}) {
  useThreeDMode(containerRef, enabled, sourceCanvas, audioData);
  return null;
}
