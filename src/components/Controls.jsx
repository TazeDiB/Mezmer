/**
 * Controls panel: layers, audio, randomization, global settings, Joyride tour.
 * Extracted from legacy bundle.
 */
import React, { useCallback, useState, useMemo, memo } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import Joyride from 'react-joyride';
import { TOOLTIP_COPY as cn, JOYRIDE_STEPS as ZL, AUDIO_REACTIVE_COLOR_MODES as W0 } from '../constants/joyrideSteps.js';
import { CONTROL_STYLES as Qe } from '../constants/controlStyles.js';

const ne = { jsx, jsxs, Fragment: React.Fragment };
const Bb = Joyride;

function Controls({
    params: t,
    activeLayer: e,
    manualBlendProgress: n,
    isRandomizing: r,
    paramConfigs: i,
    patternParameterMap: o,
    patternTypes: s,
    getRelevantParamsForPattern: a,
    blendSpeedFactor: l,
    setBlendSpeedFactor: c,
    visualMode: f,
    visualModes: d,
    setVisualMode: h,
    globalColorMode: p,
    colorModes: g,
    setGlobalColorMode: y,
    forceGlobalColor: m,
    setForceGlobalColor: u,
    pixelationFactor: _,
    asciiCharSize: v,
    onParamChange: M,
    onLayerSelect: R,
    onRandomize: A,
    randomizeGlobals: w,
    setRandomizeGlobals: L,
    onFileChange: E,
    onTogglePlay: S,
    isPlaying: F,
    audioElementRef: q,
    autoRandomizeEnabled: O,
    setAutoRandomizeEnabled: ee,
    autoRandomizeInterval: Q,
    setAutoRandomizeInterval: oe,
    isElectron: ie,
    desktopSources: I,
    selectedSourceId: j,
    setSelectedSourceId: $,
    autoRandomizeMode: fe,
    setAutoRandomizeMode: Le,
    isCapturing: Ue,
    captureError: G,
    onGetSources: se,
    onStartCapture: ye,
    onStopCapture: pe,
    onSourceSelect: je,
    autoRandomizeTimeInterval: Je,
    setAutoRandomizeTimeInterval: st,
    randomizeColorModes: U,
    setRandomizeColorModes: Ye,
    randomizeVisualMode: Ie,
    setRandomizeVisualMode: vt,
    runTutorial: He,
    handleJoyrideCallback: ht
}) {
    var we;
    const [b, x] = useState({
        audio: !0,
        randomization: !0,
        layer: !0,
        global: !0
    }), D = useCallback(W => {
        x(ge => ({
            ...ge,
            [W]: !ge[W]
        }))
    }, []);
    if (!t) return console.warn("Controls component rendered before params was initialized."), null;
    const B = F || Ue;
    console.log("Controls component rendered", {
        isCapturing: Ue,
        selectedSourceId: j,
        desktopSourcesLength: I.length
    });
    const Y = () => {
            Ue ? (console.log("Controls.jsx: Stop Capture button clicked!"), pe()) : (console.log("Controls.jsx: Start Capture button clicked!"), ye())
        },
        Z = useCallback(W => {
            const {
                name: ge,
                value: X,
                type: ve,
                checked: Me
            } = W.target;
            console.log(`Controls.jsx: handleInputChange received - Name: ${ge}, Value: ${X}, Type: ${ve}`), ge === "blendSpeedFactor" ? c(parseFloat(X)) : ge === "desktopSourceSelect" ? (console.log(`Controls.jsx: desktopSourceSelect changed. New value: "${X}"`), $(X), console.log(`Controls.jsx: Called setSelectedSourceId with: "${X}"`)) : M(ge, ve === "checkbox" ? Me : X, ve)
        }, [c, $, M]),
        xe = t[e];
    if (!xe) return console.warn(`Controls: params[${e}] is undefined during render.`), null;
    if (!n) return console.warn("Controls: manualBlendProgress is undefined during render."), null;
    const ae = t,
        De = n[e] !== null,
        ke = xe.patternType || "invisible",
        de = a(ke),
        he = (W, ge, X = !1) => {
            const ve = i[W];
            if (!ve) return console.warn(`Slider config missing for param: ${W}`), null;
            const Me = r || W === "blendAmount" && De,
                et = cn[W] || cn.default,
                le = `slider-${W}`;
            return ne.jsxs("div", {
                id: le,
                className: Qe.controlGroup,
                title: et,
                children: [ne.jsxs("label", {
                    htmlFor: W,
                    children: [ve.label, ":"]
                }), ne.jsx("input", {
                    type: "range",
                    id: W,
                    name: W,
                    min: ve.min,
                    max: ve.max,
                    step: ve.step,
                    value: W === "blendSpeedFactor" ? l : ge,
                    onInput: Z,
                    disabled: Me,
                    style: {
                        opacity: Me ? .5 : 1
                    }
                }), ne.jsx("span", {
                    children: W === "blendSpeedFactor" ? ve.format(l) : ve.format(ge)
                })]
            }, W)
        },
        Be = {
            options: {
                zIndex: 1e4,
                arrowColor: "#2c2c34",
                primaryColor: "#e74c3c",
                textColor: "#e0e0e0",
                overlayColor: "rgba(0, 0, 0, 0.6)"
            },
            tooltip: {
                backgroundColor: "#2c2c34",
                borderRadius: "6px",
                border: "2px solid #e74c3c",
                padding: "15px 20px"
            },
            tooltipContainer: {
                textAlign: "left"
            },
            tooltipContent: {
                padding: "10px 0 0 0"
            },
            buttonClose: {
                color: "#aaa",
                outline: "none"
            },
            buttonNext: {
                backgroundColor: "#e74c3c",
                borderRadius: "4px",
                color: "#fff",
                outline: "none",
                padding: "8px 15px",
                fontSize: "0.9em"
            },
            buttonBack: {
                borderRadius: "4px",
                color: "#ccc",
                outline: "none",
                marginRight: 10,
                padding: "8px 15px",
                fontSize: "0.9em",
                border: "1px solid #555"
            },
            buttonSkip: {
                color: "#aaa",
                fontSize: "0.9em",
                textDecoration: "underline",
                outline: "none"
            },
            beaconInner: {
                backgroundColor: "#e74c3c"
            },
            beaconOuter: {
                borderColor: "#e74c3c"
            }
        };
    return ne.jsxs("div", {
        className: Qe.controlsWrapper,
        children: [He && ne.jsx(Bb, {
            steps: ZL,
            run: He,
            callback: ht,
            continuous: !0,
            showProgress: !0,
            showSkipButton: !0,
            styles: Be,
            disableScrollParentFix: !0,
            locale: {
                last: "Let's Go!"
            }
        }), ne.jsxs("div", {
            id: "controls-container",
            className: Qe.controlsContainer,
            children: [ne.jsxs("fieldset", {
                id: "fieldset-audio",
                className: `${Qe.controlFieldset} ${Qe.audioFieldset}`,
                children: [ne.jsxs("legend", {
                    onClick: () => D("audio"),
                    children: ["Audio Source ", b.audio ? "▼" : "▶"]
                }), b.audio && ne.jsxs("div", {
                    className: Qe.fieldsetContent,
                    children: [ne.jsxs("div", {
                        className: Qe.controlGroup,
                        title: cn.audioFileInput,
                        children: [ne.jsx("label", {
                            htmlFor: "audioFileInput",
                            children: "Load File:"
                        }), ne.jsx("input", {
                            type: "file",
                            id: "audioFileInput",
                            accept: "audio/*",
                            onChange: E,
                            disabled: Ue
                        })]
                    }), ne.jsx("div", {
                        className: Qe.controlGroup,
                        title: cn.toggleAudioPlay,
                        children: ne.jsx("button", {
                            id: "button-toggleAudioPlay",
                            onClick: S,
                            disabled: !((we = q == null ? void 0 : q.current) != null && we.src) || Ue,
                            children: F ? "Pause File" : "Play File"
                        })
                    }), ie && ne.jsxs(ne.Fragment, {
                        children: [ne.jsx("hr", {
                            className: Qe.separator
                        }), ne.jsxs("div", {
                            className: Qe.subSection,
                            children: [ne.jsx("h4", {
                                children: "Desktop Audio"
                            }), G && ne.jsx("p", {
                                className: Qe.errorText,
                                children: G
                            }), ne.jsx("div", {
                                className: Qe.controlGroup,
                                title: cn.getDesktopSources,
                                children: ne.jsx("button", {
                                    id: "button-getDesktopSources",
                                    onClick: se,
                                    disabled: Ue,
                                    children: "Get Sources"
                                })
                            }), I.length > 0 && ne.jsxs(ne.Fragment, {
                                children: [ne.jsxs("div", {
                                    className: Qe.controlGroup,
                                    title: cn.desktopSourceSelect,
                                    children: [ne.jsx("label", {
                                        htmlFor: "desktopSourceSelect",
                                        children: "Select Source:"
                                    }), ne.jsx("select", {
                                        id: "desktopSourceSelect",
                                        name: "desktopSourceSelect",
                                        value: j,
                                        onChange: W => je(W.target.value),
                                        disabled: Ue,
                                        children: I.map(W => ne.jsx("option", {
                                            value: W.id,
                                            children: W.name
                                        }, W.id))
                                    }, `desktop-select-${I.length}`)]
                                }), ne.jsx("div", {
                                    className: `${Qe.controlGroup} ${Qe.captureButtonsGroup}`,
                                    title: cn.toggleDesktopCapture,
                                    children: ne.jsx("button", {
                                        id: "button-toggleDesktopCapture",
                                        onClick: Y,
                                        className: Ue ? Qe.stopButton : "",
                                        disabled: !Ue && !j,
                                        children: Ue ? "Stop Capture" : "Start Capture"
                                    })
                                })]
                            })]
                        })]
                    })]
                })]
            }), ne.jsxs("fieldset", {
                id: "fieldset-randomization",
                className: Qe.controlFieldset,
                children: [ne.jsxs("legend", {
                    onClick: () => D("randomization"),
                    children: ["Randomization ", b.randomization ? "▼" : "▶"]
                }), b.randomization && ne.jsxs("div", {
                    className: Qe.fieldsetContent,
                    children: [ne.jsx("div", {
                        className: Qe.controlGroup,
                        title: cn.randomizeAll,
                        children: ne.jsx("button", {
                            id: "button-randomizeAll",
                            onClick: A,
                            className: Qe.randomizeButton,
                            disabled: r,
                            children: r ? "Randomizing..." : "Randomize All"
                        })
                    }), ne.jsxs("div", {
                        id: "randomize-options-group",
                        className: Qe.checkboxGroup,
                        children: [ne.jsxs("div", {
                            className: Qe.checkboxItem,
                            title: cn.randomizeGlobals,
                            children: [ne.jsx("input", {
                                type: "checkbox",
                                id: "randomizeGlobalsCheckbox",
                                checked: w,
                                onChange: W => L(W.target.checked),
                                disabled: r
                            }), ne.jsx("label", {
                                htmlFor: "randomizeGlobalsCheckbox",
                                children: "Globals"
                            })]
                        }), ne.jsxs("div", {
                            className: Qe.checkboxItem,
                            title: cn.randomizeColorModes,
                            children: [ne.jsx("input", {
                                type: "checkbox",
                                id: "randomizeColorModes",
                                name: "randomizeColorModes",
                                checked: U,
                                onChange: W => Ye(W.target.checked),
                                disabled: r
                            }), ne.jsx("label", {
                                htmlFor: "randomizeColorModes",
                                children: "Colors"
                            })]
                        }), ne.jsxs("div", {
                            className: Qe.checkboxItem,
                            title: cn.randomizeVisualMode,
                            children: [ne.jsx("input", {
                                type: "checkbox",
                                id: "randomizeVisualMode",
                                name: "randomizeVisualMode",
                                checked: Ie,
                                onChange: W => vt(W.target.checked),
                                disabled: r
                            }), ne.jsx("label", {
                                htmlFor: "randomizeVisualMode",
                                children: "Visual Mode"
                            })]
                        })]
                    }), ne.jsxs("div", {
                        id: "auto-randomize-section",
                        className: `${Qe.subSection} ${Qe.autoRandomizeSection}`,
                        children: [ne.jsx("h4", {
                            children: "Auto Randomize"
                        }), ne.jsx("div", {
                            className: Qe.controlGroup,
                            title: cn.autoRandomizeEnable,
                            children: ne.jsxs("div", {
                                className: Qe.checkboxLabel,
                                children: [ne.jsx("input", {
                                    type: "checkbox",
                                    id: "autoRandomizeEnabledCheckbox",
                                    checked: O,
                                    onChange: W => ee(W.target.checked),
                                    disabled: r
                                }), ne.jsx("label", {
                                    htmlFor: "autoRandomizeEnabledCheckbox",
                                    children: "Enable"
                                })]
                            })
                        }), ne.jsxs("div", {
                            id: "auto-randomize-mode-group",
                            className: Qe.controlGroup,
                            title: cn.autoRandomizeMode,
                            style: {
                                marginBottom: "10px"
                            },
                            children: [ne.jsx("label", {
                                style: {
                                    marginRight: "10px"
                                },
                                children: "Mode:"
                            }), ne.jsxs("div", {
                                className: Qe.radioGroup,
                                children: [ne.jsxs("label", {
                                    className: Qe.radioLabel,
                                    children: [ne.jsx("input", {
                                        type: "radio",
                                        name: "autoRandomizeMode",
                                        value: "bpm",
                                        checked: fe === "bpm",
                                        onChange: W => Le(W.target.value),
                                        disabled: r
                                    }), "BPM Sync"]
                                }), ne.jsxs("label", {
                                    className: Qe.radioLabel,
                                    children: [ne.jsx("input", {
                                        type: "radio",
                                        name: "autoRandomizeMode",
                                        value: "time",
                                        checked: fe === "time",
                                        onChange: W => Le(W.target.value),
                                        disabled: r
                                    }), "Time Interval"]
                                })]
                            })]
                        }), O && ne.jsxs(ne.Fragment, {
                            children: [fe === "bpm" && i.autoRandomizeInterval && he("autoRandomizeInterval", Q), fe === "time" && i.autoRandomizeTimeInterval && he("autoRandomizeTimeInterval", Je)]
                        })]
                    })]
                })]
            }), ne.jsxs("fieldset", {
                id: "fieldset-layer",
                className: Qe.controlFieldset,
                children: [ne.jsxs("legend", {
                    onClick: () => D("layer"),
                    children: ["Layer Control ", b.layer ? "▼" : "▶"]
                }), b.layer && ne.jsxs("div", {
                    className: Qe.fieldsetContent,
                    children: [ne.jsxs("div", {
                        className: Qe.controlGroup,
                        title: cn.layerSelector,
                        children: [ne.jsx("label", {
                            children: "Select Layer:"
                        }), ne.jsxs("div", {
                            id: "layer-selector-buttons",
                            className: Qe.layerButtonGroup,
                            children: [ne.jsx("button", {
                                id: "layer-button-1",
                                className: Qe.layerButton,
                                onClick: () => R("layer1"),
                                disabled: e === "layer1" || r,
                                children: "L1"
                            }), ne.jsx("button", {
                                id: "layer-button-2",
                                className: Qe.layerButton,
                                onClick: () => R("layer2"),
                                disabled: e === "layer2" || r,
                                children: "L2"
                            }), ne.jsx("button", {
                                id: "layer-button-3",
                                className: Qe.layerButton,
                                onClick: () => R("layer3"),
                                disabled: e === "layer3" || r,
                                children: "L3"
                            }), ne.jsx("button", {
                                id: "layer-button-4",
                                className: Qe.layerButton,
                                onClick: () => R("layer4"),
                                disabled: e === "layer4" || r,
                                children: "L4"
                            })]
                        })]
                    }), ne.jsx("h4", {
                        className: Qe.activeLayerTitle,
                        children: `Layer ${e.slice(-1)} Settings`
                    }), ne.jsxs("div", {
                        className: Qe.controlGroup,
                        title: cn.patternType,
                        children: [ne.jsx("label", {
                            htmlFor: "patternType",
                            children: "Pattern:"
                        }), ne.jsx("select", {
                            id: "patternType",
                            name: "patternType",
                            value: xe.patternType || "",
                            onChange: Z,
                            disabled: r,
                            children: s.map(W => ne.jsx("option", {
                                value: W,
                                children: W.charAt(0).toUpperCase() + W.slice(1)
                            }, W))
                        })]
                    }), ne.jsxs("div", {
                        className: Qe.controlGroup,
                        title: cn.layerColorMode,
                        children: [ne.jsx("label", {
                            htmlFor: "layerColorMode",
                            children: "Color:"
                        }), ne.jsx("select", {
                            id: "layerColorMode",
                            name: "colorMode",
                            value: xe.colorMode || "rainbow",
                            onChange: Z,
                            disabled: r || m,
                            style: {
                                opacity: m ? .5 : 1
                            },
                            children: g.map(W => {
                                const ge = W0.includes(W),
                                    X = r || m || ge && !B;
                                return ne.jsxs("option", {
                                    value: W,
                                    disabled: X,
                                    style: X ? {
                                        fontStyle: "italic",
                                        color: "#aaa"
                                    } : {},
                                    children: [W.charAt(0).toUpperCase() + W.slice(1), ge ? " (A)" : ""]
                                }, W)
                            })
                        })]
                    }), de.map(W => xe.hasOwnProperty(W) && i[W] && W !== "blendAmount" ? he(W, xe[W]) : null), xe.patternType !== "invisible" && i.blendAmount && he("blendAmount", xe.blendAmount)]
                })]
            }), ne.jsxs("fieldset", {
                id: "fieldset-global",
                className: Qe.controlFieldset,
                children: [ne.jsxs("legend", {
                    onClick: () => D("global"),
                    children: ["Global Settings ", b.global ? "▼" : "▶"]
                }), b.global && ne.jsxs("div", {
                    className: Qe.fieldsetContent,
                    children: [ne.jsxs("div", {
                        className: Qe.controlGroup,
                        title: cn.visualMode,
                        children: [ne.jsx("label", {
                            htmlFor: "visualModeSelect",
                            children: "Visual Mode:"
                        }), ne.jsx("select", {
                            id: "visualModeSelect",
                            name: "visualMode",
                            value: f,
                            onChange: Z,
                            disabled: r,
                            children: d.map(W => ne.jsx("option", {
                                value: W,
                                children: W.charAt(0).toUpperCase() + W.slice(1)
                            }, W))
                        })]
                    }), f === "pixelate" && i.pixelationFactor && he("pixelationFactor", _, !0), f === "ascii" && i.asciiCharSize && he("asciiCharSize", v, !0), ne.jsxs("div", {
                        className: Qe.controlGroup,
                        children: [ne.jsx("label", {
                            htmlFor: "globalColorMode",
                            children: "Global Color:"
                        }), ne.jsxs("div", {
                            className: Qe.inlineGroup,
                            children: [ne.jsx("select", {
                                id: "globalColorMode",
                                name: "globalColorMode",
                                value: p,
                                onChange: Z,
                                disabled: r,
                                style: {
                                    flexGrow: 1,
                                    marginRight: "10px"
                                },
                                title: cn.globalColorMode,
                                children: g.map(W => {
                                    const ge = W0.includes(W),
                                        X = r || ge && !B;
                                    return ne.jsxs("option", {
                                        value: W,
                                        disabled: X,
                                        style: X ? {
                                            fontStyle: "italic",
                                            color: "#aaa"
                                        } : {},
                                        children: [W.charAt(0).toUpperCase() + W.slice(1), ge ? " (A)" : ""]
                                    }, W)
                                })
                            }), ne.jsxs("div", {
                                id: "force-global-color-wrapper",
                                className: Qe.checkboxLabelInline,
                                title: cn.forceGlobalColor,
                                children: [ne.jsx("input", {
                                    type: "checkbox",
                                    id: "forceGlobalColorCheckbox",
                                    name: "forceGlobalColor",
                                    checked: m,
                                    onChange: Z,
                                    disabled: r
                                }), ne.jsx("label", {
                                    htmlFor: "forceGlobalColorCheckbox",
                                    children: "Force All"
                                })]
                            })]
                        })]
                    }), he("feedbackMix", ae.feedbackMix, !0), he("globalTimeScale", ae.globalTimeScale, !0), he("globalDistortionScale", ae.globalDistortionScale, !0), he("uvScale", ae.uvScale, !0), he("blendSpeedFactor", l, !0), i.globalAudioSensitivity && he("globalAudioSensitivity", ae.globalAudioSensitivity, !0)]
                })]
            })]
        }), " "]
    })
}

export default memo(Controls);
