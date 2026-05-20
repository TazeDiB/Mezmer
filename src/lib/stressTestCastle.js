/**
 * Procedural 3D castle layout — floor tiles, wall bricks, roof shingles.
 * Uniform grid, corner towers, gate, solid parapet, stepped keep roof.
 */

/** @typedef {'brick' | 'tile' | 'shingle'} CastlePartType */

/**
 * @typedef {Object} CastlePart
 * @property {CastlePartType} type
 * @property {[number, number, number]} position
 * @property {[number, number, number]} scale
 * @property {[number, number, number]} rotation
 */

const G = 0.012;
const P = 0.44;
const BH = 0.16;

const FLOOR_TH = 0.05;
const FLOOR_Y = FLOOR_TH * 0.5;
const WALL_BASE = FLOOR_TH;
const ROOF_STEP = BH * 0.62;
const ROOF_LIFT = G * 3;

/** Full cell footprint on the wall/grid axes — matches floor tile fix. */
const BRICK_SCALE = [P, BH, P];
const TILE_SCALE = [P, FLOOR_TH, P];
const SHINGLE_SCALE = [P, BH * 0.5, P];

function brickY(course) {
  return WALL_BASE + BH * 0.5 + course * BH;
}

function parapetTopY(course) {
  return brickY(course) + BH * 0.5;
}

function gx(i) {
  return i * P;
}

function brickSlotKey(face, course, ix, iz) {
  return `wall:${face}:${course}:${ix}:${iz}`;
}

