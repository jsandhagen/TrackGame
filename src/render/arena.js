import { rect, poly, ellipse, line, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";
import { styleOf, trackColorOf, roofColorOf, stadiumNameOf } from "../game-content.js";

// The club stadium. The ground is drawn top-down and everything built on it has height:
// a point at ground (x, y) with elevation z appears at screen (x, y − z). Stands are a
// height field, rendered back to front, so rows rise as real tiers with risers you can see,
// near stands show their outer wall, and roofs float above the seats.
//
// Grandstand levels: 0 an open field round a gravel track · 1 metal bleachers on the home
// straight · 2 a covered main stand with bleachers opposite · 3 stands all round ·
// 4 an Olympic bowl with a ring roof. Where nothing is built the ground stays flat.
// The outer footprint follows the oval of the track, so a full set of stands makes a round bowl.
export const BOWL = { x: 56, y: 76, w: 448, h: 292, r: 146 };
const DEPTH = { n: 52, s: 20, w: 32, e: 32 },
  APRON = 6;
const inset = (b, l, t, r = l, bb = t) => {
  const w = b.w - l - r,
    h = b.h - t - bb;
  return { x: b.x + l, y: b.y + t, w, h, r: Math.max(2, Math.min(Math.floor(h / 2), b.r - Math.min(l, t, r, bb))) };
};
export const FIELD = { x: BOWL.x + DEPTH.w, y: BOWL.y + DEPTH.n, w: BOWL.w - DEPTH.w - DEPTH.e, h: BOWL.h - DEPTH.n - DEPTH.s, r: 0 };
FIELD.r = Math.floor(FIELD.h / 2);
export const TRACK = { ...inset(FIELD, APRON, APRON), r: 0 };
TRACK.r = Math.floor(TRACK.h / 2);
export const INFIELD = { ...inset(TRACK, 19, 19), r: TRACK.r - 19 };
// A runner's line in lane two, for laps.
export const LANE = { ...inset(TRACK, 5, 5), r: TRACK.r - 5 };
export const CENTER = { x: TRACK.x + TRACK.w / 2, y: TRACK.y + TRACK.h / 2 };
export const GATE = { x: CENTER.x, in: BOWL.y + BOWL.h - DEPTH.s - 2, out: BOWL.y + BOWL.h + 18 };
// The straights: the main stand runs along the home straight (north), the back stand opposite.
const MX0 = Math.round(TRACK.x + TRACK.r * 0.5),
  MX1 = Math.round(TRACK.x + TRACK.w - TRACK.r * 0.5);
const DW = { x: INFIELD.x + INFIELD.r, y: CENTER.y },
  DE = { x: INFIELD.x + INFIELD.w - INFIELD.r, y: CENTER.y };
// Roof geometry (ground y and elevation) for the covered main stand.
const ROOF = { back: BOWL.y - 2, front: BOWL.y + 24, z: 52 };
const roofFrontY = ROOF.front - ROOF.z + 4;
// Installation anchors (where athletes stand) and tap areas, in map coordinates.
export const SPOTS = {
  discus: { x: DW.x - 46, y: CENTER.y - 24, hit: [DW.x - 66, CENTER.y - 52, 44, 42] },
  shot: { x: DW.x - 44, y: CENTER.y + 34, hit: [DW.x - 64, CENTER.y + 20, 48, 26] },
  hammer: { x: DE.x + 46, y: CENTER.y - 24, hit: [DE.x + 24, CENTER.y - 52, 44, 42] },
  jav: { x: DE.x + 44, y: CENTER.y + 34, hit: [DE.x + 10, CENTER.y + 24, 62, 20] },
  track: { x: CENTER.x, y: TRACK.y + TRACK.h - 8, hit: [CENTER.x - 90, TRACK.y + TRACK.h - 19, 180, 19] },
  studio: { x: CENTER.x, y: roofFrontY + 8, hit: [CENTER.x - 30, roofFrontY - 2, 60, 20] },
  stands: { x: CENTER.x - 70, y: BOWL.y + 10, hit: [MX0, BOWL.y - 54, MX1 - MX0, 104] },
  lights: { x: BOWL.x + 8, y: BOWL.y + 20, hit: [BOWL.x - 6, BOWL.y - 70, 28, 94] },
};
const MASTS = [
  [BOWL.x + 6, BOWL.y + 20, false],
  [BOWL.x + BOWL.w - 8, BOWL.y + 20, false],
  [BOWL.x + 4, BOWL.y + BOWL.h - 18, true],
  [BOWL.x + BOWL.w - 6, BOWL.y + BOWL.h - 18, true],
];

export function roundRect(g, { x, y, w, h, r }, c) {
  g.fillStyle = c;
  for (let yy = 0; yy < h; yy++) {
    let ins = 0;
    if (yy < r) ins = r - Math.round(Math.sqrt(Math.max(0, r * r - (r - yy - 0.5) ** 2)));
    else if (yy >= h - r) ins = r - Math.round(Math.sqrt(Math.max(0, r * r - (yy - (h - r) + 0.5) ** 2)));
    g.fillRect(Math.round(x + ins), Math.round(y + yy), Math.round(w - ins * 2), 1);
  }
}
// A point on a rounded rectangle's outline, for runners and walkers. Returns [x, y, direction].
export function loopPoint(b, u) {
  const { x, y, w, h, r } = b,
    sw = w - 2 * r,
    sh = h - 2 * r,
    arc = (Math.PI * r) / 2,
    total = 2 * sw + 2 * sh + 4 * arc;
  let d = (((u % 1) + 1) % 1) * total;
  const seg = [
    [sw, (t) => [x + r + t, y + h, 1]],
    [arc, (t) => { const a = Math.PI / 2 - t / r; return [x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r, 1]; }],
    [sh, (t) => [x + w, y + h - r - t, 1]],
    [arc, (t) => { const a = -t / r; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r, -1]; }],
    [sw, (t) => [x + w - r - t, y, -1]],
    [arc, (t) => { const a = -Math.PI / 2 - t / r; return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r, -1]; }],
    [sh, (t) => [x, y + r + t, -1]],
    [arc, (t) => { const a = Math.PI - t / r; return [x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r, 1]; }],
  ];
  for (const [len, fn] of seg) {
    if (d <= len) return fn(d);
    d -= len;
  }
  return [x + r, y + h, 1];
}
export const insideBowl = (x, y) => x > BOWL.x + 8 && x < BOWL.x + BOWL.w - 8 && y > BOWL.y + 10 && y < BOWL.y + BOWL.h - 4;

