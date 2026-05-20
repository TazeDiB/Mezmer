/**
 * WebGL canvas container: mounts useWebGL and forwards refs/callbacks.
 */
import React, { useRef, useEffect } from 'react';
import { useWebGL } from '../hooks/useWebGL.js';
import { CANVAS_STYLES } from '../constants/controlStyles.js';
import { useThreeDMode } from '../hooks/useThreeDMode.js';
import { useStressTestMode, isStressTestFlyMode } from '../hooks/useStressTestMode.js';
import FpsOverlay from './FpsOverlay.jsx';

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
  threeDEnabled = false,
  stressTestMode = 'off',
  showFpsCounter = false,
  vsyncEnabled = true,
  fps = 0,
  onFpsUpdate,
  onCanvasReady,
  onMouseWheel,
  onCanvasPointerDown,
  ...rest
}) {
  const containerRef = useRef(null);
  const threeDStateRef = useRef({ enabled: false });
  const stressStateRef = useRef({ enabled: false, mode: 'off' });
  const threeDEnabledRef = useRef(threeDEnabled);
  const stressTestModeRef = useRef(stressTestMode);
  const showFpsCounterRef = useRef(showFpsCounter);
  const vsyncEnabledRef = useRef(vsyncEnabled);
  const onFpsUpdateRef = useRef(onFpsUpdate);
  threeDEnabledRef.current = threeDEnabled;
  stressTestModeRef.current = stressTestMode;
  showFpsCounterRef.current = showFpsCounter;
  vsyncEnabledRef.current = vsyncEnabled;
  onFpsUpdateRef.current = onFpsUpdate;

  const galleryThreeDEnabled = threeDEnabled && stressTestMode === 'off';
  const stressFlyEnabled = isStressTestFlyMode(stressTestMode);
  useThreeDMode(containerRef, galleryThreeDEnabled, threeDStateRef, audioData);
  useStressTestMode(containerRef, stressTestMode, params.stressTestCount ?? 4, stressStateRef);

  const { uniforms, blendMaterialRef, shaderMaterialRef, canvasRef } = useWebGL(
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
    drumOnsetDetected,
    undefined,
    threeDStateRef,
    threeDEnabledRef,
    stressTestModeRef,
    stressStateRef,
    showFpsCounterRef,
    onFpsUpdateRef,
    vsyncEnabledRef
  );

  const usesPointerLock = galleryThreeDEnabled || stressFlyEnabled;

  useEffect(() => {
    if (onBlendMaterialReady && blendMaterialRef) onBlendMaterialReady(blendMaterialRef);
  }, [onBlendMaterialReady, blendMaterialRef]);
  useEffect(() => {
    if (onShaderMaterialReady && shaderMaterialRef) onShaderMaterialReady(shaderMaterialRef);
  }, [onShaderMaterialReady, shaderMaterialRef]);

  useEffect(() => {
    if (!onCanvasReady) return;
    let cancelled = false;
    const waitForCanvas = () => {
      if (cancelled) return;
      const canvas = canvasRef?.current;
      if (canvas) {
        onCanvasReady(canvas);
        return;
      }
      requestAnimationFrame(waitForCanvas);
    };
    waitForCanvas();
    return () => {
      cancelled = true;
    };
  }, [onCanvasReady, canvasRef]);

  return React.createElement(
    'div',
    {
      className: CANVAS_STYLES.canvasContainer,
      style: { position: 'relative', width: '100%', height: '100%', cursor: 'crosshair' },
      ...rest,
      onWheel: (event) => {
        rest.onWheel?.(event);
        if (onMouseWheel) {
          onMouseWheel(event);
        }
      },
      onContextMenu: (event) => {
        rest.onContextMenu?.(event);
        event.preventDefault();
      },
      onPointerDown: (event) => {
        rest.onPointerDown?.(event);
        const canvas = canvasRef?.current;
        const td = threeDStateRef.current;

        if (stressFlyEnabled && !galleryThreeDEnabled) {
          if (event.button === 0 && canvas) {
            event.preventDefault();
            if (document.pointerLockElement !== canvas) {
              canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
            }
          } else if (event.button === 2 && onCanvasPointerDown) {
            event.preventDefault();
            onCanvasPointerDown(event);
          }
          return;
        }

        if (usesPointerLock) {
          event.preventDefault();
          if (event.button === 0) {
            if (canvas && document.pointerLockElement !== canvas) {
              canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {});
            }
            if (td) {
              td.brushActive = true;
              td.brushStartTime = performance.now();
            }
          } else if (event.button === 2 && onCanvasPointerDown) {
            onCanvasPointerDown(event);
          }
          return;
        }
        if (event.button === 0 && td) {
          td.brushActive = true;
          td.brushStartTime = performance.now();
        } else if (event.button === 2 && onCanvasPointerDown) {
          event.preventDefault();
          onCanvasPointerDown(event);
        }
      },
      onPointerUp: (event) => {
        rest.onPointerUp?.(event);
        if (event.button === 0 && threeDStateRef.current) {
          threeDStateRef.current.brushActive = false;
        }
      },
      onPointerCancel: (event) => {
        rest.onPointerCancel?.(event);
        if (threeDStateRef.current) {
          threeDStateRef.current.brushActive = false;
        }
      },
      onLostPointerCapture: (event) => {
        rest.onLostPointerCapture?.(event);
        if (threeDStateRef.current) {
          threeDStateRef.current.brushActive = false;
        }
      },
    },
    React.createElement('div', {
      ref: containerRef,
      style: { position: 'absolute', inset: 0, zIndex: 0 },
    }),
    React.createElement(FpsOverlay, { fps, visible: showFpsCounter })
  );
}
