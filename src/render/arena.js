import { rect, poly, ellipse, line, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";

// The club stadium, drawn top-down with front faces showing, like the rest of the map.
// A real athletics venue: a covered main stand on the far side, terraces round the other
// three, a track with semicircular ends, a pitch on the infield and the throws in the two D's.
export const BOWL = { x: 56, y: 76, w: 448, h: 292, r: 84 };
const DEPTH = { n: 52, s: 20, w: 32, e: 32 },
  APRON = 6,
  ROWS = 14;
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
// The D's at each end of the infield, between the pitch and the track bends.
const DW = { x: INFIELD.x + INFIELD.r, y: CENTER.y },
  DE = { x: INFIELD.x + INFIELD.w - INFIELD.r, y: CENTER.y };
const PITCH = { x: DW.x - 8, y: INFIELD.y + 14, w: DE.x - DW.x + 16, h: INFIELD.h - 28 };
// Installation anchors (where athletes stand) and tap areas.
export const SPOTS = {
  discus: { x: DW.x - 46, y: CENTER.y - 24, hit: [DW.x - 66, CENTER.y - 52, 44, 42] },
  shot: { x: DW.x - 44, y: CENTER.y + 34, hit: [DW.x - 64, CENTER.y + 20, 48, 26] },
  hammer: { x: DE.x + 46, y: CENTER.y - 24, hit: [DE.x + 24, CENTER.y - 52, 44, 42] },
  jav: { x: DE.x + 44, y: CENTER.y + 34, hit: [DE.x + 10, CENTER.y + 24, 62, 20] },
  track: { x: CENTER.x, y: TRACK.y + TRACK.h - 8, hit: [CENTER.x - 90, TRACK.y + TRACK.h - 19, 180, 19] },
  stands: { x: BOWL.x + 110, y: BOWL.y + 30, hit: [BOWL.x + 60, BOWL.y + 12, 120, 38] },
  studio: { x: CENTER.x, y: BOWL.y + 28, hit: [CENTER.x - 34, BOWL.y + 14, 68, 26] },
  lights: { x: BOWL.x + 8, y: BOWL.y + 20, hit: [BOWL.x - 4, BOWL.y - 54, 26, 78] },
};
const TRACK_COLORS = ["#7aa858", "#a8744e", "#c0604a", "#3d6cae"];
const MASTS = [
  [BOWL.x + 8, BOWL.y + 22, false],
  [BOWL.x + BOWL.w - 10, BOWL.y + 22, false],
  [BOWL.x + 6, BOWL.y + BOWL.h - 22, true],
  [BOWL.x + BOWL.w - 8, BOWL.y + BOWL.h - 22, true],
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
// The y of a rounded rectangle's bottom edge at column x.
function bottomAt(b, x) {
  const dx = Math.min(x - b.x, b.x + b.w - x);
  if (dx >= b.r) return b.y + b.h;
  const k = b.r - dx;
  return b.y + b.h - b.r + Math.round(Math.sqrt(Math.max(0, b.r * b.r - k * k)));
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

// ── Stands ──────────────────────────────────────────────────────────────
const ring = (k) => {
  const t = k / ROWS;
  return { x: BOWL.x + DEPTH.w * t, y: BOWL.y + DEPTH.n * t, w: BOWL.w - (DEPTH.w + DEPTH.e) * t, h: BOWL.h - (DEPTH.n + DEPTH.s) * t, r: Math.round(BOWL.r + (FIELD.r - BOWL.r) * t) };
};
const rnd = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), r: b.r });
// Which parts of the bowl have seats at each grandstand level.
function seatedClip(g, lvl) {
  const { x, y, w, h } = BOWL;
  g.beginPath();
  if (lvl === 1) g.rect(x + 120, y, w - 240, DEPTH.n);
  if (lvl === 2) {
    g.rect(x, y, w, h - DEPTH.s - 24);
  }
  if (lvl >= 3) g.rect(x, y, w, h);
  g.clip();
}
function stands(g, s, season) {
  const lvl = s.stadium.stands,
    snow = season === 3,
    colors = s.colors;
  const bankA = ["#86b866", "#78ac58", "#a8a860", "#e4eae4"][season],
    bankB = shade(bankA, -0.1);
  for (let k = 0; k < ROWS; k++) roundRect(g, rnd(ring(k)), k % 2 ? bankB : bankA);
  // Terrace steps on the banks: a crush barrier every few rows.
  for (let k = 3; k < ROWS; k += 4) {
    const b = rnd(ring(k));
    rect(g, b.x + b.r, b.y, b.w - 2 * b.r, 1, snow ? "#c8ccd0" : "#c8bca0");
  }
  if (lvl > 0) {
    g.save();
    seatedClip(g, lvl);
    const riser = shade(colors.primary, -0.5),
      seat = colors.primary,
      seat2 = shade(colors.primary, 0.22);
    for (let k = 0; k < ROWS; k++) roundRect(g, rnd(ring(k)), k % 2 ? riser : k % 8 === 4 ? seat2 : seat);
    // Gangways: stairs cut through the rows.
    const stair = snow ? "#f4f6f8" : "#c8c2b4";
    for (let x = BOWL.x + BOWL.r + 8; x < BOWL.x + BOWL.w - BOWL.r; x += 38) {
      rect(g, x, BOWL.y, 2, DEPTH.n, stair);
      rect(g, x, BOWL.y + BOWL.h - DEPTH.s, 2, DEPTH.s, stair);
    }
    for (let y = BOWL.y + BOWL.r - 10; y < BOWL.y + BOWL.h - BOWL.r + 10; y += 34) {
      rect(g, BOWL.x, y, DEPTH.w, 2, stair);
      rect(g, BOWL.x + BOWL.w - DEPTH.e, y, DEPTH.e, 2, stair);
    }
    g.restore();
  }
  // The pitch-side wall with sponsor boards.
  roundRect(g, FIELD, "#e8e4d8");
  if (lvl > 0) {
    const boards = [colors.primary, "#f4f0e4", "#c84a40", "#2c4a7a", colors.secondary];
    for (let x = FIELD.x + FIELD.r, i = 0; x < FIELD.x + FIELD.w - FIELD.r - 10; x += 16, i++) {
      rect(g, x, FIELD.y - 1, 14, 2, boards[i % boards.length]);
      rect(g, x, FIELD.y + FIELD.h - 1, 14, 2, boards[(i + 2) % boards.length]);
    }
  }
}
// Covered main stand: roof, fascia, the shadow it casts and its support columns.
function roof(g, s, season) {
  const lvl = s.stadium.stands;
  if (!lvl) return;
  const snow = season === 3,
    x0 = lvl >= 2 ? BOWL.x + 40 : BOWL.x + 116,
    x1 = lvl >= 2 ? BOWL.x + BOWL.w - 40 : BOWL.x + BOWL.w - 116,
    front = BOWL.y + 24,
    back = BOWL.y - 12;
  g.fillStyle = "rgba(20,24,30,0.22)";
  g.fillRect(x0 + 2, front + 3, x1 - x0 - 4, 8);
  for (let x = x0 + 14; x < x1 - 8; x += 44) rect(g, x, front + 3, 1, 14, "#6a7076");
  const top = snow ? "#f2f5f8" : "#b8c0c6";
  poly(g, [[x0 + 4, back], [x1 - 4, back], [x1, front], [x0, front]], top);
  if (!snow) for (let x = x0 + 8; x < x1 - 4; x += 8) rect(g, x, back + 2, 1, front - back - 2, shade(top, -0.12));
  rect(g, x0 + 4, back, x1 - x0 - 8, 1, shade(top, 0.3));
  rect(g, x0, front, x1 - x0, 3, s.colors.primary);
  rect(g, x0, front + 3, x1 - x0, 1, shade(s.colors.primary, -0.4));
  if (lvl >= 2) text(g, s.clubName.toUpperCase().slice(0, 22), CENTER.x, front - 9, { color: shade(top, -0.35), outline: null, align: "center" });
}
function pressBox(g, s) {
  const L = s.stadium.studio;
  if (!L) return;
  const w = 22 + L * 12,
    x = Math.round(CENTER.x - w / 2),
    y = BOWL.y + 28;
  rect(g, x - 1, y - 1, w + 2, 11, "#2e3a40");
  rect(g, x, y, w, 9, "#3c5c84");
  for (let i = 0; i < w; i += 7) rect(g, x + i, y, 1, 9, "#26323a");
  rect(g, x + 2, y + 1, w - 4, 2, "#8ab4dc");
  rect(g, x - 1, y + 9, w + 2, 1, "#c8ccd0");
  if (L >= 2) rect(g, x + w - 6, y + 4, 3, 2, "#e85a50");
  if (L >= 3) {
    rect(g, x + w - 8, BOWL.y - 26, 1, 14, "#8a8e96");
    ellipse(g, x + 10, BOWL.y - 14, 5, 3, "#e8ecf0");
    rect(g, x + 10, BOWL.y - 14, 1, 3, "#8a8e96");
  }
}
// Outer wall seen from the forecourt: concrete piers, entrances and a club-colour band.
function facade(g, s) {
  const H = 12,
    face = "#b4aa98";
  for (let x = BOWL.x; x < BOWL.x + BOWL.w; x++) {
    const yb = bottomAt(BOWL, x);
    rect(g, x, yb, 1, H, face);
    px(g, x, yb, "#d8d0c0");
    px(g, x, yb + 3, s.colors.primary);
    px(g, x, yb + H - 1, "#7a7064");
  }
  for (let x = BOWL.x + 10; x < BOWL.x + BOWL.w - 10; x += 16) {
    if (Math.abs(x - CENTER.x) < 30) continue;
    const yb = bottomAt(BOWL, x);
    rect(g, x, yb + 1, 2, H - 2, "#c8bea8");
    if (yb < BOWL.y + BOWL.h - 4) continue;
    rect(g, x + 6, yb + 5, 4, 6, "#4a4038");
    rect(g, x + 7, yb + 4, 2, 1, "#4a4038");
  }
  // Main entrance: an arched gatehouse with the club's name over it.
  const gx = CENTER.x,
    gy = BOWL.y + BOWL.h;
  rect(g, gx - 20, gy - DEPTH.s, 40, DEPTH.s, "#8a8478");
  rect(g, gx - 8, gy - DEPTH.s, 16, DEPTH.s, "#3a3530");
  rect(g, gx - 24, gy - 6, 48, 18, "#d8d0c0");
  rect(g, gx - 24, gy - 6, 48, 1, "#f0ebe0");
  rect(g, gx - 9, gy + 1, 18, 11, "#3a3530");
  rect(g, gx - 7, gy - 1, 14, 2, "#3a3530");
  for (let i = -6; i <= 6; i += 3) rect(g, gx + i, gy + 6, 1, 6, "#8a8e96");
  rect(g, gx - 27, gy - 15, 54, 9, s.colors.primary);
  rect(g, gx - 27, gy - 15, 54, 1, shade(s.colors.primary, 0.3));
  text(g, s.clubName.slice(0, 8).toUpperCase(), gx, gy - 14, { color: s.colors.secondary, outline: null, align: "center" });
  for (const fx of [gx - 30, gx + 29]) rect(g, fx, gy - 30, 1, 42, "#8a8e90");
}

