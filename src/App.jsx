/**
 * App root: layout, WebGL canvas, controls panel, welcome/tour modal.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { EVENTS, STATUS, ACTIONS } from 'react-joyride';
import { useAudio } from './hooks/useAudio.js';
import { useAppParams } from './hooks/useAppParams.js';
import { useRandomization } from './hooks/useRandomization.js';
import { usePresetShare } from './hooks/usePresetShare.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useDesktopCapture } from './hooks/useDesktopCapture.js';
import Controls from './components/Controls.jsx';
import WebGLCanvas from './components/WebGLCanvas.jsx';
import {
  SLIDER_CONFIG,
  PATTERN_TYPES,
  VISUAL_MODES,
  COLOR_MODES,
} from './constants/sliderConfig.js';
import { APP_STYLES } from './constants/controlStyles.js';
import { isElectron } from './lib/utils.js';

function App() {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [blendSpeedFactor, setBlendSpeedFactor] = useState(1);
  const [threeDEnabled, setThreeDEnabled] = useState(false);
  const [stressTestMode, setStressTestMode] = useState('off');
  const [showFpsCounter, setShowFpsCounter] = useState(false);
  const [vsyncEnabled, setVsyncEnabled] = useState(true);
  const [fps, setFps] = useState(0);
  const [captureStream, setCaptureStream] = useState(null);
  const isRandomizingRef = useRef(false);
  const audioTextureRef = useRef(null);

  const {
    activeLayer,
    setActiveLayer,
    params,
    setParams,
    paramsRef,
    manualBlendProgress,
    visualMode,
    setVisualMode,
    globalColorMode,
    setGlobalColorMode,
    forceGlobalColor,
    setForceGlobalColor,
    globalColorModeRef,
    forceGlobalColorRef,
    patternNameToIndex,
    patternParameterMap,
    getRelevantParamsForPattern,
    handleParamChange,
    handleMouseWheel,
    handleCanvasPointerDown,
    applyPresetToState,
    resetAudioReactiveColorModes,
  } = useAppParams({ isRandomizingRef, blendSpeedFactor });

  const {
    audioData,
    loadAudio,
    togglePlay,
    isPlaying,
    isBassPresent,
    isDrumsPresent,
    audioElementRef,
    estimatedBpm,
    drumOnsetDetected,
  } = useAudio(audioTextureRef, 256, captureStream);

  const {
    desktopSources,
    selectedSourceId,
    setSelectedSourceId,
    isCapturing,
    captureError,
    fetchDesktopSources,
    startCapture,
    stopCapture,
  } = useDesktopCapture({
    audioElementRef,
    togglePlay,
    isPlaying,
    setCaptureStream,
  });

  const {
    isRandomizing,
    handleRandomize,
    randomizeGlobals,
    setRandomizeGlobals,
    randomizeColorModes,
    setRandomizeColorModes,
    randomizeVisualMode,
    setRandomizeVisualMode,
    activeTheme,
    setActiveTheme,
    autoRandomizeEnabled,
    setAutoRandomizeEnabled,
    autoRandomizeBeatCount,
    setAutoRandomizeBeatCount,
    autoRandomizeMode,
    setAutoRandomizeMode,
    autoRandomizeTimeInterval,
    setAutoRandomizeTimeInterval,
  } = useRandomization({
    paramsRef,
    setParams,
    visualMode,
    setVisualMode,
    setGlobalColorMode,
    setForceGlobalColor,
    globalColorModeRef,
    forceGlobalColorRef,
    blendSpeedFactor,
    manualBlendProgress,
    isPlaying,
    isCapturing,
    estimatedBpm,
    isBassPresent,
    isDrumsPresent,
  });

  isRandomizingRef.current = isRandomizing;

  const {
    presetCode,
    setPresetCode,
    handleCopyPreset,
    handleLoadPreset,
    handleLoadFromUrl,
  } = usePresetShare({
    params,
    visualMode,
    globalColorMode,
    forceGlobalColor,
    applyPresetToState,
  });

  const toggleControls = useCallback(() => {
    setControlsVisible((visible) => !visible);
  }, []);

  const handleLayerSelect = useCallback(
    (layerKey) => {
      setActiveLayer(layerKey);
    },
    [setActiveLayer]
  );

  const toggleThreeD = useCallback(() => {
    setThreeDEnabled((enabled) => {
      const next = !enabled;
      if (next) setStressTestMode('off');
      return next;
    });
  }, []);

  const handleStressTestModeChange = useCallback((mode) => {
    setStressTestMode(mode);
    if (mode !== 'off') setThreeDEnabled(false);
  }, []);

  const handleFpsUpdate = useCallback((nextFps) => {
    setFps(nextFps);
  }, []);

  useKeyboardShortcuts({
    onLayerSelect: handleLayerSelect,
    onToggleControls: toggleControls,
    onToggleThreeD: toggleThreeD,
  });

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (isCapturing) stopCapture();
      const url = URL.createObjectURL(file);
      const audioEl = audioElementRef?.current;
      if (audioEl?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(audioEl.src);
      }
      loadAudio(url);
    },
    [loadAudio, audioElementRef, isCapturing, stopCapture]
  );

  useEffect(() => {
    resetAudioReactiveColorModes(isPlaying || isCapturing);
  }, [isPlaying, isCapturing, resetAudioReactiveColorModes]);

  const handleBlendMaterialReady = useCallback((materialRef) => {
    if (materialRef?.current) {
      // Blend material ref forwarded from WebGLCanvas
    }
  }, []);

  const handleShaderMaterialReady = useCallback((materialRef) => {
    if (materialRef?.current) {
      // Shader material ref forwarded from WebGLCanvas
    }
  }, []);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);

  useEffect(() => {
    const skipped = localStorage.getItem('tutorialSkipped') === 'true';
    const completed = localStorage.getItem('tutorialCompleted') === 'true';
    if (!skipped && !completed) setShowWelcomeModal(true);
  }, []);

  const handleStartTutorial = useCallback(() => {
    setShowWelcomeModal(false);
    setRunTutorial(true);
  }, []);

  const handleSkipTutorial = useCallback(() => {
    setShowWelcomeModal(false);
    setRunTutorial(false);
    localStorage.setItem('tutorialSkipped', 'true');
  }, []);

  const handleJoyrideCallback = useCallback((data) => {
    const { action, status, type } = data;
    if ([EVENTS.TOUR_END, EVENTS.STEP_AFTER].includes(type)) {
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunTutorial(false);
        localStorage.setItem(
          status === STATUS.FINISHED ? 'tutorialCompleted' : 'tutorialSkipped',
          'true'
        );
      }
    } else if ([EVENTS.TOOLTIP_CLOSE].includes(type) && action === ACTIONS.CLOSE) {
      setRunTutorial(false);
      localStorage.setItem('tutorialSkipped', 'true');
    }
  }, []);

  useEffect(
    () => () => {
      captureStream?.getTracks().forEach((track) => track.stop());
    },
    [captureStream]
  );

  return jsxs('div', {
    className: APP_STYLES.appContainer,
    children: [
      showWelcomeModal &&
        jsx('div', {
          className: APP_STYLES.welcomeModalOverlay,
          children: jsxs('div', {
            className: APP_STYLES.welcomeModalContent,
            children: [
              jsx('h2', { children: 'Welcome to Mezmer!' }),
              jsx('p', { children: 'Would you like a quick tour of the controls?' }),
              jsxs('div', {
                className: APP_STYLES.welcomeModalButtons,
                children: [
                  jsx('button', {
                    onClick: handleStartTutorial,
                    className: APP_STYLES.welcomeButtonPrimary,
                    children: 'Start Tutorial',
                  }),
                  jsx('button', {
                    onClick: handleSkipTutorial,
                    className: APP_STYLES.welcomeButtonSecondary,
                    children: 'Skip',
                  }),
                ],
              }),
            ],
          }),
        }),
      jsx(WebGLCanvas, {
        params,
        audioData,
        blendSpeedFactor,
        visualMode,
        pixelationFactor: params.pixelationFactor,
        asciiCharSize: params.asciiCharSize,
        globalColorMode,
        forceGlobalColor,
        patternNameToIndex,
        isRandomizing,
        audioTextureRef,
        estimatedBpm,
        isBassPresent,
        isDrumsPresent,
        onBlendMaterialReady: handleBlendMaterialReady,
        onShaderMaterialReady: handleShaderMaterialReady,
        drumOnsetDetected,
        threeDEnabled,
        stressTestMode,
        showFpsCounter,
        vsyncEnabled,
        fps,
        onFpsUpdate: handleFpsUpdate,
        onMouseWheel: handleMouseWheel,
        onCanvasPointerDown: handleCanvasPointerDown,
      }),
      jsx('audio', {
        ref: audioElementRef,
        style: { display: 'none' },
        crossOrigin: 'anonymous',
      }),
      jsx('button', {
        onClick: toggleControls,
        className: APP_STYLES.toggleButton,
        'aria-label': controlsVisible ? 'Hide Controls' : 'Show Controls',
        children: controlsVisible ? '✖' : '☰',
      }),
      controlsVisible &&
        jsx(Controls, {
          params,
          pixelationFactor: params.pixelationFactor,
          asciiCharSize: params.asciiCharSize,
          manualBlendProgress,
          getRelevantParamsForPattern,
          paramConfigs: SLIDER_CONFIG,
          patternParameterMap,
          onParamChange: handleParamChange,
          activeLayer,
          onLayerSelect: handleLayerSelect,
          onRandomize: handleRandomize,
          isRandomizing,
          activeTheme,
          setActiveTheme,
          onCopyPreset: handleCopyPreset,
          onLoadPreset: handleLoadPreset,
          presetCode,
          setPresetCode,
          onLoadFromUrl: handleLoadFromUrl,
          threeDEnabled,
          setThreeDEnabled,
          stressTestMode,
          setStressTestMode: handleStressTestModeChange,
          showFpsCounter,
          setShowFpsCounter,
          vsyncEnabled,
          setVsyncEnabled,
          patternTypes: PATTERN_TYPES,
          onFileChange: handleFileChange,
          onTogglePlay: togglePlay,
          isPlaying,
          visualMode,
          visualModes: VISUAL_MODES,
          setVisualMode,
          globalColorMode,
          setGlobalColorMode,
          colorModes: COLOR_MODES,
          forceGlobalColor,
          setForceGlobalColor,
          randomizeGlobals,
          setRandomizeGlobals,
          blendSpeedFactor,
          setBlendSpeedFactor,
          randomizeColorModes,
          setRandomizeColorModes,
          randomizeVisualMode,
          setRandomizeVisualMode,
          autoRandomizeEnabled,
          setAutoRandomizeEnabled,
          autoRandomizeInterval: autoRandomizeBeatCount,
          setAutoRandomizeInterval: setAutoRandomizeBeatCount,
          autoRandomizeMode,
          setAutoRandomizeMode,
          autoRandomizeTimeInterval,
          setAutoRandomizeTimeInterval,
          isElectron,
          desktopSources,
          selectedSourceId,
          onSourceSelected: setSelectedSourceId,
          onSourceSelect: setSelectedSourceId,
          setSelectedSourceId,
          onStartCapture: startCapture,
          onStopCapture: stopCapture,
          onGetSources: fetchDesktopSources,
          isCapturing,
          captureError,
          audioElementRef,
          runTutorial,
          handleJoyrideCallback,
        }),
    ],
  });
}

export default App;
