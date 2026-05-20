/**
 * Gallery wall edge seam blending — adjacency, motion helpers, shared GLSL.
 * Interior faces stay independent; edge bands blend motion + color + displacement.
 */
import * as THREE from 'three';
import { GALLERY_FACE_COUNT } from './galleryStack.js';

/** Edge band width in face UV space (0–1). */
export const GALLERY_EDGE_BLEND = 0.1;

const HW = 9.0;
const HH = 5.0;
const HD = 9.0;

/**
 * Per-face edge neighbors: [uMin, uMax, vMin, vMax].
 * BoxGeometry order: +x, -x, +y, -y, +z, -z.
 */
export const GALLERY_FACE_EDGE_NEIGHBORS = [
  [4, 5, 3, 2],
  [5, 4, 3, 2],
  [1, 0, 4, 5],
  [1, 0, 5, 4],
  [0, 1, 3, 2],
  [1, 0, 3, 2],
];

/** Shared world ↔ face UV helpers (matches galleryMapping.js / worldHitToGallerySurface). */
export function galleryFaceUVToWorld(face, u, v) {
  switch (face) {
    case 0:
      return { x: HW, y: v * 2 * HH - HH, z: HD - u * 2 * HD };
    case 1:
      return { x: -HW, y: v * 2 * HH - HH, z: u * 2 * HD - HD };
    case 2:
      return { x: u * 2 * HW - HW, y: HH, z: HD - v * 2 * HD };
    case 3:
      return { x: u * 2 * HW - HW, y: -HH, z: v * 2 * HD - HD };
    case 4:
      return { x: HW - u * 2 * HW, y: v * 2 * HH - HH, z: HD };
    case 5:
      return { x: u * 2 * HW - HW, y: v * 2 * HH - HH, z: -HD };
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

export function galleryWorldToFaceUV(face, p) {
  switch (face) {
    case 0:
      return { u: (-p.z + HD) / (2 * HD), v: (p.y + HH) / (2 * HH) };
    case 1:
      return { u: (p.z + HD) / (2 * HD), v: (p.y + HH) / (2 * HH) };
    case 2:
      return { u: (p.x + HW) / (2 * HW), v: (-p.z + HD) / (2 * HD) };
    case 3:
      return { u: (p.x + HW) / (2 * HW), v: (p.z + HD) / (2 * HD) };
    case 4:
      return { u: (-p.x + HW) / (2 * HW), v: (p.y + HH) / (2 * HH) };
    case 5:
      return { u: (p.x + HW) / (2 * HW), v: (p.y + HH) / (2 * HH) };
    default:
      return { u: 0.5, v: 0.5 };
  }
}

/** Integrated animation time per face (integrated + wall timeOffset). */
export function getGalleryFaceIntegratedTimes(faceStates, wallStacks) {
  return Array.from({ length: GALLERY_FACE_COUNT }, (_, face) => {
    const fs = faceStates[face];
    const wall = wallStacks[face];
    return (fs?.integrated ?? 0) + (wall?.timeOffset ?? 0);
  });
}

/** Edge-neighbor integrated times for one face (vec4: uMin, uMax, vMin, vMax). */
export function getGalleryEdgeNeighborTimes(faceIndex, integratedTimes) {
  const neighbors = GALLERY_FACE_EDGE_NEIGHBORS[faceIndex] ?? GALLERY_FACE_EDGE_NEIGHBORS[0];
  return neighbors.map((n) => integratedTimes[n] ?? 0);
}

/** Edge-neighbor motion distortion driver (global scale + average layer distortion). */
export function getGalleryEdgeNeighborDistortion(faceIndex, wallStacks, globalScale = 1) {
  const neighbors = GALLERY_FACE_EDGE_NEIGHBORS[faceIndex] ?? GALLERY_FACE_EDGE_NEIGHBORS[0];
  return neighbors.map((n) => {
    const wall = wallStacks[n];
    if (!wall?.layers?.length) return globalScale;
    const avgLayerDistortion =
      wall.layers.reduce((sum, layer) => sum + (layer.distortion ?? 0), 0) / wall.layers.length;
    return globalScale + avgLayerDistortion;
  });
}

/** Build neighbor lookup GLSL for edge indices 0–3. */
function buildNeighborLookupGLSL() {
  const lines = [];
  for (let face = 0; face < GALLERY_FACE_COUNT; face++) {
    const n = GALLERY_FACE_EDGE_NEIGHBORS[face];
    lines.push(`  if (fi < ${face + 0.5}) {`);
    lines.push(`    if (edge < 0.5) return ${n[0]}.0;`);
    lines.push(`    if (edge < 1.5) return ${n[1]}.0;`);
    lines.push(`    if (edge < 2.5) return ${n[2]}.0;`);
    lines.push(`    return ${n[3]}.0;`);
    lines.push('  }');
  }
  lines.push('  if (fi < 5.5) {');
  const n5 = GALLERY_FACE_EDGE_NEIGHBORS[5];
  lines.push(`    if (edge < 0.5) return ${n5[0]}.0;`);
  lines.push(`    if (edge < 1.5) return ${n5[1]}.0;`);
  lines.push(`    if (edge < 2.5) return ${n5[2]}.0;`);
  lines.push(`    return ${n5[3]}.0;`);
  lines.push('  }');
  return lines.join('\n');
}

/** Fragment-only: face textures for color seam composite (7 samplers max with u_display). */
export const GALLERY_SEAM_FACE_UNIFORM_DECL = `
uniform sampler2D u_galleryFaceTex0;
uniform sampler2D u_galleryFaceTex1;
uniform sampler2D u_galleryFaceTex2;
uniform sampler2D u_galleryFaceTex3;
uniform sampler2D u_galleryFaceTex4;
uniform sampler2D u_galleryFaceTex5;
uniform float u_galleryEdgeBlend;
uniform float u_faceIndex;
`;

/** @deprecated use GALLERY_SEAM_FACE_UNIFORM_DECL */
export const GALLERY_SEAM_UNIFORM_DECL = GALLERY_SEAM_FACE_UNIFORM_DECL;

/** Create face texture uniform slots for wall display materials. */
export function createGallerySeamUniforms() {
  return {
    u_galleryFaceTex0: { value: null },
    u_galleryFaceTex1: { value: null },
    u_galleryFaceTex2: { value: null },
    u_galleryFaceTex3: { value: null },
    u_galleryFaceTex4: { value: null },
    u_galleryFaceTex5: { value: null },
    u_galleryEdgeBlend: { value: GALLERY_EDGE_BLEND },
    u_faceIndex: { value: 0 },
  };
}

export const GALLERY_SEAM_COLOR_GLSL = `
const float GALLERY_HW = ${HW};
const float GALLERY_HH = ${HH};
const float GALLERY_HD = ${HD};

vec3 gallerySeamFaceUVToWorld(float face, vec2 fuv) {
  if (face < 0.5) return vec3(GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, GALLERY_HD - fuv.x * 2.0 * GALLERY_HD);
  if (face < 1.5) return vec3(-GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, fuv.x * 2.0 * GALLERY_HD - GALLERY_HD);
  if (face < 2.5) return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, GALLERY_HH, GALLERY_HD - fuv.y * 2.0 * GALLERY_HD);
  if (face < 3.5) return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, -GALLERY_HH, fuv.y * 2.0 * GALLERY_HD - GALLERY_HD);
  if (face < 4.5) return vec3(GALLERY_HW - fuv.x * 2.0 * GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, GALLERY_HD);
  return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, -GALLERY_HD);
}

vec2 gallerySeamWorldToFaceUV(float face, vec3 p) {
  if (face < 0.5) return vec2((-p.z + GALLERY_HD) / (2.0 * GALLERY_HD), (p.y + GALLERY_HH) / (2.0 * GALLERY_HH));
  if (face < 1.5) return vec2((p.z + GALLERY_HD) / (2.0 * GALLERY_HD), (p.y + GALLERY_HH) / (2.0 * GALLERY_HH));
  if (face < 2.5) return vec2((p.x + GALLERY_HW) / (2.0 * GALLERY_HW), (-p.z + GALLERY_HD) / (2.0 * GALLERY_HD));
  if (face < 3.5) return vec2((p.x + GALLERY_HW) / (2.0 * GALLERY_HW), (p.z + GALLERY_HD) / (2.0 * GALLERY_HD));
  if (face < 4.5) return vec2((-p.x + GALLERY_HW) / (2.0 * GALLERY_HW), (p.y + GALLERY_HH) / (2.0 * GALLERY_HH));
  return vec2((p.x + GALLERY_HW) / (2.0 * GALLERY_HW), (p.y + GALLERY_HH) / (2.0 * GALLERY_HH));
}

float gallerySeamEdgeNeighbor(float fi, float edge) {
${buildNeighborLookupGLSL()}
  return 0.0;
}

vec4 gallerySeamEdgeWeights(vec2 uv, float edgeBlend) {
  float wU0 = 1.0 - smoothstep(0.0, edgeBlend, uv.x);
  float wU1 = 1.0 - smoothstep(0.0, edgeBlend, 1.0 - uv.x);
  float wV0 = 1.0 - smoothstep(0.0, edgeBlend, uv.y);
  float wV1 = 1.0 - smoothstep(0.0, edgeBlend, 1.0 - uv.y);
  return vec4(wU0, wU1, wV0, wV1);
}

vec4 gallerySeamSampleFace(int idx, vec2 uv) {
  if (idx == 0) return texture2D(u_galleryFaceTex0, uv);
  if (idx == 1) return texture2D(u_galleryFaceTex1, uv);
  if (idx == 2) return texture2D(u_galleryFaceTex2, uv);
  if (idx == 3) return texture2D(u_galleryFaceTex3, uv);
  if (idx == 4) return texture2D(u_galleryFaceTex4, uv);
  return texture2D(u_galleryFaceTex5, uv);
}

vec3 gallerySeamCompositeColor(float faceIndex, vec2 uv, vec3 selfColor) {
  vec4 weights = gallerySeamEdgeWeights(uv, u_galleryEdgeBlend);
  float totalW = 1.0;
  vec3 sum = selfColor;
  vec3 worldPos = gallerySeamFaceUVToWorld(faceIndex, uv);

  for (int e = 0; e < 4; e++) {
    float w = weights[e];
    if (w <= 0.001) continue;
    float nf = gallerySeamEdgeNeighbor(faceIndex, float(e));
    vec2 nuv = gallerySeamWorldToFaceUV(nf, worldPos);
    nuv = clamp(nuv, 0.001, 0.999);
    sum += gallerySeamSampleFace(int(nf), nuv).rgb * w;
    totalW += w;
  }
  return sum / totalW;
}
`;

/** 2D blit pass: composite edge seams into a byte display target. */
export const GALLERY_SEAM_BLIT_FRAG = `
precision highp float;
uniform sampler2D u_self;
${GALLERY_SEAM_FACE_UNIFORM_DECL}
${GALLERY_SEAM_COLOR_GLSL}
varying vec2 vUv;

void main() {
  vec3 selfColor = texture2D(u_self, vUv).rgb;
  vec3 color = gallerySeamCompositeColor(u_faceIndex, vUv, selfColor);
  gl_FragColor = vec4(color, 1.0);
}
`;

/** Create ortho blit scene for gallery seam compositing. */
export function createGallerySeamBlitPass() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: GALLERY_SEAM_BLIT_FRAG,
      uniforms: {
        u_self: { value: null },
        ...createGallerySeamUniforms(),
      },
      depthTest: false,
      depthWrite: false,
    })
  );
  scene.add(mesh);
  return { scene, camera, mesh };
}

