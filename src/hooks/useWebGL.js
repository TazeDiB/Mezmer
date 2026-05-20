/**
 * WebGL / Three.js hook: scene, renderer, shaders, feedback, audio texture.
 */
import * as THREE from 'three';
import React from 'react';
import {
    GALLERY_FACE_COUNT,
    GALLERY_FACE_SEEDS,
    GALLERY_FACES_PER_FRAME,
    createGalleryFaceTargets,
    createGalleryFaceState,
    applyGalleryWallStack,
    applyGalleryWallModes,
    copyAccumulatedTimesTo,
    consumeGalleryWarmupRequest,
    getGalleryFaceRenderSize,
    getGalleryRenderSize,
    getGalleryWallStacksForRender,
    resizeGalleryFaceTargets,
    disposeGalleryFaceTargets,
} from '../lib/galleryStack.js';
import {
    FLOATING_OBJECT_COUNT,
    FLOATING_OBJECTS_PER_FRAME,
    createFloatingObjectState,
    createFloatingObjectTargets,
    renderFloatingObjectTexture,
    resizeFloatingObjectTargets,
    disposeFloatingObjectTargets,
    isGalleryContentTransitionActive,
} from '../lib/galleryFloatingObjects.js';
import {
    blitPatternHeightMap,
    bindDisplaceableMeshTextures,
    createGallerySeamBlitPass,
} from '../lib/galleryDisplacement.js';
import {
    getGalleryFaceIntegratedTimes,
    getGalleryEdgeNeighborTimes,
    getGalleryEdgeNeighborDistortion,
    GALLERY_EDGE_BLEND,
} from '../lib/gallerySeams.js';

import mainVert from '../shaders/main.vert?raw';
import mainFrag from '../shaders/main.frag?raw';
import blendFrag from '../shaders/blend.frag?raw';

const yL = mainVert,
    SL = mainFrag,
    xL = mainVert,
    ML = blendFrag,
    heightBlitFrag = `
precision highp float;
uniform sampler2D u_src;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(u_src, vUv).rgb;
  float h = dot(c, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(h, h, h, 1.0);
}
`,
    colorBlitFrag = `
precision highp float;
uniform sampler2D u_src;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(u_src, vUv).rgb, 1.0);
}
`,
    blitVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const ld = {
        normal: 0,
        glow: 1,
        pixelate: 2,
        moire: 3,
        cartoon: 4,
        hashGrid: 5,
        ascii: 6,
        crt: 7,
        thermal: 8,
        glitch: 9,
        vhs: 10,
        hologram: 11
    },
    In = {
        rainbow: 0,
        fire: 1,
        ice: 2,
        monochrome: 3,
        audioRGB: 4,
        spectrum: 5,
        reactivePulse: 6,
        velocity: 7,
        cyberpunk: 8,
        vaporwave: 9,
        matrix: 10
    };

function EL() {
    const e = new Uint8Array(1024);
    for (let r = 0; r < 256; r++) {
        const o = r / 255 * 360,
            s = 1,
            a = s * (1 - Math.abs(TL(o / 60, 2) - 1)),
            l = .5 - s / 2;
        let c = 0,
            f = 0,
            d = 0;
        o >= 0 && o < 60 ? (c = s, f = a) : o >= 60 && o < 120 ? (c = a, f = s) : o >= 120 && o < 180 ? (f = s, d = a) : o >= 180 && o < 240 ? (f = a, d = s) : o >= 240 && o < 300 ? (c = a, d = s) : (c = s, d = a), e[r * 4 + 0] = Math.round((c + l) * 255), e[r * 4 + 1] = Math.round((f + l) * 255), e[r * 4 + 2] = Math.round((d + l) * 255), e[r * 4 + 3] = 255
    }
    const n = new THREE.DataTexture(e, 256, 1, THREE.RGBAFormat);
    return n.minFilter = THREE.LinearFilter, n.magFilter = THREE.LinearFilter, n.wrapS = THREE.ClampToEdgeWrapping, n.wrapT = THREE.ClampToEdgeWrapping, n.needsUpdate = !0, n
}

function TL(t, e) {
    return Number((t - Math.floor(t / e) * e).toPrecision(8))
}

