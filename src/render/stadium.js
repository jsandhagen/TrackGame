import { canvas, rect, poly, ellipse, line, shade, hash, px, mix } from "./pixel.js";
import { text } from "./font.js";
import { figure, sprite, shadow, athleteLook, OX, OY } from "./sprites.js";
import { EVENTS, EVENT_IDS, LEAGUES } from "../game-content.js";
import { homeAthlete, rivalAthlete, best } from "../domain/game.js";

// The scene keeps a fixed 270px-tall layout; its width follows the screen.
let W = 480;
export const H = 270;
const TRACK_COLORS = ["#7aa858", "#b07850", "#c46a4e", "#3a6ab0"];
// Home meets use your own stadium; away venues grow with the league.
function venueOf(s, m) {
  if (m.home) return { stands: s.stadium.stands, lights: s.stadium.lights > 0, track: TRACK_COLORS[s.stadium.track], crowd: Math.min(0.95, 0.12 + s.stadium.stands * 0.18 + Math.min(0.3, s.fans / 5000)) };
  const L = s.league;
  return { stands: Math.min(3, L + 1), lights: L >= 2, track: TRACK_COLORS[L >= 3 ? 3 : 2], crowd: LEAGUES[L].crowd };
}
const O = { x: 72, y: 220 };
const centreY = (x) => O.y - (x - O.x) * 0.04;
const upperY = (x) => O.y - (x - O.x) * 0.17;
const lowerY = (x) => O.y + (x - O.x) * 0.09;
const ppmOf = (ev) => (W - O.x - 36) / EVENTS[ev].max;
const OFFICIAL = { look: { skin: "#d8a47e", hair: "#d8d8d0", style: 0 }, shirt: "#f4f4f0", collar: "#2a2a2a", shorts: "#2a2a2a" };

// Base milliseconds for each beat at 1× speed.
export const CUTIN_MS = 950;
export function beatDuration(beat) {
  if (!beat) return 0;
  if (beat.type === "throw") return 2700 + (beat.activations?.length ? CUTIN_MS : 0);
  return { meetStart: 1900, eventStart: 1700, eventEnd: 1900, complete: 0, decide: 0 }[beat.type] ?? 1000;
}
const T = { prep: 250, tech: 1000, land: 1900 };

