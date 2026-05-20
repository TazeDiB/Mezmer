/**
 * Reusable pattern heightmap displacement for any gallery mesh.
 * Flat material = textured display; displaced material = vertex displacement from luminance height map.
 */
import * as THREE from 'three';
import {
  createGallerySeamBlitPass,
  blitGalleryFaceSeam,
  GALLERY_EDGE_BLEND,
} from './gallerySeams.js';
import { GALLERY_FACE_COUNT } from './galleryStack.js';

export { GALLERY_EDGE_BLEND };

export const DEFAULT_DISPLACEMENT_SEGMENTS = 64;
export const DEFAULT_DISPLACEMENT_STRENGTH = 0.12;
export const AUDIO_DISPLACEMENT_PULSE = 0.04;

/** Displacement tuning per shape — avoids edge overlap on sharp-corner meshes like cubes. */
export const DISPLACEMENT_SHAPE_PRESETS = {
  box: { edgeFade: 0.22, strengthScale: 0.55 },
  cone: { edgeFade: 0.0, strengthScale: 0.85 },
  sphere: { edgeFade: 0.0, strengthScale: 1.0 },
  wall: { edgeFade: 0.18, strengthScale: 1.0 },
};

export const FLOATING_SHAPE_KIND = {
  sphere: 0,
  cone: 1,
  box: 2,
};

const FLOATING_SHAPE_GLSL = `
const float F_TAU = 6.28318530718;

uniform float u_shapeKind;
uniform float u_shapeHeight;
uniform float u_shapeHalfExtent;
uniform float u_displacementEdgeFade;

float floatingTriplanarScale() {
  return 1.0 / max(u_shapeHalfExtent * 2.0, 0.001);
}

vec3 floatingTriplanarSample(sampler2D tex, vec3 p, vec3 n) {
  vec3 an = abs(normalize(n));
  an = max(an, vec3(0.0001));
  an /= an.x + an.y + an.z;
  float inv = floatingTriplanarScale();
  vec3 sx = texture2D(tex, p.zy * inv + 0.5).rgb;
  vec3 sy = texture2D(tex, p.xz * inv + 0.5).rgb;
  vec3 sz = texture2D(tex, p.xy * inv + 0.5).rgb;
  return sx * an.x + sy * an.y + sz * an.z;
}

vec2 floatingConeUnifiedUv(vec3 p) {
  float h = max(u_shapeHeight, 0.001);
  float r = max(u_shapeHalfExtent, 0.001);
  float angle = atan(p.z, p.x) / F_TAU + 0.5;
  float vHeight = clamp((p.y + h * 0.5) / h, 0.0, 1.0);
  float radial = clamp(length(p.xz) / r, 0.0, 1.0);
  float baseBand = 0.2;
  float vSide = baseBand + vHeight * (1.0 - baseBand);
  float vBase = radial * baseBand;
  float sideW = smoothstep(0.0, 0.05, vHeight);
  float v = mix(vBase, vSide, sideW);
  return vec2(angle, v);
}

vec3 floatingConeSideNormal(vec3 p) {
  float h = max(u_shapeHeight, 0.001);
  float r = max(u_shapeHalfExtent, 0.001);
  vec3 ax = vec3(p.x, 0.0, p.z);
  float axLen = length(ax);
  if (axLen < 0.00001) {
    return vec3(0.0, 1.0, 0.0);
  }
  vec3 outward = ax / axLen;
  float slope = r / h;
  return normalize(vec3(outward.x, slope, outward.z));
}

vec3 floatingConeDispDir(vec3 p, vec3 n) {
  vec3 nn = normalize(n);
  float h = max(u_shapeHeight, 0.001);
  float r = max(u_shapeHalfExtent, 0.001);
  float vHeight = clamp((p.y + h * 0.5) / h, 0.0, 1.0);
  float radial = clamp(length(p.xz) / r, 0.0, 1.0);
  if (vHeight > 0.06) {
    return nn;
  }
  vec3 sideN = floatingConeSideNormal(p);
  float rimBlend = smoothstep(0.0, 0.88, radial);
  vec3 target = normalize(mix(vec3(0.0, sideN.y * 0.45, 0.0), sideN, rimBlend));
  float onBase = smoothstep(-0.45, -0.85, nn.y);
  return normalize(mix(nn, target, onBase * 0.95));
}

vec3 sampleTexSeamlessU(sampler2D tex, vec2 uv) {
  vec3 cC = texture2D(tex, uv).rgb;
  vec3 cL = texture2D(tex, vec2(uv.x - 1.0, uv.y)).rgb;
  vec3 cR = texture2D(tex, vec2(uv.x + 1.0, uv.y)).rgb;
  float wL = 1.0 - smoothstep(0.0, 0.08, uv.x);
  float wR = smoothstep(0.92, 1.0, uv.x);
  vec3 c = mix(cC, cL, wL);
  return mix(c, cR, wR);
}

vec3 floatingSampleCone(sampler2D tex, vec3 p, vec3 n) {
  return sampleTexSeamlessU(tex, floatingConeUnifiedUv(p));
}

vec3 floatingSampleColor(sampler2D tex, vec3 p, vec3 n, vec2 meshUv) {
  vec3 color = texture2D(tex, meshUv).rgb;
  if (u_shapeKind < 0.5) {
    color = floatingTriplanarSample(tex, p, n);
  } else if (u_shapeKind < 1.5) {
    color = floatingSampleCone(tex, p, n);
  }
  return color;
}

float floatingSampleHeight(sampler2D tex, vec3 p, vec3 n, vec2 meshUv) {
  return dot(floatingSampleColor(tex, p, n, meshUv), vec3(0.299, 0.587, 0.114));
}

float floatingDisplacementMask(vec3 p, vec3 n, vec2 meshUv) {
  if (u_shapeKind > 1.5 && u_displacementEdgeFade > 0.0) {
    float edgeDist = min(min(meshUv.x, 1.0 - meshUv.x), min(meshUv.y, 1.0 - meshUv.y));
    return smoothstep(0.0, u_displacementEdgeFade, edgeDist);
  }
  return 1.0;
}
`;

