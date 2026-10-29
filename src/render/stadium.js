import { canvas, rect, poly, ellipse, line, shade, hash, px, mix } from "./pixel.js";
import { text, fit } from "./font.js";
import { figure, sprite, shadow, athleteLook, gripOf, OX, OY } from "./sprites.js";
import { EVENTS, EVENT_IDS, LEAGUES, trackColorOf, styleOf } from "../game-content.js";
import { homeAthlete, rivalAthlete, best, meetVenue, fieldLeaderboard, worldRecord, rawMark, matchClub, formOf } from "../domain/game.js";
import { throwMotion } from "./throw-motion.js";
import { beatDuration, CUTIN_MS, SETUP_MS, LAND_MS, hasCutIn, throwOffset, throwResult } from "./meet-presentation.js";
import { SCENE_HEIGHT, THROW_ORIGIN, throwingSector, meetCamera } from "./meet-geometry.js";
export { beatDuration, CUTIN_MS } from "./meet-presentation.js";
import { line as voiceLine, throwSituation } from "../domain/voice.js";
import { measure } from "./font.js";
// A pixel speech bubble whose tail points down at (x, y + 12), kept inside the scene.
function speech(g, str, x, y) {
  const w = measure(str) + 8,
    left = Math.round(Math.max(2, Math.min(W - w - 2, x - w / 2)));
  rect(g, left + 1, y, w - 2, 11, "#2a2420");
  rect(g, left, y + 1, w, 9, "#2a2420");
  rect(g, left + 1, y + 1, w - 2, 9, "#fffaf0");
  rect(g, Math.round(x) - 1, y + 10, 3, 2, "#fffaf0");
  rect(g, Math.round(x), y + 12, 1, 1, "#2a2420");
  text(g, str, left + w / 2, y + 2, { color: "#3a2a24", outline: null, align: "center" });
}

let W = 640;
export const H = SCENE_HEIGHT;
const TRACK_COLORS = ["#b07850", "#c46a4e", "#c46a4e", "#3a6ab0", "#3a6ab0"];
const CROWDS = [0.3, 0.45, 0.6, 0.78, 0.95];
// Venue look for the meet in progress: your own stadium at home, the rival's ground away
// (sized by the level it competes at), a neutral showpiece for finals. Bigger venues hold
// evening meets under lights; the meet-day weather sets the sky.
function venueOf(s, m) {
  const v = meetVenue(s) || { grand: 0, color: m.color, trim: "#f4efe2", backdrop: "town", name: "", lights: false };
  const grand = Math.max(0, Math.min(4, v.grand));
  const time = v.lights && (grand >= 3 || (v.home && s.stadium.lights >= 2)) ? "night" : grand === 2 || (v.home && v.lights) ? "golden" : "day";
  return {
    ...v,
    grand,
    time,
    weather: m.weather || "cloudy",
    track: v.home ? trackColorOf(s.stadium.track, styleOf(s).track) : TRACK_COLORS[grand],
    crowd: v.home ? Math.min(0.95, 0.12 + s.stadium.stands * 0.18 + Math.min(0.3, s.fans / 5000)) : v.special ? 0.92 : CROWDS[grand],
  };
}
const O = THROW_ORIGIN;
let sector = throwingSector("shot", W, 100);
const centreY = x => sector.centerY(x);
const upperY = x => sector.upperY(x);
// The sector is sized to this field: a third past the longest throw anyone here is likely to
// make, so novice marks land out in the sector rather than huddled by the circle. It never
// reaches beyond the world record, or the club's own record once it goes further.
let SPAN = 100;
function spanOf(s, m, i, ev) {
  const most = Math.max(EVENTS[ev].record * 1.06, worldRecord(s, ev) * 1.08),
    field = m.fields?.[i];
  if (!field) return most;
  const away = matchClub(s)?.athletes;
  let reach = 0;
  for (const [entries, pool] of [[field.home, s.roster], [field.away, away || []]])
    for (const e of entries) {
      const a = pool.find((x) => x.id === e.id);
      reach = Math.max(reach, a ? rawMark(a, ev) : 0, a?.pb?.[ev] || 0, ...e.marks.filter((x) => x != null));
    }
  if (!reach) return most;
  return Math.ceil(Math.min(most, Math.max(EVENTS[ev].min * 1.6, reach * 1.35)));
}
const ppmOf = () => sector.ppm;
// Half the javelin runway's width on screen, in the oblique view.
const RUNWAY = 9;
// The discus and hammer cage: posts on an arc round the back of the circle, opening towards the
// sector, with netting between them. The far half is drawn behind the thrower, the near half in
// front, so the thrower stands inside it.
const CAGE = { rx: 38, ry: 15, h: 74, from: 0.28, to: 1.72 };
function cage(g, half) {
  const posts = [];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (CAGE.from + ((CAGE.to - CAGE.from) * i) / 8);
    posts.push([Math.round(O.x + Math.cos(a) * CAGE.rx), Math.round(O.y + Math.sin(a) * CAGE.ry), Math.sin(a)]);
  }
  // Far posts have negative sin (they sit above the circle on screen); near posts positive.
  const mine = ([, , z]) => (half === "back" ? z <= 0.05 : z > 0.05);
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x1, y1, z1] = posts[i], [x2, y2, z2] = posts[i + 1];
    if (!mine([0, 0, (z1 + z2) / 2])) continue;
    poly(g, [[x1, y1], [x2, y2], [x2, y2 - CAGE.h], [x1, y1 - CAGE.h]], half === "back" ? "rgba(60,80,70,0.16)" : "rgba(60,80,70,0.1)");
    for (let k = 8; k < CAGE.h; k += 8) line(g, x1, y1 - k, x2, y2 - k, "rgba(70,90,80,0.35)");
    line(g, x1, y1 - CAGE.h, x2, y2 - CAGE.h, "#3a4a42");
  }
  for (const p of posts) if (mine(p)) rect(g, p[0], p[1] - CAGE.h, 2, CAGE.h, "#4a5a52");
}
function distanceArc(g, metres, color, dashed = false) {
  const points = sector.arc(metres);
  for (let i = 1; i < points.length; i++) if (!dashed || i % 4 < 2) line(g, ...points[i - 1], ...points[i], color);
}
const OFFICIAL = { look: { skin: "#d8a47e", hair: "#d8d8d0", style: 0 }, shirt: "#f4f4f0", collar: "#2a2a2a", shorts: "#2a2a2a" };

const T = { prep: 250, tech: 1000, land: LAND_MS };

