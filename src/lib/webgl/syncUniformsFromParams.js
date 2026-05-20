/**
 * Sync shader uniforms from app params, audio, and mouse/brush state.
 */
import { COLOR_MODE_INDEX } from './constants.js';

/**
 * Advance per-layer accumulated animation times on the main canvas path.
 */
export function advanceMainLayerTimes({
    params,
    deltaSec,
    timeScale,
    accumulatedTimesRef,
    accumulatedSymmetryRef,
}) {
    const layers = [
        params.layer1,
        params.layer2,
        params.layer3,
        params.layer4,
    ];
    for (let i = 0; i < 4; ++i) {
        const layer = layers[i];
        if (!layer) continue;
        const times = accumulatedTimesRef.current[i];
        const symmetrySpeed = layer.layerSymmetryOffsetSpeed ?? 0;
        times.turing += deltaSec * (layer.turingSpeed ?? 0) * timeScale;
        times.spiralNoise += deltaSec * (layer.spiralNoiseSpeed ?? 0) * timeScale;
        times.flow += deltaSec * (layer.flowSpeed ?? 0) * timeScale;
        const cubeRate = 0.2 + (layer.cubeRotationSpeed ?? 0);
        times.cube += deltaSec * cubeRate * timeScale;
        times.smoothSpiral += deltaSec * (layer.smoothSpiralSpeed ?? 0) * timeScale;
        accumulatedSymmetryRef.current[i] += deltaSec * symmetrySpeed * timeScale;
    }
}

/**
 * @returns {{ beatStrength: number, spectralCentroid: number }}
 */