// ── Track, pitch and the throws ────────────────────────────────────────
function trackAndField(g, s, season) {
  const st = s.stadium,
    snow = season === 3,
    grass = ["#6caa50", "#5e9e48", "#8a9e48", "#dfe8e0"][season];
  const tc = TRACK_COLORS[st.track];
  roundRect(g, inset(FIELD, 1, 1), st.track >= 3 ? shade(tc, -0.12) : shade(grass, 0.04));
  const chalkLine = st.track ? "#f4f0e4" : "#e8f0d8";
  roundRect(g, TRACK, chalkLine);
  roundRect(g, { ...inset(TRACK, 1, 1), r: TRACK.r - 1 }, snow ? "#c8c4c0" : tc);
  for (let lane = 1; lane < 6; lane++) {
    const k = 1 + lane * 3;
    roundRect(g, { ...inset(TRACK, k, k), r: TRACK.r - k }, snow ? "#d8d4d0" : shade(tc, 0.42));
    roundRect(g, { ...inset(TRACK, k + 1, k + 1), r: TRACK.r - k - 1 }, snow ? "#c8c4c0" : tc);
  }
  roundRect(g, { ...inset(TRACK, 18, 18), r: TRACK.r - 18 }, chalkLine);
  roundRect(g, INFIELD, grass);
  // Mowing stripes, then the pitch markings.
  g.save();
  g.beginPath();
  g.rect(INFIELD.x, INFIELD.y, INFIELD.w, INFIELD.h);
  g.clip();
  for (let x = PITCH.x; x < PITCH.x + PITCH.w; x += 24) rect(g, x, INFIELD.y, 12, INFIELD.h, shade(grass, snow ? -0.02 : 0.07));
  g.restore();
  g.fillStyle = snow ? "rgba(140,150,150,0.6)" : "rgba(250,250,240,0.55)";
  g.fillRect(PITCH.x, PITCH.y, PITCH.w, 1);
  g.fillRect(PITCH.x, PITCH.y + PITCH.h - 1, PITCH.w, 1);
  g.fillRect(PITCH.x, PITCH.y, 1, PITCH.h);
  g.fillRect(PITCH.x + PITCH.w - 1, PITCH.y, 1, PITCH.h);
  g.fillRect(CENTER.x, PITCH.y, 1, PITCH.h);
  for (let a = 0; a < Math.PI * 2; a += 0.12) g.fillRect(Math.round(CENTER.x + Math.cos(a) * 16), Math.round(CENTER.y + Math.sin(a) * 16), 1, 1);
  for (const [x, d] of [[PITCH.x, 1], [PITCH.x + PITCH.w - 1, -1]]) {
    g.fillRect(Math.min(x, x + 20 * d), CENTER.y - 26, 20, 1);
    g.fillRect(Math.min(x, x + 20 * d), CENTER.y + 26, 20, 1);
    g.fillRect(x + 20 * d, CENTER.y - 26, 1, 53);
  }
  // Finish line with a chequer, and the stagger marks for the 400 m start.
  const fx = CENTER.x + 70,
    fy = TRACK.y + TRACK.h - 19;
  for (let y = 0; y < 18; y++) px(g, fx + (y % 2), fy + y, y % 2 ? "#2a2a2a" : "#f8f8f0");
  for (let i = 0; i < 6; i++) rect(g, CENTER.x - 40 - i * 7, fy + 1 + i * 3, 2, 1, "#f8f8f0");
}
function sectorLines(g, x, y, dir, len, spread, snow, marks = 0) {
  const c = snow ? "rgba(120,130,130,0.8)" : "rgba(250,250,240,0.8)",
    soft = snow ? "rgba(120,130,130,0.4)" : "rgba(250,250,240,0.38)";
  for (const a of [-spread, spread]) line(g, x, y, x + Math.cos(dir + a) * len, y + Math.sin(dir + a) * len * 0.6, c);
  for (let k = 1; k <= 3; k++) {
    const rr = (len * k) / 3.4;
    for (let t = -spread; t <= spread; t += 0.05) px(g, x + Math.cos(dir + t) * rr, y + Math.sin(dir + t) * rr * 0.6, soft);
  }
  for (let k = 1; k <= marks; k++) {
    const rr = (len * k) / (marks + 0.6);
    rect(g, x + Math.cos(dir + spread) * rr - 1, y + Math.sin(dir + spread) * rr * 0.6 - 3, 3, 3, "#f2c94c");
  }
}
// A concrete circle; `board` puts a stop board on the throwing side (shot put).
function circle(g, x, y, lvl, board = 0) {
  ellipse(g, x, y + 1, 10, 5, "rgba(40,50,40,0.25)");
  ellipse(g, x, y, 9, 4, lvl >= 3 ? "#b8b8bc" : "#c8c0b0");
  ellipse(g, x, y, 7, 3, "#f4f0e4");
  ellipse(g, x, y, 6, 3, lvl >= 3 ? "#5a5e66" : "#8a8a84");
  if (board) for (let i = -2; i <= 2; i++) rect(g, x + 7 * board - Math.abs(i) * board * 0.5, y + i, 1, 1, "#f4f0e4");
}
// A C-shaped safety cage: posts round the back of the circle, translucent net panels between them.
function cage(g, x, y, dir, lvl) {
  const h = 16 + lvl * 4,
    n = 6 + lvl * 2,
    net = lvl >= 3 ? "rgba(200,60,50,0.22)" : "rgba(40,60,52,0.24)",
    post = lvl >= 3 ? "#e8e4dc" : "#5a6a62";
  const pts = Array.from({ length: n }, (_, i) => {
    const a = dir + Math.PI * (0.32 + (1.36 * i) / (n - 1));
    return [Math.round(x + Math.cos(a) * 15), Math.round(y + Math.sin(a) * 8)];
  });
  for (let i = 1; i < n; i++) {
    const [x1, y1] = pts[i - 1],
      [x2, y2] = pts[i];
    poly(g, [[x1, y1 - h], [x2, y2 - h], [x2, y2], [x1, y1]], net);
  }
  for (const [px_, py] of pts) rect(g, px_, py - h, 1, h + 1, post);
  for (let i = 1; i < n; i++) line(g, pts[i - 1][0], pts[i - 1][1] - h, pts[i][0], pts[i][1] - h, post);
  if (lvl >= 2) for (const [px_, py] of [pts[0], pts[n - 1]]) rect(g, px_, py - h - 4, 1, 4, post);
}
// A planned installation: chalk outline and corner stakes, waiting for the build.
function stakedOut(g, x, y, w, h, snow) {
  const c = snow ? "#9aa4a4" : "#e8f0d0";
  for (let i = 0; i < w; i += 3) px(g, x + i, y, c), px(g, x + i, y + h, c);
  for (let i = 0; i < h; i += 3) px(g, x, y + i, c), px(g, x + w, y + i, c);
  for (const [sx, sy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) rect(g, sx, sy - 3, 1, 4, "#b08050");
}
function throws(g, s, season) {
  const st = s.stadium,
    snow = season === 3,
    sp = SPOTS;
  // West D: discus cage throwing into the pitch, shot put circle below it.
  if (st.discus) {
    sectorLines(g, sp.discus.x, sp.discus.y, 0.12, 74 + st.discus * 8, 0.3, snow, st.discus >= 3 ? 3 : 0);
    circle(g, sp.discus.x, sp.discus.y, st.discus);
  } else stakedOut(g, sp.discus.x - 12, sp.discus.y - 7, 24, 14, snow);
  if (st.shot) {
    sectorLines(g, sp.shot.x, sp.shot.y, 0.05, 30 + st.shot * 6, 0.32, snow, st.shot >= 3 ? 2 : 0);
    circle(g, sp.shot.x, sp.shot.y, st.shot, 1);
    if (st.shot >= 2) circle(g, sp.shot.x - 4, sp.shot.y + 13, st.shot, 1);
  } else stakedOut(g, sp.shot.x - 10, sp.shot.y - 6, 20, 12, snow);
  // East D: hammer cage, and the javelin runway with its arc and a long narrow sector.
  if (st.hammer) {
    sectorLines(g, sp.hammer.x, sp.hammer.y, Math.PI - 0.12, 80 + st.hammer * 8, 0.3, snow, st.hammer >= 3 ? 3 : 0);
    circle(g, sp.hammer.x, sp.hammer.y, st.hammer);
  } else stakedOut(g, sp.hammer.x - 12, sp.hammer.y - 7, 24, 14, snow);
  if (st.jav) {
    const surface = snow ? "#d8d4d0" : ["", "#9cc070", "#c0604a", "#3d6cae"][st.jav],
      x0 = sp.jav.x - 26,
      x1 = sp.jav.x + 28,
      y = sp.jav.y;
    rect(g, x0, y - 3, x1 - x0, 6, surface);
    rect(g, x0, y - 3, x1 - x0, 1, "#f4f0e4");
    rect(g, x0, y + 2, x1 - x0, 1, "#f4f0e4");
    for (let i = -3; i <= 3; i++) px(g, x0 - 1 - Math.round((3 - Math.abs(i)) * 0.7), y + i, "#f4f0e4");
    sectorLines(g, x0 - 2, y, Math.PI - 0.08, 120 + st.jav * 10, 0.22, snow, st.jav >= 3 ? 3 : 0);
  } else stakedOut(g, sp.jav.x - 26, sp.jav.y - 4, 54, 8, snow);
}
// A team bench, kit bags and cones by the track; a hurdle stack in the infield.
function props(g, s) {
  const bx = CENTER.x - 116,
    by = TRACK.y + TRACK.h + 4;
  rect(g, bx, by - 4, 30, 5, shade(s.colors.primary, -0.2));
  rect(g, bx, by - 5, 30, 1, shade(s.colors.primary, 0.3));
  rect(g, bx + 1, by - 1, 28, 1, "#3a3e46");
  for (const [x, c] of [[CENTER.x + 102, "#3a7ac0"], [CENTER.x + 108, s.colors.primary]]) rect(g, x, by - 2, 4, 3, c), rect(g, x + 1, by - 3, 2, 1, shade(c, 0.4));
  for (let i = 0; i < 4; i++) rect(g, PITCH.x + 40 + i * 9, INFIELD.y + 5, 2, 3, "#f08a3a"), rect(g, PITCH.x + 39 + i * 9, INFIELD.y + 7, 4, 1, "#c86a2a");
  for (let i = 0; i < 3; i++) {
    rect(g, PITCH.x + PITCH.w - 40, INFIELD.y + 4 + i * 3, 12, 1, "#f4f0e0");
    rect(g, PITCH.x + PITCH.w - 40, INFIELD.y + 5 + i * 3, 1, 2, "#3a3e46");
    rect(g, PITCH.x + PITCH.w - 29, INFIELD.y + 5 + i * 3, 1, 2, "#3a3e46");
  }
}
function scoreboard(g, s) {
  if (s.stadium.stands < 3) return;
  const x = BOWL.x + BOWL.w - 30,
    y = CENTER.y - 28;
  rect(g, x + 4, y + 20, 2, 10, "#5a5e60");
  rect(g, x + 20, y + 20, 2, 10, "#5a5e60");
  rect(g, x - 1, y - 1, 28, 22, "#2a2e32");
  rect(g, x, y, 26, 20, "#14181c");
  text(g, "R&S", x + 13, y + 2, { color: "#f2c94c", outline: null, align: "center" });
  text(g, "0-0", x + 13, y + 11, { color: "#9fe0ff", outline: null, align: "center" });
}

// ── Floodlights ────────────────────────────────────────────────────────
export function floodlight(g, x, y, lvl) {
  const h = 52 + lvl * 14;
  ellipse(g, x + 1, y + 1, 5, 2, "rgba(30,40,30,0.3)");
  rect(g, x - 2, y - 2, 6, 3, "#8a8e90");
  rect(g, x, y - h, 2, h, "#a8acae");
  rect(g, x + 1, y - h, 1, h, "#7a7e80");
  if (lvl >= 2) for (let k = 6; k < h; k += 6) px(g, x + (k % 12 ? 0 : 1), y - k, "#5a5e60");
  const cols = 2 + lvl,
    w = cols * 4 + 2;
  rect(g, x - w / 2 + 1, y - h - 10, w, 11, "#3b4a4f");
  rect(g, x - w / 2 + 1, y - h - 10, w, 1, "#5a6a70");
  for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) rect(g, x - w / 2 + 2 + c * 4, y - h - 8 + r * 5, 3, 3, "#fff4cb");
}

