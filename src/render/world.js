import { canvas, rect, ellipse, shade, hash, px, line, poly } from "./pixel.js";
import { text, measure } from "./font.js";
import { line as voiceLine, idleSituation, emoteFor, CROWD_LINES, COACH_LINES } from "../domain/voice.js";
import { CITY_ROADS, RESIDENTIAL_LOTS, STREET_LAMPS, CROSSINGS, FURNITURE, drawRoadMarkings, drawLoadingBay, ROSE_SEASON, drawStreetNetwork, drawResidentialLots, drawClubParcel, drawClubFront, drawPocketPark, drawStreetFurniture } from "./neighbourhood.js";
import { MAP_W, MAP_H, LOTS, LOT_W, STREETS, LOWER_LOT_TOP, streetOf, baseOf, front, parcelBounds, PARKING, POCKET_PARK, BUS_BAY, BUS_STOP } from "./campus-layout.js";
export { MAP_W, MAP_H, LOTS } from "./campus-layout.js";
import { figure, shadow, athleteLook, runFrame, walkFrame, gripOf } from "./sprites.js";
import { throwLoop, throwLoopMs, throwMotion, throwReleasePoint, recoveryStyle } from "./throw-motion.js";
import { lockedPlot, emptyPlot, tree, pine, bush, bench, box, TREE_KINDS } from "./buildings.js";
import { vehicle, vehicleLength, CAR_COLOURS } from "./vehicles.js";
import { facilityModel, drawFacilityGround, drawFacilityStructure } from "./facility-scene.js";
import { surface } from "./terrain.js";
import { drawArena, drawArenaFront, animateArena, loopPoint, loopLength, insideBowl, BOWL, TRACK, LANE, SPOTS, GATE, CENTER, TOWER, MASTS, masts } from "./arena.js";
import { PLANS, LEAGUES, PLOT_ORDER, PLOTS_BY_LEAGUE, STAT_SHORT, STAT_COLORS, SKINS, HAIRS, CLUB_PLOT } from "../game-content.js";
import { formOf, plotUnlocked, plotsOpen, plannedActivity, visitorsPerDay, stadiumCrowd, meetVenue, automaticDuties, effectiveDuty, dutySite, seasonOfDay, clockMinutes, nightness, weatherToday } from "../domain/game.js";

// Walking pace in ms per pixel. When the day is short, people speed up (jogging, then running)
// so they always reach the next session within ARRIVE_IN of a day instead of missing it.
const WALK_PACE = 25,
  ARRIVE_IN = 0.15;
// Throwing practice on the map: a few throws, a walk out to collect the implements, then back.
const FETCH_AFTER = { shot: 3, discus: 2, hammer: 2, jav: 2 },
  REACH = { shot: 26, discus: 52, hammer: 52, jav: 70 },
  PICKUP_MS = 700;
const lerpTo = (a, b, q) => a + (b - a) * Math.max(0, Math.min(1, q));
// The motion is an offset from the thrower's spot at half the meet's size, mirrored where the
// sector points west. Javelin drops the meet's sloping runway: the map's runway is level.
function practice(ev, level, style, t, west) {
  const dir = west ? -1 : 1,
    toMap = (m) => ({ ox: (dir * m.dx) / 2, oy: (m.dy - (ev === "jav" ? Math.round(-m.dx * 0.1) : 0)) / 2 }),
    [rx, ry] = throwReleasePoint(ev, level),
    from = [(dir * rx) / 2, ry / 2],
    start = toMap(throwMotion(ev, level, "ready", 0)).ox,
    end = toMap(throwMotion(ev, level, "follow", 1, { style })).ox,
    throws = FETCH_AFTER[ev],
    landing = (k) => [from[0] + dir * REACH[ev] * (0.85 + 0.25 * hash(k * 13 + level)), (hash(k * 7 + 3) - 0.5) * 6],
    far = landing(0)[0],
    out = Math.abs(far - end) * WALK_PACE,
    back = Math.abs(far - start) * WALK_PACE,
    loop = throwLoopMs(ev, level),
    cycle = throws * loop + out + PICKUP_MS + back;
  let u = ((t % cycle) + cycle) % cycle;
  const lying = (n) => Array.from({ length: n }, (_, k) => landing(k));
  if (u < throws * loop) {
    const k = Math.floor(u / loop),
      m = throwLoop(ev, level, u - k * loop, { style }),
      down = m.sinceRelease >= 800;
    return {
      ...toMap(m), pose: m.pose || (m.run ? "carry" : "throw"), frame: m.frame, flip: west ? !m.flip : m.flip, released: m.released,
      blend: m.blend && { ...m.blend, flip: west ? !m.blend.flip : m.blend.flip },
      ball: m.ball && { dx: (dir * m.ball.dx) / 2, dy: m.ball.dy / 2, behind: m.ball.behind },
      launch: m.sinceRelease >= 0 && !down && { t: m.sinceRelease, from, to: landing(k) },
      lying: lying(k + (down ? 1 : 0)),
    };
  }
  u -= throws * loop;
  const walk = (a, b, q) => {
    const x = lerpTo(a, b, q);
    return { ox: x, oy: 0, pose: "walk", frame: walkFrame(Math.abs(x - a)), flip: b < a };
  };
  if (u < out) return { ...walk(end, far, u / out), lying: lying(throws) };
  u -= out;
  if (u < PICKUP_MS) return { ox: far, oy: 0, pose: "pickup", frame: 0, flip: dir < 0, lying: u < PICKUP_MS / 2 ? lying(throws) : [] };
  u -= PICKUP_MS;
  return { ...walk(far, start, u / back), lying: [] };
}
// Walking lines follow the north sidewalks of each street. Club Avenue uses
// the west sidewalk; the connected carriageways are defined in neighbourhood.js.
const { row:ROW, north:NORTH, blvd:BLVD, plaza:PLAZA, avenue:AVENUE } = STREETS,
  ROAD = GATE.x;
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
  if (y >= LOWER_LOT_TOP + 66) return "blvd";
  if (y >= 530) return "nearRow";
  if (x >= 580 && y >= 286 && y < 405) return "practice";
  if (y < 440 && x > BOWL.x - 20 && x < BOWL.x + BOWL.w + 20) return "plaza";
  return "row";
}
function gateApproach(p) {
  const i = LOTS.findIndex(([x], i) => p[0] >= x && p[0] < x + LOT_W && p[1] >= baseOf(i) && p[1] < streetOf(i) - 7);
  return i < 0 ? [p] : [p, [LOTS[i][0] + 31, p[1]]];
}
function chain(p) {
  const approach = gateApproach(p), x = approach.at(-1)[0];
  switch (regionOf(p)) {
    case "bowl":
      return [p, [GATE.x, GATE.in], [GATE.x, GATE.out], [ROAD, PLAZA], J];
    case "plaza":
      return [p, [x, PLAZA], [ROAD, PLAZA], J];
    case "north":
      return [...approach, [x, NORTH], [AVENUE, NORTH], [AVENUE, ROW], J];
    case "blvd":
      return [...approach, [x, BLVD], [ROAD, BLVD], J];
    case "nearRow":
      return [p, [x, 536], [AVENUE, 536], [AVENUE, ROW], J];
    case "practice":
      return [p, [x, 394], [AVENUE, 394], [AVENUE, ROW], J];
    default:
      return [...approach, [x, ROW], J];
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
    const y = { plaza: PLAZA, north: NORTH, blvd: BLVD, row: ROW, nearRow: 536, practice: 394 }[ra];
    const a = gateApproach(from), b = gateApproach(to);
    return simplify([...a, [a.at(-1)[0], y], [b.at(-1)[0], y], ...b.reverse()]).slice(1);
  }
  return simplify([...chain(from), ...chain(to).reverse()]).slice(1);
}

// ── The static map ──────────────────────────────────────────────────────
// Bright, fresh greens in spring and summer, a gold autumn and a snowy winter.
// Soft, warm greens: a meadow, not a golf course.
const GRASS = ["#8cbc62", "#7cae58", "#a8a658", "#dfe6e0"],
  GRASS2 = ["#9cc870", "#8cbc66", "#b8b468", "#eef2f0"];
