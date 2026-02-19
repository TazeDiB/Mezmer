/**
 * App root: layout, WebGL canvas, controls panel, welcome/tour modal.
 * Extracted from legacy bundle.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { EVENTS, STATUS, ACTIONS } from 'react-joyride';
import { useAudio } from './hooks/useAudio.js';
import Controls from './components/Controls.jsx';
import WebGLCanvas from './components/WebGLCanvas.jsx';
import {
  SLIDER_CONFIG as St,
  PATTERN_TYPES_LIST as Mx,
  PATTERN_TYPE_OPTIONS_LIST as cd,
  GLOBAL_PARAM_KEYS as Va,
  VISUAL_MODES as Dc,
  VISUAL_MODE_INDEX as hi,
  COLOR_MODES as Bi,
  AUDIO_COLOR_MODES_LIST as j0,
} from './constants/sliderConfig.js';
import { APP_STYLES as To } from './constants/controlStyles.js';
import { DEFAULT_LAYER_PARAMS as mt } from './constants/index.js';
import { lerp as ud, randomInRange as Rr, isElectron as f3 } from './lib/utils.js';

const l3 = 1e3;
const c3 = 2500;
const u3 = 2500;
const vs = Mx;

function App() {
    const [t, e] = React.useState("layer1"), [n, r] = React.useState(!0), i = React.useMemo(() => (console.log("Recalculating patternNameToIndex map"), Mx.reduce((K, ze, be) => (K[ze] = be, K), {})), []), o = React.useMemo(() => ({
        invisible: [],
        wovenGrid: ["symmetry", "distortion", "layer2Freq", "weaveThickness"],
        hyperTuring: ["symmetry", "distortion", "turingScale", "turingSpeed", "turingFeed", "turingKill", "turingDiffusionA", "turingDiffusionB"],
        hyperVoronoi: ["symmetry", "distortion", "voronoiScale", "voronoiEdgeWidth"],
        spiralArms: ["symmetry", "distortion", "spiralArms", "spiralTightness", "spiralNoiseScale", "spiralNoiseSpeed"],
        flowComplexity: ["flowComplexity", "flowCurl"],
        singleSpinningCube: ["symmetry", "distortion", "cubeRotationSpeed", "cubeSize", "layerSymmetryOffsetSpeed"],
        _audioParams: ["audioSensitivity", "bassSensitivity", "midSensitivity", "highSensitivity"]
    }), []), s = React.useCallback(K => {
        const ze = o[K] || [],
            be = K !== "invisible" && o._audioParams ? o._audioParams : [];
        return [...new Set([...ze, ...be])]
    }, [o]), [a, l] = React.useState({
        layer1: null,
        layer2: null,
        layer3: null,
        layer4: null
    }), c = React.useRef();
    React.useRef(a);
    const [f, d] = React.useState(!1), [h, p] = React.useState(!1), [g, y] = React.useState(null), [m, u] = React.useState(null), [_, v] = React.useState(null), [M, R] = React.useState(1), [A, w] = React.useState("normal"), [L, E] = React.useState("rainbow"), [S, F] = React.useState(!1), q = React.useRef(0), O = React.useRef(null), ee = React.useRef(f), Q = React.useRef(A), oe = React.useRef(L), ie = React.useRef(S), [I, j] = React.useState(null);
    React.useRef(I);
    const $ = React.useRef(M),
        [fe, Le] = React.useState(!0),
        [Ue, G] = React.useState(!1),
        se = React.useRef(!1),
        ye = React.useRef(!1),
        pe = React.useRef(0),
        je = React.useRef(4),
        Je = React.useRef("bpm"),
        st = React.useRef(5),
        U = React.useRef(!1),
        Ye = React.useRef(!1),
        Ie = React.useRef(!1),
        vt = React.useRef(!1),
        He = React.useRef(!1),
        ht = React.useRef(100),
        [b, x] = React.useState(!1),
        [D, B] = React.useState(4),
        [Y, Z] = React.useState("bpm"),
        [xe, ae] = React.useState(5),
        De = React.useRef(0),
        ke = React.useRef(0),
        de = React.useRef(0);
    React.useRef(0);
    const he = React.useRef(null);
    React.useRef(0);
    const Be = React.useRef(0),
        we = React.useRef(0),
        W = React.useRef(null),
        ge = React.useMemo(() => Object.values(a).some(K => K !== null), [a]),
        [X, ve] = React.useState([]),
        [Me, et] = React.useState(""),
        [le, C] = React.useState(null),
        [re, te] = React.useState(!1),
        [Ae, Se] = React.useState(null),
        _t = React.useRef(null),
        Mt = React.useCallback(K => {
            console.log(">>> App received blendMaterialRef:", K), K != null && K.current ? _t.current = K.current : console.warn("Received invalid blendMaterialRef from WebGLCanvas")
        }, []),
        wt = React.useRef(null),
        qt = React.useCallback(K => {
            console.log(">>> App received shaderMaterialRef:", K), K != null && K.current ? wt.current = K.current : console.warn("Received invalid shaderMaterialRef from WebGLCanvas")
        }, []);
    React.useEffect(() => {
        console.log("App component mounted. Checking window.electronAPI:", window.electronAPI)
    }, []);
    const [Dt, Lt] = React.useState({
            layer1: {
                ...mt,
                patternType: "wovenGrid",
                blendTargetType: "wovenGrid",
                colorMode: "rainbow"
            },
            layer2: {
                ...mt,
                patternType: "hyperTuring",
                colorMode: "fire",
                symmetry: 3,
                audioSensitivity: 2.5
            },
            layer3: {
                ...mt,
                patternType: "hyperVoronoi",
                colorMode: "ice",
                symmetry: 5,
                midSensitivity: 1.8
            },
            layer4: {
                ...mt,
                patternType: "invisible",
                colorMode: "monochrome",
                bassSensitivity: 1,
                highSensitivity: 2
            },
            feedbackMix: 0,
            globalTimeScale: 1,
            globalDistortionScale: 0,
            globalSymmetryOffsetSpeed: 0,
            uvScale: .8,
            globalAudioSensitivity: 5,
            pixelationFactor: 100,
            rainbowAnimationSpeed: .1,
            asciiCharSize: 12
        }),
        Zt = React.useRef(null);
    React.useEffect(() => {
        Zt.current = Dt
    }, [Dt]);
    const oi = React.useRef(Dt),
        {
            audioData: Vr,
            loadAudio: si,
            togglePlay: rr,
            isPlaying: ln,
            isBassPresent: jn,
            isDrumsPresent: yt,
            audioElementRef: Nt,
            estimatedBpm: it,
            drumOnsetDetected: ce
        } = useAudio(W, 256, le),
        pr = React.useCallback((K, ze) => {
            const be = Zt.current[K],
                $e = a[K];
            !$e && ze ? (console.log(`Starting manual blend for ${K}: ${be.patternType} -> ${ze}`), console.log(`Layer ${K} PARAMS BEFORE manual blend start:`, JSON.stringify(be)), l(at => ({
                ...at,
                [K]: {
                    startTime: performance.now(),
                    fromPattern: be.patternType,
                    toPattern: ze
                }
            }))) : console.log(`Cannot start manual blend for ${K}`, {
                currentProgress: $e,
                fromPattern: be == null ? void 0 : be.patternType,
                targetPattern: ze
            })
        }, [a]),
        T = React.useCallback((K, ze, be) => {
            const $e = Zt.current;
            if (console.log(`handleParamChange called: param='${K}', value='${ze}', type='${be}'`), h && K !== "visualMode") {
                console.log("Randomization in progress, most controls disabled.");
                return
            } else if (K === "blendAmount" && a[t]) {
                console.log("Manual blend in progress, ignoring slider.");
                return
            }
            if (K === "globalColorMode") {
                E(ze);
                return
            }
            if (K === "forceGlobalColor") {
                F(ze);
                return
            }
            if (K === "visualMode") {
                const tt = ze,
                    qe = Q.current;
                if (tt === qe) return;
                console.log(`Manual Visual Mode Change: ${qe} -> ${tt}`);
                const nt = hi[qe] ?? 0,
                    gt = hi[tt] ?? 0;
                if (nt === gt) return;
                let dt = {
                    visualModeFromIndex: nt,
                    visualModeToIndex: gt,
                    visualModeBlend: 0
                };
                if (tt === "pixelate") {
                    const Re = St.pixelationFactor,
                        Ge = Zt.current.pixelationFactor;
                    (typeof Ge != "number" || Ge < Re.min || Ge > Re.max) && (console.log(`Pixelation factor ${Ge} invalid for manual switch to pixelate. Resetting.`), dt.pixelationFactor = Re.min)
                } else if (tt === "ascii") {
                    const Re = St.asciiCharSize,
                        Ge = Zt.current.asciiCharSize;
                    (typeof Ge != "number" || Ge < Re.min || Ge > Re.max) && (console.log(`ASCII size ${Ge} invalid for manual switch to ascii. Resetting.`), dt.asciiCharSize = Re.min)
                }
                Lt(Re => ({
                    ...Re,
                    ...dt
                })), w(tt), j({
                    startTime: performance.now()
                });
                return
            }
            if (Va.includes(K)) {
                Lt(tt => ({
                    ...tt,
                    [K]: parseFloat(ze)
                }));
                return
            }
            let at;
            if (be === "checkbox") at = ze;
            else if (K === "patternType" || K === "blendTargetType" || K === "colorMode") {
                if (at = ze, K === "patternType") {
                    const tt = $e[t].patternType,
                        qe = ze;
                    if (qe !== tt && !a[t]) {
                        console.log(`Auto-blend triggered for ${t}: ${tt} -> ${qe}`), Lt(nt => ({
                            ...nt,
                            [t]: {
                                ...nt[t],
                                blendTargetType: qe
                            }
                        })), requestAnimationFrame(() => pr(t, qe));
                        return
                    } else at = ze
                }
            } else at = parseFloat(ze);
            Lt(tt => ({
                ...tt,
                [t]: {
                    ...tt[t],
                    [K]: at
                }
            }))
        }, [t, a, h, pr]),
        N = React.useCallback(K => {
            e(K)
        }, []),
        V = React.useCallback(K => {
            var be;
            const ze = K.target.files[0];
            if (ze) {
                re && Ve();
                const $e = URL.createObjectURL(ze);
                (be = Nt.current) != null && be.src && Nt.current.src.startsWith("blob:") && URL.revokeObjectURL(Nt.current.src), si($e)
            }
        }, [si, Nt, re]),
        H = React.useCallback(() => {
            r(K => !K)
        }, []);
    React.useEffect(() => {
        const K = Math.max(50, l3 / M),
            ze = Object.entries(a).filter(([at, tt]) => tt !== null).map(([at, tt]) => at);
        if (ze.length === 0) {
            cancelAnimationFrame(c.current);
            return
        }
        let be = !0;
        const $e = at => {
            if (!be) return;
            let tt = !1,
                qe = {},
                nt = {},
                gt = !1;
            ze.forEach(dt => {
                var Ge;
                const Re = a[dt];
                if (Re) {
                    const Ct = at - Re.startTime,
                        Ee = Math.min(1, Ct / K),
                        bt = Ee * Ee * (3 - 2 * Ee);
                    Ee >= 1 ? (qe[dt] = {
                        ...((Ge = Zt.current) == null ? void 0 : Ge[dt]) || {},
                        patternType: Re.toPattern,
                        blendTargetType: "invisible",
                        blendAmount: 0
                    }, console.log(`Layer ${dt} PARAMS ON manual blend complete:`, JSON.stringify(qe[dt])), nt[dt] = null, gt = !0, console.log(`Layer ${dt} manual blend completed. Finalizing state to pattern: ${Re.toPattern}.`)) : (qe[dt] = {
                        blendAmount: bt
                    }, tt = !0)
                }
            }), Object.keys(qe).length > 0 && Lt(dt => {
                let Re = {
                    ...dt
                };
                return Object.keys(qe).forEach(Ge => {
                    Re[Ge] && (Re[Ge] = {
                        ...Re[Ge],
                        ...qe[Ge]
                    })
                }), Re
            }), gt && l(dt => {
                let Re = {
                    ...dt
                };
                return Object.keys(nt).forEach(Ge => {
                    Re[Ge] = nt[Ge]
                }), Re
            }), tt ? c.current = requestAnimationFrame($e) : (be = !1, cancelAnimationFrame(c.current))
        };
        return c.current = requestAnimationFrame($e), () => {
            be = !1, cancelAnimationFrame(c.current)
        }
    }, [a, M]);
    const k = React.useCallback((K = !1) => {
        var da, ha, pa, ma, ga, va, _a;
        const ze = Zt.current,
            be = ee.current,
            $e = fe,
            at = Ue;
        Q.current;
        const tt = A,
            qe = oe.current,
            nt = ie.current;
        if (U.current) {
            console.log("handleRandomize: Already randomizing, exiting.");
            return
        }
        const dt = hi[tt] ?? 0,
            Re = {
                ...ze
            },
            Ge = 4 * Math.PI,
            Ct = JSON.parse(JSON.stringify(oi.current)),
            Ee = {
                ...Ct
            };
        let bt = tt,
            Ut = dt,
            Wt = qe;
        if (at) {
            let lt = 0,
                kt = tt;
            for (; lt < 10 && kt === tt;) kt = Dc[Math.floor(Math.random() * Dc.length)], lt++;
            kt !== tt ? (bt = kt, Ut = hi[bt] ?? 0, console.log(`--> Randomized Visual Mode (Rand Visual ON). Target: ${bt} (${Ut})`)) : console.log(`--> Kept Visual Mode (Rand Visual ON, but randomly same). Target: ${bt} (${Ut})`)
        } else console.log(`--> Kept Visual Mode (Rand Visual OFF). Target: ${bt} (${Ut})`);
        const Rt = be || K;
        console.log(`Randomizing... Checkbox: ${be}, ForceInclude: ${K}, ActualInclude: ${Rt}`), Rt ? (Va.forEach(lt => {
            if (lt !== "blendSpeedFactor" && lt !== "pixelationFactor" && lt !== "asciiCharSize" && lt !== "rainbowAnimationSpeed" && St[lt] && Re.hasOwnProperty(lt)) {
                let kt = Rr(St[lt]);
                const gn = St[lt];
                if (lt === "globalSymmetryOffsetSpeed") {
                    const It = gn.max * .15,
                        ai = gn.min * .15;
                    kt = Math.max(ai, Math.min(It, kt))
                }
                const Jt = {
                    globalTimeScale: .5,
                    uvScale: .6,
                    globalDistortionScale: .5
                };
                if (Jt.hasOwnProperty(lt)) {
                    const wn = Jt[lt],
                        It = (gn.max + gn.min) / 2,
                        ai = (gn.max - gn.min) / 2,
                        mo = It + ai * wn,
                        Ot = It - ai * wn;
                    kt = Math.max(Ot, Math.min(mo, kt))
                }
                Ee[lt] = kt
            } else lt === "blendSpeedFactor" && Re.hasOwnProperty(lt) && (Ee[lt] = Re[lt])
        }), $e ? (Wt = Bi[Math.floor(Math.random() * Bi.length)], console.log(`--> Randomized Global Color (Globals ON, ColRand ON). Target: ${Wt}`)) : console.log(`--> Kept Global Color (Globals ON, ColRand OFF). Target: ${Wt}`), Ee.globalColorMode = Wt, Ee.forceGlobalColor = nt, St.rainbowAnimationSpeed && Re.hasOwnProperty("rainbowAnimationSpeed") && (Ee.rainbowAnimationSpeed = Rr(St.rainbowAnimationSpeed)), console.log("--> Randomized Other Numeric Globals.")) : (Va.forEach(lt => {
            Re.hasOwnProperty(lt) && (Ee[lt] = Re[lt])
        }), Ee.globalColorMode = qe, Ee.forceGlobalColor = nt, console.log("--> Kept All Globals.")), Ee.visualModeFromIndex = dt, Ee.visualModeToIndex = Ut, Ee.visualModeBlend = 0, bt === "pixelate" ? (Ee.pixelationFactor = Rr(St.pixelationFactor), console.log(`--> Set Pixelation Factor (Mode is Pixelate): ${Ee.pixelationFactor.toFixed(2)}`), Ee.hasOwnProperty("asciiCharSize") || (Ee.asciiCharSize = ((da = St.asciiCharSize) == null ? void 0 : da.default) ?? 12)) : bt === "ascii" ? (Ee.asciiCharSize = Rr(St.asciiCharSize), console.log(`--> Set ASCII Char Size (Mode is ASCII): ${Ee.asciiCharSize.toFixed(2)}`), Ee.hasOwnProperty("pixelationFactor") || (Ee.pixelationFactor = ((ha = St.pixelationFactor) == null ? void 0 : ha.default) ?? 100)) : (Ee.hasOwnProperty("pixelationFactor") || (Ee.pixelationFactor = ((pa = St.pixelationFactor) == null ? void 0 : pa.default) ?? 100, console.log("--> Pixelation Factor defaulted (Mode not Pixelate)")), Ee.hasOwnProperty("asciiCharSize") || (Ee.asciiCharSize = ((ma = St.asciiCharSize) == null ? void 0 : ma.default) ?? 12, console.log("--> ASCII Char Size defaulted (Mode not ASCII)")), console.log(`--> Kept/Randomized Factors: Pixel=${(ga=Ee.pixelationFactor)==null?void 0:ga.toFixed(2)}, ASCII=${(va=Ee.asciiCharSize)==null?void 0:va.toFixed(2)} (Mode is ${bt})`));
        for (let lt = 1; lt <= 4; lt++) {
            const kt = `layer${lt}`,
                gn = Ct[kt],
                Jt = Re[kt];
            if (!gn || !Jt) continue;
            const wn = vs[Math.floor(Math.random() * vs.length)];
            if (wn === "invisible") {
                console.log(`Layer ${lt}: Target is invisible. Keeping current params and fading out.`);
                const It = {
                    ...Jt
                };
                It.patternType = "invisible", It.blendTargetType = "invisible", It.blendAmount = 0, $e ? It.colorMode = Bi[Math.floor(Math.random() * Bi.length)] : It.colorMode = Jt.colorMode, Ee[kt] = It
            } else {
                const It = {
                    ...gn
                };
                o._audioParams && o._audioParams.forEach(Ot => {
                    if (St[Ot] && It.hasOwnProperty(Ot)) {
                        let Hr = Rr(St[Ot]);
                        Hr = Math.max(.8, Hr), It[Ot] = Hr
                    }
                }), It.patternType = wn;
                const ai = cd[Math.floor(Math.random() * cd.length)];
                It.blendTargetType = ai, It.blendAmount = 0, St.symmetry && It.hasOwnProperty("symmetry") && (It.symmetry = Math.round(Rr(St.symmetry))), St.distortion && It.hasOwnProperty("distortion") && (It.distortion = Rr(St.distortion));
                const mo = s(wn);
                console.log(`Layer ${lt} (${wn}), relevant:`, mo), mo.forEach(Ot => {
                    if (Ot !== "symmetry" && Ot !== "distortion" && St[Ot] && It.hasOwnProperty(Ot)) {
                        const Hr = Ot === "freq" || Ot === "layer2Freq" ? "layer2Freq" : Ot;
                        if (St[Hr]) {
                            const Gr = St[Hr];
                            let Wr = Rr(Gr);
                            const ya = {
                                turingSpeed: .15,
                                spiralNoiseSpeed: .15,
                                flowSpeed: .15,
                                cubeRotationSpeed: .15,
                                smoothSpiralSpeed: .15
                            };
                            if (Ot === "layerSymmetryOffsetSpeed") Wr = Math.max(-Ge, Math.min(Ge, Wr));
                            else if (ya.hasOwnProperty(Ot)) {
                                const Li = ya[Ot],
                                    go = Gr.max * Li,
                                    vo = Gr.min * Li;
                                Wr = Math.max(vo, Math.min(go, Wr))
                            }
                            const Sa = {
                                distortion: .5,
                                turingScale: .6,
                                voronoiScale: .6,
                                spiralTightness: .6,
                                spiralNoiseScale: .5,
                                smoothSpiralTightness: .6,
                                lineAngle: .5,
                                fractalAngle: .5
                            };
                            if (Sa.hasOwnProperty(Ot)) {
                                const Li = Sa[Ot],
                                    go = (Gr.max + Gr.min) / 2,
                                    vo = (Gr.max - Gr.min) / 2,
                                    jl = go + vo * Li,
                                    Xl = go - vo * Li;
                                Wr = Math.max(Xl, Math.min(jl, Wr))
                            }
                            It[Ot] = Wr
                        } else console.warn(`Missing config for resolved key ${Hr} while randomizing ${Ot} for ${kt}`)
                    } else Ot !== "symmetry" && Ot !== "distortion" && (It.hasOwnProperty(Ot) ? St[Ot] || console.warn(`Config for param ${Ot} (needed by ${wn}) not found in paramConfigs.`) : console.warn(`Param ${Ot} needed by ${wn} not found in layer ${kt} initial state structure.`))
                }), $e ? It.colorMode = Bi[Math.floor(Math.random() * Bi.length)] : It.colorMode = ((_a = ze[kt]) == null ? void 0 : _a.colorMode) || gn.colorMode, Ee[kt] = It
            }
        }
        if ([1, 2, 3, 4].every(lt => Ee[`layer${lt}`].patternType === "invisible")) {
            console.log("All randomized layers were invisible. Forcing layer1 to be visible.");
            const lt = vs.filter(Jt => Jt !== "invisible"),
                kt = lt[Math.floor(Math.random() * lt.length)];
            Ee.layer1.patternType = kt, s(kt).forEach(Jt => {
                if (Jt !== "symmetry" && Jt !== "distortion" && St[Jt] && Ee.layer1.hasOwnProperty(Jt)) {
                    const wn = Jt === "freq" || Jt === "layer2Freq" ? "layer2Freq" : Jt;
                    St[wn] && (Ee.layer1[Jt] = Rr(St[wn]))
                }
            }), St.symmetry && Ee.layer1.hasOwnProperty("symmetry") && (Ee.layer1.symmetry = Math.round(Rr(St.symmetry))), St.distortion && Ee.layer1.hasOwnProperty("distortion") && (Ee.layer1.distortion = Rr(St.distortion))
        }
        console.log("FINAL Target Params (including visual mode indices):", Ee), O.current = {
            ...Re
        };
        const bn = {
            ...O.current
        };
        for (let lt = 1; lt <= 4; lt++) {
            const kt = `layer${lt}`,
                gn = bn[kt],
                Jt = Ee[kt];
            gn && Jt && gn.patternType === "invisible" && Jt.patternType !== "invisible" && (console.log(`Layer ${kt}: Blending IN from invisible. Resetting initial speed to 0.`), bn[kt] = {
                ...gn,
                layerSymmetryOffsetSpeed: 0
            })
        }
        O.current = bn, y(Ee), q.current = performance.now(), p(!0)
    }, [s, vs, cd, Dc, Bi, hi, y, p, A, f, fe, Ue]);
    React.useEffect(() => {
        if (!h || !g || !O.current) {
            cancelAnimationFrame(c.current);
            return
        }
        const K = M,
            ze = typeof K == "number" && K > 0 ? K : 1,
            be = Math.max(50, c3 / ze);
        console.log(`Randomization Animation Effect Started (Duration: ${be}ms, SpeedFactor: ${ze})`);
        let $e = !0;
        const at = tt => {
            if (!$e) return;
            const qe = O.current,
                nt = tt - q.current,
                gt = Math.min(1, nt / be),
                dt = gt * gt * (3 - 2 * gt);
            if (Lt(Re => {
                    const Ge = {
                        ...Re
                    };
                    if (Va.forEach(Ct => {
                            Ct !== "blendSpeedFactor" && Ct !== "pixelationFactor" && Ct !== "asciiCharSize" && St[Ct] && qe.hasOwnProperty(Ct) && g.hasOwnProperty(Ct) && (Ge[Ct] = ud(qe[Ct], g[Ct], dt))
                        }), qe.hasOwnProperty("visualModeBlend") && g.hasOwnProperty("visualModeBlend")) {
                        Ge.visualModeBlend = ud(0, 1, dt), Ge.visualModeFromIndex = g.visualModeFromIndex, Ge.visualModeToIndex = g.visualModeToIndex;
                        const Ct = g.visualModeToIndex;
                        Ct === hi.pixelate ? (g.hasOwnProperty("pixelationFactor") && (Ge.pixelationFactor = g.pixelationFactor), qe.hasOwnProperty("asciiCharSize") && (Ge.asciiCharSize = qe.asciiCharSize)) : Ct === hi.ascii ? (g.hasOwnProperty("asciiCharSize") && (Ge.asciiCharSize = g.asciiCharSize), qe.hasOwnProperty("pixelationFactor") && (Ge.pixelationFactor = qe.pixelationFactor)) : (qe.hasOwnProperty("pixelationFactor") && (Ge.pixelationFactor = qe.pixelationFactor), qe.hasOwnProperty("asciiCharSize") && (Ge.asciiCharSize = qe.asciiCharSize))
                    } else Ge.visualModeBlend = Re.visualModeBlend, Ge.visualModeFromIndex = Re.visualModeFromIndex, Ge.visualModeToIndex = Re.visualModeToIndex, Ge.pixelationFactor = Re.pixelationFactor, Ge.asciiCharSize = Re.asciiCharSize;
                    for (let Ct = 1; Ct <= 4; Ct++) {
                        const Ee = `layer${Ct}`;
                        if (!g[Ee] || !qe[Ee]) continue;
                        const bt = g[Ee],
                            Ut = qe[Ee],
                            Wt = {
                                ...Ge[Ee]
                            };
                        Wt.patternType = Ut.patternType, Wt.blendTargetType = bt.patternType, Wt.blendAmount = dt, Object.keys(bt).forEach(Rt => {
                            St[Rt] && Rt !== "patternType" && Rt !== "blendTargetType" && Rt !== "blendAmount" && Rt !== "isVisible" && Rt !== "colorMode" && Ut.hasOwnProperty(Rt) && (Wt[Rt] = ud(Ut[Rt], bt[Rt], dt))
                        }), Wt.colorMode = Ut.colorMode, Wt.blendTargetColorMode = bt.colorMode, Ge[Ee] = Wt
                    }
                    return Ge
                }), gt >= 1) {
                console.log("Randomization Animation: Setting final state."), Lt(Ct => {
                    const Ee = {
                            ...Ct
                        },
                        bt = g;
                    Va.forEach(Ut => {
                        Ut !== "pixelationFactor" && Ut !== "asciiCharSize" && bt.hasOwnProperty(Ut) && (St[Ut] || Ut === "blendSpeedFactor") && (Ee[Ut] = bt[Ut])
                    }), Ee.visualModeFromIndex = bt.visualModeFromIndex, Ee.visualModeToIndex = bt.visualModeToIndex, Ee.visualModeBlend = 1, Ee.pixelationFactor = bt.pixelationFactor, Ee.asciiCharSize = bt.asciiCharSize;
                    for (let Ut = 1; Ut <= 4; Ut++) {
                        const Wt = `layer${Ut}`;
                        if (!(bt != null && bt[Wt]) || !(Ee != null && Ee[Wt])) {
                            console.warn(`Skipping final state set for layer ${Wt} due to missing data.`);
                            continue
                        }
                        const Rt = {
                                ...Ee[Wt]
                            },
                            Xn = bt[Wt];
                        Rt.patternType = Xn.patternType, Rt.colorMode = Xn.colorMode, Rt.blendTargetType = Xn.patternType, Rt.blendAmount = 0, Rt.blendTargetColorMode = Xn.colorMode, Object.keys(Xn).forEach(bn => {
                            ["patternType", "colorMode", "blendAmount", "blendTargetType", "blendTargetColorMode", "isVisible"].includes(bn) || Xn.hasOwnProperty(bn) && (Rt[bn] = bn === "symmetry" ? Math.round(Xn[bn]) : Xn[bn])
                        }), Ee[Wt] = Rt
                    }
                    return Ee
                }), p(!1);
                const Re = (g == null ? void 0 : g.visualModeToIndex) ?? 0,
                    Ge = Object.keys(hi).find(Ct => hi[Ct] === Re) || "normal";
                console.log(`Randomization finished. Setting visual mode state to: ${Ge}`), w(Ge), $e = !1, cancelAnimationFrame(c.current)
            } else c.current = requestAnimationFrame(at)
        };
        return c.current = requestAnimationFrame(at), () => {
            console.log("Randomization Animation Cleanup"), $e = !1, cancelAnimationFrame(c.current)
        }
    }, [h, g, M]);
    const _e = React.useCallback(async () => {
            if (window.electronAPI && window.electronAPI.getDesktopSources) {
                console.log("Requesting desktop sources...");
                try {
                    const K = await window.electronAPI.getDesktopSources();
                    console.log("Received sources:", K), ve(K), Se(null)
                } catch (K) {
                    console.error("Error getting desktop sources:", K), Se("Failed to get sources: " + K.message), ve([])
                }
            } else console.warn("Electron API for desktop sources not available."), Se("Desktop capture not supported in this environment.")
        }, []),
        Ne = React.useCallback(async () => {
            var be;
            if (!Me) {
                console.log("handleStartCapture: Aborted - No source selected."), Se("Please select an audio source.");
                return
            }
            const K = X.find($e => $e.id === Me),
                ze = K ? K.name : "Unknown Name";
            console.log(`Attempting to capture source: ${Me} (Name: "${ze}")`), console.log(`Current isPlaying state: ${ln}`), Se(null);
            try {
                ln && (console.log("handleStartCapture: Stopping audio file playback."), rr()), (be = Nt.current) != null && be.src && Nt.current.src.startsWith("blob:") && (console.log("handleStartCapture: Revoking old audio file URL."), URL.revokeObjectURL(Nt.current.src), Nt.current.src = ""), console.log("handleStartCapture: Calling getUserMedia...");
                const $e = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: Me
                        }
                    },
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: Me
                        }
                    }
                });
                console.log("Desktop stream acquired (contains audio+video tracks):", $e), C($e), te(!0)
            } catch ($e) {
                console.error("handleStartCapture: Error during getUserMedia or stream handling:", $e), Se(`Capture failed: ${$e.message}`), te(!1), C(null)
            }
        }, [Me, ln, rr, Nt, X]),
        Ve = React.useCallback(() => {
            console.log("Stopping desktop capture..."), le && (le.getTracks().forEach(K => K.stop()), console.log("Desktop stream tracks stopped.")), C(null), te(!1), Se(null)
        }, [le]),
        We = React.useCallback((K, ze, be) => {
            console.log(`>>> Starting Auto-Randomize Timer (Mode: ${K}, Time: ${ze}s, Measures: ${be})`), clearTimeout(he.current), De.current = performance.now(), ke.current = 0, de.current = 0, Be.current = 0, we.current = performance.now();
            const $e = () => {
                const at = se.current,
                    tt = ye.current,
                    qe = pe.current,
                    nt = Je.current,
                    gt = st.current,
                    dt = je.current,
                    Re = U.current,
                    Ge = Ye.current;
                if (Ie.current, vt.current, !He.current) {
                    console.log(">>> Auto-Randomize globally disabled. Stopping timer."), clearTimeout(he.current);
                    return
                }
                const Ee = performance.now(),
                    bt = (Ee - we.current) / 1e3;
                we.current = Ee;
                let Ut = !1;
                const Wt = !Re && !Ge;
                if (nt === "time") {
                    console.log(`AutoRand Tick (Time): isPlaying=${at}, isCapturing=${tt}, deltaTime=${bt.toFixed(4)}`), Be.current += bt;
                    const Rt = gt;
                    console.log(`AutoRand Tick (Time Mode): Accumulated: ${Be.current.toFixed(2)}s / ${Rt.toFixed(1)}s`), Be.current >= Rt && (console.log(`Time interval (${Rt.toFixed(1)}s) reached. Accumulated: ${Be.current.toFixed(1)}s`), Wt ? Ut = !0 : console.log(`>>> Time interval met, but deferred (isRandomizing=${Re}, isBlending=${Ge})`), Be.current = 0)
                } else if (nt === "bpm")
                    if ((at || tt) && qe > 0) {
                        const Rt = 6e4 / qe;
                        if (Rt > 0) {
                            const Xn = Rt * 4;
                            if (Ee - de.current >= Xn) {
                                ke.current++, de.current = Ee, console.log(`Measure ${ke.current} started.`);
                                const bn = dt;
                                ke.current >= bn && (console.log(`Target measures (${bn}) reached.`), Wt ? Ut = !0 : console.log(`>>> Target measures met, but deferred (isRandomizing=${Re}, isBlending=${Ge})`), ke.current = 0)
                            }
                        } else de.current = 0
                    } else de.current = 0;
                Ut && (console.log(`>>> Auto-Randomizing NOW (Mode: ${nt})`), k(!0), De.current = Ee), he.current = setTimeout($e, 100)
            };
            he.current = setTimeout($e, 100)
        }, [k]);
    React.useEffect(() => {
        $.current = M, Q.current = A, ht.current = Dt.pixelationFactor, oe.current = L, ie.current = S, U.current = h, pe.current = it, Ie.current = jn, vt.current = yt, se.current = ln, ye.current = (re && typeof re === "object" && "current" in re ? re.current : re) ?? 0, je.current = D, Je.current = Y, st.current = xe, Ye.current = ge, He.current = b, Zt.current = Dt
    }, [M, A, L, S, h, it, jn, yt, ln, re, D, Y, xe, ge, b, Dt]), React.useEffect(() => (console.log(`Timer useEffect RUNNING: isPlaying=${ln}, isCapturing=${re}`), console.log(`Timer useEffect Triggered: Enabled=${b}, Mode=${Y}, TimeInterval=${xe}, Interval=${D}`), b ? We(Y, xe, D) : (console.log(">>> Stopping Auto-Randomize Timer (disabled)."), clearTimeout(he.current)), () => {
        console.log(">>> CLEANUP Auto-Randomize Timer Effect"), clearTimeout(he.current)
    }), [b, Y, xe, D, We]), React.useEffect(() => () => {
        le && (console.log("App unmounting, stopping desktop stream tracks."), le.getTracks().forEach(K => K.stop()))
    }, [le]);
    const Ze = React.useCallback(K => {
        console.log(`App.jsx: handleSourceSelected called with ID: "${K}"`), et(K)
    }, []);
    React.useEffect(() => {
        if (X.length > 0 && !Me) {
            console.log("App.jsx: useEffect setting initial source ID based on loaded sources.");
            const K = X.find(be => be.id.startsWith("screen:")),
                ze = K ? K.id : X[0].id;
            et(ze), console.log(`App.jsx: Initial source ID set to: ${ze}`)
        }
    }, [X]), console.log(`App Render: isPlaying=${ln}, isCapturing=${re}`), React.useEffect(() => {
        var be;
        const K = ln || re;
        if ((se.current || ye.current) && !K) {
            console.log("Audio source stopped. Checking for active audio-reactive color modes...");
            let $e = !1,
                at = {
                    ...Zt.current
                };
            for (let qe = 1; qe <= 4; qe++) {
                const nt = `layer${qe}`,
                    gt = (be = at[nt]) == null ? void 0 : be.colorMode;
                gt && j0.includes(gt) && (console.log(`Layer ${qe} has audio-reactive mode '${gt}'. Resetting to 'rainbow'.`), at[nt] && (at[nt] = {
                    ...at[nt],
                    colorMode: "rainbow"
                }, $e = !0))
            }
            const tt = oe.current;
            !ie.current && j0.includes(tt) && (console.log(`Global color mode is audio-reactive '${tt}'. Resetting to 'rainbow'.`), E("rainbow")), $e && (console.log("Applying layer color mode resets..."), Lt(at))
        }
    }, [ln, re, Lt, E]), React.useEffect(() => {
        if (!I) {
            cancelAnimationFrame(c.current);
            return
        }
        const K = I.startTime;
        let ze = !0;
        const be = $e => {
            if (!ze) return;
            const at = $.current,
                tt = typeof at == "number" && at > 0 ? at : 1,
                qe = Math.max(50, u3 / tt),
                nt = $e - K,
                gt = Math.min(1, nt / qe),
                dt = 1 - (1 - gt) * (1 - gt);
            Lt(Re => ({
                ...Re,
                visualModeBlend: dt
            })), gt >= 1 ? (console.log("Manual visual mode animation completed."), j(null), ze = !1, Lt(Re => ({
                ...Re,
                visualModeBlend: 1
            }))) : c.current = requestAnimationFrame(be)
        };
        return c.current = requestAnimationFrame(be), () => {
            ze = !1, cancelAnimationFrame(c.current)
        }
    }, [I]);
    const [Ke, Xe] = React.useState(!1), [Ft, Qt] = React.useState(!1);
    React.useEffect(() => {
        const K = localStorage.getItem("tutorialSkipped") === "true",
            ze = localStorage.getItem("tutorialCompleted") === "true";
        !K && !ze && Qt(!0)
    }, []);
    const Ht = React.useCallback(() => {
            Qt(!1), Xe(!0)
        }, []),
        Sn = React.useCallback(() => {
            Qt(!1), Xe(!1), localStorage.setItem("tutorialSkipped", "true")
        }, []),
        At = React.useCallback(K => {
            const {
                action: ze,
                index: be,
                status: $e,
                type: at
            } = K;
            [EVENTS.TOUR_END, EVENTS.STEP_AFTER].includes(at) ? ($e === STATUS.FINISHED || $e === STATUS.SKIPPED) && (Xe(!1), localStorage.setItem($e === STATUS.FINISHED ? "tutorialCompleted" : "tutorialSkipped", "true")) : [EVENTS.TOOLTIP_CLOSE].includes(at) && (console.log(`Joyride: Tooltip closed - Status: ${$e}, Action: ${ze}, Index: ${be}`), ze === ACTIONS.CLOSE && (Xe(!1), localStorage.setItem("tutorialSkipped", "true")))
        }, []);
    return jsxs("div", {
        className: To.appContainer,
        children: [Ft && jsx("div", {
            className: To.welcomeModalOverlay,
            children: jsxs("div", {
                className: To.welcomeModalContent,
                children: [jsx("h2", {
                    children: "Welcome to HyperSymmetry!"
                }), jsx("p", {
                    children: "Would you like a quick tour of the controls?"
                }), jsxs("div", {
                    className: To.welcomeModalButtons,
                    children: [jsx("button", {
                        onClick: Ht,
                        className: To.welcomeButtonPrimary,
                        children: "Start Tutorial"
                    }), jsx("button", {
                        onClick: Sn,
                        className: To.welcomeButtonSecondary,
                        children: "Skip"
                    })]
                })]
            })
        }), jsx(WebGLCanvas, {
            params: Dt,
            audioData: Vr,
            blendSpeedFactor: M,
            visualMode: A,
            pixelationFactor: Dt.pixelationFactor,
            asciiCharSize: Dt.asciiCharSize,
            globalColorMode: L,
            forceGlobalColor: S,
            patternNameToIndex: i,
            isRandomizing: h,
            audioTextureRef: W,
            estimatedBpm: it,
            isBassPresent: jn,
            isDrumsPresent: yt,
            onBlendMaterialReady: Mt,
            onShaderMaterialReady: qt,
            drumOnsetDetected: ce
        }), jsx("button", {
            onClick: H,
            className: To.toggleButton,
            "aria-label": n ? "Hide Controls" : "Show Controls",
            children: n ? "✖" : "☰"
        }), n && jsx(Controls, {
            params: Dt,
            pixelationFactor: Dt.pixelationFactor,
            asciiCharSize: Dt.asciiCharSize,
            manualBlendProgress: a,
            getRelevantParamsForPattern: s,
            paramConfigs: St,
            patternParameterMap: o,
            onParamChange: T,
            activeLayer: t,
            onLayerSelect: N,
            onRandomize: k,
            patternTypes: vs,
            onFileChange: V,
            onTogglePlay: rr,
            isPlaying: ln,
            visualMode: A,
            visualModes: Dc,
            setVisualMode: w,
            globalColorMode: L,
            setGlobalColorMode: E,
            colorModes: Bi,
            forceGlobalColor: S,
            setForceGlobalColor: F,
            randomizeGlobals: f,
            setRandomizeGlobals: d,
            blendSpeedFactor: M,
            setBlendSpeedFactor: R,
            randomizeColorModes: fe,
            setRandomizeColorModes: Le,
            randomizeVisualMode: Ue,
            setRandomizeVisualMode: G,
            autoRandomizeEnabled: b,
            setAutoRandomizeEnabled: x,
            autoRandomizeInterval: D,
            setAutoRandomizeInterval: B,
            autoRandomizeMode: Y,
            setAutoRandomizeMode: Z,
            autoRandomizeTimeInterval: xe,
            setAutoRandomizeTimeInterval: ae,
            isElectron: f3,
            desktopSources: X,
            selectedSourceId: Me,
            onSourceSelected: Ze,
            onStartCapture: Ne,
            onStopCapture: Ve,
            onGetSources: _e,
            isCapturing: re,
            captureError: Ae,
            audioElementRef: Nt,
            runTutorial: Ke,
            handleJoyrideCallback: At
        })]
    })
}

export default App;
