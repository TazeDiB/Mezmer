/**
 * Stress-test benchmark helpers — CPU timings + GPU cost estimates (no WebGL required).
 */
import {
  STRESS_TEST_MODES,
  getStressTestObjectCount,
  getStressTestMaxCount,
  getStressTileRenderSize,
  computeStressGrid,
  isCastleStressMode,
  isParticleStressMode,
} from './stressTest.js';
import { generateCastleParts } from './stressTestCastle.js';

/** Default viewport used for RT sizing estimates. */
export const BENCHMARK_CANVAS = { width: 1920, height: 1080 };

/** RGBA half-float bytes per texel (feedback + blend RTs). */
const HALF_FLOAT_BYTES_PER_TEXEL = 8;

/** Height map is typically RGBA8. */
const HEIGHTMAP_BYTES_PER_TEXEL = 4;

/** RT slots per stress object: fbA, fbB, outA, outB, heightMap. */
const RT_SLOTS_PER_OBJECT = 5;

/** Default benchmark matrix — tuned for sub-1k object budgeting. */
export const BENCHMARK_PROFILE_STANDARD = [
  { mode: 'plane2d', counts: [1, 4, 16, 32, 64] },
  { mode: 'cubes3d', counts: [1, 4, 8, 16, 32] },
  { mode: 'particles3d', counts: [1, 16, 64, 128, 256] },
  { mode: 'castle100', counts: [100] },
  { mode: 'castle1000', counts: [1000] },
];

/** Extended matrix including 10k castle (slow CPU layout). */
export const BENCHMARK_PROFILE_FULL = [
  ...BENCHMARK_PROFILE_STANDARD,
  { mode: 'castle10000', counts: [10000] },
];

/**
 * @typedef {Object} StressGpuEstimate
 * @property {string} mode
 * @property {number} objectCount
 * @property {number} tileSizePx
 * @property {number} shaderPassesPerFrame
 * @property {number} pixelsWrittenPerFrame
 * @property {number} rtMemoryBytes
 * @property {number} gridCols
 * @property {number} gridRows
 * @property {number} drawCalls
 * @property {boolean} usesFlyControls
 * @property {boolean} usesHeightmapSlot
 */

/**
 * Estimate per-frame GPU work for a stress configuration.
 * @param {object} options
 * @param {string} options.mode
 * @param {number} options.count
 * @param {number} [options.canvasWidth]
 * @param {number} [options.canvasHeight]
 * @param {boolean} [options.displacementEnabled]
 */
export function estimateStressGpuMetrics({
  mode,
  count,
  canvasWidth = BENCHMARK_CANVAS.width,
  canvasHeight = BENCHMARK_CANVAS.height,
  displacementEnabled = false,
}) {
  const objectCount = isCastleStressMode(mode)
    ? getStressTestObjectCount(mode, count)
    : Math.max(1, Math.min(getStressTestMaxCount(mode), Math.round(count ?? 1)));

  const tileSizePx = getStressTileRenderSize(canvasWidth, canvasHeight, objectCount, mode);
  const { cols, rows } = computeStressGrid(objectCount);

  // Each object: main.frag feedback + blend.frag (+ optional height blit).
  const passesPerObject = displacementEnabled ? 3 : 2;
  const shaderPassesPerFrame = objectCount * passesPerObject;
  const pixelsWrittenPerFrame = shaderPassesPerFrame * tileSizePx * tileSizePx;

  const colorBytes = RT_SLOTS_PER_OBJECT * tileSizePx * tileSizePx * HALF_FLOAT_BYTES_PER_TEXEL;
  const heightBytes = tileSizePx * tileSizePx * HEIGHTMAP_BYTES_PER_TEXEL;
  const rtMemoryBytes = objectCount * (colorBytes + heightBytes);

  return {
    mode,
    objectCount,
    tileSizePx,
    shaderPassesPerFrame,
    pixelsWrittenPerFrame,
    rtMemoryBytes,
    gridCols: cols,
    gridRows: rows,
    drawCalls: objectCount,
    usesFlyControls: mode === 'cubes3d' || isCastleStressMode(mode) || isParticleStressMode(mode),
    usesHeightmapSlot: true,
  };
}

/**
 * Time a synchronous function over several iterations (returns median ms).
 * @param {() => void} fn
 * @param {number} [iterations]
 */
export function medianMs(fn, iterations = 40) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

/**
 * CPU micro-benchmarks for layout generators (no GPU).
 */
export function benchmarkStressCpuTasks() {
  const results = [];

  for (const count of [100, 1000, 10000]) {
    const ms = medianMs(() => generateCastleParts(count), count >= 10000 ? 8 : 25);
    results.push({
      task: `generateCastleParts(${count})`,
      medianMs: round3(ms),
      objectCount: count,
    });
  }

  return results;
}

/**
 * Scene-graph layout timings (Three.js objects, no renderer).
 */
