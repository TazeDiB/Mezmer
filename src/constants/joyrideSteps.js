/**
 * Joyride tour steps and tooltip copy for the controls panel.
 */

export const JOYRIDE_STEPS = [
  { target: 'body', content: "Welcome to Mezmer! This panel controls the visualization. Let's walk through the basics.", placement: 'center', disableBeacon: true },
  { target: '#fieldset-layer', content: 'This section controls individual layers. You can have up to 4 layers, each with its own pattern and color.', placement: 'left-start' },
  { target: '#layer-selector-buttons', content: 'Click these buttons (L1-L4) to select the layer you want to edit.', placement: 'bottom' },
  { target: '#patternType', content: 'Choose the mathematical pattern for the currently selected layer here.', placement: 'left' },
  { target: '#layerColorMode', content: 'Select the coloring method for this layer. Some modes react to audio!', placement: 'left' },
  { target: '#slider-n', content: 'Most patterns have sliders like this. "n" controls symmetry. Try changing it!', placement: 'left' },
  { target: '#fieldset-global', content: 'These settings affect the entire visualization, like zoom, speed, and overall effects.', placement: 'left' },
  { target: '#visualModeSelect', content: 'Try changing the main visual style, like "Pixelate" or "ASCII".', placement: 'left' },
  { target: '#slider-uvScale', content: 'This slider controls the overall zoom level.', placement: 'left' },
  { target: '#fieldset-audio', content: 'Load an audio file or capture desktop audio (if using Electron) here to enable audio-reactive modes.', placement: 'left' },
  { target: '#fieldset-randomization', content: 'Use this section to randomize parameters for creative exploration, either manually or automatically.', placement: 'left' },
  { target: '#button-randomizeAll', content: "Click this to instantly generate a new random look! You can configure what gets randomized below it.", placement: 'left' },
  { target: '#controls-container', content: "That's the basics! Experiment with the controls and hover over them for tooltips.", placement: 'center' },
];

export const TOOLTIP_COPY = {
  audioFileInput: 'Load an audio file (e.g., MP3, WAV) to drive audio-reactive visualizations.',
  toggleAudioPlay: 'Play or pause the loaded audio file.',
  getDesktopSources: '(Electron only) Scan for available audio output sources on your system (e.g., speakers, virtual cables).',
  desktopSourceSelect: '(Electron only) Choose the system audio source to capture for audio reactivity.',
  toggleDesktopCapture: '(Electron only) Start or stop capturing audio from the selected desktop source.',
  randomizeAll: 'Generate new random parameters for all layers. Options below control which parameter types are included.',
  randomizeGlobals: 'Include global settings (like zoom, timescale, distortion) in the randomization process.',
  randomizeColorModes: 'Include layer-specific and global color modes in the randomization process.',
  randomizeVisualMode: 'Include the main visual mode (e.g., default, pixelate, ascii) in the randomization process.',
  autoRandomizeEnable: 'Automatically randomize parameters at a set interval.',
  autoRandomizeMode: 'Choose the trigger for auto-randomization: BPM Sync (requires audio analysis) or a fixed Time Interval.',
  autoRandomizeInterval: 'Set the auto-randomization interval in musical measures (based on detected BPM if available).',
  autoRandomizeTimeInterval: 'Set the auto-randomization interval in seconds.',
  layerSelector: 'Select which layer\'s parameters (L1-L4) are currently being edited below.',
  patternType: 'Choose the base pattern algorithm for the selected layer.',
  layerColorMode: 'Select the color generation method for this specific layer. Disabled if \'Force All\' is checked in Global Settings.',
  n: 'Symmetry level: Determines the number of rotational repetitions in the pattern (e.g., 3 for 3-fold symmetry).',
  radius: 'Primary radius: Controls the size or extent of the main pattern elements.',
  thickness: 'Pattern thickness: Adjusts the line width or feature size of the pattern.',
  distortion: 'Distortion amount: Controls the intensity of spatial warping or perturbation applied to the pattern.',
  timeScale: 'Animation speed: Modifies the rate at which time-dependent elements of the pattern evolve.',
  audioSensitivity: 'Audio reactivity strength: How strongly the pattern reacts to the audio input (requires an audio-reactive color mode).',
  blendAmount: 'Layer opacity: Controls the visibility of this layer (0 = invisible, 1 = fully visible).',
  visualMode: 'Select the primary rendering style (e.g., Default WebGL, Pixelated, ASCII Art).',
  pixelationFactor: '(Pixelate Mode only) Controls the size of the pixel blocks.',
  asciiCharSize: '(ASCII Mode only) Controls the size of the characters used for rendering.',
  globalColorMode: 'Select the default color mode applied to layers unless overridden and \'Force All\' is unchecked.',
  forceGlobalColor: 'Apply the selected Global Color mode to all layers, overriding individual layer settings.',
  feedbackMix: 'Feedback amount: Controls how much of the previous frame is blended into the current one, creating trails and echoes.',
  globalTimeScale: 'Master animation speed: Multiplies the time scale of all layers.',
  globalDistortionScale: 'Master distortion amount: Multiplies the distortion effect of all layers.',
  uvScale: 'Global zoom: Adjusts the overall scale (zoom level) of the entire visualization.',
  blendSpeedFactor: 'Transition speed: Controls how quickly parameters change during randomization or manual adjustments.',
  globalAudioSensitivity: 'Master audio sensitivity: Multiplies the audio sensitivity of all layers using audio-reactive color modes.',
  default: 'Parameter control.',
};

/** Audio-reactive color mode names used in the tour */
export const AUDIO_REACTIVE_COLOR_MODES = ['audioRGB', 'spectrum', 'reactivePulse'];
