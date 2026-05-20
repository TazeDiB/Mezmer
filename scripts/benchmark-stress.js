#!/usr/bin/env node
/**
 * Run vitest + stress CPU/GPU estimate benchmarks for tuning.
 *
 * Usage:
 *   npm run benchmark:stress
 *   npm run benchmark:stress -- --full
 *   npm run benchmark:stress -- --json benchmarks/my-run.json
 *   npm run benchmark:stress -- --displacement
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runStressBenchmarkSuite,
  formatBenchmarkReport,
} from '../src/lib/stressBenchmark.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const args = process.argv.slice(2);
const full = args.includes('--full');
const displacement = args.includes('--displacement');
const jsonFlagIndex = args.indexOf('--json');
const jsonOut =
  jsonFlagIndex >= 0
    ? args[jsonFlagIndex + 1] ?? join(root, 'benchmarks', 'stress-latest.json')
    : join(root, 'benchmarks', 'stress-latest.json');

console.log('Running unit tests (vitest)...\n');
const testRun = spawnSync('npm', ['test'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (testRun.status !== 0) {
  console.error('\nVitest failed — fix tests before recording benchmarks.');
  process.exit(testRun.status ?? 1);
}

console.log('\nRunning stress benchmark suite...\n');
const report = await runStressBenchmarkSuite({ full, displacementEnabled: displacement });
const markdown = formatBenchmarkReport(report);

console.log(markdown);

mkdirSync(dirname(jsonOut), { recursive: true });
writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`\nWrote JSON: ${jsonOut}`);

if (!args.includes('--json')) {
  console.log('Tip: archive runs with `npm run benchmark:stress -- --json benchmarks/2026-05-19.json`');
}
