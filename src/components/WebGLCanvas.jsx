/**
 * WebGL canvas container: mounts useWebGL and forwards refs/callbacks.
 */
import React, { useRef, useEffect } from 'react';
import { useWebGL } from '../hooks/useWebGL.js';
import { CANVAS_STYLES } from '../constants/controlStyles.js';
import { useThreeDMode } from '../hooks/useThreeDMode.js';

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
  onCanvasReady,
  onMouseWheel,
  onCanvasPointerDown,
  ...rest
}) {
  const containerRef = useRef(null);
  const threeDStateRef = useRef({ enabled: false });
  const threeDEnabledRef = useRef(threeDEnabled);
  threeDEnabledRef.current = threeDEnabled;

  useThreeDMode(containerRef, threeDEnabled, threeDStateRef, audioData);

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
    animationProgress,
    undefined,
    threeDStateRef,
    threeDEnabledRef
  );

  useEffect(() => {}, [params, uniforms]);
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
      ref: containerRef,
      className: CANVAS_STYLES.canvasContainer,
      style: { position: 'relative', cursor: 'crosshair' },
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
        if (threeDEnabled) {
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
    }
  );
}
