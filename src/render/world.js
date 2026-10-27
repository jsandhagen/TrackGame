import { canvas, rect, ellipse, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";
import { figure, shadow, athleteLook } from "./sprites.js";
import { drawFacility, animateFacility, lockedPlot, emptyPlot, tree, pine, bush, bench, lamp, box } from "./buildings.js";
import { drawArena, drawArenaFront, animateArena, loopPoint, insideBowl, BOWL, TRACK, LANE, SPOTS, GATE, CENTER, TOWER, MASTS, masts } from "./arena.js";
import { PLANS, LEAGUES, PLOT_ORDER, PLOTS_BY_LEAGUE, STAT_SHORT, STAT_COLORS, SKINS, HAIRS, CLUB_PLOT } from "../game-content.js";
import { plotUnlocked, plotsOpen, plannedActivity, visitorsPerDay, automaticDuties, effectiveDuty, dutySite, seasonOfDay, clockMinutes, nightness } from "../domain/game.js";

export const MAP_W = 1000,
  MAP_H = 740;
// Streets: Club Row runs across the stadium forecourt, a footpath climbs to the north lane,
// and the main road runs south to the boulevard. Each value is the street's centre line.
const ROW = 500,
  NORTH = 250,
  BLVD = 690,
  PLAZA = 398,
  AVENUE = 562,
  ROAD = GATE.x;
// Building lots: [x, top]. A building stands on the line top + 66 and faces the street below.
export const LOTS = [
  [828, 410], [600, 160], [730, 160], [860, 160], [624, 600], [500, 600], [704, 410],
  [16, 410], [376, 600], [136, 410], [312, 410], [436, 410], [580, 410],
];
const LOT_W = 112;
const streetOf = (i) => (LOTS[i][1] < 300 ? NORTH : LOTS[i][1] > 560 ? BLVD : ROW);
const baseOf = (i) => LOTS[i][1] + 66;
// Where people stand in front of a building: its front garden, between the door and the street.
const front = (i) => [LOTS[i][0] + 30, baseOf(i) + 10];
// Where the camera starts: the stadium with Club Row below it.
export const HOME = [300, 262];
// Scenery follows the calendar: spring blossom, summer green, autumn leaves, winter snow.
const seasonOf = (s) => seasonOfDay(s.day);
const leagueForPlot = (i) => PLOTS_BY_LEAGUE.findIndex((n) => PLOT_ORDER.indexOf(i) < n);

// ── Walking routes ──────────────────────────────────────────────────────
// Every place belongs to a street; routes run along streets via the junction where the
// forecourt walk meets Club Row, then straight-line points are dropped.
const J = [ROAD, ROW];
function regionOf([x, y]) {
  if (insideBowl(x, y)) return "bowl";
  if (y < 300 && x > AVENUE - 20) return "north";
  if (y > 590) return "blvd";
  if (y < 440 && x > BOWL.x - 20 && x < BOWL.x + BOWL.w + 20) return "plaza";
  return "row";
}
function chain(p) {
  const [x] = p;
  switch (regionOf(p)) {
    case "bowl":
      return [p, [GATE.x, GATE.in], [GATE.x, GATE.out], [ROAD, PLAZA], J];
    case "plaza":
      return [p, [x, PLAZA], [ROAD, PLAZA], J];
    case "north":
      return [p, [x, NORTH], [AVENUE, NORTH], [AVENUE, ROW], J];
    case "blvd":
      return [p, [x, BLVD], [ROAD, BLVD], J];
    default:
      return [p, [x, ROW], J];
  }
}
function simplify(pts) {
  const out = [];
  for (const p of pts) {
    const q = [Math.round(p[0]), Math.round(p[1])];
    if (out.length && out[out.length - 1][0] === q[0] && out[out.length - 1][1] === q[1]) continue;
    out.push(q);
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 1; i < out.length - 1; i++) {
      const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]) || (a[0] === c[0] && a[1] === c[1])) {
        out.splice(i, a[0] === c[0] && a[1] === c[1] ? 2 : 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}
export function route(from, to) {
  const ra = regionOf(from),
    rb = regionOf(to);
  if (ra === rb && ra === "bowl") return [to];
  if (ra === rb) {
    const y = { plaza: PLAZA, north: NORTH, blvd: BLVD, row: ROW }[ra];
    return simplify([from, [from[0], y], [to[0], y], to]).slice(1);
  }
  return simplify([...chain(from), ...chain(to).reverse()]).slice(1);
}

// ── The static map ──────────────────────────────────────────────────────
const GRASS = ["#7fb05c", "#6ca24e", "#a0a452", "#dfe6e0"],
  GRASS2 = ["#8cbc68", "#79ae5a", "#aeb05e", "#eef2f0"];
function paving(g, x, y, w, h, season, edge = true) {
  const c = season === 3 ? "#e6e4de" : "#d8cdb2";
  rect(g, x, y, w, h, c);
  for (let i = 0; i < (w * h) / 40; i++) px(g, x + hash(x * 7 + i) * w, y + hash(y * 3 + i * 5) * h, shade(c, -0.07));
  if (edge) {
    rect(g, x, y, w, 1, shade(c, 0.25));
    rect(g, x, y + h - 1, w, 1, shade(c, -0.22));
  }
}
function vpaving(g, x, y, w, h, season) {
  paving(g, x, y, w, h, season, false);
  const c = season === 3 ? "#e6e4de" : "#d8cdb2";
  rect(g, x, y, 1, h, shade(c, 0.25));
  rect(g, x + w - 1, y, 1, h, shade(c, -0.22));
}
function road(g, x, y, w, h, vertical) {
  rect(g, x, y, w, h, "#76787a");
  for (let i = 0; i < (w * h) / 30; i++) px(g, x + hash(i * 3 + x) * w, y + hash(i * 7 + y) * h, "#6a6c6e");
  if (vertical) {
    rect(g, x, y, 1, h, "#b8b4a8");
    rect(g, x + w - 1, y, 1, h, "#b8b4a8");
    for (let yy = y + 6; yy < y + h; yy += 12) rect(g, x + Math.floor(w / 2) - 1, yy, 2, 6, "#f4f0e0");
  }
}
function carPark(g, x, y, w, h, seed) {
  rect(g, x - 1, y - 1, w + 2, h + 2, "#b8b4a8");
  rect(g, x, y, w, h, "#86888a");
  for (let i = 0; i <= h; i += 16) rect(g, x, y + i, Math.floor(w / 2) - 2, 1, "#e8e4d8"), rect(g, x + Math.ceil(w / 2) + 2, y + i, Math.floor(w / 2) - 2, 1, "#e8e4d8");
  const cols = ["#c84a40", "#4a7ac0", "#e8e4d8", "#5a9a5a", "#e8b040", "#7a7a80"];
  for (let i = 0; i < Math.floor(h / 16); i++)
    for (const side of [0, 1]) if (hash(seed + i * 2 + side) < 0.7) car(g, x + 3 + side * (Math.ceil(w / 2) + 1), y + 4 + i * 16, cols[Math.floor(hash(seed + i * 5 + side * 3) * cols.length)]);
}
function car(g, x, y, c) {
  rect(g, x + 1, y + 8, 22, 2, "rgba(20,24,20,0.25)");
  rect(g, x, y + 1, 22, 8, shade(c, -0.25));
  rect(g, x, y, 22, 7, c);
  rect(g, x + 5, y - 3, 12, 4, shade(c, 0.15));
  rect(g, x + 6, y - 2, 4, 2, "#9cc8d8");
  rect(g, x + 12, y - 2, 4, 2, "#9cc8d8");
  rect(g, x + 2, y + 7, 3, 2, "#2a2a2a");
  rect(g, x + 17, y + 7, 3, 2, "#2a2a2a");
}
function bus(g, x, y, colors) {
  rect(g, x + 2, y + 2, 34, 3, "rgba(20,24,20,0.25)");
  rect(g, x, y - 16, 34, 18, colors.primary);
  rect(g, x, y - 16, 34, 2, shade(colors.primary, 0.3));
  for (let i = 0; i < 4; i++) rect(g, x + 3 + i * 8, y - 12, 6, 5, "#9cc8d8");
  rect(g, x, y - 5, 34, 2, colors.secondary);
  rect(g, x + 5, y + 1, 4, 3, "#2a2a2a");
  rect(g, x + 25, y + 1, 4, 3, "#2a2a2a");
}
function hedge(g, x, y, w, season) {
  const c = ["#4e8a48", "#3e7a40", "#7a8a40", "#c8d4c8"][season];
  rect(g, x, y - 5, w, 6, c);
  rect(g, x, y - 6, w, 2, shade(c, 0.2));
  rect(g, x, y + 1, w, 1, shade(c, -0.35));
  for (let i = 2; i < w; i += 5) px(g, x + i, y - 3, shade(c, 0.12));
}
function flowerbed(g, x, y, w, seed) {
  rect(g, x, y, w, 6, "#8a6040");
  rect(g, x, y, w, 1, "#a07a50");
  for (let i = 1; i < w - 1; i += 2) px(g, x + i, y + 2 + (i % 4 ? 0 : 2), ["#f06a6a", "#f6d04c", "#c890e0", "#f4f0f0"][Math.floor(hash(seed + i) * 4)]);
}
function kiosk(g, x, y, colors) {
  box(g, x, y, 20, 12, 10, "#efe2c0", { shadow: false });
  rect(g, x + 3, y - 9, 14, 5, "#3a3530");
  rect(g, x + 4, y - 8, 12, 3, "#8fc4d0");
  for (let i = 0; i < 22; i += 3) rect(g, x - 1 + i, y - 13, 3, 3, (i / 3) % 2 ? colors.secondary : colors.primary);
}
function planter(g, x, y, season, seed) {
  ellipse(g, x, y - 1, 7, 3, "#a8a090");
  ellipse(g, x, y - 2, 6, 2, "#6a5040");
  tree(g, x, y - 2, 0.6, season, seed);
}
function pond(g, x, y, season) {
  ellipse(g, x, y + 2, 42, 15, season === 3 ? "#c8d4d8" : "#5a8a50");
  ellipse(g, x, y, 40, 13, season === 3 ? "#dceaf2" : "#4a8ab8");
  ellipse(g, x - 8, y - 4, 16, 3, season === 3 ? "#f4f8fa" : "#7ab4dc");
  if (season !== 3) for (let i = 0; i < 9; i++) rect(g, x - 40 + i * 9 + hash(i) * 4, y + 6 - hash(i + 3) * 6, 1, 5, "#3e7a40");
}
function practiceField(g, x, y, w, h, season) {
  rect(g, x, y, w, h, shade(GRASS[season], 0.05));
  for (let i = 0; i < w; i += 20) rect(g, x + i, y, 10, h, shade(GRASS[season], 0.1));
  const c = season === 3 ? "#a8b0b0" : "rgba(250,250,240,0.7)";
  g.fillStyle = c;
  g.fillRect(x + 4, y + 4, w - 8, 1);
  g.fillRect(x + 4, y + h - 5, w - 8, 1);
  g.fillRect(x + 4, y + 4, 1, h - 8);
  g.fillRect(x + w - 5, y + 4, 1, h - 8);
  // A practice throwing circle with its net, and a row of hurdles.
  ellipse(g, x + 24, y + h / 2, 6, 3, "#c8c0b0");
  ellipse(g, x + 24, y + h / 2, 4, 2, "#8a8a84");
  for (let i = 0; i < 4; i++) {
    rect(g, x + w - 70 + i * 14, y + h - 16, 9, 1, "#f4f0e0");
    rect(g, x + w - 70 + i * 14, y + h - 15, 1, 3, "#3a3e46");
    rect(g, x + w - 62 + i * 14, y + h - 15, 1, 3, "#3a3e46");
  }
}
// Trees scattered over an area, avoiding a list of rectangles; returned for depth sorting.
function grove(items, x0, y0, x1, y1, n, seed, season, avoid = [], pines = 0.3) {
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + hash(seed + i * 3) * (x1 - x0)),
      y = Math.round(y0 + hash(seed + i * 7 + 1) * (y1 - y0));
    if (avoid.some(([ax, ay, aw, ah]) => x > ax - 8 && x < ax + aw + 8 && y > ay && y < ay + ah + 24)) continue;
    const sc = 0.75 + hash(seed + i * 11) * 0.5,
      isPine = hash(seed + i * 13) < pines;
    items.push({ y, draw: (g) => (isPine ? pine(g, x, y, sc, season) : tree(g, x, y, sc, season, seed + i)) });
  }
}

