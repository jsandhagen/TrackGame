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

// Recovery styles: how a thrower finishes once the implement has gone. Technique decides the
// throw; the finish is the athlete's own. 0 is the event's classic finish, 1 bouncier (an extra
// hop or a longer turn), 2 composed (a blocked finish with no reverse, or a plant).
export const RECOVERY_STYLES = ["Classic", "Bouncy", "Composed"];
const BACKGROUND_STYLE = { dancer: 0, gymnast: 0, clown: 1, showboat: 1, sprinter: 1, chess: 2, poker: 2, marathon: 2 };
export function recoveryStyle(athlete) {
  const own = BACKGROUND_STYLE[athlete?.background];
  return own ?? (Math.abs(Math.round(Number(athlete?.id) || 0)) % 3);
}
// A quick hop on the support foot between progress a and b of the recovery.
const hop = (m, p, a, b, h = 4) => {
  if (p > a && p < b) m.dy -= Math.sin((Math.PI * (p - a)) / (b - a)) * h;
  return m;
};

// phase: "ready" | "technique" | "release" | "follow"; p: progress through that phase, 0–1.
export function throwMotion(ev, level, phase, p, { foul = false, style = 0 } = {}) {
  p = Math.max(0, Math.min(1, p));
  const m = { frame: 0, flip: false, dx: 0, dy: 0, ball: null, released: phase === "release" || phase === "follow", ghost: level >= 3 && phase === "technique" };
  // A foul carries the thrower over the front whatever their style.
  if (foul) style = 0;
  if (ev === "jav") {
    javelin(m, level, phase, p, foul, style);
    const before = m.dx;
    // Legal deliveries stop with the outlined shoe behind the near edge of the arc (dx = 0).
    // Keep this guard tied to the sprite geometry as new technique/recovery poses are added.
    if (!foul || phase !== "follow") m.dx = Math.min(m.dx, -2 - 2 * frontFootOf({ pose: m.run ? "carry" : "throw", event: ev, frame: m.frame, flip: m.flip }));
    m.dy += Math.round(-m.dx * 0.1) - Math.round(-before * 0.1);
    return m;
  }
  if (ev === "hammer") return hammer(m, level, phase, p, foul, style);
  if (ev === "discus") return discus(m, level, phase, p, foul, style);
  return shot(m, level, phase, p, foul, style);
}

function finish(m, p, foul, at) {
  // Release, then follow through; a foul carries the thrower over the front of the circle.
  m.frame = 3;
  m.dx = foul ? lerp(at, at + 12, p * 1.5) : at;
  return m;
}

// Shot frames: 4 glide crouch and 5 glide drive (both facing away), 6 turning to face us,
// 7 facing away, 8 driving across toward the sector, 9 the closed centre catch, 10 leg drive,
// 13 the tall glide start, 14 the rotational stance and 15 its wind.
function shot(m, level, phase, p, foul, style) {
  if (phase === "ready") return Object.assign(m, level ? { frame: level === 3 ? 14 : 13, flip: true, dx: BACK } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: p < 0.28 ? 2 : 11, dx: 6 });
  if (phase === "follow") {
    finish(m, p, foul, 6);
    m.frame = 11;
    if (p < 0.16) return m;
    // Bouncy: a reverse with a hop on the right foot. Composed: no reverse, the finish held tall
    // over the left leg. Classic: gliders reverse; rotational throwers let the turn run on.
    if (style === 1) return hop(Object.assign(m, { frame: p < 0.7 ? 3 : 12 }), p, 0.3, 0.55, 5);
    if (style === 2) return Object.assign(m, { frame: p < 0.6 ? 16 : 12 });
    if (level === 3) return Object.assign(m, p < 0.45 ? { frame: 3 } : p < 0.7 ? { frame: 17 } : { frame: 18, flip: true });
    m.frame = p < 0.64 && level >= 2 ? 3 : 12;
    return m;
  }
  // Standing delivery uses the same late leg/hip/arm sequence, without crossing the circle: sink
  // slowly into the power position, then drive.
  if (level === 0) return track(m, p, [[0, 0, 0], [0.3, 1, 0], [0.74, 1, 0], [0.88, 10, 4], [1, 10, 6]]);
  if (level === 3) {
    // Crouser reference: a slow wind, then ever faster. Pivot on the left with a wide, low sweep
    // of the right leg, a short low flight, the right foot down in the middle with the chest
    // still closed, the left foot down almost at once, then hips and the strike. The shot stays
    // at the neck until release.
    return track(m, p, [[0, 14, BACK, true], [0.1, 15, BACK], [0.32, 14, BACK, true],
      [0.38, 6, BACK + 1], [0.56, 8, -10, false, -3], [0.64, 7, -4], [0.7, 9, -1, true],
      [0.76, 1, 0], [0.87, 10, 4], [1, 10, 6]]);
  }
  // Storl reference: start tall, fold down over the right leg, then kick the left leg low toward
  // the board and pull the right foot under. Land with the shoulders back, and only then drive.
  const fold = level === 2 ? 0.2 : 0.22, drive = level === 2 ? 0.44 : 0.48, catchAt = level === 2 ? 0.56 : 0.62;
  return track(m, p, [[0, 13, BACK, true], [fold, 4, BACK, true], [drive, 5, BACK, true, 0],
    [drive + 0.06, 5, -8, true, -2], [catchAt, 9, -2, true], [catchAt + 0.08, 1, 0], [0.88, 10, 4], [1, 10, 6]]);
}

