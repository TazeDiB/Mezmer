/**
 * WebGL canvas container: mounts useWebGL and forwards refs/callbacks.
 */
import React, { useRef, useEffect } from 'react';
import { useWebGL } from '../hooks/useWebGL.js';
import { CANVAS_STYLES } from '../constants/controlStyles.js';

export default function WebGLCanvas({
  params,
  audioData,
  blendSpeedFactor,
  visualMode,
  visualModes,
  pixelationFactor,
  globalColorMode,
  forceGlobalColor,
  patternNameToIndex,
  isRandomizing,
  audioTextureRef,
  estimatedBpm,
  isBassPresent,
  isDrumsPresent,
  onBlendMaterialReady,
  onShaderMaterialReady,
  animationProgress,
  visualModeTransition,
  drumOnsetDetected,
  asciiCharSize,
  ...rest
}) {
  const containerRef = useRef(null);
  const { uniforms, blendMaterialRef, shaderMaterialRef } = useWebGL(
    containerRef,
    params,
    blendSpeedFactor,
    visualMode,
    pixelationFactor,
    globalColorMode,
    forceGlobalColor,
    patternNameToIndex,
    isRandomizing,
    audioData,
    audioTextureRef,
    estimatedBpm,
    isBassPresent,
    isDrumsPresent,
    animationProgress
  );

  useEffect(() => {}, [params, uniforms]);
  useEffect(() => {
    if (onBlendMaterialReady && blendMaterialRef) onBlendMaterialReady(blendMaterialRef);
  }, [onBlendMaterialReady, blendMaterialRef]);
  useEffect(() => {
    if (onShaderMaterialReady && shaderMaterialRef) onShaderMaterialReady(shaderMaterialRef);
  }, [onShaderMaterialReady, shaderMaterialRef]);

  return React.createElement('div', {
    ref: containerRef,
    className: CANVAS_STYLES.canvasContainer,
    ...rest,
  });
}
