/**
 * Electron desktop audio capture: source list, stream lifecycle, selection.
 */

import { useState, useCallback, useEffect } from 'react';

export function useDesktopCapture({ audioElementRef, togglePlay, isPlaying, setCaptureStream }) {
  const [desktopSources, setDesktopSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState(null);

  const fetchDesktopSources = useCallback(async () => {
    if (window.electronAPI?.getDesktopSources) {
      try {
        const sources = await window.electronAPI.getDesktopSources();
        setDesktopSources(sources);
        setCaptureError(null);
      } catch (err) {
        console.error('Error getting desktop sources:', err);
        setCaptureError(`Failed to get sources: ${err.message}`);
        setDesktopSources([]);
      }
    } else {
      console.warn('Electron API for desktop sources not available.');
      setCaptureError('Desktop capture not supported in this environment.');
    }
  }, []);

  const startCapture = useCallback(async () => {
    if (!selectedSourceId) {
      setCaptureError('Please select an audio source.');
      return;
    }

    setCaptureError(null);
    try {
      if (isPlaying) togglePlay();
      const audioEl = audioElementRef?.current;
      if (audioEl?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(audioEl.src);
        audioEl.src = '';
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
          },
        },
      });

      setCaptureStream?.(stream);
      setIsCapturing(true);
    } catch (err) {
      console.error('handleStartCapture: Error during getUserMedia or stream handling:', err);
      setCaptureError(`Capture failed: ${err.message}`);
      setIsCapturing(false);
      setCaptureStream?.(null);
    }
  }, [selectedSourceId, isPlaying, togglePlay, audioElementRef, setCaptureStream]);

  const stopCapture = useCallback(() => {
    setCaptureStream?.((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setIsCapturing(false);
    setCaptureError(null);
  }, [setCaptureStream]);

  useEffect(() => {
    if (desktopSources.length > 0 && !selectedSourceId) {
      const screenSource = desktopSources.find((s) => s.id.startsWith('screen:'));
      setSelectedSourceId(screenSource ? screenSource.id : desktopSources[0].id);
    }
  }, [desktopSources, selectedSourceId]);

  return {
    desktopSources,
    selectedSourceId,
    setSelectedSourceId,
    isCapturing,
    captureError,
    fetchDesktopSources,
    startCapture,
    stopCapture,
  };
}