// Discus frames: 4 and 5 pre-swings back and forward (facing away), 17 the backswing wound right
// round, 18, 6 and 19 the entry on the left foot (weight over, right leg sweeping wide, right knee
// swinging through), 7 the drive across toward the sector, 8 and 10 facing away on the right foot,
// 9 back to the sector again, 1 and 11 the power position opening, 14 the strike. After release,
// 3, 15 and 16 carry the turn round and stop it.
function discus(m, level, phase, p, foul, style) {
  if (phase === "ready") return Object.assign(m, level === 1 ? { frame: 20, dx: -18 } : level ? { frame: 4, flip: true, dx: -20 } : { frame: 0 });
  const reverses = style === 1 || (style === 0 && level >= 2);
  if (phase === "release") return Object.assign(m, { frame: p < 0.28 ? 2 : reverses ? 3 : 12, dx: 4 });
  if (phase === "follow") {
    finish(m, p, foul, 4);
    // Classic: spinners reverse and let the turn run on round to the back of the circle; a standing
    // or half-turn thrower wraps the arm across and settles. Bouncy: a reverse with a hop on the
    // right foot. Composed: no reverse, the arm wrapping across over planted feet.
    if (style === 1) return hop(Object.assign(m, { frame: p < 0.6 ? 3 : 13 }), p, 0.28, 0.52, 5);
    if (reverses) Object.assign(m, p < 0.3 ? { frame: 3 } : p < 0.6 ? { frame: 15 } : { frame: 16, flip: true });
    else m.frame = p < (style === 2 ? 0.4 : 0.3) ? 12 : 13;
    return m;
  }
  // Standing throw: swing back and forward, wind up, sling it.
  if (level === 0) {
    if (p < 0.6) return Object.assign(m, { frame: p < 0.3 ? 0 : 1 });
    return track(m, p, [[0.6, 1, 0], [0.84, 11, 2], [0.93, 14, 3], [1, 14, 4]]);
  }
  // South African / sprint-turn drill: start at the rear facing the sector, right foot behind
  // the left support leg. Step through, drive onto the right foot in the middle, then turn and
  // plant the left before delivery. It omits the full throw's rear-facing wind and left sweep.
  if (level === 1) {
    return track(m, p, [[0, 20, -18], [0.16, 20, -18], [0.28, 21, -16], [0.42, 7, -8, false, -2],
      [0.52, 8, -3], [0.63, 10, -2], [0.73, 9, 0, true], [0.8, 1, 0], [0.88, 11, 2], [0.95, 14, 4], [1, 14, 4]]);
  }
  // Perkovic, Alekna and Stahl reference: forward, then a long backswing wound right round, so
  // the entry starts from the discus's furthest point back. A slow, wide entry on the bent left
  // leg, then a low, quick drive with only a brief flight, a right-foot pivot in the middle, the
  // left foot down straight after and an unwinding in which the hips, then the chest, then the
  // long arm come through. Slow to fast.
  const start = -20, flight = level === 3 ? 0.52 : 0.54;
  return track(m, p, [[0, 5, start, true], [0.1, 17, start], [0.22, 4, start, true],
    [0.28, 18, start], [0.36, 6, start + 2], [flight - 0.07, 19, -14], [flight, 7, -8, false, -2],
    [flight + 0.06, 8, -3], [flight + 0.12, 10, -2], [flight + 0.19, 9, 0, true],
    [0.8, 1, 0], [0.88, 11, 2], [0.95, 14, 4], [1, 14, 4]]);
}

