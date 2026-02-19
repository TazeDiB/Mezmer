const fs = require('fs');
const path = require('path');
const legacyPath = path.join(__dirname, '..', 'src', 'legacy', 'recovered-app.js');
const outPath = path.join(__dirname, '..', 'src', 'hooks', 'useWebGL.js');
const lines = fs.readFileSync(legacyPath, 'utf8').split('\n');

// Extract from "var yL =" (line 19532, index 19531) to end of bL (line 21508, index 21507)
const startIdx = 19531;
const endIdx = 21507;
let body = lines.slice(startIdx, endIdx + 1).join('\n');

// Three.js and React replacements (order matters)
const replacements = [
  ['new Kc(', 'new THREE.DataTexture('],
  ['new _L(', 'new THREE.WebGLRenderer('],
  ['new mx(', 'new THREE.OrthographicCamera('],
  ['new Nr(', 'new THREE.WebGLRenderTarget('],
  ['new Sr(', 'new THREE.Mesh('],
  ['new Wl(', 'new THREE.PlaneGeometry('],
  ['new ii(', 'new THREE.ShaderMaterial('],
  ['new Ep(', 'new THREE.MeshBasicMaterial('],
  ['new Tt(', 'new THREE.Vector2('],
  ['new z(', 'new THREE.Vector3('],
  ['new ad', 'new THREE.Scene'],
  ['aA.clamp(', 'THREE.MathUtils.clamp('],
  ['type: bl', 'type: THREE.HalfFloatType'],
  ['ZS', 'THREE.RedFormat'],
  ['Ti)', 'THREE.UnsignedByteType)'],
  ['Ti,', 'THREE.UnsignedByteType,'],
  ['Q.current', 'Q.current'], // leave
  ['Qn', 'THREE.RGBAFormat'],
  ['fn', 'THREE.LinearFilter'],
  ['lr', 'THREE.ClampToEdgeWrapping'],
  ['\bP\.', 'React.'],
];
// Apply (use replaceAll for P. and for Qn/fn/lr to avoid double-replace)
body = body.replace(/\bP\./g, 'React.');
body = body.replace(/\bQn\b/g, 'THREE.RGBAFormat');
body = body.replace(/\bfn\b/g, 'THREE.LinearFilter');
body = body.replace(/\blr\b/g, 'THREE.ClampToEdgeWrapping');
body = body.replace(/new Kc\(/g, 'new THREE.DataTexture(');
body = body.replace(/new _L\(/g, 'new THREE.WebGLRenderer(');
body = body.replace(/new mx\(/g, 'new THREE.OrthographicCamera(');
body = body.replace(/new Nr\(/g, 'new THREE.WebGLRenderTarget(');
body = body.replace(/new Sr\(/g, 'new THREE.Mesh(');
body = body.replace(/new Wl\(/g, 'new THREE.PlaneGeometry(');
body = body.replace(/new ii\(/g, 'new THREE.ShaderMaterial(');
body = body.replace(/new Ep\(/g, 'new THREE.MeshBasicMaterial(');
body = body.replace(/new Tt\(/g, 'new THREE.Vector2(');
body = body.replace(/new z\(/g, 'new THREE.Vector3(');
body = body.replace(/new ad\b/g, 'new THREE.Scene');
body = body.replace(/aA\.clamp\(/g, 'THREE.MathUtils.clamp(');
body = body.replace(/type: bl\b/g, 'type: THREE.HalfFloatType');
body = body.replace(/\bZS\b/g, 'THREE.RedFormat');
body = body.replace(/\bTi\b/g, 'THREE.UnsignedByteType');

// Rename bL to useWebGL and make it a named export (keep param names for internal refs)
body = body.replace(/^const bL = \(t, e, n, r, i, o, s, a, l, c, f, d, h, p, g\) => \{/, 'export function useWebGL(t, e, n, r, i, o, s, a, l, c, f, d, h, p, g) {');

const header = `/**
 * WebGL / Three.js hook: scene, renderer, shaders, feedback, audio texture.
 * Extracted from legacy bundle; uses 'three' package.
 */
import * as THREE from 'three';
import React from 'react';

`;

fs.writeFileSync(outPath, header + body, 'utf8');
console.log('Wrote', outPath, 'lines', startIdx + 1, '-', endIdx + 1);
process.exit(0);