/** Blit one face through the seam composite into its byte displayMap. */
export function blitGalleryFaceSeam(
  renderer,
  blitScene,
  blitCamera,
  blitMesh,
  selfTexture,
  faceTextures,
  faceIndex,
  displayMapTarget,
  edgeBlend = GALLERY_EDGE_BLEND
) {
  if (!renderer || !blitScene || !blitCamera || !blitMesh || !selfTexture || !displayMapTarget) return;
  const uniforms = blitMesh.material?.uniforms;
  if (!uniforms) return;

  uniforms.u_self.value = selfTexture;
  uniforms.u_faceIndex.value = faceIndex;
  uniforms.u_galleryEdgeBlend.value = edgeBlend;
  for (let f = 0; f < GALLERY_FACE_COUNT; f++) {
    uniforms[`u_galleryFaceTex${f}`].value = faceTextures[f] ?? selfTexture;
  }

  renderer.setRenderTarget(displayMapTarget);
  renderer.clear();
  renderer.render(blitScene, blitCamera);
}

/** Bind all six face display textures onto wall materials. */
export function bindGallerySeamTextures(materials, faceTextures, edgeBlend = GALLERY_EDGE_BLEND) {
  if (!materials?.length) return;
  for (let i = 0; i < materials.length; i++) {
    const mat = materials[i];
    if (!mat?.uniforms) continue;
    const u = mat.uniforms;
    if (u.u_galleryFaceTex0) {
      for (let f = 0; f < GALLERY_FACE_COUNT; f++) {
        u[`u_galleryFaceTex${f}`].value = faceTextures[f] ?? null;
      }
    }
    if (u.u_galleryEdgeBlend) u.u_galleryEdgeBlend.value = edgeBlend;
    if (u.u_faceIndex) u.u_faceIndex.value = i;
  }
}
