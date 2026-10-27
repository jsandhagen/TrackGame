import { canvas, rect, ellipse, line, shade } from "./pixel.js";
import { figure, athleteLook, shadow } from "./sprites.js";
import { text } from "./font.js";
import { STAT_SHORT, STAT_COLORS } from "../game-content.js";

// A little training stage, in the spirit of sports-sim training scenes: the athletes jog on,
// the coach blows the whistle, they work through the drill, then each gets a rating stamp
// and their gains float up. Drawn at 240×120 and scaled up crisp.
export const SCENE_W = 240,
  SCENE_H = 120;
// Timeline in ms: jog in → drill → ratings → gains settle.
export const SCENE = { intro: 700, work: 2900, reveal: 3200, end: 4600 };
const FLOOR = 102;
const COACH = { look: { skin: "#f0c6a0", hair: "#5a3a6a", style: 2 }, shirt: "#2f4e7a", collar: "#f2c94c", rank: 2 };
const QUALITY_COLOR = { good: "#8cc152", great: "#7cc8f0", excellent: "#f2c94c" };
const QUALITY_TEXT = { good: "GOOD", great: "GREAT!", excellent: "EXCELLENT!!" };
const IMPLEMENT = { shot: "#6a6e78", discus: "#d8b060", hammer: "#5a5e68", jav: "#e8e0c8" };

const slots = (n) => [[150], [118, 178], [96, 148, 200]][n - 1];
const wave = (t, period) => (t % period) / period;

