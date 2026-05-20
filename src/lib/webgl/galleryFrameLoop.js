/**
 * Gallery wall/floating RT batch, height blit, texture bind, Three.js scene render.
 */
import {
    GALLERY_FACE_COUNT,
    GALLERY_FACE_SEEDS,
    GALLERY_FACES_PER_FRAME,
    applyGalleryWallStack,
    applyGalleryWallModes,
    copyAccumulatedTimesTo,
    commitGalleryWallTransition,
    consumeGalleryWarmupRequest,
    getGalleryFaceRenderSize,
    markGalleryWarmup,
    peekGalleryWallStacksForRender,
    isGalleryWallTransitionPendingCommit,
    isGalleryTransitionActive,
} from '../galleryStack.js';
import {
    FLOATING_OBJECT_COUNT,
    FLOATING_OBJECTS_PER_FRAME,
    commitFloatingObjectTransition,
    isFloatingObjectTransitionActive,
    isFloatingObjectTransitionPendingCommit,
    renderFloatingObjectTexture,
} from '../galleryFloatingObjects.js';
import { blitPatternHeightMap, bindDisplaceableMeshTextures } from '../galleryDisplacement.js';
import {
    getGalleryFaceIntegratedTimes,
    getGalleryEdgeNeighborTimes,
    getGalleryEdgeNeighborDistortion,
} from '../galleryEdgeNeighbors.js';
import { VISUAL_MODE_INDEX, COLOR_MODE_INDEX } from './constants.js';

/**
 * Handle gallery → non-gallery transition teardown.
 */
export function handleGalleryTeardown({
    containerRef,
    uniforms,
    renderer,
    feedbackReadRef,
    feedbackWriteRef,
    blendReadRef,
    blendWriteRef,
    feedbackPingIndexRef,
    blendPingFlipRef,
    params,
    threeDStateRef,
    galleryInitializedRef,
}) {
    const container = containerRef.current;
    if (container && container.clientWidth > 0 && container.clientHeight > 0 && uniforms.u_resolution) {
        uniforms.u_resolution.value.set(container.clientWidth, container.clientHeight);
    }
    uniforms.u_uvScale.value = params.uvScale ?? 0.8;
    if (uniforms.u_galleryFaceIndex) uniforms.u_galleryFaceIndex.value = -1;
    const td = threeDStateRef?.current;
    if (td) td.brushActive = false;
    galleryInitializedRef.current = false;
    for (const rt of [
        feedbackReadRef.current,
        feedbackWriteRef.current,
        blendReadRef.current,
        blendWriteRef.current,
    ]) {
        if (rt) {
            renderer.setRenderTarget(rt);
            renderer.clear();
        }
    }
    renderer.setRenderTarget(null);
    feedbackPingIndexRef.current = 0;
    blendPingFlipRef.current = false;
}

/**
 * @returns {{ galleryFaceOutputs: Record<number| string, import('three').Texture>, galleryFloatingOutputs: import('three').Texture[] }}
 */