// Hammer frames: 4 the low point of a wind, 5 a turn side-on (flipped when facing away from the
// sector), 6 a turn facing us, 7 a turn facing away. Through the turns the thrower faces the ball:
// 12 sitting in double support, 10 and 16 in single support, 17 landing back in double support.
const facing = (th) => {
  const k = ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4;
  return [{ frame: 5 }, { frame: 6 }, { frame: 5, flip: true }, { frame: 7 }][k];
};
function hammer(m, level, phase, p, foul, style) {
  const turns = [2, 3, 4, 4][level],
    winds = 2,
    split = level === 3 ? 0.3 : 0.38;
  // The head rests on the ground behind the right foot before the first wind lifts it.
  const rest = { dx: 14, dy: -2, behind: true };
  if (phase === "ready") return Object.assign(m, { frame: 0, flip: true, dx: BACK + 2, ball: rest });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: 4 });
  if (phase === "follow") {
    finish(m, p, foul, 4);
    // Keep the original turning footwork after release, then plant and recover. See the Sedykh
    // photosequence in docs/THROW_TECHNIQUE.md: foot contacts and hip rotation drive the turn.
    // Classic: three quarters of a turn more. Bouncy: a turn and a quarter, or for a standing
    // finish a hop back off the front of the circle. Composed: no turn, a plant and sit back.
    const [from, to, spin] = style === 1 ? [0.12, 0.7, 2.5] : [0.16, 0.6, 1.5];
    if (level >= 2 && style !== 2 && !foul && p >= from && p < to)
      return Object.assign(m, facing(Math.PI / 2 - ((p - from) / (to - from)) * Math.PI * spin));
    m.frame = p < (style === 2 ? 0.24 : from) ? 8 : p < 0.8 || style === 2 ? 9 : 3;
    return style === 1 && level < 2 ? hop(m, p, 0.16, 0.4, 3) : m;
  }
  if (p < split) {
    // Winds, back to the sector: the ball circles the head, low in front and high behind.
    const th = Math.PI - Math.PI * 2 * winds * (p / split);
    const frame = pick([1, 15, 4, 14], ((th / (Math.PI * 2)) % 1 + 1) % 1),
      ball = orbit(th, 24, 0), lift = ease(Math.min(1, p / split / 0.2));
    // The first wind swings the head up off the ground behind the thrower and round in front.
    if (lift < 1) {
      for (const key of ["dx", "dy"]) ball[key] = lerp(rest[key], ball[key], lift);
      ball.behind = lift < 0.6;
    }
    return Object.assign(m, { frame: lift < 0.5 ? 0 : frame, flip: true, dx: BACK + 2, ball });
  }
  // Turns: spinning across the circle, faster each turn, the ball swinging wide, to let go as it
  // rises on the sector side. Sedykh and Fajdek reference: each turn is about half double support
  // (hips low, the hammer dropping through its low point at the back of the circle) and half
  // single support on the left foot (hips higher, the hammer over its high point toward the
  // sector), so the frame follows the ball's side of the circle.
  // Let go an eighth of a turn before the high point, as the head rises past about head height.
  const q = (p - split) / (1 - split),
    span = turns - 0.625,
    rot = span * (0.55 * q + 0.45 * q * q),
    th = Math.PI - Math.PI * 2 * rot,
    k = ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4,
    f = [{ frame: 16 }, { frame: 10 }, { frame: 12, flip: true }, { frame: 17 }][k],
    // Most of the travel across the circle happens while the right foot is off the ground.
    stride = (r) => r - Math.sin(Math.PI * 2 * r) * 0.12,
    step = stride(rot) / stride(span);
  // Hips sink and rise in the poses; the planted foot stays on the ground rather than bobbing.
  return Object.assign(m, q >= 0.96 ? { frame: 13 } : f, { dx: lerp(BACK + 2, 4, step), ball: orbit(th, lerp(24, 32, q), q) });
}
// The hammer head: a horizontal swing (th = 0 toward the sector, π/2 toward the camera) on a
// tilted plane, low on the far side of the circle from the sector and high on the sector side,
// with depth so the ball passes behind the thrower. The radius is as long as the cage allows at
// the back of the circle and grows as the thrower crosses it (wire and arms reach about the
// thrower's height). The plane steepens through the turns until the low point skims the ground.
function orbit(th, r, steepen) {
  return { dx: Math.cos(th) * r, dy: -24 - Math.cos(th) * (12 + steepen * 8) + Math.sin(th) * 4, behind: Math.sin(th) < 0 };
}