function paving(g, x, y, w, h, season, edge = true) {
  const c = season === 3 ? "#e6e4de" : "#d8cdb2";
  rect(g, x, y, w, h, c);
  for (let i = 0; i < (w * h) / 40; i++) px(g, x + hash(x * 7 + i) * w, y + hash(y * 3 + i * 5) * h, shade(c, -0.07));
  // Large slabs with staggered joints; retain the uncluttered walking route.
  if(w>22 && h>9) for(let yy=y+4;yy<y+h-1;yy+=6) {
    rect(g,x,yy,w,1,shade(c,-0.075));
    for(let xx=x+((yy-y)%12?4:10);xx<x+w;xx+=12) rect(g,xx,yy-5,1,5,shade(c,-0.07));
  }
  if (edge) {
    rect(g, x, y, w, 1, shade(c, 0.25));
    rect(g, x, y + h - 1, w, 1, shade(c, -0.22));
  }
}
// Warm brick for the heart of town: the forecourt and both sides of Club Row, laid in
// stretcher bond with a few weathered bricks and moss in the joints.
function brick(g, x, y, w, h, season) {
  const c = season === 3 ? "#d8cccc" : "#c4957a", joint = shade(c, 0.18);
  rect(g, x, y, w, h, c);
  for (let yy = y + 2, r = 0; yy < y + h; yy += 3, r++) {
    rect(g, x, yy, w, 1, joint);
    for (let xx = x + (r % 2 ? 3 : 0); xx < x + w; xx += 6) {
      rect(g, xx, yy - 2, 1, 2, joint);
      const n = hash(xx * 13 + yy * 7);
      if (n < 0.1) rect(g, xx + 1, yy - 2, 5, 2, shade(c, -0.08));
      else if (n > 0.95 && season !== 3) px(g, xx, yy, "#8aa060");
    }
  }
  rect(g, x, y, w, 1, shade(c, 0.25));
  rect(g, x, y + h - 1, w, 1, shade(c, -0.22));
}
function vpaving(g, x, y, w, h, season) {
  paving(g, x, y, w, h, season, false);
  const c = season === 3 ? "#e6e4de" : "#d8cdb2";
  rect(g, x, y, 1, h, shade(c, 0.25));
  rect(g, x + w - 1, y, 1, h, shade(c, -0.22));
}
// A car park laid out like one: a two-way aisle down the middle from the entrance, bays either
// side with wheel stops, an accessible bay by the entrance, arrows on the aisle, and in the
// larger park a planted island with a tree and a light. Parked cars face the aisle and vary in
// type and colour, with some bays left empty.
export const LOT_LIGHTS = [];
function carPark(g, x, y, w, h, seed, season, items) {
  const A = 18, bay = Math.floor((w - A) / 2), ax = x + bay, pitch = 12, rows = Math.floor(h / pitch), big = rows >= 4;
  // A village car park: rolled gravel, bays marked with lines of stone setts.
  const grit = season === 3 ? "#d4d2cc" : "#b9ab90", sett = season === 3 ? "#a8a49c" : "#8c7c66";
  rect(g, x - 1, y - 1, w + 2, h + 2, "#a89880");
  surface(g, x, y, w, h, grit, "gravel", seed);
  rect(g, ax, y, A, h, shade(grit, -0.05));
  for (let yy = y + 3; yy < y + h; yy += 7) { px(g, ax + 4, yy, shade(grit, -0.15)); px(g, ax + A - 5, yy + 3, shade(grit, -0.15)); }
  const island = big ? rows - 1 : -1;
  for (const side of [0, 1]) {
    const bx = side ? ax + A : x;
    for (let k = 0; k <= rows; k++) for (let xx = bx; xx < bx + bay; xx += 3) rect(g, xx, y + k * pitch, 2, 1, sett);
    for (let k = 0; k < rows; k++) {
      const by = y + k * pitch + 1;
      if (side === 1 && (k === island || (!big && k === rows - 1))) {
        // A kerbed planting island with a tree and a lamp.
        rect(g, bx + 1, by, bay - 2, pitch - 1, "#b8b4a8"); rect(g, bx + 2, by + 1, bay - 4, pitch - 3, ["#86b860", "#6ea850", "#a8a052", "#dfe6e0"][season]);
        const tx = bx + Math.round(bay / 2) + 4, ty = by + pitch - 3;
        items.push({ y: ty, draw: (g2) => tree(g2, tx, ty, .55, season, seed + 5, "round") });
        const lx = bx + 5, ly = by + pitch - 3;
        LOT_LIGHTS.push([lx, ly]);
        items.push({ y: ly, draw: (g2) => { rect(g2, lx, ly - 18, 1, 18, "#5a6266"); rect(g2, lx - 2, ly - 19, 5, 2, "#4a5054"); rect(g2, lx - 1, ly - 17, 3, 1, "#fff0b0"); } });
        continue;
      }
      // Wheel stops at the outer end of each bay.
      rect(g, side ? bx + bay - 4 : bx + 2, by + 3, 2, pitch - 6, "#9a8a70");
      if (side === 0 && k === 0) {
        rect(g, bx + 1, by, bay - 1, pitch - 1, "#5a7aa8");
        const cx = bx + Math.round(bay / 2), cy = by + 5;
        px(g, cx, cy - 3, "#f4f4f0"); rect(g, cx, cy - 1, 1, 3, "#f4f4f0"); rect(g, cx, cy + 1, 3, 1, "#f4f4f0"); rect(g, cx - 2, cy, 1, 3, "#f4f4f0"); rect(g, cx - 1, cy + 3, 2, 1, "#f4f4f0");
        continue;
      }
      if (hash(seed + k * 2 + side) > 0.68) continue;
      const kinds = ["sedan", "hatch", "suv", "pickup", "van"].filter((v) => vehicleLength(v) <= bay - 4),
        kind = kinds[Math.floor(hash(seed + k * 5 + side * 3) * kinds.length)], L = vehicleLength(kind);
      const vx = side ? bx + bay - 3 - L : bx + 3;
      items.push({ y: by + pitch - 2, draw: (g2) => vehicle(g2, kind, vx, by + pitch - 2, CAR_COLOURS[Math.floor(hash(seed + k * 9 + side) * CAR_COLOURS.length)], side ? -1 : 1) });
    }
  }
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
// A raised brick planter brimming with leaves and flowers in clusters.
function flowerbed(g, x, y, w, seed, season = 1) {
  rect(g, x, y + 2, w, 4, "#b07a5e"); for (let xx = x + 2; xx < x + w; xx += 4) rect(g, xx, y + 3, 1, 3, "#8e5e48");
  rect(g, x, y + 2, w, 1, "#c8957a"); rect(g, x + w - 1, y + 3, 1, 3, "#7a4e3a"); rect(g, x, y + 6, w, 1, "rgba(26,32,66,0.25)");
  if (season === 3) { rect(g, x, y + 1, w, 1, "#f4f6f8"); return; }
  const leaf = ["#5e9a4a", "#4e8a44", "#8a8a40"][season];
  rect(g, x, y - 1, w, 3, leaf); rect(g, x + 1, y - 2, w - 2, 1, leaf);
  for (let i = 1; i < w - 1; i += 3) { const c = ["#f06a6a", "#f6d04c", "#c890e0", "#f4f0f0", "#f0a050"][Math.floor(hash(seed + i) * 5)]; px(g, x + i, y - 2, c); px(g, x + i + 1, y - 1, c); px(g, x + i, y - 1, shade(c, -0.2)); }
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
  // A practice throwing circle with its sector fanning down the field and distance flags.
  const cx = x + 24, cy = y + h / 2;
  for (const s of [-1, 1]) line(g, cx + 6, cy + s * 2, x + 220, cy + s * 30, c);
  for (const [d, col] of [[80, "#e8c04a"], [140, "#e86a4a"], [196, "#4a8ac8"]]) {
    const fx = cx + d, half = Math.round(2 + (d / 196) * 28);
    for (let k = -half; k <= half; k += 3) px(g, fx + Math.round(Math.abs(k) * .05), cy + k, c);
    rect(g, fx, cy - half - 6, 1, 6, "#6a6e72"); rect(g, fx + 1, cy - half - 6, 3, 2, col);
  }
  ellipse(g, cx, cy, 6, 3, "#c8c0b0");
  ellipse(g, cx, cy, 4, 2, "#8a8a84");
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
    // Trees grow in clumps of two to four from one family, with shrubs and flowers at their feet:
    // a copse rather than lone trees dotted across the lawn.
    const n2 = 2 + Math.floor(hash(seed + i * 19) * 3);
    for (let k = 0; k < n2; k++) {
      const tx = x + Math.round((hash(seed + i * 23 + k) - 0.5) * 26), ty = y + Math.round((hash(seed + i * 29 + k) - 0.5) * 12);
      if (avoid.some(([ax, ay, aw, ah]) => tx > ax - 8 && tx < ax + aw + 8 && ty > ay && ty < ay + ah + 24)) continue;
      const sc = 0.7 + hash(seed + i * 11 + k) * 0.5,
        isPine = hash(seed + i * 13 + k) < pines,
        kind = ["round", "round", "wide", "column", "flower"][Math.floor(hash(seed + i * 17 + k) * 5)];
      items.push({ y: ty, draw: (g) => (isPine ? pine(g, tx, ty, sc, season) : tree(g, tx, ty, kind === "wide" ? sc * .85 : sc, season, seed + i + k, kind)) });
    }
    items.push({ y: y + 7, draw: (g) => { bush(g, x - 9, y + 7, season); bush(g, x + 10, y + 6, season); if (season < 2) for (let f = 0; f < 6; f++) px(g, x - 12 + Math.round(hash(seed + i + f * 5) * 24), y + 8 + (f % 2), ["#f4f0e6", "#f6d04c", "#e88aa0"][f % 3]); } });
  }
}