const FLOATING_SHAPE_VERT = `
precision highp float;
${FLOATING_SHAPE_GLSL}
varying vec3 vObjPos;
varying vec3 vObjNormal;
varying vec2 vMeshUv;

void main() {
  vObjPos = position;
  vObjNormal = normal;
  vMeshUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FLOATING_DISPLACED_VERT = `
precision highp float;
uniform sampler2D u_heightMap;
uniform float u_displacementStrength;
${FLOATING_SHAPE_GLSL}
varying vec3 vObjPos;
varying vec3 vObjNormal;
varying vec2 vMeshUv;

void main() {
  vObjPos = position;
  vObjNormal = normal;
  vMeshUv = uv;
  vec3 pos = position;
  float h = floatingSampleHeight(u_heightMap, position, normal, uv);
  float disp = (h - 0.5) * 2.0 * u_displacementStrength;
  disp *= floatingDisplacementMask(position, normal, uv);
  vec3 dispDir = normal;
  if (u_shapeKind >= 0.5 && u_shapeKind < 1.5) {
    dispDir = floatingConeDispDir(position, normal);
  }
  pos += dispDir * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FLOATING_SHAPE_FRAG = `
precision highp float;
uniform sampler2D u_display;
${FLOATING_SHAPE_GLSL}
varying vec3 vObjPos;
varying vec3 vObjNormal;
varying vec2 vMeshUv;

void main() {
  gl_FragColor = vec4(floatingSampleColor(u_display, vObjPos, vObjNormal, vMeshUv), 1.0);
}
`;

export const HEIGHT_MAP_RT_OPTIONS = {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  stencilBuffer: false,
};

export const HEIGHT_BLIT_FRAG = `
precision highp float;
uniform sampler2D u_src;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(u_src, vUv).rgb;
  float h = dot(c, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(h, h, h, 1.0);
}
`;

export const BLIT_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Flat textured material (MeshBasicMaterial). */
export function createFlatDisplayMaterial({
  side = THREE.FrontSide,
  toneMapped = false,
} = {}) {
  return new THREE.MeshBasicMaterial({ side, toneMapped });
}

/** Gallery wall flat material — MeshBasicMaterial (seams applied in 2D blit pass). */
export function createGalleryWallFlatMaterial({ side = THREE.FrontSide } = {}) {
  const mat = createFlatDisplayMaterial({ side, toneMapped: false });
  mat.color.set(0xffffff);
  return mat;
}

/** Gallery wall displaced material (seams already in displayMap). */
export function createGalleryWallDisplacedMaterial({
  side = THREE.FrontSide,
  strength = DEFAULT_DISPLACEMENT_STRENGTH,
  edgeFade = DISPLACEMENT_SHAPE_PRESETS.wall.edgeFade,
} = {}) {
  const preset = DISPLACEMENT_SHAPE_PRESETS.wall;
  const mat = createDisplacedPatternMaterial({ side, strength, edgeFade });
  mat.userData.displacementStrengthScale = preset.strengthScale ?? 1;
  return mat;
}

export function createGalleryWallFlatMaterials() {
  return Array.from({ length: GALLERY_FACE_COUNT }, () =>
    createGalleryWallFlatMaterial({ side: THREE.FrontSide })
  );
}

export function createGalleryWallDisplacedMaterials() {
  return Array.from({ length: GALLERY_FACE_COUNT }, () =>
    createGalleryWallDisplacedMaterial({ side: THREE.FrontSide })
  );
}

export { createGallerySeamBlitPass, blitGalleryFaceSeam };

function resolveFloatingShapeUniforms(displacementPreset, geometry) {
  const kind = FLOATING_SHAPE_KIND[displacementPreset] ?? FLOATING_SHAPE_KIND.sphere;
  const params = geometry?.parameters ?? {};
  let shapeHeight = 1.0;
  let shapeHalfExtent = 0.5;

  if (displacementPreset === 'cone') {
    shapeHeight = params.height ?? 1.45;
    shapeHalfExtent = params.radius ?? 0.72;
  } else if (displacementPreset === 'box') {
    shapeHalfExtent = (params.width ?? params.height ?? 1.15) * 0.5;
  } else if (displacementPreset === 'sphere') {
    shapeHalfExtent = params.radius ?? 0.82;
  }

  return {
    u_shapeKind: { value: kind },
    u_shapeHeight: { value: shapeHeight },
    u_shapeHalfExtent: { value: shapeHalfExtent },
  };
}

/** Flat material for floating props — seamless shape-aware sampling. */
export function createFloatingFlatMaterial({
  side = THREE.FrontSide,
  displacementPreset = 'sphere',
  geometry = null,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_display: { value: null },
      u_displacementEdgeFade: { value: 0 },
      ...resolveFloatingShapeUniforms(displacementPreset, geometry),
    },
    vertexShader: FLOATING_SHAPE_VERT,
    fragmentShader: FLOATING_SHAPE_FRAG,
    side,
    depthTest: true,
    depthWrite: true,
  });
}