// ── The stands as a height field ───────────────────────────────────────
function inside(b, x, y) {
  if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) return false;
  const dx = x < b.x + b.r ? b.x + b.r - x - 0.5 : x >= b.x + b.w - b.r ? x + 0.5 - (b.x + b.w - b.r) : 0,
    dy = y < b.y + b.r ? b.y + b.r - y - 0.5 : y >= b.y + b.h - b.r ? y + 0.5 - (b.y + b.h - b.r) : 0;
  return dx * dx + dy * dy <= b.r * b.r;
}
const ringAt = (q) => ({ x: FIELD.x - DEPTH.w * q, y: FIELD.y - DEPTH.n * q, w: FIELD.w + (DEPTH.w + DEPTH.e) * q, h: FIELD.h + (DEPTH.n + DEPTH.s) * q, r: FIELD.r + (BOWL.r - FIELD.r) * q });
// How far a point is from the field edge (0) to the outer wall (1); −1 outside, null on the field.
function depthOf(x, y) {
  if (!inside(BOWL, x, y)) return -1;
  if (inside(FIELD, x, y)) return null;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    if (inside(ringAt(mid), x, y)) hi = mid;
    else lo = mid;
  }
  return hi;
}
const zoneOf = (x, y) => (x >= MX0 && x <= MX1 ? (y < CENTER.y ? "main" : "back") : "end");
// What stands where, by grandstand level: kind (bleacher or seats), rows, rise per row,
// front wall height, and how deep into the stand it reaches (the rest is grass behind).
// The straights proper, between the bends: bleachers are straight-sided structures that sit here.
const SX0 = FIELD.x + FIELD.r,
  SX1 = FIELD.x + FIELD.w - FIELD.r;
function specFor(zone, x, lvl) {
  const straight = x >= SX0 && x <= SX1;
  if (lvl === 1) return zone === "main" && straight ? { kind: "bleacher", rows: 8, rise: 2.5, front: 2, reach: 0.72 } : null;
  if (lvl === 2) {
    if (zone === "main") return { kind: "seats", rows: 13, rise: 3, front: 4, reach: 1 };
    if (zone === "back" && straight) return { kind: "bleacher", rows: 5, rise: 2, front: 2, reach: 0.8 };
    return null;
  }
  if (lvl === 3) return { main: { kind: "seats", rows: 13, rise: 3, front: 4, reach: 1 }, back: { kind: "seats", rows: 7, rise: 2.2, front: 3, reach: 1 }, end: { kind: "seats", rows: 9, rise: 2.6, front: 3, reach: 1 } }[zone];
  if (lvl >= 4) return { main: { kind: "seats", rows: 14, rise: 3.2, front: 4, reach: 1 }, back: { kind: "seats", rows: 8, rise: 2.2, front: 3, reach: 1 }, end: { kind: "seats", rows: 12, rise: 3, front: 3, reach: 1 } }[zone];
  return null;
}

const RGB = new Map();
function rgb(c) {
  let v = RGB.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    RGB.set(c, v);
  }
  return v;
}
// Spectator spots found while drawing the stands: [x, y, seated].
let SEATS = [];

function stands(g, s, season) {
  const lvl = s.stadium.stands,
    style = styleOf(s),
    snow = season === 3,
    colors = s.colors;
  const X0 = BOWL.x,
    Y0 = BOWL.y - 80,
    W = BOWL.w,
    H = BOWL.h + 82;
  const img = g.getImageData(X0, Y0, W, H),
    data = img.data,
    owner = new Int32Array(W * H).fill(-1);
  const put = (x, y, c, id) => {
    const sx = x - X0,
      sy = y - Y0;
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const i = (sy * W + sx) * 4,
      [r, gg, b] = rgb(c);
    data[i] = r;
    data[i + 1] = gg;
    data[i + 2] = b;
    data[i + 3] = 255;
    owner[sy * W + sx] = id;
  };
  // Heights and cell info for every ground point in the bowl.
  const GW = BOWL.w,
    GH = BOWL.h + 2,
    hgt = new Float32Array(GW * GH),
    info = new Array(GW * GH);
  for (let gx = 0; gx < GW; gx++)
    for (let gy = 0; gy < GH; gy++) {
      const x = BOWL.x + gx,
        y = BOWL.y + gy,
        q = depthOf(x, y);
      if (q == null || q < 0) continue;
      const zone = zoneOf(x, y),
        sp = specFor(zone, x, lvl);
      if (zone === "back" && Math.abs(x - CENTER.x) < 9) continue; // the players' tunnel
      if (!sp || q > sp.reach) continue;
      const t = q / sp.reach,
        rowPos = t * sp.rows,
        row = Math.min(sp.rows - 1, Math.floor(rowPos)),
        h = sp.front + (row + 1) * sp.rise;
      hgt[gx * GH + gy] = h;
      info[gx * GH + gy] = { zone, q, sp, row, frac: rowPos - Math.floor(rowPos) };
    }
  const H_ = (gx, gy) => (gx < 0 || gy < 0 || gx >= GW || gy >= GH ? 0 : hgt[gx * GH + gy]);
  const seatA = colors.primary,
    seatB = colors.secondary;
  const seatColor = (x, y, c) => {
    const pat = style.seats;
    if (pat === "stripes") return c.row % 2 ? seatB : seatA;
    if (pat === "twotone") return c.row < c.sp.rows / 2 ? seatA : seatB;
    if (pat === "blocks") return (c.zone === "end" ? Math.floor((y - BOWL.y) / 30) : Math.floor((x - MX0) / 36)) % 2 ? seatB : seatA;
    return seatA;
  };
  const wing = (x, c) => lvl <= 3 && (c.zone === "main" || c.zone === "back") && (c.sp.kind === "bleacher" ? x - SX0 < 2 || SX1 - x < 2 : lvl < 3 && (x - MX0 < 3 || MX1 - x < 3));
  const aisle = (x, y, c) => (c.zone === "end" ? (y - BOWL.y) % 30 < 2 : (x - MX0 + 6) % 36 < 2);
  function top(x, y, c) {
    const { sp } = c;
    if (wing(x, c)) return "#d8d0c0";
    if (sp.kind === "bleacher") return c.frac < 0.45 ? (x % 12 === 0 ? "#8a8e92" : "#d4d8dc") : "#5a5e62";
    if (aisle(x, y, c)) return snow ? "#f4f6f8" : "#c8c2b4";
    if (c.frac < 0.5) {
      const col = seatColor(x, y, c);
      return x % 2 ? shade(col, -0.12) : col;
    }
    return snow ? "#eef2f4" : "#b0aa9e";
  }
  // Vertical faces we can see: risers facing the field, the pitch-side boards and outer walls.
  const boards = [colors.primary, "#f4f0e4", "#c84a40", "#2c4a7a", colors.secondary];
  function face(x, c, k, len, below) {
    if (below === "outside" && lvl >= 4) {
      // A light steel diagrid over pale cladding, with a club-colour band and glazed entrances.
      if (k === 0) return "#eef0f0";
      if (k === 1) return "#6a7076";
      if (k === 3) return colors.primary;
      if (k === len - 1) return "#8a8e92";
      if (len >= 10 && x % 32 >= 13 && x % 32 <= 18 && k >= len - 7) return k === len - 7 ? "#3a4652" : "#6a8aa8";
      return (x + k) % 10 === 0 || (x - k + 100) % 10 === 0 ? "#a8aeb4" : "#dcdcd6";
    }
    if (below === "outside") {
      if (k === 0) return "#d8d0c0";
      if (k === 2) return colors.primary;
      if (k === len - 1) return "#7a7064";
      if (x % 16 < 2) return "#c8bea8";
      if (len >= 8 && x % 16 >= 7 && x % 16 <= 10 && k >= len - 6) return "#4a4038";
      return "#b4aa98";
    }
    if (wing(x, c)) return "#a8a090";
    if (below === "field" && c.sp.kind === "seats") return k === 0 ? "#f4f0e4" : boards[Math.floor(x / 16) % boards.length];
    if (c.sp.kind === "bleacher") return x % 12 === 0 ? "#9aa0a4" : "#3e4246";
    return k === 0 ? "#c8c2b4" : "#8e887e";
  }
  let id = 0;
  const spots = [];
  for (let gx = 0; gx < GW; gx++) {
    const x = BOWL.x + gx;
    for (let gy = 0; gy < GH; gy++) {
      const h = hgt[gx * GH + gy];
      if (!h) continue;
      const c = info[gx * GH + gy],
        y = BOWL.y + gy,
        hz = Math.round(h),
        hn = Math.round(H_(gx, gy + 1)),
        sy = y - hz;
      id++;
      put(x, sy, top(x, y, c), id);
      if (hz - hn >= 1) {
        const nq = depthOf(x, y + 1),
          below = nq == null ? "field" : nq < 0 ? "outside" : "stand",
          len = hz - hn;
        for (let k = 0; k < len; k++) put(x, sy + 1 + k, face(x, c, k, len, below), id);
      }
      // Remember places where people sit: the front of each seat row.
      const seatRow = c.frac < 0.2 && !wing(x, c) && !aisle(x, y, c);
      const roofed = lvl >= 4 && c.q > RING.inner - 0.05 && c.zone !== "back";
      if (!roofed && seatRow && x % 3 === 0) spots.push([x, sy, true, id]);
    }
  }
  g.putImageData(img, X0, Y0);
  // Standing spectators on the grass outside the rail wherever there are no stands.
  const ring = { ...ringAt(0.12) };
  ring.r = Math.round(ring.r);
  const per = Math.round(2 * (ring.w - 2 * ring.r) + 2 * Math.PI * ring.r);
  for (let i = 0; i < per; i += 5) {
    const [x, y] = loopPoint(ring, i / per),
      gx = Math.round(x) - BOWL.x,
      gy = Math.round(y) - BOWL.y;
    if (gx >= 0 && gy >= 0 && gx < GW && gy < GH && hgt[gx * GH + gy]) continue;
    if (Math.abs(x - CENTER.x) < 14 && y > CENTER.y) continue;
    spots.push([Math.round(x), Math.round(y) + 2, false, -1]);
  }
  // Keep spectators that are still visible (not hidden behind nearer rows) and not under a roof.
  const covered = (x, y) => lvl >= 2 && x >= MX0 - 2 && x <= MX1 + 2 && y < roofFrontY + 3;
  SEATS = spots.filter(([x, y, , who]) => (who < 0 || owner[(y - Y0) * W + (x - X0)] === who) && !covered(x, y)).map(([x, y, seated]) => [x, y, seated]);
}

