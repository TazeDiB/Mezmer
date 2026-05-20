/**
 * WebGL renderer, materials, render targets, resize/cleanup.
 */
import * as THREE from 'three';
import {
    createGalleryFaceTargets,
    createGalleryFaceState,
    resizeGalleryFaceTargets,
    disposeGalleryFaceTargets,
} from '../galleryStack.js';
import {
    createFloatingObjectState,
    createFloatingObjectTargets,
    resizeFloatingObjectTargets,
    disposeFloatingObjectTargets,
} from '../galleryFloatingObjects.js';
import {
    STRESS_TEST_MAX_2D,
    createStressTileTargets,
    resizeStressTileTargets,
    disposeStressTileTargets,
} from '../stressTest.js';
import { updateStressTestSceneSize } from '../stressTestScene.js';
import { updateStressParticleSceneSize } from '../stressTestParticles.js';
import { isParticleStressMode } from '../stressTest.js';
import {
    MAIN_VERTEX_SHADER,
    MAIN_FRAGMENT_SHADER,
    BLEND_VERTEX_SHADER,
    BLEND_FRAGMENT_SHADER,
    BLIT_VERTEX_SHADER,
    HEIGHT_BLIT_FRAGMENT,
    COLOR_BLIT_FRAGMENT,
    VISUAL_MODE_INDEX,
    COLOR_MODE_INDEX,
    createRainbowGradientTexture,
    createFireGradientTexture,
    createIceGradientTexture,
} from './constants.js';

function buildLayerUniformEntry(layer, patternNameToIndex, defaults = {}) {
    const patternMap = patternNameToIndex;
    return {
        patternType: patternMap ? patternMap[layer?.patternType] ?? 0 : 0,
        blendTargetType: patternMap ? patternMap[layer?.blendTargetType] ?? 0 : 0,
        blendAmount: layer?.blendAmount ?? defaults.blendAmount ?? 0,
        symmetry: layer?.symmetry ?? defaults.symmetry ?? 1,
        distortionStrength:
            layer?.distortion ?? layer?.distortionStrength ?? defaults.distortionStrength ?? 0,
        colorMode: COLOR_MODE_INDEX[layer?.colorMode] ?? 0,
        blendTargetColorMode:
            COLOR_MODE_INDEX[layer?.blendTargetColorMode] ??
            COLOR_MODE_INDEX[layer?.colorMode] ??
            0,
        color1: new THREE.Vector3(0, 0, 0),
        color2: new THREE.Vector3(0, 0, 0),
        color3: new THREE.Vector3(0, 0, 0),
        freq: layer?.freq ?? layer?.layer2Freq ?? defaults.freq ?? 10,
        weaveThickness: layer?.weaveThickness ?? defaults.weaveThickness ?? 0.02,
        turingScale: layer?.turingScale ?? defaults.turingScale ?? 15,
        turingSpeed: layer?.turingSpeed ?? defaults.turingSpeed ?? 0.5,
        turingFeed: layer?.turingFeed ?? defaults.turingFeed ?? 0.035,
        turingKill: layer?.turingKill ?? defaults.turingKill ?? 0.065,
        turingDiffusionA: layer?.turingDiffusionA ?? defaults.turingDiffusionA ?? 1,
        turingDiffusionB: layer?.turingDiffusionB ?? defaults.turingDiffusionB ?? 0.5,
        voronoiScale: layer?.voronoiScale ?? defaults.voronoiScale ?? 5,
        voronoiEdgeWidth: layer?.voronoiEdgeWidth ?? defaults.voronoiEdgeWidth ?? 0.02,
        spiralArms: layer?.spiralArms ?? defaults.spiralArms ?? 5,
        spiralTightness: layer?.spiralTightness ?? layer?.tightness ?? defaults.spiralTightness ?? 0.5,
        spiralNoiseScale: layer?.spiralNoiseScale ?? defaults.spiralNoiseScale ?? 1,
        spiralNoiseSpeed: layer?.spiralNoiseSpeed ?? defaults.spiralNoiseSpeed ?? 0.1,
        audioSensitivity: layer?.audioSensitivity ?? defaults.audioSensitivity ?? 1,
        bassSensitivity: layer?.bassSensitivity ?? defaults.bassSensitivity ?? 1,
        midSensitivity: layer?.midSensitivity ?? defaults.midSensitivity ?? 1,
        highSensitivity: layer?.highSensitivity ?? defaults.highSensitivity ?? 1,
        flowComplexity: layer?.flowComplexity ?? defaults.flowComplexity ?? 0.6,
        cubeSize: layer?.cubeSize ?? defaults.cubeSize ?? 0.5,
        flowCurl: layer?.flowCurl ?? defaults.flowCurl ?? 0.4,
        flowSpeed: layer?.flowSpeed ?? defaults.flowSpeed ?? 0,
        rdComplexity: layer?.rdComplexity ?? defaults.rdComplexity ?? 0.5,
        rdSpotSize: layer?.rdSpotSize ?? defaults.rdSpotSize ?? 0.5,
        layerSymmetryOffsetSpeed: layer?.layerSymmetryOffsetSpeed ?? defaults.layerSymmetryOffsetSpeed ?? 0,
        fractalIterations: layer?.fractalIterations ?? defaults.fractalIterations ?? 4,
        fractalAngle: layer?.fractalAngle ?? defaults.fractalAngle ?? 0.5,
        fractalSpeed: layer?.fractalSpeed ?? defaults.fractalSpeed ?? 0.3,
        fractalThickness: layer?.fractalThickness ?? defaults.fractalThickness ?? 0.02,
        lissajousFreqX: layer?.lissajousFreqX ?? defaults.lissajousFreqX ?? 3,
        lissajousFreqY: layer?.lissajousFreqY ?? defaults.lissajousFreqY ?? 4,
        lissajousSpeed: layer?.lissajousSpeed ?? defaults.lissajousSpeed ?? 0.2,
        lissajousThickness: layer?.lissajousThickness ?? defaults.lissajousThickness ?? 0.03,
        accumulatedSymmetryAngle: 0,
    };
}