// ── Backdrops ───────────────────────────────────────────────────────────
function sky(g, top = "#9fd4ee", bottom = "#d8f0f4") {
  for (let y = 0; y < 60; y++) rect(g, 0, y, SCENE_W, 1, y < 30 ? top : bottom);
  ellipse(g, 40, 22, 14, 5, "#ffffff");
  ellipse(g, 52, 19, 10, 5, "#ffffff");
  ellipse(g, 182, 30, 16, 5, "#f4fbff");
}
function grass(g, y = 60) {
  rect(g, 0, y, SCENE_W, SCENE_H - y, "#78b05a");
  for (let x = 0; x < SCENE_W; x += 24) rect(g, x, y, 12, SCENE_H - y, "#70a854");
}
function gym(g, ctx) {
  rect(g, 0, 0, SCENE_W, 74, "#c98a5e");
  for (let y = 4; y < 74; y += 6) for (let x = (y / 6) % 2 ? 0 : 8; x < SCENE_W; x += 16) rect(g, x, y, 14, 1, "#b87650");
  rect(g, 0, 74, SCENE_W, SCENE_H - 74, "#a8794e");
  for (let x = 0; x < SCENE_W; x += 20) rect(g, x, 74, 1, SCENE_H - 74, "#946a42");
  rect(g, 0, 74, SCENE_W, 2, "#7a5434");
  // Club banner and a mirror wall.
  rect(g, 96, 20, 48, 14, ctx.colors.primary);
  rect(g, 96, 34, 48, 2, ctx.colors.secondary);
  text(g, "TRAIN HARD", 120, 24, { color: "#fff6dc", align: "center" });
  rect(g, 160, 30, 64, 34, "#cfe4ec");
  rect(g, 160, 30, 64, 2, "#f4fbff");
  rect(g, 160, 30, 2, 34, "#8aa4b0");
  // Racks: one more for each Strength Room level.
  for (let i = 0; i < Math.min(3, ctx.gymLevel || 1); i++) {
    const x = 14 + i * 26;
    rect(g, x, 40, 2, 34, "#4a5664");
    rect(g, x + 16, 40, 2, 34, "#4a5664");
    rect(g, x - 2, 48, 22, 2, "#9aa4b0");
    for (const p of [x - 4, x + 18]) rect(g, p, 44, 3, 10, "#2a2e36");
  }
}
function track(g, ctx) {
  sky(g);
  rect(g, 0, 52, SCENE_W, 8, "#5a8a4a");
  for (let x = 4; x < SCENE_W; x += 10) rect(g, x, 46 + (x % 3), 6, 6, "#4a7a3e");
  grass(g, 60);
  const surface = ctx.trackColor || "#c0584a";
  rect(g, 0, 78, SCENE_W, 30, surface);
  for (const y of [78, 88, 98, 108]) rect(g, 0, y, SCENE_W, 1, "#fff6e8");
  // Cones mark the acceleration zone.
  for (const x of [40, 120, 200]) {
    rect(g, x, 72, 4, 6, "#f08a3a");
    rect(g, x - 1, 77, 6, 1, "#c86a2a");
  }
}
function field(g, ctx) {
  sky(g);
  rect(g, 0, 50, SCENE_W, 10, "#6a9a52");
  grass(g, 60);
  for (const [i, ev] of ctx.events.entries()) {
    const x = ctx.xs[i];
    if (ev === "jav") {
      rect(g, x - 40, FLOOR - 3, 46, 7, "#c8a878");
      rect(g, x + 6, FLOOR - 4, 2, 9, "#fff6e8");
    } else {
      ellipse(g, x, FLOOR + 1, 12, 4, "#d8d2c4");
      ellipse(g, x, FLOOR + 1, 10, 3, "#a8a294");
      if (ev === "discus" || ev === "hammer") {
        // Throwing cage: posts and netting behind the athlete.
        for (const px of [x - 16, x - 6, x + 6]) rect(g, px, FLOOR - 38, 1, 38, "#4a4e56");
        for (let y = FLOOR - 38; y < FLOOR; y += 4) for (let px = x - 16; px < x + 6; px += 4) rect(g, px, y, 1, 1, "#ffffff55");
      }
    }
  }
}
function studio(g, ctx, t) {
  rect(g, 0, 0, SCENE_W, SCENE_H, "#2a2e3e");
  rect(g, 0, 84, SCENE_W, SCENE_H - 84, "#3a3446");
  for (let x = 0; x < SCENE_W; x += 16) rect(g, x, 84, 1, SCENE_H - 84, "#2e2a38");
  // Big screen replaying a throw on loop.
  rect(g, 150, 16, 80, 50, "#14161e");
  const glow = 0.8 + 0.2 * Math.sin(t / 90);
  rect(g, 153, 19, 74, 44, shade("#4a8ab0", glow - 1));
  rect(g, 153, 50, 74, 13, "#3a7a4a");
  const p = wave(t, 1400);
  figure(g, { ...COACH, look: { skin: "#d8a070", hair: "#2a2028", style: 1 }, shirt: ctx.colors.primary, pose: "throw", event: "shot", frame: Math.min(3, Math.floor(p * 5)) }, 172, 58);
  if (p > 0.55) ellipse(g, 182 + (p - 0.55) * 90, 40 - Math.sin((p - 0.55) * 6) * 12, 2, 2, "#e8e8f0");
  rect(g, 186, 66, 8, 18, "#14161e");
  text(g, "REPLAY", 158, 21, { color: "#f2c94c" });
  // Desk lamp glow on the floor.
  ellipse(g, 120, 100, 70, 10, "#ffffff10");
}
function wall(g, ctx) {
  gym(g, { ...ctx, gymLevel: 1 });
  // Target wall for medicine-ball throws.
  rect(g, 186, 20, 50, 54, "#e8dcc0");
  rect(g, 186, 20, 50, 2, "#fff6e8");
  ellipse(g, 211, 46, 14, 14, "#d0503a");
  ellipse(g, 211, 46, 9, 9, "#fff6dc");
  ellipse(g, 211, 46, 4, 4, "#d0503a");
}
const BACKDROPS = { lifting: gym, acceleration: track, delivery: field, review: studio, medicine: wall };

