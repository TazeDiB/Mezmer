/**
 * Main-canvas randomization, gallery stack updates, and auto-randomize timer/BPM.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  SLIDER_CONFIG,
  GLOBAL_PARAM_KEYS,
  VISUAL_MODE_INDEX,
} from '../constants/sliderConfig.js';
import { lerp } from '../lib/utils.js';
import { createRandomMainCanvasTransition, randomizeGalleryWallStacks } from '../lib/randomizer.js';
import { GLOBAL_SPEED_PARAM_SET, LAYER_SPEED_PARAM_SET } from '../lib/transitionSpeedParams.js';

const MAIN_RANDOMIZE_BASE_MS = 2500;
const LATE_EASE_START = 0.9;

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lateEaseProgress(progress, lateStart = LATE_EASE_START) {
  if (progress <= lateStart) return 0;
  return smoothstep((progress - lateStart) / (1 - lateStart));
}

export function useRandomization({
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
}) {
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [randomizeTargetParams, setRandomizeTargetParams] = useState(null);
  const randomizeFromParamsRef = useRef(null);
  const randomizeStartTimeRef = useRef(0);
  const randomizeRafRef = useRef();
  const randomizeCompletePhaseRef = useRef(null);
  const randomizeTransitionMetaRef = useRef(null);
  const randomizeVisualModeRef = useRef(false);

  const [randomizeGlobals, setRandomizeGlobals] = useState(false);
  const [randomizeColorModes, setRandomizeColorModes] = useState(true);
  const [randomizeVisualMode, setRandomizeVisualMode] = useState(false);
  const [activeTheme, setActiveTheme] = useState('chaotic');

  const [autoRandomizeEnabled, setAutoRandomizeEnabled] = useState(false);
  const [autoRandomizeBeatCount, setAutoRandomizeBeatCount] = useState(4);
  const [autoRandomizeMode, setAutoRandomizeMode] = useState('bpm');
  const [autoRandomizeTimeInterval, setAutoRandomizeTimeInterval] = useState(5);

  const randomizeGlobalsRef = useRef(randomizeGlobals);
  const isRandomizingRef = useRef(isRandomizing);
  const autoRandomizeTimerRef = useRef(null);
  const autoRandomizeTimeAccumRef = useRef(0);
  const autoRandomizeBeatAccumRef = useRef(0);
  const autoRandomizeLastBeatRef = useRef(0);
  const autoRandomizeTickRef = useRef(0);

  const galleryHasActiveTransitions = useMemo(
    () => Object.values(manualBlendProgress).some((t) => t !== null),
    [manualBlendProgress]
  );

  const handleRandomize = useCallback(
    (forceGlobals = false) => {
      if (isRandomizingRef.current) return;

      const currentParams = paramsRef.current;
      const shouldRandomizeGlobals = randomizeGlobalsRef.current || forceGlobals;
      const audioActive = !!(isPlaying || isCapturing);

      const transition = createRandomMainCanvasTransition({
        currentParams,
        currentVisualMode: visualMode,
        currentGlobalColorMode: globalColorModeRef.current,
        forceGlobalColor: forceGlobalColorRef.current,
        theme: activeTheme,
        randomizeGlobals: shouldRandomizeGlobals,
        randomizeColorModes,
        randomizeVisualMode,
        audioActive,
      });

      randomizeFromParamsRef.current = transition.fromParams;
      randomizeCompletePhaseRef.current = null;
      randomizeTransitionMetaRef.current = {
        globalColorMode: transition.globalColorMode,
        forceGlobalColor: transition.forceGlobalColor,
        visualMode: transition.visualMode,
      };
      setRandomizeTargetParams(transition.toParams);
      randomizeGalleryWallStacks({
        theme: activeTheme,
        randomizeColorModes,
        randomizeVisualMode,
        blendSpeedFactor: currentParams.blendSpeedFactor ?? blendSpeedFactor ?? 1,
        audioActive,
      });
      randomizeStartTimeRef.current = performance.now();
      setIsRandomizing(true);
    },
    [
      paramsRef,
      visualMode,
      globalColorModeRef,
      forceGlobalColorRef,
      activeTheme,
      randomizeColorModes,
      randomizeVisualMode,
      blendSpeedFactor,
      isPlaying,
      isCapturing,
    ]
  );

  useEffect(() => {
    randomizeGlobalsRef.current = randomizeGlobals;
    isRandomizingRef.current = isRandomizing;
    randomizeVisualModeRef.current = randomizeVisualMode;
  }, [randomizeGlobals, isRandomizing, randomizeVisualMode]);

  useEffect(() => {
    if (!isRandomizing || !randomizeTargetParams || !randomizeFromParamsRef.current) {
      cancelAnimationFrame(randomizeRafRef.current);
      return;
    }

    const speed = blendSpeedFactor;
    const factor = typeof speed === 'number' && speed > 0 ? speed : 1;
    const durationMs = Math.max(50, MAIN_RANDOMIZE_BASE_MS / factor);
    let running = true;

    const tick = (now) => {
      if (!running) return;

      const fromParams = randomizeFromParamsRef.current;
      const targetParams = randomizeTargetParams;
      const elapsed = now - randomizeStartTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = smoothstep(progress);
      const lateEased = lateEaseProgress(progress);
      const animateVisualMode = randomizeVisualModeRef.current;
      const isCommitPhase = randomizeCompletePhaseRef.current === 'commit';

      if (!isCommitPhase) {
        setParams((prev) => {
          const next = { ...prev };

          GLOBAL_PARAM_KEYS.forEach((key) => {
            if (
              key !== 'blendSpeedFactor' &&
              key !== 'pixelationFactor' &&
              key !== 'asciiCharSize' &&
              key !== 'stressTestCount' &&
              SLIDER_CONFIG[key] &&
              Object.prototype.hasOwnProperty.call(fromParams, key) &&
              Object.prototype.hasOwnProperty.call(targetParams, key)
            ) {
              if (GLOBAL_SPEED_PARAM_SET.has(key)) {
                next[key] =
                  lateEased > 0
                    ? lerp(fromParams[key], targetParams[key], lateEased)
                    : fromParams[key];
              } else {
                next[key] = lerp(fromParams[key], targetParams[key], eased);
              }
            }
          });

          if (animateVisualMode) {
            const fromBlend = fromParams.visualModeBlend ?? 0;
            next.visualModeBlend = lerp(fromBlend, 1, eased);
            next.visualModeFromIndex =
              fromParams.visualModeFromIndex ?? targetParams.visualModeFromIndex;
            next.visualModeToIndex = targetParams.visualModeToIndex;
            const toIndex = targetParams.visualModeToIndex;
            if (toIndex === VISUAL_MODE_INDEX.pixelate) {
              if (
                Object.prototype.hasOwnProperty.call(fromParams, 'pixelationFactor') &&
                Object.prototype.hasOwnProperty.call(targetParams, 'pixelationFactor')
              ) {
                next.pixelationFactor = lerp(
                  fromParams.pixelationFactor,
                  targetParams.pixelationFactor,
                  eased
                );
              } else if (Object.prototype.hasOwnProperty.call(targetParams, 'pixelationFactor')) {
                next.pixelationFactor = targetParams.pixelationFactor;
              }
              if (Object.prototype.hasOwnProperty.call(fromParams, 'asciiCharSize')) {
                next.asciiCharSize = fromParams.asciiCharSize;
              }
            } else if (toIndex === VISUAL_MODE_INDEX.ascii) {
              if (
                Object.prototype.hasOwnProperty.call(fromParams, 'asciiCharSize') &&
                Object.prototype.hasOwnProperty.call(targetParams, 'asciiCharSize')
              ) {
                next.asciiCharSize = lerp(fromParams.asciiCharSize, targetParams.asciiCharSize, eased);
              } else if (Object.prototype.hasOwnProperty.call(targetParams, 'asciiCharSize')) {
                next.asciiCharSize = targetParams.asciiCharSize;
              }
              if (Object.prototype.hasOwnProperty.call(fromParams, 'pixelationFactor')) {
                next.pixelationFactor = fromParams.pixelationFactor;
              }
            } else {
              if (Object.prototype.hasOwnProperty.call(fromParams, 'pixelationFactor')) {
                next.pixelationFactor = fromParams.pixelationFactor;
              }
              if (Object.prototype.hasOwnProperty.call(fromParams, 'asciiCharSize')) {
                next.asciiCharSize = fromParams.asciiCharSize;
              }
            }
          } else {
            next.visualModeBlend = fromParams.visualModeBlend ?? prev.visualModeBlend;
            next.visualModeFromIndex = fromParams.visualModeFromIndex ?? prev.visualModeFromIndex;
            next.visualModeToIndex = fromParams.visualModeToIndex ?? prev.visualModeToIndex;
            next.pixelationFactor = fromParams.pixelationFactor ?? prev.pixelationFactor;
            next.asciiCharSize = fromParams.asciiCharSize ?? prev.asciiCharSize;
          }

          for (let layerIndex = 1; layerIndex <= 4; layerIndex++) {
            const layerKey = `layer${layerIndex}`;
            if (!targetParams[layerKey] || !fromParams[layerKey]) continue;

            const targetLayer = targetParams[layerKey];
            const fromLayer = fromParams[layerKey];
            const blended = { ...next[layerKey] };

            blended.patternType = fromLayer.patternType;
            blended.blendTargetType = targetLayer.patternType;
            blended.blendAmount = eased;

            Object.keys(targetLayer).forEach((paramKey) => {
              if (
                SLIDER_CONFIG[paramKey] &&
                paramKey !== 'patternType' &&
                paramKey !== 'blendTargetType' &&
                paramKey !== 'blendAmount' &&
                paramKey !== 'isVisible' &&
                paramKey !== 'colorMode' &&
                Object.prototype.hasOwnProperty.call(fromLayer, paramKey)
              ) {
                if (LAYER_SPEED_PARAM_SET.has(paramKey)) {
                  blended[paramKey] =
                    lateEased > 0
                      ? lerp(fromLayer[paramKey], targetLayer[paramKey], lateEased)
                      : fromLayer[paramKey];
                } else {
                  blended[paramKey] = lerp(fromLayer[paramKey], targetLayer[paramKey], eased);
                }
              }
            });

            blended.colorMode = fromLayer.colorMode;
            blended.blendTargetColorMode = targetLayer.colorMode;
            next[layerKey] = blended;
          }

          return next;
        });
      }

      if (randomizeCompletePhaseRef.current === 'commit') {
        const target = randomizeTargetParams;
        const meta = randomizeTransitionMetaRef.current;

        setParams((prev) => {
          const next = { ...prev };

          GLOBAL_PARAM_KEYS.forEach((key) => {
            if (
              key !== 'pixelationFactor' &&
              key !== 'asciiCharSize' &&
              key !== 'stressTestCount' &&
              Object.prototype.hasOwnProperty.call(target, key) &&
              (SLIDER_CONFIG[key] || key === 'blendSpeedFactor')
            ) {
              next[key] = target[key];
            }
          });

          if (animateVisualMode) {
            const toIndex = target.visualModeToIndex ?? 0;
            next.visualModeFromIndex = toIndex;
            next.visualModeToIndex = toIndex;
            next.visualModeBlend = 0;
            next.pixelationFactor = target.pixelationFactor;
            next.asciiCharSize = target.asciiCharSize;
          }

          for (let layerIndex = 1; layerIndex <= 4; layerIndex++) {
            const layerKey = `layer${layerIndex}`;
            if (!target?.[layerKey] || !next?.[layerKey]) {
              console.warn(`Skipping final state set for layer ${layerKey} due to missing data.`);
              continue;
            }

            const finalLayer = { ...next[layerKey] };
            const targetLayer = target[layerKey];
            finalLayer.patternType = targetLayer.patternType;
            finalLayer.colorMode = targetLayer.colorMode;
            finalLayer.blendTargetType = targetLayer.patternType;
            finalLayer.blendAmount = 0;
            finalLayer.blendTargetColorMode = targetLayer.colorMode;

            Object.keys(targetLayer).forEach((paramKey) => {
              if (
                [
                  'patternType',
                  'colorMode',
                  'blendAmount',
                  'blendTargetType',
                  'blendTargetColorMode',
                  'isVisible',
                ].includes(paramKey)
              ) {
                return;
              }
              if (Object.prototype.hasOwnProperty.call(targetLayer, paramKey)) {
                finalLayer[paramKey] = targetLayer[paramKey];
              }
            });
            next[layerKey] = finalLayer;
          }
          return next;
        });

        const nextGlobalColor =
          meta?.globalColorMode ?? target?.globalColorMode ?? globalColorModeRef.current;
        if (nextGlobalColor != null) {
          setGlobalColorMode(nextGlobalColor);
        }
        setForceGlobalColor(
          meta?.forceGlobalColor != null
            ? !!meta.forceGlobalColor
            : !!target?.forceGlobalColor
        );

        if (animateVisualMode) {
          const modeName =
            meta?.visualMode ??
            Object.keys(VISUAL_MODE_INDEX).find(
              (k) => VISUAL_MODE_INDEX[k] === (target?.visualModeToIndex ?? 0)
            ) ??
            'normal';
          setVisualMode(modeName);
        }

        randomizeCompletePhaseRef.current = null;
        randomizeTransitionMetaRef.current = null;
        setIsRandomizing(false);
        running = false;
        cancelAnimationFrame(randomizeRafRef.current);
      } else if (progress >= 1) {
        randomizeCompletePhaseRef.current = 'commit';
        setParams((prev) => {
          const next = { ...prev };
          const target = randomizeTargetParams;

          if (animateVisualMode) {
            next.visualModeBlend = 1;
          }

          for (let layerIndex = 1; layerIndex <= 4; layerIndex++) {
            const layerKey = `layer${layerIndex}`;
            if (!target?.[layerKey] || !next?.[layerKey]) continue;

            const settleLayer = { ...next[layerKey] };
            const targetLayer = target[layerKey];
            settleLayer.blendAmount = 1;
            settleLayer.blendTargetType = targetLayer.patternType;
            settleLayer.colorMode = targetLayer.colorMode;
            settleLayer.blendTargetColorMode = targetLayer.colorMode;
            next[layerKey] = settleLayer;
          }

          return next;
        });
        randomizeRafRef.current = requestAnimationFrame(tick);
      } else {
        randomizeRafRef.current = requestAnimationFrame(tick);
      }
    };

    randomizeRafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(randomizeRafRef.current);
    };
  }, [
    isRandomizing,
    randomizeTargetParams,
    blendSpeedFactor,
    setParams,
    setVisualMode,
    setGlobalColorMode,
    setForceGlobalColor,
    globalColorModeRef,
  ]);

  const runAutoRandomizeLoop = useCallback(() => {
    clearTimeout(autoRandomizeTimerRef.current);
    autoRandomizeTickRef.current = performance.now();
    autoRandomizeBeatAccumRef.current = 0;
    autoRandomizeLastBeatRef.current = 0;
    autoRandomizeTimeAccumRef.current = 0;

    const tick = () => {
      const audioPlaying = isPlaying;
      const capturing = isCapturing;
      const bpm = estimatedBpm;
      const beatCount = autoRandomizeBeatCount;
      const mode = autoRandomizeMode;
      const timeInterval = autoRandomizeTimeInterval;
      const skipGallery = galleryHasActiveTransitions;

      if (!autoRandomizeEnabled) {
        clearTimeout(autoRandomizeTimerRef.current);
        return;
      }

      const now = performance.now();
      const deltaSec = (now - autoRandomizeTickRef.current) / 1000;
      autoRandomizeTickRef.current = now;

      let shouldRandomize = false;
      const canRandomize = !isRandomizingRef.current && !skipGallery;

      if (mode === 'time') {
        autoRandomizeTimeAccumRef.current += deltaSec;
        if (autoRandomizeTimeAccumRef.current >= timeInterval) {
          if (canRandomize) shouldRandomize = true;
          autoRandomizeTimeAccumRef.current = 0;
        }
      } else if (mode === 'bpm') {
        if ((audioPlaying || capturing) && bpm > 0) {
          const beatMs = 60000 / bpm;
          if (beatMs > 0) {
            const windowMs = beatMs * 4;
            if (now - autoRandomizeLastBeatRef.current >= windowMs) {
              autoRandomizeBeatAccumRef.current++;
              autoRandomizeLastBeatRef.current = now;
              if (autoRandomizeBeatAccumRef.current >= beatCount) {
                if (canRandomize) shouldRandomize = true;
                autoRandomizeBeatAccumRef.current = 0;
              }
            }
          } else {
            autoRandomizeLastBeatRef.current = 0;
          }
        } else {
          autoRandomizeLastBeatRef.current = 0;
        }
      }

      if (shouldRandomize) {
        handleRandomize(true);
      }
      autoRandomizeTimerRef.current = setTimeout(tick, 100);
    };

    autoRandomizeTimerRef.current = setTimeout(tick, 100);
  }, [
    autoRandomizeEnabled,
    autoRandomizeBeatCount,
    autoRandomizeMode,
    autoRandomizeTimeInterval,
    isPlaying,
    isCapturing,
    estimatedBpm,
    galleryHasActiveTransitions,
    handleRandomize,
  ]);

  useEffect(() => {
    if (autoRandomizeEnabled) {
      runAutoRandomizeLoop();
    } else {
      clearTimeout(autoRandomizeTimerRef.current);
    }
    return () => clearTimeout(autoRandomizeTimerRef.current);
  }, [
    autoRandomizeEnabled,
    autoRandomizeBeatCount,
    autoRandomizeMode,
    autoRandomizeTimeInterval,
    runAutoRandomizeLoop,
  ]);

  return {
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
  };
}
