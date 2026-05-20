/**
 * Audio analysis hook: Web Audio API + AnalyserNode, optional MediaStream (desktop capture).
 * Returns frequency data, play controls, BPM estimate, and bass/drum presence for shaders.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Meyda from 'meyda';

const BPM_SMOOTHING = 0.1;
const BPM_RESET_MS = 3000;
const BPM_HISTORY_LEN = 8;
const BASS_THRESHOLD = 0.5;
const DRUM_WINDOW_MS = 200;
const DRUM_COUNT_FOR_PRESENT = 3;
const MIN_BEAT_INTERVAL_MS = 240;
const MAX_BEAT_INTERVAL_MS = 1200;
const BPM_DEBOUNCE_MS = 100;
const BPM_CHANGE_THRESHOLD = 10;
const DRUM_COOLDOWN_MS = 2000;
const DRUM_ONSET_BASELINE_ALPHA = 0.05;
const DRUM_ONSET_THRESHOLD_MULT = 1.6;

const MEYDA_FEATURES = ['rms', 'energy', 'spectralCentroid'];

/** Positive spectral flux from byte frequency bins (Meyda's spectralFlux is broken in strict ESM). */
function computeSpectralFlux(current, previous) {
  if (!previous || current.length !== previous.length) return 0;
  let flux = 0;
  for (let i = 0; i < current.length; i++) {
    const diff = current[i] - previous[i];
    if (diff > 0) flux += diff;
  }
  return flux / (255 * current.length);
}