// ── Athlete actions per drill ───────────────────────────────────────────
// Returns the pose to draw plus any props, given time t since the drill started.
function act(drill, i, t, ev) {
  const off = i * 170;
  switch (drill) {
    case "lifting": {
      const f = Math.floor((t + off) / 430) % 2;
      return { pose: "lift", frame: f, face: f ? undefined : "strain", sweat: f === 0 };
    }
    case "acceleration": {
      const p = wave(t + off * 3, 1500);
      return { pose: "run", frame: Math.floor(t / 80) % 4, dx: -70 + p * 140, dust: true };
    }
    case "delivery":
    case "medicine": {
      const period = 1100,
        p = wave(t + off, period),
        frame = p < 0.3 ? 0 : p < 0.5 ? 1 : p < 0.62 ? 2 : 3;
      return { pose: drill === "medicine" ? "throw" : "throw", event: drill === "medicine" ? "shot" : ev, frame, flight: p > 0.5 ? (p - 0.5) / 0.5 : null, sweat: frame === 1 };
    }
    case "review": {
      const f = Math.floor((t + off) / 900) % 2;
      return { pose: "study", frame: f, idea: wave(t + off, 1800) > 0.7 };
    }
  }
  return { pose: "idle", frame: 0 };
}

function drawImplement(g, drill, ev, x, y, p) {
  if (drill === "medicine") {
    // Ball to the wall and back down.
    const bx = x + 8 + p * (200 - x),
      by = y - 18 - Math.sin(p * Math.PI) * 10;
    ellipse(g, bx, by, 3, 3, "#8a5a3a");
    rect(g, bx - 1, by - 2, 1, 1, "#c08a5a");
    return;
  }
  const bx = x + 8 + p * 70,
    by = y - 20 - Math.sin(p * Math.PI) * 26;
  if (ev === "jav") line(g, bx - 6, by + 2, bx + 6, by - 2, IMPLEMENT.jav);
  else if (ev === "discus") ellipse(g, bx, by, 3, 1, IMPLEMENT.discus);
  else {
    ellipse(g, bx, by, 2, 2, IMPLEMENT[ev] || IMPLEMENT.shot);
    if (ev === "hammer") line(g, bx, by, bx - 5, by + 4, "#c8c8d0");
  }
  if (p > 0.92) ellipse(g, bx + 2, FLOOR - 6, 4, 1, "#e8dcc0aa");
}

function bubble(g, x, y, str, color = "#3a2a24") {
  const w = str.length * 6 + 6;
  rect(g, x - w / 2, y, w, 11, "#fffaf0");
  rect(g, x - w / 2, y + 11, w, 1, "#c8bfa0");
  rect(g, x - 2, y + 11, 3, 3, "#fffaf0");
  text(g, str, x, y + 2, { color, outline: null, align: "center" });
}