// Covered main stand: roof slab, fascia, shadow over the upper rows and support columns.
function mainRoof(g, s, season) {
  const lvl = s.stadium.stands;
  if (lvl < 2 || lvl >= 4) return;
  const x0 = MX0 - 4,
    x1 = MX1 + 4,
    topY = ROOF.back - ROOF.z,
    frontY = roofFrontY,
    c = season === 3 ? "#f2f5f8" : roofColorOf(s);
  g.fillStyle = "rgba(20,24,30,0.28)";
  g.fillRect(x0 + 2, frontY + 3, x1 - x0 - 4, 14);
  for (let x = x0 + 18; x < x1 - 8; x += 46) rect(g, x, frontY + 3, 1, 24, "#5a6066");
  poly(g, [[x0 + 6, topY], [x1 - 6, topY], [x1, frontY], [x0, frontY]], c);
  if (season !== 3) for (let x = x0 + 8; x < x1 - 4; x += 8) rect(g, x, topY + 2, 1, frontY - topY - 2, shade(c, -0.1));
  rect(g, x0 + 6, topY, x1 - x0 - 12, 1, shade(c, 0.3));
  rect(g, x0, frontY, x1 - x0, 3, s.colors.primary);
  rect(g, x0, frontY + 3, x1 - x0, 1, shade(s.colors.primary, -0.4));
  if (s.stadium.lights >= 2) for (let x = x0 + 10; x < x1 - 6; x += 14) rect(g, x, frontY + 1, 3, 1, "#fff4cb");
  text(g, stadiumNameOf(s).toUpperCase().slice(0, 26), CENTER.x, topY + 8, { color: shade(c, -0.35), outline: null, align: "center" });
}
// Olympic bowl: a ring roof over the outer half of the stands, all the way round. It sits a
// little above the stand beneath it (high over the main stand, lower over the near stand), so
// in this view it reads as a continuous band. Over the near side it is a translucent membrane
// so the track stays in view. It is drawn into its own layer and composited once, so the
// translucent part blends evenly.
const RING = { inner: 0.5, zFar: 60, zEnd: 48, zNear: 30 };
function ringRoofZ(x, y) {
  const s = Math.sin(Math.atan2((y - CENTER.y) / (BOWL.h / 2), (x - CENTER.x) / (BOWL.w / 2)));
  return s < 0 ? RING.zEnd + (RING.zFar - RING.zEnd) * -s : RING.zEnd + (RING.zNear - RING.zEnd) * s;
}
function ringRoof(g, s, season) {
  if (s.stadium.stands < 4) return;
  const base = rgb(season === 3 ? "#f2f5f8" : roofColorOf(s)),
    rib = base.map((v) => Math.round(v * 0.93)),
    rim = base.map((v) => Math.min(255, Math.round(v + (255 - v) * 0.35))),
    fascia = rgb(s.colors.primary),
    edge = fascia.map((v) => Math.round(v * 0.55)),
    lamp = rgb("#fff4cb"),
    membrane = rgb("#dfeaf2");
  const X0 = BOWL.x - 2,
    Y0 = BOWL.y - RING.zFar - 4,
    W = BOWL.w + 4,
    H = BOWL.h + RING.zFar + 8,
    layer = new ImageData(W, H),
    d = layer.data;
  const put = (x, y, c, a, onlyEmpty = false) => {
    const sx = x - X0,
      sy = y - Y0;
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const i = (sy * W + sx) * 4;
    if (onlyEmpty && d[i + 3]) return;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = a;
  };
  // Far points first, near points last, so the near band covers the far one where they meet.
  for (let y = BOWL.y; y < BOWL.y + BOWL.h; y++)
    for (let x = BOWL.x; x < BOWL.x + BOWL.w; x++) {
      const q = depthOf(x, y);
      if (q == null || q < RING.inner) continue;
      const z = Math.round(ringRoofZ(x, y)),
        sin = Math.sin(Math.atan2((y - CENTER.y) / (BOWL.h / 2), (x - CENTER.x) / (BOWL.w / 2))),
        alpha = sin < 0.1 ? 255 : sin > 0.5 ? 140 : Math.round(255 - (sin - 0.1) * 287),
        ang = Math.atan2(y - CENTER.y, x - CENTER.x),
        ribbed = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 96) % 2 === 0;
      // The frame (outer rim and inner fascia) is solid all the way round; only the panels
      // over the near stand are see-through.
      const frame = q > (sin > 0.5 ? 0.92 : 0.96) || q < RING.inner + (sin > 0.5 ? 0.07 : 0.035);
      let c = alpha < 255 ? (ribbed ? membrane : membrane.map((v) => Math.round(v * 0.94))) : ribbed ? rib : base;
      if (frame) c = q > RING.inner + 0.1 ? rim : fascia;
      put(x, y - z, c, frame ? 255 : alpha);
      // The inner edge has depth: a dark lip under the fascia, with lamps along the far side.
      if (q < RING.inner + 0.035) {
        put(x, y - z + 1, edge, 255, true);
        put(x, y - z + 2, edge, 150, true);
        if (s.stadium.lights && sin < 0.2 && (x + y) % 14 === 0) put(x, y - z + 1, lamp, 255);
      }
    }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.getContext("2d").putImageData(layer, 0, 0);
  // Slim posts carry the near side of the ring down to the top of the stand.
  for (let x = BOWL.x + 40; x < BOWL.x + BOWL.w - 30; x += 36) {
    let yo = null;
    for (let y = BOWL.y + BOWL.h - 1; y > CENTER.y; y--) if (inside(BOWL, x, y)) { yo = y; break; }
    if (yo == null) continue;
    const z = Math.round(ringRoofZ(x, yo - 2));
    rect(g, x, yo - 2 - z, 1, z - 18, "#8a8e92");
  }
  g.drawImage(c, X0, Y0);
  text(g, stadiumNameOf(s).toUpperCase().slice(0, 26), CENTER.x, BOWL.y - RING.zFar + 6, { color: shade(season === 3 ? "#f2f5f8" : roofColorOf(s), -0.35), outline: null, align: "center" });
}
// The press box: glazed into the main stand under the roof, or a cabin by the track before that.
function pressBox(g, s) {
  const L = s.stadium.studio;
  if (!L) return;
  const w = 22 + L * 12,
    x = Math.round(CENTER.x - w / 2);
  if (s.stadium.stands < 2) {
    const y = BOWL.y + 14;
    rect(g, x - 1, y - 12, w + 2, 13, "#5a5048");
    rect(g, x, y - 11, w, 11, "#e8dcc0");
    rect(g, x + 2, y - 9, w - 4, 5, "#3c5c84");
    rect(g, x - 2, y - 14, w + 4, 2, "#8a5a3a");
    return;
  }
  const y = roofFrontY + 4;
  rect(g, x - 1, y - 1, w + 2, 11, "#2e3a40");
  rect(g, x, y, w, 9, "#3c5c84");
  for (let i = 0; i < w; i += 7) rect(g, x + i, y, 1, 9, "#26323a");
  rect(g, x + 2, y + 1, w - 4, 2, "#8ab4dc");
  if (L >= 2) rect(g, x + w - 6, y + 5, 3, 2, "#e85a50");
  if (L >= 3) {
    rect(g, x + w - 8, ROOF.back - ROOF.z - 14, 1, 14, "#8a8e96");
    ellipse(g, x + 10, ROOF.back - ROOF.z - 4, 5, 3, "#e8ecf0");
  }
}
// The main entrance: an arched gatehouse in the near stand with the stadium's name over it.
function gatehouse(g, s) {
  const gx = CENTER.x,
    gy = BOWL.y + BOWL.h,
    lvl = s.stadium.stands,
    h = lvl >= 3 ? 26 : 16;
  if (lvl < 2) {
    // A gravel path in from the forecourt under a wooden arch with the club's name.
    rect(g, gx - 6, FIELD.y + FIELD.h - 2, 12, gy - FIELD.y - FIELD.h + 4, "#c8b898");
    for (const fx of [gx - 16, gx + 15]) rect(g, fx, gy - 18, 2, 20, "#7a5a3a");
    rect(g, gx - 20, gy - 24, 40, 8, "#8a6a44");
    rect(g, gx - 19, gy - 23, 38, 6, "#e8d8b0");
    text(g, stadiumNameOf(s).slice(0, 6).toUpperCase(), gx, gy - 23, { color: "#5a3a20", outline: null, align: "center" });
    return;
  }
  rect(g, gx - 9, FIELD.y + FIELD.h, 18, gy - FIELD.y - FIELD.h, "#4a4038");
  rect(g, gx - 24, gy - h, 48, h + 2, "#d8d0c0");
  rect(g, gx - 24, gy - h, 48, 1, "#f0ebe0");
  rect(g, gx + 24, gy - h, 3, h + 2, "#a8a090");
  rect(g, gx - 9, gy - 10, 18, 12, "#3a3530");
  rect(g, gx - 7, gy - 12, 14, 2, "#3a3530");
  for (let i = -6; i <= 6; i += 3) rect(g, gx + i, gy - 5, 1, 7, "#8a8e96");
  rect(g, gx - 28, gy - h - 8, 56, 9, s.colors.primary);
  rect(g, gx - 28, gy - h - 8, 56, 1, shade(s.colors.primary, 0.3));
  text(g, stadiumNameOf(s).slice(0, 9).toUpperCase(), gx, gy - h - 7, { color: s.colors.secondary, outline: null, align: "center" });
  for (const fx of [gx - 31, gx + 30]) rect(g, fx, gy - h - 22, 1, h + 24, "#8a8e90");
}

