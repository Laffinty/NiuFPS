// 轻量工具：确定性随机、二维噪声、几何计算。
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(ix, iz, seed = 1) {
  let h = seed ^ (ix * 374761393) ^ (iz * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, z, seed = 1) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export function fbm(x, z, octaves = 4, seed = 1) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, z * frequency, seed + i * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function angleLerp(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * clamp(t, 0, 1);
}

// 返回射线命中圆柱体的最近距离，未命中返回 Infinity。
// cylinder: { x, z, radius, minY, maxY }
export function raycastCylinder(origin, direction, cylinder) {
  const ox = origin.x;
  const oz = origin.z;
  const dx = direction.x;
  const dz = direction.z;
  const cx = cylinder.x;
  const cz = cylinder.z;
  const r = cylinder.radius;

  const px = ox - cx;
  const pz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-8) return Infinity;

  const b = 2 * (px * dx + pz * dz);
  const c = px * px + pz * pz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;

  const sqrt = Math.sqrt(disc);
  let t = (-b - sqrt) / (2 * a);
  if (t < 0) t = (-b + sqrt) / (2 * a);
  if (t < 0) return Infinity;

  const y = origin.y + direction.y * t;
  if (y < cylinder.minY || y > cylinder.maxY) return Infinity;
  return t;
}

export function raycastSphere(origin, direction, center, radius) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  if (c > 0 && b > 0) return Infinity;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  let t = -b - Math.sqrt(disc);
  if (t < 0) t = -b + Math.sqrt(disc);
  return t < 0 ? Infinity : t;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
