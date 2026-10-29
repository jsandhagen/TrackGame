// How a throw is performed, phase by phase, for each event and form level (see FORMS in
// domain/mastery.js). A novice puts the shot from a standing start; a good thrower glides across
// the circle; the best spin. Discus throwers add turns, hammer throwers add turns after their
// winds, and javelin throwers lengthen the run-up and add crossover steps and a block.
//
// Positions are offsets from the centre of the circle (or the end of the runway) in scene pixels,
// for a thrower drawn at double size. Frames index THROWS in sprites.js: 0 ready · 1 wind (the
// power position) · 2 release · 3 follow-through · 4 and up the event's own technique frames.
// A right-handed thrower turns anticlockwise seen from above: back to the sector (side-on,
// flipped), round to face the camera, side-on to the sector, facing away, and so on.
import { runFrame, frontFootOf, gripOf } from "./sprites.js";

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const BACK = -16; // the back of the circle
const pick = (list, q) => list[Math.min(list.length - 1, Math.floor(q * list.length))];

// Timed contacts, not evenly spaced poses: slow preparation, a quick catch, then leg drive.
// Translate between contacts without restarting an ease on every animation frame.
function track(m, p, keys) {
  let i = 0;
  while (i + 1 < keys.length && p >= keys[i + 1][0]) i++;
  const [t, frame, dx, flip = false, dy = 0] = keys[i],
    next = keys[i + 1] || keys[i],
    q = next[0] === t ? 0 : (p - t) / (next[0] - t);
  return Object.assign(m, { frame, flip, dx: lerp(dx, next[2], q), dy: lerp(dy, next[4] || 0, q) });
}

// phase: "ready" | "technique" | "release" | "follow"; p: progress through that phase, 0–1.
export function throwMotion(ev, level, phase, p, { foul = false } = {}) {
  p = Math.max(0, Math.min(1, p));
  const m = { frame: 0, flip: false, dx: 0, dy: 0, ball: null, released: phase === "release" || phase === "follow", ghost: level >= 3 && phase === "technique" };
  if (ev === "jav") {
    javelin(m, level, phase, p, foul);
    const before = m.dx;
    // Legal deliveries stop with the outlined shoe behind the near edge of the arc (dx = 0).
    // Keep this guard tied to the sprite geometry as new technique/recovery poses are added.
    if (!foul || phase !== "follow") m.dx = Math.min(m.dx, -2 - 2 * frontFootOf({ pose: m.run ? "carry" : "throw", event: ev, frame: m.frame, flip: m.flip }));
    m.dy += Math.round(-m.dx * 0.1) - Math.round(-before * 0.1);
    return m;
  }
  if (ev === "hammer") return hammer(m, level, phase, p, foul);
  if (ev === "discus") return discus(m, level, phase, p, foul);
  return shot(m, level, phase, p, foul);
}

function finish(m, p, foul, at) {
  // Release, then follow through; a foul carries the thrower over the front of the circle.
  m.frame = 3;
  m.dx = foul ? lerp(at, at + 12, p * 1.5) : at;
  return m;
}

// Shot frames: 4 glide crouch and 5 glide drive (both facing away), 6 turning to face us,
// 7 facing away, 8 driving across toward the sector.
function shot(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 4, flip: true, dx: BACK } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: p < 0.28 ? 2 : 11, dx: 6 });
  if (phase === "follow") {
    finish(m, p, foul, 6);
    m.frame = p < 0.16 ? 11 : p < 0.64 && level >= 2 ? 3 : 12;
    return m;
  }
  // Standing delivery uses the same late leg/hip/arm sequence, without crossing the circle.
  if (level === 0) return track(m, p, [[0, 0, 0], [0.3, 1, 0], [0.72, 1, 0], [0.87, 10, 4], [1, 10, 6]]);
  if (level === 3) {
    // Crouser reference: wide sweep, a low flight, right-foot catch with the chest closed,
    // left foot down, then hips and the strike. The shot stays at the neck until release.
    return track(m, p, [[0, 4, BACK, true], [0.12, 6, BACK], [0.34, 8, -12, false, -1],
      [0.48, 7, -4], [0.6, 9, -1, true], [0.7, 1, 0], [0.86, 10, 4], [1, 10, 6]]);
  }
  // Storl reference: drive low, pull the right foot under, keep the shoulders back on landing.
  const drive = level === 2 ? 0.35 : 0.3, catchAt = level === 2 ? 0.54 : 0.6;
  return track(m, p, [[0, 4, BACK, true], [drive, 5, BACK, true], [catchAt, 9, -2, true],
    [catchAt + 0.1, 1, 0], [0.88, 10, 4], [1, 10, 6]]);
}

