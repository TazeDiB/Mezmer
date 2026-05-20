/**
 * App root: layout, WebGL canvas, controls panel, welcome/tour modal.
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
  MOUSE_PARAM_KEYS as Wa,
  MOUSE_RANDOM_PARAM_KEYS as Xa,
  THREE_D_PARAM_KEYS as Qa,
  VISUAL_MODES as Dc,
  VISUAL_MODE_INDEX as hi,
  COLOR_MODES as Bi,
  AUDIO_COLOR_MODES_LIST as j0,
  RANDOMIZER_THEMES,
} from './constants/sliderConfig.js';
import { APP_STYLES as To } from './constants/controlStyles.js';
import { PARAM_CONFIG as patternParamConfig } from './constants/index.js';
import { lerp as ud, randomInRange as Rr, isElectron as f3 } from './lib/utils.js';
import { encodePreset, decodePreset, parseShareUrl } from './lib/presets.js';
import { createRandomStartupState, createRandomMainCanvasTransition, randomizeGalleryWallStacks } from './lib/randomizer.js';
import { GLOBAL_SPEED_PARAM_SET, LAYER_SPEED_PARAM_SET } from './lib/transitionSpeedParams.js';
import { DEFAULT_GLOBALS, DEFAULT_LAYERS } from './constants/index.js';

const l3 = 1e3;
const c3 = 2500;
const u3 = 2500;
const vs = Mx;

function buildDefaultParams() {
    return {
        ...DEFAULT_GLOBALS,
        layer1: { ...DEFAULT_LAYERS.layer1 },
        layer2: { ...DEFAULT_LAYERS.layer2 },
        layer3: { ...DEFAULT_LAYERS.layer3 },
        layer4: { ...DEFAULT_LAYERS.layer4 }
    };
}

let startupSnapshot;
function getStartupState() {
    if (!startupSnapshot) {
        if (typeof window !== "undefined" && parseShareUrl()) {
            startupSnapshot = {
                params: buildDefaultParams(),
                visualMode: "normal",
                globalColorMode: "rainbow",
                forceGlobalColor: !1
            };
        } else {
            startupSnapshot = createRandomStartupState({
                theme: "chaotic",
                randomizeGlobals: !0,
                randomizeColorModes: !0,
                randomizeVisualMode: !0
            });
        }
    }
    return startupSnapshot;
}

function App() {
    const [t, e] = React.useState("layer1"), [n, r] = React.useState(!0), i = React.useMemo(() => Mx.reduce((K, ze, be) => (K[ze] = be, K), {}), []), o = React.useMemo(() => ({
        ...patternParamConfig,
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
    const [f, d] = React.useState(!1), [h, p] = React.useState(!1), [g, y] = React.useState(null), [m, u] = React.useState(null), [_, v] = React.useState(null), [M, R] = React.useState(1), [A, w] = React.useState(() => getStartupState().visualMode), [L, E] = React.useState(() => getStartupState().globalColorMode), [S, F] = React.useState(() => getStartupState().forceGlobalColor), q = React.useRef(0), O = React.useRef(null), ee = React.useRef(f), Q = React.useRef(A), oe = React.useRef(L), ie = React.useRef(S), [I, j] = React.useState(null), [activeTheme, setActiveTheme] = React.useState("chaotic"), [presetCode, setPresetCode] = React.useState(""), [threeDEnabled, setThreeDEnabled] = React.useState(!1), threeDEnabledRef = React.useRef(!1);
    React.useEffect(() => {
        threeDEnabledRef.current = threeDEnabled
    }, [threeDEnabled]);
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
    const mouseParamAnimRef = React.useRef(null);
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
            K != null && K.current && (_t.current = K.current);
        }, []),
        wt = React.useRef(null),
        qt = React.useCallback(K => {
            K != null && K.current && (wt.current = K.current);
        }, []);
    const [Dt, Lt] = React.useState(() => getStartupState().params),
        Zt = React.useRef(null);
    React.useEffect(() => {
        Zt.current = Dt
    }, [Dt]);
    const oi = React.useRef(getStartupState().params),
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
            !$e && ze ? l(at => ({
                ...at,
                [K]: {
                    startTime: performance.now(),
                    fromPattern: be.patternType,
                    toPattern: ze
                }
            })) : null
        }, [a]),
        T = React.useCallback((K, ze, be) => {
            const $e = Zt.current;
            if (h && K !== "visualMode") return;
            if (K === "blendAmount" && a[t]) return;
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
                    (typeof Ge != "number" || Ge < Re.min || Ge > Re.max) && (dt.pixelationFactor = Re.min);
                } else if (tt === "ascii") {
                    const Re = St.asciiCharSize,
                        Ge = Zt.current.asciiCharSize;
                    (typeof Ge != "number" || Ge < Re.min || Ge > Re.max) && (dt.asciiCharSize = Re.min);
                }
                Lt(Re => ({
                    ...Re,
                    ...dt
                })), w(tt), j({
                    startTime: performance.now()
                });
                return
            }
            if (Va.includes(K) || Wa.includes(K) || Qa.includes(K)) {
                Lt(tt => ({
                    ...tt,
                    [K]: parseFloat(ze)
                }));
                return
            }
            if (K === "patternDisplacementEnabled") {
                Lt(tt => ({
                    ...tt,
                    [K]: !!ze
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
                        Lt(nt => ({
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
                    }, nt[dt] = null, gt = !0) : (qe[dt] = {
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
        if (U.current) return;
        const ze = Zt.current,
            be = ee.current || K,
            $e = fe,
            at = Ue,
            tt = A,
            qe = oe.current,
            nt = ie.current,
            Re = { ...ze },
            audioActive = !!(se.current || ye.current),
            transition = createRandomMainCanvasTransition({
                currentParams: ze,
                currentVisualMode: tt,
                currentGlobalColorMode: qe,
                forceGlobalColor: nt,
                theme: activeTheme,
                randomizeGlobals: be,
                randomizeColorModes: $e,
                randomizeVisualMode: at,
                audioActive,
            });
        O.current = transition.fromParams;
        y(transition.toParams);
        randomizeGalleryWallStacks({
            theme: activeTheme,
            randomizeColorModes: $e,
            randomizeVisualMode: at,
            blendSpeedFactor: Re.blendSpeedFactor ?? M ?? 1,
            audioActive,
        });
        q.current = performance.now();
        p(!0);
    }, [y, p, A, fe, Ue, activeTheme, M]);
    React.useEffect(() => {
        if (!h || !g || !O.current) {
            cancelAnimationFrame(c.current);
            return
        }
        const K = M,
            ze = typeof K == "number" && K > 0 ? K : 1,
            be = Math.max(50, c3 / ze);
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
                            Ct !== "blendSpeedFactor" && Ct !== "pixelationFactor" && Ct !== "asciiCharSize" && St[Ct] && qe.hasOwnProperty(Ct) && g.hasOwnProperty(Ct) && (Ge[Ct] = GLOBAL_SPEED_PARAM_SET.has(Ct) ? qe[Ct] : ud(qe[Ct], g[Ct], dt))
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
                            St[Rt] && Rt !== "patternType" && Rt !== "blendTargetType" && Rt !== "blendAmount" && Rt !== "isVisible" && Rt !== "colorMode" && Ut.hasOwnProperty(Rt) && (Wt[Rt] = LAYER_SPEED_PARAM_SET.has(Rt) ? Ut[Rt] : ud(Ut[Rt], bt[Rt], dt))
                        }), Wt.colorMode = Ut.colorMode, Wt.blendTargetColorMode = bt.colorMode, Ge[Ee] = Wt
                    }
                    return Ge
                }), gt >= 1) {
                Lt(Ct => {
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
                w(Ge), $e = !1, cancelAnimationFrame(c.current)
            } else c.current = requestAnimationFrame(at)
        };
        return c.current = requestAnimationFrame(at), () => {
            $e = !1, cancelAnimationFrame(c.current)
        }
    }, [h, g, M]);
    const _e = React.useCallback(async () => {
            if (window.electronAPI && window.electronAPI.getDesktopSources) {
                try {
                    const K = await window.electronAPI.getDesktopSources();
                    ve(K), Se(null)
                } catch (K) {
                    console.error("Error getting desktop sources:", K), Se("Failed to get sources: " + K.message), ve([])
                }
            } else console.warn("Electron API for desktop sources not available."), Se("Desktop capture not supported in this environment.")
        }, []),
        Ne = React.useCallback(async () => {
            var be;
            if (!Me) {
                Se("Please select an audio source.");
                return
            }
            const K = X.find($e => $e.id === Me),
                ze = K ? K.name : "Unknown Name";
            Se(null);
            try {
                ln && rr(), (be = Nt.current) != null && be.src && Nt.current.src.startsWith("blob:") && (URL.revokeObjectURL(Nt.current.src), Nt.current.src = "");
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
                C($e), te(!0)
            } catch ($e) {
                console.error("handleStartCapture: Error during getUserMedia or stream handling:", $e), Se(`Capture failed: ${$e.message}`), te(!1), C(null)
            }
        }, [Me, ln, rr, Nt, X]),
        Ve = React.useCallback(() => {
            le && le.getTracks().forEach(K => K.stop()), C(null), te(!1), Se(null)
        }, [le]),
        We = React.useCallback((K, ze, be) => {
            clearTimeout(he.current), De.current = performance.now(), ke.current = 0, de.current = 0, Be.current = 0, we.current = performance.now();
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
                    clearTimeout(he.current);
                    return
                }
                const Ee = performance.now(),
                    bt = (Ee - we.current) / 1e3;
                we.current = Ee;
                let Ut = !1;
                const Wt = !Re && !Ge;
                if (nt === "time") {
                    Be.current += bt;
                    const Rt = gt;
                    Be.current >= Rt && (Wt ? Ut = !0 : null, Be.current = 0)
                } else if (nt === "bpm")
                    if ((at || tt) && qe > 0) {
                        const Rt = 6e4 / qe;
                        if (Rt > 0) {
                            const Xn = Rt * 4;
                            if (Ee - de.current >= Xn) {
                                ke.current++, de.current = Ee;
                                const bn = dt;
                                ke.current >= bn && (Wt ? Ut = !0 : null, ke.current = 0)
                            }
                        } else de.current = 0
                    } else de.current = 0;
                Ut && (k(!0), De.current = Ee), he.current = setTimeout($e, 100)
            };
            he.current = setTimeout($e, 100)
        }, [k]);
    React.useEffect(() => {
        $.current = M, Q.current = A, ht.current = Dt.pixelationFactor, oe.current = L, ie.current = S, U.current = h, pe.current = it, Ie.current = jn, vt.current = yt, se.current = ln, ye.current = (re && typeof re === "object" && "current" in re ? re.current : re) ?? 0, je.current = D, Je.current = Y, st.current = xe, Ye.current = ge, He.current = b, Zt.current = Dt
    }, [M, A, L, S, h, it, jn, yt, ln, re, D, Y, xe, ge, b, Dt]), React.useEffect(() => (b ? We(Y, xe, D) : clearTimeout(he.current), () => clearTimeout(he.current)), [b, Y, xe, D, We]), React.useEffect(() => () => {
        le && le.getTracks().forEach(K => K.stop())
    }, [le]);
    const Ze = React.useCallback(K => {
        et(K)
    }, []),
        mn = React.useCallback(K => {
            if (!K) return;
            K.visualMode != null && w(K.visualMode), K.globalColorMode != null && E(K.globalColorMode), K.forceGlobalColor != null && F(!!K.forceGlobalColor), Lt(ze => {
                const be = {
                    ...ze
                };
                return ["layer1", "layer2", "layer3", "layer4"].forEach($e => {
                    K[$e] && (be[$e] = {
                        ...ze[$e],
                        ...K[$e]
                    })
                }), Va.forEach($e => {
                    K[$e] !== void 0 && (be[$e] = K[$e])
                }), K.globalSymmetryOffsetSpeed !== void 0 && (be.globalSymmetryOffsetSpeed = K.globalSymmetryOffsetSpeed), be
            })
        }, []),
        $n = React.useCallback(K => {
            K.preventDefault();
            const ze = St.mouseRadius;
            if (!ze) return;
            const be = Zt.current.mouseRadius ?? ze.min,
                $e = K.deltaY > 0 ? -ze.step * 2 : ze.step * 2,
                at = Math.max(ze.min, Math.min(ze.max, be + $e));
            Lt(tt => ({
                ...tt,
                mouseRadius: at
            }))
        }, []),
        qn = React.useCallback(() => {
            mouseParamAnimRef.current && cancelAnimationFrame(mouseParamAnimRef.current);
            const K = Zt.current,
                ze = {},
                be = {};
            Xa.forEach($e => {
                const at = St[$e];
                if (!at) return;
                ze[$e] = K[$e] ?? 0, be[$e] = Rr(at)
            });
            const $e = performance.now(),
                at = 900,
                tt = qe => {
                    const nt = Math.min(1, (qe - $e) / at),
                        gt = nt * nt * (3 - 2 * nt);
                    Lt(dt => {
                        const Re = {
                            ...dt
                        };
                        return Xa.forEach(Ge => {
                            Ge in ze && Ge in be && (Re[Ge] = ud(ze[Ge], be[Ge], gt))
                        }), Re
                    }), nt < 1 ? mouseParamAnimRef.current = requestAnimationFrame(tt) : mouseParamAnimRef.current = null
                };
            mouseParamAnimRef.current = requestAnimationFrame(tt)
        }, []),
        En = React.useCallback(async () => {
            const K = encodePreset({
                ...Dt,
                visualMode: A,
                globalColorMode: L,
                forceGlobalColor: S
            });
            if (!K) return;
            setPresetCode(K);
            try {
                await navigator.clipboard.writeText(K)
            } catch (ze) {
                console.warn("Failed to copy preset to clipboard:", ze)
            }
        }, [Dt, A, L, S]),
        Tn = React.useCallback(() => {
            const K = decodePreset(presetCode);
            K && mn(K)
        }, [presetCode, mn]),
        An = React.useCallback(() => {
            const K = parseShareUrl();
            if (!K) return;
            const ze = decodePreset(K);
            ze && (setPresetCode(K), mn(ze))
        }, [mn]);
    React.useEffect(() => {
        const K = parseShareUrl();
        if (K) {
            const ze = decodePreset(K);
            ze && (setPresetCode(K), mn(ze))
        }
    }, [mn]), React.useEffect(() => () => {
        mouseParamAnimRef.current && cancelAnimationFrame(mouseParamAnimRef.current)
    }, []), React.useEffect(() => {
        const K = be => {
            if (be.target.tagName === "INPUT" || be.target.tagName === "SELECT" || be.target.tagName === "TEXTAREA") return;
            switch (be.key.toLowerCase()) {
                case "1":
                case "2":
                case "3":
                case "4":
                    N(`layer${be.key}`);
                    break;
                case "h":
                    H();
                    break;
                case "f":
                    document.documentElement.requestFullscreen?.();
                    break;
                case "m":
                    setThreeDEnabled(tt => !tt);
                    break
            }
        };
        return window.addEventListener("keydown", K), () => window.removeEventListener("keydown", K)
    }, [k, N, H]), React.useEffect(() => {
        if (X.length > 0 && !Me) {
            const K = X.find(be => be.id.startsWith("screen:")),
                ze = K ? K.id : X[0].id;
            et(ze)
        }
    }, [X]), React.useEffect(() => {
        var be;
        const K = ln || re;
        if ((se.current || ye.current) && !K) {
            let $e = !1,
                at = {
                    ...Zt.current
                };
            for (let qe = 1; qe <= 4; qe++) {
                const nt = `layer${qe}`,
                    gt = (be = at[nt]) == null ? void 0 : be.colorMode;
                gt && j0.includes(gt) && (at[nt] && (at[nt] = {
                    ...at[nt],
                    colorMode: "rainbow"
                }, $e = !0))
            }
            const tt = oe.current;
            !ie.current && j0.includes(tt) && E("rainbow"), $e && Lt(at)
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
            })), gt >= 1 ? (j(null), ze = !1, Lt(Re => ({
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
            [EVENTS.TOUR_END, EVENTS.STEP_AFTER].includes(at) ? ($e === STATUS.FINISHED || $e === STATUS.SKIPPED) && (Xe(!1), localStorage.setItem($e === STATUS.FINISHED ? "tutorialCompleted" : "tutorialSkipped", "true")) : [EVENTS.TOOLTIP_CLOSE].includes(at) && ze === ACTIONS.CLOSE && (Xe(!1), localStorage.setItem("tutorialSkipped", "true"))
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
            drumOnsetDetected: ce,
            threeDEnabled: threeDEnabled,
            onMouseWheel: $n,
            onCanvasPointerDown: qn
        }), jsx("audio", {
            ref: Nt,
            style: {
                display: "none"
            },
            crossOrigin: "anonymous"
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
            isRandomizing: h,
            activeTheme: activeTheme,
            setActiveTheme: setActiveTheme,
            onCopyPreset: En,
            onLoadPreset: Tn,
            presetCode: presetCode,
            setPresetCode: setPresetCode,
            onLoadFromUrl: An,
            threeDEnabled: threeDEnabled,
            setThreeDEnabled: setThreeDEnabled,
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
            onSourceSelect: Ze,
            setSelectedSourceId: et,
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
