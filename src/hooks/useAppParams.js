/**
 * Shader params, active layer, param changes, and layer/visual-mode transitions.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  SLIDER_CONFIG,
  GLOBAL_PARAM_KEYS,
  MOUSE_PARAM_KEYS,
  MOUSE_RANDOM_PARAM_KEYS,
  THREE_D_PARAM_KEYS,
  VISUAL_MODE_INDEX,
  AUDIO_COLOR_MODES_LIST,
} from '../constants/sliderConfig.js';
import { PARAM_CONFIG as patternParamConfig } from '../constants/index.js';
import { lerp, randomInRange } from '../lib/utils.js';
import { getStartupState } from '../lib/startupState.js';
import { PATTERN_TYPES } from '../constants/patternTypes.js';

const LAYER_BLEND_BASE_MS = 1000;
const SYMMETRY_LERP_BASE_MS = 250;
const VISUAL_MODE_BLEND_BASE_MS = 2500;

export function useAppParams({ isRandomizingRef, blendSpeedFactor }) {
  const [activeLayer, setActiveLayer] = useState('layer1');
  const [params, setParams] = useState(() => getStartupState().params);
  const paramsRef = useRef(params);
  const [manualBlendProgress, setManualBlendProgress] = useState({
    layer1: null,
    layer2: null,
    layer3: null,
    layer4: null,
  });
  const manualBlendProgressRef = useRef(manualBlendProgress);
  const layerPatternRafRef = useRef();
  const visualModeRafRef = useRef();

  const [visualMode, setVisualMode] = useState(() => getStartupState().visualMode);
  const [globalColorMode, setGlobalColorMode] = useState(() => getStartupState().globalColorMode);
  const [forceGlobalColor, setForceGlobalColor] = useState(() => getStartupState().forceGlobalColor);
  const [visualModeTransition, setVisualModeTransition] = useState(null);

  const visualModeRef = useRef(visualMode);
  const globalColorModeRef = useRef(globalColorMode);
  const forceGlobalColorRef = useRef(forceGlobalColor);
  const blendSpeedFactorRef = useRef(blendSpeedFactor);
  const mouseParamAnimRef = useRef(null);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    manualBlendProgressRef.current = manualBlendProgress;
  }, [manualBlendProgress]);

  useEffect(() => {
    visualModeRef.current = visualMode;
    globalColorModeRef.current = globalColorMode;
    forceGlobalColorRef.current = forceGlobalColor;
    blendSpeedFactorRef.current = blendSpeedFactor;
  }, [visualMode, globalColorMode, forceGlobalColor, blendSpeedFactor]);

  const patternNameToIndex = useMemo(
    () => PATTERN_TYPES.reduce((acc, name, index) => ({ ...acc, [name]: index }), {}),
    []
  );

  const patternParameterMap = useMemo(
    () => ({
      ...patternParamConfig,
      _audioParams: ['audioSensitivity', 'bassSensitivity', 'midSensitivity', 'highSensitivity'],
    }),
    []
  );

  const getRelevantParamsForPattern = useCallback(
    (patternType) => {
      const keys = patternParameterMap[patternType] || [];
      const audioKeys =
        patternType !== 'invisible' && patternParameterMap._audioParams
          ? patternParameterMap._audioParams
          : [];
      return [...new Set([...keys, ...audioKeys])];
    },
    [patternParameterMap]
  );

  const updateManualBlendProgress = useCallback((updater) => {
    setManualBlendProgress((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      manualBlendProgressRef.current = next;
      return next;
    });
  }, []);

  const queueLayerPatternTransition = useCallback((layerKey, toPattern) => {
    const layer = paramsRef.current[layerKey];
    const currentPattern = layer?.patternType;
    const activeTransition = manualBlendProgressRef.current[layerKey];
    if (!activeTransition && toPattern) {
      const transition = {
        kind: 'pattern',
        phase: 'blend',
        startTime: performance.now(),
        fromPattern: currentPattern,
        toPattern,
        fromSymmetry: layer?.symmetry ?? 1,
        toSymmetry: layer?.symmetry ?? 1,
        fromColorMode: layer?.colorMode ?? 'rainbow',
        toColorMode: layer?.colorMode ?? 'rainbow',
      };
      updateManualBlendProgress((prev) => ({
        ...prev,
        [layerKey]: transition,
      }));
    }
  }, [updateManualBlendProgress]);

  const queueSymmetryTransition = useCallback((layerKey, toSymmetry) => {
    const layer = paramsRef.current[layerKey];
    const activeTransition = manualBlendProgressRef.current[layerKey];
    if (!activeTransition) {
      const transition = {
        kind: 'symmetry',
        phase: 'blend',
        startTime: performance.now(),
        fromSymmetry: layer?.symmetry ?? 1,
        toSymmetry,
      };
      updateManualBlendProgress((prev) => ({
        ...prev,
        [layerKey]: transition,
      }));
    }
  }, [updateManualBlendProgress]);

  const handleParamChange = useCallback(
    (key, value, inputType) => {
      const currentParams = paramsRef.current;
      if (isRandomizingRef?.current && key !== 'visualMode') return;
      if (key === 'blendAmount' && manualBlendProgressRef.current[activeLayer]) return;

      if (key === 'globalColorMode') {
        setGlobalColorMode(value);
        return;
      }
      if (key === 'forceGlobalColor') {
        setForceGlobalColor(value);
        return;
      }

      if (key === 'visualMode') {
        const nextMode = value;
        const prevMode = visualModeRef.current;
        if (nextMode === prevMode) return;
        const fromIndex = VISUAL_MODE_INDEX[prevMode] ?? 0;
        const toIndex = VISUAL_MODE_INDEX[nextMode] ?? 0;
        if (fromIndex === toIndex) return;

        let patch = {
          visualModeFromIndex: fromIndex,
          visualModeToIndex: toIndex,
          visualModeBlend: 0,
        };
        if (nextMode === 'pixelate') {
          const cfg = SLIDER_CONFIG.pixelationFactor;
          const current = paramsRef.current.pixelationFactor;
          if (typeof current !== 'number' || current < cfg.min || current > cfg.max) {
            patch.pixelationFactor = cfg.min;
          }
        } else if (nextMode === 'ascii') {
          const cfg = SLIDER_CONFIG.asciiCharSize;
          const current = paramsRef.current.asciiCharSize;
          if (typeof current !== 'number' || current < cfg.min || current > cfg.max) {
            patch.asciiCharSize = cfg.min;
          }
        }
        setParams((prev) => ({ ...prev, ...patch }));
        setVisualMode(nextMode);
        setVisualModeTransition({ startTime: performance.now() });
        return;
      }

      if (GLOBAL_PARAM_KEYS.includes(key) || MOUSE_PARAM_KEYS.includes(key) || THREE_D_PARAM_KEYS.includes(key)) {
        setParams((prev) => ({ ...prev, [key]: parseFloat(value) }));
        return;
      }

      if (key === 'patternDisplacementEnabled') {
        setParams((prev) => ({ ...prev, [key]: !!value }));
        return;
      }

      let parsedValue;
      if (inputType === 'checkbox') {
        parsedValue = value;
      } else if (key === 'patternType' || key === 'blendTargetType' || key === 'colorMode') {
        parsedValue = value;
        if (key === 'patternType') {
          const fromPattern = currentParams[activeLayer].patternType;
          const toPattern = value;
          if (toPattern !== fromPattern && !manualBlendProgressRef.current[activeLayer]) {
            setParams((prev) => ({
              ...prev,
              [activeLayer]: {
                ...prev[activeLayer],
                blendTargetType: toPattern,
                blendTargetColorMode: prev[activeLayer].colorMode,
              },
            }));
            requestAnimationFrame(() => queueLayerPatternTransition(activeLayer, toPattern));
            return;
          }
        }
      } else if (key === 'symmetry') {
        parsedValue = parseFloat(value);
        const currentSymmetry = currentParams[activeLayer]?.symmetry ?? 1;
        if (parsedValue !== currentSymmetry && !manualBlendProgressRef.current[activeLayer]) {
          queueSymmetryTransition(activeLayer, parsedValue);
          return;
        }
      } else {
        parsedValue = parseFloat(value);
      }

      setParams((prev) => ({
        ...prev,
        [activeLayer]: { ...prev[activeLayer], [key]: parsedValue },
      }));
    },
    [activeLayer, isRandomizingRef, queueLayerPatternTransition, queueSymmetryTransition]
  );

  useEffect(() => {
    const activeLayers = Object.entries(manualBlendProgress)
      .filter(([, transition]) => transition !== null)
      .map(([layerKey]) => layerKey);

    if (activeLayers.length === 0) {
      cancelAnimationFrame(layerPatternRafRef.current);
      return;
    }

    let running = true;
    const tick = (now) => {
      if (!running) return;

      let needsNextFrame = false;
      const layerPatches = {};
      const commitLayers = [];
      const clearedLayers = {};
      let hasClears = false;

      Object.entries(manualBlendProgressRef.current).forEach(([layerKey, transition]) => {
        if (!transition) return;

        const isSymmetryOnly = transition.kind === 'symmetry';
        const speed = blendSpeedFactorRef.current;
        const factor = typeof speed === 'number' && speed > 0 ? speed : 1;
        const baseMs = isSymmetryOnly ? SYMMETRY_LERP_BASE_MS : LAYER_BLEND_BASE_MS;
        const durationMs = Math.max(50, baseMs / factor);

        if (transition.phase === 'commit') {
          if (!isSymmetryOnly) {
            commitLayers.push({ layerKey, transition });
          }
          clearedLayers[layerKey] = null;
          hasClears = true;
          return;
        }

        const elapsed = now - transition.startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = progress * progress * (3 - 2 * progress);

        if (progress >= 1) {
          if (isSymmetryOnly) {
            layerPatches[layerKey] = { symmetry: transition.toSymmetry };
            clearedLayers[layerKey] = null;
            hasClears = true;
          } else {
            layerPatches[layerKey] = { blendAmount: 1 };
            manualBlendProgressRef.current = {
              ...manualBlendProgressRef.current,
              [layerKey]: { ...transition, phase: 'commit' },
            };
            needsNextFrame = true;
          }
        } else {
          if (isSymmetryOnly) {
            layerPatches[layerKey] = {
              symmetry: lerp(transition.fromSymmetry, transition.toSymmetry, eased),
            };
          } else {
            layerPatches[layerKey] = {
              blendAmount: eased,
              symmetry: lerp(transition.fromSymmetry, transition.toSymmetry, eased),
              colorMode: transition.fromColorMode,
              blendTargetColorMode: transition.toColorMode,
            };
          }
          needsNextFrame = true;
        }
      });

      if (Object.keys(layerPatches).length > 0) {
        setParams((prev) => {
          const next = { ...prev };
          Object.keys(layerPatches).forEach((layerKey) => {
            if (next[layerKey]) {
              next[layerKey] = { ...next[layerKey], ...layerPatches[layerKey] };
            }
          });
          return next;
        });
      }

      commitLayers.forEach(({ layerKey, transition }) => {
        setParams((prev) => {
          const layer = prev[layerKey];
          if (!layer) return prev;
          return {
            ...prev,
            [layerKey]: {
              ...layer,
              patternType: transition.toPattern,
              blendTargetType: 'invisible',
              blendAmount: 0,
              colorMode: transition.toColorMode,
              blendTargetColorMode: transition.toColorMode,
              symmetry: transition.toSymmetry,
            },
          };
        });
      });

      if (hasClears) {
        updateManualBlendProgress((prev) => {
          const next = { ...prev };
          Object.keys(clearedLayers).forEach((layerKey) => {
            next[layerKey] = clearedLayers[layerKey];
          });
          return next;
        });
      }

      if (needsNextFrame) {
        layerPatternRafRef.current = requestAnimationFrame(tick);
      } else {
        running = false;
        cancelAnimationFrame(layerPatternRafRef.current);
      }
    };

    layerPatternRafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(layerPatternRafRef.current);
    };
  }, [manualBlendProgress, updateManualBlendProgress]);

  useEffect(() => {
    if (!visualModeTransition) {
      return;
    }

    const startTime = visualModeTransition.startTime;
    let running = true;

    const tick = (now) => {
      if (!running) return;

      const speed = blendSpeedFactorRef.current;
      const factor = typeof speed === 'number' && speed > 0 ? speed : 1;
      const durationMs = Math.max(50, VISUAL_MODE_BLEND_BASE_MS / factor);
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress);

      setParams((prev) => ({ ...prev, visualModeBlend: eased }));

      if (progress >= 1) {
        const activeIndex = VISUAL_MODE_INDEX[visualModeRef.current] ?? 0;
        setVisualModeTransition(null);
        running = false;
        setParams((prev) => ({
          ...prev,
          visualModeFromIndex: activeIndex,
          visualModeToIndex: activeIndex,
          visualModeBlend: 0,
        }));
      } else {
        visualModeRafRef.current = requestAnimationFrame(tick);
      }
    };

    visualModeRafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(visualModeRafRef.current);
    };
  }, [visualModeTransition]);

  const handleMouseWheel = useCallback((event) => {
    event.preventDefault();
    const cfg = SLIDER_CONFIG.mouseRadius;
    if (!cfg) return;
    const current = paramsRef.current.mouseRadius ?? cfg.min;
    const delta = event.deltaY > 0 ? -cfg.step * 2 : cfg.step * 2;
    const next = Math.max(cfg.min, Math.min(cfg.max, current + delta));
    setParams((prev) => ({ ...prev, mouseRadius: next }));
  }, []);

  const handleCanvasPointerDown = useCallback(() => {
    if (mouseParamAnimRef.current) {
      cancelAnimationFrame(mouseParamAnimRef.current);
    }
    const fromValues = {};
    const toValues = {};
    const current = paramsRef.current;

    MOUSE_RANDOM_PARAM_KEYS.forEach((key) => {
      const cfg = SLIDER_CONFIG[key];
      if (!cfg) return;
      fromValues[key] = current[key] ?? 0;
      toValues[key] = randomInRange(cfg);
    });

    const startTime = performance.now();
    const durationMs = 900;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = progress * progress * (3 - 2 * progress);
      setParams((prev) => {
        const next = { ...prev };
        MOUSE_RANDOM_PARAM_KEYS.forEach((key) => {
          if (key in fromValues && key in toValues) {
            next[key] = lerp(fromValues[key], toValues[key], eased);
          }
        });
        return next;
      });
      if (progress < 1) {
        mouseParamAnimRef.current = requestAnimationFrame(tick);
      } else {
        mouseParamAnimRef.current = null;
      }
    };

    mouseParamAnimRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (mouseParamAnimRef.current) {
        cancelAnimationFrame(mouseParamAnimRef.current);
      }
    },
    []
  );

  const applyPresetToState = useCallback((preset) => {
    if (!preset) return;
    if (preset.visualMode != null) setVisualMode(preset.visualMode);
    if (preset.globalColorMode != null) setGlobalColorMode(preset.globalColorMode);
    if (preset.forceGlobalColor != null) setForceGlobalColor(!!preset.forceGlobalColor);

    setParams((prev) => {
      const next = { ...prev };
      ['layer1', 'layer2', 'layer3', 'layer4'].forEach((layerKey) => {
        if (preset[layerKey]) {
          next[layerKey] = { ...prev[layerKey], ...preset[layerKey] };
        }
      });
      GLOBAL_PARAM_KEYS.forEach((key) => {
        if (preset[key] !== undefined) next[key] = preset[key];
      });
      if (preset.globalSymmetryOffsetSpeed !== undefined) {
        next.globalSymmetryOffsetSpeed = preset.globalSymmetryOffsetSpeed;
      }
      return next;
    });
  }, []);

  const resetAudioReactiveColorModes = useCallback((audioActive) => {
    if (!audioActive) return;
    let changed = false;
    const next = { ...paramsRef.current };

    for (let i = 1; i <= 4; i++) {
      const layerKey = `layer${i}`;
      const colorMode = next[layerKey]?.colorMode;
      if (colorMode && AUDIO_COLOR_MODES_LIST.includes(colorMode)) {
        next[layerKey] = { ...next[layerKey], colorMode: 'rainbow' };
        changed = true;
      }
    }

    const globalMode = globalColorModeRef.current;
    if (!forceGlobalColorRef.current && AUDIO_COLOR_MODES_LIST.includes(globalMode)) {
      setGlobalColorMode('rainbow');
    }
    if (changed) setParams(next);
  }, []);

  return {
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
    visualModeRef,
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
  };
}