function streetSign(g,x,y,label) {
  rect(g,x,y-17,1,17,"#626c67");
  rect(g,x-2,y-18,label.length*6+6,7,"#3f655e");
  text(g,label,x+1,y-17,{color:"#f2ecd7",outline:null});
}
// The walk from Club Row to the stadium gate: wider than any footpath, laid in brick between
// stone kerbs, with a runner of the club's colour down the middle and low hedges either side.
function processional(g, cx, y0, y1, season, colors) {
  const x0 = cx - 15, w = 30, h = y1 - y0, hedgeC = ["#5f8f4a", "#4d8445", "#8a7a40", "#c8d4c8"][season];
  stoneWalk(g, x0, y0, w, h, season, colors);
  // Low flower borders run beside the kerbs, so the banners above them read clearly.
  for (const hx of [x0 - 6, x0 + w + 1]) {
    rect(g, hx, y0 + 4, 5, h - 12, "#7a5a3e"); rect(g, hx, y0 + 4, 5, 1, shade("#7a5a3e", 0.2));
    if (season === 3) { rect(g, hx, y0 + 4, 5, h - 12, "#eef0ec"); continue; }
    for (let yy = y0 + 5; yy < y0 + h - 9; yy += 2) { rect(g, hx, yy, 5, 1, hedgeC); px(g, hx + ((yy >> 1) % 4) + 1, yy, ["#e86a6a", "#f6d04c", "#f4f0e6", "#c890e0"][(yy >> 1) % 4]); }
  }
}
// Pale limestone flags, set apart from the brick around them, with grey kerbs and a runner of the
// club's colour edged in cream so it reads against the stone and leads the eye to the gate.
function stoneWalk(g, x0, y0, w, h, season, colors) {
  const flag = season === 3 ? "#d8cfbc" : "#e6dcc4", joint = shade(flag, -0.12), kerb = season === 3 ? "#8a8478" : "#9a9488", cx = x0 + Math.round(w / 2);
  rect(g, x0, y0, w, h, flag);
  for (let yy = y0 + 6, r = 0; yy < y0 + h; yy += 7, r++) {
    rect(g, x0, yy, w, 1, joint);
    for (let xx = x0 + (r % 2 ? 5 : 10); xx < x0 + w; xx += 10) rect(g, xx, yy - 6, 1, 6, joint);
    if (hash(yy * 3 + x0) > 0.6) rect(g, x0 + 3 + Math.floor(hash(yy) * (w - 9)), yy - 5, 4, 1, shade(flag, 0.08));
  }
  for (const kx of [x0, x0 + w - 2]) { rect(g, kx, y0, 2, h, kerb); for (let yy = y0 + 4; yy < y0 + h; yy += 5) rect(g, kx, yy, 2, 1, shade(kerb, -0.18)); }
  rect(g, x0 + 2, y0, 1, h, shade(flag, 0.12));
  // The runner: club colour, cream edges, a secondary-colour diamond at intervals.
  rect(g, cx - 5, y0, 10, h, "#f4ecd4");
  rect(g, cx - 4, y0, 8, h, colors.primary);
  for (let yy = y0 + 3; yy < y0 + h; yy += 9) { px(g, cx - 1, yy, colors.secondary); px(g, cx, yy, colors.secondary); rect(g, cx - 2, yy + 1, 4, 1, colors.secondary); px(g, cx - 1, yy + 2, colors.secondary); px(g, cx, yy + 2, colors.secondary); }
  rect(g, cx - 4, y0, 1, h, shade(colors.primary, 0.25));
}
// A tall pole with a hanging banner in the club's colours that ripples now and then.
function banner(g, x, y, colors, now, left) {
  rect(g, x, y - 26, 1, 26, "#5a6266"); px(g, x, y - 27, "#c8b060"); rect(g, x - 1, y, 3, 1, "rgba(26,32,66,0.25)");
  const ripple = Math.sin(now / 900 + x + y) > 0.6 ? 1 : 0, bx = left ? x + 1 : x - 5;
  rect(g, bx, y - 25, 5, 11, colors.primary); rect(g, bx, y - 25, 5, 1, shade(colors.primary, 0.3)); rect(g, left ? bx + 4 : bx, y - 24, 1, 10, shade(colors.primary, -0.3));
  rect(g, bx, y - 21, 5, 2, colors.secondary);
  px(g, bx + (ripple ? 1 : 0), y - 14, colors.primary); px(g, bx + 3 + (ripple ? 1 : 0), y - 14, colors.primary);
}
// The gateway where the walk leaves Club Row is the walk's landmark: a pale limestone arch,
// taller than anything near it, standing out against the brick and lawn by value. Two piers with
// stone caps and lanterns carry a round arch with a keystone crest, and a framed plate in the
// club's colours names the ground. It casts a shadow down and to the right like every building.
function gateway(g, cx, y, season, colors, name) {
  const lime = season === 3 ? "#e0d6c0" : "#ece2c8", lit = shade(lime, 0.18), dark = shade(lime, -0.3), edge = "#6a6254";
  const L = cx - 27, R = cx + 19, pw = 8, top = y - 30;
  poly(g, [[L + 2, y + 1], [R + pw + 14, y + 1], [R + pw + 18, y - 3], [L + 6, y - 3]], "rgba(26,32,66,0.24)");
  for (const px0 of [L, R]) {
    rect(g, px0 + pw, top + 2, 2, y - top - 2, dark); px(g, px0 + pw, top + 1, dark);
    rect(g, px0, top, pw, y - top, lime);
    for (let yy = top + 5; yy < y - 2; yy += 6) rect(g, px0, yy, pw, 1, shade(lime, -0.1));
    rect(g, px0, top, 1, y - top, lit); rect(g, px0 + pw - 1, top, 1, y - top, shade(lime, -0.14));
    rect(g, px0 - 1, y - 4, pw + 2, 4, shade(lime, -0.06)); rect(g, px0 - 1, y - 4, pw + 2, 1, lit);
    rect(g, px0 - 1, top - 2, pw + 2, 2, lit); rect(g, px0 - 1, top - 1, pw + 2, 1, shade(lime, -0.08));
    // Lanterns on the caps.
    rect(g, px0 + 2, top - 7, 4, 5, "#f6dc90"); px(g, px0 + 2, top - 7, "#fff4c8"); rect(g, px0 + 1, top - 8, 6, 1, "#2f4a40"); rect(g, px0 + 1, top - 3, 6, 1, "#2f4a40");
    // A crisp outline on the shadow side and at the foot.
    rect(g, px0 + pw + 2, top + 2, 1, y - top - 2, edge); rect(g, px0 - 1, y, pw + 3, 1, edge);
  }
  // The arch: a thick band of voussoirs rising from the piers to a keystone at the crown.
  const span = R - (L + pw), mid = L + pw + span / 2, rise = 9;
  for (let xx = L + pw; xx < R; xx++) {
    const t = (xx - mid) / (span / 2), yy = Math.round(top + 2 - rise * Math.sqrt(Math.max(0, 1 - t * t)));
    rect(g, xx, yy, 1, 5, lime); px(g, xx, yy, lit); px(g, xx, yy + 5, dark); if (xx % 4 === 0) px(g, xx, yy + 2, shade(lime, -0.12));
    px(g, xx, yy - 1, edge);
  }
  const ky = top + 2 - rise;
  rect(g, Math.round(mid) - 3, ky - 3, 7, 7, lime); rect(g, Math.round(mid) - 3, ky - 3, 7, 1, lit); rect(g, Math.round(mid) + 3, ky - 2, 1, 6, dark);
  ellipse(g, Math.round(mid), ky + 1, 2, 2, colors.primary); px(g, Math.round(mid), ky + 1, colors.secondary);
  // The name plate hangs under the arch: club colour, cream frame, cream lettering.
  const label = [name || "", "STADIUM", "GROUND"].map((t) => t.toUpperCase()).find((t) => t && measure(t) <= 40) || "GROUND";
  const pwid = Math.max(measure(label) + 6, 30), plx = Math.round(mid - pwid / 2), ply = top + 6;
  rect(g, plx - 1, ply - 1, pwid + 2, 11, "#f4ecd4"); rect(g, plx, ply, pwid, 9, colors.primary); rect(g, plx, ply, pwid, 1, shade(colors.primary, 0.3));
  rect(g, plx, ply + 10, pwid + 1, 1, "rgba(26,32,66,0.3)");
  text(g, label, Math.round(mid), ply + 1, { color: "#f8f0d8", outline: null, align: "center" });
}
// A string of pennants sagging between two lamp heads; it lifts a little in a breeze.
function bunting(g, x0, x1, y, colors, now) {
  const sag = 7 + (Math.sin(now / 1300 + x0) > 0.8 ? -1 : 0), at = (x) => y + Math.round(sag * Math.sin(Math.PI * (x - x0) / (x1 - x0)));
  for (let x = x0 + 1; x < x1; x++) px(g, x, at(x), "#5a5450");
  for (let x = x0 + 4, k = 0; x < x1 - 3; x += 6, k++) { const yy = at(x) + 1, c = colors[k % colors.length]; rect(g, x, yy, 3, 1, c); rect(g, x, yy + 1, 2, 1, c); px(g, x, yy + 2, shade(c, -0.2)); }
}
function bikeRack(g,x,y) {
  for(let n=0;n<3;n++) {
    const xx=x+n*9;
    line(g,xx,y,xx,y-6,"#8b9697"); line(g,xx,y-6,xx+5,y-6,"#b4bfc0"); line(g,xx+5,y-6,xx+5,y,"#667374");
    if(n!==1) { ellipse(g,xx,y+1,3,3,"#424c4c"); ellipse(g,xx+7,y+1,3,3,"#424c4c"); line(g,xx,y,xx+4,y-5,"#a76b4f");line(g,xx+4,y-5,xx+7,y,"#a76b4f"); }
  }
}
function baseWorld(s) {
  const c = canvas(MAP_W, MAP_H),
    g = c.getContext("2d"),
    season = seasonOf(s);
  surface(g, 0, 0, MAP_W, MAP_H, GRASS[season], 'lawn');
  // Soft patches and tufts so the grass isn't flat.
  for (let i = 0; i < 110; i++) ellipse(g, hash(i * 17) * MAP_W, hash(i * 23 + 5) * MAP_H, 14 + hash(i) * 34, 6 + hash(i + 1) * 12, shade(GRASS[season], i % 3 === 0 ? 0.06 : i % 3 === 1 ? -0.045 : 0.025));
  // Grass texture in clusters: tufts of two or three blades, a shaded root under a lit tip, and
  // clover patches here and there. Clusters say "grass"; single specks only say "noise".
  const blade = GRASS2[season], root = shade(GRASS[season], -0.16), clover = shade(GRASS[season], season === 3 ? -0.04 : 0.09);
  for (let i = 0; i < 3200; i++) {
    const x = Math.round(hash(i * 3 + 11) * MAP_W), y = Math.round(hash(i * 5 + 999) * MAP_H), n = hash(i * 7 + 3);
    if (n < 0.62) { px(g, x, y, root); px(g, x + 1, y - 1, blade); if (n < 0.3) { px(g, x + 2, y, root); px(g, x + 2, y - 1, blade); } }
    else if (n < 0.7) { rect(g, x, y, 3, 2, clover); px(g, x + 1, y - 1, clover); px(g, x + 3, y + 1, clover); }
  }
  for (let i = 0; i < 1800; i++) {
    const x = Math.round(hash(i) * MAP_W),
      y = Math.round(hash(i + 999) * MAP_H);
    if ((season === 0 && i % 17 === 0) || (season === 1 && i % 41 === 0)) {
      // Little three-pixel flowers: a coloured head over a stem.
      const c = ["#f6f0f4", "#f6d04c", "#f2a8c0", "#b8a0f0"][i % 4];
      px(g, x, y - 1, c);
      px(g, x - 1, y, c);
      px(g, x + 1, y, c);
      px(g, x, y, "#f8e070");
    }
    if (season === 2 && i % 19 === 0) px(g, x, y, ["#d8843a", "#b0602e", "#f0b050"][i % 3]);
  }
  ROSE_SEASON.v = season;
  drawStreetNetwork(g,season);
  const items = [];
  drawResidentialLots(g,season,items);
  drawPocketPark(g,season,items);
  // Forecourt, walks and streets.
  brick(g, BOWL.x - 16, PLAZA - 18, BOWL.w + 32, 34, season);
  processional(g, ROAD, PLAZA + 14, ROW - 6, season, s.colors);
  brick(g, 0, ROW - 6, MAP_W, 13, season);
  // Continuous sidewalks join the club's gates to the connected road network.
  vpaving(g, AVENUE - 5, 128, 10, ROW - 128, season);
  paving(g, AVENUE - 5, NORTH - 6, 419, 13, season);
  paving(g, AVENUE - 5, 388, 419, 12, season);
  paving(g, 0, BLVD - 6, MAP_W, 13, season);
  brick(g, 0, 530, MAP_W, 13, season);
  // Preserve the crossings wherever these walks meet the Avenue and approach.
  for(const [cx,cy,,width] of CROSSINGS.filter(c=>c[2]==='v')) {
    rect(g,cx-width/2,cy-7,width,14,"#6e6a66");
    for(let xx=cx-width/2+2;xx<cx+width/2-1;xx+=4) rect(g,xx,cy-4,2,9,"#eee9d8");
  }
  drawRoadMarkings(g,season);
  drawLoadingBay(g);
  LOT_LIGHTS.length = 0;
  for (const p of PARKING) carPark(g,p.x,p.y,p.w,p.h,p.seed,season,items);
  // Parking parcels have landscaped edges and an entrance at the centre aisle.
  for(const {x,y,w,h} of PARKING) {
    hedge(g,x,y-2,Math.floor(w/2)-7,season);
    hedge(g,x+Math.ceil(w/2)+7,y-2,Math.floor(w/2)-7,season);
    hedge(g,x,y+h+8,w,season);
    rect(g,x-2,y,2,h,"#afb69b");rect(g,x+w,y,2,h,"#afb69b");
  }
  rect(g,BUS_BAY.x,BUS_BAY.y,BUS_BAY.w,BUS_BAY.h,"#87918d");
  rect(g,BUS_BAY.x,BUS_BAY.y+BUS_BAY.h-2,BUS_BAY.w,2,"#c9bea1");
  bus(g,BUS_BAY.x+6,BUS_BAY.y+20,s.colors);
  practiceField(g, 592, 296, 348, 88, season);
  // A row of columnar trees screens the field from North Lane.
  for (let tx = 606, k = 0; tx < 940; tx += 48, k++) items.push({ y: 293, draw: (g) => tree(g, tx, 293, .7 + (k % 3) * .06, season, tx, "column") });
  // Shrubs and flowers soften the foot of the stadium's outer wall, leaving the gate clear.
  for (let x = BOWL.x + 26, k = 0; x < BOWL.x + BOWL.w - 26; x += 13, k++) {
    if (Math.abs(x - ROAD) < 40) continue;
    const r = BOWL.r, cx = Math.min(Math.max(x, BOWL.x + r), BOWL.x + BOWL.w - r), dy = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)), by = Math.round(BOWL.y + BOWL.h - r + dy) + 4;
    if (by > PLAZA - 20) continue;
    items.push({ y: by, draw: (g) => { bush(g, x, by, season); if (k % 3 === 1) bush(g, x + 6, by + 1, season); if (season < 2 && k % 2) for (let f = 0; f < 4; f++) px(g, x - 4 + f * 3, by - 3 - (f % 2), ["#f4f0e6", "#e88aa0", "#f6d04c"][(f + k) % 3]); } });
  }
  // An avenue in fact: trees on both verges of Club Avenue, broken only where the footpaths cross.
  for (let ty = 172, k = 0; ty < 490; ty += 40, k++) {
    if ((ty > 236 && ty < 268) || (ty > 380 && ty < 412)) continue;
    for (const tx of [534, 590]) items.push({ y: ty, draw: (g) => tree(g, tx, ty, .72 + (k % 2) * .08, season, tx + ty, k % 3 === 2 ? "flower" : "round") });
  }
  // Street trees in pits along the boulevard's south verge, at a steady rhythm, with gaps at
  // the approach and the eastern road.
  for (let tx = 36; tx < MAP_W - 10; tx += 68) if (Math.abs(tx - 280) > 30 && Math.abs(tx - 976) > 22) items.push({ y: 672, draw: (g) => tree(g, tx, 672, .8, season, tx * 3, "street") });
  // Inlaid club colours and paired borders frame the stadium entrance.
  // A course of bricks in the club's colour runs the length of the forecourt, and a soldier
  // course (bricks on end, in a darker clay) edges it front and back.
  {
    const x0 = BOWL.x - 16, w = BOWL.w + 32, clay = season === 3 ? "#b8aaa8" : "#a8765c";
    for (const yy of [PLAZA - 17, PLAZA + 13]) { rect(g, x0, yy, w, 3, clay); for (let xx = x0 + 2; xx < x0 + w; xx += 3) rect(g, xx, yy, 1, 3, shade(clay, 0.2)); }
    rect(g, x0, PLAZA + 8, w, 3, shade(s.colors.primary, -0.05));
    for (let xx = x0 + 1; xx < x0 + w; xx += 6) rect(g, xx, PLAZA + 8, 1, 3, shade(s.colors.primary, 0.3));
    rect(g, x0, PLAZA + 8, w, 1, shade(s.colors.primary, 0.18));
  }
  // The stone walk and its runner carry on across the forecourt to the stadium gate, through the
  // club crest set into the paving where the walk arrives.
  stoneWalk(g, ROAD - 15, PLAZA - 18, 30, 34, season, s.colors);
  {
    const cx = ROAD, cy = PLAZA - 1;
    ellipse(g, cx, cy + 1, 15, 7, "rgba(26,32,66,0.2)");
    ellipse(g, cx, cy, 15, 7, "#9a9488"); ellipse(g, cx, cy, 14, 6, "#f4ecd4"); ellipse(g, cx, cy, 12, 5, s.colors.primary);
    ellipse(g, cx, cy, 8, 3, s.colors.secondary); ellipse(g, cx, cy, 6, 2, s.colors.primary);
    rect(g, cx - 1, cy - 1, 3, 2, s.colors.secondary); rect(g, cx - 11, cy - 3, 22, 1, shade(s.colors.primary, 0.3));
  }
  // Lot grounds: front gardens with a path to the street, hedges between neighbours.
  LOTS.forEach(([x, top], i) => {
    const b = baseOf(i),
      street = streetOf(i),
      open = plotUnlocked(s, i),
      p = s.plots[i];
    drawClubParcel(g,x,top,LOT_W,street-12,open,season,i);
    // Only the narrow gate connection enters public paving. All private ground
    // and cast shadows are clipped inside the parcel, before the sidewalk.
    if (street === ROW) brick(g, x + 27, street - 12, 8, 7, season); else vpaving(g, x + 27, street - 12, 8, 7, season);
    // Every open plot has a little planting tucked into its back corners: shrubs, now and then a
    // small tree, and a scatter of wildflowers, so the lawns behind the buildings aren't bare.
    if (open) for (const [k, cx] of [[0, x + 9], [1, x + LOT_W - 10]]) {
      const n = hash(i * 13 + k * 5), cy = top + 22 + Math.round(hash(i * 7 + k) * 6);
      if (n < 0.25) continue;
      items.push({ y: cy, draw: (g) => {
        if (n > 0.75) tree(g, cx, cy, 0.62, season, i * 9 + k, "round");
        bush(g, cx + (k ? -4 : 4), cy + 3, season);
        if (season < 2) for (let f = 0; f < 5; f++) px(g, cx - 6 + Math.round(hash(i + f * 3 + k) * 12), cy + 5 + (f % 2), ["#f4f0e6", "#f6d04c", "#e88aa0", "#c890e0"][(f + i) % 4]);
      } });
    }
    // Built plots plant their own grounds (facility-scene.js); open plots get a bush or two,
    // never the same pair on every lot.
    if (open && !p) for (const [k, bx] of [[0, x + 9], [1, x + LOT_W - 9]]) if (hash(i * 7 + k) > .35) items.push({ y: b + 8, draw: (g) => bush(g, bx + Math.round((hash(i * 3 + k) - .5) * 6), b + 8, season) });
    if (!open) items.push({ y: b, draw: (g) => lockedPlot(g, x + 2, top + 14, LEAGUES[leagueForPlot(i)].name.split(" ")[0].toUpperCase(), season) });
    else if (!p) items.push({ y: b, draw: (g) => emptyPlot(g, x + 2, top + 14) });
    else {
      const model=facilityModel(p.type,p.level,i);
      drawFacilityGround(g,model,season);
      items.push({y:model.depth,draw:(g,now)=>drawFacilityStructure(g,model,season,s.colors,now)});
    }
    items.push({y:street-12,draw:g=>drawClubFront(g,x,LOT_W,street-12,open,i)});
  });
  // Bus shelter, bicycles and wayfinding are placed outside walking routes.
  items.push({y:ROW+66,draw:g=>{
    const {x,y}=BUS_STOP;
    rect(g,x,y-23,2,23,"#536b6c");rect(g,x+27,y-23,2,23,"#536b6c");
    rect(g,x+2,y-20,25,16,"#b0d3d18c");rect(g,x-3,y-25,36,3,"#466e6b");
    bench(g,x+6,y-1);text(g,"BUS",x+5,y-23,{color:"#f5edda",outline:null});
  }});
  items.push({y:PLAZA+15,draw:g=>bikeRack(g,ROAD-94,PLAZA+15)});
  items.push({y:ROW+38,draw:g=>streetSign(g,ROAD+100,ROW+38,"CLUB ROW")});
  items.push({y:NORTH+1,draw:g=>streetSign(g,584,NORTH+1,"NORTH LANE")});
  items.push({y:130,draw:g=>streetSign(g,568,130,"TOWN LANE")});
  items.push({y:BLVD,draw:g=>streetSign(g,ROAD-84,BLVD,"STADIUM")});
  // Street furniture: lamps along the near side of each street, benches on the forecourt.
  drawStreetFurniture(g,items,s.colors,season);
  // Bunting in the club's colours strung between the lamps along Club Row.
  for (const [a, b] of [[42, 138], [356, 448], [650, 746], [842, 936]]) items.push({ y: ROW + 1, draw: (g, now = 0) => bunting(g, a, b, ROW - 14, [s.colors.primary, s.colors.secondary, "#f4efe2", "#e86a4a"], now) });
  // Forecourt: ticket kiosks by the gate, trees in planters and benches along the front.
  for (const x of [ROAD - 52, ROAD + 32]) items.push({ y: PLAZA - 2, draw: (g) => kiosk(g, x, PLAZA - 2, s.colors) });
  for (let x = BOWL.x + 10; x < BOWL.x + BOWL.w; x += 64) if (Math.abs(x - ROAD) > 40) items.push({ y: PLAZA + 14, draw: (g) => planter(g, x, PLAZA + 14, season, x) });
  for (const x of [ROAD - 120, ROAD + 100, ROAD + 200]) items.push({ y: PLAZA + 13, draw: (g) => bench(g, x, PLAZA + 13) });
  // The stadium walk: a gateway on Club Row, flags in the club's colours down both sides over
  // clipped hedges, and the crest set into the forecourt in front of the gate.
  for (const fy of [432, 458]) for (const fx of [ROAD - 19, ROAD + 18]) items.push({ y: fy, draw: (g, now = 0) => banner(g, fx, fy, s.colors, now, fx < ROAD) });
  items.push({ y: ROW - 5, draw: (g) => gateway(g, ROAD, ROW - 5, season, s.colors, s.clubName) });
  for (const x of [AVENUE + 40, AVENUE + 200, AVENUE + 360]) items.push({ y: 394, draw: (g) => bench(g, x, 394) });
  // Hedgerows along the map's south edge and the car parks.
  hedge(g, 0, MAP_H - 2, ROAD - 16, season);
  hedge(g, ROAD + 16, MAP_H - 2, MAP_W - ROAD - 16, season);
  // Woods frame the club; the stadium and lots are kept clear.
  const lotRects = LOTS.map(([x, top]) => [x - 6, top + 10, LOT_W + 12, 80]);
  const roadClear = CITY_ROADS.map(r => [Math.min(r.x1,r.x2)-22, Math.min(r.y1,r.y2)-14, Math.abs(r.x2-r.x1)+44, Math.abs(r.y2-r.y1)+28]);
  const clear = [...roadClear, ...RESIDENTIAL_LOTS.map(l => [l.x-4,l.y-14,l.w+8,l.h+24]), [BOWL.x - 12, BOWL.y - 20, BOWL.w + 24, BOWL.h + 40], [TOWER.x - 26, TOWER.y - 70, 52, 100], [584, 282, 364, 122], [0,ROW-12,MAP_W,58], [ROAD-114,ROW,210,BLVD-ROW-10], [POCKET_PARK.x,536,POCKET_PARK.w,POCKET_PARK.h+20], ...lotRects];
  grove(items, 0, 8, MAP_W, 64, 62, 101, season, clear, 0.45);
  grove(items, 0, 64, BOWL.x - 6, ROW - 40, 18, 211, season, clear, 0.35);
  grove(items, 0, 340, BOWL.x + 30, PLAZA - 24, 6, 233, season, clear, 0.2);
  grove(items, BOWL.x + BOWL.w + 6, 60, AVENUE - 14, ROW - 40, 8, 307, season, clear, 0.3);
  grove(items, AVENUE + 10, 40, MAP_W, NORTH - 70, 20, 401, season, clear, 0.45);
  grove(items, 0, ROW + 30, ROAD - 100, BLVD - 40, 8, 503, season, clear, 0.2);
  grove(items, 760, ROW + 30, MAP_W, MAP_H - 20, 16, 601, season, clear, 0.3);
  grove(items, 0, BLVD + 18, MAP_W, MAP_H - 14, 22, 701, season, clear, 0.25);
  grove(items, AVENUE + 10, ROW + 30, 760, BLVD - 80, 3, 801, season, clear, 0.2);
  items.filter((it) => it.y < BOWL.y + 30).sort((a, b) => a.y - b.y).forEach((it) => it.draw(g));
  drawArena(g, s, season);
  return {image:c,scenery:items.filter(it=>it.y>=BOWL.y+30)};
}

