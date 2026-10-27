// Low-level pixel drawing. Everything is drawn at logical resolution with integer rects,
// then scaled up with smoothing disabled, so edges stay crisp.

export function canvas(w, h) {
  const c = typeof OffscreenCanvas !== "undefined" && typeof document === "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export function rect(g, x, y, w, h, c) {
  if (c) g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export const px = (g, x, y, c) => rect(g, x, y, 1, 1, c);

// Convex polygon via scanlines, so slopes are pixel-stepped rather than antialiased.
export function poly(g, pts, c) {
  g.fillStyle = c;
  let minY = Infinity,
    maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  minY = Math.round(minY);
  maxY = Math.round(maxY);
  for (let y = minY; y < maxY; y++) {
    const sy = y + 0.5;
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i],
        [x2, y2] = pts[(i + 1) % pts.length];
      if ((sy < y1 && sy < y2) || (sy > y1 && sy > y2) || y1 === y2) continue;
      const x = x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1);
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
    if (hi > lo) g.fillRect(Math.round(lo), y, Math.max(1, Math.round(hi) - Math.round(lo)), 1);
  }
}
export function ellipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = -ry; y < ry; y++) {
    const t = (y + 0.5) / ry,
      w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}
export function ring(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  const steps = Math.max(24, Math.round((rx + ry) * 3));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}
export function line(g, x0, y0, x1, y1, c, w = 1) {
  g.fillStyle = c;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.fillRect(Math.round(x0 + (x1 - x0) * t - (w - 1) / 2), Math.round(y0 + (y1 - y0) * t - (w - 1) / 2), w, w);
  }
}

// Colour helpers with a cache: tints toward a warm white, shades toward a warm dark.
const shades = new Map();
const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export function shade(c, f) {
  const key = c + f;
  if (shades.has(key)) return shades.get(key);
  const [r, g, b] = hex(c);
  const out = f >= 0 ? toHex(r + (255 - r) * f, g + (246 - g) * f, b + (225 - b) * f) : toHex(r + (r - 38) * f, g + (g - 30) * f, b + (b - 40) * f);
  shades.set(key, out);
  return out;
}
export function mix(a, b, t) {
  const [r1, g1, b1] = hex(a),
    [r2, g2, b2] = hex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export const OUTLINE = "#2c2420";

// Adds a 1px outline around opaque pixels of a small canvas (sprites, icons, text).
export function outlined(src, color = OUTLINE) {
  const w = src.width,
    h = src.height,
    g = src.getContext("2d"),
    data = g.getImageData(0, 0, w, h),
    a = data.data,
    out = canvas(w, h),
    o = out.getContext("2d");
  o.fillStyle = color;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 40;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) o.fillRect(x, y, 1, 1);
  o.drawImage(src, 0, 0);
  return out;
}
export function flipped(src) {
  const out = canvas(src.width, src.height),
    o = out.getContext("2d");
  o.translate(src.width, 0);
  o.scale(-1, 1);
  o.drawImage(src, 0, 0);
  return out;
}

// Seeded hash for stable "random" scenery.
export function hash(n) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
