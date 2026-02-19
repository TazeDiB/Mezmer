/**
 * Small helpers (extracted from legacy).
 */

export function lerp(t, e, n) {
  return t * (1 - n) + e * n;
}

export function randomInRange(config) {
  const e = config.max - config.min;
  let n = Math.random() * e + config.min;
  if (config.step && config.step > 1e-9) {
    n = Math.round(n / config.step) * config.step;
  }
  return Math.max(config.min, Math.min(config.max, n));
}

export const isElectron =
  typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