export function runGalleryFrameLoop({
    nowMs,
    deltaSec,
    timeScale,
    containerRef,
    renderer,
    uniforms,
    params,
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
}) {
    const galleryFaceOutputs = {};
    const galleryFloatingOutputs = [];
    const tdGallery = threeDStateRef.current;
    const patternMap = patternNameToIndexRef.current;

    if (consumeGalleryWarmupRequest()) {
        galleryWarmupRef.current = true;
    }

    if (!galleryInitializedRef.current && galleryFacesRTRef.current && renderer) {
        galleryInitializedRef.current = true;
        galleryWarmupRef.current = true;
        for (const face of galleryFacesRTRef.current) {
            renderer.setRenderTarget(face.fbA);
            renderer.clear();
            renderer.setRenderTarget(face.fbB);
            renderer.clear();
            renderer.setRenderTarget(face.outA);
            renderer.clear();
            renderer.setRenderTarget(face.outB);
            renderer.clear();
            face.fbIdx = 0;
            face.blendFlip = true;
            face.latestTexture = null;
        }
        for (const objTarget of galleryFloatingRTRef.current) {
            renderer.setRenderTarget(objTarget.fbA);
            renderer.clear();
            renderer.setRenderTarget(objTarget.fbB);
            renderer.clear();
            objTarget.fbIdx = 0;
            objTarget.blendFlip = true;
            objTarget.latestTexture = null;
        }
        renderer.setRenderTarget(null);
    }

    const galleryContainer = containerRef.current;
    if (
        galleryContainer &&
        galleryContainer.clientWidth > 0 &&
        galleryContainer.clientHeight > 0
    ) {
        uniforms.u_resolution.value.set(
            galleryContainer.clientWidth,
            galleryContainer.clientHeight
        );
    }

    const savedIntegrated = uniforms.u_integratedTime.value;
    const savedUvScale = uniforms.u_uvScale.value;
    const savedMainTimes = accumulatedTimesRef.current.map((t) => ({ ...t }));
    const savedResolution = uniforms.u_resolution.value.clone();
    const savedVisualFrom = uniforms.u_visualModeFromIndex?.value;
    const savedVisualTo = uniforms.u_visualModeToIndex?.value;
    const savedVisualBlend = uniforms.u_visualModeBlend?.value;
    const savedGlobalColor = uniforms.u_globalColorMode?.value;
    const savedForceGlobal = uniforms.u_forceGlobalColor?.value;
    const savedPixelation = uniforms.u_pixelationFactor?.value;
    const savedAscii = uniforms.u_asciiCharSize?.value;
    const canvasResW = savedResolution.x;
    const canvasResH = savedResolution.y;
    const layerConfigs = [params.layer1, params.layer2, params.layer3, params.layer4];

    try {
        for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) {
            const faceState = galleryFaceStateRef.current[gf];
            for (let yt = 0; yt < 4; yt++) {
                const layerParams = layerConfigs[yt];
                if (!layerParams) continue;
                const times = faceState.times[yt];
                const symmetrySpeed = layerParams.layerSymmetryOffsetSpeed ?? 0;
                times.turing += deltaSec * (layerParams.turingSpeed ?? 0) * timeScale;
                times.spiralNoise += deltaSec * (layerParams.spiralNoiseSpeed ?? 0) * timeScale;
                times.flow += deltaSec * (layerParams.flowSpeed ?? 0) * timeScale;
                times.cube += deltaSec * (0.2 + (layerParams.cubeRotationSpeed ?? 0)) * timeScale;
                times.smoothSpiral += deltaSec * (layerParams.smoothSpiralSpeed ?? 0) * timeScale;
                faceState.symmetry[yt] += deltaSec * symmetrySpeed * timeScale;
            }
            faceState.integrated += deltaSec * timeScale;
        }
        for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) {
            const objState = galleryFloatingStateRef.current[oi];
            for (let yt = 0; yt < 4; yt++) {
                const layerParams = layerConfigs[yt];
                if (!layerParams) continue;
                const times = objState.times[yt];
                const symmetrySpeed = layerParams.layerSymmetryOffsetSpeed ?? 0;
                times.turing += deltaSec * (layerParams.turingSpeed ?? 0) * timeScale;
                times.spiralNoise += deltaSec * (layerParams.spiralNoiseSpeed ?? 0) * timeScale;
                times.flow += deltaSec * (layerParams.flowSpeed ?? 0) * timeScale;
                times.cube += deltaSec * (0.2 + (layerParams.cubeRotationSpeed ?? 0)) * timeScale;
                times.smoothSpiral += deltaSec * (layerParams.smoothSpiralSpeed ?? 0) * timeScale;
                objState.symmetry[yt] += deltaSec * symmetrySpeed * timeScale;
            }
            objState.integrated += deltaSec * timeScale;
        }

        const brushFace =
            tdGallery.brushActive && tdGallery.galleryFace >= 0 ? tdGallery.galleryFace : -1;
        const facesThisFrame = [];
        const galleryBlendSpeed = params.blendSpeedFactor ?? 1;
        const galleryWallsAnimating = isGalleryTransitionActive(nowMs, galleryBlendSpeed);
        const galleryFloatsAnimating = isFloatingObjectTransitionActive(nowMs, galleryBlendSpeed);
        const galleryPendingCommit =
            isGalleryWallTransitionPendingCommit(nowMs, galleryBlendSpeed) ||
            isFloatingObjectTransitionPendingCommit(nowMs, galleryBlendSpeed);
        const renderAllGallerySurfaces =
            galleryWarmupRef.current ||
            galleryWallsAnimating ||
            galleryFloatsAnimating ||
            galleryPendingCommit;
        const galleryWallStacks = peekGalleryWallStacksForRender(nowMs, galleryBlendSpeed);
        const galleryIntegratedTimes = getGalleryFaceIntegratedTimes(
            galleryFaceStateRef.current,
            galleryWallStacks
        );
        const galleryDistortionFallback = params.globalDistortionScale ?? 1;

        if (renderAllGallerySurfaces) {
            for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) facesThisFrame.push(gf);
            if (galleryWarmupRef.current) galleryWarmupRef.current = false;
        } else {
            if (brushFace >= 0) facesThisFrame.push(brushFace);
            for (let fi = 0; facesThisFrame.length < GALLERY_FACES_PER_FRAME; fi++) {
                const gf = (galleryFaceCursorRef.current + fi) % GALLERY_FACE_COUNT;
                if (!facesThisFrame.includes(gf)) facesThisFrame.push(gf);
            }
        }

        for (let fi = 0; fi < facesThisFrame.length; fi++) {
            const gf = facesThisFrame[fi];
            const faceState = galleryFaceStateRef.current[gf];
            const wall = applyGalleryWallStack(
                uniforms.u_layers.value,
                gf,
                patternMap,
                COLOR_MODE_INDEX,
                params,
                nowMs,
                galleryBlendSpeed
            );
            applyGalleryWallModes(
                uniforms,
                gf,
                COLOR_MODE_INDEX,
                VISUAL_MODE_INDEX,
                nowMs,
                galleryBlendSpeed
            );
            const faceSize = getGalleryFaceRenderSize(gf, canvasResW, canvasResH);
            for (let yt = 0; yt < 4; yt++) {
                const layerUni = uniforms.u_layers.value[yt];
                if (layerUni) layerUni.accumulatedSymmetryAngle = faceState.symmetry[yt];
            }
            copyAccumulatedTimesTo(accumulatedTimesRef.current, faceState.times);
            if (uniforms.u_galleryFaceIndex) uniforms.u_galleryFaceIndex.value = gf;
            if (uniforms.u_galleryFaceSeed) {
                uniforms.u_galleryFaceSeed.value = GALLERY_FACE_SEEDS[gf];
            }
            if (uniforms.u_galleryNeighborIntegratedTime) {
                const neighborTimes = getGalleryEdgeNeighborTimes(gf, galleryIntegratedTimes);
                uniforms.u_galleryNeighborIntegratedTime.value.set(
                    neighborTimes[0],
                    neighborTimes[1],
                    neighborTimes[2],
                    neighborTimes[3]
                );
            }
            if (uniforms.u_galleryNeighborDistortion) {
                const neighborDistortion = getGalleryEdgeNeighborDistortion(
                    gf,
                    galleryWallStacks,
                    galleryDistortionFallback
                );
                uniforms.u_galleryNeighborDistortion.value.set(
                    neighborDistortion[0],
                    neighborDistortion[1],
                    neighborDistortion[2],
                    neighborDistortion[3]
                );
            }
            uniforms.u_integratedTime.value = faceState.integrated + (wall?.timeOffset ?? 0);
            uniforms.u_accumulatedTimes.value = accumulatedTimesRef.current;
            uniforms.u_resolution.value.set(faceSize.w, faceSize.h);
            uniforms.u_uvScale.value = wall?.uvScale ?? params.uvScale ?? 0.8;

            const face = galleryFacesRTRef.current[gf];
            const fbRead = face.fbIdx === 0 ? face.fbA : face.fbB;
            const fbWrite = face.fbIdx === 0 ? face.fbB : face.fbA;
            uniforms.u_feedback_texture.value = fbRead.texture;
            renderer.setRenderTarget(fbWrite);
            renderer.clear();
            renderer.render(shaderScene, shaderCamera);
            face.fbIdx = 1 - face.fbIdx;

            const blendRead = face.blendFlip ? face.outA : face.outB;
            const blendWrite = face.blendFlip ? face.outB : face.outA;
            if (blendMaterial?.uniforms) {
                const blendUniforms = blendMaterial.uniforms;
                blendUniforms.u_textureA.value = blendRead.texture;
                blendUniforms.u_textureB.value = fbWrite.texture;
                if (blendUniforms.u_blendFactor && blendUniforms.u_blendFactor.value !== 1) {
                    blendUniforms.u_blendFactor.value = 1;
                }
            }
            renderer.setRenderTarget(blendWrite);
            renderer.clear();
            renderer.render(blendScene, shaderCamera);
            face.blendFlip = !face.blendFlip;
            face.latestTexture = blendWrite.texture;
            galleryFaceOutputs[gf] = blendWrite.texture;

            if (
                params.patternDisplacementEnabled &&
                heightBlitMeshRef.current &&
                heightBlitSceneRef.current &&
                face.heightMap
            ) {
                blitPatternHeightMap(
                    renderer,
                    heightBlitSceneRef.current,
                    blitCameraRef.current,
                    heightBlitMeshRef.current,
                    blendWrite.texture,
                    face.heightMap
                );
            }
        }
        galleryFaceCursorRef.current =
            (galleryFaceCursorRef.current + facesThisFrame.length) % GALLERY_FACE_COUNT;

        const floatingThisFrame = [];
        if (renderAllGallerySurfaces) {
            for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) floatingThisFrame.push(oi);
        } else {
            for (let fi = 0; fi < FLOATING_OBJECTS_PER_FRAME; fi++) {
                const oi = (galleryFloatingCursorRef.current + fi) % FLOATING_OBJECT_COUNT;
                if (!floatingThisFrame.includes(oi)) floatingThisFrame.push(oi);
            }
        }
        for (let fi = 0; fi < floatingThisFrame.length; fi++) {
            const oi = floatingThisFrame[fi];
            galleryFloatingOutputs[oi] = renderFloatingObjectTexture({
                renderer,
                shaderScene,
                shaderCamera,
                blendScene,
                blendMaterial,
                uniforms,
                objectIndex: oi,
                objectState: galleryFloatingStateRef.current[oi],
                target: galleryFloatingRTRef.current[oi],
                patternNameToIndex: patternMap,
                colorModeIndex: COLOR_MODE_INDEX,
                visualModeIndex: VISUAL_MODE_INDEX,
                globalParams: params,
                je: accumulatedTimesRef.current,
                Je: accumulatedSymmetryRef.current,
                renderTimeMs: nowMs,
                blendSpeedFactor: galleryBlendSpeed,
            });
            if (
                params.patternDisplacementEnabled &&
                heightBlitMeshRef.current &&
                heightBlitSceneRef.current
            ) {
                const objTarget = galleryFloatingRTRef.current[oi];
                blitPatternHeightMap(
                    renderer,
                    heightBlitSceneRef.current,
                    blitCameraRef.current,
                    heightBlitMeshRef.current,
                    galleryFloatingOutputs[oi],
                    objTarget?.heightMap
                );
            }
        }
        galleryFloatingCursorRef.current =
            (galleryFloatingCursorRef.current + floatingThisFrame.length) %
            FLOATING_OBJECT_COUNT;

        const wallsCommitted = commitGalleryWallTransition(nowMs, galleryBlendSpeed);
        const floatsCommitted = commitFloatingObjectTransition(nowMs, galleryBlendSpeed);
        if (wallsCommitted || floatsCommitted) {
            markGalleryWarmup();
        }
    } finally {
        if (uniforms.u_galleryFaceIndex) uniforms.u_galleryFaceIndex.value = -1;
        uniforms.u_integratedTime.value = savedIntegrated;
        uniforms.u_uvScale.value = savedUvScale;
        uniforms.u_resolution.value.copy(savedResolution);
        if (uniforms.u_visualModeFromIndex && savedVisualFrom != null) {
            uniforms.u_visualModeFromIndex.value = savedVisualFrom;
        }
        if (uniforms.u_visualModeToIndex && savedVisualTo != null) {
            uniforms.u_visualModeToIndex.value = savedVisualTo;
        }
        if (uniforms.u_visualModeBlend != null && savedVisualBlend != null) {
            uniforms.u_visualModeBlend.value = savedVisualBlend;
        }
        if (uniforms.u_globalColorMode && savedGlobalColor != null) {
            uniforms.u_globalColorMode.value = savedGlobalColor;
        }
        if (uniforms.u_forceGlobalColor != null && savedForceGlobal != null) {
            uniforms.u_forceGlobalColor.value = savedForceGlobal;
        }
        if (uniforms.u_pixelationFactor && savedPixelation != null) {
            uniforms.u_pixelationFactor.value = savedPixelation;
        }
        if (uniforms.u_asciiCharSize && savedAscii != null) {
            uniforms.u_asciiCharSize.value = savedAscii;
        }
        copyAccumulatedTimesTo(accumulatedTimesRef.current, savedMainTimes);
        uniforms.u_accumulatedTimes.value = accumulatedTimesRef.current;
        for (let yt = 0; yt < 4; yt++) {
            const layerUni = uniforms.u_layers.value[yt];
            if (layerUni) layerUni.accumulatedSymmetryAngle = accumulatedSymmetryRef.current[yt];
        }
    }

    return { galleryFaceOutputs, galleryFloatingOutputs };
}

