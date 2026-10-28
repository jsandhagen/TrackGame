// How a throw is performed, phase by phase, for each event and form level (see FORMS in
// domain/mastery.js). A novice puts the shot from a standing start; a good thrower glides across
// the circle; the best spin. Discus throwers add turns, hammer throwers add turns after their
// winds, and javelin throwers lengthen the run-up and add crossover steps and a block.
//
// Positions are offsets from the centre of the circle (or the end of the runway) in scene pixels,
// for a thrower drawn at double size. Frames index THROWS in sprites.js:
// 0 ready · 1 wind · 2 release · 3 follow-through · 4–7 event-specific technique frames.

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const BACK = -16; // the back of the circle

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

function shot(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 4, flip: true, dx: BACK } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 6 });
  if (phase === "follow") return finish(m, p, foul, 6, level >= 2);
  if (level === 0) return Object.assign(m, p < 0.5 ? { frame: 0 } : { frame: 1, dx: -2 });
  if (level === 3) {
    // Rotational: a turn and a half across the circle, then the power position.
    if (p < 0.65) {
      const step = Math.floor((p / 0.65) * 6);
      return Object.assign(m, { frame: 6 + (step % 2), flip: step % 2 === 1, dx: lerp(BACK, 0, ease(p / 0.65)) });
    }
    return Object.assign(m, { frame: 1, dx: lerp(0, 3, (p - 0.65) / 0.35) });
  }
  // Glide: crouch at the back facing away, drive across low, then turn into the put.
  const [a, b] = level === 2 ? [0.35, 0.55] : [0.3, 0.6];
  if (p < a) return Object.assign(m, { frame: 4, flip: true, dx: BACK, dy: level === 2 ? Math.round(Math.sin(p * 20)) : 0 });
  if (p < b) return Object.assign(m, { frame: 5, flip: true, dx: lerp(BACK, -2, ease((p - a) / (b - a))) });
  return Object.assign(m, { frame: 1, dx: lerp(-2, 2, (p - b) / (1 - b)) });
}

function discus(m, level, phase, p, foul) {
  if (phase === "ready") return Object.assign(m, { frame: 0, dx: level ? BACK + 4 : 0 });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 4 });
  if (phase === "follow") return finish(m, p, foul, 4, level >= 2);
  const swing = (q, n) => (Math.floor(q * n * 2) % 2 ? 4 : 5);
  if (level === 0) return Object.assign(m, p < 0.75 ? { frame: swing(p / 0.75, 2) } : { frame: 1 });
  // Pre-swings, then turns: a half turn, a turn and a half, or a fast turn and a half.
  const [s, e, steps] = level === 1 ? [0.35, 0.8, 3] : [0.2, 0.85, 5];
  const start = level === 1 ? BACK + 6 : BACK + 4;
  if (p < s) return Object.assign(m, { frame: swing(p / s, level === 1 ? 2 : 1), dx: start });
  if (p < e) {
    const q = (p - s) / (e - s),
      step = Math.floor((level === 3 ? q * q * 1.3 : q) * steps);
    return Object.assign(m, { frame: 6 + (step % 2), flip: step % 2 === 1, dx: lerp(start, 2, ease(q)), dy: step % 2 ? -1 : 0 });
  }
  return Object.assign(m, { frame: 1, dx: 2 });
}

function hammer(m, level, phase, p, foul) {
  const turns = [2, 3, 4, 4][level],
    winds = 2,
    split = level === 3 ? 0.3 : 0.38;
  if (phase === "ready") return Object.assign(m, { frame: 4, dx: BACK + 2, ball: orbit(0, 20, 0) });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 4 });
  if (phase === "follow") {
    // Good throwers keep turning once after letting go.
    if (level >= 2 && !foul && p < 0.4) return Object.assign(m, { frame: 5 + (Math.floor(p * 5) % 2), flip: Math.floor(p * 5) % 2 === 1, dx: 4 });
    return finish(m, p, foul, 4, false);
  }
  if (p < split) {
    // Winds: the ball circles round the head, low in front and high behind.
    const th = Math.PI * 2 * winds * (p / split);
    return Object.assign(m, { frame: Math.cos(th) > 0.2 ? 4 : 1, dx: BACK + 2, ball: orbit(th, 22, 0) });
  }
  // Turns: the thrower spins across the circle, faster each turn, the ball swinging wide.
  const q = (p - split) / (1 - split),
    rot = turns * (0.55 * q + 0.45 * q * q),
    half = Math.floor(rot * 2);
  return Object.assign(m, { frame: 5 + (half % 2), flip: half % 2 === 1, dx: lerp(BACK + 2, 4, q), dy: half % 2 ? -1 : 0, ball: orbit(Math.PI * 2 * rot, 30, q) });
}
// The hammer head: horizontal swing, a tilted plane (low in front, high behind) and depth so the
// ball passes behind the thrower on the far side.
function orbit(th, r, flatten) {
  return { dx: Math.cos(th) * r, dy: -28 + Math.cos(th) * (12 - flatten * 4) + Math.sin(th) * 4, behind: Math.sin(th) < 0 };
}

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
  if (level === 0) {
    // A short run with the javelin over the shoulder, then pull it back and throw.
    if (p < 0.75) return Object.assign(m, { frame: Math.floor(p * 16) % 4, run: true, dx: lerp(-70, -14, p / 0.75), dy: slope(lerp(-70, -14, p / 0.75)) });
    return Object.assign(m, { frame: 1, dx: -10, dy: slope(-10) });
  }
  // Full run-up from the end of the runway, crossover steps, then the block.
  const [runEnd, crossEnd] = level === 1 ? [0.65, 0.88] : [0.55, 0.88],
    start = 20 - 96;
  if (p < runEnd) {
    const dx = lerp(start, -36, p / runEnd);
    return Object.assign(m, { frame: Math.floor(p * 22) % 4, run: true, dx, dy: slope(dx) });
  }
  if (p < crossEnd) {
    const q = (p - runEnd) / (crossEnd - runEnd),
      dx = lerp(-36, -12, q),
      step = Math.floor(q * (level === 1 ? 4 : 6));
    return Object.assign(m, { frame: 4 + (step % 2), dx, dy: slope(dx) - (step % 2 ? 1 : 0) });
  }
  return Object.assign(m, { frame: 6, dx: -8, dy: slope(-8) });
}
