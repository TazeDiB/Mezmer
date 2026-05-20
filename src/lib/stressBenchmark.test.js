import { describe, it, expect } from 'vitest';
import {
  estimateStressGpuMetrics,
  buildGpuEstimateTable,
  attachRelativeCost,
  benchmarkStressCpuTasks,
  BENCHMARK_PROFILE_STANDARD,
} from './stressBenchmark.js';

describe('stressBenchmark', () => {
  it('estimates higher shader pass count for more objects', () => {
    const small = estimateStressGpuMetrics({ mode: 'cubes3d', count: 4 });
    const large = estimateStressGpuMetrics({ mode: 'cubes3d', count: 32 });
    expect(large.shaderPassesPerFrame).toBeGreaterThan(small.shaderPassesPerFrame);
    expect(large.objectCount).toBe(32);
  });

  it('particles match cubes shader pass count at equal object count', () => {
    const cubes = estimateStressGpuMetrics({ mode: 'cubes3d', count: 16 });
    const particles = estimateStressGpuMetrics({ mode: 'particles3d', count: 16 });
    expect(particles.shaderPassesPerFrame).toBe(cubes.shaderPassesPerFrame);
    expect(particles.objectCount).toBe(16);
  });

  it('castle1000 exceeds 1k shader passes', () => {
    const row = estimateStressGpuMetrics({ mode: 'castle1000', count: 1000 });
    expect(row.objectCount).toBe(1000);
    expect(row.shaderPassesPerFrame).toBe(2000);
  });

  it('builds standard profile table with relative costs', () => {
    const rows = attachRelativeCost(buildGpuEstimateTable(BENCHMARK_PROFILE_STANDARD));
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.relativeShaderCost >= 0)).toBe(true);
  });

  it('benchmarks castle generation under reasonable time', () => {
    const tasks = benchmarkStressCpuTasks();
    const gen100 = tasks.find((t) => t.task === 'generateCastleParts(100)');
    expect(gen100?.medianMs).toBeGreaterThan(0);
    expect(gen100?.medianMs).toBeLessThan(500);
  });
});