// Discus frames: 4 and 5 pre-swings back and forward (facing away), 6 turning to face us, 7 the
// sprint across toward the sector, 8 facing away, 9 back to the sector again.
function discus(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 4, flip: true, dx: BACK + 4 } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: p < 0.28 ? 2 : 12, dx: 4 });
  if (phase === "follow") {
    finish(m, p, foul, 4);
    m.frame = p < 0.18 ? 12 : p < 0.7 && level >= 2 ? 3 : 13;
    return m;
  }
  const swing = (q, n, a, b) => (Math.floor(q * n * 2) % 2 ? b : a);
  // Standing throw: swing back and forward, wind up, sling it.
  if (level === 0) {
    if (p < 0.6) return Object.assign(m, { frame: swing(p / 0.6, 1, 0, 1) });
    return track(m, p, [[0.6, 1, 0], [0.85, 11, 2], [1, 11, 4]]);
  }
  // Pre-swings with the back to the sector, then a half turn or a turn and a half into the power
  // position.
  const s = level === 1 ? 0.35 : 0.2, start = BACK + 4;
  if (p < s) return Object.assign(m, { frame: swing(p / s, level === 1 ? 2 : 1, 4, 5), flip: true, dx: start });
  if (level === 1) return track(m, p, [[s, 6, start], [0.64, 10, -2], [0.76, 1, 0], [0.9, 11, 2], [1, 11, 4]]);
  // Perkovic reference: sweep wide into single support, cross low, pivot on the right,
  // plant the left and unwind with the discus still behind the chest.
  const flight = level === 3 ? 0.49 : 0.44;
  return track(m, p, [[s, 6, start], [flight, 7, -10, false, -1], [0.6, 8, -3],
    [0.66, 10, -1], [0.73, 9, 0, true], [0.8, 1, 0], [0.9, 11, 2], [1, 11, 4]]);
}

// Hammer frames: 4 the low point of a wind, 5 a turn side-on (flipped when facing away from the
// sector), 6 a turn facing us, 7 a turn facing away. Through the turns the thrower faces the ball.
const facing = (th) => {
  const k = ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4;
  return [{ frame: 5 }, { frame: 6 }, { frame: 5, flip: true }, { frame: 7 }][k];
};
function hammer(m, level, phase, p, foul) {
  const turns = [2, 3, 4, 4][level],
    winds = 2,
    split = level === 3 ? 0.3 : 0.38;
  if (phase === "ready") return Object.assign(m, { frame: 0, flip: true, dx: BACK + 2, ball: orbit(Math.PI, 20, 0) });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 4 });
  if (phase === "follow") {
    finish(m, p, foul, 4);
    // Keep the original turning footwork after release, then plant and recover. See the Sedykh
    // photosequence in docs/THROW_TECHNIQUE.md: foot contacts and hip rotation drive the turn.
    if (level >= 2 && !foul && p >= 0.16 && p < 0.6)
      return Object.assign(m, facing(Math.PI / 2 - ((p - 0.16) / 0.44) * Math.PI * 1.5));
    m.frame = p < 0.16 ? 8 : p < 0.8 ? 9 : 3;
    return m;
  }
  if (p < split) {
    // Winds, back to the sector: the ball circles the head, low in front and high behind.
    const th = Math.PI - Math.PI * 2 * winds * (p / split);
    const frame = pick([1, 15, 4, 14], ((th / (Math.PI * 2)) % 1 + 1) % 1);
    return Object.assign(m, { frame, flip: true, dx: BACK + 2, ball: orbit(th, 22, 0) });
  }
  // Turns: spinning across the circle, faster each turn, the ball swinging wide, to let go as it
  // rises on the sector side.
  const q = (p - split) / (1 - split),
    rot = (turns - 0.5) * (0.55 * q + 0.45 * q * q),
    th = Math.PI - Math.PI * 2 * rot,
    k = ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4,
    f = [{ frame: 12 }, { frame: 10 }, { frame: 12, flip: true }, { frame: 11 }][k];
  // Hips sink and rise in the poses; the planted foot stays on the ground rather than bobbing.
  return Object.assign(m, q >= 0.96 ? { frame: 13 } : f, { dx: lerp(BACK + 2, 4, q), ball: orbit(th, 30, q) });
}
// The hammer head: a horizontal swing (th = 0 toward the sector, π/2 toward the camera) on a
// tilted plane, low on the far side of the circle from the sector and high on the sector side,
// with depth so the ball passes behind the thrower.
function orbit(th, r, flatten) {
  return { dx: Math.cos(th) * r, dy: -28 - Math.cos(th) * (12 - flatten * 4) + Math.sin(th) * 4, behind: Math.sin(th) < 0 };
}