function buildInitialLayerUniforms(params, patternNameToIndex) {
    const p = params;
    return [
        buildLayerUniformEntry(p.layer1, patternNameToIndex),
        buildLayerUniformEntry(p.layer2, patternNameToIndex, {
            freq: 10,
            weaveThickness: 0.025,
            turingScale: 10,
            turingSpeed: 0.6,
            turingFeed: 0.055,
            turingKill: 0.062,
            voronoiScale: 6,
            voronoiEdgeWidth: 0.03,
            spiralArms: 6,
            spiralTightness: 0.6,
            spiralNoiseScale: 1.2,
            spiralNoiseSpeed: 0.15,
            flowComplexity: 0.7,
            flowCurl: 0.5,
        }),
        buildLayerUniformEntry(p.layer3, patternNameToIndex, {
            freq: 12,
            weaveThickness: 0.015,
            turingScale: 20,
            turingSpeed: 0.4,
            turingFeed: 0.025,
            turingKill: 0.058,
            voronoiScale: 4,
            voronoiEdgeWidth: 0.015,
            spiralArms: 4,
            spiralTightness: 0.4,
            spiralNoiseScale: 0.8,
            spiralNoiseSpeed: 0.08,
            flowComplexity: 0.5,
            flowCurl: 0.6,
        }),
        buildLayerUniformEntry(p.layer4, patternNameToIndex, {
            freq: 8,
            weaveThickness: 0.03,
            turingScale: 12,
            turingSpeed: 0.7,
            turingFeed: 0.04,
            turingKill: 0.06,
            voronoiScale: 7,
            voronoiEdgeWidth: 0.025,
            spiralArms: 7,
            spiralTightness: 0.7,
            spiralNoiseScale: 1.5,
            spiralNoiseSpeed: 0.12,
            flowComplexity: 0.8,
            flowCurl: 0.3,
        }),
    ];
}

/**
 * @param {object} options
 * @returns {() => void} cleanup
 */
