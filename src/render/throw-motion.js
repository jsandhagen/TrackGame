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
import { runFrame } from "./sprites.js";

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const BACK = -16; // the back of the circle
const pick = (list, q) => list[Math.min(list.length - 1, Math.floor(q * list.length))];

// phase: "ready" | "technique" | "release" | "follow"; p: progress through that phase, 0–1.
export function throwMotion(ev, level, phase, p, { foul = false } = {}) {
  const m = { frame: 0, flip: false, dx: 0, dy: 0, ball: null, ghost: level >= 3 && phase === "technique" };
  if (ev === "jav") return javelin(m, level, phase, p, foul);
  if (ev === "hammer") return hammer(m, level, phase, p, foul);
  if (ev === "discus") return discus(m, level, phase, p, foul);
  return shot(m, level, phase, p, foul);
}

function finish(m, p, foul, at, hop) {
  // Release, then follow through; a foul carries the thrower over the front of the circle.
  m.frame = 3;
  m.dx = foul ? lerp(at, at + 12, p * 1.5) : at;
  if (hop && !foul) m.dy = -Math.round(Math.sin(Math.min(1, p * 2) * Math.PI) * 3);
  return m;
}

// Shot frames: 4 glide crouch and 5 glide drive (both facing away), 6 turning to face us,
// 7 facing away, 8 driving across toward the sector.
function shot(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 4, flip: true, dx: BACK } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 6 });
  if (phase === "follow") return finish(m, p, foul, 6, level >= 2);
  // Standing put: settle into the power position, then put.
  if (level === 0) return Object.assign(m, p < 0.5 ? { frame: 0 } : { frame: 1, dx: -2 });
  if (level === 3) {
    // Rotational: a turn and a quarter across the circle into the power position.
    if (p < 0.65) {
      const q = p / 0.65,
        [frame, flip] = pick([[6, false], [8, false], [7, false], [8, true]], q);
      return Object.assign(m, { frame, flip, dx: lerp(BACK, 0, ease(q)), dy: frame === 8 ? -1 : 0 });
    }
    return Object.assign(m, { frame: 1, dx: lerp(0, 3, (p - 0.65) / 0.35) });
  }
  // Glide: folded low at the back facing away, drive across, land in the power position.
  const [a, b] = level === 2 ? [0.35, 0.55] : [0.3, 0.6];
  if (p < a) return Object.assign(m, { frame: 4, flip: true, dx: BACK, dy: level === 2 ? Math.round(Math.sin(p * 20)) : 0 });
  if (p < b) return Object.assign(m, { frame: 5, flip: true, dx: lerp(BACK, -2, ease((p - a) / (b - a))) });
  return Object.assign(m, { frame: 1, dx: lerp(-2, 2, (p - b) / (1 - b)) });
}

// Discus frames: 4 and 5 pre-swings back and forward (facing away), 6 turning to face us, 7 the
// sprint across toward the sector, 8 facing away, 9 back to the sector again.
function discus(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 4, flip: true, dx: BACK + 4 } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 4 });
  if (phase === "follow") return finish(m, p, foul, 4, level >= 2);
  const swing = (q, n, a, b) => (Math.floor(q * n * 2) % 2 ? b : a);
  // Standing throw: swing back and forward, wind up, sling it.
  if (level === 0) return Object.assign(m, p < 0.75 ? { frame: swing(p / 0.75, 2, 1, 0) } : { frame: 1 });
  // Pre-swings with the back to the sector, then a half turn or a turn and a half into the power
  // position.
  const [s, e] = level === 1 ? [0.35, 0.8] : [0.2, 0.85],
    start = BACK + 4,
    turn = level === 1 ? [[6, false]] : [[6, false], [7, false], [8, false], [9, true]];
  if (p < s) return Object.assign(m, { frame: swing(p / s, level === 1 ? 2 : 1, 4, 5), flip: true, dx: start });
  if (p < e) {
    const q = (p - s) / (e - s),
      [frame, flip] = pick(turn, level === 3 ? Math.min(0.999, q * q * 1.3) : q);
    return Object.assign(m, { frame, flip, dx: lerp(start, 2, ease(q)), dy: frame === 7 ? -1 : 0 });
  }
  return Object.assign(m, { frame: 1, dx: 2 });
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
    // Good throwers keep turning once after letting go.
    if (level >= 2 && !foul && p < 0.4) return Object.assign(m, facing(Math.PI / 2 - (p / 0.4) * Math.PI * 1.5), { dx: 4 });
    return finish(m, p, foul, 4, false);
  }
  if (p < split) {
    // Winds, back to the sector: the ball circles the head, low in front and high behind.
    const th = Math.PI - Math.PI * 2 * winds * (p / split);
    return Object.assign(m, { frame: Math.cos(th) < -0.2 ? 4 : 1, flip: true, dx: BACK + 2, ball: orbit(th, 22, 0) });
  }
  // Turns: spinning across the circle, faster each turn, the ball swinging wide, to let go as it
  // rises on the sector side.
  const q = (p - split) / (1 - split),
    rot = (turns - 0.5) * (0.55 * q + 0.45 * q * q),
    th = Math.PI - Math.PI * 2 * rot,
    f = facing(th);
  return Object.assign(m, f, { dx: lerp(BACK + 2, 4, q), dy: f.frame === 5 ? 0 : -1, ball: orbit(th, 30, q) });
}
// The hammer head: a horizontal swing (th = 0 toward the sector, π/2 toward the camera) on a
// tilted plane, low on the far side of the circle from the sector and high on the sector side,
// with depth so the ball passes behind the thrower.
function orbit(th, r, flatten) {
  return { dx: Math.cos(th) * r, dy: -28 - Math.cos(th) * (12 - flatten * 4) + Math.sin(th) * 4, behind: Math.sin(th) < 0 };
}

// Javelin frames: 4 and 5 the crossover steps, 6 the block, 7 the delivery over the top. The
// run-up uses the "carry" pose.
function javelin(m, level, phase, p, foul) {
  const slope = (dx) => Math.round(-dx * 0.1);
  if (phase === "ready") return Object.assign(m, { frame: 0, dx: level ? 20 - 96 : -70, dy: slope(level ? 20 - 96 : -70) });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: -6, dy: slope(-6) });
  if (phase === "follow") {
    const r = finish(m, p, foul, -4, false);
    if (!foul && level >= 1) r.dx = lerp(-6, -1, p);
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
    if (p < 0.75) return run(-70, -14, p / 0.75);
    if (p < 0.86) return Object.assign(m, { frame: 1, dx: -12, dy: slope(-12) });
    return Object.assign(m, p < 0.93 ? { frame: 6, dx: -9, dy: slope(-9) } : { frame: 7, dx: -7, dy: slope(-7) });
  }
  // Full run-up from the end of the runway, withdrawal into crossover steps, then the block.
  const [runEnd, crossEnd] = level === 1 ? [0.62, 0.84] : [0.52, 0.84],
    start = 20 - 96;
  if (p < runEnd) return run(start, -36, p / runEnd);
  if (p < crossEnd) {
    const q = (p - runEnd) / (crossEnd - runEnd),
      dx = lerp(-36, -12, q),
      step = Math.floor(q * (level === 1 ? 4 : 6));
    return Object.assign(m, { frame: step === 0 ? 1 : 4 + ((step - 1) % 2), dx, dy: slope(dx) - (step % 2 ? 1 : 0) });
  }
  return Object.assign(m, p < 0.93 ? { frame: 6, dx: -8, dy: slope(-8) } : { frame: 7, dx: -7, dy: slope(-7) });
}
