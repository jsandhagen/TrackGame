import { canvas, rect, ellipse, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";
import { figure, shadow, athleteLook } from "./sprites.js";
import { drawFacility, animateFacility, lockedPlot, emptyPlot, tree, bush, bench } from "./buildings.js";
import { drawArena, drawArenaFront, animateArena, loopPoint, insideBowl, roundRect, BOWL, TRACK, SPOTS, GATE } from "./arena.js";
import { LEAGUES, PLOT_ORDER, PLOTS_BY_LEAGUE, STAT_SHORT, STAT_COLORS, SKINS, HAIRS, CLUB_PLOT } from "../game-content.js";
import { plotUnlocked, plotsOpen, plannedActivity, visitorsPerDay } from "../domain/game.js";

export const MAP_W = 720,
  MAP_H = 480;
// Building plots: a ring around the stadium (see PLOT_COUNT in game-content).
export const CELLS = [
  [6, 4], [148, 4], [306, 4], [464, 4], [606, 4],
  [606, 118], [606, 214],
  [606, 398], [464, 398],
  [148, 398], [6, 398],
  [6, 214], [6, 118],
];
const CW = 108,
  CH = 80;
const CONCOURSE = { x: 118, y: 88, w: 484, h: 332, r: 88 };
const WALKWAY = { x: 127, y: 94, w: 466, h: 316, r: 82 };
const LANE = { x: 183, y: 165, w: 354, h: 192, r: 51 };
const seasonOf = (s) => (s.season - 1) % 4;
const leagueForPlot = (i) => PLOTS_BY_LEAGUE.findIndex((n) => PLOT_ORDER.indexOf(i) < n);
const front = (i) => [CELLS[i][0], CELLS[i][1] + 68];

function baseWorld(s) {
  const c = canvas(MAP_W, MAP_H),
    g = c.getContext("2d"),
    season = seasonOf(s);
  const grass = ["#7fae5a", "#6aa04e", "#9aa04e", "#d4ddd2"][season],
    grass2 = ["#8cbc66", "#78ae58", "#a8ac58", "#e6ece6"][season];
  rect(g, 0, 0, MAP_W, MAP_H, grass);
  for (let i = 0; i < 900; i++) px(g, Math.round(hash(i) * MAP_W), Math.round(hash(i + 999) * MAP_H), i % 3 ? grass2 : shade(grass, -0.12));
  // Concourse, gate plaza and the road out.
  const paving = season === 3 ? "#e8e6e0" : "#d8ccb0";
  roundRect(g, CONCOURSE, paving);
  for (let i = 0; i < 400; i++) px(g, CONCOURSE.x + hash(i * 3) * CONCOURSE.w, CONCOURSE.y + hash(i * 5 + 1) * CONCOURSE.h, shade(paving, -0.08));
  rect(g, 304, 404, 112, 76, paving);
  rect(g, 340, 404, 40, 76, "#7a7a78");
  for (let y = 410; y < 480; y += 10) rect(g, 359, y, 2, 5, "#f4f0e0");
  // Paths from each plot to the concourse.
  for (const [x, y] of CELLS) {
    const cx = x + CW / 2,
      fy = y + 70;
    if (y < 50) rect(g, cx - 3, fy, 6, 92 - fy, paving);
    else if (y > 300) rect(g, cx - 3, 404, 6, Math.max(0, y + 20 - 404), paving);
    else if (x < 50) rect(g, x + CW - 4, y + 52, 128 - (x + CW - 4), 6, paving);
    else rect(g, 592, y + 52, x + 4 - 592, 6, paving);
  }
  for (const [x, y, sc] of [[130, 330, 0.8], [592, 330, 0.8], [130, 196, 0.7], [592, 196, 0.6], [270, 476, 0.7], [450, 476, 0.7], [118, 92, 0.6], [602, 92, 0.6], [60, 318, 0.8], [660, 318, 0.75], [40, 108, 0.6], [690, 108, 0.6]]) tree(g, x, y, sc, season, x);
  for (const x of [312, 396]) bench(g, x, 440);
  for (const x of [292, 428]) bush(g, x, 470, season);
  // Car park and bus bay by the gate.
  for (const x of [260, 428]) {
    rect(g, x, 406, 30, 72, "#8a8a86");
    for (let i = 0; i < 5; i++) rect(g, x, 406 + i * 16, 30, 1, "#e8e4d8");
  }
  for (let i = 0; i < 4; i++) {
    car(g, 266, 410 + i * 16, ["#c84a40", "#4a7ac0", "#e8e4d8", "#5a9a5a"][i]);
    car(g, 434, 410 + i * 16, ["#e8b040", "#7a7a80", "#c84a40", "#4a7ac0"][(i + 1) % 4]);
  }
  bus(g, 346, 450, s.colors);
  // Hedges and flowerbeds along the concourse edge.
  for (let x = 140; x < 256; x += 14) hedge(g, x, 422, season);
  for (let x = 462; x < 590; x += 14) hedge(g, x, 422, season);
  for (const [x, y] of [[124, 160], [124, 270], [588, 160], [588, 270]]) flowerbed(g, x, y);
  drawArena(g, s, season);
  // Plots, back row first so fronts overlap correctly.
  const order = CELLS.map((_, i) => i).sort((a, b) => CELLS[a][1] - CELLS[b][1]);
  for (const i of order) {
    const [x, y] = CELLS[i],
      p = s.plots[i];
    if (!plotUnlocked(s, i)) lockedPlot(g, x + 2, y + 14, LEAGUES[leagueForPlot(i)].name.split(" ")[0].toUpperCase());
    else if (!p) emptyPlot(g, x + 2, y + 14);
    else {
      drawFacility(g, p.type, p.level, x + 2, y + 14, { season, colors: s.colors });
      rect(g, x + 98, y + 48, 1, 22, "#5a5e60");
      rect(g, x + 97, y + 47, 3, 2, "#f6e0a0");
    }
  }
  return c;
}

function car(g, x, y, c) {
  rect(g, x, y + 1, 18, 8, shade(c, -0.25));
  rect(g, x, y, 18, 7, c);
  rect(g, x + 4, y - 3, 10, 4, shade(c, 0.15));
  rect(g, x + 5, y - 2, 3, 2, "#9cc8d8");
  rect(g, x + 10, y - 2, 3, 2, "#9cc8d8");
  rect(g, x + 2, y + 7, 3, 2, "#2a2a2a");
  rect(g, x + 13, y + 7, 3, 2, "#2a2a2a");
}
function bus(g, x, y, colors) {
  rect(g, x, y - 14, 30, 16, colors.primary);
  rect(g, x, y - 14, 30, 2, shade(colors.primary, 0.3));
  for (let i = 0; i < 4; i++) rect(g, x + 2 + i * 7, y - 11, 5, 4, "#9cc8d8");
  rect(g, x, y - 5, 30, 2, colors.secondary);
  rect(g, x + 4, y + 1, 4, 3, "#2a2a2a");
  rect(g, x + 22, y + 1, 4, 3, "#2a2a2a");
}
function hedge(g, x, y, season) {
  const c = ["#4e8a48", "#3e7a40", "#7a8a40", "#c8d4c8"][season];
  rect(g, x, y - 5, 12, 6, c);
  rect(g, x + 1, y - 6, 10, 2, shade(c, 0.2));
}
function flowerbed(g, x, y) {
  rect(g, x - 6, y, 12, 8, "#8a6040");
  for (let i = 0; i < 6; i++) px(g, x - 5 + (i % 3) * 4, y + 1 + Math.floor(i / 3) * 4, ["#f06a6a", "#f6d04c", "#c890e0"][i % 3]);
}

// Where an athlete stands for today's activity, in map coordinates.
function targetFor(s, a, index, now, activity, counts) {
  const slot = (key) => (counts[key] = (counts[key] || 0) + 1) - 1;
  const plotOf = (type) => s.plots.findIndex((p) => p?.type === type);
  if (activity === "balanced") {
    const [x, y, dir] = loopPoint(LANE, now / 50000 + index * 0.11);
    return { x, y: y + 2, pose: "run", flip: dir < 0, follow: true };
  }
  if (activity === "speed") {
    const n = slot("speed"),
      t = (now / 2600 + n * 0.3) % 1;
    return { x: 240 + t * 230, y: TRACK.y + TRACK.h - 4 - (n % 4) * 3, pose: "run", flip: false, follow: true };
  }
  if (activity === "technique" || activity === "sharpen") {
    const ev = a.event,
      sp = SPOTS[ev],
      n = slot(ev),
      built = s.stadium[ev] > 0;
    if (ev === "jav" && built && n === 0) {
      const t = (now / 2200) % 1;
      return { x: sp.x - 22 + t * 96, y: sp.y + 1, pose: t < 0.85 ? "carry" : "throw", event: "jav", frame: t < 0.85 ? Math.floor(now / 110) % 4 : 2, follow: true };
    }
    const off = [[-4, 6], [12, 10], [-16, 12], [22, 4]][n % 4];
    return { x: sp.x + off[0], y: sp.y + off[1], pose: built ? "throw" : "drill", event: ev, frame: Math.floor(now / 420 + index) % 4, flip: ev === "hammer" };
  }
  if (activity === "focus") {
    const n = slot("focus");
    if (s.stadium.studio) return { x: 336 + n * 14, y: 154, pose: "study" };
    const [x, y] = front(CLUB_PLOT);
    return { x: x + 30 + n * 12, y, pose: "study" };
  }
  if (activity === "power") {
    const n = slot("power"),
      i = plotOf("gym");
    if (i >= 0) {
      const [x, y] = front(i);
      return { x: x + 26 + n * 14, y, pose: "lift" };
    }
    return { x: 330 + n * 14, y: 262, pose: "lift" };
  }
  // Rest and injuries: the spa, else the clubhouse steps.
  const n = slot("rest"),
    i = plotOf("spa") >= 0 ? plotOf("spa") : CLUB_PLOT,
    [x, y] = front(i);
  return { x: x + 28 + n * 12, y, pose: "sit" };
}

export function createWorld(cv) {
  const world = canvas(MAP_W, MAP_H),
    g = world.getContext("2d");
  let screen = canvas(320, 180),
    sg = screen.getContext("2d");
  const out = cv.getContext("2d");
  let base = null,
    key = "";
  const cam = { x: 350, y: 272, zoom: 0, scale: 2, vw: 320, vh: 180 };
  const popups = [],
    banners = [],
    sparks = [],
    flashes = [];
  const people = new Map();
  let visitors = [],
    activities = new Map();

  function resize() {
    const dpr = window.devicePixelRatio || 1,
      cw = Math.max(1, Math.round(cv.clientWidth * dpr)),
      ch = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) (cv.width = cw), (cv.height = ch);
    // Start wide enough to take in the whole stadium.
    if (!cam.zoom) cam.zoom = Math.max(1.5, Math.min(4, Math.round(Math.min(cv.clientHeight / 330, cv.clientWidth / 260) * 2) / 2));
    cam.scale = Math.max(1, Math.round(cam.zoom * dpr));
    cam.vw = Math.ceil(cw / cam.scale);
    cam.vh = Math.ceil(ch / cam.scale);
    if (screen.width !== cam.vw || screen.height !== cam.vh) {
      screen = canvas(cam.vw, cam.vh);
      sg = screen.getContext("2d");
    }
    clampCam();
  }
  function clampCam() {
    const hw = cam.vw / 2,
      hh = cam.vh / 2;
    cam.x = cam.vw >= MAP_W ? MAP_W / 2 : Math.max(hw, Math.min(MAP_W - hw, cam.x));
    cam.y = cam.vh >= MAP_H ? MAP_H / 2 : Math.max(hh, Math.min(MAP_H - hh, cam.y));
  }
  const origin = () => [Math.round(cam.x - cam.vw / 2), Math.round(cam.y - cam.vh / 2)];
  function toWorld(clientX, clientY) {
    const r = cv.getBoundingClientRect(),
      [ox, oy] = origin(),
      k = cv.width / r.width / cam.scale;
    return [ox + (clientX - r.left) * k, oy + (clientY - r.top) * k];
  }
  function makeVisitors(s, n) {
    return Array.from({ length: n }, (_, i) => {
      const h = (k) => hash(i * 31 + k + s.season * 7);
      return {
        look: { skin: SKINS[Math.floor(h(1) * SKINS.length)], hair: HAIRS[Math.floor(h(2) * HAIRS.length)], style: Math.floor(h(3) * 6) },
        shirt: h(8) < 0.35 ? s.colors.primary : ["#e07a5a", "#5a8ad0", "#f0c060", "#9a6ad0", "#4aa07a", "#e05a8a", "#f4efe2"][Math.floor(h(4) * 7)],
        u: h(5),
        speed: (0.004 + h(6) * 0.004) * (h(7) < 0.5 ? 1 : -1),
        seed: i,
        pause: 0,
        last: 0,
      };
    });
  }

  function draw(s, now, o = {}) {
    resize();
    const k = s.plots.map((p) => (p ? p.type + p.level : "-")).join("|") + JSON.stringify(s.stadium) + plotsOpen(s) + seasonOf(s) + s.colors.primary + s.colors.secondary + s.clubName;
    if (k !== key) {
      base = baseWorld(s);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    animateArena(g, s, now, Math.min(0.85, 0.06 + s.fans / 3000));
    for (let i = 0; i < CELLS.length; i++) {
      const p = s.plots[i];
      if (!p) continue;
      const [x, y] = CELLS[i];
      animateFacility(g, p.type, p.level, x + 2, y + 14, now);
      if (p.type === "club" || p.type === "shop") {
        const fx = x + 2 + (p.type === "club" ? 12 : 58 + (p.level > 1 ? 12 : 0)) + 1,
          fy = y + 66 - (p.type === "club" ? (p.level > 2 ? 34 : 24) : 18),
          wave = Math.round(Math.sin(now / 300 + i));
        rect(g, fx, fy, 8, 2, s.colors.primary);
        rect(g, fx, fy + 2 + wave, 8, 2, s.colors.secondary);
      }
    }
    // Selection highlight.
    const pulse = Math.floor(now / 250) % 2;
    const box = (x, y, w, h, col) => {
      g.fillStyle = col;
      g.fillRect(x, y, w, 1);
      g.fillRect(x, y + h - 1, w, 1);
      g.fillRect(x, y, 1, h);
      g.fillRect(x + w - 1, y, 1, h);
      for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) g.fillRect(cx, cy, 3, 3);
    };
    if (o.moving != null) for (let i = 0; i < CELLS.length; i++) if (i !== CLUB_PLOT && i !== o.moving && plotUnlocked(s, i)) box(CELLS[i][0] + 6, CELLS[i][1] + 34, 96, 40, pulse ? "#9fe0ff" : "#5ab0e0");
    if (o.selected?.kind === "plot") box(CELLS[o.selected.index][0] + 6, CELLS[o.selected.index][1] + 34, 96, 40, pulse ? "#fff2a0" : "#f2c94c");
    if (o.selected?.kind === "stadium") {
      const [x, y, w, h] = SPOTS[o.selected.key].hit;
      box(x, y, w, h, pulse ? "#fff2a0" : "#f2c94c");
    }
    // People, depth-sorted by their feet.
    const want = Math.min(26, visitorsPerDay(s));
    if (visitors.length !== want) visitors = makeVisitors(s, want);
    const list = [];
    for (const v of visitors) {
      const dt = Math.min(100, now - (v.last || now));
      v.last = now;
      if (now >= v.pause) {
        v.u += (v.speed * dt) / 1000;
        if (hash(v.seed * 13 + Math.floor(now / 4000)) < 0.004 * dt) v.pause = now + 1500 + hash(Math.floor(now)) * 2500;
      }
      const [x, y, dir] = loopPoint(WALKWAY, v.u),
        moving = now >= v.pause;
      list.push({ y, draw: () => (shadow(g, x, y, 4), figure(g, { look: v.look, shirt: v.shirt, collar: "#f4efe2", pose: moving ? "walk" : "idle", frame: moving ? Math.floor(now / 150 + v.seed) % 4 : Math.floor(now / 600 + v.seed) % 2, flip: dir * Math.sign(v.speed) < 0 }, x, y)) });
    }
    // Fans browsing the café and merch stand.
    s.plots.forEach((p, i) => {
      if (!p || !["cafe", "shop"].includes(p.type)) return;
      const [x, y] = front(i);
      for (let n = 0; n < Math.min(3, 1 + p.level); n++) {
        const look = { skin: SKINS[(i + n) % SKINS.length], hair: HAIRS[(i * 3 + n) % HAIRS.length], style: (i + n) % 6 },
          fx = x + 62 + n * 12;
        list.push({ y, draw: () => (shadow(g, fx, y, 4), figure(g, { look, shirt: ["#5a8ad0", "#f0c060", "#e07a5a"][n], collar: "#f4efe2", pose: n === 1 ? "wave" : "idle", frame: Math.floor(now / 700 + n) % 2, flip: true }, fx, y)) });
      }
    });
    const counts = {};
    s.roster.forEach((a, index) => {
      const activity = activities.get(a.id) || plannedActivity(s, a);
      const target = targetFor(s, a, index, now, activity, counts);
      let p = people.get(a.id);
      if (!p) people.set(a.id, (p = { x: target.x, y: target.y, path: [], t0: 0, goal: [target.x, target.y] }));
      const far = Math.abs(target.x - p.goal[0]) + Math.abs(target.y - p.goal[1]) > 20;
      if (!p.path.length && far && !target.follow) {
        // Walk there, through the main gate when crossing the stadium wall.
        const legs = [];
        if (insideBowl(p.x, p.y) !== insideBowl(target.x, target.y)) legs.push(...(insideBowl(p.x, p.y) ? [[GATE.x, GATE.in], [GATE.x, GATE.out]] : [[GATE.x, GATE.out], [GATE.x, GATE.in]]));
        legs.push([target.x, target.y]);
        Object.assign(p, { path: legs, from: [p.x, p.y], t0: now, goal: [target.x, target.y] });
      }
      let pose = target.pose,
        frame = target.frame ?? Math.floor(now / (pose === "run" ? 110 : pose === "lift" ? 520 : 420) + index) % 4,
        flip = target.flip;
      if (p.path.length) {
        const [tx, ty] = p.path[0],
          d = Math.hypot(tx - p.from[0], ty - p.from[1]),
          t = Math.min(1, (now - p.t0) / Math.max(200, d * 26));
        p.x = p.from[0] + (tx - p.from[0]) * t;
        p.y = p.from[1] + (ty - p.from[1]) * t;
        pose = "walk";
        frame = Math.floor(now / 120 + index) % 4;
        flip = tx < p.from[0];
        if (t >= 1) Object.assign(p, { from: [p.x, p.y], t0: now }), p.path.shift();
      } else {
        p.x = target.x;
        p.y = target.y;
        p.goal = [target.x, target.y];
      }
      list.push({
        y: p.y + 0.5,
        draw: () => {
          shadow(g, p.x, p.y, 5);
          figure(g, { ...athleteLook(a, s.colors), pose, frame, flip, event: target.event || a.event }, p.x, p.y);
          if (pose === "sit" && Math.floor(now / 700) % 2) text(g, "Z", p.x + 6, p.y - 28, { color: "#ffffff" });
          if (o.selected?.kind === "athlete" && o.selected.id === a.id) text(g, "↓", p.x, p.y - 34 - pulse, { color: "#f2c94c", align: "center" });
        },
      });
    });
    // The head coach (that's you) watches from the infield.
    const coachX = 352 + Math.round(Math.sin(now / 3000) * 8);
    list.push({ y: 300, draw: () => (shadow(g, coachX, 300, 5), figure(g, { look: { skin: "#e2b08a", hair: "#4a3a2a", style: 0, special: "kid" }, shirt: s.colors.secondary, collar: s.colors.primary, shorts: "#3a3e46", pose: "study", frame: Math.floor(now / 900) % 2 }, coachX, 300)) });
    list.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    drawArenaFront(g, s);
    // Particles and floating text.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const q = sparks[i],
        t = (now - q.t0) / q.dur;
      if (t >= 1) sparks.splice(i, 1);
      else if (t >= 0) px(g, q.x + q.vx * t * 30, q.y + q.vy * t * 30 + t * t * 12, q.color);
    }
    for (const f of flashes) {
      const t = (now - f.t0) / 1400;
      if (t < 0 || t > 1) continue;
      for (let n = 0; n < 6; n++) {
        const a = (n / 6) * Math.PI * 2 + t * 3;
        ellipse(g, f.x + Math.cos(a) * (14 + t * 20), f.y + Math.sin(a) * 6, 3, 2, `rgba(240,230,210,${0.8 - t * 0.8})`);
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
        if (p) (x = p.x), (y = p.y - 32 - q.stack * 9);
      }
      g.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
      text(g, q.text, x, y - Math.min(1, t * 2.5) * 10, { color: q.color, scale: q.scale || 1, align: "center" });
      g.globalAlpha = 1;
    }
    // Compose the visible part of the map on a screen-sized layer.
    const [ox, oy] = origin();
    sg.imageSmoothingEnabled = false;
    sg.fillStyle = "#4e7a40";
    sg.fillRect(0, 0, cam.vw, cam.vh);
    sg.drawImage(world, -ox, -oy);
    const p = o.dayProgress ?? 0.45;
    if (p < 0.2) {
      sg.fillStyle = `rgba(255,220,160,${(0.2 - p) * 0.6})`;
      sg.fillRect(0, 0, cam.vw, cam.vh);
    } else if (p > 0.7) {
      sg.fillStyle = `rgba(255,140,80,${(p - 0.7) * 0.4})`;
      sg.fillRect(0, 0, cam.vw, cam.vh);
    }
    for (let i = banners.length - 1; i >= 0; i--) {
      const b = banners[i],
        t = (now - b.t0) / b.dur;
      if (t >= 1) {
        banners.splice(i, 1);
        continue;
      }
      const slide = Math.min(1, t * 6),
        y = Math.round(cam.vh * 0.3);
      sg.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      rect(sg, 0, y, cam.vw * slide, 34, "rgba(30,40,36,0.82)");
      rect(sg, 0, y, cam.vw * slide, 1, b.color);
      rect(sg, 0, y + 33, cam.vw * slide, 1, b.color);
      if (slide >= 1) {
        text(sg, b.text, cam.vw / 2, y + 5, { color: b.color, scale: 2, align: "center" });
        if (b.sub) text(sg, b.sub, cam.vw / 2, y + 23, { color: "#fff6dc", align: "center" });
      }
      sg.globalAlpha = 1;
      break;
    }
    out.imageSmoothingEnabled = false;
    out.drawImage(screen, 0, 0, cam.vw * cam.scale, cam.vh * cam.scale);
  }

  function onDay(s, report, now, dayMs) {
    activities = new Map(report.athletes.map((e) => [e.id, e.activity]));
    report.athletes.forEach((e, n) => {
      const a = s.roster.find((x) => x.id === e.id);
      if (!a) return;
      // Whole-point gains only: the same numbers the stat screens show.
      const ups = a.stats.map((v, i) => Math.floor(v + 1e-6) - Math.floor(v - e.gains[i] + 1e-6));
      const labels = ups.map((u, i) => (u > 0 ? "+" + u + " " + STAT_SHORT[i] : null)).filter(Boolean);
      const label = e.activity === "rest" ? "REST" : e.activity === "injured" ? "RECOVERING" : labels.join(" ");
      if (!label) return;
      const best = ups.indexOf(Math.max(...ups));
      popups.push({ follow: e.id, stack: 0, x: 0, y: 0, text: label, color: e.activity === "rest" || e.activity === "injured" ? "#bfe8ff" : STAT_COLORS[best], t0: now + dayMs * 0.35 + n * 70, dur: Math.min(1800, dayMs * 0.7) });
    });
    for (const l of report.levelUps) popups.push({ follow: l.id, stack: 1, x: 0, y: 0, text: "LV " + l.level + "!", color: "#f2c94c", t0: now + dayMs * 0.5, dur: 1600 });
    for (const sp of report.spend) popups.push({ x: CELLS[sp.plot][0] + 54, y: CELLS[sp.plot][1] + 30, text: "+$" + sp.amount, color: "#f2d060", t0: now + dayMs * 0.55, dur: 1400 });
    if (report.week) banner("PAYDAY", (report.week.net >= 0 ? "+" : "-") + "$" + Math.abs(report.week.net) + " AFTER WAGES", "#f2d060", now);
  }
  function popup(x, y, str, color = "#fff6dc", now = performance.now(), scale = 1) {
    popups.push({ x, y, text: str, color, t0: now, dur: 1500, scale });
  }
  function banner(str, sub = "", color = "#f2c94c", now = performance.now(), dur = 2200) {
    banners.length = 0;
    banners.push({ text: str, sub, color, t0: now, dur });
  }
  function burst(x, y, label, now = performance.now()) {
    flashes.length = 0;
    flashes.push({ x, y, t0: now });
    popup(x, y - 16, label, "#f2c94c", now);
    for (let n = 0; n < 18; n++) sparks.push({ x, y, vx: Math.cos(n) * (0.5 + hash(n)), vy: -0.8 - hash(n + 3), color: ["#f2c94c", "#fff6dc", "#9fe0ff"][n % 3], t0: now, dur: 900 });
  }
  // Centre the camera on a point; shift it left when a window covers the right of the screen.
  function focus(x, y, coverCss = 0) {
    const dpr = window.devicePixelRatio || 1;
    cam.x = x + (coverCss * dpr) / cam.scale / 2;
    cam.y = y;
    clampCam();
  }
  const anchors = {
    plot: (i) => [CELLS[i][0] + CW / 2, CELLS[i][1] + 46],
    stadium: (k) => [SPOTS[k].x, SPOTS[k].y],
  };
  function pick(clientX, clientY) {
    const [x, y] = toWorld(clientX, clientY);
    for (const [id, p] of people) if (Math.abs(x - p.x) < 7 && y > p.y - 24 && y < p.y + 2) return { kind: "athlete", id };
    for (let i = 0; i < CELLS.length; i++) {
      const [cx, cy] = CELLS[i];
      if (x >= cx + 4 && x < cx + CW - 4 && y >= cy + 10 && y < cy + CH) return { kind: "plot", index: i };
    }
    for (const [key, sp] of Object.entries(SPOTS)) {
      const [hx, hy, hw, hh] = sp.hit;
      if (x >= hx && x < hx + hw && y >= hy && y < hy + hh) return { kind: "stadium", key };
    }
    if (insideBowl(x, y)) return { kind: "stadium", key: y < BOWL.y + 46 ? "stands" : "track" };
    return null;
  }
  function pan(dxCss, dyCss) {
    const dpr = window.devicePixelRatio || 1;
    cam.x -= (dxCss * dpr) / cam.scale;
    cam.y -= (dyCss * dpr) / cam.scale;
    clampCam();
  }
  function zoomBy(step, clientX, clientY) {
    const before = clientX != null ? toWorld(clientX, clientY) : null;
    cam.zoom = Math.max(1, Math.min(4, cam.zoom + step));
    resize();
    if (before) {
      const after = toWorld(clientX, clientY);
      cam.x += before[0] - after[0];
      cam.y += before[1] - after[1];
      clampCam();
    }
  }
  return {
    draw,
    onDay,
    popup,
    banner,
    flashPlot: (i, label) => burst(CELLS[i][0] + 54, CELLS[i][1] + 48, label),
    flashSpot: (key, label) => burst(SPOTS[key].x, SPOTS[key].y, label),
    pick,
    pan,
    zoomBy,
    focus,
    focusOn(sel, coverCss = 0) {
      if (sel?.kind === "plot") focus(...anchors.plot(sel.index), coverCss);
      else if (sel?.kind === "stadium") focus(...anchors.stadium(sel.key), coverCss);
      else if (sel?.kind === "athlete" && people.get(sel.id)) focus(people.get(sel.id).x, people.get(sel.id).y, coverCss);
    },
    reset: () => (people.clear(), activities.clear()),
    replan: () => activities.clear(),
  };
}
