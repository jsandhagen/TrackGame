import { rect, poly, ellipse, line, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";

// The club stadium, drawn in the same oblique 2.5D view as the rest of the grounds.
// Everything is positioned in world coordinates on the 720×480 map.
export const BOWL = { x: 136, y: 100, w: 448, h: 292, r: 74 };
export const FIELD = { x: 166, y: 150, w: 388, h: 224, r: 56 };
export const TRACK = { x: 174, y: 156, w: 372, h: 210, r: 60 };
export const INFIELD = { x: 192, y: 174, w: 336, h: 174, r: 42 };
export const GATE = { x: 360, out: 410, in: 372 };
// Installation anchors and tap areas.
export const SPOTS = {
  shot: { x: 296, y: 206, hit: [272, 186, 52, 34] },
  discus: { x: 226, y: 262, hit: [204, 232, 46, 44] },
  hammer: { x: 492, y: 236, hit: [466, 204, 48, 46] },
  jav: { x: 252, y: 334, hit: [226, 322, 110, 22] },
  track: { x: 450, y: 360, hit: [380, 352, 150, 16] },
  stands: { x: 360, y: 120, hit: [180, 100, 120, 40] },
  studio: { x: 360, y: 112, hit: [320, 96, 80, 22] },
  lights: { x: 150, y: 110, hit: [138, 52, 24, 64] },
};
const TRACK_COLORS = ["#7aa858", "#b07850", "#c46a4e", "#3a6ab0"];

export function roundRect(g, { x, y, w, h, r }, c) {
  g.fillStyle = c;
  for (let yy = 0; yy < h; yy++) {
    let inset = 0;
    if (yy < r) inset = r - Math.round(Math.sqrt(Math.max(0, r * r - (r - yy - 0.5) ** 2)));
    else if (yy >= h - r) inset = r - Math.round(Math.sqrt(Math.max(0, r * r - (yy - (h - r) + 0.5) ** 2)));
    g.fillRect(x + inset, y + yy, w - inset * 2, 1);
  }
}
const inset = (b, l, t, rr = l, bb = t) => ({ x: b.x + l, y: b.y + t, w: b.w - l - rr, h: b.h - t - bb, r: Math.max(2, b.r - Math.min(l, t)) });
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
export const insideBowl = (x, y) => x > BOWL.x + 8 && x < BOWL.x + BOWL.w - 8 && y > BOWL.y + 10 && y < BOWL.y + BOWL.h - 6;

function sectorLines(g, x, y, dir, len, spread, color = "rgba(250,250,240,0.75)") {
  for (const a of [-spread, spread]) {
    const ang = dir + a;
    line(g, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len * 0.55, color);
  }
  for (let k = 1; k <= 3; k++) {
    const rr = (len * k) / 3.4;
    for (let t = -spread; t <= spread; t += 0.06) px(g, x + Math.cos(dir + t) * rr, y + Math.sin(dir + t) * rr * 0.55, "rgba(250,250,240,0.35)");
  }
}
function circle(g, x, y, lvl) {
  ellipse(g, x, y + 1, 8, 4, "#5a6a5a");
  ellipse(g, x, y, 7, 3, "#f4f0e0");
  ellipse(g, x, y, 6, 3, lvl >= 3 ? "#7a7a8a" : "#a8a898");
}
function cage(g, x, y, dir, lvl, tall) {
  const h = tall + lvl * 4,
    n = 5 + lvl * 2;
  // C-shaped net open towards the sector.
  for (let i = 0; i < n; i++) {
    const a = dir + Math.PI * (0.35 + (1.3 * i) / (n - 1)),
      cx = x + Math.cos(a) * 13,
      cy = y + Math.sin(a) * 7;
    rect(g, cx, cy - h, 1, h, lvl >= 3 && i % 2 ? "#e85a4a" : "#5a6a62");
    if (i) {
      const pa = dir + Math.PI * (0.35 + (1.3 * (i - 1)) / (n - 1));
      for (let k = 2; k < h; k += 3) line(g, x + Math.cos(pa) * 13, y + Math.sin(pa) * 7 - k, cx, cy - k, "rgba(70,90,80,0.35)");
    }
  }
}
function marker(g, x, y, label) {
  ellipse(g, x, y, 9, 4, "rgba(255,255,255,0.18)");
  rect(g, x - 1, y - 4, 3, 1, "#f4f0e0");
  rect(g, x, y - 5, 1, 3, "#f4f0e0");
  text(g, label, x, y + 3, { color: "#f4f0e0", outline: "#3a5a3a", align: "center" });
}

export function drawArena(g, s, season = 1) {
  const st = s.stadium,
    snow = season === 3,
    colors = s.colors;
  const grass = snow ? "#dfe8e0" : "#6aa04e";
  // Outer wall face (seen from the south), then the bowl.
  roundRect(g, { ...BOWL, y: BOWL.y + 12 }, "#8a7a6a");
  roundRect(g, { ...BOWL, y: BOWL.y + 10 }, "#b8a890");
  for (let x = BOWL.x + 30; x < BOWL.x + BOWL.w - 30; x += 18) rect(g, x, BOWL.y + BOWL.h + 2, 6, 6, "#6a5a4a");
  // Stand rows: thick far stand (top), thinner sides, a low near stand.
  const rows = 10;
  for (let k = 0; k < rows; k++) {
    const b = inset(BOWL, 3 * k, 5 * k, 3 * k, 2 * k);
    const seatedTop = st.stands >= 1,
      seatedSides = st.stands >= 2,
      seatedAll = st.stands >= 3;
    const bank = k % 2 ? shade(grass, -0.08) : shade(grass, 0.04);
    roundRect(g, b, st.stands === 0 ? bank : k % 2 ? "#7a8a94" : "#8a9aa4");
    // Seats: club colours in blocks.
    if (st.stands >= 1) {
      g.fillStyle = k % 3 === 0 ? colors.secondary : colors.primary;
      const y = b.y + 1;
      const x0 = seatedSides ? b.x + b.r : BOWL.x + BOWL.w * 0.28,
        x1 = seatedSides ? b.x + b.w - b.r : BOWL.x + BOWL.w * 0.72;
      if (seatedTop) for (let x = x0; x < x1; x += 4) g.fillRect(Math.round(x), y, 3, 2);
      if (seatedSides)
        for (let yy = b.y + b.r; yy < b.y + b.h - b.r; yy += 4) {
          g.fillRect(b.x + 1, yy, 2, 3);
          g.fillRect(b.x + b.w - 3, yy, 2, 3);
        }
      if (seatedAll && k < 6) for (let x = b.x + b.r; x < b.x + b.w - b.r; x += 4) g.fillRect(Math.round(x), b.y + b.h - 3, 3, 2);
    } else if (k === 3 || k === 7) for (let x = BOWL.x + 120; x < BOWL.x + BOWL.w - 120; x += 26) rect(g, x, b.y + 2, 10, 2, "#b08050");
  }
  // Field, track and infield.
  roundRect(g, FIELD, grass);
  const tc = TRACK_COLORS[st.track];
  roundRect(g, TRACK, tc);
  for (let lane = 1; lane < 6; lane++) {
    roundRect(g, inset(TRACK, lane * 3, lane * 3), shade(tc, 0.32));
    roundRect(g, inset(TRACK, lane * 3 + 1, lane * 3 + 1), tc);
  }
  roundRect(g, INFIELD, shade(grass, -0.03));
  for (let x = INFIELD.x + 8; x < INFIELD.x + INFIELD.w - 8; x += 24) rect(g, x, INFIELD.y + 4, 12, INFIELD.h - 8, shade(grass, 0.06));
  // Start and finish lines.
  rect(g, 470, TRACK.y + TRACK.h - 19, 1, 19, "#f8f8f0");
  for (let i = 0; i < 6; i++) rect(g, 246 + i * 4, TRACK.y + TRACK.h - 18 + i * 3, 2, 1, "#f8f8f0");
  // Throwing areas.
  const sp = SPOTS;
  if (st.shot) {
    sectorLines(g, sp.shot.x, sp.shot.y, 0.55, 36 + st.shot * 4, 0.3);
    circle(g, sp.shot.x, sp.shot.y, st.shot);
    rect(g, sp.shot.x + 6, sp.shot.y - 2, 2, 4, "#f4f0e0");
    if (st.shot >= 2) circle(g, sp.shot.x - 20, sp.shot.y + 4, st.shot);
    if (st.shot >= 3) for (let i = 1; i < 4; i++) rect(g, sp.shot.x + i * 10 + 4, sp.shot.y + i * 6 - 9, 5, 3, "#f2c94c");
  } else marker(g, sp.shot.x, sp.shot.y, "SHOT");
  if (st.discus) {
    sectorLines(g, sp.discus.x, sp.discus.y, 0.05, 60 + st.discus * 6, 0.32);
    circle(g, sp.discus.x, sp.discus.y, st.discus);
    cage(g, sp.discus.x, sp.discus.y, 0, st.discus, 16);
  } else marker(g, sp.discus.x, sp.discus.y, "DISCUS");
  if (st.hammer) {
    sectorLines(g, sp.hammer.x, sp.hammer.y, Math.PI + 0.1, 64 + st.hammer * 6, 0.32);
    circle(g, sp.hammer.x, sp.hammer.y, st.hammer);
    cage(g, sp.hammer.x, sp.hammer.y, Math.PI, st.hammer, 20);
  } else marker(g, sp.hammer.x, sp.hammer.y, "HAMMER");
  if (st.jav) {
    const surface = ["", "#a8c878", "#c46a4e", "#3a6ab0"][st.jav];
    sectorLines(g, sp.jav.x + 82, sp.jav.y, -0.45, 96 + st.jav * 8, 0.25);
    rect(g, sp.jav.x - 26, sp.jav.y - 2, 108, 5, surface);
    rect(g, sp.jav.x - 26, sp.jav.y - 3, 108, 1, "#f4f0e0");
    rect(g, sp.jav.x - 26, sp.jav.y + 3, 108, 1, "#f4f0e0");
    for (let i = 0; i < 4; i++) px(g, sp.jav.x + 83, sp.jav.y - 2 + i, "#f4f0e0");
    if (st.jav >= 3) for (let i = 0; i < 3; i++) rect(g, sp.jav.x + 100 + i * 18, sp.jav.y - 18 - i * 10, 6, 3, "#f2c94c");
  } else marker(g, sp.jav.x + 30, sp.jav.y - 6, "JAVELIN");
  // Training props: kit bags, cones, a hurdle stack and a water cooler by the bench.
  rect(g, 204, 318, 20, 3, "#b08050");
  rect(g, 205, 321, 1, 2, "#5a4a3a");
  rect(g, 222, 321, 1, 2, "#5a4a3a");
  for (const [x, y, c] of [[208, 314, "#2c4a7a"], [214, 315, colors.primary], [228, 316, "#c84a40"]]) rect(g, x, y, 5, 3, c), rect(g, x + 1, y - 1, 3, 1, shade(c, 0.3));
  rect(g, 196, 312, 4, 6, "#3a7ac0");
  rect(g, 196, 311, 4, 1, "#c8e8f8");
  for (let i = 0; i < 4; i++) rect(g, 398 + i * 10, 192, 2, 3, "#f08a3a"), rect(g, 397 + i * 10, 194, 4, 1, "#c86a2a");
  for (let i = 0; i < 3; i++) {
    rect(g, 470, 196 + i * 3, 12, 1, "#f4f0e0");
    rect(g, 470, 197 + i * 3, 1, 3, "#3a3e46");
    rect(g, 481, 197 + i * 3, 1, 3, "#3a3e46");
  }
  // Roof and press box on the far stand.
  if (st.stands >= 2) {
    poly(g, [[BOWL.x + 70, BOWL.y - 12], [BOWL.x + BOWL.w - 70, BOWL.y - 12], [BOWL.x + BOWL.w - 60, BOWL.y + 4], [BOWL.x + 60, BOWL.y + 4]], snow ? "#eef2f4" : "#4a5a62");
    rect(g, BOWL.x + 60, BOWL.y + 3, BOWL.w - 120, 2, "#2e3a40");
    for (let x = BOWL.x + 80; x < BOWL.x + BOWL.w - 70; x += 48) rect(g, x, BOWL.y + 4, 2, 22, "#5a6a72");
  } else if (st.stands === 1) {
    poly(g, [[BOWL.x + 150, BOWL.y - 6], [BOWL.x + BOWL.w - 150, BOWL.y - 6], [BOWL.x + BOWL.w - 140, BOWL.y + 6], [BOWL.x + 140, BOWL.y + 6]], snow ? "#eef2f4" : "#5a6a72");
  }
  if (st.studio) {
    const w = 30 + st.studio * 10;
    rect(g, 360 - w / 2 - 1, 104, w + 2, 10, "#2e3a40");
    rect(g, 360 - w / 2, 105, w, 8, "#3a5a8a");
    for (let x = 0; x < w; x += 6) rect(g, 360 - w / 2 + x, 105, 1, 8, "#8ab0e0");
    if (st.studio >= 3) {
      ellipse(g, 360 + w / 2 - 4, 92, 4, 2, "#e8ecf0");
      rect(g, 360 - w / 2 + 4, 80, 1, 16, "#8a8e96");
    }
  }
  if (st.stands >= 3) {
    rect(g, BOWL.x + BOWL.w - 46, BOWL.y + 120, 30, 20, "#1a1e22");
    rect(g, BOWL.x + BOWL.w - 46, BOWL.y + 140, 2, 18, "#5a5e60");
    text(g, "R&S", BOWL.x + BOWL.w - 31, BOWL.y + 126, { color: "#f2c94c", outline: null, align: "center" });
  }
  // Main gate.
  rect(g, GATE.x - 22, BOWL.y + BOWL.h - 6, 44, 20, "#8a7a6a");
  rect(g, GATE.x - 16, BOWL.y + BOWL.h - 2, 32, 16, "#3a3a34");
  rect(g, GATE.x - 26, BOWL.y + BOWL.h - 12, 52, 8, colors.primary);
  text(g, s.clubName.slice(0, 8).toUpperCase(), GATE.x, BOWL.y + BOWL.h - 12, { color: colors.secondary, outline: null, align: "center" });
  // Floodlight towers stand outside the bowl.
  if (st.lights) for (const [x, y] of [[150, 112], [570, 112]]) floodlight(g, x, y, st.lights);
}
export function floodlight(g, x, y, lvl) {
  const h = 48 + lvl * 12;
  rect(g, x, y - h, 2, h, "#9aa0a4");
  rect(g, x - 7, y - h - 6, 16, 7, "#3b4a4f");
  for (let k = 0; k < 3 + lvl; k++) rect(g, x - 6 + k * 4, y - h - 5, 3, 3, "#fff4cb");
}
// Front-most details that must overlap people: near floodlights.
export function drawArenaFront(g, s) {
  if (s.stadium.lights) for (const [x, y] of [[148, 396], [572, 396]]) floodlight(g, x, y, s.stadium.lights);
}
// Spectators and flags move on top of the cached stadium.
export function animateArena(g, s, now, crowd = 0.15) {
  const st = s.stadium;
  if (st.stands === 0)
    for (let k = 2; k < 9; k += 2) {
      const b = inset(BOWL, 3 * k, 5 * k, 3 * k, 2 * k);
      for (let x = BOWL.x + 110; x < BOWL.x + BOWL.w - 110; x += 5) {
        const h = hash(Math.round(x) * 7 + k * 131);
        if (h > crowd * 0.6) continue;
        rect(g, x, b.y, 2, 2, ["#f0c6a0", "#c98f66", "#7a4e36", "#e2b08a"][Math.floor(h * 97) % 4]);
        rect(g, x, b.y + 2, 2, 1, ["#e07a5a", "#5a8ad0", s.colors.primary][Math.floor(h * 31) % 3]);
      }
    }
  if (st.stands >= 1) {
    const rows = st.stands >= 3 ? 8 : st.stands >= 2 ? 6 : 4;
    for (let k = 1; k < rows; k++) {
      const b = inset(BOWL, 3 * k, 5 * k, 3 * k, 2 * k),
        x0 = st.stands >= 2 ? b.x + b.r : BOWL.x + BOWL.w * 0.28,
        x1 = st.stands >= 2 ? b.x + b.w - b.r : BOWL.x + BOWL.w * 0.72;
      for (let x = x0; x < x1; x += 4) {
        const h = hash(Math.round(x) * 7 + k * 131);
        if (h > crowd) continue;
        const bob = Math.sin(now / 300 + h * 40) > 0.92 ? 1 : 0;
        rect(g, x, b.y - 1 - bob, 2, 2, ["#f0c6a0", "#c98f66", "#7a4e36", "#e2b08a"][Math.floor(h * 97) % 4]);
      }
    }
  }
  if (st.stands >= 2)
    for (const x of [BOWL.x + 90, BOWL.x + BOWL.w - 90]) {
      const wave = Math.round(Math.sin(now / 280 + x) * 1);
      rect(g, x, BOWL.y - 24, 1, 12, "#8a8e90");
      rect(g, x + 1, BOWL.y - 24 + wave, 7, 2, s.colors.primary);
      rect(g, x + 1, BOWL.y - 22 + wave, 7, 2, s.colors.secondary);
    }
}