function skyFor(venue) {
  const w = venue.weather,
    night = venue.time === "night";
  if (w === "rain") return night ? ["#1c2434", "#38425a"] : ["#8a96a4", "#c4ccd2"];
  if (w === "snow") return night ? ["#2a3448", "#56607a"] : ["#b8c4cc", "#e8edf0"];
  if (night) return w === "cloudy" ? ["#222a40", "#48506a"] : ["#141c3a", "#3a4a78"];
  if (venue.time === "golden") return w === "cloudy" ? ["#c8a088", "#ead6c0"] : ["#e8a868", "#f8e0b0"];
  if (w === "heat") return ["#f0d890", "#fff4d0"];
  if (w === "cloudy" || w === "windy") return ["#a8bccb", "#e4ece8"];
  return ["#8ccbe8", "#e8f4e0"];
}
// The skyline over the back of the stands.
function backdrop(g, kind, horizon, venue) {
  const night = venue.time === "night",
    dim = (c) => (night ? shade(c, -0.55) : venue.weather === "rain" || venue.weather === "snow" ? mix(c, "#a8b0b8", 0.4) : c);
  if (kind === "sea") {
    rect(g, 0, horizon - 12, W, 12, dim("#4a8ab8"));
    for (let i = 0; i < W; i += 9) px(g, i + (hash(i) * 6) | 0, horizon - 10 + ((hash(i + 1) * 8) | 0), night ? "#7a8ab8" : "#cfe6f4");
    rect(g, W * 0.18, horizon - 30, 4, 18, dim("#f4f0e4"));
    rect(g, W * 0.18, horizon - 24, 4, 3, "#c84a3a");
    rect(g, W * 0.18 - 1, horizon - 33, 6, 3, night ? "#fff4b0" : dim("#3a3e46"));
    poly(g, [[W * 0.72, horizon - 13], [W * 0.72 + 14, horizon - 13], [W * 0.72 + 7, horizon - 24]], dim("#f4f0e4"));
  } else if (kind === "mountains") {
    for (let k = 0; k < 5; k++) {
      const x = (k / 4) * W + (hash(k) - 0.5) * 60,
        h = 22 + hash(k + 4) * 18;
      poly(g, [[x - 70, horizon], [x, horizon - h], [x + 70, horizon]], dim(k % 2 ? "#6a7a8a" : "#7a8a96"));
      poly(g, [[x - 12, horizon - h + 9], [x, horizon - h], [x + 12, horizon - h + 9]], dim("#f4f6f8"));
    }
  } else if (kind === "city") {
    for (let x = 0, k = 0; x < W; k++) {
      const w = 12 + ((hash(k) * 16) | 0),
        h = 12 + ((hash(k + 9) * 30) | 0);
      rect(g, x, horizon - h, w - 1, h, dim(["#6a7484", "#7a8494", "#5a6474"][k % 3]));
      for (let wy = horizon - h + 3; wy < horizon - 2; wy += 4) for (let wx = x + 2; wx < x + w - 3; wx += 3) if (hash(wx * 7 + wy) > (night ? 0.45 : 0.75)) px(g, wx, wy, night ? "#ffe8a0" : "#c8d8e8");
      x += w;
    }
  } else if (kind === "trees" || kind === "hills") {
    if (kind === "hills") for (let k = 0; k < 4; k++) ellipse(g, (k / 3) * W, horizon, 110, 22 + hash(k) * 8, dim(k % 2 ? "#7aa060" : "#6a9454"));
    for (let x = -4; x < W; x += 11) {
      const h = 9 + hash(x) * 8;
      ellipse(g, x + 5, horizon - h, 7, h, dim(hash(x + 3) > 0.5 ? "#3e7040" : "#4a7e46"));
    }
  } else {
    for (let x = 0, k = 0; x < W; k++) {
      const w = 18 + ((hash(k) * 10) | 0),
        h = 9 + ((hash(k + 5) * 7) | 0);
      rect(g, x, horizon - h, w - 2, h, dim(["#d8c8a8", "#c8b89a", "#e0d4bc"][k % 3]));
      poly(g, [[x - 1, horizon - h], [x + (w - 2) / 2, horizon - h - 6], [x + w - 1, horizon - h]], dim(["#a8503a", "#7a5a4a", "#8a4a3a"][k % 3]));
      if (k % 3 === 0) rect(g, x + 3, horizon - h - 6, 2, 4, dim("#6a5a4a"));
      px(g, x + 4, horizon - h + 3, night ? "#ffe8a0" : dim("#6a8aa0"));
      x += w;
    }
  }
}
// Seating rows for the crowd, as [y, x0, x1] (each row is 6px tall).
function seatRows(venue) {
  const g = venue.grand,
    rows = [];
  if (g === 0) {
    for (let r = 4; r < 10; r++) rows.push([34 + r * 6, 0, W, 0.5]);
    for (let r = 0; r < 4; r++) rows.push([70 + r * 6, W * 0.36, W * 0.64, 1]);
  } else if (g === 1) for (let r = 0; r < 5; r++) rows.push([64 + r * 6, 0, W, 1]);
  else {
    for (let r = 0; r < 10; r++) rows.push([34 + r * 6, 0, W, 1]);
    if (g >= 3) for (let r = 0; r < 4; r++) rows.push([10 + r * 6, 0, W, 0.9]);
  }
  return rows;
}
function stands(g, venue) {
  const G = venue.grand,
    seat = [shade(venue.color, -0.25), shade(venue.color, -0.1)],
    metal = venue.time === "night" ? "#3a4448" : "#8a9498";
  if (G === 0) {
    // A park: grass banks, a little bleacher and a clubhouse hut.
    for (let r = 2; r < 10; r++) rect(g, 0, 34 + r * 6, W, 6, r % 2 ? "#5a8a48" : "#64944e");
    rect(g, 0, 44, W, 2, "#7aa858");
    rect(g, W * 0.36 - 2, 68, W * 0.28 + 4, 26, metal);
    for (let r = 0; r < 4; r++) rect(g, W * 0.36, 70 + r * 6, W * 0.28, 5, seat[r % 2]);
    const hx = W * 0.8;
    rect(g, hx, 58, 46, 22, "#e8dcc0");
    poly(g, [[hx - 4, 58], [hx + 23, 46], [hx + 50, 58]], venue.color);
    rect(g, hx + 18, 68, 9, 12, "#7a5034");
    rect(g, hx + 5, 63, 8, 6, venue.time === "night" ? "#ffe8a0" : "#8ab0c8");
    for (let x = 0; x < W; x += 12) rect(g, x, 92, 1, 3, "#c8c4b8");
    rect(g, 0, 92, W, 1, "#e8e4d8");
    return;
  }
  if (G === 1) {
    // Metal bleachers along the straight with a press box.
    rect(g, 0, 62, W, 32, metal);
    for (let r = 0; r < 5; r++) rect(g, 0, 64 + r * 6, W, 5, seat[r % 2]);
    for (let x = 6; x < W; x += 40) rect(g, x, 62, 2, 32, shade(metal, -0.3));
    rect(g, W / 2 - 22, 46, 44, 16, "#e8e0cc");
    rect(g, W / 2 - 24, 44, 48, 3, venue.color);
    rect(g, W / 2 - 18, 50, 36, 6, venue.time === "night" ? "#ffe8a0" : "#6a8aa0");
    return;
  }
  // A covered stand; two tiers and a big screen from the national level; a ring roof at the top.
  rect(g, 0, 32, W, 62, shade(metal, -0.2));
  for (let r = 0; r < 10; r++) rect(g, 0, 34 + r * 6, W, 5, seat[r % 2]);
  for (let x = 10; x < W; x += 80) rect(g, x, 34, 3, 60, "#3a4a4a");
  if (G === 2) {
    const x0 = W * 0.12, x1 = W * 0.88;
    rect(g, x0, 20, x1 - x0, 6, "#2e3a3e");
    rect(g, x0, 26, x1 - x0, 1, venue.color);
    for (let x = x0 + 8; x < x1; x += 60) rect(g, x, 26, 2, 8, "#3a4a4a");
    return;
  }
  rect(g, 0, 8, W, 26, shade(metal, -0.3));
  for (let r = 0; r < 4; r++) rect(g, 0, 10 + r * 6, W, 5, seat[(r + 1) % 2]);
  rect(g, 0, 32, W, 2, venue.color);
  rect(g, 0, 2, W, 6, G === 4 ? "#e8ecef" : "#2e3a3e");
  if (G === 4) for (let x = 0; x < W; x += 8) line(g, x, 2, x + 8, 7, "#b8c0c8");
  // The big screen.
  const sx = W / 2 - 36;
  rect(g, sx - 2, 4, 76, 30, "#1a1e24");
  rect(g, sx, 6, 72, 26, venue.time === "night" ? "#10243a" : "#203a52");
}
function stadiumBase(s, ev, venue) {
  const c = canvas(W, H),
    g = c.getContext("2d"),
    sky = skyFor(venue);
  for (let y = 0; y < 60; y++) rect(g, 0, y, W, 1, mix(sky[0], sky[1], y / 60));
  if (venue.time === "night" && venue.weather !== "rain" && venue.weather !== "snow") for (let i = 0; i < 40; i++) px(g, hash(i) * W, hash(i + 50) * 30, "#e8e8ff");
  else if (["sunny", "heat", "windy"].includes(venue.weather)) ellipse(g, W - 60, 14, 9, 9, venue.time === "golden" ? "#f8c080" : "#fff2c0");
  // A few puffy clouds on fair days.
  if (venue.time !== "night" && !["rain", "snow"].includes(venue.weather))
    for (let i = 0; i < 4; i++) {
      const cx = 40 + hash(i * 7) * (W - 80), cy = 10 + hash(i * 3) * 26, w = 14 + hash(i) * 12;
      ellipse(g, cx, cy + 2, w, 4, "rgba(255,255,255,0.55)");
      ellipse(g, cx - w * 0.3, cy, w * 0.5, 4, "rgba(255,255,255,0.7)");
      ellipse(g, cx + w * 0.25, cy - 1, w * 0.55, 5, "rgba(255,255,255,0.8)");
    }
  const horizon = [62, 62, 34, 10, 10][venue.grand];
  if (venue.grand <= 2) backdrop(g, venue.backdrop, horizon, venue);
  stands(g, venue);
  // Evening meets: the stands sit in shadow under the lights.
  if (venue.time === "night") rect(g, 0, 0, W, 94, "rgba(10,16,44,0.3)");
  // Floodlight towers at smaller grounds; bigger venues light from the roof.
  if (venue.lights && venue.grand <= 2)
    for (const x of [24, W - 24]) {
      rect(g, x, 4, 3, 90, "#c8d0c4");
      rect(g, x - 8, 2, 19, 7, "#3b534f");
      for (let k = 0; k < 4; k++) rect(g, x - 6 + k * 4, 4, 3, 3, "#fff4cb");
    }
  if (venue.lights && venue.grand >= 3) for (let x = 6; x < W; x += 18) rect(g, x, 7, 6, 2, "#fff4cb");
  // Ad boards.
  rect(g, 0, 94, W, 12, "#2a3a34");
  const ads = [venue.name.toUpperCase(), "FIZZ DRINKS", "RADIO 98.4", LEAGUES[venue.tier ?? s.league].name.toUpperCase(), "EVERY MARK MATTERS", "CHANNEL 9"];
  for (let i = 0; i * 80 < W; i++) {
    const a = ads[i % ads.length],
      x = i * 80;
    rect(g, x + 1, 95, 78, 10, i % 2 ? "#b0503a" : venue.color);
    text(g, fit(a, 13), x + 40, 97, { color: "#fff6dc", outline: null, align: "center" });
  }
  // Field.
  // Field: a bright checkerboard mow.
  rect(g, 0, 106, W, H - 106, "#6eb24c");
  for (let y = 106; y < H; y += 20) for (let x = (Math.floor((y - 106) / 20) % 2) * 20; x < W; x += 40) rect(g, x, y, 20, 20, "#7abc58");
  for (let i = 0; i < 260; i++) px(g, hash(i * 3) * W, 108 + hash(i * 5) * (H - 110), i % 3 ? "#86c464" : "#62a444");
  // Sector boundaries meet at the throwing origin; distance lines are arcs
  // of equal radius, rather than straight strips across a widening wedge.
  // The javelin's sector lines run out from the two ends of the throwing arc; the circles' lines
  // start at the centre of the ring, which covers them.
  const boundary = sector.arc(SPAN),
    [upper, lower] = ev === "jav" ? [[O.x + 3, O.y - RUNWAY - 2], [O.x + 3, O.y + RUNWAY + 2]] : [[O.x, O.y], [O.x, O.y]];
  poly(g, [upper, ...boundary, lower], "#7cb45c");
  line(g, ...upper, ...boundary[0], "#f4f4e8");
  line(g, ...lower, ...boundary.at(-1), "#f4f4e8");
  // Sector flags where the boundary lines end.
  for (const [fx, fy] of [boundary[0], boundary.at(-1)]) {
    rect(g, fx, fy - 12, 1, 12, "#f4f4e8");
    rect(g, fx + 1, fy - 12, 6, 4, "#e04a3a");
    rect(g, fx + 1, fy - 10, 3, 2, "#fff6dc");
  }
  const e = EVENTS[ev],
    step = [1, 2, 4, 5, 10, 20, 25].find((n) => SPAN / n <= 9) || 50;
  for (let d = Math.ceil(e.min / step) * step; d < SPAN; d += step) {
    const [x,y] = sector.point(d, -sector.halfAngle);
    distanceArc(g, d, "rgba(244,244,232,0.5)");
    rect(g, x - 7, y - 11, 15, 8, "#f4efe2");
    text(g, String(d), x, y - 10, { color: "#3a5a3a", outline: null, align: "center" });
  }
  // Circle, cage or runway, drawn at the same double scale as the people who use them: a ring
  // about as wide as the thrower is tall, and a cage that stands well above their head.
  if (ev === "jav") {
    // A straight runway along the sector's centre line, ending at the curved throwing arc.
    const cy = (x) => O.y + (O.x - x) * 0.1;
    poly(g, [[0, cy(0) - RUNWAY], [O.x, O.y - RUNWAY], [O.x, O.y + RUNWAY], [0, cy(0) + RUNWAY]], venue.track);
    line(g, 0, cy(0) - RUNWAY, O.x, O.y - RUNWAY, "#f4e8d0");
    line(g, 0, cy(0) + RUNWAY, O.x, O.y + RUNWAY, "#f4e8d0");
    for (let k = -RUNWAY - 2; k <= RUNWAY + 2; k++) {
      const t = k / (RUNWAY + 2);
      rect(g, O.x + Math.round((1 - t * t) * 4), O.y + k, 2, 1, "#f8f8f0");
    }
  } else {
    if (ev !== "shot") cage(g, "back");
    ellipse(g, O.x, O.y + 3, 30, 11, "#5a6a5a");
    ellipse(g, O.x, O.y, 28, 10, "#e8e4d0");
    ellipse(g, O.x, O.y, 24, 8, "#a8a898");
    for (let i = 0; i < 18; i++) px(g, O.x - 20 + hash(i) * 40, O.y - 5 + hash(i + 9) * 10, "#9a9a8a");
    if (ev === "shot") {
      // The stop board on the front of the circle.
      rect(g, O.x + 24, O.y - 6, 5, 12, "#f4efe2");
      rect(g, O.x + 24, O.y + 6, 5, 1, "#c8c0a8");
    }
  }
  return c;
}