export function drawArena(g, s, season = 1) {
  const st = s.stadium;
  // Footprint shadow so the bowl sits on the ground.
  roundRect(g, { ...BOWL, x: BOWL.x + 3, y: BOWL.y + 4 }, "rgba(20,40,20,0.25)");
  facade(g, s);
  stands(g, s, season);
  trackAndField(g, s, season);
  throws(g, s, season);
  props(g, s);
  scoreboard(g, s);
  roof(g, s, season);
  pressBox(g, s);
  if (st.lights) for (const [x, y, near] of MASTS) if (!near) floodlight(g, x, y, st.lights);
}
// Front-most details that must overlap people: the cages' nets and the near floodlights.
export function drawArenaFront(g, s) {
  const st = s.stadium;
  if (st.discus) cage(g, SPOTS.discus.x, SPOTS.discus.y, 0.12, st.discus);
  if (st.hammer) cage(g, SPOTS.hammer.x, SPOTS.hammer.y, Math.PI - 0.12, st.hammer);
  if (st.lights) for (const [x, y, near] of MASTS) if (near) floodlight(g, x, y, st.lights);
}
// Spectators and flags move on top of the cached stadium.
const SKIN = ["#f0c6a0", "#c98f66", "#7a4e36", "#e2b08a"];
export function animateArena(g, s, now, crowd = 0.15) {
  const st = s.stadium,
    lvl = st.stands;
  const seatedAt = (x, y) => {
    if (lvl >= 3) return true;
    if (lvl === 2) return y < BOWL.y + BOWL.h - DEPTH.s - 24;
    if (lvl === 1) return y < BOWL.y + DEPTH.n && x > BOWL.x + 120 && x < BOWL.x + BOWL.w - 120;
    return false;
  };
  const dot = (x, y, h, seated) => {
    if (h > crowd * (seated ? 1 : 0.35)) return;
    const bob = Math.sin(now / 280 + h * 50) > 0.9 ? 1 : 0;
    rect(g, x, y - 1 - bob, 2, 2, SKIN[Math.floor(h * 97) % 4]);
    rect(g, x, y + 1 - bob, 2, 1, ["#e07a5a", "#5a8ad0", s.colors.primary, "#f4efe2"][Math.floor(h * 31) % 4]);
  };
  for (let k = 1; k < ROWS - 1; k += 2) {
    const b = ring(k),
      y = Math.round(b.y),
      yS = Math.round(b.y + b.h - 1),
      xW = Math.round(b.x + 1),
      xE = Math.round(b.x + b.w - 3);
    for (let x = Math.round(b.x + b.r); x < b.x + b.w - b.r; x += 4) {
      if (st.studio && y > BOWL.y + 24 && Math.abs(x - CENTER.x) < 30) continue;
      if (lvl >= 1 && y < BOWL.y + 28 && x > (lvl >= 2 ? BOWL.x + 36 : BOWL.x + 112) && x < (lvl >= 2 ? BOWL.x + BOWL.w - 36 : BOWL.x + BOWL.w - 112)) continue;
      dot(x, y, hash(x * 7 + k * 131), seatedAt(x, y));
      if (Math.abs(x - CENTER.x) > 22) dot(x, yS, hash(x * 11 + k * 71), seatedAt(x, yS));
    }
    for (let yy = Math.round(b.y + b.r); yy < b.y + b.h - b.r; yy += 4) {
      dot(xW, yy, hash(yy * 13 + k * 37), seatedAt(xW, yy));
      if (lvl < 3 || yy < CENTER.y - 30 || yy > CENTER.y + 4) dot(xE, yy, hash(yy * 17 + k * 53), seatedAt(xE, yy));
    }
  }
  if (lvl >= 2)
    for (const x of [BOWL.x + 46, BOWL.x + BOWL.w - 46]) {
      const wave = Math.round(Math.sin(now / 280 + x));
      rect(g, x, BOWL.y - 30, 1, 18, "#8a8e90");
      rect(g, x + 1, BOWL.y - 30 + wave, 8, 2, s.colors.primary);
      rect(g, x + 1, BOWL.y - 28 + wave, 8, 2, s.colors.secondary);
    }
  for (const fx of [CENTER.x - 30, CENTER.x + 29]) {
    const wave = Math.round(Math.sin(now / 300 + fx));
    rect(g, fx + 1, BOWL.y + BOWL.h - 30 + wave, 7, 2, s.colors.primary);
    rect(g, fx + 1, BOWL.y + BOWL.h - 28 + wave, 7, 2, s.colors.secondary);
  }
}