export function useAudio(audioTextureRef, fftSize = 256, inputStream = null) {
  const halfFft = fftSize / 2;
  const [audioData, setAudioData] = useState({
    frequencyData: new Uint8Array(halfFft),
    beatStrength: 0,
    spectralCentroid: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [estimatedBpm, setEstimatedBpm] = useState(120);
  const [isBassPresent, setIsBassPresent] = useState(false);
  const [isDrumsPresent, setIsDrumsPresent] = useState(false);
  const [isSourceConnected, setIsSourceConnected] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const elementSourceRef = useRef(null);
  const streamSourceRef = useRef(null);
  const gainRef = useRef(null);
  const activeSourceRef = useRef('none');
  const audioElementRef = useRef(null);
  const elementConnectedRef = useRef(false);
  const streamConnectedRef = useRef(false);
  const dataArrayFreqRef = useRef(null);
  const dataArrayTimeRef = useRef(null);
  const prevFreqDataRef = useRef(null);
  const meydaSignalRef = useRef(null);
  const prevMeydaSignalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const frameCountRef = useRef(0);
  const bpmHistoryRef = useRef([]);
  const lastBeatTimeRef = useRef(0);
  const lastBpmUpdateRef = useRef(0);
  const lastBassOnsetRef = useRef(0);
  const bassSmoothRef = useRef(0);
  const drumTimesRef = useRef([]);
  const lastDrumOnsetRef = useRef(0);
  const fluxBaselineRef = useRef(0);
  const rmsBaselineRef = useRef(0);
  const prevFluxRef = useRef(0);
  const prevRmsRef = useRef(0);
  const isBassPresentRef = useRef(false);
  const isDrumsPresentRef = useRef(false);
  const estimatedBpmRef = useRef(120);
  const audioPayloadRef = useRef({
    frequencyData: new Uint8Array(halfFft),
    beatStrength: 0,
    spectralCentroid: 0,
  });

  const connectSource = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {
        console.error('Web Audio API is not supported in this browser', err);
        return false;
      }
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = fftSize;
      const binCount = analyserRef.current.frequencyBinCount;
      dataArrayFreqRef.current = new Uint8Array(binCount);
      dataArrayTimeRef.current = new Uint8Array(fftSize);
      prevFreqDataRef.current = new Uint8Array(binCount);
      audioPayloadRef.current.frequencyData = new Uint8Array(binCount);
      meydaSignalRef.current = new Float32Array(fftSize);
      prevMeydaSignalRef.current = new Float32Array(fftSize);
      Meyda.bufferSize = fftSize;
      Meyda.sampleRate = ctx.sampleRate;
      setAudioData({
        frequencyData: audioPayloadRef.current.frequencyData,
        beatStrength: 0,
        spectralCentroid: 0,
      });
    } else {
      Meyda.bufferSize = fftSize;
      Meyda.sampleRate = ctx.sampleRate;
    }
    const analyser = analyserRef.current;
    if (!gainRef.current) gainRef.current = ctx.createGain();
    const gain = gainRef.current;

    if (!elementSourceRef.current && audioElementRef.current) {
      try {
        elementSourceRef.current = ctx.createMediaElementSource(audioElementRef.current);
      } catch (err) {
        console.error('Error creating MediaElementSourceNode:', err);
      }
    }
    if (inputStream && (!streamSourceRef.current || streamSourceRef.current.mediaStream !== inputStream)) {
      try {
        if (streamSourceRef.current) {
          streamSourceRef.current.disconnect();
        }
        streamSourceRef.current = ctx.createMediaStreamSource(inputStream);
      } catch (err) {
        console.error('Error creating MediaStreamSourceNode:', err);
        streamSourceRef.current = null;
      }
    }
    if (!inputStream && streamSourceRef.current) {
      try {
        streamSourceRef.current.disconnect();
      } catch (_) {}
      streamSourceRef.current = null;
    }

    let sourceType = inputStream ? 'stream' : audioElementRef.current ? 'element' : 'none';
    let sourceNode = null;
    if (sourceType === 'stream' && streamSourceRef.current) sourceNode = streamSourceRef.current;
    if (sourceType === 'element' && elementSourceRef.current) sourceNode = elementSourceRef.current;

    if (activeSourceRef.current !== 'none' && activeSourceRef.current !== sourceType) {
      try {
        if (activeSourceRef.current === 'element' && elementSourceRef.current) {
          elementSourceRef.current.disconnect();
          elementConnectedRef.current = false;
        } else if (activeSourceRef.current === 'stream' && streamSourceRef.current) {
          streamSourceRef.current.disconnect();
          streamConnectedRef.current = false;
        }
      } catch (err) {
        console.warn('Error disconnecting previous source node:', err);
      }
      activeSourceRef.current = 'none';
      setIsSourceConnected(false);
    }

    if (sourceNode && activeSourceRef.current !== sourceType) {
      try {
        let connected = false;
        if (sourceType === 'element' && !elementConnectedRef.current) {
          sourceNode.connect(analyser);
          elementConnectedRef.current = true;
          connected = true;
        } else if (sourceType === 'stream' && !streamConnectedRef.current) {
          sourceNode.connect(analyser);
          streamConnectedRef.current = true;
          connected = true;
        } else if (activeSourceRef.current === sourceType) {
          connected = true;
        }
        try {
          analyser.disconnect(gain);
        } catch (_) {}
        try {
          gain.disconnect(ctx.destination);
        } catch (_) {}
        analyser.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = sourceType === 'element' ? 1 : 0;
        activeSourceRef.current = sourceType;
        setIsSourceConnected(true);
      } catch (err) {
        console.error(`Error connecting ${sourceType} source:`, err);
        activeSourceRef.current = 'none';
        elementConnectedRef.current = false;
        streamConnectedRef.current = false;
        setIsSourceConnected(false);
        return false;
      }
    }
    return true;
  }, [fftSize, inputStream]);

  const analyseLoop = useCallback(() => {
    if (!analyserRef.current || !dataArrayFreqRef.current || !dataArrayTimeRef.current || !meydaSignalRef.current || !prevFreqDataRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      return;
    }
    const analyser = analyserRef.current;
    const freqData = dataArrayFreqRef.current;
    const timeData = dataArrayTimeRef.current;
    const meydaSignal = meydaSignalRef.current;
    const binCount = analyser.frequencyBinCount;
    try {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);
    } catch (err) {
      console.error('Error getting audio data:', err);
      cancelAnimationFrame(animationFrameRef.current);
      return;
    }
    for (let i = 0; i < meydaSignal.length; i++) {
      meydaSignal[i] = (timeData[i] - 128) / 128;
    }
    let features = null;
    try {
      features = Meyda.extract(MEYDA_FEATURES, meydaSignal, prevMeydaSignalRef.current);
    } catch (err) {
      console.warn('Meyda extract failed:', err);
    }
    prevMeydaSignalRef.current.set(meydaSignal);

    const flux = computeSpectralFlux(freqData, prevFreqDataRef.current);
    prevFreqDataRef.current.set(freqData);

    const rms = features?.rms ?? 0;
    const now = performance.now();
    let bassOn = false;
    let drumOn = false;
    const bassBins = Math.min(2, binCount);
    let bassSum = 0;
    if (bassBins > 0) {
      for (let i = 0; i < bassBins; i++) bassSum += freqData[i];
      if (bassSum / bassBins / 255 > BASS_THRESHOLD) {
        bassOn = true;
        lastBassOnsetRef.current = now;
      }
    }

    fluxBaselineRef.current += DRUM_ONSET_BASELINE_ALPHA * (flux - fluxBaselineRef.current);
    rmsBaselineRef.current += DRUM_ONSET_BASELINE_ALPHA * (rms - rmsBaselineRef.current);
    const fluxThreshold = Math.max(fluxBaselineRef.current * DRUM_ONSET_THRESHOLD_MULT, 1e-6);
    const rmsThreshold = Math.max(rmsBaselineRef.current * DRUM_ONSET_THRESHOLD_MULT, 1e-6);
    const fluxPeak = flux > prevFluxRef.current && flux >= fluxThreshold;
    const rmsPeak = rms > prevRmsRef.current && rms >= rmsThreshold;
    const drumOnset = fluxPeak || rmsPeak;
    prevFluxRef.current = flux;
    prevRmsRef.current = rms;

    if (drumOnset && now - lastBeatTimeRef.current > BPM_DEBOUNCE_MS / 2) {
      drumTimesRef.current.push(now);
      bpmHistoryRef.current.push(now);
      if (bpmHistoryRef.current.length > BPM_HISTORY_LEN) {
        bpmHistoryRef.current = bpmHistoryRef.current.slice(-BPM_HISTORY_LEN);
      }
      lastBeatTimeRef.current = now;
    }

    const drumWindowStart = now - DRUM_WINDOW_MS;
    drumTimesRef.current = drumTimesRef.current.filter((t) => t >= drumWindowStart);
    if (drumTimesRef.current.length >= DRUM_COUNT_FOR_PRESENT) {
      drumOn = true;
      lastDrumOnsetRef.current = now;
    }

    if (bassOn) {
      bassSmoothRef.current = Math.min(bassSmoothRef.current + 1, 4);
      if (bassSmoothRef.current > 3 && !isBassPresentRef.current) {
        isBassPresentRef.current = true;
        setIsBassPresent(true);
      }
    } else {
      bassSmoothRef.current = Math.max(bassSmoothRef.current - 1, 0);
      if (bassSmoothRef.current === 0 && isBassPresentRef.current) {
        isBassPresentRef.current = false;
        setIsBassPresent(false);
      }
    }
    if (drumOn) {
      if (!isDrumsPresentRef.current) {
        isDrumsPresentRef.current = true;
        setIsDrumsPresent(true);
      }
    } else if (now - lastDrumOnsetRef.current > DRUM_COOLDOWN_MS) {
      if (isDrumsPresentRef.current) {
        isDrumsPresentRef.current = false;
        setIsDrumsPresent(false);
        bassSmoothRef.current = 0;
      }
    }

    if (frameCountRef.current % 30 === 0 && bpmHistoryRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < bpmHistoryRef.current.length; i++) {
        const d = bpmHistoryRef.current[i] - bpmHistoryRef.current[i - 1];
        if (d >= MIN_BEAT_INTERVAL_MS && d <= MAX_BEAT_INTERVAL_MS) intervals.push(d);
      }
      if (intervals.length > 0) {
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = 60000 / avgMs;
        setEstimatedBpm((prev) => {
          const next = prev * (1 - BPM_SMOOTHING) + bpm * BPM_SMOOTHING;
          estimatedBpmRef.current = next;
          return next;
        });
        lastBpmUpdateRef.current = now;
      }
      if (now - lastBpmUpdateRef.current > BPM_RESET_MS && estimatedBpmRef.current !== 120) {
        estimatedBpmRef.current = 120;
        setEstimatedBpm(120);
        bpmHistoryRef.current = [];
      }
    }

    if (audioTextureRef?.current?.isDataTexture && freqData) {
      const tex = audioTextureRef.current;
      if (tex.image?.data?.length === freqData.length) {
        tex.image.data.set(freqData);
        tex.needsUpdate = true;
      }
    }
    if (audioPayloadRef.current.frequencyData.length === freqData.length) {
      audioPayloadRef.current.frequencyData.set(freqData);
    }

    let beatStrength = 0;
    let spectralCentroid = 0;
    const sampleRate = audioContextRef.current?.sampleRate ?? Meyda.sampleRate ?? 44100;
    const nyquist = sampleRate / 2;
    if (features?.spectralCentroid != null && Number.isFinite(features.spectralCentroid)) {
      spectralCentroid = nyquist > 0 ? Math.min(1, features.spectralCentroid / nyquist) : 0;
    } else {
      let weightedSum = 0;
      let totalEnergy = 0;
      for (let i = 0; i < binCount; i++) {
        const val = freqData[i] / 255;
        weightedSum += i * val;
        totalEnergy += val;
      }
      spectralCentroid = totalEnergy > 0 ? (weightedSum / totalEnergy) / binCount : 0;
    }

    const beatBins = Math.min(8, binCount);
    let bassEnergy = 0;
    for (let i = 0; i < beatBins; i++) bassEnergy += freqData[i];
    beatStrength = Math.min(1, bassEnergy / (beatBins * 255));
    if (features?.rms != null) {
      beatStrength = Math.max(beatStrength, Math.min(1, features.rms * 2));
    }

    frameCountRef.current += 1;
    audioPayloadRef.current.beatStrength = beatStrength;
    audioPayloadRef.current.spectralCentroid = spectralCentroid;
    if (frameCountRef.current % 8 === 0) {
      setAudioData({
        frequencyData: audioPayloadRef.current.frequencyData,
        beatStrength,
        spectralCentroid,
      });
    }
    if (audioContextRef.current && activeSourceRef.current !== 'none') {
      animationFrameRef.current = requestAnimationFrame(analyseLoop);
    }
  }, [audioTextureRef]);

  useEffect(() => {
    const ctx = audioContextRef.current;
    const hasStream = inputStream instanceof MediaStream;
    const shouldRun = ctx && isSourceConnected && (isPlaying || hasStream);
    if (shouldRun && animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(analyseLoop);
    } else if (!shouldRun && animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isPlaying, inputStream, isSourceConnected, analyseLoop]);

  useEffect(() => {
    connectSource();
  }, [connectSource]);

  const loadAudio = useCallback((url) => {
    if (!audioElementRef.current) {
      console.error('Audio element ref not available in loadAudio.');
      return;
    }
    const el = audioElementRef.current;
    el.src = url;
    el.load();
    el.play().then(() => {
      setIsPlaying(true);
      connectSource();
    }).catch((err) => {
      console.error('Error playing audio:', err);
      setIsPlaying(false);
    });
  }, [connectSource]);

  const togglePlay = useCallback(() => {
    if (!audioElementRef.current?.src) {
      console.warn('togglePlay: No audio source loaded.');
      return;
    }
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          audioElementRef.current.play().catch((e) => console.error('Error playing audio:', e));
        });
      } else {
        audioElementRef.current.play().catch((e) => console.error('Error playing audio:', e));
      }
      setIsPlaying(true);
      connectSource();
    }
  }, [isPlaying, connectSource]);

  useEffect(() => {
    const elSource = elementSourceRef.current;
    const strSource = streamSourceRef.current;
    const analyser = analyserRef.current;
    const gain = gainRef.current;
    const ctx = audioContextRef.current;
    return () => {
      try {
        if (elSource) elSource.disconnect();
        if (strSource) strSource.disconnect();
        if (analyser && gain) {
          try {
            analyser.disconnect(gain);
          } catch (_) {}
        }
        if (gain && ctx?.destination) {
          try {
            gain.disconnect(ctx.destination);
          } catch (_) {}
        }
        if (analyser) analyser.disconnect();
      } catch (err) {
        console.warn('Error disconnecting nodes during cleanup:', err);
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return {
    audioData,
    loadAudio,
    togglePlay,
    isPlaying,
    isBassPresent,
    isDrumsPresent,
    audioElementRef,
    analyserRef,
    dataArrayFreqRef,
    estimatedBpm,
    inputStream,
    drumOnsetDetected: lastDrumOnsetRef,
  };
}
