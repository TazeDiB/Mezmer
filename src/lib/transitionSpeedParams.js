/** Params that control pattern motion rate — held at source values during randomize transitions. */
export const GLOBAL_SPEED_PARAM_KEYS = [
  'globalTimeScale',
  'globalSymmetryOffsetSpeed',
  'rainbowAnimationSpeed',
];

export const LAYER_SPEED_PARAM_KEYS = [
  'turingSpeed',
  'spiralNoiseSpeed',
  'flowSpeed',
  'cubeRotationSpeed',
  'smoothSpiralSpeed',
  'layerSymmetryOffsetSpeed',
  'fractalSpeed',
  'lissajousSpeed',
];

export const GLOBAL_SPEED_PARAM_SET = new Set(GLOBAL_SPEED_PARAM_KEYS);
export const LAYER_SPEED_PARAM_SET = new Set(LAYER_SPEED_PARAM_KEYS);

/** Keep motion at the source rate until transition completes (avoids mid-blend speed-up). */
export function holdLayerSpeedFromSource(fromLayer, toLayer, dt) {
  if (dt >= 1) return { ...toLayer };
  const held = { ...toLayer };
  for (const key of LAYER_SPEED_PARAM_KEYS) {
    if (fromLayer[key] !== undefined) held[key] = fromLayer[key];
  }
  return held;
}

export function holdGlobalSpeedFromSource(fromGlobals, toGlobals, dt) {
  if (dt >= 1) return { ...toGlobals };
  const held = { ...toGlobals };
  for (const key of GLOBAL_SPEED_PARAM_KEYS) {
    if (fromGlobals[key] !== undefined) held[key] = fromGlobals[key];
  }
  return held;
}