// ── Player ──────────────────────────────────────────────────────────────
// opts: { drill, athletes: [{ a, quality, gains, event }], colors, ctx, reduced }
export function playTraining(cv, opts) {
  const g = cv.getContext("2d"),
    off = canvas(SCENE_W, SCENE_H),
    o = off.getContext("2d");
  g.imageSmoothingEnabled = false;
  const n = opts.athletes.length,
    xs = slots(n),
    ctx = { ...opts.ctx, colors: opts.colors, xs, events: opts.athletes.map((r) => r.event) };
  let t0 = performance.now() - (opts.reduced ? SCENE.end : 0),
    raf = 0,
    stopped = false,
    revealed = false;
  const sparks = Array.from({ length: 24 }, (_, k) => ({ a: (k / 24) * Math.PI * 2, v: 0.6 + (k % 5) * 0.25 }));

  function draw(t) {
    o.clearRect(0, 0, SCENE_W, SCENE_H);
    BACKDROPS[opts.drill](o, ctx, t);
    const working = t >= SCENE.intro && t < SCENE.work,
      reveal = t >= SCENE.reveal;
    // Coach on the left: whistle at the start, encouragement mid-drill, verdict at the end.
    const coachX = 30;
    shadow(o, coachX, FLOOR + 1, 6);
    figure(o, { ...COACH, pose: reveal ? "cheer" : "wave", frame: Math.floor(t / 300) % 2, face: "happy" }, coachX, FLOOR);
    if (t > 200 && t < 1100) bubble(o, coachX + 4, FLOOR - 52, "TWEET!");
    else if (t > 1700 && t < 2500) bubble(o, coachX + 4, FLOOR - 52, "PUSH!");
    else if (reveal) bubble(o, coachX + 4, FLOOR - 52, opts.athletes.some((r) => r.quality === "excellent") ? "SUPERB!" : "NICE!");

    opts.athletes.forEach((r, i) => {
      const home = xs[i];
      let x = home,
        pose,
        flip = false;
      if (t < SCENE.intro) {
        // Jog in from the right edge.
        const p = t / SCENE.intro;
        x = SCENE_W + 20 - (SCENE_W + 20 - home) * Math.min(1, p * 1.2);
        pose = { pose: "run", frame: Math.floor(t / 80) % 4 };
        flip = true;
      } else if (!reveal) {
        pose = act(opts.drill, i, t - SCENE.intro, r.event);
        x = home + (pose.dx || 0);
        if (opts.drill === "acceleration" && t >= SCENE.work - 200) x = home;
      } else {
        const happy = r.quality !== "good";
        pose = { pose: happy ? "cheer" : "idle", frame: Math.floor(t / 260) % 2, face: "happy" };
      }
      const look = athleteLook(r.a, opts.colors, { pose: pose.pose, frame: pose.frame, event: pose.event, face: pose.face, flip });
      shadow(o, x, FLOOR + 1, 7);
      figure(o, look, x, FLOOR);
      if (working && pose.sweat) {
        const s = wave(t + i * 97, 500);
        rect(o, x - 6 - s * 6, FLOOR - 34 + s * 10, 1, 2, "#9fe0ff");
        rect(o, x + 8 + s * 5, FLOOR - 36 + s * 9, 1, 2, "#9fe0ff");
      }
      if (working && pose.dust) for (let k = 0; k < 3; k++) rect(o, x - 8 - k * 4, FLOOR - (k % 2), 2, 1, "#e8d8c0");
      if (working && pose.flight != null) drawImplement(o, opts.drill, r.event, home, FLOOR, pose.flight);
      if (working && pose.idea) text(o, "!", x + 6, FLOOR - 44, { color: "#f2c94c" });
      if (reveal) {
        const rt = t - SCENE.reveal - i * 220;
        if (rt < 0) return;
        const color = QUALITY_COLOR[r.quality];
        // Rating stamp drops in, then gains float up one after another.
        const drop = Math.max(0, 8 - rt / 15);
        text(o, QUALITY_TEXT[r.quality], x, FLOOR - 52 - drop, { color, align: "center" });
        if (r.quality === "excellent" && rt < 900)
          for (const s of sparks) {
            const d = (rt / 900) * 22 * s.v;
            rect(o, x + Math.cos(s.a) * d, FLOOR - 26 + Math.sin(s.a) * d, 1, 1, ["#f2c94c", "#fff6dc", "#9fe0ff"][Math.round(s.v * 4) % 3]);
          }
        r.gains.forEach((v, k) => {
          if (v <= 0.05) return;
          const order = r.gains.slice(0, k).filter((u) => u > 0.05).length,
            gt = rt - 250 - order * 180;
          if (gt < 0) return;
          const rise = Math.min(1, gt / 400);
          text(o, "+" + v.toFixed(1) + " " + STAT_SHORT[k], x, FLOOR - 64 - order * 10 + (1 - rise) * 6, { color: STAT_COLORS[k], align: "center" });
        });
      }
    });
    // Session bar across the top while the drill runs.
    if (!reveal) {
      const p = Math.max(0, Math.min(1, (t - SCENE.intro) / (SCENE.work - SCENE.intro)));
      rect(o, 70, 3, 100, 11, "#14261e");
      rect(o, 71, 4, Math.round(98 * p), 9, "#c9862a");
      text(o, "TRAINING", 120, 5, { color: "#fff6dc", align: "center" });
    }
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(off, 0, 0, cv.width, cv.height);
  }
  function frame(now) {
    if (stopped) return;
    // rAF timestamps can trail performance.now() by a frame; never run time backwards.
    const t = Math.max(0, now - t0);
    draw(Math.min(t, SCENE.end + 4000));
    if (t >= SCENE.reveal && !revealed) {
      revealed = true;
      opts.onReveal?.();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return {
    skip() {
      const now = performance.now();
      if (now - t0 < SCENE.reveal) t0 = now - SCENE.reveal;
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}