function skyFor(league) {
  return [
    ["#8ccbe8", "#e8f4e0"],
    ["#7cbce0", "#e8f0d8"],
    ["#e8a868", "#f8e0b0"],
    ["#5a5a8a", "#e89a70"],
    ["#1a2240", "#3a4a78"],
  ][league];
}
function stadiumBase(s, ev, venue) {
  const c = canvas(W, H),
    g = c.getContext("2d"),
    L = s.league,
    sky = skyFor(L);
  for (let y = 0; y < 40; y++) rect(g, 0, y, W, 1, mix(sky[0], sky[1], y / 40));
  if (L === 4) for (let i = 0; i < 40; i++) px(g, hash(i) * W, hash(i + 50) * 30, "#e8e8ff");
  else ellipse(g, W - 60, 14, 9, 9, L === 3 ? "#f8c080" : "#fff2c0");
  // Stand structure: grass banks, a low stand, or a covered stand with a roof.
  if (venue.stands === 0) {
    for (let r = 0; r < 10; r++) rect(g, 0, 34 + r * 6, W, 6, r % 2 ? "#5a8a48" : "#64944e");
    rect(g, 0, 30, W, 4, "#7aa858");
  } else {
    const tiers = venue.stands === 1 ? 5 : 10,
      top = 94 - tiers * 6;
    for (let r = 0; r < 10 - tiers; r++) rect(g, 0, 34 + r * 6, W, 6, r % 2 ? "#5a8a48" : "#64944e");
    rect(g, 0, top - 2, W, tiers * 6 + 2, "#4a5a5a");
    for (let r = 0; r < tiers; r++) rect(g, 0, top + r * 6, W, 5, r % 2 ? "#5a6a68" : "#64746e");
    for (let x = 10; x < W; x += 80) rect(g, x, top, 3, tiers * 6, "#3a4a4a");
    if (venue.stands >= 2) rect(g, 0, 22, W, 6, "#2e3a3e");
  }
  // Ad boards.
  rect(g, 0, 94, W, 12, "#2a3a34");
  const ads = ["RING & SECTOR", "FIZZ DRINKS", "RADIO 98.4", LEAGUES[L].venue.toUpperCase(), "EVERY MARK MATTERS", "CHANNEL 9"];
  for (let i = 0; i * 80 < W; i++) {
    const a = ads[i % ads.length],
      x = i * 80;
    rect(g, x + 1, 95, 78, 10, i % 2 ? "#b0503a" : s.colors.primary);
    text(g, a.slice(0, 13), x + 40, 97, { color: "#fff6dc", outline: null, align: "center" });
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
    step = e.max > 40 ? 10 : 2;
  for (let d = Math.ceil(e.min / step) * step; d < e.max; d += step) {
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
  // Floodlights from the Regional League up.
  if (venue.lights)
    for (const x of [24, W - 24]) {
      rect(g, x, 4, 3, 90, "#c8d0c4");
      rect(g, x - 8, 2, 19, 7, "#3b534f");
      for (let k = 0; k < 4; k++) rect(g, x - 6 + k * 4, 4, 3, 3, "#fff4cb");
    }
  return c;
}

function drawCrowd(g, s, m, now, cheer, venue) {
  const density = venue.crowd,
    cols = Math.ceil(W / 5),
    firstRow = venue.stands === 0 ? 0 : venue.stands === 1 ? 5 : 0;
  const skins = ["#f0c6a0", "#e2b08a", "#c98f66", "#a06a48", "#7a4e36"];
  for (let r = firstRow; r < 10; r++)
    for (let col = 0; col < cols; col++) {
      if (hash(col * 13 + r * 7 + 1) > density) continue;
      const x = col * 5 + (r % 2) * 2,
        y = 31 + r * 6,
        home = col < cols * (m.home ? 0.7 : 0.4),
        jump = cheer && (home || cheer === "all") && hash(col + r * 99 + Math.floor(now / 160)) > 0.45 ? 2 : 0;
      const shirt = hash(col + r * 31) < 0.6 ? (home ? (hash(col * r) < 0.5 ? s.colors.primary : s.colors.secondary) : m.color) : ["#f4efe2", "#e07a5a", "#5a8ad0", "#f0c060"][Math.floor(hash(col + r) * 4)];
      rect(g, x, y + 2 - jump, 3, 3, shirt);
      rect(g, x, y - jump, 3, 2, skins[Math.floor(hash(col * 7 + r) * skins.length)]);
      if (jump && hash(col * 3 + r) > 0.7) rect(g, x - 1, y - 2 - jump, 1, 2, skins[1]);
    }
}
function flag(g, x, y, color, label, below = false) {
  rect(g, x, y - 12, 1, 12, "#f4f4f0");
  rect(g, x + 1, y - 12, 6, 4, color);
  rect(g, x + 1, y - 12, 6, 1, shade(color, 0.3));
  if (label) text(g, label, x + 1, below ? y + 3 : y - 21, { color: below ? shade(color, 0.55) : "#fff6dc", align: "center" });
}
function cutin(g, a, colors, name, skill, t, sideColor) {
  const slide = Math.min(1, t * 5),
    out = t > 0.85 ? (t - 0.85) / 0.15 : 0,
    y = 100;
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
    // Fit the 270px layout between the HUD and the meet strip; sky fills any space above.
    const insetTop = (view.insetTop || 0) * dpr,
      insetBottom = (view.insetBottom || 0) * dpr,
      scale = Math.max(1, Math.floor((ch - insetTop - insetBottom) / 240));
    W = Math.ceil(cw / scale);
    if (off.width !== W) off.width = W;
    const venue = venueOf(s, m);
    const beat = view.beat,
      bi = beat?.eventIndex ?? m.eventIndex,
      ev = EVENT_IDS[bi],
      e = EVENTS[ev],
      ppm = ppmOf(ev);
    const LH = Math.ceil(ch / scale),
      top = Math.round(LH - H - insetBottom / scale + 26);
    if (off.height !== LH) off.height = LH;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = skyFor(s.league)[0];
    g.fillRect(0, 0, W, top + 1);
    g.fillStyle = "#6aa04e";
    g.fillRect(0, top + H - 1, W, LH - H - top + 1);
    g.translate(0, top);
    const k = ev + s.league + s.colors.primary + JSON.stringify(venue) + W;
    if (k !== key) {
      base = stadiumBase(s, ev, venue);
      key = k;
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0);
    const el = view.elapsed ?? 99999;
    const hasCut = beat?.type === "throw" && beat.activations?.length;
    const tt = hasCut ? el - CUTIN_MS : el; // throw timeline after the cut-in
    const landed = !(beat?.type === "throw") || tt >= T.land;
    const reacting = beat?.type === "throw" && landed && tt < 2700 && beat.mark != null && (beat.side === "home" ? beat.newPb || beat.leading : false);
    const cheer = reacting || (beat?.type === "eventEnd" && beat.h === 3) || (beat?.type === "complete" && beat.win) ? "home" : beat?.type === "meetStart" ? "all" : null;
    drawCrowd(g, s, m, now, cheer, venue);
    const home = homeAthlete(s, bi),
      rival = rivalAthlete(s, bi),
      rivalColors = { primary: m.color, secondary: "#f4efe2" };
    // Best-mark flags, hiding the mark still in the air.
    const hidden = (side) => beat?.type === "throw" && !landed && beat.side === side && beat.eventIndex === bi;
    const marksFor = (side) => {
      const list = (side === "home" ? m.homeMarks : m.awayMarks)[bi];
      return hidden(side) ? list.slice(0, beat.attempt) : list;
    };
    const hb = best(marksFor("home")),
      ab = best(marksFor("away"));
    if (ab != null) flag(g, O.x + ab * ppm, centreY(O.x + ab * ppm) + 5, m.color, ab.toFixed(2), true);
    if (hb != null) flag(g, O.x + hb * ppm, centreY(O.x + hb * ppm) - 3, s.colors.primary, hb.toFixed(2));
    if (home?.pb[ev]) {
      const x = O.x + home.pb[ev] * ppm;
      line(g, x, upperY(x) + 2, x, lowerY(x) - 2, "rgba(242,201,76,0.55)");
      text(g, "PB", x, lowerY(x) + 1, { color: "#f2c94c", align: "center" });
    }
    // Who is in the circle?
    const throwing = beat?.type === "throw" ? beat.side : beat?.type === "decide" ? "home" : null;
    const active = throwing === "away" ? rival : home,
      activeColors = throwing === "away" ? rivalColors : s.colors,
      waiting = throwing === "away" ? home : rival,
      waitingColors = throwing === "away" ? s.colors : rivalColors;
    // Officials.
    const judgeX = Math.min(W - 20, O.x + (beat?.type === "throw" && beat.mark != null ? beat.mark : (e.min + e.max) / 2) * ppm + 10);
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
    if (beat?.type === "throw" && landed && tt < 2700) {
      const label = beat.mark == null ? "FOUL" : beat.mark.toFixed(2) + " M";
      const color = beat.mark == null ? "#f06050" : beat.side === "home" ? "#fff6dc" : shade(m.color, 0.5);
      text(g, label, W / 2, 50, { color, scale: 3, align: "center" });
      if (beat.newPb) text(g, beat.previousPb ? "NEW PB! +" + beat.pbDelta.toFixed(2) : "FIRST MARK!", W / 2, 76, { color: "#f2c94c", scale: 2, align: "center" });
      else text(g, (beat.side === "home" ? "" : m.name.toUpperCase() + " · ") + beat.name.toUpperCase(), W / 2, 76, { color: "#fff6dc", align: "center" });
    }
    if (hasCut && el < CUTIN_MS) {
      const a = beat.side === "home" ? home : rival;
      cutin(g, a, beat.side === "home" ? s.colors : rivalColors, beat.name, beat.activations[0] + (beat.activations.length > 1 ? " +" + (beat.activations.length - 1) : ""), el / CUTIN_MS, beat.side === "home" ? s.colors.secondary : m.color);
    }
    // Beat banners.
    const banner = (big, sub, color, t) => {
      const slide = Math.min(1, t * 6);
      rect(g, 0, 110, W * slide, 40, "rgba(18,22,30,0.85)");
      rect(g, 0, 110, W * slide, 2, color);
      rect(g, 0, 148, W * slide, 2, color);
      if (slide >= 1) {
        text(g, big, W / 2, 116, { color, scale: 2, align: "center" });
        text(g, sub, W / 2, 136, { color: "#fff6dc", align: "center" });
      }
    };
    if (beat?.type === "meetStart") banner(m.kind === "final" ? "LEAGUE FINAL" : "CLUB DUEL", (s.clubName + " VS " + m.name).toUpperCase(), s.colors.secondary, el / beatDuration(beat));
    if (beat?.type === "eventStart") banner(e.name.toUpperCase(), (home?.name + "  VS  " + rival?.name).toUpperCase(), e.color, el / beatDuration(beat));
    if (beat?.type === "eventEnd") {
      const who = beat.h === 3 ? "+3 " + s.clubName : beat.a === 3 ? "+3 " + m.name : beat.h ? "TIED · +1 EACH" : "NO MARKS";
      banner(who.toUpperCase(), (beat.home != null ? beat.home.toFixed(2) : "FOUL") + "  VS  " + (beat.away != null ? beat.away.toFixed(2) : "FOUL") + "   ·   " + beat.score + " - " + beat.against, beat.h === 3 ? "#f2c94c" : beat.a === 3 ? shade(m.color, 0.4) : "#fff6dc", el / beatDuration(beat));
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