/** Displaced material for floating props — same sampling as flat for seamless displacement. */
export function createFloatingDisplacedMaterial({
  side = THREE.FrontSide,
  strength = DEFAULT_DISPLACEMENT_STRENGTH,
  displacementPreset = 'sphere',
  geometry = null,
  edgeFade = 0,
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_display: { value: null },
      u_heightMap: { value: null },
      u_displacementStrength: { value: strength },
      u_displacementEdgeFade: { value: edgeFade },
      ...resolveFloatingShapeUniforms(displacementPreset, geometry),
    },
    vertexShader: FLOATING_DISPLACED_VERT,
    fragmentShader: FLOATING_SHAPE_FRAG,
    side,
    depthTest: true,
    depthWrite: true,
  });
}

/** Displaced material for gallery walls (standard UV — planes only). */
export function createDisplacedPatternMaterial({
  side = THREE.FrontSide,
  strength = DEFAULT_DISPLACEMENT_STRENGTH,
  edgeFade = 0,
} = {}) {
  const WALL_DISPLACED_VERT = `
precision highp float;
uniform sampler2D u_heightMap;
uniform float u_displacementStrength;
uniform float u_displacementEdgeFade;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float h = texture2D(u_heightMap, uv).r;
  float disp = (h - 0.5) * 2.0 * u_displacementStrength;
  float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeMask = u_displacementEdgeFade <= 0.0
    ? 1.0
    : smoothstep(0.0, u_displacementEdgeFade, edgeDist);
  pos += normal * disp * edgeMask;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

  const WALL_DISPLACED_FRAG = `
precision highp float;
uniform sampler2D u_display;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(texture2D(u_display, vUv).rgb, 1.0);
}
`;

  return new THREE.ShaderMaterial({
    uniforms: {
      u_display: { value: null },
      u_heightMap: { value: null },
      u_displacementStrength: { value: strength },
      u_displacementEdgeFade: { value: edgeFade },
    },
    vertexShader: WALL_DISPLACED_VERT,
    fragmentShader: WALL_DISPLACED_FRAG,
    side,
    depthTest: true,
    depthWrite: true,
  });
}

/** Height-map render target matching a pattern surface size. */
export function createHeightMapTarget(THREE, width, height, options = HEIGHT_MAP_RT_OPTIONS) {
  return new THREE.WebGLRenderTarget(width, height, options);
}

/**
 * Build a mesh entry that can toggle between flat and displaced rendering.
 * @param {object} params
 * @param {THREE.BufferGeometry} params.geometry — use subdivided geometry for displacement
 * @param {number} [params.side=THREE.FrontSide]
 * @param {object} [params.meshOptions] — position, rotation, userData, frustumCulled
 */
export function createDisplaceableMesh({
  geometry,
  side = THREE.FrontSide,
  meshOptions = {},
  displacementPreset = 'sphere',
}) {
  const preset = DISPLACEMENT_SHAPE_PRESETS[displacementPreset] ?? DISPLACEMENT_SHAPE_PRESETS.sphere;
  const flatMaterial = displacementPreset === 'box'
    ? createFlatDisplayMaterial({ side })
    : createFloatingFlatMaterial({ side, displacementPreset, geometry });
  const displacedMaterial = createFloatingDisplacedMaterial({
    side,
    strength: DEFAULT_DISPLACEMENT_STRENGTH,
    displacementPreset,
    geometry,
    edgeFade: preset.edgeFade ?? 0,
  });
  displacedMaterial.userData.displacementStrengthScale = preset.strengthScale ?? 1;
  const mesh = new THREE.Mesh(geometry, flatMaterial);
  mesh.frustumCulled = meshOptions.frustumCulled ?? false;
  mesh.userData.displacementPreset = displacementPreset;

  if (meshOptions.position) {
    mesh.position.set(meshOptions.position.x, meshOptions.position.y, meshOptions.position.z);
  }
  if (meshOptions.rotation) {
    mesh.rotation.set(meshOptions.rotation.x, meshOptions.rotation.y, meshOptions.rotation.z);
  }
  if (meshOptions.userData) {
    Object.assign(mesh.userData, meshOptions.userData);
  }

  return { mesh, geometry, flatMaterial, displacedMaterial };
}

/** Add a displaceable mesh to a scene. */
export function addDisplaceableMeshToScene(scene, entry) {
  scene.add(entry.mesh);
  return entry;
}

/**
 * Bind generated pattern textures and pick flat vs displaced material.
 * Works for any single-material mesh (floating props, future shapes).
 */
export function bindDisplaceableMeshTextures(entry, {
  displayTexture,
  heightMapTexture = null,
  useHeightmap = false,
}) {
  if (!entry?.mesh) return;

  const resolvedDisplay =
    displayTexture ??
    entry.displacedMaterial?.uniforms?.u_display?.value ??
    entry.flatMaterial?.uniforms?.u_display?.value ??
    entry.flatMaterial?.map ??
    null;
  if (!resolvedDisplay) return;

  resolvedDisplay.minFilter = THREE.LinearFilter;
  resolvedDisplay.magFilter = THREE.LinearFilter;
  resolvedDisplay.wrapS = THREE.RepeatWrapping;
  resolvedDisplay.wrapT = THREE.RepeatWrapping;

  if (useHeightmap && entry.displacedMaterial) {
    const disp = entry.displacedMaterial;
    if (disp.uniforms.u_display) disp.uniforms.u_display.value = resolvedDisplay;
    if (heightMapTexture && disp.uniforms.u_heightMap) {
      disp.uniforms.u_heightMap.value = heightMapTexture;
    }
    if (entry.mesh.material !== disp) entry.mesh.material = disp;
    return;
  }

  if (entry.flatMaterial) {
    if (entry.flatMaterial.uniforms?.u_display) {
      entry.flatMaterial.uniforms.u_display.value = resolvedDisplay;
    } else if (entry.flatMaterial.map !== undefined) {
      entry.flatMaterial.map = resolvedDisplay;
      entry.flatMaterial.toneMapped = false;
      entry.flatMaterial.needsUpdate = true;
    }
    if (entry.mesh.material !== entry.flatMaterial) entry.mesh.material = entry.flatMaterial;
  }
}

/** Bind textures for one face in a multi-material mesh (gallery walls). */
export function bindFacePatternTextures(flatMaterial, displacedMaterial, {
  displayTexture,
  heightMapTexture = null,
  useHeightmap = false,
}) {
  if (!flatMaterial) return;

  if (displayTexture) {
    displayTexture.minFilter = THREE.LinearFilter;
    displayTexture.magFilter = THREE.LinearFilter;
    displayTexture.generateMipmaps = false;
    displayTexture.flipY = false;
  }

  const bindDisplay = (mat) => {
    if (!mat) return;
    if (mat.uniforms?.u_display) {
      mat.uniforms.u_display.value = displayTexture;
    } else if (mat.isMeshBasicMaterial) {
      mat.map = displayTexture;
      mat.color.set(0xffffff);
      mat.toneMapped = false;
      mat.needsUpdate = true;
    } else if (mat.map !== undefined) {
      mat.map = displayTexture;
      mat.toneMapped = false;
      mat.needsUpdate = true;
    }
    if (useHeightmap && mat.uniforms?.u_heightMap) {
      mat.uniforms.u_heightMap.value = heightMapTexture;
    }
  };

  bindDisplay(flatMaterial);
  bindDisplay(displacedMaterial);
}

/** Switch a multi-material room mesh between flat face materials and displaced face materials. */
export function setMultiMaterialDisplacement(mesh, flatMaterials, displacedMaterials, useHeightmap) {
  if (!mesh) return;
  mesh.material = useHeightmap && displacedMaterials ? displacedMaterials : flatMaterials;
}

/** Update displacement strength on shader materials (walls + floating props). */
export function updateDisplacementStrength(materials, baseStrength) {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials];
  for (const mat of list) {
    if (!mat?.uniforms?.u_displacementStrength) continue;
    const scale = mat.userData?.displacementStrengthScale ?? 1;
    mat.uniforms.u_displacementStrength.value = baseStrength * scale;
  }
}

/** Blit pattern luminance into a height-map render target. */
export function blitPatternHeightMap(renderer, blitScene, blitCamera, blitMesh, sourceTexture, heightMapTarget) {
  if (!renderer || !blitScene || !blitCamera || !blitMesh || !sourceTexture || !heightMapTarget) return;
  const uniforms = blitMesh.material?.uniforms;
  if (!uniforms?.u_src) return;
  uniforms.u_src.value = sourceTexture;
  renderer.setRenderTarget(heightMapTarget);
  renderer.clear();
  renderer.render(blitScene, blitCamera);
}

/** Create height-blit scene (call once at init). */
export function createHeightBlitPass() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: BLIT_VERT,
      fragmentShader: HEIGHT_BLIT_FRAG,
      uniforms: { u_src: { value: null } },
      depthTest: false,
      depthWrite: false,
    })
  );
  scene.add(mesh);
  return { scene, camera, mesh };
}

/** Collect displaced materials from wall faces + floating prop entries. */
export function collectDisplacementMaterials(faceDisplacedMaterials, floatingEntries) {
  const mats = [];
  if (faceDisplacedMaterials) mats.push(...faceDisplacedMaterials);
  if (floatingEntries) {
    for (const entry of floatingEntries) {
      if (entry?.displacedMaterial) mats.push(entry.displacedMaterial);
    }
  }
  return mats;
}