function worldKey(type, x, y, z) {
  return `${type}:${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

function pushPart(parts, occupied, type, x, y, z, scale, rotX = 0, rotY = 0, rotZ = 0) {
  const k = worldKey(type, x, y, z);
  if (occupied.has(k)) return false;
  occupied.add(k);
  parts.push({ type, position: [x, y, z], scale, rotation: [rotX, rotY, rotZ] });
  return true;
}

function placeWallBrick(parts, occupied, face, course, ix, iz, rotY = 0) {
  const slot = brickSlotKey(face, course, ix, iz);
  if (occupied.has(slot)) return false;
  occupied.add(slot);

  const y = brickY(course);
  let x;
  let z;
  if (face === 'ns') {
    x = gx(ix);
    z = gx(iz);
  } else {
    x = gx(ix);
    z = gx(iz);
  }
  return pushPart(parts, occupied, 'brick', x, y, z, BRICK_SCALE, 0, rotY, 0);
}

function pushTile(parts, occupied, ix, iz) {
  return pushPart(parts, occupied, 'tile', gx(ix), FLOOR_Y, gx(iz), TILE_SCALE);
}

function pushShingle(parts, occupied, x, y, z) {
  return pushPart(parts, occupied, 'shingle', x, y, z, SHINGLE_SCALE, 0, 0, 0);
}

function deriveCastleSize(targetCount) {
  const t = Math.pow(targetCount / 100, 0.38);
  return {
    halfLen: Math.max(2, Math.round(1.5 + t * 2.8)),
    halfDep: Math.max(2, Math.round(1.2 + t * 2.2)),
    courses: Math.max(3, Math.round(2 + t * 1.8)),
    towerExtra: Math.max(2, Math.round(1.5 + t * 2.2)),
  };
}

function fillCourtyardFloor(parts, occupied, ixMin, ixMax, izMin, izMax) {
  for (let ix = ixMin; ix <= ixMax; ix++) {
    for (let iz = izMin; iz <= izMax; iz++) {
      pushTile(parts, occupied, ix, iz);
    }
  }
}

function wallCourseNS(parts, occupied, limit, wallZ, course, ixMin, ixMax, skipIx = () => false) {
  for (let ix = ixMin; ix <= ixMax && parts.length < limit; ix++) {
    if (skipIx(ix, course)) continue;
    placeWallBrick(parts, occupied, 'ns', course, ix, wallZ);
  }
}

function wallCourseEW(parts, occupied, limit, wallX, course, izMin, izMax) {
  for (let iz = izMin; iz <= izMax && parts.length < limit; iz++) {
    placeWallBrick(parts, occupied, 'ew', course, wallX, iz, Math.PI / 2);
  }
}

function wallParapet(parts, occupied, limit, outerX, outerZ, parapetCourse, ixMin, ixMax, izMin, izMax) {
  wallCourseNS(parts, occupied, limit, -outerZ, parapetCourse, ixMin, ixMax);
  wallCourseNS(parts, occupied, limit, outerZ, parapetCourse, ixMin, ixMax);
  wallCourseEW(parts, occupied, limit, -outerX, parapetCourse, izMin, izMax);
  wallCourseEW(parts, occupied, limit, outerX, parapetCourse, izMin, izMax);
}

function cornerTower(parts, occupied, limit, cornerIx, cornerIz, totalCourses) {
  for (let course = 0; course < totalCourses && parts.length < limit; course++) {
    const slot = brickSlotKey('tower', course, cornerIx, cornerIz);
    if (occupied.has(slot)) continue;
    occupied.add(slot);
    pushPart(parts, occupied, 'brick', gx(cornerIx), brickY(course), gx(cornerIz), BRICK_SCALE);
  }
}

function crenellationNS(parts, occupied, limit, wallZ, merlonCourse, ixMin, ixMax) {
  for (let ix = ixMin; ix <= ixMax && parts.length < limit; ix++) {
    if (Math.abs(ix) % 2 !== 0) continue;
    placeWallBrick(parts, occupied, 'ns', merlonCourse, ix, wallZ);
  }
}

function crenellationEW(parts, occupied, limit, wallX, merlonCourse, izMin, izMax) {
  for (let iz = izMin; iz <= izMax && parts.length < limit; iz++) {
    if (Math.abs(iz) % 2 !== 0) continue;
    placeWallBrick(parts, occupied, 'ew', merlonCourse, wallX, iz, Math.PI / 2);
  }
}

function towerMerlon(parts, occupied, limit, cornerIx, cornerIz, merlonCourse) {
  if (parts.length >= limit) return;
  const slot = brickSlotKey('tower', merlonCourse, cornerIx, cornerIz);
  if (occupied.has(slot)) return;
  occupied.add(slot);
  pushPart(parts, occupied, 'brick', gx(cornerIx), brickY(merlonCourse), gx(cornerIz), BRICK_SCALE);
}

/** Stepped roof — courtyard only, lifted above the parapet (never on wall cells). */
function fillSteppedKeepRoof(parts, occupied, limit, ixMin, ixMax, izMin, izMax, roofBaseY) {
  let inset = 0;
  while (parts.length < limit) {
    const x0 = ixMin + inset;
    const x1 = ixMax - inset;
    const z0 = izMin + inset;
    const z1 = izMax - inset;
    if (x0 > x1 || z0 > z1) break;

    const y = roofBaseY + inset * ROOF_STEP;
    for (let ix = x0; ix <= x1 && parts.length < limit; ix++) {
      for (let iz = z0; iz <= z1 && parts.length < limit; iz++) {
        pushShingle(parts, occupied, gx(ix), y, gx(iz));
      }
    }
    inset += 1;
  }
}

function towerRoof(parts, occupied, limit, cornerIx, cornerIz, baseY) {
  for (let layer = 0; layer < 4 && parts.length < limit; layer++) {
    const y = baseY + layer * ROOF_STEP;
    pushShingle(parts, occupied, gx(cornerIx), y, gx(cornerIz));
  }
}

function buildCastleAtSize({ halfLen, halfDep, courses, towerExtra }, count) {
  /** @type {CastlePart[]} */
  const parts = [];
  /** @type {Set<string>} */
  const occupied = new Set();

  const outerX = halfLen;
  const outerZ = halfDep;
  const ixWallMin = -halfLen + 1;
  const ixWallMax = halfLen - 1;
  const izWallMin = -halfDep + 1;
  const izWallMax = halfDep - 1;

  fillCourtyardFloor(parts, occupied, ixWallMin, ixWallMax, izWallMin, izWallMax);

  // Single-row gate opening on the south wall (course 0 only).
  const isGate = (ix, course) => course === 0 && ix === 0;

  for (let course = 0; course < courses && parts.length < count; course++) {
    wallCourseNS(parts, occupied, count, -outerZ, course, ixWallMin, ixWallMax);
    wallCourseNS(parts, occupied, count, outerZ, course, ixWallMin, ixWallMax, isGate);
    wallCourseEW(parts, occupied, count, -outerX, course, izWallMin, izWallMax);
    wallCourseEW(parts, occupied, count, outerX, course, izWallMin, izWallMax);
  }

  const towerCourses = courses + towerExtra;
  const corners = [
    [-outerX, -outerZ],
    [outerX, -outerZ],
    [-outerX, outerZ],
    [outerX, outerZ],
  ];

  for (const [cix, ciz] of corners) {
    if (parts.length >= count) break;
    cornerTower(parts, occupied, count, cix, ciz, towerCourses);
  }

  const parapetCourse = courses;
  const merlonCourse = courses + 1;

  wallParapet(
    parts,
    occupied,
    count,
    outerX,
    outerZ,
    parapetCourse,
    ixWallMin,
    ixWallMax,
    izWallMin,
    izWallMax
  );

  crenellationNS(parts, occupied, count, -outerZ, merlonCourse, ixWallMin, ixWallMax);
  crenellationNS(parts, occupied, count, outerZ, merlonCourse, ixWallMin, ixWallMax);
  crenellationEW(parts, occupied, count, -outerX, merlonCourse, izWallMin, izWallMax);
  crenellationEW(parts, occupied, count, outerX, merlonCourse, izWallMin, izWallMax);

  for (const [cix, ciz] of corners) {
    towerMerlon(parts, occupied, count, cix, ciz, merlonCourse);
  }

  const roofBaseY = parapetTopY(parapetCourse) + ROOF_LIFT + SHINGLE_SCALE[1] * 0.5;
  fillSteppedKeepRoof(
    parts,
    occupied,
    count,
    ixWallMin,
    ixWallMax,
    izWallMin,
    izWallMax,
    roofBaseY
  );

  const merlonTopY = brickY(merlonCourse) + BH * 0.5;
  for (const [cix, ciz] of corners) {
    if (parts.length >= count) break;
    towerRoof(parts, occupied, count, cix, ciz, merlonTopY + ROOF_LIFT);
  }

  return { parts, occupied, corners, towerCourses, halfLen, halfDep };
}

/**
 * @param {number} targetCount
 * @returns {CastlePart[]}
 */
export function generateCastleParts(targetCount) {
  const count = Math.max(1, Math.round(targetCount));
  let size = deriveCastleSize(count);
  let { parts, occupied, corners, towerCourses } = buildCastleAtSize(size, count);

  let guard = 0;
  while (parts.length < count && guard < 60) {
    size = {
      halfLen: size.halfLen + 1,
      halfDep: size.halfDep + 1,
      courses: size.courses + (guard % 2 === 0 ? 1 : 0),
      towerExtra: size.towerExtra + 1,
    };
    ({ parts, occupied, corners, towerCourses } = buildCastleAtSize(size, count));
    guard += 1;
  }

  let extraCourse = towerCourses + 1;
  let cornerIdx = 0;
  while (parts.length < count) {
    const [cix, ciz] = corners[cornerIdx % corners.length];
    const slot = brickSlotKey('tower', extraCourse, cix, ciz);
    if (!occupied.has(slot)) {
      occupied.add(slot);
      pushPart(parts, occupied, 'brick', gx(cix), brickY(extraCourse), gx(ciz), BRICK_SCALE);
      cornerIdx += 1;
      if (cornerIdx % corners.length === 0) extraCourse += 1;
    } else {
      extraCourse += 1;
      if (extraCourse > towerCourses + 80) break;
    }
  }

  return parts.slice(0, count);
}

export function getCastleBounds(parts) {
  if (!parts?.length) {
    return { center: [0, 0, 0], radius: 6 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const part of parts) {
    const [x, y, z] = part.position;
    const [sx, sy, sz] = part.scale;
    minX = Math.min(minX, x - sx * 0.5);
    maxX = Math.max(maxX, x + sx * 0.5);
    minY = Math.min(minY, y - sy * 0.5);
    maxY = Math.max(maxY, y + sy * 0.5);
    minZ = Math.min(minZ, z - sz * 0.5);
    maxZ = Math.max(maxZ, z + sz * 0.5);
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 0.55 + 2.5;
  return { center: [cx, cy, cz], radius };
}