// ── Track and infield ──────────────────────────────────────────────────
function trackAndField(g, s, season) {
  const st = s.stadium,
    snow = season === 3,
    grass = ["#6caa50", "#5e9e48", "#8a9e48", "#dfe8e0"][season];
  const tc = snow ? "#c8c4c0" : trackColorOf(st.track, styleOf(s).track),
    gravel = st.track <= 1;
  if (st.stands >= 3) roundRect(g, FIELD, shade(grass, 0.03));
  const chalk = gravel ? "#e8e0cc" : "#f4f0e4";
  roundRect(g, TRACK, chalk);
  roundRect(g, { ...inset(TRACK, 1, 1), r: TRACK.r - 1 }, tc);
  if (gravel) for (let i = 0; i < 900; i++) {
    const rr = hash(i + 7);
    const p = loopPoint({ ...inset(TRACK, 2 + rr * 15, 2 + rr * 15), r: TRACK.r - 2 - rr * 15 }, hash(i + 3));
    px(g, p[0], p[1], hash(i + 11) < 0.5 ? shade(tc, 0.12) : shade(tc, -0.12));
  }
  const lanes = gravel ? 4 : 6,
    step = 18 / lanes;
  for (let lane = 1; lane < lanes; lane++) {
    const k = Math.round(1 + lane * step);
    roundRect(g, { ...inset(TRACK, k, k), r: TRACK.r - k }, snow ? "#d8d4d0" : gravel ? shade(tc, 0.25) : shade(tc, 0.42));
    roundRect(g, { ...inset(TRACK, k + 1, k + 1), r: TRACK.r - k - 1 }, tc);
  }
  roundRect(g, { ...inset(TRACK, 18, 18), r: TRACK.r - 18 }, chalk);
  roundRect(g, INFIELD, grass);
  // Mowing stripes across the infield, kept inside its rounded ends.
  g.fillStyle = shade(grass, snow ? -0.02 : 0.07);
  for (let yy = 0; yy < INFIELD.h; yy++) {
    const r = INFIELD.r,
      ins = yy < r ? r - Math.round(Math.sqrt(Math.max(0, r * r - (r - yy - 0.5) ** 2))) : yy >= INFIELD.h - r ? r - Math.round(Math.sqrt(Math.max(0, r * r - (yy - (INFIELD.h - r) + 0.5) ** 2))) : 0,
      x0 = INFIELD.x + ins,
      x1 = INFIELD.x + INFIELD.w - ins;
    for (let x = INFIELD.x + 4; x < x1; x += 24) {
      const a = Math.max(x, x0),
        b = Math.min(x + 12, x1);
      if (b > a) g.fillRect(a, INFIELD.y + yy, b - a, 1);
    }
  }
  // Finish line on the home straight, in front of the main stand, with a photo-finish post.
  const fx = CENTER.x + 64;
  for (let y = 0; y < 18; y++) px(g, fx + (y % 2), TRACK.y + 1 + y, y % 2 ? "#2a2a2a" : "#f8f8f0");
  rect(g, fx + 3, FIELD.y + 1, 3, 4, "#3a3e46");
  rect(g, fx + 3, FIELD.y, 3, 1, "#f2c94c");
  // Stagger marks for the 400 m start on the far bend.
  for (let i = 0; i < 5; i++) rect(g, CENTER.x - 70 - i * 8, TRACK.y + TRACK.h - 17 + i * 3, 2, 1, "#f8f8f0");
}
// Jumps on the infield: a pole vault runway and mat by the home straight, long jump pits opposite.
function jumps(g, s) {
  const run = s.stadium.track >= 2 ? trackColorOf(s.stadium.track, styleOf(s).track) : "#b8a888";
  const vy = INFIELD.y + 9,
    vx = CENTER.x - 70;
  rect(g, vx, vy - 2, 90, 4, run);
  rect(g, vx, vy - 2, 90, 1, shade(run, 0.3));
  rect(g, vx + 90, vy - 1, 2, 2, "#5a5e66");
  rect(g, vx + 93, vy - 6, 16, 8, "#2c5aa8");
  rect(g, vx + 93, vy - 7, 16, 2, "#4a7ad0");
  rect(g, vx + 93, vy + 2, 16, 1, "#1e3a70");
  rect(g, vx + 94, vy - 18, 1, 14, "#e8e4dc");
  rect(g, vx + 107, vy - 18, 1, 14, "#e8e4dc");
  rect(g, vx + 94, vy - 16, 14, 1, "#f2c94c");
  const ly = INFIELD.y + INFIELD.h - 10;
  for (const lx of [CENTER.x - 62, CENTER.x + 12]) {
    rect(g, lx, ly - 2, 44, 4, run);
    rect(g, lx + 40, ly - 2, 3, 4, "#f4f0e4");
    rect(g, lx + 44, ly - 4, 18, 8, "#c8b080");
    rect(g, lx + 45, ly - 3, 16, 6, "#e6d4a0");
    px(g, lx + 52, ly, "#c8b080");
  }
}
// ── The throws ─────────────────────────────────────────────────────────
// Each area grows from bare grass to a competition installation:
//  shot     1 concrete circle, wooden stop board, chalk lines on grass
//           2 twin circles, white boards, a clay landing sector
//           3 competition circle on a synthetic pad, raked clay, distance markers, a shot rack
//  discus/  1 practice net on wooden poles round a concrete circle
//  hammer   2 a taller steel cage, crisp sector lines and distance arcs
//           3 a tall competition cage with weighted feet, gate panels and marker boards
//  javelin  1 a mown grass strip with a wooden arc
//           2 a rubber runway with white edges and check marks
//           3 a full competition runway, foul-line extensions, flags and a wind sock
const SQ = 0.6; // sectors are drawn slightly foreshortened
const at = (x, y, dir, r) => [x + Math.cos(dir) * r, y + Math.sin(dir) * r * SQ];
// A filled landing sector (a convex wedge) between two radii.
function wedge(g, x, y, dir, r0, r1, spread, color) {
  const pts = [at(x, y, dir - spread, r0)];
  for (let k = 0; k <= 10; k++) pts.push(at(x, y, dir - spread + (2 * spread * k) / 10, r1));
  pts.push(at(x, y, dir + spread, r0));
  poly(g, pts, color);
}
function sectorLines(g, x, y, dir, len, spread, o = {}) {
  const c = o.snow ? "rgba(120,130,130,0.8)" : o.chalk ? "rgba(250,250,240,0.55)" : "rgba(252,252,246,0.92)",
    soft = o.snow ? "rgba(120,130,130,0.4)" : o.chalk ? "rgba(250,250,240,0.25)" : "rgba(252,252,246,0.45)";
  for (const a of [-spread, spread]) {
    const [ex, ey] = at(x, y, dir + a, len);
    line(g, x, y, ex, ey, c);
  }
  for (let k = 1; k <= (o.arcs ?? 3); k++) {
    const rr = (len * k) / ((o.arcs ?? 3) + 0.4);
    for (let t = -spread; t <= spread; t += 0.04) px(g, ...at(x, y, dir + t, rr), soft);
  }
  // Distance boards just outside one sector line (o.side picks which), and small flags at the
  // far corners.
  const side = o.side || 1;
  for (let k = 1; k <= (o.marks || 0); k++) {
    const [mx, my] = at(x, y, dir + side * (spread + 0.07), (len * k) / (o.marks + 0.6));
    rect(g, mx - 1, my - 5, 1, 5, "#5a5e66");
    rect(g, mx - 2, my - 8, 5, 4, "#f2c94c");
    px(g, mx, my - 7, "#3a3e46");
  }
  if (o.flags)
    for (const a of [-spread, spread]) {
      const [fx, fy] = at(x, y, dir + a, len);
      rect(g, fx, fy - 4, 1, 4, "#e8e4dc");
      rect(g, fx + 1, fy - 4, 3, 2, "#e85a4a");
    }
}
// A throwing circle. Level 1 is bare concrete in the grass; level 3 sits on a synthetic pad.
function circle(g, x, y, lvl, o = {}) {
  if (lvl >= 3) {
    ellipse(g, x, y + 1, 15, 7, shade(o.pad, -0.25));
    ellipse(g, x, y, 14, 6, o.pad);
  } else if (lvl === 2) ellipse(g, x, y, 12, 5, "#cfc8b8");
  ellipse(g, x, y + 1, 9, 4, "rgba(40,50,40,0.3)");
  ellipse(g, x, y, 8, 4, lvl >= 3 ? "#e8ecee" : "#c8c0b0");
  ellipse(g, x, y, 7, 3, lvl >= 2 ? "#6a6e74" : "#9a968c");
  if (lvl === 1) for (let i = 0; i < 5; i++) px(g, x - 5 + Math.round(hash(x + i) * 10), y - 2 + Math.round(hash(y + i) * 4), "#86827a");
  if (lvl >= 3) ellipse(g, x - 2, y - 1, 3, 1, "#7a7e84");
  // Stop board (shot put): curved, on the throwing side; wooden at first, then painted white.
  if (o.board) {
    const c = lvl >= 2 ? "#f4f0e4" : "#a8743e";
    for (let i = -3; i <= 3; i++) rect(g, x + 8 - Math.round(Math.abs(i) * 0.5), y + i * 0.8, 2, 1, c);
  }
}
// A C-shaped safety cage round the back of a circle, open towards the sector. Nets are light
// enough to see the thrower through, and the panels nearest the viewer are almost clear.
function cage(g, x, y, dir, lvl, extra = 0) {
  const h = [0, 14, 22, 30][lvl] + extra,
    n = [0, 6, 9, 11][lvl],
    rx = lvl >= 2 ? 16 : 14,
    ry = lvl >= 2 ? 8 : 7;
  const net = ["", [230, 230, 220, 0.16], [40, 56, 50, 0.16], [22, 26, 30, 0.15]][lvl];
  const pts = Array.from({ length: n }, (_, i) => {
    const a = dir + Math.PI * (0.38 + (1.24 * i) / (n - 1));
    return [Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry)];
  });
  // Competition cages add two hinged gate panels that narrow the mouth.
  if (lvl >= 3)
    for (const side of [-1, 1]) {
      const base = side < 0 ? pts[0] : pts[n - 1],
        a = dir + side * 0.55;
      pts[side < 0 ? "unshift" : "push"]([Math.round(base[0] + Math.cos(a) * 10), Math.round(base[1] + Math.sin(a) * 5)]);
    }
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1],
      [x2, y2] = pts[i],
      near = (y1 + y2) / 2 > y + 1,
      a = near ? net[3] * 0.45 : net[3];
    poly(g, [[x1, y1 - h], [x2, y2 - h], [x2, y2], [x1, y1]], `rgba(${net[0]},${net[1]},${net[2]},${a})`);
    if (lvl >= 2 && !near) for (let k = 6; k < h; k += 6) line(g, x1, y1 - k, x2, y2 - k, "rgba(40,48,46,0.07)");
  }
  pts.forEach(([px_, py], i) => {
    const post = lvl === 1 ? "#8a6038" : "#4a5056";
    rect(g, px_, py - h, 1, h + 1, post);
    if (lvl >= 3) {
      rect(g, px_, py - h, 1, 2, "#d84a3a");
      rect(g, px_ - 1, py - 1, 3, 2, "#2a2e32");
    }
    if (lvl >= 2 && (i === 0 || i === pts.length - 1)) rect(g, px_, py - h - 3, 1, 3, post);
  });
  const top = lvl === 1 ? "#a07a50" : "#3a4046";
  for (let i = 1; i < pts.length; i++) line(g, pts[i - 1][0], pts[i - 1][1] - h, pts[i][0], pts[i][1] - h, top);
}
// Competition dressing: a TV camera on a tripod, and a digital board showing the last mark.
function tvCamera(g, x, y, facing = 1) {
  ellipse(g, x, y + 1, 4, 1, "rgba(30,40,30,0.25)");
  line(g, x, y - 6, x - 3, y, "#4a4e52");
  line(g, x, y - 6, x + 3, y, "#4a4e52");
  rect(g, x, y - 6, 1, 6, "#3a3e42");
  rect(g, x - 3, y - 10, 6, 4, "#2a2e32");
  rect(g, x - 3, y - 10, 6, 1, "#4a4e56");
  rect(g, facing > 0 ? x + 3 : x - 5, y - 9, 2, 2, "#5a6a7a");
  px(g, facing > 0 ? x - 3 : x + 2, y - 11, "#e85a4a");
}
function distanceBoard(g, x, y, mark) {
  const w = mark.length * 6 + 3;
  rect(g, x + 2, y - 4, 1, 4, "#5a5e60");
  rect(g, x + w - 3, y - 4, 1, 4, "#5a5e60");
  rect(g, x - 1, y - 13, w + 2, 10, "#2a2e32");
  rect(g, x, y - 12, w, 8, "#101418");
  text(g, mark, x + Math.floor(w / 2), y - 12, { color: "#f2c94c", outline: null, align: "center" });
}
// A planned installation: chalk outline and corner stakes in the grass, waiting for the build.
function stakedOut(g, x, y, w, h, snow) {
  const c = snow ? "#9aa4a4" : "#e8f0d0";
  for (let i = 0; i < w; i += 3) px(g, x + i, y, c), px(g, x + i, y + h, c);
  for (let i = 0; i < h; i += 3) px(g, x, y + i, c), px(g, x + w, y + i, c);
  for (const [sx, sy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) rect(g, sx, sy - 3, 1, 4, "#b08050");
}
function shotArea(g, s, snow, pad) {
  const L = s.stadium.shot,
    { x, y } = SPOTS.shot,
    dir = 0.05,
    spread = 0.3,
    len = [0, 30, 38, 46][L];
  if (!L) return stakedOut(g, x - 10, y - 6, 20, 12, snow);
  if (L >= 2) {
    // Clay landing sector; raked into arcs at competition level.
    const clay = snow ? "#d8ccc4" : L >= 3 ? "#c4703e" : "#b87a50";
    wedge(g, x, y, dir, 9, len, spread, clay);
    if (L >= 3) for (let r = 14; r < len; r += 3) for (let t = -spread + 0.02; t < spread; t += 0.03) px(g, ...at(x, y, dir + t, r), shade(clay, -0.12));
    wedge(g, x - 4, y + 13, dir, 9, len - 12, spread * 0.8, shade(clay, 0.06));
  }
  sectorLines(g, x, y, dir, len, spread, { snow, chalk: L === 1, arcs: L >= 3 ? 4 : 2, marks: L >= 3 ? 3 : 0, flags: L >= 3, side: -1 });
  circle(g, x, y, L, { board: true, pad });
  if (L >= 2) circle(g, x - 4, y + 13, L, { board: true, pad });
  if (L >= 3) {
    // A rack of shots beside the circle.
    rect(g, x - 24, y - 3, 9, 1, "#5a5e66");
    rect(g, x - 24, y - 2, 1, 3, "#5a5e66");
    rect(g, x - 16, y - 2, 1, 3, "#5a5e66");
    for (let i = 0; i < 3; i++) ellipse(g, x - 22 + i * 3, y - 4, 1, 1, ["#3a3e46", "#7a6a5a", "#3a3e46"][i]);
    distanceBoard(g, x + 34, y + 30, "18.4");
  }
}
function cageArea(g, s, ev, snow, pad) {
  const L = s.stadium[ev],
    { x, y } = SPOTS[ev],
    dir = ev === "hammer" ? Math.PI - 0.12 : 0.12,
    len = (ev === "hammer" ? 80 : 74) + L * 8;
  if (!L) return stakedOut(g, x - 12, y - 7, 24, 14, snow);
  const east = ev === "hammer";
  sectorLines(g, x, y, dir, len, 0.3, { snow, chalk: L === 1, arcs: L >= 2 ? 4 : 2, marks: L >= 3 ? 3 : 0, flags: L >= 3, side: east ? 1 : -1 });
  circle(g, x, y, L, { pad });
  if (L >= 3) distanceBoard(g, east ? x - 58 : x + 42, y + 30, east ? "71.2" : "60.8");
}
function javelinArea(g, s, snow, pad) {
  const L = s.stadium.jav,
    { x, y } = SPOTS.jav;
  if (!L) return stakedOut(g, x - 26, y - 4, 54, 8, snow);
  const len = [0, 46, 56, 66][L],
    x1 = x + 30,
    x0 = x1 - len;
  if (L === 1) {
    rect(g, x0, y - 3, len, 6, snow ? "#e8ece8" : "#8cc068");
    for (let i = x0; i < x1; i += 6) rect(g, i, y - 3, 3, 6, snow ? "#eef2ee" : "#96c872");
    for (let i = x0; i < x1; i += 2) px(g, i, y - 3, "rgba(250,250,240,0.6)"), px(g, i, y + 2, "rgba(250,250,240,0.6)");
  } else {
    const surface = snow ? "#d8d4d0" : pad;
    rect(g, x0, y - 3, len, 6, surface);
    rect(g, x0, y - 3, len, 1, "#f4f0e4");
    rect(g, x0, y + 2, len, 1, "#f4f0e4");
    // Check marks for the approach.
    for (let i = x0 + 10; i < x1; i += 10) rect(g, i, y - 2, 1, 1, "#f4f0e4");
  }
  // The scratch arc: a wooden board at first, then a painted line with foul-line extensions.
  // The scratch arc bulges towards the sector; a wooden board at first, then a painted line
  // with foul-line extensions either side.
  const arcC = L === 1 ? "#a8743e" : "#f4f0e4";
  for (let i = -4; i <= 4; i++) rect(g, x0 - Math.round(Math.sqrt(16 - i * i) * 0.6), y + i * 0.75, L === 1 ? 2 : 1, 1, arcC);
  if (L >= 2) rect(g, x0 - 1, y - 5, 1, 2, "#f4f0e4"), rect(g, x0 - 1, y + 4, 1, 2, "#f4f0e4");
  sectorLines(g, x0 - 3, y, Math.PI - 0.06, 112 + L * 10, 0.2, { snow, chalk: L === 1, arcs: L >= 2 ? 4 : 2, marks: L >= 3 ? 3 : 0, flags: L >= 3, side: 1 });
  if (L >= 3) distanceBoard(g, x0 - 64, y + 30, "84.9");
  if (L >= 3) {
    // Wind sock on a pole by the runway.
    rect(g, x1 - 6, y - 26, 1, 22, "#c8ccd0");
    for (let i = 0; i < 4; i++) rect(g, x1 - 5 + i * 2, y - 26 + Math.floor(i / 2), 2, 3, i % 2 ? "#f4f0e4" : "#f08a3a");
  }
}
function throws(g, s, season) {
  const snow = season === 3,
    pad = trackColorOf(Math.max(2, s.stadium.track), styleOf(s).track);
  // West D: the discus cage throwing into the infield, the shot put circle below it.
  cageArea(g, s, "discus", snow, pad);
  shotArea(g, s, snow, pad);
  // East D: the hammer cage, and the javelin runway with its arc and long narrow sector.
  cageArea(g, s, "hammer", snow, pad);
  javelinArea(g, s, snow, pad);
}
// A team bench in front of the main stand, kit bags by the finish, a hurdle stack.
function props(g, s) {
  const bx = CENTER.x - 116,
    by = FIELD.y + 5;
  rect(g, bx, by - 4, 30, 5, shade(s.colors.primary, -0.2));
  rect(g, bx, by - 5, 30, 1, shade(s.colors.primary, 0.3));
  rect(g, bx + 1, by - 1, 28, 1, "#3a3e46");
  for (const [x, c] of [[CENTER.x + 96, "#3a7ac0"], [CENTER.x + 102, s.colors.primary]]) rect(g, x, by - 2, 4, 3, c), rect(g, x + 1, by - 3, 2, 1, shade(c, 0.4));
  for (let i = 0; i < 3; i++) {
    rect(g, CENTER.x + 60, INFIELD.y + 28 + i * 3, 12, 1, "#f4f0e0");
    rect(g, CENTER.x + 60, INFIELD.y + 29 + i * 3, 1, 2, "#3a3e46");
    rect(g, CENTER.x + 71, INFIELD.y + 29 + i * 3, 1, 2, "#3a3e46");
  }
}
function scoreboard(g, s) {
  if (s.stadium.stands < 3) return;
  const x = BOWL.x + BOWL.w - 30,
    y = CENTER.y - 64;
  rect(g, x + 4, y + 20, 2, 16, "#5a5e60");
  rect(g, x + 20, y + 20, 2, 16, "#5a5e60");
  rect(g, x - 1, y - 1, 28, 22, "#2a2e32");
  rect(g, x, y, 26, 20, "#14181c");
  text(g, "R&S", x + 13, y + 2, { color: "#f2c94c", outline: null, align: "center" });
  text(g, "0-0", x + 13, y + 11, { color: "#9fe0ff", outline: null, align: "center" });
}

// ── Floodlights ────────────────────────────────────────────────────────
export function floodlight(g, x, y, lvl) {
  const h = 70 + lvl * 14;
  ellipse(g, x + 1, y + 1, 5, 2, "rgba(30,40,30,0.3)");
  rect(g, x - 2, y - 2, 6, 3, "#8a8e90");
  rect(g, x, y - h, 2, h, "#a8acae");
  rect(g, x + 1, y - h, 1, h, "#7a7e80");
  for (let k = 6; k < h; k += 6) px(g, x + (k % 12 ? 0 : 1), y - k, "#5a5e60");
  const cols = 2 + lvl,
    w = cols * 4 + 2;
  rect(g, x - w / 2 + 1, y - h - 10, w, 11, "#3b4a4f");
  rect(g, x - w / 2 + 1, y - h - 10, w, 1, "#5a6a70");
  for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) rect(g, x - w / 2 + 2 + c * 4, y - h - 8 + r * 5, 3, 3, "#fff4cb");
}
// A low white rail round the field, where spectators stand on the grass.
function rail(g) {
  const per = Math.round(2 * (FIELD.w - 2 * FIELD.r) + 2 * Math.PI * FIELD.r);
  for (let i = 0; i < per; i++) {
    const [x, y] = loopPoint(FIELD, i / per);
    px(g, x, y - 2, "#f4f0e4");
    if (i % 8 === 0) rect(g, x, y - 2, 1, 3, "#c8c4b8");
  }
}
const masts = (s) => s.stadium.lights > 0 && s.stadium.stands < 4;