function ms(t, e, n) {
    return t * (1 - n) + e * n
}
export function useWebGL(t, e, n, r, i, o, s, a, l, c, f, d, h, p, g, P, threeDStateRef, threeDEnabledRef) {
        var Be, we;
        const y = () => {
                const ge = new Uint8Array(1024),
                    X = [{
                        t: 0,
                        color: [0, 0, 0]
                    }, {
                        t: .2,
                        color: [100, 0, 0]
                    }, {
                        t: .5,
                        color: [255, 100, 0]
                    }, {
                        t: .8,
                        color: [255, 255, 50]
                    }, {
                        t: 1,
                        color: [255, 255, 255]
                    }];
                for (let Me = 0; Me < 256; Me++) {
                    const et = Me / 255;
                    let le = 0,
                        C = 0,
                        re = 0;
                    for (let te = 0; te < X.length - 1; te++)
                        if (et >= X[te].t && et <= X[te + 1].t) {
                            const Ae = (et - X[te].t) / (X[te + 1].t - X[te].t);
                            le = ms(X[te].color[0], X[te + 1].color[0], Ae), C = ms(X[te].color[1], X[te + 1].color[1], Ae), re = ms(X[te].color[2], X[te + 1].color[2], Ae);
                            break
                        } ge[Me * 4 + 0] = Math.round(le), ge[Me * 4 + 1] = Math.round(C), ge[Me * 4 + 2] = Math.round(re), ge[Me * 4 + 3] = 255
                }
                const ve = new THREE.DataTexture(ge, 256, 1, THREE.RGBAFormat);
                return ve.minFilter = THREE.LinearFilter, ve.magFilter = THREE.LinearFilter, ve.wrapS = THREE.ClampToEdgeWrapping, ve.wrapT = THREE.ClampToEdgeWrapping, ve.needsUpdate = !0, ve
            },
            m = () => {
                const ge = new Uint8Array(1024),
                    X = [{
                        t: 0,
                        color: [0, 0, 50]
                    }, {
                        t: .3,
                        color: [0, 50, 150]
                    }, {
                        t: .6,
                        color: [100, 150, 255]
                    }, {
                        t: .8,
                        color: [200, 220, 255]
                    }, {
                        t: 1,
                        color: [255, 255, 255]
                    }];
                for (let Me = 0; Me < 256; Me++) {
                    const et = Me / 255;
                    let le = 0,
                        C = 0,
                        re = 0;
                    for (let te = 0; te < X.length - 1; te++)
                        if (et >= X[te].t && et <= X[te + 1].t) {
                            const Ae = (et - X[te].t) / (X[te + 1].t - X[te].t);
                            le = ms(X[te].color[0], X[te + 1].color[0], Ae), C = ms(X[te].color[1], X[te + 1].color[1], Ae), re = ms(X[te].color[2], X[te + 1].color[2], Ae);
                            break
                        } ge[Me * 4 + 0] = Math.round(le), ge[Me * 4 + 1] = Math.round(C), ge[Me * 4 + 2] = Math.round(re), ge[Me * 4 + 3] = 255
                }
                const ve = new THREE.DataTexture(ge, 256, 1, THREE.RGBAFormat);
                return ve.minFilter = THREE.LinearFilter, ve.magFilter = THREE.LinearFilter, ve.wrapS = THREE.ClampToEdgeWrapping, ve.wrapT = THREE.ClampToEdgeWrapping, ve.needsUpdate = !0, ve
            },
            u = React.useRef(e),
            _ = React.useRef(n),
            v = React.useRef(r),
            M = React.useRef(i),
            R = React.useRef(o),
            A = React.useRef(s),
            w = React.useRef(e.asciiCharSize),
            L = React.useRef(a || {}),
            E = React.useRef(null),
            S = React.useRef(null),
            F = React.useRef(null),
            q = React.useRef(null),
            O = React.useRef(null),
            ee = React.useRef(null),
            Q = React.useRef(((Be = (c == null ? void 0 : c.frequencyData) ?? (c == null ? void 0 : c.freqData)) == null ? void 0 : Be.length) || 128),
            oe = React.useRef(null),
            ie = React.useRef(null),
            I = React.useRef(0),
            j = React.useRef(null),
            $ = React.useRef(null),
            fe = React.useRef(null),
            Le = React.useRef(l),
            Ue = React.useRef(d),
            G = React.useRef(h),
            se = React.useRef(p),
            ye = React.useRef(g),
            pe = React.useRef(Array(4).fill(null).map(() => ({
                isBlending: !1,
                previousPatternType: 0,
                targetPatternType: 0,
                originalBlendTargetType: 0,
                originalBlendAmount: 0,
                blendStartTime: 0
            }))),
            je = React.useRef(Array(4).fill(null).map(() => ({
                turing: 0,
                spiralNoise: 0,
                flow: 0,
                cube: 0,
                smoothSpiral: 0
            }))),
            Je = React.useRef([0, 0, 0, 0]),
            st = React.useRef(0),
            U = React.useRef(performance.now()),
            Ye = React.useRef(0),
            Ie = React.useRef(null),
            vt = React.useRef(null),
            He = React.useRef(!0),
            ht = React.useRef(null),
            b = React.useRef(null),
            x = React.useRef(null),
            D = React.useRef(null),
            B = React.useRef(null),
            Y = React.useRef(null),
            heightMapRT = React.useRef(null),
            displayMapRT = React.useRef(null),
            displayBlitScene = React.useRef(null),
            displayBlitMesh = React.useRef(null),
            heightBlitScene = React.useRef(null),
            heightBlitMesh = React.useRef(null),
            gallerySeamBlitScene = React.useRef(null),
            gallerySeamBlitMesh = React.useRef(null),
            blitCamera = React.useRef(null),
            canvasDomRef = React.useRef(null),
            galleryFacesRT = React.useRef(null),
            galleryFloatingRT = React.useRef(null),
            galleryFaceState = React.useRef(createGalleryFaceState()),
            galleryFloatingState = React.useRef(createFloatingObjectState()),
            galleryFaceCursor = React.useRef(0),
            galleryFloatingCursor = React.useRef(0),
            galleryInitialized = React.useRef(!1),
            galleryWarmup = React.useRef(!1),
            wasGalleryReadyRef = React.useRef(!1),
            mainCanvasSizeRef = React.useRef({ w: 0, h: 0 }),
            Z = React.useRef(e.visualModeFromIndex ?? 0),
            xe = React.useRef(e.visualModeToIndex ?? 0),
            ae = React.useRef(e.visualModeBlend ?? 1),
            De = React.useRef(null);
        React.useRef(0);
        const ke = React.useRef(0);
        React.useRef(0);
        const de = React.useRef(0);
        React.useRef(0), React.useRef(0);
        const Pn = React.useRef(new THREE.Vector2(.5, .5)),
            mouseDirRef = React.useRef(new THREE.Vector3(0, 0, 1)),
            sphereCenterRef = React.useRef(new THREE.Vector3),
            $i = React.useRef(new THREE.Raycaster),
            qi = React.useRef(new THREE.Vector2);
        const he = React.useCallback(W => {
            var jn;
            if (!E.current || !O.current || !S.current || !F.current || !oe.current || !ie.current || !Ie.current || !vt.current || !ht.current || !b.current || !D.current || !B.current || !Y.current) {
                console.error("WebGL context lost or not initialized in animate."), ee.current && cancelAnimationFrame(ee.current);
                return
            }
            const ge = performance.now(),
                X = O.current.uniforms;
            if (!X) {
                console.error("Uniforms not found in material."), ee.current && cancelAnimationFrame(ee.current);
                return
            }
            const ve = (ge - U.current) / 1e3,
                Me = Ue.current > 0 ? Ue.current : 120,
                et = THREE.MathUtils.clamp(Me / 120, .75, 4),
                le = (u.current.globalTimeScale ?? 1) * et;
            st.current += ve * le, U.current = ge;
            const C = ((jn = u.current) == null ? void 0 : jn.rainbowAnimationSpeed) ?? 0,
                re = ve * C * .1;
            let te = (Ye.current + re) % 1;
            Ye.current = te < 0 ? te + 1 : te;
            const Ae = [u.current.layer1, u.current.layer2, u.current.layer3, u.current.layer4];
            for (let yt = 0; yt < 4; ++yt) {
                const Nt = Ae[yt];
                if (!Nt) continue;
                const it = je.current[yt],
                    ce = Nt.layerSymmetryOffsetSpeed ?? 0;
                it.turing += ve * (Nt.turingSpeed ?? 0) * le, it.spiralNoise += ve * (Nt.spiralNoiseSpeed ?? 0) * le, it.flow += ve * (Nt.flowSpeed ?? 0) * le;
                const pr = .2 + (Nt.cubeRotationSpeed ?? 0);
                it.cube += ve * pr * le, it.smoothSpiral += ve * (Nt.smoothSpiralSpeed ?? 0) * le, Je.current[yt] += ve * ce * le
            }
            const tdGallery = threeDStateRef == null ? void 0 : threeDStateRef.current,
                wantsGallery = threeDEnabledRef != null && threeDEnabledRef.current && tdGallery != null && tdGallery.isGallery,
                galleryReady = wantsGallery && tdGallery.enabled && tdGallery.scene && tdGallery.wallMeshes && tdGallery.camera && galleryFacesRT.current && galleryFloatingRT.current;
            wantsGallery || (galleryFaceCursor.current = 0);
            if (wasGalleryReadyRef.current && !galleryReady) {
                const container = t.current;
                container && container.clientWidth > 0 && container.clientHeight > 0 && X.u_resolution && X.u_resolution.value.set(container.clientWidth, container.clientHeight);
                X.u_uvScale.value = u.current.uvScale ?? .8;
                X.u_galleryFaceIndex && (X.u_galleryFaceIndex.value = -1);
                tdGallery && (tdGallery.brushActive = !1);
                galleryInitialized.current = !1;
                for (const rt of [oe.current, ie.current, Ie.current, vt.current]) {
                    rt && (E.current.setRenderTarget(rt), E.current.clear());
                }
                E.current.setRenderTarget(null);
                I.current = 0;
                He.current = !1;
            }
            wasGalleryReadyRef.current = galleryReady;
            X.u_time.value = ge / 1e3, X.u_integratedTime.value = st.current, X.u_rainbowPhase.value = Ye.current;
            galleryReady || (X.hasOwnProperty("u_visualModeFromIndex") && (X.u_visualModeFromIndex.value = Z.current), X.hasOwnProperty("u_visualModeToIndex") && (X.u_visualModeToIndex.value = xe.current), X.hasOwnProperty("u_visualModeBlend") && (X.u_visualModeBlend.value = ae.current));
            X.u_globalTimeScale.value !== u.current.globalTimeScale && (X.u_globalTimeScale.value = u.current.globalTimeScale), X.u_globalDistortionScale.value !== u.current.globalDistortionScale && (X.u_globalDistortionScale.value = u.current.globalDistortionScale), X.u_globalSymmetryOffsetSpeed.value !== u.current.globalSymmetryOffsetSpeed && (X.u_globalSymmetryOffsetSpeed.value = u.current.globalSymmetryOffsetSpeed), galleryReady || X.u_uvScale.value !== u.current.uvScale && (X.u_uvScale.value = u.current.uvScale), X.u_globalAudioSensitivity.value !== u.current.globalAudioSensitivity && (X.u_globalAudioSensitivity.value = u.current.globalAudioSensitivity), X.u_feedback_mix.value !== u.current.feedbackMix && (X.u_feedback_mix.value = u.current.feedbackMix), X.u_rainbowAnimationSpeed.value !== u.current.rainbowAnimationSpeed && (X.u_rainbowAnimationSpeed.value = u.current.rainbowAnimationSpeed);
            const Se = w.current;
            X.u_asciiCharSize.value !== Se && (X.u_asciiCharSize.value = Se);
            const _t = M.current;
            X.u_pixelationFactor.value !== _t && (X.u_pixelationFactor.value = _t);
            const mouseRadius = u.current.mouseRadius ?? .35,
                mouseDistortion = u.current.mouseDistortion ?? .8,
                mouseSymmetry = u.current.mouseSymmetry ?? 2,
                mouseAttract = u.current.mouseAttract ?? .3,
                mouseTwist = u.current.mouseTwist ?? .5;
            X.u_mouseRadius && X.u_mouseRadius.value !== mouseRadius && (X.u_mouseRadius.value = mouseRadius), X.u_mouseDistortion && X.u_mouseDistortion.value !== mouseDistortion && (X.u_mouseDistortion.value = mouseDistortion), X.u_mouseSymmetry && X.u_mouseSymmetry.value !== mouseSymmetry && (X.u_mouseSymmetry.value = mouseSymmetry), X.u_mouseAttract && X.u_mouseAttract.value !== mouseAttract && (X.u_mouseAttract.value = mouseAttract),             X.u_mouseTwist && X.u_mouseTwist.value !== mouseTwist && (X.u_mouseTwist.value = mouseTwist);
            X.u_galleryFaceIndex && X.u_galleryFaceIndex.value !== -1 && !galleryReady && (X.u_galleryFaceIndex.value = -1);
            if (galleryReady && tdGallery.brushActive && tdGallery.wallMeshes && tdGallery.camera) {
                qi.current.set(0, 0);
                tdGallery.camera.updateMatrixWorld(true);
                for (const wallMesh of tdGallery.wallMeshes) wallMesh.updateMatrixWorld(true);
                $i.current.setFromCamera(qi.current, tdGallery.camera);
                const gHits = $i.current.intersectObjects(tdGallery.wallMeshes, false);
                if (gHits.length > 0) {
                    const gHit = gHits[0];
                    tdGallery.galleryFace = gHit.object.userData.faceIndex ?? 0;
                    if (gHit.uv) {
                        Pn.current.set(gHit.uv.x, gHit.uv.y);
                    }
                }
                const growDur = 1.4,
                    brushR = Math.min(mouseRadius, Math.max(0, (ge - (tdGallery.brushStartTime || ge)) / 1e3 / growDur) * mouseRadius);
                X.u_mouseGalleryFace && (X.u_mouseGalleryFace.value = tdGallery.galleryFace ?? -1), X.u_mouseBrushActive && (X.u_mouseBrushActive.value = 1), X.u_mouseBrushRadius && (X.u_mouseBrushRadius.value = Math.max(.02, brushR))
            } else if (!galleryReady && tdGallery && tdGallery.brushActive) {
                const growDur = 1.4,
                    brushR = Math.min(mouseRadius, Math.max(0, (ge - (tdGallery.brushStartTime || ge)) / 1e3 / growDur) * mouseRadius);
                X.u_mouseGalleryFace && (X.u_mouseGalleryFace.value = -1);
                X.u_mouseBrushActive && (X.u_mouseBrushActive.value = 1);
                X.u_mouseBrushRadius && (X.u_mouseBrushRadius.value = Math.max(.02, brushR));
            } else {
                X.u_mouseGalleryFace && (X.u_mouseGalleryFace.value = -1);
                X.u_mouseBrushActive && (X.u_mouseBrushActive.value = 0);
                X.u_mouseBrushRadius && (X.u_mouseBrushRadius.value = 0);
            }
            const map3d = threeDEnabledRef != null && threeDEnabledRef.current && !(tdGallery != null && tdGallery.isGallery) ? 1 : 0,
                sphereActive = map3d && threeDStateRef != null && threeDStateRef.current != null && threeDStateRef.current.mouseOnSphere ? 1 : 0;
            X.u_mouseMapping3D && X.u_mouseMapping3D.value !== map3d && (X.u_mouseMapping3D.value = map3d), X.u_mouseSphereActive && X.u_mouseSphereActive.value !== sphereActive && (X.u_mouseSphereActive.value = sphereActive);
            const Mt = In[R.current] ?? 0,
                wt = A.current;
            galleryReady || (X.u_globalColorMode.value !== Mt && (X.u_globalColorMode.value = Mt), X.u_forceGlobalColor.value !== (wt ? 1 : 0) && (X.u_forceGlobalColor.value = wt ? 1 : 0));
            const qt = Ue.current,
                mt = G.current ? 1 : 0,
                Dt = se.current ? 1 : 0;
            X.u_bpm.value !== qt && (X.u_bpm.value = qt), X.u_isBassPresent.value !== mt && (X.u_isBassPresent.value = mt), X.u_isDrumsPresent.value !== Dt && (X.u_isDrumsPresent.value = Dt), X.u_accumulatedTimes && (X.u_accumulatedTimes.value = je.current);
            const Lt = L.current;
            Lt || console.error("patternNameToIndex map is not available in animate!");
            const Zt = X.u_layers.value;
            if (Zt && Lt && !galleryReady) {
                for (let yt = 0; yt < 4; yt++) {
                    const Nt = `layer${yt+1}`,
                        it = u.current[Nt],
                        ce = Zt[yt];
                    if (!it || !ce) continue;
                    const pr = Lt[it.patternType] ?? 0;
                    ce.hasOwnProperty("patternType") && ce.patternType !== pr && (ce.patternType = pr);
                    const T = Lt[it.blendTargetType] ?? 0;
                    ce.hasOwnProperty("blendTargetType") && ce.blendTargetType !== T && (ce.blendTargetType = T);
                    const N = it.blendAmount ?? 0;
                    ce.hasOwnProperty("blendAmount") && ce.blendAmount !== N && (ce.blendAmount = N);
                    const V = it.symmetry ?? 1;
                    ce.hasOwnProperty("symmetry") && ce.symmetry !== V && (ce.symmetry = V);
                    const H = it.distortion ?? it.distortionStrength ?? 0;
                    ce.hasOwnProperty("distortionStrength") && ce.distortionStrength !== H && (ce.distortionStrength = H);
                    const k = In[it.colorMode] ?? 0;
                    ce.hasOwnProperty("colorMode") && ce.colorMode !== k && (ce.colorMode = k);
                    const _e = In[it.blendTargetColorMode] ?? k;
                    ce.hasOwnProperty("blendTargetColorMode") && ce.blendTargetColorMode !== _e && (ce.blendTargetColorMode = _e);
                    const Ne = it.freq ?? it.layer2Freq ?? 10;
                    ce.hasOwnProperty("freq") && ce.freq !== Ne && (ce.freq = Ne);
                    const Ve = it.weaveThickness ?? .02;
                    ce.hasOwnProperty("weaveThickness") && ce.weaveThickness !== Ve && (ce.weaveThickness = Ve);
                    const We = it.turingScale ?? 15;
                    ce.hasOwnProperty("turingScale") && ce.turingScale !== We && (ce.turingScale = We);
                    const Ze = it.turingSpeed ?? .5;
                    ce.hasOwnProperty("turingSpeed") && ce.turingSpeed !== Ze && (ce.turingSpeed = Ze);
                    const Ke = it.turingFeed ?? .035;
                    ce.hasOwnProperty("turingFeed") && ce.turingFeed !== Ke && (ce.turingFeed = Ke);
                    const Xe = it.turingKill ?? .065;
                    ce.hasOwnProperty("turingKill") && ce.turingKill !== Xe && (ce.turingKill = Xe);
                    const Ft = it.turingDiffusionA ?? 1;
                    ce.hasOwnProperty("turingDiffusionA") && ce.turingDiffusionA !== Ft && (ce.turingDiffusionA = Ft);
                    const Qt = it.turingDiffusionB ?? .5;
                    ce.hasOwnProperty("turingDiffusionB") && ce.turingDiffusionB !== Qt && (ce.turingDiffusionB = Qt);
                    const Ht = it.voronoiScale ?? 5;
                    ce.hasOwnProperty("voronoiScale") && ce.voronoiScale !== Ht && (ce.voronoiScale = Ht);
                    const Sn = it.voronoiEdgeWidth ?? .02;
                    ce.hasOwnProperty("voronoiEdgeWidth") && ce.voronoiEdgeWidth !== Sn && (ce.voronoiEdgeWidth = Sn);
                    const At = it.spiralArms ?? 5;
                    ce.hasOwnProperty("spiralArms") && ce.spiralArms !== At && (ce.spiralArms = At);
                    const K = it.spiralTightness ?? .5;
                    ce.hasOwnProperty("spiralTightness") && ce.spiralTightness !== K && (ce.spiralTightness = K);
                    const ze = it.spiralNoiseScale ?? 1;
                    ce.hasOwnProperty("spiralNoiseScale") && ce.spiralNoiseScale !== ze && (ce.spiralNoiseScale = ze);
                    const be = it.spiralNoiseSpeed ?? .1;
                    ce.hasOwnProperty("spiralNoiseSpeed") && ce.spiralNoiseSpeed !== be && (ce.spiralNoiseSpeed = be);
                    const $e = it.audioSensitivity ?? 1;
                    ce.hasOwnProperty("audioSensitivity") && ce.audioSensitivity !== $e && (ce.audioSensitivity = $e);
                    const at = it.bassSensitivity ?? 1;
                    ce.hasOwnProperty("bassSensitivity") && ce.bassSensitivity !== at && (ce.bassSensitivity = at);
                    const tt = it.midSensitivity ?? 1;
                    ce.hasOwnProperty("midSensitivity") && ce.midSensitivity !== tt && (ce.midSensitivity = tt);
                    const qe = it.highSensitivity ?? 1;
                    ce.hasOwnProperty("highSensitivity") && ce.highSensitivity !== qe && (ce.highSensitivity = qe);
                    const nt = it.flowComplexity ?? .6;
                    ce.hasOwnProperty("flowComplexity") && ce.flowComplexity !== nt && (ce.flowComplexity = nt);
                    const gt = it.cubeSize ?? .5;
                    ce.hasOwnProperty("cubeSize") && ce.cubeSize !== gt && (ce.cubeSize = gt);
                    const dt = it.flowCurl ?? .4;
                    ce.hasOwnProperty("flowCurl") && ce.flowCurl !== dt && (ce.flowCurl = dt);
                    const fs = it.flowSpeed ?? 0;
                    ce.hasOwnProperty("flowSpeed") && ce.flowSpeed !== fs && (ce.flowSpeed = fs);
                    const rc = it.rdComplexity ?? .5;
                    ce.hasOwnProperty("rdComplexity") && ce.rdComplexity !== rc && (ce.rdComplexity = rc);
                    const rs = it.rdSpotSize ?? .5;
                    ce.hasOwnProperty("rdSpotSize") && ce.rdSpotSize !== rs && (ce.rdSpotSize = rs);
                    const fi = it.fractalIterations ?? 4;
                    ce.hasOwnProperty("fractalIterations") && ce.fractalIterations !== fi && (ce.fractalIterations = fi);
                    const fa = it.fractalAngle ?? .5;
                    ce.hasOwnProperty("fractalAngle") && ce.fractalAngle !== fa && (ce.fractalAngle = fa);
                    const fsp = it.fractalSpeed ?? .3;
                    ce.hasOwnProperty("fractalSpeed") && ce.fractalSpeed !== fsp && (ce.fractalSpeed = fsp);
                    const ft = it.fractalThickness ?? .02;
                    ce.hasOwnProperty("fractalThickness") && ce.fractalThickness !== ft && (ce.fractalThickness = ft);
                    const lfx = it.lissajousFreqX ?? 3;
                    ce.hasOwnProperty("lissajousFreqX") && ce.lissajousFreqX !== lfx && (ce.lissajousFreqX = lfx);
                    const lfy = it.lissajousFreqY ?? 4;
                    ce.hasOwnProperty("lissajousFreqY") && ce.lissajousFreqY !== lfy && (ce.lissajousFreqY = lfy);
                    const lsp = it.lissajousSpeed ?? .2;
                    ce.hasOwnProperty("lissajousSpeed") && ce.lissajousSpeed !== lsp && (ce.lissajousSpeed = lsp);
                    const lt = it.lissajousThickness ?? .03;
                    ce.hasOwnProperty("lissajousThickness") && ce.lissajousThickness !== lt && (ce.lissajousThickness = lt);
                    const Re = it.layerSymmetryOffsetSpeed ?? 0;
                    ce.hasOwnProperty("layerSymmetryOffsetSpeed") && ce.layerSymmetryOffsetSpeed !== Re && (ce.layerSymmetryOffsetSpeed = Re), ce.hasOwnProperty("accumulatedSymmetryAngle") && (ce.accumulatedSymmetryAngle = Je.current[yt]);
                }
            } else if (!Zt || !Lt) {
                console.error("u_layers uniform not found or pattern map missing!");
            }
            {
                const fd = (c == null ? void 0 : c.frequencyData) ?? (c == null ? void 0 : c.freqData);
                if (fd && fd.length > 0) {
                    let ws = 0,
                        te = 0;
                    for (let yi = 0; yi < fd.length; yi++) {
                        const vl = fd[yi] / 255;
                        ws += yi * vl, te += vl
                    }
                    de.current = te > 0 ? ws / te / fd.length : 0;
                    const bb = Math.min(8, fd.length);
                    let bs = 0;
                    for (let yi = 0; yi < bb; yi++) bs += fd[yi];
                    ke.current = Math.min(1, bs / (bb * 255))
                } else ke.current = (c == null ? void 0 : c.beatStrength) ?? 0, de.current = (c == null ? void 0 : c.spectralCentroid) ?? 0;
                ke.current === 0 && (G.current || se.current) && (ke.current = G.current ? .7 : .5), X.hasOwnProperty("u_beatStrength") && (X.u_beatStrength.value = ke.current), X.hasOwnProperty("u_spectralCentroid") && (X.u_spectralCentroid.value = de.current);
                if (X.u_mouse) {
                    const tdAnim = threeDStateRef == null ? void 0 : threeDStateRef.current;
                    const tdGalleryAnim = tdAnim != null && tdAnim.isGallery ? tdAnim : null;
                    const brush2d = !galleryReady && tdAnim != null && tdAnim.brushActive;
                    const brushGallery = galleryReady && tdGalleryAnim != null && tdGalleryAnim.brushActive;
                    const map3dAnim = threeDEnabledRef != null && threeDEnabledRef.current && !(tdGalleryAnim != null && tdGalleryAnim.isGallery) ? 1 : 0;
                    const sphereActiveAnim = map3dAnim && tdAnim != null && tdAnim.mouseOnSphere ? 1 : 0;
                    if (brush2d || brushGallery || sphereActiveAnim) {
                        const mr = P && P.current ? P.current : Pn.current,
                            mx = mr.x ?? mr[0] ?? .5,
                            my = mr.y ?? mr[1] ?? .5;
                        X.u_mouse.value.set(mx, my)
                    }
                }
                X.u_mouseDir && X.u_mouseDir.value.copy(mouseDirRef.current)
            }
            const oi = I.current === 0 ? oe.current : ie.current,
                Vr = I.current === 0 ? ie.current : oe.current;
            const td = threeDStateRef == null ? void 0 : threeDStateRef.current;
            const galleryFaceOutputs = [];
            const galleryFloatingOutputs = [];
            if (galleryReady) {
                if (consumeGalleryWarmupRequest()) {
                    galleryWarmup.current = !0;
                }
                if (!galleryInitialized.current && galleryFacesRT.current && E.current) {
                    galleryInitialized.current = !0;
                    galleryWarmup.current = !0;
                    for (const face of galleryFacesRT.current) {
                        E.current.setRenderTarget(face.fbA);
                        E.current.clear();
                        E.current.setRenderTarget(face.fbB);
                        E.current.clear();
                        E.current.setRenderTarget(face.outA);
                        E.current.clear();
                        E.current.setRenderTarget(face.outB);
                        E.current.clear();
                        E.current.setRenderTarget(face.displayMap);
                        E.current.clear();
                        face.fbIdx = 0;
                        face.blendFlip = !0;
                        face.latestTexture = null;
                    }
                    for (const objTarget of galleryFloatingRT.current) {
                        E.current.setRenderTarget(objTarget.fbA);
                        E.current.clear();
                        E.current.setRenderTarget(objTarget.fbB);
                        E.current.clear();
                        objTarget.fbIdx = 0;
                        objTarget.blendFlip = !0;
                        objTarget.latestTexture = null;
                    }
                    E.current.setRenderTarget(null);
                }
                const galleryContainer = t.current;
                galleryContainer && galleryContainer.clientWidth > 0 && galleryContainer.clientHeight > 0 && X.u_resolution.value.set(galleryContainer.clientWidth, galleryContainer.clientHeight);
                const savedIntegrated = X.u_integratedTime.value,
                    savedUvScale = X.u_uvScale.value,
                    savedMainJe = je.current.map((t) => ({ ...t })),
                    savedResolution = X.u_resolution.value.clone(),
                    savedVisualFrom = X.u_visualModeFromIndex?.value,
                    savedVisualTo = X.u_visualModeToIndex?.value,
                    savedVisualBlend = X.u_visualModeBlend?.value,
                    savedGlobalColor = X.u_globalColorMode?.value,
                    savedForceGlobal = X.u_forceGlobalColor?.value,
                    savedPixelation = X.u_pixelationFactor?.value,
                    savedAscii = X.u_asciiCharSize?.value,
                    canvasResW = savedResolution.x,
                    canvasResH = savedResolution.y,
                    layerConfigs = [u.current.layer1, u.current.layer2, u.current.layer3, u.current.layer4];
                try {
                for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) {
                    const faceState = galleryFaceState.current[gf];
                    for (let yt = 0; yt < 4; yt++) {
                        const Nt = layerConfigs[yt];
                        if (!Nt) continue;
                        const it = faceState.times[yt],
                            ce = Nt.layerSymmetryOffsetSpeed ?? 0;
                        it.turing += ve * (Nt.turingSpeed ?? 0) * le;
                        it.spiralNoise += ve * (Nt.spiralNoiseSpeed ?? 0) * le;
                        it.flow += ve * (Nt.flowSpeed ?? 0) * le;
                        it.cube += ve * (.2 + (Nt.cubeRotationSpeed ?? 0)) * le;
                        it.smoothSpiral += ve * (Nt.smoothSpiralSpeed ?? 0) * le;
                        faceState.symmetry[yt] += ve * ce * le;
                    }
                    faceState.integrated += ve * le;
                }
                for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) {
                    const objState = galleryFloatingState.current[oi];
                    for (let yt = 0; yt < 4; yt++) {
                        const Nt = layerConfigs[yt];
                        if (!Nt) continue;
                        const it = objState.times[yt],
                            ce = Nt.layerSymmetryOffsetSpeed ?? 0;
                        it.turing += ve * (Nt.turingSpeed ?? 0) * le;
                        it.spiralNoise += ve * (Nt.spiralNoiseSpeed ?? 0) * le;
                        it.flow += ve * (Nt.flowSpeed ?? 0) * le;
                        it.cube += ve * (.2 + (Nt.cubeRotationSpeed ?? 0)) * le;
                        it.smoothSpiral += ve * (Nt.smoothSpiralSpeed ?? 0) * le;
                        objState.symmetry[yt] += ve * ce * le;
                    }
                    objState.integrated += ve * le;
                }
                const brushFace = tdGallery.brushActive && tdGallery.galleryFace >= 0 ? tdGallery.galleryFace : -1;
                const facesThisFrame = [];
                const galleryBlendSpeed = u.current.blendSpeedFactor ?? 1;
                const galleryTransitioning = isGalleryContentTransitionActive(ge);
                const renderAllGallerySurfaces = galleryWarmup.current || galleryTransitioning;
                const galleryWallStacks = getGalleryWallStacksForRender(ge, galleryBlendSpeed);
                const galleryIntegratedTimes = getGalleryFaceIntegratedTimes(galleryFaceState.current, galleryWallStacks);
                const galleryDistortionFallback = u.current.globalDistortionScale ?? 1;
                if (renderAllGallerySurfaces) {
                    for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) facesThisFrame.push(gf);
                    if (galleryWarmup.current) galleryWarmup.current = !1;
                } else {
                    if (brushFace >= 0) facesThisFrame.push(brushFace);
                    for (let fi = 0; facesThisFrame.length < GALLERY_FACES_PER_FRAME; fi++) {
                        const gf = (galleryFaceCursor.current + fi) % GALLERY_FACE_COUNT;
                        if (!facesThisFrame.includes(gf)) facesThisFrame.push(gf);
                    }
                }
                for (let fi = 0; fi < facesThisFrame.length; fi++) {
                    const gf = facesThisFrame[fi],
                        faceState = galleryFaceState.current[gf],
                        wall = applyGalleryWallStack(X.u_layers.value, gf, Lt, In, u.current, ge, galleryBlendSpeed);
                    applyGalleryWallModes(X, gf, In, ld, ge, galleryBlendSpeed);
                    const faceSize = getGalleryFaceRenderSize(gf, canvasResW, canvasResH);
                    for (let yt = 0; yt < 4; yt++) {
                        const layerUni = X.u_layers.value[yt];
                        layerUni && (layerUni.accumulatedSymmetryAngle = faceState.symmetry[yt]);
                    }
                    copyAccumulatedTimesTo(je.current, faceState.times);
                    X.u_galleryFaceIndex && (X.u_galleryFaceIndex.value = gf);
                    X.u_galleryFaceSeed && (X.u_galleryFaceSeed.value = GALLERY_FACE_SEEDS[gf]);
                    if (X.u_galleryEdgeBlend) X.u_galleryEdgeBlend.value = 0;
                    if (X.u_galleryNeighborIntegratedTime) {
                        const neighborTimes = getGalleryEdgeNeighborTimes(gf, galleryIntegratedTimes);
                        X.u_galleryNeighborIntegratedTime.value.set(
                            neighborTimes[0], neighborTimes[1], neighborTimes[2], neighborTimes[3]
                        );
                    }
                    if (X.u_galleryNeighborDistortion) {
                        const neighborDistortion = getGalleryEdgeNeighborDistortion(
                            gf, galleryWallStacks, galleryDistortionFallback
                        );
                        X.u_galleryNeighborDistortion.value.set(
                            neighborDistortion[0], neighborDistortion[1], neighborDistortion[2], neighborDistortion[3]
                        );
                    }
                    X.u_integratedTime.value = faceState.integrated + (wall?.timeOffset ?? 0);
                    X.u_accumulatedTimes.value = je.current;
                    X.u_resolution.value.set(faceSize.w, faceSize.h);
                    X.u_uvScale.value = wall?.uvScale ?? u.current.uvScale ?? .8;
                    const face = galleryFacesRT.current[gf],
                        fbRead = face.fbIdx === 0 ? face.fbA : face.fbB,
                        fbWrite = face.fbIdx === 0 ? face.fbB : face.fbA;
                    X.u_feedback_texture.value = fbRead.texture;
                    E.current.setRenderTarget(fbWrite);
                    E.current.clear();
                    E.current.render(S.current, F.current);
                    face.fbIdx = 1 - face.fbIdx;
                    const blendRead = face.blendFlip ? face.outA : face.outB,
                        blendWrite = face.blendFlip ? face.outB : face.outA;
                    if (B.current && B.current.uniforms) {
                        const yt = B.current.uniforms;
                        yt.u_textureA.value = blendRead.texture;
                        yt.u_textureB.value = fbWrite.texture;
                        yt.u_blendFactor && yt.u_blendFactor.value !== 1 && (yt.u_blendFactor.value = 1);
                    }
                    E.current.setRenderTarget(blendWrite);
                    E.current.clear();
                    E.current.render(D.current, F.current);
                    face.blendFlip = !face.blendFlip;
                    face.latestTexture = blendWrite.texture;
                    galleryFaceOutputs[gf] = blendWrite.texture;
                    if (u.current.patternDisplacementEnabled && heightBlitMesh.current && heightBlitScene.current && face.heightMap) {
                        blitPatternHeightMap(
                            E.current,
                            heightBlitScene.current,
                            blitCamera.current,
                            heightBlitMesh.current,
                            blendWrite.texture,
                            face.heightMap
                        );
                    }
                }
                galleryFaceCursor.current = (galleryFaceCursor.current + facesThisFrame.length) % GALLERY_FACE_COUNT;

                const floatingThisFrame = [];
                if (renderAllGallerySurfaces) {
                    for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) floatingThisFrame.push(oi);
                } else {
                    for (let fi = 0; fi < FLOATING_OBJECTS_PER_FRAME; fi++) {
                        const oi = (galleryFloatingCursor.current + fi) % FLOATING_OBJECT_COUNT;
                        if (!floatingThisFrame.includes(oi)) floatingThisFrame.push(oi);
                    }
                }
                for (let fi = 0; fi < floatingThisFrame.length; fi++) {
                    const oi = floatingThisFrame[fi];
                    galleryFloatingOutputs[oi] = renderFloatingObjectTexture({
                        renderer: E.current,
                        shaderScene: S.current,
                        shaderCamera: F.current,
                        blendScene: D.current,
                        blendMaterial: B.current,
                        uniforms: X,
                        objectIndex: oi,
                        objectState: galleryFloatingState.current[oi],
                        target: galleryFloatingRT.current[oi],
                        patternNameToIndex: Lt,
                        colorModeIndex: In,
                        visualModeIndex: ld,
                        globalParams: u.current,
                        je: je.current,
                        Je: Je.current,
                        renderTimeMs: ge,
                        blendSpeedFactor: galleryBlendSpeed,
                    });
                    if (u.current.patternDisplacementEnabled && heightBlitMesh.current && heightBlitScene.current) {
                        const objTarget = galleryFloatingRT.current[oi];
                        blitPatternHeightMap(
                            E.current,
                            heightBlitScene.current,
                            blitCamera.current,
                            heightBlitMesh.current,
                            galleryFloatingOutputs[oi],
                            objTarget?.heightMap
                        );
                    }
                }
                galleryFloatingCursor.current = (galleryFloatingCursor.current + floatingThisFrame.length) % FLOATING_OBJECT_COUNT;
                } finally {
                X.u_galleryFaceIndex && (X.u_galleryFaceIndex.value = -1);
                X.u_integratedTime.value = savedIntegrated;
                X.u_uvScale.value = savedUvScale;
                X.u_resolution.value.copy(savedResolution);
                X.u_visualModeFromIndex && savedVisualFrom != null && (X.u_visualModeFromIndex.value = savedVisualFrom);
                X.u_visualModeToIndex && savedVisualTo != null && (X.u_visualModeToIndex.value = savedVisualTo);
                X.u_visualModeBlend != null && savedVisualBlend != null && (X.u_visualModeBlend.value = savedVisualBlend);
                X.u_globalColorMode && savedGlobalColor != null && (X.u_globalColorMode.value = savedGlobalColor);
                X.u_forceGlobalColor != null && savedForceGlobal != null && (X.u_forceGlobalColor.value = savedForceGlobal);
                X.u_pixelationFactor && savedPixelation != null && (X.u_pixelationFactor.value = savedPixelation);
                X.u_asciiCharSize && savedAscii != null && (X.u_asciiCharSize.value = savedAscii);
                copyAccumulatedTimesTo(je.current, savedMainJe);
                X.u_accumulatedTimes.value = je.current;
                for (let yt = 0; yt < 4; yt++) {
                    const ce = X.u_layers.value[yt];
                    ce && (ce.accumulatedSymmetryAngle = Je.current[yt]);
                }
                }
            } else {
                galleryInitialized.current = !1;
                galleryWarmup.current = !1;
                X.u_galleryFaceIndex && (X.u_galleryFaceIndex.value = -1);
                X.u_feedback_texture.value = oi.texture;
                E.current.setRenderTarget(Vr);
                E.current.clear();
                E.current.render(S.current, F.current);
                I.current = 1 - I.current;
                const si = Vr.texture,
                    rr = He.current ? vt.current : Ie.current,
                    lnRt = He.current ? Ie.current : vt.current;
                if (B.current && B.current.uniforms) {
                    const yt = B.current.uniforms;
                    yt.u_textureA.value = rr.texture;
                    yt.u_textureB.value = si;
                    const Nt = 1;
                    yt.u_blendFactor && yt.u_blendFactor.value !== Nt && (yt.u_blendFactor.value = Nt);
                } else B.current && console.error("Blend material exists, but its uniforms are missing in animate loop.");
                E.current.setRenderTarget(lnRt);
                E.current.clear();
                E.current.render(D.current, F.current);
                galleryFaceOutputs.main = lnRt.texture;
            }
            const ln = galleryFaceOutputs.main;
            if (galleryReady && td != null) {
                const useHeightmap = !!u.current.patternDisplacementEnabled;
                td.setDisplacementEnabled && td.setDisplacementEnabled(useHeightmap);
                td.setBaseDisplacement && td.setBaseDisplacement(u.current.patternDisplacement ?? 0.12);
                if (td.wallMeshes && td.faceMaterials) {
                    for (let gf = 0; gf < GALLERY_FACE_COUNT; gf++) {
                        const faceTarget = galleryFacesRT.current?.[gf];
                        const faceTex =
                            faceTarget?.latestTexture ??
                            galleryFaceOutputs[gf] ??
                            null;
                        if (!faceTex || !td.wallMeshes[gf]) continue;

                        bindDisplaceableMeshTextures(
                            {
                                mesh: td.wallMeshes[gf],
                                flatMaterial: td.faceMaterials[gf],
                                displacedMaterial: td.faceDisplacedMaterials?.[gf],
                            },
                            {
                                displayTexture: faceTex,
                                heightMapTexture: faceTarget?.heightMap?.texture ?? null,
                                useHeightmap,
                            }
                        );
                    }
                }
                if (td.floatingObjects) {
                    for (let oi = 0; oi < FLOATING_OBJECT_COUNT; oi++) {
                        const objEntry = td.floatingObjects[oi];
                        if (!objEntry) continue;
                        const objTarget = galleryFloatingRT.current[oi];
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
                td.update && td.update(ve);
                E.current.setRenderTarget(null);
                E.current.setClearColor(0x030303, 1);
                E.current.clear();
                E.current.render(td.scene, td.camera);
            } else E.current.setRenderTarget(null), E.current.clear(), b.current && ln && (b.current.map = ln), E.current.render(ht.current, F.current);
            galleryReady || (He.current = !He.current)
        }, [c]);
        return React.useEffect(() => {
            var Me;
            u.current = e, _.current = n, M.current = e.pixelationFactor, w.current = e.asciiCharSize, R.current = o, A.current = s, L.current = a || {}, Le.current = l, Ue.current = d, G.current = h, se.current = p, ye.current = g;
            const W = v.current,
                ge = r,
                X = e.visualModeBlend ?? 1;
            Z.current = e.visualModeFromIndex ?? ld[W] ?? 0, xe.current = e.visualModeToIndex ?? ld[W] ?? 0, ae.current = X, v.current = ge;
            const ve = (Me = (c == null ? void 0 : c.frequencyData) ?? (c == null ? void 0 : c.freqData)) == null ? void 0 : Me.length;
            ve && ve !== Q.current && (Q.current = ve, De.current = null, O.current && O.current.uniforms.u_frequency_bin_count && (O.current.uniforms.u_frequency_bin_count.value = ve))
        }, [e, n, r, o, s, a, l, d, h, p, g, c]), React.useEffect(() => {
            var rr, ln, jn, yt, Nt, it, ce, pr, T, N, V, H, k, _e, Ne, Ve, We, Ze, Ke, Xe, Ft, Qt, Ht, Sn, At, K, ze, be, $e, at, tt, qe, nt, gt, dt, Re, Ge, Ct, Ee, bt, Ut, Wt, Rt, Xn, bn, da, ha, pa, ma, ga, va, _a, lt, kt, gn, Jt, wn, It, ai, mo, Ot, Hr, Gr, Wr, ya, Sa, Li, go, vo, jl, Xl, bp, wp, Ap, Cp, Rp, Pp, Lp, Ip, Op, Dp, Np, Fp, Up, kp, zp, Bp, Vp, Hp, Gp, Wp, jp, Xp, $p, qp, Yp, Kp, Zp, Qp, Jp, em, tm, nm, rm, im, om, sm, am, lm, cm, um, fm, dm, hm, pm, mm, gm, vm, _m, ym;
            if (!t.current) return;
            const W = t.current,
                ge = W.clientWidth,
                X = W.clientHeight,
                ve = new THREE.WebGLRenderer({
                    antialias: !0
                });
            ve.setSize(ge, X), ve.setPixelRatio(window.devicePixelRatio), ve.autoClear = !1, W.appendChild(ve.domElement), E.current = ve, canvasDomRef.current = ve.domElement;
            const Me = new THREE.Scene;
            S.current = Me;
            const et = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
            et.position.z = 1, F.current = et, Q.current = ((rr = (c == null ? void 0 : c.frequencyData) ?? (c == null ? void 0 : c.freqData)) == null ? void 0 : rr.length) || 128;
            const le = Q.current,
                C = ((c == null ? void 0 : c.frequencyData) ?? (c == null ? void 0 : c.freqData)) || new Uint8Array(le).fill(0);
            if (!f.current) {
                const An = new THREE.DataTexture(C, le, 1, THREE.RedFormat, THREE.UnsignedByteType);
                An.needsUpdate = !0, f.current = An
            }
            const re = {
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                stencilBuffer: !1
            };
            oe.current = new THREE.WebGLRenderTarget(ge, X, re), ie.current = new THREE.WebGLRenderTarget(ge, X, re), Ie.current = new THREE.WebGLRenderTarget(ge, X, re), vt.current = new THREE.WebGLRenderTarget(ge, X, re);
            galleryFacesRT.current = createGalleryFaceTargets(THREE, ge, X, re);
            galleryFloatingRT.current = createFloatingObjectTargets(THREE, ge, X, re);
            const byteRT = {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                stencilBuffer: !1
            };
            heightMapRT.current = new THREE.WebGLRenderTarget(ge, X, byteRT);
            displayMapRT.current = new THREE.WebGLRenderTarget(ge, X, byteRT);
            const blitPlane = new THREE.PlaneGeometry(2, 2),
                blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            blitCamera.current = blitCam;
            const displayBlitMat = new THREE.ShaderMaterial({
                    vertexShader: blitVert,
                    fragmentShader: colorBlitFrag,
                    uniforms: { u_src: { value: null } },
                    depthTest: !1,
                    depthWrite: !1
                }),
                heightBlitMat = new THREE.ShaderMaterial({
                    vertexShader: blitVert,
                    fragmentShader: heightBlitFrag,
                    uniforms: { u_src: { value: null } },
                    depthTest: !1,
                    depthWrite: !1
                }),
                displayBlitSc = new THREE.Scene,
                heightBlitSc = new THREE.Scene,
                displayBlitPl = new THREE.Mesh(blitPlane, displayBlitMat),
                heightBlitPl = new THREE.Mesh(blitPlane.clone(), heightBlitMat);
            displayBlitSc.add(displayBlitPl), heightBlitSc.add(heightBlitPl), displayBlitScene.current = displayBlitSc, displayBlitMesh.current = displayBlitPl, heightBlitScene.current = heightBlitSc, heightBlitMesh.current = heightBlitPl;
            const gallerySeamBlit = createGallerySeamBlitPass();
            gallerySeamBlitScene.current = gallerySeamBlit.scene;
            gallerySeamBlitMesh.current = gallerySeamBlit.mesh;
            j.current = EL(), $.current = y(), fe.current = m();
            const te = u.current,
                Ae = [te.layer1, te.layer2, te.layer3, te.layer4];
            pe.current.forEach((An, Tr) => {
                var Ii;
                An.previousPatternType = a ? a[(Ii = Ae[Tr]) == null ? void 0 : Ii.patternType] ?? 0 : 0
            });
            const Se = L.current,
                _t = new THREE.ShaderMaterial({
                    vertexShader: yL,
                    fragmentShader: SL,
                    uniforms: {
                        u_time: {
                            value: 0
                        },
                        u_integratedTime: {
                            value: 0
                        },
                        u_resolution: {
                            value: new THREE.Vector2(ge, X)
                        },
                        u_audio_texture: {
                            value: f.current
                        },
                        u_frequency_bin_count: {
                            value: Q.current
                        },
                        u_gradient_texture: {
                            value: j.current
                        },
                        u_fire_gradient_texture: {
                            value: $.current
                        },
                        u_ice_gradient_texture: {
                            value: fe.current
                        },
                        u_feedback_texture: {
                            value: null
                        },
                        u_feedback_mix: {
                            value: u.current.feedbackMix
                        },
                        u_bpm: {
                            value: Ue.current
                        },
                        u_isBassPresent: {
                            value: G.current ? 1 : 0
                        },
                        u_isDrumsPresent: {
                            value: se.current ? 1 : 0
                        },
                        u_globalTimeScale: {
                            value: u.current.globalTimeScale
                        },
                        u_globalDistortionScale: {
                            value: u.current.globalDistortionScale
                        },
                        u_globalSymmetryOffsetSpeed: {
                            value: u.current.globalSymmetryOffsetSpeed
                        },
                        u_uvScale: {
                            value: u.current.uvScale
                        },
                        u_globalAudioSensitivity: {
                            value: u.current.globalAudioSensitivity
                        },
                        u_rainbowAnimationSpeed: {
                            value: u.current.rainbowAnimationSpeed
                        },
                        u_rainbowPhase: {
                            value: 0
                        },
                        u_visualMode: {
                            value: ld[v.current] ?? 0
                        },
                        u_pixelationFactor: {
                            value: M.current
                        },
                        u_globalColorMode: {
                            value: In[R.current] ?? 0
                        },
                        u_forceGlobalColor: {
                            value: A.current ? 1 : 0
                        },
                        u_asciiCharSize: {
                            value: w.current
                        },
                        u_accumulatedTimes: {
                            value: je == null ? void 0 : je.current
                        },
                        u_layers: {
                            value: [{
                                patternType: Se ? Se[(ln = u.current.layer1) == null ? void 0 : ln.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(jn = u.current.layer1) == null ? void 0 : jn.blendTargetType] ?? 0 : 0,
                                blendAmount: ((yt = u.current.layer1) == null ? void 0 : yt.blendAmount) ?? 0,
                                symmetry: ((Nt = u.current.layer1) == null ? void 0 : Nt.symmetry) ?? 1,
                                distortionStrength: ((it = u.current.layer1) == null ? void 0 : it.distortion) ?? ((it = u.current.layer1) == null ? void 0 : it.distortionStrength) ?? 0,
                                colorMode: In[(ce = u.current.layer1) == null ? void 0 : ce.colorMode] ?? 0,
                                blendTargetColorMode: In[(pr = u.current.layer1) == null ? void 0 : pr.blendTargetColorMode] ?? In[(T = u.current.layer1) == null ? void 0 : T.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((N = u.current.layer1) == null ? void 0 : N.freq) ?? 10,
                                weaveThickness: ((V = u.current.layer1) == null ? void 0 : V.weaveThickness) ?? .02,
                                turingScale: ((H = u.current.layer1) == null ? void 0 : H.turingScale) ?? 15,
                                turingSpeed: ((k = u.current.layer1) == null ? void 0 : k.turingSpeed) ?? .5,
                                turingFeed: ((_e = u.current.layer1) == null ? void 0 : _e.turingFeed) ?? .035,
                                turingKill: ((Ne = u.current.layer1) == null ? void 0 : Ne.turingKill) ?? .065,
                                turingDiffusionA: ((Ve = u.current.layer1) == null ? void 0 : Ve.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((We = u.current.layer1) == null ? void 0 : We.turingDiffusionB) ?? .5,
                                voronoiScale: ((Ze = u.current.layer1) == null ? void 0 : Ze.voronoiScale) ?? 5,
                                voronoiEdgeWidth: ((Ke = u.current.layer1) == null ? void 0 : Ke.voronoiEdgeWidth) ?? .02,
                                spiralArms: ((Xe = u.current.layer1) == null ? void 0 : Xe.spiralArms) ?? 5,
                                spiralTightness: ((Ft = u.current.layer1) == null ? void 0 : Ft.spiralTightness) ?? .5,
                                spiralNoiseScale: ((Qt = u.current.layer1) == null ? void 0 : Qt.spiralNoiseScale) ?? 1,
                                spiralNoiseSpeed: ((Ht = u.current.layer1) == null ? void 0 : Ht.spiralNoiseSpeed) ?? .1,
                                audioSensitivity: ((Sn = u.current.layer1) == null ? void 0 : Sn.audioSensitivity) ?? 1,
                                bassSensitivity: ((At = u.current.layer1) == null ? void 0 : At.bassSensitivity) ?? 1,
                                midSensitivity: ((K = u.current.layer1) == null ? void 0 : K.midSensitivity) ?? 1,
                                highSensitivity: ((ze = u.current.layer1) == null ? void 0 : ze.highSensitivity) ?? 1,
                                flowComplexity: ((be = u.current.layer1) == null ? void 0 : be.flowComplexity) ?? .6,
                                cubeSize: (($e = u.current.layer1) == null ? void 0 : $e.cubeSize) ?? .5,
                                flowCurl: ((at = u.current.layer1) == null ? void 0 : at.flowCurl) ?? .4,
                                flowSpeed: ((at = u.current.layer1) == null ? void 0 : at.flowSpeed) ?? 0,
                                rdComplexity: ((at = u.current.layer1) == null ? void 0 : at.rdComplexity) ?? .5,
                                rdSpotSize: ((at = u.current.layer1) == null ? void 0 : at.rdSpotSize) ?? .5,
                                layerSymmetryOffsetSpeed: ((tt = u.current.layer1) == null ? void 0 : tt.layerSymmetryOffsetSpeed) ?? 0,
                                fractalIterations: ((it = u.current.layer1) == null ? void 0 : it.fractalIterations) ?? 4,
                                fractalAngle: ((it = u.current.layer1) == null ? void 0 : it.fractalAngle) ?? .5,
                                fractalSpeed: ((it = u.current.layer1) == null ? void 0 : it.fractalSpeed) ?? .3,
                                fractalThickness: ((it = u.current.layer1) == null ? void 0 : it.fractalThickness) ?? .02,
                                lissajousFreqX: ((it = u.current.layer1) == null ? void 0 : it.lissajousFreqX) ?? 3,
                                lissajousFreqY: ((it = u.current.layer1) == null ? void 0 : it.lissajousFreqY) ?? 4,
                                lissajousSpeed: ((it = u.current.layer1) == null ? void 0 : it.lissajousSpeed) ?? .2,
                                lissajousThickness: ((it = u.current.layer1) == null ? void 0 : it.lissajousThickness) ?? .03,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(qe = u.current.layer2) == null ? void 0 : qe.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(nt = u.current.layer2) == null ? void 0 : nt.blendTargetType] ?? 0 : 0,
                                blendAmount: ((gt = u.current.layer2) == null ? void 0 : gt.blendAmount) ?? 0,
                                symmetry: ((dt = u.current.layer2) == null ? void 0 : dt.symmetry) ?? 1,
                                distortionStrength: ((Re = u.current.layer2) == null ? void 0 : Re.distortionStrength) ?? 0,
                                colorMode: In[(Ge = u.current.layer2) == null ? void 0 : Ge.colorMode] ?? 0,
                                blendTargetColorMode: In[(Ct = u.current.layer2) == null ? void 0 : Ct.blendTargetColorMode] ?? In[(Ee = u.current.layer2) == null ? void 0 : Ee.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((bt = u.current.layer2) == null ? void 0 : bt.freq) ?? ((Ut = u.current.layer2) == null ? void 0 : Ut.layer2Freq) ?? 10,
                                weaveThickness: ((Wt = u.current.layer2) == null ? void 0 : Wt.weaveThickness) ?? .025,
                                turingScale: ((Rt = u.current.layer2) == null ? void 0 : Rt.turingScale) ?? 10,
                                turingSpeed: ((Xn = u.current.layer2) == null ? void 0 : Xn.turingSpeed) ?? .6,
                                turingFeed: ((bn = u.current.layer2) == null ? void 0 : bn.turingFeed) ?? .055,
                                turingKill: ((da = u.current.layer2) == null ? void 0 : da.turingKill) ?? .062,
                                turingDiffusionA: ((ha = u.current.layer2) == null ? void 0 : ha.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((pa = u.current.layer2) == null ? void 0 : pa.turingDiffusionB) ?? .5,
                                voronoiScale: ((ma = u.current.layer2) == null ? void 0 : ma.voronoiScale) ?? 6,
                                voronoiEdgeWidth: ((ga = u.current.layer2) == null ? void 0 : ga.voronoiEdgeWidth) ?? .03,
                                spiralArms: ((va = u.current.layer2) == null ? void 0 : va.spiralArms) ?? 6,
                                spiralTightness: ((_a = u.current.layer2) == null ? void 0 : _a.spiralTightness) ?? .6,
                                spiralNoiseScale: ((lt = u.current.layer2) == null ? void 0 : lt.spiralNoiseScale) ?? 1.2,
                                spiralNoiseSpeed: ((kt = u.current.layer2) == null ? void 0 : kt.spiralNoiseSpeed) ?? .15,
                                audioSensitivity: ((gn = u.current.layer2) == null ? void 0 : gn.audioSensitivity) ?? 1,
                                bassSensitivity: ((Jt = u.current.layer2) == null ? void 0 : Jt.bassSensitivity) ?? 1,
                                midSensitivity: ((wn = u.current.layer2) == null ? void 0 : wn.midSensitivity) ?? 1,
                                highSensitivity: ((It = u.current.layer2) == null ? void 0 : It.highSensitivity) ?? 1,
                                flowComplexity: ((ai = u.current.layer2) == null ? void 0 : ai.flowComplexity) ?? .7,
                                cubeSize: ((mo = u.current.layer2) == null ? void 0 : mo.cubeSize) ?? .5,
                                flowCurl: ((Ot = u.current.layer2) == null ? void 0 : Ot.flowCurl) ?? .5,
                                layerSymmetryOffsetSpeed: ((Hr = u.current.layer2) == null ? void 0 : Hr.layerSymmetryOffsetSpeed) ?? 0,
                                fractalIterations: ((it = u.current.layer2) == null ? void 0 : it.fractalIterations) ?? 4,
                                fractalAngle: ((it = u.current.layer2) == null ? void 0 : it.fractalAngle) ?? .5,
                                fractalSpeed: ((it = u.current.layer2) == null ? void 0 : it.fractalSpeed) ?? .3,
                                fractalThickness: ((it = u.current.layer2) == null ? void 0 : it.fractalThickness) ?? .02,
                                lissajousFreqX: ((it = u.current.layer2) == null ? void 0 : it.lissajousFreqX) ?? 3,
                                lissajousFreqY: ((it = u.current.layer2) == null ? void 0 : it.lissajousFreqY) ?? 4,
                                lissajousSpeed: ((it = u.current.layer2) == null ? void 0 : it.lissajousSpeed) ?? .2,
                                lissajousThickness: ((it = u.current.layer2) == null ? void 0 : it.lissajousThickness) ?? .03,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(Gr = u.current.layer3) == null ? void 0 : Gr.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(Wr = u.current.layer3) == null ? void 0 : Wr.blendTargetType] ?? 0 : 0,
                                blendAmount: ((ya = u.current.layer3) == null ? void 0 : ya.blendAmount) ?? 0,
                                symmetry: ((Sa = u.current.layer3) == null ? void 0 : Sa.symmetry) ?? 1,
                                distortionStrength: ((Li = u.current.layer3) == null ? void 0 : Li.distortionStrength) ?? 0,
                                colorMode: In[(go = u.current.layer3) == null ? void 0 : go.colorMode] ?? 0,
                                blendTargetColorMode: In[(vo = u.current.layer3) == null ? void 0 : vo.blendTargetColorMode] ?? In[(jl = u.current.layer3) == null ? void 0 : jl.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((Xl = u.current.layer3) == null ? void 0 : Xl.freq) ?? 12,
                                weaveThickness: ((bp = u.current.layer3) == null ? void 0 : bp.weaveThickness) ?? .015,
                                turingScale: ((wp = u.current.layer3) == null ? void 0 : wp.turingScale) ?? 20,
                                turingSpeed: ((Ap = u.current.layer3) == null ? void 0 : Ap.turingSpeed) ?? .4,
                                turingFeed: ((Cp = u.current.layer3) == null ? void 0 : Cp.turingFeed) ?? .025,
                                turingKill: ((Rp = u.current.layer3) == null ? void 0 : Rp.turingKill) ?? .058,
                                turingDiffusionA: ((Pp = u.current.layer3) == null ? void 0 : Pp.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((Lp = u.current.layer3) == null ? void 0 : Lp.turingDiffusionB) ?? .5,
                                voronoiScale: ((Ip = u.current.layer3) == null ? void 0 : Ip.voronoiScale) ?? 4,
                                voronoiEdgeWidth: ((Op = u.current.layer3) == null ? void 0 : Op.voronoiEdgeWidth) ?? .015,
                                spiralArms: ((Dp = u.current.layer3) == null ? void 0 : Dp.spiralArms) ?? 4,
                                spiralTightness: ((Np = u.current.layer3) == null ? void 0 : Np.spiralTightness) ?? .4,
                                spiralNoiseScale: ((Fp = u.current.layer3) == null ? void 0 : Fp.spiralNoiseScale) ?? .8,
                                spiralNoiseSpeed: ((Up = u.current.layer3) == null ? void 0 : Up.spiralNoiseSpeed) ?? .08,
                                audioSensitivity: ((kp = u.current.layer3) == null ? void 0 : kp.audioSensitivity) ?? 1,
                                bassSensitivity: ((zp = u.current.layer3) == null ? void 0 : zp.bassSensitivity) ?? 1,
                                midSensitivity: ((Bp = u.current.layer3) == null ? void 0 : Bp.midSensitivity) ?? 1,
                                highSensitivity: ((Vp = u.current.layer3) == null ? void 0 : Vp.highSensitivity) ?? 1,
                                flowComplexity: ((Hp = u.current.layer3) == null ? void 0 : Hp.flowComplexity) ?? .5,
                                flowCurl: ((Gp = u.current.layer3) == null ? void 0 : Gp.flowCurl) ?? .6,
                                layerSymmetryOffsetSpeed: ((Wp = u.current.layer3) == null ? void 0 : Wp.layerSymmetryOffsetSpeed) ?? 0,
                                fractalIterations: ((it = u.current.layer3) == null ? void 0 : it.fractalIterations) ?? 4,
                                fractalAngle: ((it = u.current.layer3) == null ? void 0 : it.fractalAngle) ?? .5,
                                fractalSpeed: ((it = u.current.layer3) == null ? void 0 : it.fractalSpeed) ?? .3,
                                fractalThickness: ((it = u.current.layer3) == null ? void 0 : it.fractalThickness) ?? .02,
                                lissajousFreqX: ((it = u.current.layer3) == null ? void 0 : it.lissajousFreqX) ?? 3,
                                lissajousFreqY: ((it = u.current.layer3) == null ? void 0 : it.lissajousFreqY) ?? 4,
                                lissajousSpeed: ((it = u.current.layer3) == null ? void 0 : it.lissajousSpeed) ?? .2,
                                lissajousThickness: ((it = u.current.layer3) == null ? void 0 : it.lissajousThickness) ?? .03,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(jp = u.current.layer4) == null ? void 0 : jp.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(Xp = u.current.layer4) == null ? void 0 : Xp.blendTargetType] ?? 0 : 0,
                                blendAmount: (($p = u.current.layer4) == null ? void 0 : $p.blendAmount) ?? 0,
                                symmetry: ((qp = u.current.layer4) == null ? void 0 : qp.symmetry) ?? 1,
                                distortionStrength: ((Yp = u.current.layer4) == null ? void 0 : Yp.distortion) ?? ((Yp = u.current.layer4) == null ? void 0 : Yp.distortionStrength) ?? 0,
                                colorMode: In[(Kp = u.current.layer4) == null ? void 0 : Kp.colorMode] ?? 0,
                                blendTargetColorMode: In[(Zp = u.current.layer4) == null ? void 0 : Zp.blendTargetColorMode] ?? In[(Qp = u.current.layer4) == null ? void 0 : Qp.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((Jp = u.current.layer4) == null ? void 0 : Jp.freq) ?? 8,
                                weaveThickness: ((em = u.current.layer4) == null ? void 0 : em.weaveThickness) ?? .03,
                                turingScale: ((tm = u.current.layer4) == null ? void 0 : tm.turingScale) ?? 12,
                                turingSpeed: ((nm = u.current.layer4) == null ? void 0 : nm.turingSpeed) ?? .7,
                                turingFeed: ((rm = u.current.layer4) == null ? void 0 : rm.turingFeed) ?? .04,
                                turingKill: ((im = u.current.layer4) == null ? void 0 : im.turingKill) ?? .06,
                                turingDiffusionA: ((om = u.current.layer4) == null ? void 0 : om.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((sm = u.current.layer4) == null ? void 0 : sm.turingDiffusionB) ?? .5,
                                voronoiScale: ((am = u.current.layer4) == null ? void 0 : am.voronoiScale) ?? 7,
                                voronoiEdgeWidth: ((lm = u.current.layer4) == null ? void 0 : lm.voronoiEdgeWidth) ?? .025,
                                spiralArms: ((cm = u.current.layer4) == null ? void 0 : cm.spiralArms) ?? 7,
                                spiralTightness: ((um = u.current.layer4) == null ? void 0 : um.tightness) ?? .7,
                                spiralNoiseScale: ((fm = u.current.layer4) == null ? void 0 : fm.spiralNoiseScale) ?? 1.5,
                                spiralNoiseSpeed: ((dm = u.current.layer4) == null ? void 0 : dm.spiralNoiseSpeed) ?? .12,
                                audioSensitivity: ((hm = u.current.layer4) == null ? void 0 : hm.audioSensitivity) ?? 1,
                                bassSensitivity: ((pm = u.current.layer4) == null ? void 0 : pm.bassSensitivity) ?? 1,
                                midSensitivity: ((mm = u.current.layer4) == null ? void 0 : mm.midSensitivity) ?? 1,
                                highSensitivity: ((gm = u.current.layer4) == null ? void 0 : gm.highSensitivity) ?? 1,
                                flowComplexity: ((vm = u.current.layer4) == null ? void 0 : vm.flowComplexity) ?? .8,
                                flowCurl: ((_m = u.current.layer4) == null ? void 0 : _m.flowCurl) ?? .3,
                                flowSpeed: ((_m = u.current.layer4) == null ? void 0 : _m.flowSpeed) ?? 0,
                                rdComplexity: ((_m = u.current.layer4) == null ? void 0 : _m.rdComplexity) ?? .5,
                                rdSpotSize: ((_m = u.current.layer4) == null ? void 0 : _m.rdSpotSize) ?? .5,
                                layerSymmetryOffsetSpeed: ((ym = u.current.layer4) == null ? void 0 : ym.layerSymmetryOffsetSpeed) ?? 0,
                                fractalIterations: ((it = u.current.layer4) == null ? void 0 : it.fractalIterations) ?? 4,
                                fractalAngle: ((it = u.current.layer4) == null ? void 0 : it.fractalAngle) ?? .5,
                                fractalSpeed: ((it = u.current.layer4) == null ? void 0 : it.fractalSpeed) ?? .3,
                                fractalThickness: ((it = u.current.layer4) == null ? void 0 : it.fractalThickness) ?? .02,
                                lissajousFreqX: ((it = u.current.layer4) == null ? void 0 : it.lissajousFreqX) ?? 3,
                                lissajousFreqY: ((it = u.current.layer4) == null ? void 0 : it.lissajousFreqY) ?? 4,
                                lissajousSpeed: ((it = u.current.layer4) == null ? void 0 : it.lissajousSpeed) ?? .2,
                                lissajousThickness: ((it = u.current.layer4) == null ? void 0 : it.lissajousThickness) ?? .03,
                                accumulatedSymmetryAngle: 0
                            }]
                        },
                        u_visualModeFromIndex: {
                            value: Z.current
                        },
                        u_visualModeToIndex: {
                            value: xe.current
                        },
                        u_visualModeBlend: {
                            value: ae.current
                        },
                        u_mouse: {
                            value: new THREE.Vector2(.5, .5)
                        },
                        u_mouseDir: {
                            value: new THREE.Vector3(0, 0, 1)
                        },
                        u_mouseMapping3D: {
                            value: 0
                        },
                        u_mouseSphereActive: {
                            value: 0
                        },
                        u_galleryFaceIndex: {
                            value: -1
                        },
                        u_galleryFaceSeed: {
                            value: 0
                        },
                        u_galleryEdgeBlend: {
                            value: GALLERY_EDGE_BLEND
                        },
                        u_galleryNeighborIntegratedTime: {
                            value: new THREE.Vector4(0, 0, 0, 0)
                        },
                        u_galleryNeighborDistortion: {
                            value: new THREE.Vector4(1, 1, 1, 1)
                        },
                        u_mouseGalleryFace: {
                            value: -1
                        },
                        u_mouseBrushActive: {
                            value: 0
                        },
                        u_mouseBrushRadius: {
                            value: 0
                        },
                        u_mouseRadius: {
                            value: u.current.mouseRadius ?? .35
                        },
                        u_mouseDistortion: {
                            value: u.current.mouseDistortion ?? .8
                        },
                        u_mouseSymmetry: {
                            value: u.current.mouseSymmetry ?? 2
                        },
                        u_mouseAttract: {
                            value: u.current.mouseAttract ?? .3
                        },
                        u_mouseTwist: {
                            value: u.current.mouseTwist ?? .5
                        },
                        u_isRandomizing: {
                            value: Le.current
                        },
                        u_estimatedBpm: {
                            value: Ue.current
                        },
                        u_isBassPresent: {
                            value: G.current
                        },
                        u_isDrumsPresent: {
                            value: se.current
                        },
                        u_drumOnsetDetected: {
                            value: ye.current
                        },
                        u_beatStrength: {
                            value: 0
                        },
                        u_spectralCentroid: {
                            value: 0
                        }
                    }
                });
            O.current = _t;
            const Mt = new THREE.PlaneGeometry(2, 2),
                wt = new THREE.Mesh(Mt, _t);
            Me.add(wt), q.current = wt;
            const qt = new THREE.Scene,
                mt = new THREE.MeshBasicMaterial({
                    map: null,
                    depthTest: !1,
                    depthWrite: !1
                }),
                Dt = new THREE.Mesh(Mt, mt);
            qt.add(Dt), ht.current = qt, b.current = mt, x.current = Dt;
            const Lt = new THREE.Scene,
                Zt = new THREE.ShaderMaterial({
                    vertexShader: xL,
                    fragmentShader: ML,
                    uniforms: {
                        u_textureA: {
                            value: null
                        },
                        u_textureB: {
                            value: null
                        },
                        u_blendFactor: {
                            value: 1
                        },
                        u_currentRender: {
                            value: null
                        },
                        u_lastRender: {
                            value: null
                        },
                        u_rainbowPhase: {
                            value: 0
                        },
                        u_accumulatedTimes: {
                            value: null
                        }
                    },
                    depthTest: !1,
                    depthWrite: !1
                }),
                oi = new THREE.Mesh(Mt, Zt);
            Lt.add(oi), D.current = Lt, B.current = Zt, Y.current = oi, U.current = performance.now();
            mainCanvasSizeRef.current = { w: ge, h: X };
            for (const rt of [oe.current, ie.current, Ie.current, vt.current]) {
                ve.setRenderTarget(rt);
                ve.clear();
            }
            ve.setRenderTarget(null);
            const Vr = An => {
                he(An), ee.current = requestAnimationFrame(Vr)
            };
            ee.current = requestAnimationFrame(Vr);
            const Ti = An => {
                const Tr = W.getBoundingClientRect();
                if (Tr.width <= 0 || Tr.height <= 0) return;
                const td = threeDStateRef == null ? void 0 : threeDStateRef.current,
                    is3d = threeDEnabledRef != null && threeDEnabledRef.current;
                if (is3d && td != null && td.isGallery) {
                    /* gallery mouse comes from center-raycast in animate loop while brush is held */
                } else if (is3d && td != null && td.mesh && td.camera) {
                    qi.current.x = (An.clientX - Tr.left) / Tr.width * 2 - 1, qi.current.y = -((An.clientY - Tr.top) / Tr.height * 2 - 1);
                    td.mesh.updateMatrixWorld(!0), td.camera.updateMatrixWorld(!0);
                    $i.current.setFromCamera(qi.current, td.camera);
                    const hits = $i.current.intersectObject(td.mesh, !1);
                    if (hits.length > 0) {
                        td.mesh.getWorldPosition(sphereCenterRef.current);
                        const dir = hits[0].point.clone().sub(sphereCenterRef.current).normalize(),
                            u = Math.atan2(dir.z, dir.x) / (Math.PI * 2) + .5,
                            v = Math.asin(Math.max(-1, Math.min(1, dir.y))) / Math.PI + .5;
                        Pn.current.set(u, v), mouseDirRef.current.copy(dir), td.mouseOnSphere = !0
                    } else td.mouseOnSphere = !1
                } else if (!is3d) Pn.current.set((An.clientX - Tr.left) / Tr.width, 1 - (An.clientY - Tr.top) / Tr.height)
            };
            W.addEventListener("pointermove", Ti);
            const si = () => {
                var Ii, xa, Ma, Ea;
                const An = W.clientWidth,
                    Tr = W.clientHeight;
                if (An <= 0 || Tr <= 0) return;
                E.current && (E.current.setSize(An, Tr), O.current && O.current.uniforms.u_resolution.value.set(An, Tr)), (Ii = oe.current) == null || Ii.setSize(An, Tr), (xa = ie.current) == null || xa.setSize(An, Tr), (Ma = Ie.current) == null || Ma.setSize(An, Tr), (Ea = vt.current) == null || Ea.setSize(An, Tr), heightMapRT.current && heightMapRT.current.setSize(An, Tr), displayMapRT.current && displayMapRT.current.setSize(An, Tr), resizeGalleryFaceTargets(galleryFacesRT.current, An, Tr), resizeFloatingObjectTargets(galleryFloatingRT.current, An, Tr);
                mainCanvasSizeRef.current = { w: An, h: Tr };
                const td = threeDStateRef == null ? void 0 : threeDStateRef.current;
                td != null && td.updateSize && td.updateSize()
            };
            return window.addEventListener("resize", si), () => {
                var An, Tr, Ii, xa, Ma, Ea, Sm, xm, Mm, Em, Tm, bm, wm, Am, Cm, Rm, Pm, Lm, Im, Om, Dm, Nm, Fm, Um;
                if (W.removeEventListener("pointermove", Ti), window.removeEventListener("resize", si), ee.current && cancelAnimationFrame(ee.current), (An = O.current) == null || An.dispose(), (Ii = (Tr = q.current) == null ? void 0 : Tr.geometry) == null || Ii.dispose(), (xa = j.current) == null || xa.dispose(), (Ma = $.current) == null || Ma.dispose(), (Ea = fe.current) == null || Ea.dispose(), (Sm = oe.current) == null || Sm.dispose(), (xm = ie.current) == null || xm.dispose(), (Mm = Ie.current) == null || Mm.dispose(), (Em = vt.current) == null || Em.dispose(), disposeGalleryFaceTargets(galleryFacesRT.current), galleryFacesRT.current = null, disposeFloatingObjectTargets(galleryFloatingRT.current), galleryFloatingRT.current = null, heightMapRT.current && heightMapRT.current.dispose(), displayMapRT.current && displayMapRT.current.dispose(), displayBlitMesh.current && (displayBlitMesh.current.geometry.dispose(), displayBlitMesh.current.material.dispose()), heightBlitMesh.current && (heightBlitMesh.current.geometry.dispose(), heightBlitMesh.current.material.dispose()), (bm = (Tm = b.current) == null ? void 0 : Tm.map) == null || bm.dispose(), (wm = b.current) == null || wm.dispose(), (Cm = (Am = x.current) == null ? void 0 : Am.geometry) == null || Cm.dispose(), (Pm = (Rm = B.current) == null ? void 0 : Rm.uniforms.u_textureA.value) == null || Pm.dispose(), (Im = (Lm = B.current) == null ? void 0 : Lm.uniforms.u_textureB.value) == null || Im.dispose(), (Om = B.current) == null || Om.dispose(), (Nm = (Dm = Y.current) == null ? void 0 : Dm.geometry) == null || Nm.dispose(), (Fm = E.current) == null || Fm.dispose(), W && ((Um = E.current) != null && Um.domElement)) try {
                    W.removeChild(E.current.domElement)
                } catch (Ex) {
                    console.warn("Error removing canvas during cleanup:", Ex)
                }
                E.current = null, S.current = null, canvasDomRef.current = null
            }
        }, [t, f, a]), {
            uniforms: (we = O.current) == null ? void 0 : we.uniforms,
            blendMaterialRef: B,
            shaderMaterialRef: O,
            canvasRef: canvasDomRef
        }
    }