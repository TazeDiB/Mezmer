/**
 * WebGL / Three.js hook: thin orchestrator over src/lib/webgl modules.
 */
import * as THREE from 'three';
import React from 'react';
import { createGalleryFaceState } from '../lib/galleryStack.js';
import { createFloatingObjectState } from '../lib/galleryFloatingObjects.js';
import { createStressTileState, STRESS_TEST_MAX_2D, isParticleStressMode } from '../lib/stressTest.js';
import {
  bindStressTileTextures,
  updateStressTestSceneSize,
} from '../lib/stressTestScene.js';
import {
  bindStressParticleTextures,
  layoutStressParticles,
} from '../lib/stressTestParticles.js';
import { isStressTestMode } from '../lib/stressTest.js';
import { createWebGLContext, VISUAL_MODE_INDEX } from '../lib/webgl/createWebGLContext.js';
import {
    syncUniformsFromParams,
    advanceMainLayerTimes,
    advanceRainbowPhase,
} from '../lib/webgl/syncUniformsFromParams.js';
import {
    runGalleryFrameLoop,
    handleGalleryTeardown,
    bindGalleryMeshTextures,
    renderGalleryThreeScene,
} from '../lib/webgl/galleryFrameLoop.js';
import { runCanvas2DFrameLoop, renderDisplayQuad } from '../lib/webgl/canvas2DFrameLoop.js';
import {
    runStressTestFrameLoop,
    renderStressTestScene,
} from '../lib/webgl/stressTestFrameLoop.js';