function baseWorld(s) {
  const c = canvas(MAP_W, MAP_H),
    g = c.getContext("2d"),
    season = seasonOf(s);
  rect(g, 0, 0, MAP_W, MAP_H, GRASS[season]);
  // Soft patches and tufts so the grass isn't flat.
  for (let i = 0; i < 70; i++) ellipse(g, hash(i * 17) * MAP_W, hash(i * 23 + 5) * MAP_H, 18 + hash(i) * 30, 8 + hash(i + 1) * 12, shade(GRASS[season], i % 2 ? 0.05 : -0.04));
  for (let i = 0; i < 1800; i++) {
    const x = Math.round(hash(i) * MAP_W),
      y = Math.round(hash(i + 999) * MAP_H);
    px(g, x, y, i % 3 ? GRASS2[season] : shade(GRASS[season], -0.14));
    if (i % 7 === 0) px(g, x + 1, y - 1, GRASS2[season]);
    if (season === 0 && i % 23 === 0) px(g, x, y, ["#f6f0f4", "#f6d04c", "#f2a8c0"][i % 3]);
    if (season === 2 && i % 19 === 0) px(g, x, y, ["#d8843a", "#b0602e", "#f0b050"][i % 3]);
  }
  // Forecourt, walks and streets.
  paving(g, BOWL.x - 16, PLAZA - 18, BOWL.w + 32, 34, season);
  vpaving(g, ROAD - 10, PLAZA + 14, 20, ROW - PLAZA - 20, season);
  paving(g, 0, ROW - 6, MAP_W, 13, season);
  vpaving(g, AVENUE - 6, NORTH, 12, ROW - NORTH, season);
  paving(g, AVENUE - 6, NORTH - 6, MAP_W - AVENUE + 6, 13, season);
  paving(g, 0, BLVD - 6, MAP_W, 13, season);
  road(g, ROAD - 14, ROW + 7, 28, MAP_H - ROW - 7, true);
  // Zebra crossings where the road meets the streets.
  for (const y of [ROW + 9, BLVD - 6]) for (let x = ROAD - 13; x < ROAD + 13; x += 4) rect(g, x, y, 2, 11, "#f4f0e0");
  carPark(g, ROAD - 84, ROW + 18, 58, 150, 3);
  carPark(g, ROAD + 26, ROW + 18, 58, 150, 9);
  bus(g, ROAD - 12, ROW + 52, s.colors);
  practiceField(g, AVENUE + 30, NORTH + 26, 380, 110, season);
  pond(g, 92, 610, season);
  // Lot grounds: front gardens with a path to the street, hedges between neighbours.
  const items = [];
  LOTS.forEach(([x, top], i) => {
    const b = baseOf(i),
      street = streetOf(i),
      open = plotUnlocked(s, i),
      p = s.plots[i];
    vpaving(g, x + 26, b, 10, street - 6 - b, season);
    if (open) for (const bx of [x + 6, x + LOT_W - 6]) items.push({ y: b + 12, draw: (g) => bush(g, bx, b + 12, season) });
    if (!open) items.push({ y: b, draw: (g) => lockedPlot(g, x + 2, top + 14, LEAGUES[leagueForPlot(i)].name.split(" ")[0].toUpperCase(), season) });
    else if (!p) items.push({ y: b, draw: (g) => emptyPlot(g, x + 2, top + 14) });
    else items.push({ y: b, draw: (g) => drawFacility(g, p.type, p.level, x + 2, top + 14, { season, colors: s.colors }) });
  });
  // Street furniture: lamps along the near side of each street, benches on the forecourt.
  for (let x = 40; x < MAP_W; x += 96) {
    if (Math.abs(x - ROAD) > 30) items.push({ y: ROW + 12, draw: (g) => lamp(g, x, ROW + 12) });
    if (Math.abs(x - ROAD) > 30) items.push({ y: BLVD + 12, draw: (g) => lamp(g, x, BLVD + 12) });
    if (x > AVENUE) items.push({ y: NORTH + 12, draw: (g) => lamp(g, x + 20, NORTH + 12) });
  }
  // Forecourt: ticket kiosks by the gate, trees in planters and benches along the front.
  for (const x of [ROAD - 52, ROAD + 32]) items.push({ y: PLAZA - 2, draw: (g) => kiosk(g, x, PLAZA - 2, s.colors) });
  for (let x = BOWL.x + 10; x < BOWL.x + BOWL.w; x += 64) if (Math.abs(x - ROAD) > 40) items.push({ y: PLAZA + 14, draw: (g) => planter(g, x, PLAZA + 14, season, x) });
  for (const x of [ROAD - 120, ROAD + 100, ROAD + 200]) items.push({ y: PLAZA + 13, draw: (g) => bench(g, x, PLAZA + 13) });
  flowerbed(g, ROAD - 40, ROW - 20, 20, 5);
  flowerbed(g, ROAD + 20, ROW - 20, 20, 9);
  for (const x of [AVENUE + 40, AVENUE + 200, AVENUE + 360]) items.push({ y: NORTH + 140, draw: (g) => bench(g, x, NORTH + 140) });
  // Hedgerows along the map's south edge and the car parks.
  hedge(g, 0, MAP_H - 18, ROAD - 16, season);
  hedge(g, ROAD + 16, MAP_H - 18, MAP_W - ROAD - 16, season);
  // Woods frame the club; the stadium and lots are kept clear.
  const lotRects = LOTS.map(([x, top]) => [x - 6, top + 10, LOT_W + 12, 80]);
  const clear = [[BOWL.x - 12, BOWL.y - 20, BOWL.w + 24, BOWL.h + 40], [TOWER.x - 26, TOWER.y - 70, 52, 100], [AVENUE + 24, NORTH + 20, 392, 122], [0, ROW - 12, MAP_W, 24], [0, BLVD - 12, MAP_W, 24], [AVENUE - 12, NORTH - 12, 24, ROW - NORTH + 12], [ROAD - 90, ROW, 180, MAP_H - ROW], [AVENUE - 12, NORTH - 12, MAP_W, 24], [40, 590, 110, 40], ...lotRects];
  grove(items, 0, 8, MAP_W, 64, 46, 101, season, clear, 0.5);
  grove(items, 0, 64, BOWL.x - 6, ROW - 40, 9, 211, season, clear, 0.4);
  grove(items, BOWL.x + BOWL.w + 6, 60, AVENUE - 14, ROW - 40, 8, 307, season, clear, 0.3);
  grove(items, AVENUE + 10, 40, MAP_W, NORTH - 70, 14, 401, season, clear, 0.5);
  grove(items, 0, ROW + 30, ROAD - 100, BLVD - 40, 8, 503, season, clear, 0.2);
  grove(items, 760, ROW + 30, MAP_W, MAP_H - 20, 16, 601, season, clear, 0.3);
  grove(items, 0, BLVD + 18, MAP_W, MAP_H - 14, 22, 701, season, clear, 0.25);
  grove(items, AVENUE + 10, ROW + 30, 760, BLVD - 80, 3, 801, season, clear, 0.2);
  items.filter((it) => it.y < BOWL.y + 30).sort((a, b) => a.y - b.y).forEach((it) => it.draw(g));
  drawArena(g, s, season);
  items.filter((it) => it.y >= BOWL.y + 30).sort((a, b) => a.y - b.y).forEach((it) => it.draw(g));
  return c;
}

