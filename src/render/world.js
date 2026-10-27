import { canvas, rect, poly, ellipse, shade, hash, px, mix } from "./pixel.js";
import { text } from "./font.js";
import { figure, shadow, athleteLook } from "./sprites.js";
import { drawFacility, animateFacility, lockedPlot, emptyPlot, tree, bush, bench } from "./buildings.js";
import { LEAGUES, PLOT_ORDER, STAT_SHORT, STAT_COLORS, showStat, SKINS, HAIRS } from "../game-content.js";
import { plotUnlocked, plotsOpen, plannedActivity, visitorsPerDay } from "../domain/game.js";

export const W = 480,
  H = 270;
const GX = 32,
  GY = 54,
  CW = 104,
  CH = 64;
export const cellXY = (i) => [GX + (i % 4) * CW, GY + Math.floor(i / 4) * CH];
const PATH_Y = [110, 174, 238],
  PATH_X = [28, 136, 240, 344, 452];
const seasonOf = (s) => (s.season - 1) % 4;
const LEAGUE_FOR_PLOT = (i) => PLOT_ORDER.indexOf(i) < 6 ? 0 : PLOT_ORDER.indexOf(i) < 8 ? 1 : PLOT_ORDER.indexOf(i) < 10 ? 2 : 3;

// Lane centre of the rounded-rectangle track, for joggers.
const TRACK = { x: 14, y: 42, w: 452, h: 216, r: 38 };
function trackPoint(u) {
  const { x, y, w, h, r } = TRACK,
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
function roundRect(g, x, y, w, h, r, c) {
  g.fillStyle = c;
  for (let yy = 0; yy < h; yy++) {
    let inset = 0;
    if (yy < r) inset = r - Math.round(Math.sqrt(Math.max(0, r * r - (r - yy - 0.5) ** 2)));
    else if (yy >= h - r) inset = r - Math.round(Math.sqrt(Math.max(0, r * r - (yy - (h - r) + 0.5) ** 2)));
    g.fillRect(x + inset, y + yy, w - inset * 2, 1);
  }
}

function baseWorld(s) {
  const c = canvas(W, H),
    g = c.getContext("2d"),
    season = seasonOf(s);
  const grass = ["#7fae5a", "#6aa04e", "#9aa04e", "#c8d4c8"][season],
    grass2 = ["#8cbc66", "#78ae58", "#a8ac58", "#dae2da"][season];
  // Sky and distant town.
  const sky = [["#a8d4e8", "#e8f0d8"], ["#8ccbe8", "#e8f4e0"], ["#b8c8d8", "#f0e0c8"], ["#c8d4e0", "#eef2f4"]][season];
  for (let y = 0; y < 40; y++) rect(g, 0, y, W, 1, mix(sky[0], sky[1], y / 40));
  ellipse(g, 410, 14, 8, 8, "#fff2c0");
  for (let i = 0; i < 3; i++) {
    const pts = [[0, 40]];
    for (let x = 0; x <= W; x += 6) pts.push([x, 22 + i * 5 + Math.round(Math.sin(x * 0.021 + i * 2) * 5 + Math.cos(x * 0.047 + i) * 3)]);
    pts.push([W, 40]);
    poly(g, pts, mix(["#9cc0b0", "#84ac94", "#6c9a7c"][i], "#d8e0e4", season === 3 ? 0.45 : 0));
  }
  for (let i = 0; i < 22; i++) {
    const x = 6 + i * 22 + Math.round(hash(i) * 6),
      h = 6 + Math.round(hash(i + 40) * 10);
    rect(g, x, 34 - h, 12, h, ["#e8dcc0", "#d8c8a8", "#e0d0b8"][i % 3]);
    poly(g, [[x - 1, 34 - h], [x + 6, 29 - h], [x + 13, 34 - h]], season === 3 ? "#f4f6f8" : ["#b85a3a", "#8a6a5a", "#a0503a"][i % 3]);
    rect(g, x + 3, 36 - h, 2, 2, "#7a9aaa");
  }
  rect(g, 0, 34, W, H - 34, grass);
  for (let i = 0; i < 260; i++) px(g, Math.round(hash(i) * W), 36 + Math.round(hash(i + 999) * (H - 36)), i % 3 ? grass2 : shade(grass, -0.12));
  // Fence at the back.
  for (let x = 2; x < W; x += 6) rect(g, x, 30, 1, 6, "#e8dcc0");
  rect(g, 0, 31, W, 1, "#f0e6cc");
  // The track: a rounded rectangle with four lanes.
  roundRect(g, 6, 34, 468, 232, 46, "#e8dcc0");
  roundRect(g, 8, 36, 464, 228, 44, "#c46a4e");
  for (let k = 1; k < 4; k++) {
    const inset = k * 3;
    g.globalAlpha = 0.5;
    roundRect(g, 8 + inset, 36 + inset, 464 - inset * 2, 228 - inset * 2, 44 - inset, "#f4e4c8");
    roundRect(g, 9 + inset, 37 + inset, 462 - inset * 2, 226 - inset * 2, 43 - inset, "#c46a4e");
    g.globalAlpha = 1;
  }
  roundRect(g, 20, 48, 440, 204, 32, "#e8dcc0");
  roundRect(g, 21, 49, 438, 202, 31, grass);
  for (let y = 52; y < 250; y += 8) rect(g, 40, y, 400, 4, shade(grass, 0.05));
  // Paths between plots.
  const path = season === 3 ? "#e4e0d8" : "#dccca4";
  for (const y of PATH_Y) {
    rect(g, 24, y, 432, 5, path);
    rect(g, 24, y + 5, 432, 1, shade(path, -0.18));
  }
  for (const x of PATH_X) {
    rect(g, x - 2, 52, 5, 194, path);
    rect(g, x + 3, 52, 1, 194, shade(path, -0.18));
  }
  rect(g, 236, 238, 9, 32, path);
  // Perimeter scenery.
  for (const [x, y, sc] of [[6, 70, 0.7], [474, 80, 0.7], [4, 200, 0.8], [476, 210, 0.8], [30, 268, 0.7], [452, 268, 0.75], [120, 268, 0.6], [360, 268, 0.6]]) tree(g, x, y, sc, season, x);
  for (const x of [64, 100, 380, 416]) bench(g, x, 268);
  for (const x of [170, 196, 284, 310]) bush(g, x, 270, season);
  // Gate.
  rect(g, 222, 254, 3, 16, "#6a5a4a");
  rect(g, 256, 254, 3, 16, "#6a5a4a");
  rect(g, 220, 252, 41, 7, s.colors.primary);
  text(g, "R&S", 240, 252, { color: s.colors.secondary, outline: null, align: "center" });
  // Plots, back row first so fronts overlap correctly.
  for (let i = 0; i < 12; i++) {
    const [x, y] = cellXY(i),
      p = s.plots[i];
    if (!plotUnlocked(s, i)) lockedPlot(g, x, y, LEAGUES[LEAGUE_FOR_PLOT(i)].name.split(" ")[0].toUpperCase());
    else if (!p) emptyPlot(g, x, y);
    else {
      drawFacility(g, p.type, p.level, x, y, { season, colors: s.colors });
      // Lamp post and planting give every built plot a finished edge.
      rect(g, x + 96, y + 34, 1, 22, "#5a5e60");
      rect(g, x + 95, y + 33, 3, 2, "#f6e0a0");
      bush(g, x + 12, y + 56, season);
    }
  }
  return c;
}

// Where an athlete stands for an activity.
const ACTIVITY = {
  power: { type: "gym", pose: "lift", fx: [24, 36, 48, 60] },
  technique: { type: "rings", pose: "drill", fx: [22, 34, 50, 62], fy: 46 },
  speed: { type: "sprint", pose: "run", run: true },
  focus: { type: "studio", pose: "study", fx: [30, 44, 58, 72] },
  sharpen: { type: "rings", pose: "drill", fx: [44, 56, 68, 30], fy: 48 },
  rest: { type: "spa", pose: "sit", fx: [48, 60, 72, 84] },
  injured: { type: "spa", pose: "sit", fx: [76, 86, 40, 52] },
};
function plotOf(s, type) {
  return s.plots.findIndex((p) => p?.type === type);
}

export function createWorld(cv) {
  const off = canvas(W, H),
    g = off.getContext("2d");
  const out = cv.getContext("2d");
  let base = null,
    key = "";
  const popups = [],
    banners = [],
    sparks = [],
    flashes = [];
  const people = new Map(); // athlete id → {x, y, tx, ty, t0}
  let visitors = [];
  let activities = new Map();

  function targetFor(s, a, index, now, counts) {
    const act = activities.get(a.id) || plannedActivity(s, a);
    if (act === "balanced" || (act === "speed" && plotOf(s, "sprint") < 0)) {
      const [x, y, dir] = trackPoint(now / 60000 + index * 0.13);
      return { x, y: y + 3, pose: "run", flip: dir < 0, onTrack: true };
    }
    const spec = ACTIVITY[act] || ACTIVITY.rest;
    let i = plotOf(s, spec.type);
    if (i < 0) i = act === "technique" || act === "sharpen" ? -1 : 0;
    if (i < 0) {
      const [x, y] = [180 + index * 14, 236];
      return { x, y, pose: spec.pose, flip: false };
    }
    const n = (counts[i] = (counts[i] || 0) + 1) - 1;
    const [cx, cy] = cellXY(i);
    if (spec.run) {
      const lane = n % 3,
        p = ((now / 1800 + n * 0.37) % 1);
      return { x: cx + 18 + p * 64 + lane * 2, y: cy + 50 - lane * 5, pose: "run", flip: false, onTrack: true };
    }
    const fx = (spec.fx || [30, 44, 58, 72])[n % 4] + Math.floor(n / 4) * 6;
    const restAtClub = spec.type === "spa" && s.plots[i]?.type === "club";
    return { x: cx + fx, y: cy + (spec.fy || 59), pose: restAtClub ? "idle" : spec.pose, flip: false };
  }
  function makeVisitors(s, n) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const h = (k) => hash(i * 31 + k + s.season * 7);
      list.push({
        look: { skin: SKINS[Math.floor(h(1) * SKINS.length)], hair: HAIRS[Math.floor(h(2) * HAIRS.length)], style: Math.floor(h(3) * 6) },
        shirt: ["#e07a5a", "#5a8ad0", "#f0c060", "#9a6ad0", "#4aa07a", "#e05a8a", "#f4efe2"][Math.floor(h(4) * 7)],
        col: Math.floor(h(5) * 5),
        row: Math.floor(h(6) * 3),
        tx: null,
        x: 0,
        y: 0,
        t0: 0,
        dur: 1,
        wait: 0,
        step: 0,
        seed: i,
        fans: h(7) < 0.3,
      });
    }
    return list;
  }
  function stepVisitor(v, now) {
    if (v.tx == null) {
      v.x = PATH_X[v.col];
      v.y = PATH_Y[v.row] + 3;
      v.fx = v.x;
      v.fy = v.y;
    }
    const r = hash(v.seed * 97 + v.step++);
    if (r < 0.5) v.col = Math.max(0, Math.min(4, v.col + (r < 0.25 ? -1 : 1)));
    else v.row = Math.max(0, Math.min(2, v.row + (r < 0.75 ? -1 : 1)));
    v.fx = v.x;
    v.fy = v.y;
    v.tx = PATH_X[v.col];
    v.ty = PATH_Y[v.row] + 3;
    v.t0 = now;
    v.dur = Math.max(400, (Math.abs(v.tx - v.fx) + Math.abs(v.ty - v.fy)) * 55);
    v.wait = hash(v.seed + v.step * 13) < 0.25 ? 1500 + hash(v.step) * 2500 : 0;
  }

  function draw(s, now, o = {}) {
    // The scene grows vertically to fill its frame: extra sky above, extra lawn below.
    const LH = Math.max(H, Math.round(cv.height / 2)),
      top = Math.floor((LH - H) / 2);
    if (off.height !== LH) off.height = LH;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const season = seasonOf(s);
    g.fillStyle = [["#a8d4e8"], ["#8ccbe8"], ["#b8c8d8"], ["#c8d4e0"]][season][0];
    g.fillRect(0, 0, W, top + 1);
    g.fillStyle = ["#7fae5a", "#6aa04e", "#9aa04e", "#c8d4c8"][season];
    g.fillRect(0, top + H - 1, W, LH - H - top + 1);
    g.translate(0, top);
    const k = s.plots.map((p) => (p ? p.type + p.level : "-")).join("|") + plotsOpen(s) + seasonOf(s) + s.colors.primary + s.colors.secondary;
    if (k !== key) {
      base = baseWorld(s);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    // Clouds and birds.
    for (let i = 0; i < 4; i++) {
      const x = ((now * 0.004 + i * 140) % 560) - 40,
        y = 8 + i * 5;
      ellipse(g, x, y, 12, 3, "rgba(255,255,255,0.75)");
      ellipse(g, x + 6, y - 2, 6, 3, "rgba(255,255,255,0.75)");
    }
    for (let i = 0; i < 12; i++) {
      const p = s.plots[i];
      if (p) {
        const [x, y] = cellXY(i);
        animateFacility(g, p.type, p.level, x, y, now);
        if (p.type === "club" || p.type === "shop") {
          const fxp = x + (p.type === "club" ? 16 : 58 + (p.level > 1 ? 12 : 0)) + 1,
            fy = y + 52 - (p.type === "club" ? (p.level > 2 ? 34 : 24) : 18);
          const wave = Math.round(Math.sin(now / 300 + i) * 1);
          rect(g, fxp, fy, 8, 2, s.colors.primary);
          rect(g, fxp, fy + 2 + wave, 8, 2, s.colors.secondary);
          rect(g, fxp + 8, fy + 1 + wave, 1, 2, s.colors.primary);
        }
      }
    }
    // Selection.
    const pulse = Math.floor(now / 250) % 2;
    const highlight = (i, col) => {
      const [x, y] = cellXY(i);
      g.fillStyle = col;
      g.fillRect(x + 6, y + 22, 92, 1);
      g.fillRect(x + 6, y + 58, 92, 1);
      g.fillRect(x + 6, y + 22, 1, 36);
      g.fillRect(x + 97, y + 22, 1, 36);
      for (const [cx, cy] of [[x + 6, y + 22], [x + 95, y + 22], [x + 6, y + 56], [x + 95, y + 56]]) g.fillRect(cx, cy, 3, 3);
    };
    if (o.moving != null) for (let i = 1; i < 12; i++) if (plotUnlocked(s, i) && i !== o.moving) highlight(i, pulse ? "#9fe0ff" : "#5ab0e0");
    if (o.selected >= 0) highlight(o.selected, pulse ? "#fff2a0" : "#f2c94c");
    // Characters: visitors and athletes, depth-sorted by feet.
    const want = Math.min(22, visitorsPerDay(s));
    if (visitors.length !== want) visitors = makeVisitors(s, want);
    const drawList = [];
    for (const v of visitors) {
      if (v.tx == null || now - v.t0 > v.dur + v.wait) stepVisitor(v, now);
      const t = Math.min(1, (now - v.t0) / v.dur),
        x = v.fx + (v.tx - v.fx) * t,
        y = v.fy + (v.ty - v.fy) * t,
        moving = t < 1;
      drawList.push({ y, draw: () => { shadow(g, x, y, 4); figure(g, { look: v.look, shirt: v.shirt, collar: "#f4efe2", pose: moving ? "walk" : v.fans ? "wave" : "idle", frame: moving ? Math.floor(now / 150 + v.seed) % 4 : Math.floor(now / 600 + v.seed) % 2, flip: v.tx < v.fx }, x, y); } });
    }
    const counts = {};
    s.roster.forEach((a, index) => {
      const target = targetFor(s, a, index, now, counts);
      let p = people.get(a.id);
      if (!p) people.set(a.id, (p = { x: target.x, y: target.y, fx: target.x, fy: target.y, t0: 0, tx: target.x, ty: target.y }));
      if (target.onTrack || Math.abs(target.x - p.tx) + Math.abs(target.y - p.ty) > 24 && !p.walking) {
        if (target.onTrack) Object.assign(p, { x: target.x, y: target.y, tx: target.x, ty: target.y, walking: false });
        else Object.assign(p, { fx: p.x, fy: p.y, tx: target.x, ty: target.y, t0: now, walking: true });
      } else if (!p.walking) Object.assign(p, { tx: target.x, ty: target.y, x: target.x, y: target.y });
      let pose = target.pose,
        frame = Math.floor(now / (pose === "run" ? 110 : pose === "lift" ? 520 : 420) + index) % 4,
        flip = target.flip;
      if (p.walking) {
        const d = Math.hypot(p.tx - p.fx, p.ty - p.fy),
          t = Math.min(1, (now - p.t0) / Math.max(300, d * 22));
        p.x = p.fx + (p.tx - p.fx) * t;
        p.y = p.fy + (p.ty - p.fy) * t;
        pose = "walk";
        frame = Math.floor(now / 120 + index) % 4;
        flip = p.tx < p.fx;
        if (t >= 1) p.walking = false;
      }
      p.screen = [p.x, p.y];
      drawList.push({ y: p.y + 0.5, draw: () => { shadow(g, p.x, p.y, 5); figure(g, { ...athleteLook(a, s.colors), pose, frame, flip }, p.x, p.y); if (pose === "sit" && Math.floor(now / 700) % 2) text(g, "z", p.x + 6, p.y - 30, { color: "#ffffff" }); } });
    });
    drawList.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    // Particles and floating text.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const q = sparks[i],
        t = (now - q.t0) / q.dur;
      if (t >= 1 || t < 0) {
        if (t >= 1) sparks.splice(i, 1);
        continue;
      }
      px(g, q.x + q.vx * t * 30, q.y + q.vy * t * 30 + t * t * 12, q.color);
    }
    for (const f of flashes) {
      const t = (now - f.t0) / 1400;
      if (t < 0 || t > 1) continue;
      const [x, y] = cellXY(f.i);
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2 + t * 3;
        ellipse(g, x + 52 + Math.cos(a) * (14 + t * 20), y + 44 + Math.sin(a) * 6, 3, 2, `rgba(240,230,210,${0.8 - t * 0.8})`);
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const q = popups[i],
        t = (now - q.t0) / q.dur;
      if (t >= 1) {
        popups.splice(i, 1);
        continue;
      }
      if (t < 0) continue;
      let x = q.x,
        y = q.y;
      if (q.follow != null) {
        const p = people.get(q.follow);
        if (p) (x = p.x), (y = p.y - 34 - q.stack * 9);
      }
      g.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
      const half = (q.text.length * 6 * (q.scale || 1)) / 2;
      x = Math.max(half + 2, Math.min(W - half - 2, x));
      text(g, q.text, x, y - Math.min(1, t * 2.5) * 10, { color: q.color, scale: q.scale || 1, align: "center" });
      g.globalAlpha = 1;
    }
    // Time-of-day light.
    const p = o.dayProgress ?? 0.45;
    if (p < 0.2) {
      g.fillStyle = `rgba(255,220,160,${(0.2 - p) * 0.6})`;
      g.fillRect(0, 0, W, H);
    } else if (p > 0.7) {
      g.fillStyle = `rgba(255,140,80,${(p - 0.7) * 0.4})`;
      g.fillRect(0, 0, W, H);
    }
    // Banners.
    for (let i = banners.length - 1; i >= 0; i--) {
      const b = banners[i],
        t = (now - b.t0) / b.dur;
      if (t >= 1) {
        banners.splice(i, 1);
        continue;
      }
      const slide = Math.min(1, t * 6),
        fade = t > 0.85 ? (1 - t) / 0.15 : 1;
      g.globalAlpha = fade;
      const y = 112;
      rect(g, 0, y, W * slide, 34, "rgba(30,40,36,0.82)");
      rect(g, 0, y, W * slide, 1, b.color);
      rect(g, 0, y + 33, W * slide, 1, b.color);
      if (slide >= 1) {
        text(g, b.text, W / 2, y + 5, { color: b.color, scale: 2, align: "center" });
        if (b.sub) text(g, b.sub, W / 2, y + 23, { color: "#fff6dc", align: "center" });
      }
      g.globalAlpha = 1;
      break;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.drawImage(off, 0, 0, cv.width, cv.height);
  }

  // Turn a day report into motion on the grounds.
  function onDay(s, report, now, dayMs) {
    activities = new Map(report.athletes.map((e) => [e.id, e.activity]));
    report.athletes.forEach((e, n) => {
      const total = e.gains.reduce((a, b) => a + b, 0);
      if (total <= 0.001 && e.activity !== "rest") return;
      const best = e.gains.indexOf(Math.max(...e.gains));
      const label = e.activity === "rest" ? "REST" : e.activity === "injured" ? "OUCH" : e.activity === "balanced" || e.activity === "sharpen" ? "+" + showStat(total) + " ALL" : "+" + showStat(e.gains[best]) + " " + STAT_SHORT[best];
      popups.push({ follow: e.id, stack: 0, x: 0, y: 0, text: label, color: e.activity === "rest" ? "#bfe8ff" : STAT_COLORS[best], t0: now + dayMs * 0.35 + n * 70, dur: Math.min(1600, dayMs * 0.6) });
    });
    for (const l of report.levelUps) popups.push({ follow: l.id, stack: 1, x: 0, y: 0, text: "LV " + l.level + "!", color: "#f2c94c", t0: now + dayMs * 0.5, dur: 1500 });
    for (const sp of report.spend) {
      const [x, y] = cellXY(sp.plot);
      popups.push({ x: x + 52, y: y + 24, text: "+$" + sp.amount, color: "#f2d060", t0: now + dayMs * 0.55, dur: 1400 });
    }
    if (report.week) banner("PAYDAY", (report.week.net >= 0 ? "+" : "-") + "$" + Math.abs(report.week.net) + " AFTER WAGES", "#f2d060", now);
  }
  function popup(x, y, str, color = "#fff6dc", now = performance.now(), scale = 1) {
    popups.push({ x, y, text: str, color, t0: now, dur: 1500, scale });
  }
  function banner(str, sub = "", color = "#f2c94c", now = performance.now(), dur = 2200) {
    banners.length = 0;
    banners.push({ text: str, sub, color, t0: now, dur });
  }
  function flashPlot(i, label, now = performance.now()) {
    flashes.length = 0;
    flashes.push({ i, t0: now });
    const [x, y] = cellXY(i);
    popup(x + 52, y + 18, label, "#f2c94c", now);
    for (let n = 0; n < 18; n++) sparks.push({ x: x + 52, y: y + 30, vx: Math.cos(n) * (0.5 + hash(n)), vy: -0.8 - hash(n + 3), color: ["#f2c94c", "#fff6dc", "#9fe0ff"][n % 3], t0: now, dur: 900 });
  }
  function hit(clientX, clientY) {
    const r = cv.getBoundingClientRect(),
      LH = Math.max(H, Math.round(cv.height / 2)),
      scale = Math.min(r.width / W, r.height / LH),
      x = (clientX - r.left - (r.width - W * scale) / 2) / scale,
      y = (clientY - r.top - (r.height - LH * scale) / 2) / scale - Math.floor((LH - H) / 2);
    for (let i = 0; i < 12; i++) {
      const [cx, cy] = cellXY(i);
      if (x >= cx + 4 && x < cx + CW - 4 && y >= cy + 4 && y < cy + CH) return i;
    }
    return -1;
  }
  return { draw, onDay, popup, banner, flashPlot, hit, reset: () => (people.clear(), activities.clear()), replan: () => activities.clear() };
}