// Javelin frames: 4 and 5 the crossover steps, 6 the block, 7 the delivery over the top,
// 8 the arm sweeping down and 9 the reverse that catches the run-up. The run-up uses "carry".
function javelin(m, level, phase, p, foul) {
  const slope = (dx) => Math.round(-dx * 0.1);
  if (phase === "ready") return Object.assign(m, { frame: 0, dx: level ? 20 - 96 : -70, dy: slope(level ? 20 - 96 : -70) });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: -20, dy: slope(-20) });
  if (phase === "follow") {
    const r = finish(m, p, foul, -20);
    r.frame = p < 0.22 ? 8 : p < 0.55 ? 9 : 3;
    r.dx = foul ? lerp(-20, 4, p * 1.5) : lerp(-20, -16, ease(Math.min(1, p / 0.55)));
    r.dy = slope(r.dx);
    return r;
  }
  // The run, its stride locked to the ground at double size.
  const run = (from, to, q) => {
    const dx = lerp(from, to, q);
    return Object.assign(m, { frame: runFrame((dx - from) / 2), run: true, dx, dy: slope(dx) });
  };
  if (level === 0) {
    // A short run with the javelin over the shoulder, then draw it back, block and throw.
    if (p < 0.75) return run(-70, -28, p / 0.75);
    const r = track(m, p, [[0.75, 1, -28], [0.85, 6, -24], [0.93, 11, -24], [0.97, 7, -20], [1, 7, -20]]);
    r.dy = slope(r.dx);
    return r;
  }
  // Full run-up from the end of the runway, withdrawal into crossover steps, then the block.
  const [runEnd, crossEnd] = level === 1 ? [0.62, 0.84] : [0.52, 0.84],
    start = 20 - 96;
  if (p < runEnd) return run(start, -36, p / runEnd);
  if (p < crossEnd) {
    const q = (p - runEnd) / (crossEnd - runEnd),
      dx = lerp(-36, -26, q),
      steps = level === 1 ? [1, 4, 5] : [1, 4, 5, 4, 10, 5],
      frame = pick(steps, q);
    return Object.assign(m, { frame, dx, dy: slope(dx) });
  }
  // Chopra reference: the impulse stride precedes a firm left block; hips then elbow lead.
  // More advanced approaches show the long impulse stride, rather than simply more running.
  const r = track(m, p, [[crossEnd, 6, -26], [0.91, 11, -24], [0.97, 7, -20], [1, 7, -20]]);
  r.dy = slope(r.dx);
  return r;
}

// Launch from the implement itself. For hammer this is the head at the end of the wire,
// not the hands; every form must join its own delivery to the flight without a visible jump.
export function throwReleasePoint(ev, level) {
  if (ev === "hammer") {
    const m = throwMotion(ev, level, "technique", 1);
    return [m.dx + m.ball.dx, m.dy + m.ball.dy];
  }
  const m = throwMotion(ev, level, "release", 0),
    [x, y] = gripOf({ pose: "throw", event: ev, frame: m.frame, flip: m.flip });
  return [m.dx + x * 2, m.dy + y * 2];
}
