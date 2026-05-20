/**
 * Global keyboard shortcuts: layers 1–4, hide controls (H), fullscreen (F), 3D toggle (M).
 */

import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onLayerSelect,
  onToggleControls,
  onToggleThreeD,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      switch (event.key.toLowerCase()) {
        case '1':
        case '2':
        case '3':
        case '4':
          onLayerSelect(`layer${event.key}`);
          break;
        case 'h':
          onToggleControls();
          break;
        case 'f':
          document.documentElement.requestFullscreen?.();
          break;
        case 'm':
          onToggleThreeD();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLayerSelect, onToggleControls, onToggleThreeD]);
}