// The Olympic level's landmark (after the tower at Hayward Field): a slim round tower standing
// beside the east end, wrapped in a spiral of coloured panels and crowned with a lit ring.
export const TOWER = { x: BOWL.x + BOWL.w + 20, y: BOWL.y + 96, r: 7, h: 92 };
function tower(g, s) {
  if (s.stadium.stands < 4) return;
  const { x, y, r, h } = TOWER,
    panels = ["#c8563e", "#3d6cae", s.colors.primary, "#e2a43a"];
  ellipse(g, x + 4, y + 1, 12, 3, "rgba(20,30,20,0.3)");
  ellipse(g, x, y, r + 2, 3, "#8a8e92");
  for (let yy = 0; yy < h; yy++) {
    const sy = y - yy,
      rr = r + (yy < h * 0.3 ? 1 : 0);
    for (let dx = -rr; dx <= rr; dx++) {
      const t = dx / (rr + 0.5),
        ang = Math.asin(t),
        light = Math.cos(ang) * 0.5 + (t < 0 ? 0.25 : -0.15);
      // Two helical bands climb the tower, each led by a bright fin; between them is dark glass.
      const turn = ang + yy * 0.1,
        phase = ((turn % Math.PI) + Math.PI) % Math.PI,
        band = phase < 1.2,
        fin = phase < 0.16;
      let c = fin ? "#f4f0e4" : band ? panels[Math.floor(turn / Math.PI) & 1 ? 0 : 2] : yy % 6 === 0 ? "#46525e" : "#2e3640";
      c = shade(c, Math.max(-0.45, Math.min(0.3, light - 0.35)));
      px(g, x + dx, sy, c);
      // Fins stand proud of the silhouette where they wrap round the edge.
      if (fin && Math.abs(dx) === rr) px(g, x + dx + Math.sign(dx), sy, shade("#f4f0e4", -0.15));
    }
  }
  // Observation ring and crown of light.
  const top = y - h;
  ellipse(g, x, top, r + 3, 3, "#3a4046");
  ellipse(g, x, top - 1, r + 3, 2, "#c8ccd0");
  rect(g, x - r - 1, top - 7, 2 * r + 3, 6, "#fff4cb");
  rect(g, x - r - 1, top - 7, 2 * r + 3, 1, "#ffffff");
  ellipse(g, x, top - 7, r + 1, 2, "#f4f0e0");
  rect(g, x, top - 16, 1, 9, "#c8ccd0");
  rect(g, x + 1, top - 16, 5, 2, s.colors.primary);
  rect(g, x + 1, top - 14, 5, 2, s.colors.secondary);
}
export function drawArena(g, s, season = 1) {
  if (s.stadium.stands >= 3) roundRect(g, { ...BOWL, x: BOWL.x + 3, y: BOWL.y + 4 }, "rgba(20,40,20,0.25)");
  else rail(g);
  if (masts(s)) for (const [x, y, near] of MASTS) if (!near) floodlight(g, x, y, s.stadium.lights);
  trackAndField(g, s, season);
  jumps(g, s);
  throws(g, s, season);
  props(g, s);
  stands(g, s, season);
  mainRoof(g, s, season);
  ringRoof(g, s, season);
  tower(g, s);
  gatehouse(g, s);
  scoreboard(g, s);
  pressBox(g, s);
}
// Front-most details that must overlap people: the cages' nets and the near floodlights.
export function drawArenaFront(g, s) {
  const st = s.stadium;
  if (st.discus) cage(g, SPOTS.discus.x, SPOTS.discus.y, 0.12, st.discus);
  if (st.hammer) cage(g, SPOTS.hammer.x, SPOTS.hammer.y, Math.PI - 0.12, st.hammer, 4);
  // TV cameras cover every competition-standard area.
  const sp = SPOTS;
  if (st.discus >= 3) tvCamera(g, sp.discus.x + 12, sp.discus.y + 22, 1);
  if (st.shot >= 3) tvCamera(g, sp.shot.x - 20, sp.shot.y + 24, 1);
  if (st.hammer >= 3) tvCamera(g, sp.hammer.x - 12, sp.hammer.y + 22, -1);
  if (st.jav >= 3) tvCamera(g, sp.jav.x - 30, sp.jav.y + 16, -1);
  if (masts(s)) for (const [x, y, near] of MASTS) if (near) floodlight(g, x, y, st.lights);
}
// Spectators and flags move on top of the cached stadium.
const SKIN = ["#f0c6a0", "#c98f66", "#7a4e36", "#e2b08a"];
export function animateArena(g, s, now, crowd = 0.15) {
  for (let i = 0; i < SEATS.length; i++) {
    const [x, y, seated] = SEATS[i],
      h = hash(x * 7 + y * 131);
    if (h > crowd * (seated ? 1 : 0.4)) continue;
    const bob = Math.sin(now / 280 + h * 50) > 0.9 ? 1 : 0;
    rect(g, x, y - 2 - bob, 2, 2, SKIN[Math.floor(h * 97) % 4]);
    rect(g, x, y - bob, 2, 1, ["#e07a5a", "#5a8ad0", s.colors.primary, "#f4efe2"][Math.floor(h * 31) % 4]);
  }
  const lvl = s.stadium.stands;
  if (lvl >= 2 && lvl < 4)
    for (const x of [MX0 + 4, MX1 - 12]) {
      const y = ROOF.back - ROOF.z,
        wave = Math.round(Math.sin(now / 280 + x));
      rect(g, x, y - 16, 1, 16, "#8a8e90");
      rect(g, x + 1, y - 16 + wave, 8, 2, s.colors.primary);
      rect(g, x + 1, y - 14 + wave, 8, 2, s.colors.secondary);
    }
  const gy = BOWL.y + BOWL.h - (lvl >= 3 ? 26 : 16);
  for (const fx of [CENTER.x - 31, CENTER.x + 30]) {
    const wave = Math.round(Math.sin(now / 300 + fx));
    rect(g, fx + 1, gy - 22 + wave, 7, 2, s.colors.primary);
    rect(g, fx + 1, gy - 20 + wave, 7, 2, s.colors.secondary);
  }
}