// Where an athlete stands for today's activity, in map coordinates.
function targetFor(s, a, index, now, activity, counts) {
  const slot = (key) => (counts[key] = (counts[key] || 0) + 1) - 1;
  const plotOf = (type) => s.plots.findIndex((p) => p?.type === type);
  // Club duties: staff the building (or the press box) they're running today.
  if (activity === "facility" || activity.startsWith("facility:")) {
    const key = activity.startsWith("facility:") ? activity.slice(9) : effectiveDuty(s, a.id, automaticDuties(s, visitorsPerDay(s)));
    const site = dutySite(s, key);
    const [x, y] = site?.type === "studio" ? [CENTER.x - 18, BOWL.y + 48] : front(site?.index ?? CLUB_PLOT);
    return { x: x + 24, y, pose: "study" };
  }
  // Coaching courses train at the same place as the plan they belong to.
  if (PLANS[activity]?.course) {
    const site = PLANS[activity].facility;
    activity = site === "gym" ? "power" : site === "track" ? "speed" : site === "studio" ? "focus" : "technique";
  }
  if (activity === "balanced") {
    const [x, y, dir] = loopPoint(LANE, now / 50000 + index * 0.11);
    return { x, y: y + 2, pose: "run", flip: dir < 0, follow: true };
  }
  if (activity === "speed") {
    const n = slot("speed"),
      t = (now / 2600 + n * 0.3) % 1;
    return { x: TRACK.x + TRACK.r - 20 + t * (TRACK.w - 2 * TRACK.r + 40), y: TRACK.y + TRACK.h - 4 - (n % 4) * 3, pose: "run", flip: false, follow: true };
  }
  if (activity === "technique" || activity === "sharpen") {
    const ev = a.trainingEvent || a.event,
      sp = SPOTS[ev],
      n = slot(ev),
      built = s.stadium[ev] > 0,
      west = ev === "hammer" || ev === "jav";
    if (ev === "jav" && built && n === 0) {
      const t = (now / 2200) % 1;
      return { x: sp.x + 24 - t * 46, y: sp.y + 1, pose: t < 0.85 ? "carry" : "throw", event: "jav", frame: t < 0.85 ? Math.floor(now / 110) % 4 : 2, flip: true, follow: true };
    }
    const off = [[0, 2], [14, 12], [-14, 12], [22, 4]][n % 4];
    return { x: sp.x + (west ? -off[0] : off[0]), y: sp.y + off[1], pose: built ? "throw" : "drill", event: ev, frame: Math.floor(now / 420 + index) % 4, flip: west };
  }
  if (activity === "focus") {
    const n = slot("focus");
    if (s.stadium.studio) return { x: CENTER.x - 18 + n * 12, y: BOWL.y + 48, pose: "study" };
    const [x, y] = front(CLUB_PLOT);
    return { x: x + 20 + n * 12, y, pose: "study" };
  }
  if (activity === "power") {
    const n = slot("power"),
      i = plotOf("gym");
    if (i >= 0) {
      const [x, y] = front(i);
      return { x: x + 18 + n * 14, y, pose: "lift" };
    }
    return { x: CENTER.x - 30 + n * 14, y: CENTER.y + 40, pose: "lift" };
  }
  // Rest and injuries: the spa, else the clubhouse steps.
  const n = slot("rest"),
    i = plotOf("spa") >= 0 ? plotOf("spa") : CLUB_PLOT,
    [x, y] = front(i);
  return { x: x + 18 + n * 12, y, pose: "sit" };
}