function drawCrowd(g, s, m, now, cheer, venue) {
  const density = venue.crowd;
  const skins = ["#f0c6a0", "#e2b08a", "#c98f66", "#a06a48", "#7a4e36"];
  seatRows(venue).forEach(([y, x0, x1, fill], r) => {
    const cols = Math.ceil((x1 - x0) / 5);
    for (let col = 0; col < cols; col++) {
      if (hash(col * 13 + r * 7 + 1) > density * fill) continue;
      const x = x0 + col * 5 + (r % 2) * 2,
        home = x < W * (m.home ? 0.7 : 0.4),
        jump = cheer && (home || cheer === "all") && hash(col + r * 99 + Math.floor(now / 160)) > 0.45 ? 2 : 0;
      if (venue.grand >= 3 && y < 34 && x > W / 2 - 40 && x < W / 2 + 40) continue;
      const shirt = hash(col + r * 31) < 0.6 ? (home ? (hash(col * r) < 0.5 ? s.colors.primary : s.colors.secondary) : m.color) : ["#f4efe2", "#e07a5a", "#5a8ad0", "#f0c060"][Math.floor(hash(col + r) * 4)];
      rect(g, x, y - 3 + 2 - jump, 3, 3, shirt);
      rect(g, x, y - 3 - jump, 3, 2, skins[Math.floor(hash(col * 7 + r) * skins.length)]);
      if (jump && hash(col * 3 + r) > 0.7) rect(g, x - 1, y - 5 - jump, 1, 2, skins[1]);
      // Camera flashes in the big venues at night.
      if (venue.grand >= 3 && venue.time === "night" && hash(col * 17 + r + Math.floor(now / 90)) > 0.997) rect(g, x, y - 4, 2, 2, "#ffffff");
    }
  });
}
function flag(g, x, y, color, label, below = false) {
  rect(g, x, y - 12, 1, 12, "#f4f4f0");
  rect(g, x + 1, y - 12, 6, 4, color);
  rect(g, x + 1, y - 12, 6, 1, shade(color, 0.3));
  if (label) text(g, label, x + 1, below ? y + 3 : y - 21, { color: below ? shade(color, 0.55) : "#fff6dc", align: "center" });
}
function cutin(g, a, colors, name, skill, t, sideColor, y = 100) {
  const slide = Math.min(1, t * 5),
    out = t > 0.85 ? (t - 0.85) / 0.15 : 0;
  g.globalAlpha = 1 - out;
  rect(g, 0, y, W, 56, "rgba(18,22,30,0.88)");
  rect(g, 0, y, W, 2, sideColor);
  rect(g, 0, y + 54, W, 2, sideColor);
  for (let i = 0; i < 14; i++) {
    const lx = ((i * 53 + t * 900) % (W + 60)) - 30;
    line(g, lx, y + 8 + ((i * 17) % 40), lx + 26, y + 8 + ((i * 17) % 40), "rgba(255,255,255,0.18)");
  }
  const img = sprite(athleteLook(a, colors, { pose: "cheer", frame: 0, face: "happy" }));
  const px0 = -60 + slide * 90;
  g.drawImage(img, OX - 9, OY - 25, 18, 18, Math.round(px0), y + 2, 54, 54);
  const tx = W - (W - 130) * slide;
  text(g, "✦ " + skill.toUpperCase() + " ✦", tx + 4, y + 14, { color: "#f2c94c", scale: 2 });
  text(g, name.toUpperCase(), tx + 6, y + 36, { color: "#fff6dc" });
  g.globalAlpha = 1;
}