export function bindGalleryMeshTextures({
    params,
    threeDState,
    galleryFacesRTRef,
    galleryFaceOutputs,
    galleryFloatingOutputs,
    galleryFloatingRTRef,
}) {
    const useHeightmap = !!params.patternDisplacementEnabled;
    if (threeDState.setDisplacementEnabled) {
        threeDState.setDisplacementEnabled(useHeightmap);
    }
    if (threeDState.setBaseDisplacement) {
        threeDState.setBaseDisplacement(params.patternDisplacement ?? 0.12);
    }
    if (threeDState.wallMeshes && threeDState.faceMaterials) {
        for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) {
            const faceTarget = galleryFacesRTRef.current?.[gf];
            const faceTex =
                faceTarget?.latestTexture ?? galleryFaceOutputs[gf] ?? null;
            if (!faceTex || !threeDState.wallMeshes[gf]) continue;
            bindDisplaceableMeshTextures(
                {
                    mesh: threeDState.wallMeshes[gf],
                    flatMaterial: threeDState.faceMaterials[gf],
                    displacedMaterial: threeDState.faceDisplacedMaterials?.[gf],
                },
                {
                    displayTexture: faceTex,
                    heightMapTexture: faceTarget?.heightMap?.texture ?? null,
                    useHeightmap,
                }
            );
        }
    }
    if (threeDState.floatingObjects) {
        for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) {
            const objEntry = threeDState.floatingObjects[oi];
            if (!objEntry) continue;
            const objTarget = galleryFloatingRTRef.current[oi];
            const objTex =
                galleryFloatingOutputs[oi] ??
                objTarget?.latestTexture ??
                objEntry.flatMaterial?.uniforms?.u_display?.value ??
                objEntry.flatMaterial?.map ??
                null;
            if (!objTex) continue;
            bindDisplaceableMeshTextures(objEntry, {
                displayTexture: objTex,
                heightMapTexture: objTarget?.heightMap?.texture ?? null,
                useHeightmap,
            });
        }
    }
}

export function renderGalleryThreeScene({ renderer, threeDState, deltaSec }) {
    threeDState.update?.(deltaSec);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x030303, 1);
    renderer.clear();
    renderer.render(threeDState.scene, threeDState.camera);
}