export function syncUniformsFromParams({
    uniforms,
    nowMs,
    params,
    galleryReady,
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
    audioData,
    beatStrengthRef,
    spectralCentroidRef,
    mouseUvRef,
    mouseDirRef,
    brushUvOverrideRef,
    threeDStateRef,
    threeDEnabledRef,
    pointerRaycasterRef,
    pointerNdcRef,
}) {
    const rainbowSpeed = params.rainbowAnimationSpeed ?? 0;
    // rainbow phase is updated by caller before this runs

    uniforms.u_time.value = nowMs / 1e3;
    uniforms.u_integratedTime.value = integratedTimeRef.current;
    uniforms.u_rainbowPhase.value = rainbowPhaseRef.current;

    if (!galleryReady) {
        if (uniforms.hasOwnProperty('u_visualModeFromIndex')) {
            uniforms.u_visualModeFromIndex.value = visualModeFromIndexRef.current;
        }
        if (uniforms.hasOwnProperty('u_visualModeToIndex')) {
            uniforms.u_visualModeToIndex.value = visualModeToIndexRef.current;
        }
        if (uniforms.hasOwnProperty('u_visualModeBlend')) {
            uniforms.u_visualModeBlend.value = visualModeBlendRef.current;
        }
    }

    if (uniforms.u_globalTimeScale.value !== params.globalTimeScale) {
        uniforms.u_globalTimeScale.value = params.globalTimeScale;
    }
    if (uniforms.u_globalDistortionScale.value !== params.globalDistortionScale) {
        uniforms.u_globalDistortionScale.value = params.globalDistortionScale;
    }
    if (uniforms.u_globalSymmetryOffsetSpeed.value !== params.globalSymmetryOffsetSpeed) {
        uniforms.u_globalSymmetryOffsetSpeed.value = params.globalSymmetryOffsetSpeed;
    }
    if (!galleryReady && uniforms.u_uvScale.value !== params.uvScale) {
        uniforms.u_uvScale.value = params.uvScale;
    }
    if (uniforms.u_globalAudioSensitivity.value !== params.globalAudioSensitivity) {
        uniforms.u_globalAudioSensitivity.value = params.globalAudioSensitivity;
    }
    if (uniforms.u_feedback_mix.value !== params.feedbackMix) {
        uniforms.u_feedback_mix.value = params.feedbackMix;
    }
    if (uniforms.u_rainbowAnimationSpeed.value !== params.rainbowAnimationSpeed) {
        uniforms.u_rainbowAnimationSpeed.value = params.rainbowAnimationSpeed;
    }

    const asciiSize = asciiCharSizeRef.current;
    if (uniforms.u_asciiCharSize.value !== asciiSize) {
        uniforms.u_asciiCharSize.value = asciiSize;
    }

    const pixelation = pixelationFactorRef.current;
    if (uniforms.u_pixelationFactor.value !== pixelation) {
        uniforms.u_pixelationFactor.value = pixelation;
    }

    const mouseRadius = params.mouseRadius ?? 0.35;
    const mouseDistortion = params.mouseDistortion ?? 0.8;
    const mouseSymmetry = params.mouseSymmetry ?? 2;
    const mouseAttract = params.mouseAttract ?? 0.3;
    const mouseTwist = params.mouseTwist ?? 0.5;
    if (uniforms.u_mouseRadius && uniforms.u_mouseRadius.value !== mouseRadius) {
        uniforms.u_mouseRadius.value = mouseRadius;
    }
    if (uniforms.u_mouseDistortion && uniforms.u_mouseDistortion.value !== mouseDistortion) {
        uniforms.u_mouseDistortion.value = mouseDistortion;
    }
    if (uniforms.u_mouseSymmetry && uniforms.u_mouseSymmetry.value !== mouseSymmetry) {
        uniforms.u_mouseSymmetry.value = mouseSymmetry;
    }
    if (uniforms.u_mouseAttract && uniforms.u_mouseAttract.value !== mouseAttract) {
        uniforms.u_mouseAttract.value = mouseAttract;
    }
    if (uniforms.u_mouseTwist && uniforms.u_mouseTwist.value !== mouseTwist) {
        uniforms.u_mouseTwist.value = mouseTwist;
    }

    if (
        uniforms.u_galleryFaceIndex &&
        uniforms.u_galleryFaceIndex.value !== -1 &&
        !galleryReady
    ) {
        uniforms.u_galleryFaceIndex.value = -1;
    }

    const tdGallery = threeDStateRef?.current;
    const mouseUv = mouseUvRef.current;
    const mouseDir = mouseDirRef.current;
    const pointerNdc = pointerNdcRef.current;
    const pointerRaycaster = pointerRaycasterRef.current;
    if (galleryReady && tdGallery?.brushActive && tdGallery.wallMeshes && tdGallery.camera) {
        pointerNdc.set(0, 0);
        tdGallery.camera.updateMatrixWorld(true);
        for (const wallMesh of tdGallery.wallMeshes) wallMesh.updateMatrixWorld(true);
        pointerRaycaster.setFromCamera(pointerNdc, tdGallery.camera);
        const hits = pointerRaycaster.intersectObjects(tdGallery.wallMeshes, false);
        if (hits.length > 0) {
            const hit = hits[0];
            tdGallery.galleryFace = hit.object.userData.faceIndex ?? 0;
            if (hit.uv) {
                mouseUv.set(hit.uv.x, hit.uv.y);
            }
        }
        const growDur = 1.4;
        const brushR = Math.min(
            mouseRadius,
            Math.max(0, (nowMs - (tdGallery.brushStartTime || nowMs)) / 1e3 / growDur) *
                mouseRadius
        );
        if (uniforms.u_mouseGalleryFace) {
            uniforms.u_mouseGalleryFace.value = tdGallery.galleryFace ?? -1;
        }
        if (uniforms.u_mouseBrushActive) uniforms.u_mouseBrushActive.value = 1;
        if (uniforms.u_mouseBrushRadius) {
            uniforms.u_mouseBrushRadius.value = Math.max(0.02, brushR);
        }
    } else if (!galleryReady && tdGallery?.brushActive) {
        const growDur = 1.4;
        const brushR = Math.min(
            mouseRadius,
            Math.max(0, (nowMs - (tdGallery.brushStartTime || nowMs)) / 1e3 / growDur) *
                mouseRadius
        );
        if (uniforms.u_mouseGalleryFace) uniforms.u_mouseGalleryFace.value = -1;
        if (uniforms.u_mouseBrushActive) uniforms.u_mouseBrushActive.value = 1;
        if (uniforms.u_mouseBrushRadius) {
            uniforms.u_mouseBrushRadius.value = Math.max(0.02, brushR);
        }
    } else {
        if (uniforms.u_mouseGalleryFace) uniforms.u_mouseGalleryFace.value = -1;
        if (uniforms.u_mouseBrushActive) uniforms.u_mouseBrushActive.value = 0;
        if (uniforms.u_mouseBrushRadius) uniforms.u_mouseBrushRadius.value = 0;
    }

    const map3d =
        threeDEnabledRef != null &&
        threeDEnabledRef.current &&
        !(tdGallery != null && tdGallery.isGallery)
            ? 1
            : 0;
    const sphereActive =
        map3d &&
        threeDStateRef != null &&
        threeDStateRef.current != null &&
        threeDStateRef.current.mouseOnSphere
            ? 1
            : 0;
    if (uniforms.u_mouseMapping3D && uniforms.u_mouseMapping3D.value !== map3d) {
        uniforms.u_mouseMapping3D.value = map3d;
    }
    if (uniforms.u_mouseSphereActive && uniforms.u_mouseSphereActive.value !== sphereActive) {
        uniforms.u_mouseSphereActive.value = sphereActive;
    }

    const colorModeIndex = COLOR_MODE_INDEX[colorModeRef.current] ?? 0;
    const forceGlobal = forceGlobalColorRef.current;
    if (!galleryReady) {
        if (uniforms.u_globalColorMode.value !== colorModeIndex) {
            uniforms.u_globalColorMode.value = colorModeIndex;
        }
        if (uniforms.u_forceGlobalColor.value !== (forceGlobal ? 1 : 0)) {
            uniforms.u_forceGlobalColor.value = forceGlobal ? 1 : 0;
        }
    }

    const bpm = bpmRef.current;
    const bassPresent = isBassPresentRef.current ? 1 : 0;
    const drumsPresent = isDrumsPresentRef.current ? 1 : 0;
    if (uniforms.u_bpm.value !== bpm) uniforms.u_bpm.value = bpm;
    if (uniforms.u_isBassPresent.value !== bassPresent) {
        uniforms.u_isBassPresent.value = bassPresent;
    }
    if (uniforms.u_isDrumsPresent.value !== drumsPresent) {
        uniforms.u_isDrumsPresent.value = drumsPresent;
    }
    if (uniforms.u_accumulatedTimes) {
        uniforms.u_accumulatedTimes.value = accumulatedTimesRef.current;
    }

    const patternMap = patternNameToIndexRef.current;
    if (!patternMap) {
        console.error('patternNameToIndex map is not available in animate!');
    }
    const layerUniforms = uniforms.u_layers.value;
    if (layerUniforms && patternMap && !galleryReady) {
        for (let i = 0; i < 4; i++) {
            const layerKey = `layer${i + 1}`;
            const layerParams = params[layerKey];
            const layerUni = layerUniforms[i];
            if (!layerParams || !layerUni) continue;

            const patternType = patternMap[layerParams.patternType] ?? 0;
            if (layerUni.hasOwnProperty('patternType') && layerUni.patternType !== patternType) {
                layerUni.patternType = patternType;
            }
            const blendTargetType = patternMap[layerParams.blendTargetType] ?? 0;
            if (
                layerUni.hasOwnProperty('blendTargetType') &&
                layerUni.blendTargetType !== blendTargetType
            ) {
                layerUni.blendTargetType = blendTargetType;
            }
            const blendAmount = layerParams.blendAmount ?? 0;
            if (layerUni.hasOwnProperty('blendAmount') && layerUni.blendAmount !== blendAmount) {
                layerUni.blendAmount = blendAmount;
            }
            const symmetry = layerParams.symmetry ?? 1;
            if (layerUni.hasOwnProperty('symmetry') && layerUni.symmetry !== symmetry) {
                layerUni.symmetry = symmetry;
            }
            const distortion =
                layerParams.distortion ?? layerParams.distortionStrength ?? 0;
            if (
                layerUni.hasOwnProperty('distortionStrength') &&
                layerUni.distortionStrength !== distortion
            ) {
                layerUni.distortionStrength = distortion;
            }
            const colorMode = COLOR_MODE_INDEX[layerParams.colorMode] ?? 0;
            if (layerUni.hasOwnProperty('colorMode') && layerUni.colorMode !== colorMode) {
                layerUni.colorMode = colorMode;
            }
            const blendTargetColorMode =
                COLOR_MODE_INDEX[layerParams.blendTargetColorMode] ?? colorMode;
            if (
                layerUni.hasOwnProperty('blendTargetColorMode') &&
                layerUni.blendTargetColorMode !== blendTargetColorMode
            ) {
                layerUni.blendTargetColorMode = blendTargetColorMode;
            }
            const freq = layerParams.freq ?? layerParams.layer2Freq ?? 10;
            if (layerUni.hasOwnProperty('freq') && layerUni.freq !== freq) {
                layerUni.freq = freq;
            }
            const weaveThickness = layerParams.weaveThickness ?? 0.02;
            if (
                layerUni.hasOwnProperty('weaveThickness') &&
                layerUni.weaveThickness !== weaveThickness
            ) {
                layerUni.weaveThickness = weaveThickness;
            }
            const turingScale = layerParams.turingScale ?? 15;
            if (layerUni.hasOwnProperty('turingScale') && layerUni.turingScale !== turingScale) {
                layerUni.turingScale = turingScale;
            }
            const turingSpeed = layerParams.turingSpeed ?? 0.5;
            if (layerUni.hasOwnProperty('turingSpeed') && layerUni.turingSpeed !== turingSpeed) {
                layerUni.turingSpeed = turingSpeed;
            }
            const turingFeed = layerParams.turingFeed ?? 0.035;
            if (layerUni.hasOwnProperty('turingFeed') && layerUni.turingFeed !== turingFeed) {
                layerUni.turingFeed = turingFeed;
            }
            const turingKill = layerParams.turingKill ?? 0.065;
            if (layerUni.hasOwnProperty('turingKill') && layerUni.turingKill !== turingKill) {
                layerUni.turingKill = turingKill;
            }
            const turingDiffusionA = layerParams.turingDiffusionA ?? 1;
            if (
                layerUni.hasOwnProperty('turingDiffusionA') &&
                layerUni.turingDiffusionA !== turingDiffusionA
            ) {
                layerUni.turingDiffusionA = turingDiffusionA;
            }
            const turingDiffusionB = layerParams.turingDiffusionB ?? 0.5;
            if (
                layerUni.hasOwnProperty('turingDiffusionB') &&
                layerUni.turingDiffusionB !== turingDiffusionB
            ) {
                layerUni.turingDiffusionB = turingDiffusionB;
            }
            const voronoiScale = layerParams.voronoiScale ?? 5;
            if (
                layerUni.hasOwnProperty('voronoiScale') &&
                layerUni.voronoiScale !== voronoiScale
            ) {
                layerUni.voronoiScale = voronoiScale;
            }
            const voronoiEdgeWidth = layerParams.voronoiEdgeWidth ?? 0.02;
            if (
                layerUni.hasOwnProperty('voronoiEdgeWidth') &&
                layerUni.voronoiEdgeWidth !== voronoiEdgeWidth
            ) {
                layerUni.voronoiEdgeWidth = voronoiEdgeWidth;
            }
            const spiralArms = layerParams.spiralArms ?? 5;
            if (layerUni.hasOwnProperty('spiralArms') && layerUni.spiralArms !== spiralArms) {
                layerUni.spiralArms = spiralArms;
            }
            const spiralTightness = layerParams.spiralTightness ?? 0.5;
            if (
                layerUni.hasOwnProperty('spiralTightness') &&
                layerUni.spiralTightness !== spiralTightness
            ) {
                layerUni.spiralTightness = spiralTightness;
            }
            const spiralNoiseScale = layerParams.spiralNoiseScale ?? 1;
            if (
                layerUni.hasOwnProperty('spiralNoiseScale') &&
                layerUni.spiralNoiseScale !== spiralNoiseScale
            ) {
                layerUni.spiralNoiseScale = spiralNoiseScale;
            }
            const spiralNoiseSpeed = layerParams.spiralNoiseSpeed ?? 0.1;
            if (
                layerUni.hasOwnProperty('spiralNoiseSpeed') &&
                layerUni.spiralNoiseSpeed !== spiralNoiseSpeed
            ) {
                layerUni.spiralNoiseSpeed = spiralNoiseSpeed;
            }
            const audioSensitivity = layerParams.audioSensitivity ?? 1;
            if (
                layerUni.hasOwnProperty('audioSensitivity') &&
                layerUni.audioSensitivity !== audioSensitivity
            ) {
                layerUni.audioSensitivity = audioSensitivity;
            }
            const bassSensitivity = layerParams.bassSensitivity ?? 1;
            if (
                layerUni.hasOwnProperty('bassSensitivity') &&
                layerUni.bassSensitivity !== bassSensitivity
            ) {
                layerUni.bassSensitivity = bassSensitivity;
            }
            const midSensitivity = layerParams.midSensitivity ?? 1;
            if (
                layerUni.hasOwnProperty('midSensitivity') &&
                layerUni.midSensitivity !== midSensitivity
            ) {
                layerUni.midSensitivity = midSensitivity;
            }
            const highSensitivity = layerParams.highSensitivity ?? 1;
            if (
                layerUni.hasOwnProperty('highSensitivity') &&
                layerUni.highSensitivity !== highSensitivity
            ) {
                layerUni.highSensitivity = highSensitivity;
            }
            const flowComplexity = layerParams.flowComplexity ?? 0.6;
            if (
                layerUni.hasOwnProperty('flowComplexity') &&
                layerUni.flowComplexity !== flowComplexity
            ) {
                layerUni.flowComplexity = flowComplexity;
            }
            const cubeSize = layerParams.cubeSize ?? 0.5;
            if (layerUni.hasOwnProperty('cubeSize') && layerUni.cubeSize !== cubeSize) {
                layerUni.cubeSize = cubeSize;
            }
            const flowCurl = layerParams.flowCurl ?? 0.4;
            if (layerUni.hasOwnProperty('flowCurl') && layerUni.flowCurl !== flowCurl) {
                layerUni.flowCurl = flowCurl;
            }
            const flowSpeed = layerParams.flowSpeed ?? 0;
            if (layerUni.hasOwnProperty('flowSpeed') && layerUni.flowSpeed !== flowSpeed) {
                layerUni.flowSpeed = flowSpeed;
            }
            const rdComplexity = layerParams.rdComplexity ?? 0.5;
            if (
                layerUni.hasOwnProperty('rdComplexity') &&
                layerUni.rdComplexity !== rdComplexity
            ) {
                layerUni.rdComplexity = rdComplexity;
            }
            const rdSpotSize = layerParams.rdSpotSize ?? 0.5;
            if (layerUni.hasOwnProperty('rdSpotSize') && layerUni.rdSpotSize !== rdSpotSize) {
                layerUni.rdSpotSize = rdSpotSize;
            }
            const fractalIterations = layerParams.fractalIterations ?? 4;
            if (
                layerUni.hasOwnProperty('fractalIterations') &&
                layerUni.fractalIterations !== fractalIterations
            ) {
                layerUni.fractalIterations = fractalIterations;
            }
            const fractalAngle = layerParams.fractalAngle ?? 0.5;
            if (
                layerUni.hasOwnProperty('fractalAngle') &&
                layerUni.fractalAngle !== fractalAngle
            ) {
                layerUni.fractalAngle = fractalAngle;
            }
            const fractalSpeed = layerParams.fractalSpeed ?? 0.3;
            if (
                layerUni.hasOwnProperty('fractalSpeed') &&
                layerUni.fractalSpeed !== fractalSpeed
            ) {
                layerUni.fractalSpeed = fractalSpeed;
            }
            const fractalThickness = layerParams.fractalThickness ?? 0.02;
            if (
                layerUni.hasOwnProperty('fractalThickness') &&
                layerUni.fractalThickness !== fractalThickness
            ) {
                layerUni.fractalThickness = fractalThickness;
            }
            const lissajousFreqX = layerParams.lissajousFreqX ?? 3;
            if (
                layerUni.hasOwnProperty('lissajousFreqX') &&
                layerUni.lissajousFreqX !== lissajousFreqX
            ) {
                layerUni.lissajousFreqX = lissajousFreqX;
            }
            const lissajousFreqY = layerParams.lissajousFreqY ?? 4;
            if (
                layerUni.hasOwnProperty('lissajousFreqY') &&
                layerUni.lissajousFreqY !== lissajousFreqY
            ) {
                layerUni.lissajousFreqY = lissajousFreqY;
            }
            const lissajousSpeed = layerParams.lissajousSpeed ?? 0.2;
            if (
                layerUni.hasOwnProperty('lissajousSpeed') &&
                layerUni.lissajousSpeed !== lissajousSpeed
            ) {
                layerUni.lissajousSpeed = lissajousSpeed;
            }
            const lissajousThickness = layerParams.lissajousThickness ?? 0.03;
            if (
                layerUni.hasOwnProperty('lissajousThickness') &&
                layerUni.lissajousThickness !== lissajousThickness
            ) {
                layerUni.lissajousThickness = lissajousThickness;
            }
            const layerSymmetryOffsetSpeed = layerParams.layerSymmetryOffsetSpeed ?? 0;
            if (
                layerUni.hasOwnProperty('layerSymmetryOffsetSpeed') &&
                layerUni.layerSymmetryOffsetSpeed !== layerSymmetryOffsetSpeed
            ) {
                layerUni.layerSymmetryOffsetSpeed = layerSymmetryOffsetSpeed;
            }
            if (layerUni.hasOwnProperty('accumulatedSymmetryAngle')) {
                layerUni.accumulatedSymmetryAngle = accumulatedSymmetryRef.current[i];
            }
        }
    } else if (!layerUniforms || !patternMap) {
        console.error('u_layers uniform not found or pattern map missing!');
    }

    const freqData = audioData?.frequencyData ?? audioData?.freqData;
    if (freqData && freqData.length > 0) {
        let weightedSum = 0;
        let total = 0;
        for (let i = 0; i < freqData.length; i++) {
            const v = freqData[i] / 255;
            weightedSum += i * v;
            total += v;
        }
        spectralCentroidRef.current = total > 0 ? weightedSum / total / freqData.length : 0;
        const bassBins = Math.min(8, freqData.length);
        let bassSum = 0;
        for (let i = 0; i < bassBins; i++) bassSum += freqData[i];
        beatStrengthRef.current = Math.min(1, bassSum / (bassBins * 255));
    } else {
        beatStrengthRef.current = audioData?.beatStrength ?? 0;
        spectralCentroidRef.current = audioData?.spectralCentroid ?? 0;
    }
    if (
        beatStrengthRef.current === 0 &&
        (isBassPresentRef.current || isDrumsPresentRef.current)
    ) {
        beatStrengthRef.current = isBassPresentRef.current ? 0.7 : 0.5;
    }
    if (uniforms.hasOwnProperty('u_beatStrength')) {
        uniforms.u_beatStrength.value = beatStrengthRef.current;
    }
    if (uniforms.hasOwnProperty('u_spectralCentroid')) {
        uniforms.u_spectralCentroid.value = spectralCentroidRef.current;
    }

    if (uniforms.u_mouse) {
        const tdAnim = threeDStateRef?.current;
        const tdGalleryAnim = tdAnim != null && tdAnim.isGallery ? tdAnim : null;
        const brush2d = !galleryReady && tdAnim != null && tdAnim.brushActive;
        const brushGallery = galleryReady && tdGalleryAnim != null && tdGalleryAnim.brushActive;
        const map3dAnim =
            threeDEnabledRef != null &&
            threeDEnabledRef.current &&
            !(tdGalleryAnim != null && tdGalleryAnim.isGallery)
                ? 1
                : 0;
        const sphereActiveAnim =
            map3dAnim && tdAnim != null && tdAnim.mouseOnSphere ? 1 : 0;
        if (brush2d || brushGallery || sphereActiveAnim) {
            const uvSource = brushUvOverrideRef?.current
                ? brushUvOverrideRef.current
                : mouseUv;
            const mx = uvSource.x ?? uvSource[0] ?? 0.5;
            const my = uvSource.y ?? uvSource[1] ?? 0.5;
            uniforms.u_mouse.value.set(mx, my);
        }
    }
    if (uniforms.u_mouseDir) {
        uniforms.u_mouseDir.value.copy(mouseDir);
    }

}

export function advanceRainbowPhase(rainbowPhaseRef, deltaSec, rainbowSpeed) {
    const increment = deltaSec * rainbowSpeed * 0.1;
    let phase = (rainbowPhaseRef.current + increment) % 1;
    rainbowPhaseRef.current = phase < 0 ? phase + 1 : phase;
}