// The big screen at national and world venues shows the score.
function drawScreen(g, s, m, venue, now) {
  if (venue.grand < 3) return;
  const sx = W / 2 - 34;
  text(g, (s.clubName.slice(0, 10) + "  " + m.score).toUpperCase(), sx + 4, 9, { color: "#fff6dc", outline: null });
  text(g, (m.name.slice(0, 10) + "  " + m.against).toUpperCase(), sx + 4, 18, { color: shade(m.color, 0.5), outline: null });
  if (Math.floor(now / 700) % 2) text(g, "LIVE", sx + 4, 25, { color: "#e04a3a", outline: null });
}
// A windsock beside the sector shows the meet's wind.
function windsock(g, m, now) {
  const x = W - 34, y = 150, wind = m.wind || "calm", flap = Math.sin(now / 160) * (wind === "calm" ? 0.3 : 1);
  rect(g, x, y - 26, 1, 26, "#d8d8d0");
  const dir = wind === "headwind" ? -1 : 1, droop = wind === "calm" ? 7 : wind === "crosswind" ? 3 : 1;
  for (let k = 0; k < 4; k++) rect(g, x + dir * (1 + k * 3) - (dir < 0 ? 2 : 0), y - 26 + Math.round((k * droop) / 3 + flap * k * 0.4), 3, 3, k % 2 ? "#f4f4f0" : "#e8703a");
  text(g, wind.toUpperCase(), x, y + 3, { color: "#fff6dc", align: "center" });
}
// Rain, snow and heat shimmer over the meet, and floodlight beams at night.
function weatherFx(g, venue, now, reduced) {
  const t = now / 1000;
  if (venue.time === "night" && venue.lights) {
    g.fillStyle = "rgba(255,244,200,0.05)";
    for (const x of venue.grand >= 3 ? [W * 0.15, W * 0.5, W * 0.85] : [26, W - 22]) {
      g.beginPath();
      g.moveTo(x, 8);
      g.lineTo(x - 70, H);
      g.lineTo(x + 70, H);
      g.fill();
    }
  }
  if (reduced) return;
  if (venue.weather === "rain") {
    g.fillStyle = "rgba(200,220,245,0.55)";
    for (let i = 0; i < W * 0.5; i++) {
      const fall = (t * 300 + hash(i) * 900) % (H + 20);
      rect(g, ((hash(i + 7) * W - fall * 0.25 + W) % W) | 0, (fall - 10) | 0, 1, 5, "rgba(200,220,245,0.55)");
    }
  } else if (venue.weather === "snow") {
    for (let i = 0; i < W * 0.3; i++) {
      const fall = (t * (16 + hash(i) * 10) + hash(i + 1) * 500) % (H + 10);
      rect(g, ((hash(i + 4) * W + Math.sin(t * 1.3 + i) * 4 + W) % W) | 0, (fall - 5) | 0, hash(i + 6) > 0.8 ? 2 : 1, hash(i + 6) > 0.8 ? 2 : 1, "#ffffff");
    }
  } else if (venue.weather === "heat") {
    for (let i = 0; i < 5; i++) rect(g, 0, ((t * 14 + (i * H) / 5) % H) | 0, W, 1, "rgba(255,240,200,0.08)");
  }
}
export function createStadium(cv) {
  const off = canvas(W, H),
    g = off.getContext("2d"),
    out = cv.getContext("2d");
  let base = null,
    key = "";
  const fireworks = [];
  function draw(s, now, view = {}) {
    const m = s.match;
    if (!m) return;
    const dpr = window.devicePixelRatio || 1,
      cw = Math.max(1, Math.round(cv.clientWidth * dpr)),
      ch = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== cw || cv.height !== ch) (cv.width = cw), (cv.height = ch);
    const insetTop = (view.insetTop || 0) * dpr,
      insetBottom = (view.insetBottom || 0) * dpr;
    const camera = meetCamera(cw, ch, {insetTop, insetBottom, dpr});
    const {scale} = camera;
    W = camera.width;
    if (off.width !== W) off.width = W;
    const venue = venueOf(s, m);
    const beat = view.beat,
      bi = beat?.eventIndex ?? m.eventIndex,
      ev = EVENT_IDS[bi],
      e = EVENTS[ev];
    SPAN = spanOf(s, m, bi, ev);
    sector = throwingSector(ev, W, SPAN);
    const ppm = ppmOf();
    const LH = camera.height,
      top = Math.round(camera.top);
    const overlayTop = Math.max(0, Math.ceil(insetTop / scale - top));
    if (off.height !== LH) off.height = LH;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = skyFor(venue)[0];
    g.fillRect(0, 0, W, top + 1);
    g.fillStyle = "#6eb24c";
    g.fillRect(0, top + H - 1, W, LH - H - top + 1);
    const el = view.elapsed ?? 99999;
    const hasCut = hasCutIn(beat);
    const tt = beat?.type === "throw" ? el - throwOffset(beat) : el;
    const landed = !(beat?.type === "throw") || tt >= T.land;
    // Big moments land with a jolt: a short, decaying shake of the whole scene.
    const big = beat?.type === "throw" && beat.mark != null && (beat.worldRecord || (beat.newPb && beat.previousPb > 0) || beat.tookLead || (beat.side === "home" && beat.scoringSwing > 0)),
      sinceLand = tt - T.land,
      jolt = big && !view.reduced && sinceLand >= 0 && sinceLand < 280 ? (1 - sinceLand / 280) * (beat.worldRecord ? 4 : 2) : 0;
    g.translate(Math.round(Math.sin(sinceLand * 0.9) * jolt), top + Math.round(Math.cos(sinceLand * 1.3) * jolt));
    const k = ev + s.league + s.colors.primary + JSON.stringify(venue) + W + SPAN;
    if (k !== key) {
      base = stadiumBase(s, ev, venue);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    const reacting = beat?.type === "throw" && landed && el < beatDuration(beat) && beat.mark != null && beat.side === "home" && (beat.newPb || beat.scoringSwing > 0);
    const cheer = reacting || (beat?.type === "eventEnd" && beat.h > beat.a) || (beat?.type === "complete" && beat.win) ? "home" : beat?.type === "meetStart" ? "all" : null;
    drawCrowd(g, s, m, now, cheer, venue);
    // Flashbulbs pop in the stands after a big throw.
    if (big && !view.reduced && sinceLand >= 0 && sinceLand < 1600)
      for (let n = 0; n < 9; n++) {
        const h = hash(n * 31 + Math.floor(now / 90)),
          fx = Math.round(h * W),
          fy = 58 + Math.round(hash(n * 17 + Math.floor(now / 90)) * 32);
        if (h > 0.45) continue;
        rect(g, fx, fy, 2, 2, "#ffffff");
        px(g, fx - 1, fy, "#fff6c8");
        px(g, fx + 2, fy + 1, "#fff6c8");
      }
    drawScreen(g, s, m, venue, now);
    windsock(g, m, now);
    const home = homeAthlete(s, bi),
      rival = rivalAthlete(s, bi),
      rivalColors = { primary: m.color, secondary: "#f4efe2" };
    // Field markers, hiding the mark still in the air: a peg at every entrant's best, a gold
    // flag for the leader, and lines for the thrower's PB, the club record and the target.
    const inAir = beat?.type === "throw" && !landed && beat.eventIndex === bi ? { side: beat.side, eventIndex: bi, attempt: beat.attempt } : null;
    const upSide = beat?.type === "throw" ? beat.side : beat?.type === "decide" ? "home" : m.turnSide || "home",
      upAthlete = upSide === "away" ? rival : home;
    const board = m.fields ? fieldLeaderboard(s, bi, inAir) : [];
    const atX = (mark) => Math.min(W - 6, O.x + mark * ppm);
    board.filter((r) => r.mark != null && !(r.side === upSide && r.id === upAthlete?.id)).forEach((r, n) => {
      const [x,y] = sector.point(r.mark, ((n % 3) - 1) * sector.halfAngle * 0.42),
        c = r.side === "home" ? s.colors.primary : m.color;
      rect(g, x, y - 6, 1, 6, "#f4f4f0");
      rect(g, x - 1, y - 7, 3, 2, c);
      if (r.place) text(g, String(r.place), x, y + 1, { color: r.side === "home" ? "#fff6dc" : shade(c, 0.6), align: "center" });
    });
    const lines = [];
    const leader = board.find((r) => r.place === 1 && r.mark != null);
    if (leader) lines.push({ mark: leader.mark, label: "LEAD " + leader.mark.toFixed(2), color: "#f2c94c" });
    if (upSide === "home" && upAthlete?.pb[ev]) lines.push({ mark: upAthlete.pb[ev], label: "PB " + upAthlete.pb[ev].toFixed(2), color: "#9fe0ff", dash: true });
    if (upSide === "home" && s.records[ev] && s.records[ev].mark !== upAthlete?.pb[ev]) lines.push({ mark: s.records[ev].mark, label: "CLUB REC", color: "#d8b0ff", dash: true });
    if (beat?.target?.mark != null) lines.push({ mark: beat.target.mark, label: "TARGET " + beat.target.mark.toFixed(2), color: "#ffe69a" });
    // The thrower's own best so far, flagged in their colours.
    const own = board.find((r) => r.side === upSide && r.id === upAthlete?.id)?.mark ?? best((upSide === "home" ? m.homeMarks : m.awayMarks)[bi].slice(0, inAir?.side === upSide ? inAir.attempt : undefined));
    if (own != null) lines.push({ mark: own, label: own === leader?.mark ? null : own.toFixed(2), color: "#fff6dc", flag: upSide === "home" ? s.colors.primary : m.color });
    // Stack labels in rows so close marks don't overprint each other.
    const rowsEnd = [];
    for (const l of lines.sort((a, b) => a.mark - b.mark)) {
      if (l.mark > SPAN) continue;
      const x = atX(l.mark);
      if (l.flag) flag(g, x, centreY(x) - 3, l.flag);
      else distanceArc(g, l.mark, l.color, l.dash);
      if (!l.label) continue;
      const half = l.label.length * 2.4 + 2;
      let row = 0;
      while (rowsEnd[row] != null && rowsEnd[row] > x - half) row++;
      rowsEnd[row] = x + half;
      text(g, l.label, x, upperY(x) - 9 - row * 10, { color: l.color, align: "center" });
    }
    // Who is in the circle?
    const throwing = beat?.type === "throw" ? beat.side : beat?.type === "decide" ? "home" : null;
    const active = throwing === "away" ? rival : home,
      activeColors = throwing === "away" ? rivalColors : s.colors,
      waiting = throwing === "away" ? home : rival,
      waitingColors = throwing === "away" ? s.colors : rivalColors;
    // Officials.
    const judgeX = Math.min(W - 20, O.x + (landed && beat?.type === "throw" && beat.mark != null ? beat.mark : (e.min + e.max) / 2) * ppm + 10);
    figure(g, { ...OFFICIAL, pose: "idle", frame: Math.floor(now / 700) % 2 }, judgeX, centreY(judgeX) - 18, 1);
    const foulShown = beat?.type === "throw" && beat.foul && landed;
    // People at the circle are drawn at double size, like a sports sim's close-up; the field
    // judge out in the sector stays small with the distance.
    figure(g, { ...OFFICIAL, pose: foulShown ? "wave" : "idle", frame: 0, flip: true }, O.x + 44, O.y - 20, 2);
    if (foulShown) rect(g, O.x + 30, O.y - 72, 10, 7, "#e04a3a");
    // Team benches along the front: your squad on the left, theirs beside them. Teammates jump
    // up when their side lands a big one.
    const benchOf = (side) => {
      const entries = m.fields?.[bi]?.[side] || [],
        pool = side === "home" ? s.roster : matchClub(s)?.athletes || [],
        busy = throwing === side ? active : null;
      const ids = [...entries.map((e) => e.id), ...pool.map((a) => a.id)];
      return [...new Set(ids)].map((id) => pool.find((a) => a.id === id)).filter((a) => a && a !== busy && !a.injury).slice(0, 3);
    };
    const celebrate = big && sinceLand >= 0 && sinceLand < 1600 ? beat.side : null;
    for (const [side, x0, colors] of [["home", 6, s.colors], ["away", 128, rivalColors]]) {
      const by = H - 10;
      // A plain bench seat on legs, with the team's pennant planted at the end.
      ellipse(g, x0 + 48, by + 6, 50, 3, "rgba(30,50,30,0.25)");
      rect(g, x0, by - 2, 96, 4, "#a07850");
      rect(g, x0, by - 3, 96, 1, "#c09868");
      for (const lx of [x0 + 4, x0 + 46, x0 + 90]) rect(g, lx, by + 2, 2, 5, "#6a5038");
      rect(g, x0 + 98, by - 30, 1, 37, "#e8e0c8");
      poly(g, [[x0 + 99, by - 30], [x0 + 111, by - 26], [x0 + 99, by - 22]], colors.primary);
      benchOf(side).forEach((a, n) => {
        const up = celebrate === side;
        figure(g, { ...athleteLook(a, colors), pose: up ? "cheer" : "sit", frame: up ? Math.floor(now / 180 + n) % 2 : 0 }, x0 + 18 + n * 30, up ? by + 1 : by - 1, 2);
      });
    }
    // The thrower.
    if (active && (throwing || beat?.type === "eventStart" || beat?.type === "meetStart")) {
      // The throw follows the athlete's form: see throw-motion.js.
      const level = formOf(active, ev),
        releaseMs = ev === "jav" || ev === "hammer" ? 100 : 250,
        phaseAt = (t) =>
          t < T.prep ? ["ready", t / T.prep] : t < T.tech ? ["technique", (t - T.prep) / (T.tech - T.prep)] : t < T.tech + releaseMs ? ["release", (t - T.tech) / releaseMs] : ["follow", (t - T.tech - releaseMs) / (T.land - T.tech - releaseMs)],
        motionAt = (t) => throwMotion(ev, level, ...phaseAt(t), { foul: !!beat?.foul });
      let pose = "idle",
        frame = Math.floor(now / 500) % 2,
        flip = false,
        x = O.x,
        y = O.y,
        mo = null;
      if (beat?.type === "throw" && tt >= 0 && tt < T.land) {
        mo = motionAt(tt);
        pose = mo.run ? "carry" : "throw";
        ({ frame, flip } = mo);
        x = O.x + mo.dx;
        y = O.y + mo.dy;
      } else if (beat?.type === "throw" && tt >= T.land) {
        const good = beat.mark != null && (beat.newPb || beat.leading);
        pose = beat.mark == null ? "sad" : good ? "cheer" : "idle";
        frame = Math.floor(now / 220) % 2;
        const end = throwMotion(ev, level, "follow", 1, { foul: !!beat.foul });
        x = O.x + end.dx;
        y = O.y + end.dy;
      } else {
        // Waiting to throw: standing ready where their technique starts.
        mo = throwMotion(ev, level, "ready", 0);
        pose = "throw";
        ({ frame, flip } = mo);
        x = O.x + mo.dx;
        y = O.y + mo.dy;
        mo = { ...mo, ball: ev === "hammer" ? mo.ball : null };
      }
      const look = athleteLook(active, activeColors);
      // The best throwers leave a blur of afterimages through the turns.
      if (mo?.ghost && !view.reduced)
        [[0.07, 0.28], [0.14, 0.14]].forEach(([back, alpha]) => {
          const g2 = motionAt(Math.max(T.prep, tt - back * (T.tech - T.prep)));
          g.globalAlpha = alpha;
          figure(g, { ...look, pose: g2.run ? "carry" : "throw", frame: g2.frame, flip: g2.flip, event: ev }, O.x + g2.dx, O.y + g2.dy, 2);
          g.globalAlpha = 1;
        });
      shadow(g, x, y, 9);
      const ball = mo?.ball && [x + mo.ball.dx, y + mo.ball.dy, mo.ball.behind],
        [gx, gy] = gripOf({ pose, frame, flip, event: ev }),
        chain = () => {
          line(g, x + gx * 2, y + gy * 2, ball[0], ball[1], "#d8d8c8");
          ellipse(g, ball[0], ball[1], 3, 3, "#3a3e46");
          px(g, ball[0] - 1, ball[1] - 1, "#8a8e98");
        };
      if (ball && ball[2]) chain();
      figure(g, { ...look, pose, frame, flip, event: ev, released: mo?.released }, x, y, 2);
      if (ball && !ball[2]) chain();
      // Motion lines as the implement leaves the hand.
      if (beat?.type === "throw" && tt >= T.tech - 60 && tt < T.tech + 220 && !view.reduced) {
        const a = 1 - Math.max(0, tt - T.tech + 60) / 280;
        for (let k = 0; k < 3; k++) line(g, x + 14 + k * 2, y - 50 + k * 9, x + 28 + k * 3, y - 54 + k * 9, `rgba(255,255,255,${(0.75 * a).toFixed(2)})`);
      }
      if (beat?.type === "decide" && Math.floor(now / 400) % 2) text(g, "?", x + 18, y - 76, { color: "#f2c94c", scale: 2 });
      // The thrower reacts once the mark is up: a speech bubble in their own voice.
      if (beat?.type === "throw" && tt >= T.land + 150 && tt < T.land + 1900) speech(g, voiceLine(active, throwSituation(beat), beat.attempt + (beat.athleteId || 0)), x, y - 76);
    }
    // The near side of the cage passes in front of whoever is in the circle.
    if (ev === "discus" || ev === "hammer") cage(g, "front");
    // Projectile.
    if (beat?.type === "throw" && tt >= T.tech && tt < T.land + 600) {
      const f = Math.min(1, (tt - T.tech) / (T.land - T.tech)),
        dist = beat.mark ?? e.min + (e.max - e.min) * 0.45,
        angle = beat.foul ? -sector.halfAngle * 1.2 : (hash(bi * 7 + beat.attempt * 3 + (beat.side === "home" ? 1 : 2)) - 0.5) * sector.halfAngle,
        rel = throwMotion(ev, 0, "release", 0),
        [gx, gy] = gripOf({ pose: "throw", frame: rel.frame, event: ev }),
        // It leaves from the release hand: above the head for the javelin.
        sx = O.x + rel.dx + gx * 2,
        sy = O.y + rel.dy + gy * 2,
        [ex, ey] = sector.point(dist, angle),
        peak = { shot: 34, discus: 60, hammer: 72, jav: 80 }[ev];
      const pos = (q) => [sx + (ex - sx) * q, sy + (ey - sy) * q - Math.sin(q * Math.PI) * peak];
      if (f < 1) {
        const [x, y] = pos(f);
        rect(g, Math.round(O.x + (ex - O.x) * f) - 2, Math.round(O.y + (ey - O.y) * f), 5, 1, "rgba(20,40,20,0.3)");
        for (let k = 1; k < 4; k++) {
          const [tx2, ty2] = pos(Math.max(0, f - k * 0.03));
          px(g, tx2, ty2, `rgba(255,255,255,${0.5 - k * 0.12})`);
        }
        if (ev === "jav") {
          // As long as the one in the hand when it leaves, shrinking as it flies away.
          const [nx, ny] = pos(Math.min(1, f + 0.02)),
            ang = Math.atan2(ny - y, nx - x),
            half = 22 - 13 * f;
          line(g, x - Math.cos(ang) * half, y - Math.sin(ang) * half, x + Math.cos(ang) * half, y + Math.sin(ang) * half, "#efe6c8");
          px(g, x + Math.cos(ang) * half, y + Math.sin(ang) * half, "#5a5a62");
        } else if (ev === "discus") {
          ellipse(g, x, y, 3, 1, "#3a3020");
          ellipse(g, x, y, 2, 1, "#d8c890");
        } else {
          ellipse(g, x, y, 2, 2, "#2a2420");
          px(g, x, y - 1, "#9aa0aa");
          if (ev === "hammer") line(g, x, y, x - 6, y - 4, "#d8d8c8");
        }
      } else {
        // Impact: a ring of turf and dust thrown up around the landing, heavier for the shot and hammer.
        const dt = tt - T.land,
          heavy = ev === "shot" || ev === "hammer" ? 1.4 : 1,
          fade = Math.max(0, 1 - dt / 700);
        if (fade > 0 && !beat.foul) {
          ellipse(g, ex, ey, 3 + dt * 0.012 * heavy, 1 + dt * 0.004, `rgba(225,210,170,${(0.55 * fade).toFixed(2)})`);
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2, r = dt * 0.03 * heavy * (0.6 + hash(k) * 0.6);
            px(g, ex + Math.cos(a) * r, ey - Math.abs(Math.sin(a)) * r * 0.8 + (dt * dt) / 60000, `rgba(${k % 3 ? "200,180,140" : "120,160,80"},${fade.toFixed(2)})`);
          }
        }
        rect(g, ex - 2, ey, 5, 2, beat.foul ? "#e04a3a" : "#8a7a50");
      }
    }
    // Landing callouts.
    if (beat?.type === "throw" && landed) {
      // The distance rolls up to the mark, then pops on the big ones.
      const roll = Math.min(1, Math.max(0, sinceLand) / 420),
        shown = beat.mark == null ? null : beat.mark * (view.reduced ? 1 : 1 - Math.pow(1 - roll, 3)),
        label = shown == null ? "FOUL" : shown.toFixed(2) + " M",
        popped = big && !view.reduced && sinceLand >= 420 && sinceLand < 620;
      const color = beat.mark == null ? "#f06050" : beat.side === "home" ? "#fff6dc" : shade(m.color, 0.5);
      const labelY = Math.max(50, overlayTop + 8);
      text(g, label, W / 2, labelY - (popped ? 4 : 0), { color, scale: popped ? 4 : 3, align: "center" });
      if (beat.worldRecord) text(g, "WORLD RECORD!", W / 2, labelY + 26, { color: (Math.floor(tt / 180) % 2) ? "#f2c94c" : "#fff6dc", scale: 2, align: "center" });
      else if (beat.newPb) text(g, beat.previousPb ? "NEW PB! +" + beat.pbDelta.toFixed(2) : "FIRST MARK!", W / 2, labelY + 26, { color: "#f2c94c", scale: 2, align: "center" });
      else text(g, throwResult(beat).headline.toUpperCase(), W / 2, labelY + 26, { color: "#fff6dc", scale: 2, align: "center" });
    }
    if (hasCut && el >= SETUP_MS && el < SETUP_MS + CUTIN_MS) {
      const a = beat.side === "home" ? home : rival;
      cutin(g, a, beat.side === "home" ? s.colors : rivalColors, beat.name, beat.activations[0] + (beat.activations.length > 1 ? " +" + (beat.activations.length - 1) : ""), (el - SETUP_MS) / CUTIN_MS, beat.side === "home" ? s.colors.secondary : m.color, Math.max(100, overlayTop + 10));
    }
    weatherFx(g, venue, now, view.reduced);
    // Beat banners.
    const banner = (big, sub, color, t) => {
      const slide = Math.min(1, t * 6);
      const y = Math.max(110, overlayTop + 10);
      rect(g, 0, y, W * slide, 40, "rgba(18,22,30,0.85)");
      rect(g, 0, y, W * slide, 2, color);
      rect(g, 0, y + 38, W * slide, 2, color);
      if (slide >= 1) {
        text(g, big, W / 2, y + 6, { color, scale: 2, align: "center" });
        text(g, sub, W / 2, y + 26, { color: "#fff6dc", align: "center" });
      }
    };
    if (beat?.type === "meetStart") banner(venue.name.toUpperCase(), ({ final: "LEAGUE FINAL", duel: "CLUB DUEL", league: "LEAGUE FIXTURE", cup: "INVITATIONAL" }[m.kind] + " · " + s.clubName + " VS " + m.name).toUpperCase(), venue.special ? "#f2c94c" : s.colors.secondary, el / beatDuration(beat));
    if (beat?.type === "eventStart") banner(e.name.toUpperCase(), beat.finals ? "TOP FOUR ADVANCE - MARKS CARRY FORWARD" : "THREE THROWS EACH - PLACES SCORE 5 / 3 / 1", e.color, el / beatDuration(beat));
    if (beat?.type === "eventEnd") {
      const who = s.clubName + " +" + beat.h + " · " + m.name + " +" + beat.a;
      banner(who.toUpperCase(), (beat.home != null ? beat.home.toFixed(2) : "FOUL") + "  VS  " + (beat.away != null ? beat.away.toFixed(2) : "FOUL") + "   ·   " + beat.score + " - " + beat.against, beat.h > beat.a ? "#f2c94c" : beat.a > beat.h ? shade(m.color, 0.4) : "#fff6dc", el / beatDuration(beat));
    }
    if (beat?.type === "decide") {
      rect(g, W / 2 - 90, 40, 180, 30, "rgba(18,22,30,0.85)");
      text(g, beat.clutch ? "CLUTCH MOMENT!" : "YOUR CALL, COACH", W / 2, 45, { color: "#f2c94c", scale: 2, align: "center" });
      text(g, "CHOOSE AN APPROACH", W / 2, 60, { color: "#fff6dc", align: "center" });
    }
    // Fireworks after a win.
    if (m.phase === "complete" && m.score > m.against && !view.reduced) {
      if (fireworks.length < 6 && Math.random() < 0.05) fireworks.push({ x: 60 + Math.random() * (W - 120), y: 20 + Math.random() * 40, t0: now, c: [s.colors.secondary, "#f2c94c", "#ffffff", "#f07a8a"][Math.floor(Math.random() * 4)] });
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i],
          t = (now - f.t0) / 1100;
        if (t > 1) {
          fireworks.splice(i, 1);
          continue;
        }
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          px(g, f.x + Math.cos(a) * t * 24, f.y + Math.sin(a) * t * 24 + t * t * 10, f.c);
        }
      }
      // The squad celebrates on the field.
      const ids = [...new Set(Object.values(m.lineup))];
      ids.forEach((id, n) => {
        const a = s.roster.find((x) => x.id === id);
        if (a) figure(g, { ...athleteLook(a, s.colors), pose: "cheer", frame: Math.floor(now / 250 + n) % 2 }, W / 2 - 90 + n * 60, O.y + (n % 2) * 10, 2);
      });
    } else if (m.phase === "complete") {
      const ids = [...new Set(Object.values(m.lineup))];
      ids.forEach((id, n) => {
        const a = s.roster.find((x) => x.id === id);
        if (a) figure(g, { ...athleteLook(a, s.colors), pose: m.score === m.against ? "idle" : "sad", frame: 0 }, W / 2 - 90 + n * 60, O.y + (n % 2) * 10, 2);
      });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.drawImage(off, 0, 0, W * scale, LH * scale);
  }
  return { draw };
}
