/**
 * On-canvas FPS readout (driven by WebGL frame loop samples).
 */
import React from 'react';

export default function FpsOverlay({ fps, visible }) {
  if (!visible) return null;

  return React.createElement(
    'div',
    {
      'aria-live': 'polite',
      style: {
        position: 'absolute',
        top: 10,
        right: 10,
        left: 'auto',
        zIndex: 20,
        pointerEvents: 'none',
        padding: '4px 10px',
        borderRadius: 4,
        background: 'rgba(0, 0, 0, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#e8e8e8',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1.3,
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
      },
    },
    `${Number.isFinite(fps) ? fps.toFixed(1) : '—'} FPS`
  );
}