export function createWorld(cv) {
  const world = canvas(MAP_W, MAP_H),
    g = world.getContext("2d");
  let screen = canvas(320, 180),
    sg = screen.getContext("2d");
  const out = cv.getContext("2d");
  let base = null,
    key = "";
  const cam = { x: HOME[0], y: HOME[1], zoom: 0, scale: 2, vw: 320, vh: 180 };
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
  // Places visitors wander between: the forecourt, the gate, and any café, shop or attraction.
  function sights(s) {
    const list = [[ROAD - 90, PLAZA + 4], [ROAD + 90, PLAZA + 4], [GATE.x, GATE.out + 4], [ROAD - 30, ROW + 40], [AVENUE + 120, NORTH + 136], [180, BLVD - 2]];
    s.plots.forEach((p, i) => {
      if (p && ["cafe", "shop", "garden", "fountain", "statue", "club"].includes(p.type)) {
        const [x, y] = front(i);
        list.push([x + 40, y], [x + 60, y + 2]);
      }
    });
    return list;
  }
  function makeVisitors(s, n) {
    return Array.from({ length: n }, (_, i) => {
      const h = (k) => hash(i * 31 + k + s.season * 7);
      const spots = sights(s),
        start = spots[Math.floor(h(9) * spots.length)];
      return {
        look: { skin: SKINS[Math.floor(h(1) * SKINS.length)], hair: HAIRS[Math.floor(h(2) * HAIRS.length)], style: Math.floor(h(3) * 6) },
        shirt: h(8) < 0.35 ? s.colors.primary : ["#e07a5a", "#5a8ad0", "#f0c060", "#9a6ad0", "#4aa07a", "#e05a8a", "#f4efe2"][Math.floor(h(4) * 7)],
        x: start[0] + (h(10) - 0.5) * 30,
        y: start[1] + (h(11) - 0.5) * 4,
        path: [],
        speed: 14 + h(6) * 10,
        seed: i,
        pause: performance.now() + h(5) * 4000,
        last: 0,
        flip: false,
      };
    });
  }
  function stepVisitor(v, s, now) {
    const dt = Math.min(100, now - (v.last || now)) / 1000;
    v.last = now;
    if (now < v.pause) return false;
    if (!v.path.length) {
      const opts = sights(s),
        to = opts[Math.floor(hash(v.seed * 97 + Math.floor(now / 1000)) * opts.length)];
      v.path = route([v.x, v.y], [to[0] + (hash(v.seed) - 0.5) * 16, to[1] + (hash(v.seed + 1) - 0.5) * 6]);
      if (!v.path.length) v.pause = now + 2000;
      return false;
    }
    const [tx, ty] = v.path[0],
      d = Math.hypot(tx - v.x, ty - v.y),
      step = v.speed * dt;
    if (d <= step) {
      v.x = tx;
      v.y = ty;
      v.path.shift();
      if (!v.path.length) v.pause = now + 2500 + hash(v.seed + Math.floor(now)) * 5000;
    } else {
      v.x += ((tx - v.x) / d) * step;
      v.y += ((ty - v.y) / d) * step;
      if (Math.abs(tx - v.x) > 0.5) v.flip = tx < v.x;
    }
    return true;
  }

  // Time of day: a warm dawn, clear daylight, a golden evening, then night with the
  // floodlights and street lamps glowing. nightScale softens the dark at high speed.
  function light(s, ox, oy, progress, nightScale) {
    const h = clockMinutes(progress) / 60,
      dark = nightness(progress) * nightScale;
    if (h < 8.5) {
      sg.fillStyle = `rgba(255,214,160,${((8.5 - h) / 2.5) * 0.22})`;
      sg.fillRect(0, 0, cam.vw, cam.vh);
    } else if (h > 16.5) {
      sg.fillStyle = `rgba(255,140,70,${Math.min(1, (h - 16.5) / 2.5) * 0.22 * (1 - dark)})`;
      sg.fillRect(0, 0, cam.vw, cam.vh);
    }
    if (dark <= 0.02) return;
    sg.fillStyle = `rgba(18,26,64,${dark * 0.55})`;
    sg.fillRect(0, 0, cam.vw, cam.vh);
    const glow = (x, y, r, a, color = "255,236,180") => {
      const gx = x - ox,
        gy = y - oy;
      if (gx < -r || gy < -r || gx > cam.vw + r || gy > cam.vh + r) return;
      const grad = sg.createRadialGradient(gx, gy, 0, gx, gy, r);
      grad.addColorStop(0, `rgba(${color},${a})`);
      grad.addColorStop(1, `rgba(${color},0)`);
      sg.fillStyle = grad;
      sg.fillRect(gx - r, gy - r, r * 2, r * 2);
    };
    sg.globalCompositeOperation = "lighter";
    // Floodlights wash the infield; a covered bowl lights its ring roof instead.
    if (s.stadium.lights > 0) {
      const a = dark * (0.16 + 0.05 * s.stadium.lights);
      glow(CENTER.x, CENTER.y, 150 + 20 * s.stadium.lights, a);
      if (masts(s)) for (const [x, y] of MASTS) glow(x, y - 80 - s.stadium.lights * 14, 26, dark * 0.5);
    }
    // Lit windows and doorways along the streets.
    LOTS.forEach(([x, top], i) => {
      if (s.plots[i]) glow(x + 56, top + 56, 34, dark * 0.22, "255,210,140");
    });
    sg.globalCompositeOperation = "source-over";
  }
  function draw(s, now, o = {}) {
    resize();
    const k = s.plots.map((p) => (p ? p.type + p.level : "-")).join("|") + JSON.stringify(s.stadium) + JSON.stringify(s.stadiumStyle) + plotsOpen(s) + seasonOf(s) + s.colors.primary + s.colors.secondary + s.clubName;
    if (k !== key) {
      base = baseWorld(s);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    animateArena(g, s, now, Math.min(0.85, 0.06 + s.fans / 3000));
    LOTS.forEach(([x, top], i) => {
      const p = s.plots[i];
      if (!p) return;
      animateFacility(g, p.type, p.level, x + 2, top + 14, now);
      if (p.type === "club" || p.type === "shop") {
        const fx = x + 2 + (p.type === "club" ? 12 : 58 + (p.level > 1 ? 12 : 0)) + 1,
          fy = top + 66 - (p.type === "club" ? (p.level > 2 ? 34 : 24) : 18),
          wave = Math.round(Math.sin(now / 300 + i));
        rect(g, fx, fy, 8, 2, s.colors.primary);
        rect(g, fx, fy + 2 + wave, 8, 2, s.colors.secondary);
      }
    });
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
    const lotBox = (i, col) => box(LOTS[i][0] + 4, LOTS[i][1] + 14, LOT_W - 8, 70, col);
    if (o.moving != null) for (let i = 0; i < LOTS.length; i++) if (i !== CLUB_PLOT && i !== o.moving && plotUnlocked(s, i)) lotBox(i, pulse ? "#9fe0ff" : "#5ab0e0");
    if (o.selected?.kind === "plot") lotBox(o.selected.index, pulse ? "#fff2a0" : "#f2c94c");
    if (o.selected?.kind === "stadium") {
      const [x, y, w, h] = SPOTS[o.selected.key].hit;
      box(x, y, w, h, pulse ? "#fff2a0" : "#f2c94c");
    }
    // People, depth-sorted by their feet.
    const want = Math.min(28, visitorsPerDay(s));
    if (visitors.length !== want) visitors = makeVisitors(s, want);
    const list = [];
    for (const v of visitors) {
      const moving = stepVisitor(v, s, now);
      list.push({ y: v.y, draw: () => (shadow(g, v.x, v.y, 4), figure(g, { look: v.look, shirt: v.shirt, collar: "#f4efe2", pose: moving ? "walk" : "idle", frame: moving ? Math.floor(now / 150 + v.seed) % 4 : Math.floor(now / 600 + v.seed) % 2, flip: v.flip }, v.x, v.y)) });
    }
    const counts = {};
    s.roster.forEach((a, index) => {
      const activity = activities.get(a.id) || plannedActivity(s, a);
      const target = targetFor(s, a, index, now, activity, counts);
      let p = people.get(a.id);
      if (!p) people.set(a.id, (p = { x: target.x, y: target.y, path: [], t0: 0, goal: [target.x, target.y] }));
      const far = Math.abs(target.x - p.goal[0]) + Math.abs(target.y - p.goal[1]) > 20;
      if (!p.path.length && far && !target.follow) Object.assign(p, { path: route([p.x, p.y], [target.x, target.y]), from: [p.x, p.y], t0: now, goal: [target.x, target.y] });
      let pose = target.pose,
        frame = target.frame ?? Math.floor(now / (pose === "run" ? 110 : pose === "lift" ? 520 : 420) + index) % 4,
        flip = target.flip;
      if (p.path.length) {
        const [tx, ty] = p.path[0],
          d = Math.hypot(tx - p.from[0], ty - p.from[1]),
          t = Math.min(1, (now - p.t0) / Math.max(120, d * 22));
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
          if (pose === "sit" && Math.floor(now / 700) % 2) text(g, "Z", p.x + 6, p.y - 24, { color: "#ffffff" });
          if (o.selected?.kind === "athlete" && o.selected.id === a.id) text(g, "↓", p.x, p.y - 30 - pulse, { color: "#f2c94c", align: "center" });
        },
      });
    });
    // The head coach (that's you) watches from the infield.
    const coachX = CENTER.x + Math.round(Math.sin(now / 3000) * 8),
      coachY = CENTER.y + 30;
    list.push({ y: coachY, draw: () => (shadow(g, coachX, coachY, 5), figure(g, { look: { skin: "#e2b08a", hair: "#4a3a2a", style: 0, special: "kid" }, shirt: s.colors.secondary, collar: s.colors.primary, shorts: "#3a3e46", pose: "study", frame: Math.floor(now / 900) % 2 }, coachX, coachY)) });
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
        if (p) (x = p.x), (y = p.y - 28 - q.stack * 9);
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
    light(s, ox, oy, o.dayProgress ?? 0.25, o.nightScale ?? 1);
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
    activities = new Map(report.athletes.map((e) => [e.id, e.activity === "facility" ? "facility:" + report.duties.find((d) => d.id === e.id).key : e.activity]));
    report.athletes.forEach((e, n) => {
      const a = s.roster.find((x) => x.id === e.id);
      if (!a) return;
      // Whole-point gains only: the same numbers the stat screens show.
      const ups = a.stats.map((v, i) => Math.floor(v + 1e-6) - Math.floor(v - e.gains[i] + 1e-6));
      const labels = ups.map((u, i) => (u > 0 ? "+" + u + " " + STAT_SHORT[i] : null)).filter(Boolean);
      if(e.mastery>0) labels.push("+"+e.mastery.toFixed(1)+" MASTERY");
      const label = e.activity === "rest" ? "REST" : e.activity === "injured" ? "RECOVERING" : e.activity === "facility" ? "CLUB DUTY" : labels.join(" ");
      if (!label) return;
      const best = ups.indexOf(Math.max(...ups));
      popups.push({ follow: e.id, stack: 0, x: 0, y: 0, text: label, color: e.activity === "rest" || e.activity === "injured" ? "#bfe8ff" : STAT_COLORS[best], t0: now + dayMs * 0.35 + n * 70, dur: Math.min(1800, dayMs * 0.7) });
    });
    for (const d of report.duties || []) {
      const label = [d.money ? "+$" + d.money : "", d.insights ? "+" + d.insights + " INSIGHT" : "", d.fans ? "+" + d.fans + " FANS" : ""].filter(Boolean).join(" ");
      if (label) popups.push({ follow: d.id, stack: 1, x: 0, y: 0, text: label, color: "#f2d060", t0: now + dayMs * 0.55, dur: 1400 });
    }
    for (const l of report.levelUps) popups.push({ follow: l.id, stack: 1, x: 0, y: 0, text: "LV " + l.level + "!", color: "#f2c94c", t0: now + dayMs * 0.5, dur: 1600 });
    for (const sp of report.spend) popups.push({ x: LOTS[sp.plot][0] + 56, y: LOTS[sp.plot][1] + 30, text: "+$" + sp.amount, color: "#f2d060", t0: now + dayMs * 0.55, dur: 1400 });
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
    plot: (i) => [LOTS[i][0] + LOT_W / 2, LOTS[i][1] + 50],
    stadium: (k) => [SPOTS[k].x, SPOTS[k].y],
  };
  function pick(clientX, clientY) {
    const [x, y] = toWorld(clientX, clientY);
    for (const [id, p] of people) if (Math.abs(x - p.x) < 7 && y > p.y - 22 && y < p.y + 2) return { kind: "athlete", id };
    for (let i = 0; i < LOTS.length; i++) {
      const [lx, top] = LOTS[i];
      if (x >= lx + 4 && x < lx + LOT_W - 4 && y >= top + 14 && y < top + 84) return { kind: "plot", index: i };
    }
    for (const [key, sp] of Object.entries(SPOTS)) {
      const [hx, hy, hw, hh] = sp.hit;
      if (x >= hx && x < hx + hw && y >= hy && y < hy + hh) return { kind: "stadium", key };
    }
    if (insideBowl(x, y)) return { kind: "stadium", key: y < BOWL.y + 50 ? "stands" : "track" };
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
    flashPlot: (i, label) => burst(LOTS[i][0] + 56, LOTS[i][1] + 50, label),
    flashSpot: (key, label) => burst(SPOTS[key].x, SPOTS[key].y, label),
    pick,
    pan,
    zoomBy,
    focus,
    home: () => focus(...HOME),
    focusOn(sel, coverCss = 0) {
      if (sel?.kind === "plot") focus(...anchors.plot(sel.index), coverCss);
      else if (sel?.kind === "stadium") focus(...anchors.stadium(sel.key), coverCss);
      else if (sel?.kind === "athlete" && people.get(sel.id)) focus(people.get(sel.id).x, people.get(sel.id).y, coverCss);
    },
    reset: () => (people.clear(), activities.clear()),
    replan: () => activities.clear(),
  };
}