export async function benchmarkStressSceneLayout() {
  const [{ createStressParticleScene, layoutStressParticles }, { createStressTestScene, layoutStressPlaneGrid, layoutStressCubeGrid, layoutCastleScene }] =
    await Promise.all([
      import('./stressTestParticles.js'),
      import('./stressTestScene.js'),
    ]);

  const results = [];

  const particleCounts = [16, 64, 256];
  for (const count of particleCounts) {
    const state = createStressParticleScene(256);
    const ms = medianMs(() => layoutStressParticles(state, count), 30);
    results.push({
      task: `layoutStressParticles(${count})`,
      medianMs: round3(ms),
      objectCount: count,
    });
  }

  const planeState = createStressTestScene('plane2d', 64);
  results.push({
    task: 'layoutStressPlaneGrid(64)',
    medianMs: round3(medianMs(() => layoutStressPlaneGrid(planeState, 64, 16 / 9), 25)),
    objectCount: 64,
  });

  const cubeState = createStressTestScene('cubes3d', 32);
  results.push({
    task: 'layoutStressCubeGrid(32)',
    medianMs: round3(medianMs(() => layoutStressCubeGrid(cubeState, 32), 25)),
    objectCount: 32,
  });

  const castleParts = generateCastleParts(1000);
  const castleState = createStressTestScene('castle', 10000);
  results.push({
    task: 'layoutCastleScene(1000)',
    medianMs: round3(medianMs(() => layoutCastleScene(castleState, castleParts), 12)),
    objectCount: 1000,
  });

  return results;
}

/**
 * @param {typeof BENCHMARK_PROFILE_STANDARD} profile
 * @param {object} [options]
 */
export function buildGpuEstimateTable(profile = BENCHMARK_PROFILE_STANDARD, options = {}) {
  const rows = [];
  for (const entry of profile) {
    if (!STRESS_TEST_MODES.includes(entry.mode)) continue;
    for (const count of entry.counts) {
      const resolvedCount = getStressTestObjectCount(entry.mode, count);
      rows.push(
        estimateStressGpuMetrics({
          mode: entry.mode,
          count: resolvedCount,
          displacementEnabled: options.displacementEnabled ?? false,
          canvasWidth: options.canvasWidth ?? BENCHMARK_CANVAS.width,
          canvasHeight: options.canvasHeight ?? BENCHMARK_CANVAS.height,
        })
      );
    }
  }
  return rows;
}

/**
 * Compare relative cost vs a baseline row (default: plane2d @ 16 objects).
 * @param {StressGpuEstimate[]} rows
 * @param {StressGpuEstimate} [baseline]
 */
export function attachRelativeCost(rows, baseline = null) {
  const base =
    baseline ??
    rows.find((r) => r.mode === 'plane2d' && r.objectCount === 16) ??
    rows[0];
  if (!base) return rows.map((r) => ({ ...r, relativeShaderCost: 1 }));

  const baseCost = base.shaderPassesPerFrame * base.tileSizePx * base.tileSizePx;
  return rows.map((r) => {
    const cost = r.shaderPassesPerFrame * r.tileSizePx * r.tileSizePx;
    return {
      ...r,
      relativeShaderCost: baseCost > 0 ? round3(cost / baseCost) : 1,
    };
  });
}

/**
 * Full suite for CLI/report output.
 * @param {object} [options]
 * @param {boolean} [options.full]
 */
export async function runStressBenchmarkSuite(options = {}) {
  const profile = options.full ? BENCHMARK_PROFILE_FULL : BENCHMARK_PROFILE_STANDARD;
  const gpuRows = attachRelativeCost(
    buildGpuEstimateTable(profile, {
      displacementEnabled: options.displacementEnabled,
      canvasWidth: options.canvasWidth,
      canvasHeight: options.canvasHeight,
    })
  );

  const cpuTasks = benchmarkStressCpuTasks();
  const layoutTasks = await benchmarkStressSceneLayout();

  return {
    generatedAt: new Date().toISOString(),
    canvas: {
      width: options.canvasWidth ?? BENCHMARK_CANVAS.width,
      height: options.canvasHeight ?? BENCHMARK_CANVAS.height,
    },
    profile: options.full ? 'full' : 'standard',
    displacementEnabled: !!options.displacementEnabled,
    gpuEstimates: gpuRows,
    cpuBenchmarks: [...cpuTasks, ...layoutTasks],
    notes: [
      'GPU rows are estimates (shader passes × tile pixels × RT memory).',
      'In-app FPS is the ground truth — run Stress Test modes with FPS overlay enabled.',
      'Target budget: stay under ~1000 patterned objects for interactive gallery work.',
      'Particles add cheap Three.js sprites; pattern RT cost dominates, not sprite motion.',
    ],
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function formatBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * @param {Awaited<ReturnType<typeof runStressBenchmarkSuite>>} report
 */
export function formatBenchmarkReport(report) {
  const lines = [];
  lines.push('# Mezmer stress-test benchmark');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Canvas: ${report.canvas.width}×${report.canvas.height} · profile: ${report.profile}`);
  lines.push(`Heightmap blit in estimates: ${report.displacementEnabled ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## GPU estimates (per frame)');
  lines.push('');
  lines.push(
    '| Mode | Objects | Tile px | Shader passes | MPix/frame | RT memory | Rel. cost |'
  );
  lines.push('|------|---------|---------|---------------|------------|-----------|-----------|');
  for (const row of report.gpuEstimates) {
    lines.push(
      `| ${row.mode} | ${row.objectCount} | ${row.tileSizePx} | ${row.shaderPassesPerFrame} | ${(row.pixelsWrittenPerFrame / 1e6).toFixed(2)} | ${formatBytes(row.rtMemoryBytes)} | ${row.relativeShaderCost}× |`
    );
  }
  lines.push('');
  lines.push('## CPU layout benchmarks (median ms)');
  lines.push('');
  lines.push('| Task | ms |');
  lines.push('|------|-----|');
  for (const row of report.cpuBenchmarks) {
    lines.push(`| ${row.task} | ${row.medianMs} |`);
  }
  lines.push('');
  lines.push('## Notes');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');
  return lines.join('\n');
}