export function useWebGL(
    containerRef,
    params,
    blendSpeedFactor,
    visualMode,
    pixelationFactor,
    colorMode,
    forceGlobalColor,
    patternNameToIndex,
    isRandomizing,
    audioData,
    audioTextureRef,
    bpm,
    isBassPresent,
    isDrumsPresent,
    drumOnsetDetected,
    brushUvOverrideRef,
    threeDStateRef,
    threeDEnabledRef,
    stressTestModeRef,
    stressStateRef,
    showFpsCounterRef,
    onFpsUpdateRef,
    vsyncEnabledRef
) {
    const paramsRef = React.useRef(params);
    const blendSpeedFactorRef = React.useRef(blendSpeedFactor);
    const visualModeRef = React.useRef(visualMode);
    const pixelationFactorRef = React.useRef(pixelationFactor);
    const asciiCharSizeRef = React.useRef(params.asciiCharSize);
    const patternNameToIndexRef = React.useRef(patternNameToIndex || {});
    const colorModeRef = React.useRef(colorMode);
    const forceGlobalColorRef = React.useRef(forceGlobalColor);
    const isRandomizingRef = React.useRef(isRandomizing);
    const bpmRef = React.useRef(bpm);
    const isBassPresentRef = React.useRef(isBassPresent);
    const isDrumsPresentRef = React.useRef(isDrumsPresent);
    const drumOnsetRef = React.useRef(drumOnsetDetected);

    const rendererRef = React.useRef(null);
    const shaderSceneRef = React.useRef(null);
    const shaderCameraRef = React.useRef(null);
    const shaderMaterialRef = React.useRef(null);
    const shaderMeshRef = React.useRef(null);
    const animationFrameIdRef = React.useRef(null);
    const freqBinCountRef = React.useRef(
        audioData?.frequencyData?.length ?? audioData?.freqData?.length ?? 128
    );
    const audioTexRef = audioTextureRef;

    const feedbackReadRef = React.useRef(null);
    const feedbackWriteRef = React.useRef(null);
    const blendReadRef = React.useRef(null);
    const blendWriteRef = React.useRef(null);
    const feedbackPingIndexRef = React.useRef(0);
    const blendPingFlipRef = React.useRef(true);

    const displaySceneRef = React.useRef(null);
    const displayMaterialRef = React.useRef(null);
    const displayMeshRef = React.useRef(null);
    const blendSceneRef = React.useRef(null);
    const blendMaterialRef = React.useRef(null);
    const blendMeshRef = React.useRef(null);

    const rainbowGradientRef = React.useRef(null);
    const fireGradientRef = React.useRef(null);
    const iceGradientRef = React.useRef(null);

    const layerBlendStateRef = React.useRef(
        Array(4)
            .fill(null)
            .map(() => ({
                isBlending: false,
                previousPatternType: 0,
                targetPatternType: 0,
                originalBlendTargetType: 0,
                originalBlendAmount: 0,
                blendStartTime: 0,
            }))
    );
    const accumulatedTimesRef = React.useRef(
        Array(4)
            .fill(null)
            .map(() => ({
                turing: 0,
                spiralNoise: 0,
                flow: 0,
                cube: 0,
                smoothSpiral: 0,
            }))
    );
    const accumulatedSymmetryRef = React.useRef([0, 0, 0, 0]);
    const integratedTimeRef = React.useRef(0);
    const lastFrameTimeRef = React.useRef(performance.now());
    const rainbowPhaseRef = React.useRef(0);

    const heightMapRTRef = React.useRef(null);
    const displayBlitSceneRef = React.useRef(null);
    const displayBlitMeshRef = React.useRef(null);
    const heightBlitSceneRef = React.useRef(null);
    const heightBlitMeshRef = React.useRef(null);
    const blitCameraRef = React.useRef(null);
    const canvasDomRef = React.useRef(null);
    const mainCanvasSizeRef = React.useRef({ w: 0, h: 0 });

    const galleryFacesRTRef = React.useRef(null);
    const galleryFloatingRTRef = React.useRef(null);
    const galleryFaceStateRef = React.useRef(createGalleryFaceState());
    const galleryFloatingStateRef = React.useRef(createFloatingObjectState());
    const galleryFaceCursorRef = React.useRef(0);
    const galleryFloatingCursorRef = React.useRef(0);
    const galleryInitializedRef = React.useRef(false);
    const galleryWarmupRef = React.useRef(false);
    const wasGalleryReadyRef = React.useRef(false);

    const stressTileTargetsRef = React.useRef(null);
    const stressTileStateRef = React.useRef(createStressTileState(STRESS_TEST_MAX_2D));

    const visualModeFromIndexRef = React.useRef(params.visualModeFromIndex ?? 0);
    const visualModeToIndexRef = React.useRef(params.visualModeToIndex ?? 0);
    const visualModeBlendRef = React.useRef(params.visualModeBlend ?? 1);
    const beatStrengthRef = React.useRef(0);
    const spectralCentroidRef = React.useRef(0);
    const audioDataRef = React.useRef(audioData);
    audioDataRef.current = audioData;
    const onAnimateRef = React.useRef(null);
    const fpsSampleRef = React.useRef({ frames: 0, lastMs: 0 });

    showFpsCounterRef = showFpsCounterRef ?? { current: false };
    onFpsUpdateRef = onFpsUpdateRef ?? { current: null };

    const mouseUvRef = React.useRef(new THREE.Vector2(0.5, 0.5));
    const mouseDirRef = React.useRef(new THREE.Vector3(0, 0, 1));
    const sphereCenterRef = React.useRef(new THREE.Vector3());
    const pointerRaycasterRef = React.useRef(new THREE.Raycaster());
    const pointerNdcRef = React.useRef(new THREE.Vector2());

    const webglRefs = {
        rendererRef,
        shaderSceneRef,
        shaderCameraRef,
        shaderMaterialRef,
        shaderMeshRef,
        freqBinCountRef,
        feedbackReadRef,
        feedbackWriteRef,
        blendReadRef,
        blendWriteRef,
        displaySceneRef,
        displayMaterialRef,
        displayMeshRef,
        blendSceneRef,
        blendMaterialRef,
        blendMeshRef,
        rainbowGradientRef,
        fireGradientRef,
        iceGradientRef,
        heightMapRTRef,
        displayBlitSceneRef,
        displayBlitMeshRef,
        heightBlitSceneRef,
        heightBlitMeshRef,
        blitCameraRef,
        canvasDomRef,
        mainCanvasSizeRef,
        galleryFacesRTRef,
        galleryFloatingRTRef,
        stressTileTargetsRef,
        stressStateRef,
        mouseUvRef,
        mouseDirRef,
        sphereCenterRef,
        pointerRaycasterRef,
        pointerNdcRef,
    };

    const runAnimationFrame = React.useCallback(
        (nowMs) => {
            const renderer = rendererRef.current;
            const shaderMaterial = shaderMaterialRef.current;
            const shaderScene = shaderSceneRef.current;
            const shaderCamera = shaderCameraRef.current;
            const blendScene = blendSceneRef.current;
            const blendMaterial = blendMaterialRef.current;
            const feedbackRead = feedbackReadRef.current;
            const feedbackWrite = feedbackWriteRef.current;
            const blendRead = blendReadRef.current;
            const blendWrite = blendWriteRef.current;
            const displayScene = displaySceneRef.current;
            const displayMaterial = displayMaterialRef.current;
            const displayMesh = displayMeshRef.current;

            if (
                !renderer ||
                !shaderMaterial ||
                !shaderScene ||
                !shaderCamera ||
                !feedbackRead ||
                !feedbackWrite ||
                !blendRead ||
                !blendWrite ||
                !displayScene
            ) {
                console.error('WebGL context lost or not initialized in animate.');
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
                return;
            }

            const uniforms = shaderMaterial.uniforms;
            if (!uniforms) {
                console.error('Uniforms not found in material.');
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
                return;
            }

            const deltaSec = (nowMs - lastFrameTimeRef.current) / 1e3;
            const targetFps = bpmRef.current > 0 ? bpmRef.current : 120;
            const fpsScale = Math.min(Math.max(targetFps / 120, 0.75), 4);
            const timeScale = (paramsRef.current.globalTimeScale ?? 1) * fpsScale;
            integratedTimeRef.current += deltaSec * timeScale;
            lastFrameTimeRef.current = nowMs;

            if (showFpsCounterRef?.current && onFpsUpdateRef?.current) {
                const sample = fpsSampleRef.current;
                sample.frames += 1;
                if (sample.lastMs === 0) sample.lastMs = nowMs;
                const sampleElapsed = nowMs - sample.lastMs;
                if (sampleElapsed >= 400) {
                    const fps = (sample.frames * 1000) / sampleElapsed;
                    onFpsUpdateRef.current(Math.round(fps * 10) / 10);
                    sample.frames = 0;
                    sample.lastMs = nowMs;
                }
            }

            const tdGallery = threeDStateRef?.current;
            const stressMode = stressTestModeRef?.current ?? 'off';
            const stressActive = isStressTestMode(stressMode);
            const stressState = stressStateRef?.current;
            const stressReady =
                stressActive &&
                stressState?.enabled &&
                stressState.scene &&
                stressState.camera &&
                stressTileTargetsRef.current;

            const wantsGallery =
                !stressActive &&
                threeDEnabledRef != null &&
                threeDEnabledRef.current &&
                tdGallery != null &&
                tdGallery.isGallery;
            const galleryReady =
                wantsGallery &&
                tdGallery.enabled &&
                tdGallery.scene &&
                tdGallery.wallMeshes &&
                tdGallery.camera &&
                galleryFacesRTRef.current &&
                galleryFloatingRTRef.current;

            if (!wantsGallery) galleryFaceCursorRef.current = 0;

            if (wasGalleryReadyRef.current && !galleryReady) {
                handleGalleryTeardown({
                    containerRef,
                    uniforms,
                    renderer,
                    feedbackReadRef,
                    feedbackWriteRef,
                    blendReadRef,
                    blendWriteRef,
                    feedbackPingIndexRef,
                    blendPingFlipRef,
                    params: paramsRef.current,
                    threeDStateRef,
                    galleryInitializedRef,
                });
            }
            wasGalleryReadyRef.current = galleryReady;

            advanceRainbowPhase(
                rainbowPhaseRef,
                deltaSec,
                paramsRef.current.rainbowAnimationSpeed ?? 0
            );

            advanceMainLayerTimes({
                params: paramsRef.current,
                deltaSec,
                timeScale,
                accumulatedTimesRef,
                accumulatedSymmetryRef,
            });

            syncUniformsFromParams({
                uniforms,
                nowMs,
                params: paramsRef.current,
                galleryReady: galleryReady || stressReady,
                integratedTimeRef,
                rainbowPhaseRef,
                visualModeFromIndexRef,
                visualModeToIndexRef,
                visualModeBlendRef,
                asciiCharSizeRef,
                pixelationFactorRef,
                colorModeRef,
                forceGlobalColorRef,
                patternNameToIndexRef,
                bpmRef,
                isBassPresentRef,
                isDrumsPresentRef,
                accumulatedTimesRef,
                accumulatedSymmetryRef,
                audioData: audioDataRef.current,
                beatStrengthRef,
                spectralCentroidRef,
                mouseUvRef: mouseUvRef,
                mouseDirRef: mouseDirRef,
                brushUvOverrideRef,
                threeDStateRef,
                threeDEnabledRef,
                pointerRaycasterRef,
                pointerNdcRef,
            });

            let displayTexture;

            if (stressReady) {
                const { tileOutputs, activeCount } = runStressTestFrameLoop({
                    nowMs,
                    deltaSec,
                    timeScale,
                    containerRef,
                    renderer,
                    uniforms,
                    params: paramsRef.current,
                    shaderScene,
                    shaderCamera,
                    blendScene,
                    blendMaterial,
                    stressTileTargetsRef,
                    stressTileStateRef,
                    patternNameToIndexRef,
                    accumulatedTimesRef,
                    accumulatedSymmetryRef,
                    stressTestMode: stressMode,
                    stressTestCount: paramsRef.current.stressTestCount ?? 4,
                    stressStateRef,
                    galleryInitializedRef,
                    galleryWarmupRef,
                    heightBlitSceneRef,
                    heightBlitMeshRef,
                    blitCameraRef,
                });
                if (isParticleStressMode(stressState.mode)) {
                    bindStressParticleTextures(stressState, tileOutputs, activeCount);
                } else {
                    bindStressTileTextures(
                        stressState,
                        tileOutputs,
                        stressTileTargetsRef.current,
                        activeCount,
                        {
                            useHeightmap: !!paramsRef.current.patternDisplacementEnabled,
                            displacementStrength: paramsRef.current.patternDisplacement ?? 0.12,
                        }
                    );
                }
                if (stressState.activeCount !== activeCount) {
                    stressState.activeCount = activeCount;
                    const cw = containerRef.current?.clientWidth ?? 800;
                    const ch = containerRef.current?.clientHeight ?? 600;
                    if (isParticleStressMode(stressState.mode)) {
                        layoutStressParticles(stressState, activeCount);
                    } else {
                        updateStressTestSceneSize(stressState, cw, ch);
                    }
                }
                renderStressTestScene({ renderer, stressState, deltaSec });
            } else if (galleryReady) {
                const { galleryFaceOutputs, galleryFloatingOutputs } = runGalleryFrameLoop({
                    nowMs,
                    deltaSec,
                    timeScale,
                    containerRef,
                    renderer,
                    uniforms,
                    params: paramsRef.current,
                    shaderScene,
                    shaderCamera,
                    blendScene,
                    blendMaterial,
                    galleryFacesRTRef,
                    galleryFloatingRTRef,
                    galleryFaceStateRef,
                    galleryFloatingStateRef,
                    galleryFaceCursorRef,
                    galleryFloatingCursorRef,
                    galleryInitializedRef,
                    galleryWarmupRef,
                    accumulatedTimesRef,
                    accumulatedSymmetryRef,
                    patternNameToIndexRef,
                    heightBlitSceneRef,
                    heightBlitMeshRef,
                    blitCameraRef,
                    threeDStateRef,
                });

                const td = threeDStateRef.current;
                bindGalleryMeshTextures({
                    params: paramsRef.current,
                    threeDState: td,
                    galleryFacesRTRef,
                    galleryFaceOutputs,
                    galleryFloatingOutputs,
                    galleryFloatingRTRef,
                });
                renderGalleryThreeScene({ renderer, threeDState: td, deltaSec });
            } else {
                const canvas2d = runCanvas2DFrameLoop({
                    renderer,
                    uniforms,
                    shaderScene,
                    shaderCamera,
                    blendScene,
                    blendMaterial,
                    feedbackReadRef,
                    feedbackWriteRef,
                    blendReadRef,
                    blendWriteRef,
                    feedbackPingIndexRef,
                    blendPingFlipRef,
                    galleryInitializedRef,
                    galleryWarmupRef,
                });
                displayTexture = canvas2d.displayTexture;
                renderDisplayQuad({
                    renderer,
                    displayScene,
                    displayMaterial,
                    displayMesh,
                    shaderCamera,
                    displayTexture,
                });
                blendPingFlipRef.current = !blendPingFlipRef.current;
            }
        },
        [brushUvOverrideRef, containerRef, threeDEnabledRef, threeDStateRef, stressTestModeRef, stressStateRef, showFpsCounterRef, onFpsUpdateRef]
    );

    onAnimateRef.current = runAnimationFrame;

    React.useEffect(() => {
        paramsRef.current = params;
        blendSpeedFactorRef.current = blendSpeedFactor;
        visualModeRef.current = visualMode;
        pixelationFactorRef.current = params.pixelationFactor;
        asciiCharSizeRef.current = params.asciiCharSize;
        colorModeRef.current = colorMode;
        forceGlobalColorRef.current = forceGlobalColor;
        patternNameToIndexRef.current = patternNameToIndex || {};
        isRandomizingRef.current = isRandomizing;
        bpmRef.current = bpm;
        isBassPresentRef.current = isBassPresent;
        isDrumsPresentRef.current = isDrumsPresent;
        drumOnsetRef.current = drumOnsetDetected;

        const blend = params.visualModeBlend ?? 1;
        visualModeFromIndexRef.current =
            params.visualModeFromIndex ?? VISUAL_MODE_INDEX[visualMode] ?? 0;
        visualModeToIndexRef.current =
            params.visualModeToIndex ?? VISUAL_MODE_INDEX[visualMode] ?? 0;
        visualModeBlendRef.current = blend;

        const freqLen =
            audioData?.frequencyData?.length ?? audioData?.freqData?.length;
        if (
            freqLen &&
            freqLen !== freqBinCountRef.current &&
            shaderMaterialRef.current
        ) {
            freqBinCountRef.current = freqLen;
            if (shaderMaterialRef.current.uniforms.u_frequency_bin_count) {
                shaderMaterialRef.current.uniforms.u_frequency_bin_count.value = freqLen;
            }
        }
    }, [
        params,
        blendSpeedFactor,
        visualMode,
        colorMode,
        forceGlobalColor,
        patternNameToIndex,
        isRandomizing,
        bpm,
        isBassPresent,
        isDrumsPresent,
        drumOnsetDetected,
    ]);

    React.useEffect(() => {
        if (!containerRef.current) return;

        const cleanup = createWebGLContext({
            containerRef,
            refs: webglRefs,
            paramsRef,
            visualModeRef,
            visualModeFromIndexRef,
            visualModeToIndexRef,
            visualModeBlendRef,
            pixelationFactorRef,
            asciiCharSizeRef,
            colorModeRef,
            forceGlobalColorRef,
            patternNameToIndexRef,
            isRandomizingRef,
            bpmRef,
            isBassPresentRef,
            isDrumsPresentRef,
            drumOnsetRef,
            audioTextureRef: audioTexRef,
            audioData,
            layerBlendStateRef,
            accumulatedTimesRef,
            accumulatedSymmetryRef,
            animationFrameIdRef,
            lastFrameTimeRef,
            onAnimate: (timestamp) => onAnimateRef.current?.(timestamp),
            threeDStateRef,
            threeDEnabledRef,
            brushUvOverrideRef,
            stressStateRef,
            vsyncEnabledRef,
        });

        return cleanup;
    }, [containerRef, audioTexRef]);

    return {
        uniforms: shaderMaterialRef.current?.uniforms,
        blendMaterialRef,
        shaderMaterialRef,
        canvasRef: canvasDomRef,
    };
}
