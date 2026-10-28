import { canvas, rect, poly, ellipse, line, shade, hash, px, mix } from "./pixel.js";
import { text, fit } from "./font.js";
import { figure, sprite, shadow, athleteLook, OX, OY } from "./sprites.js";
import { EVENTS, EVENT_IDS, LEAGUES, trackColorOf, styleOf } from "../game-content.js";
import { homeAthlete, rivalAthlete, best, meetVenue, fieldLeaderboard, worldRecord } from "../domain/game.js";
import { beatDuration, CUTIN_MS, SETUP_MS, LAND_MS, hasCutIn, throwOffset, throwResult } from "./meet-presentation.js";
export { beatDuration, CUTIN_MS } from "./meet-presentation.js";

// The scene keeps a fixed 270px-tall layout; its width follows the screen.
let W = 480;
export const H = 270;
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
const O = { x: 72, y: 220 };
const centreY = (x) => O.y - (x - O.x) * 0.04;
const sectorSlope = () => Math.min(0.17, 102 / Math.max(1, W - O.x));
const upperY = (x) => O.y - (x - O.x) * sectorSlope();
const lowerY = (x) => O.y + (x - O.x) * Math.min(0.09, 38 / Math.max(1, W - O.x));
// The sector reaches just past the world record, or past the club's own record once it goes further.
let SPAN = 100;
const spanOf = (s, ev) => Math.max(EVENTS[ev].record * 1.06, worldRecord(s, ev) * 1.08);
const ppmOf = () => (W - O.x - 36) / SPAN;
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
  rect(g, 0, 106, W, H - 106, "#6aa04e");
  for (let x = 0; x < W; x += 32) rect(g, x, 106, 16, H - 106, "#76ac58");
  // Sector.
  poly(g, [[O.x, O.y], [W, upperY(W)], [W, lowerY(W)]], "#7cb45c");
  line(g, O.x, O.y, W, upperY(W), "#f4f4e8");
  line(g, O.x, O.y, W, lowerY(W), "#f4f4e8");
  const e = EVENTS[ev],
    ppm = ppmOf(ev),
    step = SPAN > 140 ? 20 : e.max > 40 ? 10 : SPAN > 30 ? 4 : 2;
  for (let d = Math.ceil(e.min / step) * step; d < SPAN; d += step) {
    const x = O.x + d * ppm;
    line(g, x, upperY(x) + 1, x, lowerY(x) - 1, "rgba(244,244,232,0.45)");
    rect(g, x - 7, upperY(x) - 10, 15, 8, "#f4efe2");
    text(g, String(d), x, upperY(x) - 9, { color: "#3a5a3a", outline: null, align: "center" });
  }
  // Circle, cage or runway.
  if (ev === "jav") {
    poly(g, [[0, O.y - 6], [O.x, O.y - 5], [O.x, O.y + 6], [0, O.y + 8]], venue.track);
    line(g, 0, O.y - 6, O.x, O.y - 5, "#f4e8d0");
    line(g, 0, O.y + 8, O.x, O.y + 6, "#f4e8d0");
    for (let i = 0; i < 6; i++) rect(g, O.x - 1, O.y - 5 + i * 2, 2, 1, "#f4f4e8");
  } else {
    ellipse(g, O.x, O.y + 2, 15, 6, "#5a6a5a");
    ellipse(g, O.x, O.y, 14, 5, "#e8e4d0");
    ellipse(g, O.x, O.y, 12, 4, "#a8a898");
    if (ev === "shot") rect(g, O.x + 12, O.y - 3, 3, 6, "#f4efe2");
    if (ev !== "shot") {
      for (let i = 0; i < 7; i++) {
        const x = O.x - 22 + i * 6;
        rect(g, x, O.y - 52, 1, 50, "#4a5a52");
      }
      for (let y = O.y - 50; y < O.y - 4; y += 4) rect(g, O.x - 22, y, 37, 1, "rgba(80,100,90,0.45)");
      rect(g, O.x - 22, O.y - 53, 38, 2, "#3a4a42");
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
    // Fit the venue in normal viewports. On short screens, crop the upper stands
    // instead of shrinking the athletes below a readable size.
    const insetTop = (view.insetTop || 0) * dpr,
      insetBottom = (view.insetBottom || 0) * dpr,
      scale = Math.max(0.25, Math.min(cw / (cw < ch ? 240 : 480), Math.max((ch - insetTop - insetBottom) / H, dpr * 0.75)));
    W = Math.ceil(cw / scale);
    if (off.width !== W) off.width = W;
    const venue = venueOf(s, m);
    const beat = view.beat,
      bi = beat?.eventIndex ?? m.eventIndex,
      ev = EVENT_IDS[bi],
      e = EVENTS[ev],
      ppm = ((SPAN = spanOf(s, ev)), ppmOf(ev));
    const LH = Math.ceil(ch / scale),
      top = Math.round(LH - H - insetBottom / scale);
    const overlayTop = Math.max(0, Math.ceil(insetTop / scale - top));
    if (off.height !== LH) off.height = LH;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = skyFor(venue)[0];
    g.fillRect(0, 0, W, top + 1);
    g.fillStyle = "#6aa04e";
    g.fillRect(0, top + H - 1, W, LH - H - top + 1);
    g.translate(0, top);
    const k = ev + s.league + s.colors.primary + JSON.stringify(venue) + W + SPAN;
    if (k !== key) {
      base = stadiumBase(s, ev, venue);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    const el = view.elapsed ?? 99999;
    const hasCut = hasCutIn(beat);
    const tt = beat?.type === "throw" ? el - throwOffset(beat) : el;
    const landed = !(beat?.type === "throw") || tt >= T.land;
    const reacting = beat?.type === "throw" && landed && el < beatDuration(beat) && beat.mark != null && beat.side === "home" && (beat.newPb || beat.scoringSwing > 0);
    const cheer = reacting || (beat?.type === "eventEnd" && beat.h > beat.a) || (beat?.type === "complete" && beat.win) ? "home" : beat?.type === "meetStart" ? "all" : null;
    drawCrowd(g, s, m, now, cheer, venue);
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
      const x = atX(r.mark),
        y = centreY(x) + ((n % 3) - 1) * 6 + 4,
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
    if (own != null) lines.push({ mark: own, label: own.toFixed(2), color: "#fff6dc", flag: upSide === "home" ? s.colors.primary : m.color });
    // Stack labels in rows so close marks don't overprint each other.
    const rowsEnd = [];
    for (const l of lines.sort((a, b) => a.mark - b.mark)) {
      const x = atX(l.mark);
      if (l.flag) flag(g, x, centreY(x) - 3, l.flag);
      else for (let y = upperY(x) + 2; y < lowerY(x) - 2; y += l.dash ? 4 : 1) rect(g, x, y, 1, l.dash ? 2 : 1, l.color);
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
    figure(g, { ...OFFICIAL, pose: foulShown ? "wave" : "idle", frame: 0, flip: true }, O.x + 34, O.y - 22, 1);
    if (foulShown) rect(g, O.x + 26, O.y - 48, 6, 4, "#e04a3a");
    // Waiting athlete on the bench.
    if (waiting && throwing) {
      rect(g, 6, 176, 40, 3, "#a07850");
      figure(g, { ...athleteLook(waiting, waitingColors), pose: "idle", frame: Math.floor(now / 600) % 2 }, 26, 188, 2);
    }
    // The thrower.
    if (active && (throwing || beat?.type === "eventStart" || beat?.type === "meetStart")) {
      let pose = "idle",
        frame = Math.floor(now / 500) % 2,
        flip = false,
        x = O.x,
        y = O.y,
        hammerBall = null;
      if (beat?.type === "throw" && tt >= 0) {
        const f = Math.min(1, Math.max(0, (tt - T.prep) / (T.tech - T.prep)));
        if (tt < T.prep) (pose = "throw"), (frame = 0);
        else if (tt < T.tech) {
          pose = "throw";
          if (ev === "jav") {
            if (f < 0.7) (pose = "carry"), (frame = Math.floor(f * 14) % 4), (x = 8 + f / 0.7 * (O.x - 12));
            else (frame = 1), (x = O.x - 4);
          } else if (ev === "discus") {
            frame = f < 0.75 ? 1 : 2;
            flip = f < 0.75 && Math.floor(f * 8) % 2 === 1;
          } else if (ev === "hammer") {
            frame = f < 0.4 ? 0 : 1;
            flip = f > 0.5 && f < 0.9 && Math.floor(f * 10) % 2 === 1;
            const th = Math.PI * 2 * 3 * f * f;
            hammerBall = [O.x + 4 + Math.cos(th) * 22, O.y - 22 + Math.sin(th) * 8];
          } else frame = f < 0.5 ? 0 : 1;
          if (ev === "shot" && f >= 0.5) x = O.x + 3;
        } else if (tt < T.tech + 250) (pose = "throw"), (frame = 2), (x = ev === "jav" ? O.x - 4 : O.x + (ev === "shot" ? 3 : 0));
        else if (tt < T.land) (pose = "throw"), (frame = 3), (x = ev === "jav" ? O.x - 4 : O.x);
        else {
          const good = beat.mark != null && (beat.newPb || beat.leading);
          pose = beat.mark == null ? "sad" : good ? "cheer" : "idle";
          frame = Math.floor(now / 220) % 2;
          x = ev === "jav" ? O.x - 4 : O.x;
        }
      } else if (beat?.type === "throw") pose = "throw";
      if (beat?.type === "decide") (pose = "throw"), (frame = 0);
      shadow(g, x, y, 8);
      if (hammerBall) {
        line(g, x + 4, y - 22, hammerBall[0], hammerBall[1], "#d8d8c8");
        ellipse(g, hammerBall[0], hammerBall[1], 2, 2, "#3a3e46");
      }
      figure(g, { ...athleteLook(active, activeColors), pose, frame, flip, event: ev }, x, y, 2);
      if (beat?.type === "decide" && Math.floor(now / 400) % 2) text(g, "?", x + 14, y - 82, { color: "#f2c94c", scale: 2 });
    }
    // Projectile.
    if (beat?.type === "throw" && tt >= T.tech && tt < T.land + 600) {
      const f = Math.min(1, (tt - T.tech) / (T.land - T.tech)),
        dist = beat.mark ?? e.min + (e.max - e.min) * 0.45,
        lateral = (hash(bi * 7 + beat.attempt * 3 + (beat.side === "home" ? 1 : 2)) - 0.5) * 12,
        sx = (ev === "jav" ? O.x - 4 : O.x) + 14,
        sy = O.y - 44,
        ex = O.x + dist * ppm,
        ey = centreY(ex) + (beat.foul ? -((ex - O.x) * 0.17) - 10 : lateral) + 2,
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
          const [nx, ny] = pos(Math.min(1, f + 0.02)),
            ang = Math.atan2(ny - y, nx - x);
          line(g, x - Math.cos(ang) * 8, y - Math.sin(ang) * 8, x + Math.cos(ang) * 8, y + Math.sin(ang) * 8, "#efe6c8");
          px(g, x + Math.cos(ang) * 8, y + Math.sin(ang) * 8, "#5a5a62");
        } else if (ev === "discus") {
          ellipse(g, x, y, 3, 1, "#3a3020");
          ellipse(g, x, y, 2, 1, "#d8c890");
        } else {
          ellipse(g, x, y, 2, 2, "#2a2420");
          px(g, x, y - 1, "#9aa0aa");
          if (ev === "hammer") line(g, x, y, x - 6, y - 4, "#d8d8c8");
        }
      } else {
        const dt = tt - T.land;
        for (let k = 0; k < 6; k++) px(g, ex + Math.cos(k) * dt * 0.02, ey - (dt * 0.015 * (k % 3)), `rgba(200,180,140,${Math.max(0, 0.8 - dt / 600)})`);
        rect(g, ex - 2, ey, 5, 2, beat.foul ? "#e04a3a" : "#8a7a50");
      }
    }
    // Landing callouts.
    if (beat?.type === "throw" && landed) {
      const label = beat.mark == null ? "FOUL" : beat.mark.toFixed(2) + " M";
      const color = beat.mark == null ? "#f06050" : beat.side === "home" ? "#fff6dc" : shade(m.color, 0.5);
      const labelY = Math.max(50, overlayTop + 8);
      text(g, label, W / 2, labelY, { color, scale: 3, align: "center" });
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
        if (a) figure(g, { ...athleteLook(a, s.colors), pose: "cheer", frame: Math.floor(now / 250 + n) % 2 }, W / 2 - 60 + n * 40, 210 + (n % 2) * 8, 2);
      });
    } else if (m.phase === "complete") {
      const ids = [...new Set(Object.values(m.lineup))];
      ids.forEach((id, n) => {
        const a = s.roster.find((x) => x.id === id);
        if (a) figure(g, { ...athleteLook(a, s.colors), pose: m.score === m.against ? "idle" : "sad", frame: 0 }, W / 2 - 60 + n * 40, 210 + (n % 2) * 8, 2);
      });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.drawImage(off, 0, 0, W * scale, LH * scale);
  }
  return { draw };
}