export function createWebGLContext(options) {
    const {
        containerRef,
        refs,
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
        audioTextureRef,
        audioData,
        layerBlendStateRef,
        accumulatedTimesRef,
        accumulatedSymmetryRef,
        animationFrameIdRef,
        lastFrameTimeRef,
        onAnimate,
        threeDStateRef,
        threeDEnabledRef,
        brushUvRef,
        stressStateRef,
        vsyncEnabledRef,
    } = options;

    const container = containerRef.current;
    if (!container) return () => {};

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.autoClear = false;
    container.appendChild(renderer.domElement);
    refs.rendererRef.current = renderer;
    refs.canvasDomRef.current = renderer.domElement;

    const shaderScene = new THREE.Scene();
    refs.shaderSceneRef.current = shaderScene;

    const shaderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    shaderCamera.position.z = 1;
    refs.shaderCameraRef.current = shaderCamera;

    const freqBinCount =
        audioData?.frequencyData?.length ?? audioData?.freqData?.length ?? 128;
    refs.freqBinCountRef.current = freqBinCount;

    const freqData =
        audioData?.frequencyData ?? audioData?.freqData ?? new Uint8Array(freqBinCount).fill(0);

    if (!audioTextureRef.current) {
        const audioTex = new THREE.DataTexture(
            freqData,
            freqBinCount,
            1,
            THREE.RedFormat,
            THREE.UnsignedByteType
        );
        audioTex.needsUpdate = true;
        audioTextureRef.current = audioTex;
    }

    const halfFloatRT = {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        stencilBuffer: false,
    };

    refs.feedbackReadRef.current = new THREE.WebGLRenderTarget(width, height, halfFloatRT);
    refs.feedbackWriteRef.current = new THREE.WebGLRenderTarget(width, height, halfFloatRT);
    refs.blendReadRef.current = new THREE.WebGLRenderTarget(width, height, halfFloatRT);
    refs.blendWriteRef.current = new THREE.WebGLRenderTarget(width, height, halfFloatRT);

    refs.galleryFacesRTRef.current = createGalleryFaceTargets(THREE, width, height, halfFloatRT);
    refs.galleryFloatingRTRef.current = createFloatingObjectTargets(THREE, width, height, halfFloatRT);
    refs.stressTileTargetsRef.current = createStressTileTargets(
        THREE,
        STRESS_TEST_MAX_2D,
        width,
        height,
        halfFloatRT,
        'plane2d'
    );

    const byteRT = {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        stencilBuffer: false,
    };
    refs.heightMapRTRef.current = new THREE.WebGLRenderTarget(width, height, byteRT);

    const blitPlane = new THREE.PlaneGeometry(2, 2);
    const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    refs.blitCameraRef.current = blitCam;

    const displayBlitMat = new THREE.ShaderMaterial({
        vertexShader: BLIT_VERTEX_SHADER,
        fragmentShader: COLOR_BLIT_FRAGMENT,
        uniforms: { u_src: { value: null } },
        depthTest: false,
        depthWrite: false,
    });
    const heightBlitMat = new THREE.ShaderMaterial({
        vertexShader: BLIT_VERTEX_SHADER,
        fragmentShader: HEIGHT_BLIT_FRAGMENT,
        uniforms: { u_src: { value: null } },
        depthTest: false,
        depthWrite: false,
    });
    const displayBlitScene = new THREE.Scene();
    const heightBlitScene = new THREE.Scene();
    const displayBlitMesh = new THREE.Mesh(blitPlane, displayBlitMat);
    const heightBlitMesh = new THREE.Mesh(blitPlane.clone(), heightBlitMat);
    displayBlitScene.add(displayBlitMesh);
    heightBlitScene.add(heightBlitMesh);
    refs.displayBlitSceneRef.current = displayBlitScene;
    refs.displayBlitMeshRef.current = displayBlitMesh;
    refs.heightBlitSceneRef.current = heightBlitScene;
    refs.heightBlitMeshRef.current = heightBlitMesh;

    refs.rainbowGradientRef.current = createRainbowGradientTexture();
    refs.fireGradientRef.current = createFireGradientTexture();
    refs.iceGradientRef.current = createIceGradientTexture();

    const params = paramsRef.current;
    const layers = [params.layer1, params.layer2, params.layer3, params.layer4];
    layerBlendStateRef.current.forEach((state, i) => {
        state.previousPatternType = patternNameToIndexRef.current
            ? patternNameToIndexRef.current[layers[i]?.patternType] ?? 0
            : 0;
    });

    const patternMap = patternNameToIndexRef.current;
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: MAIN_VERTEX_SHADER,
        fragmentShader: MAIN_FRAGMENT_SHADER,
        uniforms: {
            u_time: { value: 0 },
            u_integratedTime: { value: 0 },
            u_resolution: { value: new THREE.Vector2(width, height) },
            u_audio_texture: { value: audioTextureRef.current },
            u_frequency_bin_count: { value: refs.freqBinCountRef.current },
            u_gradient_texture: { value: refs.rainbowGradientRef.current },
            u_fire_gradient_texture: { value: refs.fireGradientRef.current },
            u_ice_gradient_texture: { value: refs.iceGradientRef.current },
            u_feedback_texture: { value: null },
            u_feedback_mix: { value: paramsRef.current.feedbackMix },
            u_bpm: { value: bpmRef.current },
            u_isBassPresent: { value: isBassPresentRef.current ? 1 : 0 },
            u_isDrumsPresent: { value: isDrumsPresentRef.current ? 1 : 0 },
            u_globalTimeScale: { value: paramsRef.current.globalTimeScale },
            u_globalDistortionScale: { value: paramsRef.current.globalDistortionScale },
            u_globalSymmetryOffsetSpeed: { value: paramsRef.current.globalSymmetryOffsetSpeed },
            u_uvScale: { value: paramsRef.current.uvScale },
            u_globalAudioSensitivity: { value: paramsRef.current.globalAudioSensitivity },
            u_rainbowAnimationSpeed: { value: paramsRef.current.rainbowAnimationSpeed },
            u_rainbowPhase: { value: 0 },
            u_visualMode: { value: VISUAL_MODE_INDEX[visualModeRef.current] ?? 0 },
            u_pixelationFactor: { value: pixelationFactorRef.current },
            u_globalColorMode: { value: COLOR_MODE_INDEX[colorModeRef.current] ?? 0 },
            u_forceGlobalColor: { value: forceGlobalColorRef.current ? 1 : 0 },
            u_asciiCharSize: { value: asciiCharSizeRef.current },
            u_accumulatedTimes: { value: accumulatedTimesRef.current },
            u_layers: { value: buildInitialLayerUniforms(paramsRef.current, patternMap) },
            u_visualModeFromIndex: { value: visualModeFromIndexRef.current },
            u_visualModeToIndex: { value: visualModeToIndexRef.current },
            u_visualModeBlend: { value: visualModeBlendRef.current },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
            u_mouseDir: { value: new THREE.Vector3(0, 0, 1) },
            u_mouseMapping3D: { value: 0 },
            u_mouseSphereActive: { value: 0 },
            u_galleryFaceIndex: { value: -1 },
            u_galleryFaceSeed: { value: 0 },
            u_galleryNeighborIntegratedTime: { value: new THREE.Vector4(0, 0, 0, 0) },
            u_galleryNeighborDistortion: { value: new THREE.Vector4(1, 1, 1, 1) },
            u_mouseGalleryFace: { value: -1 },
            u_mouseBrushActive: { value: 0 },
            u_mouseBrushRadius: { value: 0 },
            u_mouseRadius: { value: paramsRef.current.mouseRadius ?? 0.35 },
            u_mouseDistortion: { value: paramsRef.current.mouseDistortion ?? 0.8 },
            u_mouseSymmetry: { value: paramsRef.current.mouseSymmetry ?? 2 },
            u_mouseAttract: { value: paramsRef.current.mouseAttract ?? 0.3 },
            u_mouseTwist: { value: paramsRef.current.mouseTwist ?? 0.5 },
            u_isRandomizing: { value: isRandomizingRef.current },
            u_estimatedBpm: { value: bpmRef.current },
            u_isBassPresent: { value: isBassPresentRef.current },
            u_isDrumsPresent: { value: isDrumsPresentRef.current },
            u_drumOnsetDetected: { value: drumOnsetRef.current },
            u_beatStrength: { value: 0 },
            u_spectralCentroid: { value: 0 },
        },
    });
    refs.shaderMaterialRef.current = shaderMaterial;

    const planeGeo = new THREE.PlaneGeometry(2, 2);
    const shaderMesh = new THREE.Mesh(planeGeo, shaderMaterial);
    shaderScene.add(shaderMesh);
    refs.shaderMeshRef.current = shaderMesh;

    const displayScene = new THREE.Scene();
    const displayMaterial = new THREE.MeshBasicMaterial({
        map: null,
        depthTest: false,
        depthWrite: false,
    });
    const displayMesh = new THREE.Mesh(planeGeo, displayMaterial);
    displayScene.add(displayMesh);
    refs.displaySceneRef.current = displayScene;
    refs.displayMaterialRef.current = displayMaterial;
    refs.displayMeshRef.current = displayMesh;

    const blendScene = new THREE.Scene();
    const blendMaterial = new THREE.ShaderMaterial({
        vertexShader: BLEND_VERTEX_SHADER,
        fragmentShader: BLEND_FRAGMENT_SHADER,
        uniforms: {
            u_textureA: { value: null },
            u_textureB: { value: null },
            u_blendFactor: { value: 1 },
            u_currentRender: { value: null },
            u_lastRender: { value: null },
            u_rainbowPhase: { value: 0 },
            u_accumulatedTimes: { value: null },
        },
        depthTest: false,
        depthWrite: false,
    });
    const blendMesh = new THREE.Mesh(planeGeo, blendMaterial);
    blendScene.add(blendMesh);
    refs.blendSceneRef.current = blendScene;
    refs.blendMaterialRef.current = blendMaterial;
    refs.blendMeshRef.current = blendMesh;

    lastFrameTimeRef.current = performance.now();
    refs.mainCanvasSizeRef.current = { w: width, h: height };

    for (const rt of [
        refs.feedbackReadRef.current,
        refs.feedbackWriteRef.current,
        refs.blendReadRef.current,
        refs.blendWriteRef.current,
    ]) {
        renderer.setRenderTarget(rt);
        renderer.clear();
    }
    renderer.setRenderTarget(null);

    let animationTimeoutId = null;

    const cancelAnimationLoop = () => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (animationTimeoutId != null) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
    };

    const scheduleAnimationLoop = () => {
        cancelAnimationLoop();
        if (vsyncEnabledRef?.current !== false) {
            animationFrameIdRef.current = requestAnimationFrame(tick);
        } else {
            animationTimeoutId = setTimeout(() => tick(performance.now()), 0);
        }
    };

    const tick = (timestamp) => {
        onAnimate(timestamp);
        scheduleAnimationLoop();
    };

    scheduleAnimationLoop();

    const pointerRaycaster = refs.pointerRaycasterRef.current;
    const pointerNdc = refs.pointerNdcRef.current;
    const mouseUvRef = refs.mouseUvRef.current;
    const mouseDirRef = refs.mouseDirRef.current;
    const sphereCenterRef = refs.sphereCenterRef.current;
    // refs hold THREE.Vector2/Vector3/Raycaster instances from the hook

    const onPointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const td = threeDStateRef?.current;
        const is3d = threeDEnabledRef != null && threeDEnabledRef.current;
        if (is3d && td != null && td.isGallery) {
            /* gallery mouse comes from center-raycast in animate loop while brush is held */
        } else if (is3d && td != null && td.mesh && td.camera) {
            pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointerNdc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
            td.mesh.updateMatrixWorld(true);
            td.camera.updateMatrixWorld(true);
            pointerRaycaster.setFromCamera(pointerNdc, td.camera);
            const hits = pointerRaycaster.intersectObject(td.mesh, false);
            if (hits.length > 0) {
                td.mesh.getWorldPosition(sphereCenterRef);
                const dir = hits[0].point.clone().sub(sphereCenterRef).normalize();
                const u = Math.atan2(dir.z, dir.x) / (Math.PI * 2) + 0.5;
                const v = Math.asin(Math.max(-1, Math.min(1, dir.y))) / Math.PI + 0.5;
                mouseUvRef.set(u, v);
                mouseDirRef.copy(dir);
                td.mouseOnSphere = true;
            } else {
                td.mouseOnSphere = false;
            }
        } else if (!is3d) {
            mouseUvRef.set(
                (event.clientX - rect.left) / rect.width,
                1 - (event.clientY - rect.top) / rect.height
            );
        }
    };
    container.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;
        if (refs.rendererRef.current) {
            refs.rendererRef.current.setSize(w, h);
            if (refs.shaderMaterialRef.current) {
                refs.shaderMaterialRef.current.uniforms.u_resolution.value.set(w, h);
            }
        }
        refs.feedbackReadRef.current?.setSize(w, h);
        refs.feedbackWriteRef.current?.setSize(w, h);
        refs.blendReadRef.current?.setSize(w, h);
        refs.blendWriteRef.current?.setSize(w, h);
        refs.heightMapRTRef.current?.setSize(w, h);
        resizeGalleryFaceTargets(refs.galleryFacesRTRef.current, w, h);
        resizeFloatingObjectTargets(refs.galleryFloatingRTRef.current, w, h);
        const targets = refs.stressTileTargetsRef.current;
        if (targets?.length) {
            resizeStressTileTargets(targets, w, h, targets.length, 'plane2d');
        }
        refs.mainCanvasSizeRef.current = { w, h };
        const td = threeDStateRef?.current;
        if (td != null && td.updateSize) td.updateSize();
        const stressState = refs.stressStateRef?.current;
        if (stressState?.enabled) {
            if (isParticleStressMode(stressState.mode)) {
                updateStressParticleSceneSize(stressState, w, h);
            } else {
                updateStressTestSceneSize(stressState, w, h);
            }
        }
    };
    window.addEventListener('resize', onResize);

    return () => {
        container.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('resize', onResize);
        cancelAnimationLoop();

        refs.shaderMaterialRef.current?.dispose();
        refs.shaderMeshRef.current?.geometry?.dispose();
        refs.rainbowGradientRef.current?.dispose();
        refs.fireGradientRef.current?.dispose();
        refs.iceGradientRef.current?.dispose();
        refs.feedbackReadRef.current?.dispose();
        refs.feedbackWriteRef.current?.dispose();
        refs.blendReadRef.current?.dispose();
        refs.blendWriteRef.current?.dispose();
        disposeGalleryFaceTargets(refs.galleryFacesRTRef.current);
        refs.galleryFacesRTRef.current = null;
        disposeFloatingObjectTargets(refs.galleryFloatingRTRef.current);
        refs.galleryFloatingRTRef.current = null;
        disposeStressTileTargets(refs.stressTileTargetsRef.current);
        refs.stressTileTargetsRef.current = null;
        refs.heightMapRTRef.current?.dispose();
        if (refs.displayBlitMeshRef.current) {
            refs.displayBlitMeshRef.current.geometry.dispose();
            refs.displayBlitMeshRef.current.material.dispose();
        }
        if (refs.heightBlitMeshRef.current) {
            refs.heightBlitMeshRef.current.geometry.dispose();
            refs.heightBlitMeshRef.current.material.dispose();
        }
        refs.displayMaterialRef.current?.map?.dispose();
        refs.displayMaterialRef.current?.dispose();
        refs.displayMeshRef.current?.geometry?.dispose();
        refs.blendMaterialRef.current?.uniforms.u_textureA.value?.dispose();
        refs.blendMaterialRef.current?.uniforms.u_textureB.value?.dispose();
        refs.blendMaterialRef.current?.dispose();
        refs.blendMeshRef.current?.geometry?.dispose();
        const canvasElement = refs.rendererRef.current?.domElement;
        refs.rendererRef.current?.dispose();
        if (container && canvasElement?.parentNode === container) {
            try {
                container.removeChild(canvasElement);
            } catch (ex) {
                console.warn('Error removing canvas during cleanup:', ex);
            }
        }
        refs.rendererRef.current = null;
        refs.shaderSceneRef.current = null;
        refs.canvasDomRef.current = null;
    };
}

export { VISUAL_MODE_INDEX, COLOR_MODE_INDEX };