// Javelin frames: 4 and 5 the crossover steps, 6 the block, 7 the delivery over the top,
// 8 the arm sweeping down and 9 the reverse that catches the run-up. The run-up uses "carry".
function javelin(m, level, phase, p, foul, style) {
  const slope = (dx) => Math.round(-dx * 0.1);
  const start = level ? -80 : -44;
  if (phase === "ready") return Object.assign(m, { frame: level ? 0 : 1, dx: start, dy: slope(start) });
  if (phase === "release") return Object.assign(m, { frame: 2, dx: -20, dy: slope(-20) });
  if (phase === "follow") {
    const r = finish(m, p, foul, -20);
    // Classic: fold over the block, reverse onto the right foot and stand. Bouncy: hop again on
    // the right foot after the reverse. Composed: hold the fold over the block, then rise.
    r.frame = style === 2 ? (p < 0.4 ? 8 : 3) : p < 0.22 ? 8 : p < (style === 1 ? 0.72 : 0.55) ? 9 : 3;
    r.dx = foul ? lerp(-20, 4, p * 1.5) : lerp(-20, style === 2 ? -18 : -16, ease(Math.min(1, p / 0.55)));
    r.dy = slope(r.dx);
    return style === 1 ? hop(r, p, 0.46, 0.7, 4) : r;
  }
  // The run, its stride locked to the ground at double size.
  const run = (from, to, q) => {
    const dx = lerp(from, to, q);
    return Object.assign(m, { frame: runFrame((dx - from) / 2), run: true, dx, dy: slope(dx) });
  };
  if (level === 0) {
    // Three-step teaching progression: already withdrawn, left-right-left into the block.
    // It has a compact crossover, but none of the full approach's overhead-carry running.
    const r = track(m, p, [[0, 1, start], [0.16, 12, -42], [0.34, 4, -36], [0.48, 5, -30],
      [0.67, 6, -26], [0.86, 11, -24], [0.95, 7, -20], [1, 7, -20]]);
    r.dy = slope(r.dx);
    return r;
  }
  // Carry overhead during a cyclic run, then withdraw on a left contact. Crossovers travel
  // down the runway, rather than changing legs almost in place. The right foot lands before
  // the left block; the drawn arm stays behind the advancing hips until the final delivery.
  const runEnd = level === 1 ? 0.38 : 0.3, withdrawAt = level === 1 ? -52 : -60;
  if (p < runEnd) return run(start, withdrawAt, Math.pow(p / runEnd, 1.25));
  // Chopra reference: the impulse stride precedes a firm left block; hips then elbow lead.
  // More advanced approaches show the long impulse stride, rather than simply more running.
  // The block to release is the quickest part of the throw.
  const keys = level === 1
    ? [[runEnd, 12, withdrawAt], [0.48, 4, -46], [0.56, 5, -40], [0.64, 13, -34],
      [0.72, 4, -30], [0.8, 5, -26], [0.85, 6, -26], [0.92, 11, -24], [0.97, 7, -20], [1, 7, -20]]
    : [[runEnd, 12, withdrawAt], [0.4, 4, -52], [0.48, 5, -46], [0.56, 13, -40],
      [0.64, 4, -36], [0.72, 5, -32], [0.79, level === 3 ? 14 : 10, -27, false, -1],
      [0.85, 5, -26], [0.88, 6, -26], [0.93, 11, -24], [0.98, 7, -20], [1, 7, -20]];
  const r = track(m, p, keys);
  r.dy += slope(r.dx);
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

// The meet's throw on repeat, for the club map and coaching scenes: the same motion at the
// athlete's own form and finish, a little slower to read at small size, then a breather before
// the next attempt. t is in ms; sinceRelease is negative until the implement goes.
export const THROW_LOOP = { ready: 500, technique: 1700, release: 150, follow: 1100, rest: 800 };
const LOOP_MS = Object.values(THROW_LOOP).reduce((a, b) => a + b, 0);
export function throwLoop(ev, level, t, { style = 0 } = {}) {
  let left = ((t % LOOP_MS) + LOOP_MS) % LOOP_MS;
  const at = left;
  let phase = "follow",
    p = 1;
  for (const key of ["ready", "technique", "release", "follow"]) {
    if (left < THROW_LOOP[key]) {
      phase = key;
      p = left / THROW_LOOP[key];
      break;
    }
    left -= THROW_LOOP[key];
  }
  const m = throwMotion(ev, level, phase, p, { style });
  m.ghost = false;
  m.sinceRelease = at - THROW_LOOP.ready - THROW_LOOP.technique;
  return m;
}
