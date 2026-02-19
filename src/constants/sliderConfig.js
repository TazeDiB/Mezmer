/**
 * Slider/param config and mode constants (extracted from legacy bundle).
 */
export const SLIDER_CONFIG = {
        symmetry: {
            label: "Symmetry",
            min: 1,
            max: 12,
            step: .01,
            format: t => t.toFixed(2)
        },
        distortion: {
            label: "Distortion",
            min: 0,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        blendAmount: {
            label: "Blend Amount",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        spiralSpeed: {
            label: "Spiral Speed",
            min: -2,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        circleSpeed: {
            label: "Circle Speed",
            min: -2,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        circlePulseFreq: {
            label: "Circle Pulse Freq",
            min: .1,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        layer2Freq: {
            label: "Grid Freq",
            min: 1,
            max: 50,
            step: .01,
            format: t => t.toFixed(1)
        },
        layer2RotSpeed: {
            label: "Grid Speed",
            min: -2,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        gridWaveAmount: {
            label: "Grid Wave Amount",
            min: 0,
            max: .2,
            step: .001,
            format: t => t.toFixed(3)
        },
        dotDensity: {
            label: "Dot Density",
            min: 1,
            max: 30,
            step: .01,
            format: t => t.toFixed(1)
        },
        dotSize: {
            label: "Dot Size",
            min: .01,
            max: .5,
            step: .005,
            format: t => t.toFixed(3)
        },
        dotPulseSpeed: {
            label: "Dot Pulse Speed",
            min: -5,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        dotPulseAmount: {
            label: "Dot Pulse Amount",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        lineSpacing: {
            label: "Line Spacing",
            min: .01,
            max: .5,
            step: .001,
            format: t => t.toFixed(3)
        },
        lineAngle: {
            label: "Line Angle",
            min: 0,
            max: Math.PI * 2,
            step: .01,
            format: t => `${(t*180/Math.PI).toFixed(0)}°`
        },
        lineUndulationSpeed: {
            label: "Line Undulation Speed",
            min: -5,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        lineUndulationAmount: {
            label: "Line Undulation Amount",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        feedbackMix: {
            label: "Feedback Mix",
            min: .8,
            max: .99,
            step: .01,
            format: t => t.toFixed(2)
        },
        globalTimeScale: {
            label: "Global Time Scale",
            min: .4,
            max: 3,
            step: .01,
            format: t => t.toFixed(2)
        },
        globalDistortionScale: {
            label: "Global Distortion",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        layerSymmetryOffsetSpeed: {
            label: "Symmetry Rotate Speed",
            min: -.5,
            max: .5,
            step: .01,
            format: t => t.toFixed(2)
        },
        uvScale: {
            label: "Global Zoom",
            min: .5,
            max: 1.7,
            step: .01,
            format: t => t.toFixed(2)
        },
        globalAudioSensitivity: {
            label: "Global Audio Sensitivity",
            min: 0,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        blendSpeedFactor: {
            label: "Blend Speed Factor",
            min: .1,
            max: 4,
            step: .01,
            format: t => `${t.toFixed(2)}x`
        },
        pixelationFactor: {
            label: "Pixelation",
            min: 4,
            max: 10,
            step: .01,
            format: t => typeof t == "number" ? t.toFixed(0) : "--"
        },
        kaleidoReflections: {
            label: "Kaleido Reflections",
            min: 1,
            max: 16,
            step: .01,
            format: t => t.toFixed(0)
        },
        kaleidoSpeed: {
            label: "Kaleido Speed",
            min: -1,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        voronoiDensity: {
            label: "Voronoi Density",
            min: 1,
            max: 20,
            step: .01,
            format: t => t.toFixed(1)
        },
        voronoiSpeed: {
            label: "Voronoi Speed",
            min: 0,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        voronoiEdgeThickness: {
            label: "Voronoi Thickness",
            min: .01,
            max: .5,
            step: .005,
            format: t => t.toFixed(3)
        },
        curlScale: {
            label: "Curl Scale",
            min: .5,
            max: 15,
            step: .01,
            format: t => t.toFixed(1)
        },
        curlSpeed: {
            label: "Curl Speed",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        curlThickness: {
            label: "Curl Thickness",
            min: .01,
            max: .2,
            step: .001,
            format: t => t.toFixed(3)
        },
        metaballThreshold: {
            label: "Metaball Threshold",
            min: .1,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        weaveThickness: {
            label: "Weave Thickness",
            min: .005,
            max: .1,
            step: .001,
            format: t => t.toFixed(3)
        },
        lissajousFreqX: {
            label: "Lissajous Freq X",
            min: 1,
            max: 10,
            step: .01,
            format: t => t.toFixed(1)
        },
        lissajousFreqY: {
            label: "Lissajous Freq Y",
            min: 1,
            max: 10,
            step: .01,
            format: t => t.toFixed(1)
        },
        lissajousSpeed: {
            label: "Lissajous Speed",
            min: -1,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        lissajousThickness: {
            label: "Lissajous Thickness",
            min: .005,
            max: .1,
            step: .001,
            format: t => t.toFixed(3)
        },
        turingScale: {
            label: "Turing Scale",
            min: 1,
            max: 30,
            step: .01,
            format: t => t.toFixed(1)
        },
        turingSpeed: {
            label: "Turing Speed",
            min: 0,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        turingFeed: {
            label: "Turing Feed (F)",
            min: .01,
            max: .1,
            step: .001,
            format: t => t.toFixed(3)
        },
        turingKill: {
            label: "Turing Kill (k)",
            min: .04,
            max: .07,
            step: .001,
            format: t => t.toFixed(3)
        },
        turingDiffusionA: {
            label: "Turing Diffusion A",
            min: .5,
            max: 1.5,
            step: .01,
            format: t => t.toFixed(2)
        },
        turingDiffusionB: {
            label: "Turing Diffusion B",
            min: .2,
            max: .8,
            step: .01,
            format: t => t.toFixed(2)
        },
        phyloDensity: {
            label: "Phylo Density",
            min: 10,
            max: 200,
            step: .01,
            format: t => t.toFixed(0)
        },
        phyloScale: {
            label: "Phylo Scale",
            min: .01,
            max: .5,
            step: .005,
            format: t => t.toFixed(3)
        },
        phyloSpeed: {
            label: "Phylo Speed",
            min: -1,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        fractalIterations: {
            label: "Fractal Iterations",
            min: 1,
            max: 8,
            step: .01,
            format: t => t.toFixed(0)
        },
        fractalAngle: {
            label: "Fractal Angle",
            min: 0,
            max: Math.PI,
            step: .01,
            format: t => `${(t*180/Math.PI).toFixed(0)}°`
        },
        fractalSpeed: {
            label: "Fractal Speed",
            min: -1,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        fractalThickness: {
            label: "Fractal Thickness",
            min: .005,
            max: .1,
            step: .001,
            format: t => t.toFixed(3)
        },
        rainbowAnimationSpeed: {
            label: "Rainbow Speed",
            min: -.5,
            max: .5,
            step: .005,
            format: t => t.toFixed(3)
        },
        flowComplexity: {
            label: "Flow Complexity",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        flowCurl: {
            label: "Flow Curl",
            min: 0,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        cubeRotationSpeed: {
            label: "Cube Speed",
            min: -2,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        cubeSize: {
            label: "Cube Size",
            min: .1,
            max: 1.5,
            step: .01,
            format: t => t.toFixed(2)
        },
        audioSensitivity: {
            label: "Audio Sensitivity",
            min: .75,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        bassSensitivity: {
            label: "Bass Sensitivity",
            min: .75,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        midSensitivity: {
            label: "Mid Sensitivity",
            min: .75,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        highSensitivity: {
            label: "High Sensitivity",
            min: .75,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        voronoiScale: {
            label: "Voronoi Scale",
            min: 1,
            max: 15,
            step: .01,
            format: t => t.toFixed(1)
        },
        voronoiEdgeWidth: {
            label: "Voronoi Edge Width",
            min: .005,
            max: .1,
            step: .001,
            format: t => t.toFixed(3)
        },
        spiralArms: {
            label: "Spiral Arms",
            min: 1,
            max: 12,
            step: .01,
            format: t => t.toFixed(0)
        },
        spiralTightness: {
            label: "Spiral Tightness",
            min: .1,
            max: 2,
            step: .01,
            format: t => t.toFixed(2)
        },
        spiralNoiseScale: {
            label: "Spiral Noise Scale",
            min: 0,
            max: 5,
            step: .01,
            format: t => t.toFixed(2)
        },
        spiralNoiseSpeed: {
            label: "Spiral Noise Speed",
            min: -1,
            max: 1,
            step: .01,
            format: t => t.toFixed(2)
        },
        autoRandomizeInterval: {
            label: "Auto Rand. Interval (Measures)",
            min: 1,
            max: 32,
            step: .01,
            format: t => t.toFixed(0)
        },
        autoRandomizeTimeInterval: {
            label: "Auto Rand. Interval (Seconds)",
            min: 1,
            max: 60,
            step: .01,
            format: t => `${t.toFixed(1)}s`
        },
        asciiCharSize: {
            label: "ASCII Size",
            min: 5,
            max: 24,
            step: 1,
            format: t => t.toFixed(0)
        }
};

export const PATTERN_TYPES_LIST = ["invisible", "wovenGrid", "hyperTuring", "hyperVoronoi", "spiralArms", "reactionDiff", "hyperFlow", "cubeGrid"];
export const PATTERN_TYPE_OPTIONS_LIST = ["invisible", ...PATTERN_TYPES_LIST.filter(t => t !== "invisible")];
export const GLOBAL_PARAM_KEYS = ["feedbackMix", "globalTimeScale", "globalDistortionScale", "uvScale", "globalAudioSensitivity", "blendSpeedFactor", "pixelationFactor", "rainbowAnimationSpeed", "asciiCharSize"];
export const VISUAL_MODES = ["normal", "glow", "edgeDetect", "pixelate", "moire", "cartoon", "hashGrid", "ascii"];
export const VISUAL_MODE_INDEX = {
    normal: 0,
    glow: 1,
    edgeDetect: 2,
    pixelate: 3,
    moire: 4,
    cartoon: 5,
    hashGrid: 6,
    ascii: 7,
    stainedGlass: 8
};
export const COLOR_MODES = ["rainbow", "fire", "ice", "monochrome", "audioRGB", "spectrum", "reactivePulse", "velocity"];
export const AUDIO_COLOR_MODES_LIST = ["audioRGB", "spectrum", "reactivePulse"];