// Where an athlete stands for today's activity, in map coordinates.
let dayClock = 0.25,
  lastDraw = 0;
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
  // All-round days move round the grounds like a real session: laps, then the athlete's own
  // circle, then the gym, staggered so the squad is spread out. Gains are the same either way.
  if (activity === "balanced") {
    const leg = Math.floor(dayClock * 3 + index * 0.4) % 3;
    if (leg === 1) activity = "technique";
    else if (leg === 2) activity = "power";
    else {
      const u = now / 50000 + index * 0.11,
        [x, y, dir] = loopPoint(LANE, u);
      return { x, y: y + 2, pose: "run", frame: runFrame(u * loopLength(LANE)), flip: dir < 0, follow: true };
    }
  }
  if (activity === "speed") {
    const n = slot("speed"),
      t = (now / 2600 + n * 0.3) % 1,
      x = TRACK.x + TRACK.r - 20 + t * (TRACK.w - 2 * TRACK.r + 40);
    return { x, y: TRACK.y + TRACK.h - 4 - (n % 4) * 3, pose: "run", frame: runFrame(x), flip: false, follow: true };
  }
  if (activity === "technique" || activity === "sharpen") {
    const ev = a.trainingEvent || a.event,
      sp = SPOTS[ev],
      n = slot(ev),
      built = s.stadium[ev] > 0,
      west = ev === "hammer" || ev === "jav";
    const off = [[0, 2], [14, 12], [-14, 12], [22, 4]][n % 4];
    if (!built) return { x: sp.x + (west ? -off[0] : off[0]), y: sp.y + off[1], pose: "drill", event: ev, frame: Math.floor(now / 420 + index) % 4, flip: west };
    // The same throw as at a meet, at the athlete's form and with their own finish.
    const level = formOf(a, ev),
      style = recoveryStyle(a);
    if (ev === "jav") {
      // One runway: javelin throwers take turns from the arc, the others wait at the far end.
      const runway = [0, 46, 56, 66][s.stadium.jav],
        arc = sp.x + 30 - runway,
        size = s.roster.filter((b) => (b.trainingEvent || b.event) === "jav").length || 1,
        turn = Math.floor(now / (throwLoopMs("jav") * FETCH_AFTER.jav + 4000)) % size;
      if (turn !== n % size) return { x: sp.x + 34 + (n % 3) * 7, y: sp.y + 1 + (n % 2) * 4, pose: "idle", frame: Math.floor(now / 600 + index) % 2, flip: true };
      return { x: arc, y: sp.y + 1, event: ev, ...practice(ev, level, style, now, true) };
    }
    return { x: sp.x + (west ? -off[0] : off[0]), y: sp.y + off[1], event: ev, ...practice(ev, level, style, now + index * 1300, west) };
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
  // Speech and emote bubbles: who is talking, what, and since when. Keys are "a<id>" for
  // athletes, "v<n>" for visitors and "coach".
  const talk = new Map();
  let nextChat = 0,
    chatSeed = 0,
    coachPos = [CENTER.x, CENTER.y + 30];
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
    const list = [[ROAD - 90, PLAZA + 4], [ROAD + 90, PLAZA + 4], [GATE.x, GATE.out + 4], BUS_STOP.waiting, [668, 394], [180, BLVD - 2]];
    s.plots.forEach((p, i) => {
      if (p && ["cafe", "shop", "garden", "fountain", "statue", "club"].includes(p.type)) {
        const [x, y] = front(i);
        list.push([x, y], [x + 4, y + 2]);
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
      v.walked = (v.walked || 0) + step;
      if (Math.abs(tx - v.x) > 0.5) v.flip = tx < v.x;
    }
    return true;
  }

  // Weather over the visible map: cloud shadows, rain, snow, gusts or a heat haze.
  // Particles live in screen space; cloud shadows drift across the ground.
  function sky(s, ox, oy, now, calm) {
    const w = weatherToday(s),
      W = cam.vw,
      H = cam.vh,
      t = now / 1000;
    const tint = { cloudy: "rgba(80,92,104,0.08)", rain: "rgba(52,72,104,0.24)", snow: "rgba(214,226,250,0.12)", heat: "rgba(255,196,110,0.1)", windy: "rgba(120,130,120,0.06)" }[w];
    if (tint) {
      sg.fillStyle = tint;
      sg.fillRect(0, 0, W, H);
    }
    if (w === "cloudy" || w === "rain" || w === "windy") {
      sg.fillStyle = "rgba(20,30,40,0.05)";
      for (let i = 0; i < 7; i++) {
        const speed = w === "windy" ? 24 : 8,
          x = ((hash(i) * MAP_W + t * speed) % (MAP_W + 240)) - 120 - ox,
          y = hash(i + 9) * MAP_H - oy;
        sg.beginPath();
        sg.ellipse(x, y, 70 + hash(i + 3) * 60, 26 + hash(i + 5) * 18, 0, 0, Math.PI * 2);
        sg.fill();
      }
    }
    if (calm) return;
    const n = Math.round((W * H) / 900);
    if (w === "rain") {
      sg.fillStyle = "rgba(190,214,240,0.55)";
      for (let i = 0; i < n; i++) {
        const fall = (t * 260 + hash(i) * 600) % (H + 20),
          x = (hash(i + 7) * (W + 40) - fall * 0.25 + W) % W;
        sg.fillRect(Math.round(x), Math.round(fall - 10), 1, 4);
        if (fall > H * hash(i + 2) && fall < H * hash(i + 2) + 6) sg.fillRect(Math.round(x) - 1, Math.round(fall - 6), 3, 1);
      }
    } else if (w === "snow") {
      sg.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < n * 0.7; i++) {
        const fall = (t * (14 + hash(i) * 10) + hash(i + 1) * 400) % (H + 10),
          x = (hash(i + 4) * W + Math.sin(t * 1.3 + i) * 4 + W) % W,
          big = hash(i + 6) > 0.8 ? 2 : 1;
        sg.fillRect(Math.round(x), Math.round(fall - 5), big, big);
      }
    } else if (w === "windy") {
      for (let i = 0; i < n * 0.12; i++) {
        const x = ((t * (120 + hash(i) * 80) + hash(i + 3) * 900) % (W + 60)) - 30,
          y = (hash(i + 8) * H + Math.sin(t * 3 + i) * 3) | 0;
        sg.fillStyle = i % 3 ? "rgba(255,255,255,0.35)" : ["#c8783a", "#e0a040", "#8aa040"][i % 3];
        if (i % 3) sg.fillRect(Math.round(x), y, 6, 1);
        else sg.fillRect(Math.round(x), y, 2, 1);
      }
    } else if (w === "heat") {
      sg.fillStyle = "rgba(255,240,200,0.06)";
      for (let i = 0; i < 6; i++) sg.fillRect(0, ((t * 12 + i * H / 6) % H) | 0, W, 2);
    }
  }
  // Time of day: a warm dawn, clear daylight, a golden evening, then night with the
  // floodlights and street lamps glowing. nightScale softens the dark at high speed.
  function light(s, ox, oy, progress, nightScale) {
    const h = clockMinutes(progress) / 60,
      dark = nightness(progress) * nightScale;
    if (h < 8.5) {
      sg.fillStyle = `rgba(255,214,160,${((8.5 - h) / 2.5) * 0.22})`;
      sg.fillRect(0, 0, cam.vw, cam.vh);
    } else if (h <= 16.5) {
      // A gentle warm grade through the day keeps the town cosy rather than clinical.
      sg.fillStyle = "rgba(255,226,180,0.07)";
      sg.fillRect(0, 0, cam.vw, cam.vh);
    }
    if (h > 16.5) {
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
    for(const [x,y] of STREET_LAMPS) glow(x,y-8,22,dark*0.18);
    for(const lot of RESIDENTIAL_LOTS) glow(lot.x+22,lot.y+(lot.w>60?62:41),25,dark*0.14,"255,214,150");
    // Lit windows along the streets, the neighbours' houses and the street lamps.
    LOTS.forEach(([x, top], i) => {
      if (s.plots[i]) glow(x + 56, top + 56, 34, dark * 0.22, "255,210,140");
    });
    for (const lot of RESIDENTIAL_LOTS) glow(lot.x + lot.w / 2, lot.y + (lot.w > 60 ? 56 : 38), 22, dark * 0.18, "255,210,140");
    for (const [x, y] of STREET_LAMPS) glow(x, y - 19, 14, dark * 0.45);
    // The car park light glows too; the rest of the night stays dark.
    for (const [x, y] of LOT_LIGHTS) { glow(x, y - 8, 22, dark * 0.18); glow(x, y - 17, 10, dark * 0.45); }
    sg.globalCompositeOperation = "source-over";
  }
  function draw(s, now, o = {}) {
    resize();
    dayClock = o.dayProgress ?? 0.25;
    const dt = Math.min(100, now - (lastDraw || now));
    lastDraw = now;
    const k = s.plots.map((p) => (p ? p.type + p.level : "-")).join("|") + JSON.stringify(s.stadium) + JSON.stringify(s.stadiumStyle) + plotsOpen(s) + seasonOf(s) + s.colors.primary + s.colors.secondary + s.clubName;
    if (k !== key) {
      base = baseWorld(s);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base.image, 0, 0);
    // The stands fill with the fans, up to their capacity; a home meet day draws the most.
    animateArena(g, s, now, Math.min(0.97, stadiumCrowd(s, { meet: s.matchDay === s.day && !!meetVenue(s)?.home }).fill));
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
    const lotBox = (i, col) => {const {x,y,w,h}=parcelBounds(i);box(x,y,w,h,col);};
    if (o.moving != null) for (let i = 0; i < LOTS.length; i++) if (i !== CLUB_PLOT && i !== o.moving && plotUnlocked(s, i)) lotBox(i, pulse ? "#9fe0ff" : "#5ab0e0");
    if (o.selected?.kind === "plot") lotBox(o.selected.index, pulse ? "#fff2a0" : "#f2c94c");
    if (o.selected?.kind === "stadium") {
      const [x, y, w, h] = SPOTS[o.selected.key].hit;
      box(x, y, w, h, pulse ? "#fff2a0" : "#f2c94c");
    }
    // Buildings, fences, trees and people share one ground-depth order. A person
    // behind a wall is hidden; a person in front of its door stays visible.
    const want = Math.min(28, visitorsPerDay(s));
    if (visitors.length !== want) visitors = makeVisitors(s, want);
    const list = base.scenery.map(it=>({y:it.y,draw:()=>it.draw(g,now)}));
    for (const v of visitors) {
      const moving = stepVisitor(v, s, now);
      list.push({ y: v.y, draw: () => (shadow(g, v.x, v.y, 4), figure(g, { look: v.look, shirt: v.shirt, collar: "#f4efe2", pose: moving ? "walk" : "idle", frame: moving ? walkFrame(v.walked || 0) : Math.floor(now / 600 + v.seed) % 2, flip: v.flip }, v.x, v.y)) });
    }
    const counts = {};
    s.roster.forEach((a, index) => {
      const activity = activities.get(a.id) || plannedActivity(s, a);
      const target = targetFor(s, a, index, now, activity, counts);
      let p = people.get(a.id);
      if (!p) people.set(a.id, (p = { x: target.x, y: target.y, path: [], goal: [target.x, target.y] }));
      const far = Math.abs(target.x - p.goal[0]) + Math.abs(target.y - p.goal[1]) > 20;
      if (!p.path.length && far && !target.follow) Object.assign(p, { path: route([p.x, p.y], [target.x, target.y]), goal: [target.x, target.y] });
      let pose = target.pose,
        frame = target.frame ?? Math.floor(now / (pose === "run" ? 110 : pose === "lift" ? 520 : 420) + index) % 4,
        flip = target.flip;
      if (p.path.length) {
        // Walk if there is time; on a short day jog or run, so the rest of the path always takes
        // less than ARRIVE_IN of a day and nobody misses a session in transit.
        let left = Math.hypot(p.path[0][0] - p.x, p.path[0][1] - p.y);
        for (let i = 1; i < p.path.length; i++) left += Math.hypot(p.path[i][0] - p.path[i - 1][0], p.path[i][1] - p.path[i - 1][1]);
        const pace = o.dayMs ? Math.min(WALK_PACE, (o.dayMs * ARRIVE_IN) / Math.max(1, left)) : WALK_PACE;
        let step = dt / pace;
        const [fx, fy] = [p.x, p.y];
        while (step > 0 && p.path.length) {
          const [tx, ty] = p.path[0],
            d = Math.hypot(tx - p.x, ty - p.y);
          // Straight up or down the screen, keep facing the way they last went.
          if (Math.abs(tx - p.x) > 0.5) p.flip = tx < p.x;
          if (d <= step) {
            p.x = tx;
            p.y = ty;
            p.path.shift();
            step -= d;
          } else {
            p.x += ((tx - p.x) / d) * step;
            p.y += ((ty - p.y) / d) * step;
            step = 0;
          }
        }
        // Step the legs by distance covered, so the planted foot stays put instead of sliding.
        p.walked = (p.walked || 0) + Math.hypot(p.x - fx, p.y - fy);
        pose = pace < WALK_PACE * 0.6 ? "run" : "walk";
        frame = pose === "run" ? runFrame(p.walked) : walkFrame(p.walked);
        flip = !!p.flip;
      } else {
        p.x = target.x;
        p.y = target.y;
        p.goal = [target.x, target.y];
      }
      const still = !p.path.length,
        ox = still ? target.ox || 0 : 0,
        oy = still ? target.oy || 0 : 0;
      list.push({
        y: p.y + 0.5,
        draw: () => {
          const fx = p.x + ox,
            fy = p.y + oy,
            look = { ...athleteLook(a, s.colors), pose, frame, flip, blend: still ? target.blend : null, event: target.event || a.event, released: still && target.released };
          shadow(g, fx, fy, 5);
          // The hammer head on its wire, behind or in front of the thrower.
          const ball = still && target.ball,
            chain = () => {
              const [gx, gy] = gripOf(look);
              line(g, fx + gx, fy + gy, fx + ball.dx, fy + ball.dy, "#d8d8c8");
              rect(g, fx + ball.dx - 1, fy + ball.dy - 1, 2, 2, "#3a3e46");
            };
          if (ball?.behind) chain();
          figure(g, look, fx, fy);
          if (ball && !ball.behind) chain();
          if (still && target.lying) for (const [lx, ly] of target.lying) implementAt(g, target.event, p.x + lx, p.y + ly);
          if (still && target.launch) flight(g, target.event, p.x, p.y, target.launch);
          if (o.selected?.kind === "athlete" && o.selected.id === a.id) text(g, "↓", p.x, p.y - 30 - pulse, { color: "#f2c94c", align: "center" });
        },
      });
    });
    // The head coach (that's you) watches from the infield.
    const coachX = CENTER.x + Math.round(Math.sin(now / 3000) * 8),
      coachY = CENTER.y + 30;
    coachPos = [coachX, coachY];
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
    // Compose the visible part of the map on a screen-sized layer.
    const [ox, oy] = origin();
    sg.imageSmoothingEnabled = false;
    sg.fillStyle = "#4e7a40";
    sg.fillRect(0, 0, cam.vw, cam.vh);
    sg.drawImage(world, -ox, -oy);
    sky(s, ox, oy, now, o.calm);
    light(s, ox, oy, o.dayProgress ?? 0.25, o.nightScale ?? 1);
    // Popups go on the screen layer after the lighting, so evening and night never dim the numbers.
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
      // A quick hop on arrival, then a slow drift upwards.
      const rise = Math.min(1, t * 2.5) * 10 + (t < 0.12 ? Math.sin((t / 0.12) * Math.PI) * 3 : 0);
      sg.globalAlpha = t > 0.75 ? (1 - t) * 4 : 1;
      text(sg, q.text, x - ox, y - oy - rise, { color: q.color, scale: q.scale || 1, align: "center", shadow: "rgba(0,0,0,0.45)" });
      sg.globalAlpha = 1;
    }
    chatter(s, now, o);
    drawTalk(s, now, ox, oy, o.calm);
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

  // An implement in flight from a thrower towards the infield, with a puff where it lands.
  // The implement leaves the hand (or, for the hammer, the end of the wire) where the motion
  // releases it, flies out over the sector and leaves a puff where it lands.
  function flight(g, ev, x, y, { t: ms, from, to }) {
    const t = Math.min(1, ms / 800),
      sx = x + from[0],
      sy = y + from[1],
      ex = x + to[0],
      ey = y + to[1],
      dir = ex < sx ? -1 : 1,
      bx = sx + (ex - sx) * t,
      by = sy + (ey - sy) * t - Math.sin(t * Math.PI) * (ev === "shot" ? 8 : 16);
    if (t >= 1) return;
    if (t > 0.85) ellipse(g, ex, ey, 3, 1, "#e8dcc0");
    if (ev === "jav") line(g, bx - 4 * dir, by + 1, bx + 4 * dir, by - 1, "#f0e8d0");
    else rect(g, bx - 1, by - 1, 2, 2, ev === "discus" ? "#e0c070" : "#4a4e56");
  }
  // An implement waiting on the grass to be collected; a javelin stands stuck in the ground.
  function implementAt(g, ev, x, y) {
    if (ev === "jav") line(g, x + 3, y - 6, x, y, "#f0e8d0");
    else if (ev === "hammer") line(g, x, y, x + 4, y - 1, "#d8d8c8"), rect(g, x - 1, y - 1, 2, 2, "#3a3e46");
    else rect(g, x - 1, y - 1, 2, 2, ev === "discus" ? "#e0c070" : "#4a4e56");
  }
  function say(key, str, now = performance.now(), dur = 2400) {
    talk.set(key, { text: str, t0: now, dur });
  }
  // Every few seconds somebody says something: an athlete in their own voice, a visitor, or you.
  function chatter(s, now, o) {
    if (now < nextChat) return;
    nextChat = now + 1800 + hash(++chatSeed) * 2600;
    const roll = hash(chatSeed * 7);
    if (roll < 0.66 && s.roster.length) {
      const a = s.roster[Math.floor(hash(chatSeed * 13) * s.roster.length)];
      if (!people.has(a.id) || talk.has("a" + a.id)) return;
      const emote = hash(chatSeed * 17) < 0.5;
      say("a" + a.id, emote ? emoteFor(s, a) : voiceLine(a, idleSituation(s, a), chatSeed), now, emote ? 1600 : 2600);
    } else if (roll < 0.86 && visitors.length) {
      const n = Math.floor(hash(chatSeed * 19) * visitors.length);
      say("v" + n, CROWD_LINES[chatSeed % CROWD_LINES.length], now, 1800);
    } else say("coach", COACH_LINES[chatSeed % COACH_LINES.length], now, 2000);
  }
  function speakerAt(key) {
    if (key === "coach") return coachPos;
    if (key[0] === "v") {
      const v = visitors[+key.slice(1)];
      return v ? [v.x, v.y - 6] : null;
    }
    const p = people.get(+key.slice(1));
    return p ? [p.x, p.y] : null;
  }
  const EMOTE_COLORS = { "♥": "#e0506a", "♪": "#4a7ad0", "~": "#5ab0e0", "!": "#e08a2a", Z: "#7a8a96", "?": "#7a5aa8", "...": "#6c7a69" };
  // Bubbles sit on the screen layer, above the lighting, so they read at night too.
  function drawTalk(s, now, ox, oy, calm) {
    for (const [key, b] of talk) {
      const t = (now - b.t0) / b.dur,
        at = speakerAt(key);
      if (t >= 1 || !at) {
        talk.delete(key);
        continue;
      }
      const emote = b.text.length <= 3 && EMOTE_COLORS[b.text],
        w = measure(b.text) + (emote ? 6 : 8),
        h = 11,
        hop = !calm && t < 0.08 ? Math.round((1 - t / 0.08) * 3) : 0,
        x = Math.round(at[0] - ox - w / 2),
        y = Math.round(at[1] - oy - 38 - hop);
      if (x + w < 0 || x > cam.vw || y + h < 0 || y > cam.vh) continue;
      sg.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      rect(sg, x + 1, y, w - 2, h, "#2a2420");
      rect(sg, x, y + 1, w, h - 2, "#2a2420");
      rect(sg, x + 1, y + 1, w - 2, h - 2, "#fffaf0");
      rect(sg, Math.round(at[0] - ox) - 1, y + h - 1, 3, 2, "#fffaf0");
      rect(sg, Math.round(at[0] - ox) - 1, y + h + 1, 1, 1, "#2a2420");
      rect(sg, Math.round(at[0] - ox) + 1, y + h + 1, 1, 1, "#2a2420");
      rect(sg, Math.round(at[0] - ox), y + h + 2, 1, 1, "#2a2420");
      text(sg, b.text, x + w / 2, y + 2, { color: emote || "#3a2a24", outline: null, align: "center" });
      sg.globalAlpha = 1;
    }
  }
  function sparkle(x, y, now = performance.now()) {
    for (let n = 0; n < 18; n++) sparks.push({ x, y, vx: Math.cos(n) * (0.5 + hash(n)), vy: -0.8 - hash(n + 3), color: ["#f2c94c", "#fff6dc", "#9fe0ff"][n % 3], t0: now, dur: 900 });
  }
  function onDay(s, report, now, dayMs) {
    activities = new Map(report.athletes.map((e) => [e.id, e.activity === "facility" ? "facility:" + report.duties.find((d) => d.id === e.id).key : e.activity]));
    // One line per stat gained, each in its stat colour, stacked above the athlete.
    const stacks = new Map(),
      stackOf = (id) => {
        const n = stacks.get(id) || 0;
        stacks.set(id, n + 1);
        return n;
      };
    report.athletes.forEach((e, n) => {
      const a = s.roster.find((x) => x.id === e.id);
      if (!a) return;
      const t0 = now + dayMs * 0.35 + n * 90,
        dur = Math.min(2000, dayMs * 0.75);
      if (e.activity === "rest" || e.activity === "injured" || e.activity === "facility") {
        popups.push({ follow: e.id, stack: stackOf(e.id), x: 0, y: 0, text: e.activity === "rest" ? "REST" : e.activity === "injured" ? "RECOVERING" : "CLUB DUTY", color: e.activity === "facility" ? "#f2d060" : "#bfe8ff", t0, dur });
        return;
      }
      // Whole-point gains only: the same numbers the stat screens show.
      a.stats.forEach((v, i) => {
        const up = Math.floor(v + 1e-6) - Math.floor(v - e.gains[i] + 1e-6);
        if (up > 0) {
          const k = stackOf(e.id);
          popups.push({ follow: e.id, stack: k, x: 0, y: 0, text: "+" + up + " " + STAT_SHORT[i], color: STAT_COLORS[i], t0: t0 + k * 140, dur });
        }
      });
    });
    for (const d of report.duties || []) {
      const label = [d.money ? "+$" + d.money : "", d.insights ? "+" + d.insights + " INSIGHT" : "", d.fans ? "+" + d.fans + " FANS" : ""].filter(Boolean).join(" ");
      if (label) popups.push({ follow: d.id, stack: stackOf(d.id), x: 0, y: 0, text: label, color: "#f2d060", t0: now + dayMs * 0.55, dur: 1400 });
    }
    for (const l of report.levelUps) {
      popups.push({ follow: l.id, stack: stackOf(l.id) + 1, x: 0, y: 0, text: "LEVEL UP!", color: "#f2c94c", t0: now + dayMs * 0.5, dur: 2000, scale: 2 });
      const p = people.get(l.id), a = s.roster.find((x) => x.id === l.id);
      if (p) sparkle(p.x, p.y - 12, now + dayMs * 0.5);
      if (a) setTimeout(() => say("a" + a.id, voiceLine(a, "levelUp", l.level), performance.now(), 2200), dayMs * 0.5 + 600);
    }
    // The crowd notices: a couple of visitors cheer when somebody levels up.
    if (report.levelUps.length && visitors.length)
      for (let k = 0; k < Math.min(3, visitors.length); k++) {
        const n = Math.floor(hash(report.day * 7 + k) * visitors.length);
        setTimeout(() => say("v" + n, ["WOW!", "♥", "BRAVO!"][k % 3], performance.now(), 1600), dayMs * 0.55 + 250 * k);
      }
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
      const {x:lx,y:top,w,h}=parcelBounds(i);
      if (x >= lx && x < lx+w && y >= top && y < top+h) return { kind: "plot", index: i };
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
    say: (id, str, dur) => say("a" + id, str, performance.now(), dur),
    banner,
    // Building work is a show: the camera cuts to the site before the burst.
    flashPlot: (i, label) => (focus(LOTS[i][0] + 56, LOTS[i][1] + 50), burst(LOTS[i][0] + 56, LOTS[i][1] + 50, label)),
    flashSpot: (key, label) => (focus(SPOTS[key].x, SPOTS[key].y), burst(SPOTS[key].x, SPOTS[key].y, label)),
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
