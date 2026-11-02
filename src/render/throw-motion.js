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
import { frontFootOf, feetOf, implementPointOf, SHOT_ROTATION_START } from "./sprites.js";
import { throwTiming, techniqueTrim } from "./meet-presentation.js";
import { groundRise } from "./meet-geometry.js";
import { JAVELIN_APPROACH } from "./javelin-approach.js";

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const BACK = -16; // the back of the circle
const pick = (list, q) => list[Math.min(list.length - 1, Math.floor(q * list.length))];

// Timed contacts, not evenly spaced poses: slow preparation, a quick catch, then leg drive.
// Translate between contacts without restarting an ease on every animation frame.
function track(m, p, keys, smooth = false) {
  let i = 0;
  while (i + 1 < keys.length && p >= keys[i + 1][0]) i++;
  const [t, frame, dx, flip = false, dy = 0] = keys[i],
    next = keys[i + 1] || keys[i],
    q = next[0] === t ? 0 : (p - t) / (next[0] - t);
  if (smooth && i + 1 < keys.length) m.blend = { frame: next[1], flip: next[3] || false, t: q };
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
// The Vetter flop: after a big throw, an elite Natural Athlete's javelin finish carries them over
// the blocked leg onto the runway, hands down behind the arc, then up onto a knee to celebrate.
export function flopsForward(athlete, ev, level, beat) {
  return ev === "jav" && level === 3 && athlete?.type === "natural" && !beat?.foul && beat?.mark != null &&
    !!(beat.newPb || beat.worldRecord || beat.tookLead || (beat.leading && beat.mark >= beat.ownBest));
}
// A quick hop on the support foot between progress a and b of the recovery.
const hop = (m, p, a, b, h = 4) => {
  if (p > a && p < b) m.dy -= Math.sin((Math.PI * (p - a)) / (b - a)) * h;
  return m;
};

// phase: "ready" | "technique" | "release" | "follow"; p: progress through that phase, 0–1.
// A trimmed technique (see techniqueTrim) runs the end of the full timeline at the same speed;
// pass trim: false for a throw timed over the event's full window.
export function throwMotion(ev, level, phase, p, { foul = false, style = 0, flop = false, trim = true, compactApproach = false } = {}) {
  p = Math.max(0, Math.min(1, p));
  const cut = trim ? techniqueTrim(ev, level) : 0;
  if (phase === "technique" && cut) {
    const full = throwTiming({ event: ev, form: level }, { compactApproach }), window = full.releaseAt + cut - full.readyMs;
    p = 1 - (1 - p) * (window - cut) / window;
  }
  const m = { frame: 0, flip: false, dx: 0, dy: 0, ball: null, released: phase === "release" || phase === "follow", ghost: level >= 3 && phase === "technique" };
  // A foul carries the thrower over the front whatever their style.
  if (foul) style = 0;
  if (ev === "jav") {
    javelin(m, level, phase, p, foul, style, flop && !foul, compactApproach);
    const before = m.dx;
    // Legal deliveries stop with the outlined shoe behind the near edge of the arc (dx = 0).
    // Keep this guard tied to the sprite geometry as new technique/recovery poses are added.
    if (!foul || phase !== "follow") m.dx = Math.min(m.dx, -2 - 2 * frontFootOf({ pose: m.pose || (m.run ? "carry" : "throw"), event: ev, frame: m.frame, flip: m.flip, blend: m.blend }));
    m.dy += groundRise(m.dx) - groundRise(before);
    return m;
  }
  if (ev === "hammer") return hammer(m, level, phase, p, foul, style);
  if (ev === "discus") {
    discus(m, level, phase, p, foul, style);
    return circularFacing(m, level, phase, p, style);
  }
  if (ev === "shot" && level === 3) {
    // The same slow wind, left-leg sweep, low flight and right-left catch as a full discus
    // turn, running in shot's own technique window with a tucked arm and an upward put.
    discus(m, 2, phase, p, foul, style);
    circularFacing(m, 2, phase, p, style);
    m.frame += SHOT_ROTATION_START;
    m.blend.frame += SHOT_ROTATION_START;
    return m;
  }
  return shot(m, level, phase, p, foul, style);
}

// Unwrapped counterclockwise headings, seen from above. Sector = 0; π faces the rear.
// Shared by discus and rotational shot. Torso, head, limb depth, arms and pelvis share these
// angles instead of inferring a turn from unrelated side/front/back drawings. The shoulder wind
// may reverse; the throwing turn does not.
function circularFacing(m, level, phase, p, style) {
  const pi = Math.PI, end = level >= 2 ? 4 * pi : level === 1 ? 2 * pi : 0;
  let chest, hips;
  if (phase === "ready") chest = hips = DISCUS[level][0][3] * pi;
  else if (phase === "technique") {
    const keys = DISCUS[level], wound = DISCUS_WOUND[level];
    let i = 0;
    while (i + 1 < keys.length && p >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1] || a;
    let q = a[0] === b[0] ? 0 : (p - a[0]) / (b[0] - a[0]);
    if (p < wound) q = ease(q);
    [chest, hips] = [lerp(a[3], b[3], q) * pi, lerp(a[4], b[4], q) * pi];
  } else {
    const reverse = style === 1 || (style === 0 && level >= 2);
    const releaseTurn = reverse ? 0.3 * pi : 0.15 * pi;
    if (phase === "release") chest = end + p * releaseTurn;
    // Classic spinners let the turn run on low over the right leg, then turn back to watch the
    // discus fly; everyone else checks the turn and settles facing the throw.
    else if (reverse && style === 0)
      chest = end + (p < 0.3 ? releaseTurn + 0.35 * pi * ease(p / 0.3) : 0.65 * pi - 0.55 * pi * ease(Math.min(1, (p - 0.3) / 0.4)));
    else chest = end + lerp(releaseTurn, 0.08 * pi, ease(p));
    hips = chest;
  }
  m.turn = chest; m.hipTurn = hips;
  m.blend ||= { frame: m.frame, flip: m.flip, t: 0 };
  Object.assign(m.blend, { turn: chest, hipTurn: hips, basisFlip: m.flip });
  return m;
}

function finish(m, p, foul, at) {
  // Release, then follow through; a foul carries the thrower over the front of the circle.
  m.frame = 3;
  m.dx = foul ? lerp(at, at + 12, p * 1.5) : at;
  return m;
}

// Shot frames: 4 glide crouch and 5 glide drive (both facing away), 6 turning to face us,
// 7 facing away, 8 driving across toward the sector, 9 the closed centre catch, 10 leg drive,
// 13 the tall glide start. Rotational shot uses the shared circular contacts above.
function shot(m, level, phase, p, foul, style) {
  if (phase === "ready") return Object.assign(m, level ? { frame: 13, flip: true, dx: BACK } : { frame: 0 });
  if (phase === "release") return Object.assign(m, { frame: p < 0.28 ? 2 : 11, dx: 6 });
  if (phase === "follow") {
    finish(m, p, foul, 6);
    m.frame = 11;
    if (p < 0.16) return m;
    // Bouncy: a reverse with a hop on the right foot. Composed: no reverse, the finish held tall
    // over the left leg. Classic: gliders reverse.
    if (style === 1) return hop(Object.assign(m, { frame: p < 0.7 ? 3 : 12 }), p, 0.3, 0.55, 5);
    if (style === 2) return Object.assign(m, { frame: p < 0.6 ? 16 : 12 });
    m.frame = p < 0.64 && level >= 2 ? 3 : 12;
    return m;
  }
  // Standing delivery uses the same late leg/hip/arm sequence, without crossing the circle: sink
  // slowly into the power position, then drive.
  if (level === 0) return track(m, p, [[0, 0, 0], [0.3, 1, 0], [0.74, 1, 0], [0.88, 10, 4], [1, 10, 6]]);
  // Storl reference: start tall, fold down over the right leg, then kick the left leg low toward
  // the board and pull the right foot under. Land with the shoulders back, and only then drive.
  const fold = level === 2 ? 0.2 : 0.22, drive = level === 2 ? 0.44 : 0.48, catchAt = level === 2 ? 0.56 : 0.62;
  return track(m, p, [[0, 13, BACK, true], [fold, 4, BACK, true], [drive, 5, BACK, true, 0],
    [drive + 0.06, 5, -8, true, -2], [catchAt, 9, -2, true], [catchAt + 0.08, 1, 0], [0.88, 10, 4], [1, 10, 6]]);
}

// Discus frames: 22–24 the planted forward swing and wound backswing; 18, 6 and 19 the entry on
// the left foot (weight over, right leg sweeping wide, right knee swinging through), 7 the drive
// across toward the sector, 8 and 10 facing away on the right foot, 9 back to the sector again, 1
// and 11 the power position opening, 14 the strike. After release, 3, 15 and 16 carry the turn
// round and stop it.
//
// Each row: [progress, frame, dx, chest, pelvis, flip, dy], headings in units of π, across the
// meet's 2.1 s technique in real time at 1×. Phase lengths follow elite biomechanics (Alekna,
// Ståhl, Perković): an unhurried wind, then from the deepest backswing 230–280 ms of double
// support, 300–360 on the left foot, 70–100 in the air, 230–300 pivoting on the right foot and
// 170–240 from the left foot landing to release. Slow to fast; the pelvis leads the chest.
const DISCUS = [
  // Standing: settle, wind the shoulders back over the right leg, then hips, chest and arm.
  [[0, 0, 0, 0, 0], [0.45, 0, 0, 0, 0], [0.82, 1, 0, -0.35, -0.2], [0.89, 11, 2, -0.2, -0.05],
    [0.955, 14, 4, -0.08, 0], [1, 2, 4, 0, 0]],
  // South African / sprint-turn drill: start at the rear facing the sector, right foot behind the
  // left support leg. Settle, step through, drive onto the right foot in the middle, then turn and
  // plant the left before delivery. It omits the full throw's rear-facing wind and left sweep.
  [[0, 20, -18, 0, 0], [0.24, 20, -18, 0, 0], [0.32, 20, -18, -0.08, -0.03], [0.4, 20, -18, 0, 0], [0.6, 21, -10, 0.1, 0.2],
    [0.705, 7, -6, 0.35, 0.5, false, -2], [0.745, 8, -2, 0.65, 0.85], [0.81, 10, -2, 1, 1.2],
    [0.886, 9, 0, 1.15, 1.45, true], [0.91, 1, 0, 1.5, 1.7], [0.945, 11, 2, 1.72, 1.9], [0.977, 14, 4, 1.9, 2], [1, 2, 4, 2, 2]],
  // One and a half turns: forward, then a long backswing wound right round, so the entry starts
  // from the discus's furthest point back.
  [[0, 22, -20, 1, 1, true], [0.17, 23, -20, 1.15, 1, true], [0.42, 24, -20, 0.8, 1],
    [0.553, 18, -20, 1.2, 1.3], [0.64, 6, -20, 1.5, 1.65], [0.695, 19, -20, 1.8, 1.95],
    [0.724, 7, -8, 2.05, 2.2, false, -2], [0.771, 8, -2, 2.65, 2.85], [0.838, 10, -2, 3, 3.2],
    [0.905, 9, 0, 3.15, 3.45, true], [0.93, 1, 0, 3.5, 3.7], [0.957, 11, 2, 3.72, 3.9], [0.981, 14, 4, 3.9, 4], [1, 2, 4, 4, 4]],
  // Fast spin: a longer, more patient wind, then a turn of about a second: 230 ms of double
  // support, 300 on the left foot, 70 in the air, 230 on the right and 170 to release.
  [[0, 22, -20, 1, 1, true], [0.24, 23, -20, 1.15, 1, true], [0.524, 24, -20, 0.8, 1],
    [0.633, 18, -20, 1.2, 1.3], [0.705, 6, -20, 1.5, 1.65], [0.757, 19, -20, 1.8, 1.95],
    [0.776, 7, -8, 2.05, 2.2, false, -2], [0.81, 8, -2, 2.65, 2.85], [0.864, 10, -2, 3, 3.2],
    [0.919, 9, 0, 3.15, 3.45, true], [0.94, 1, 0, 3.5, 3.7], [0.962, 11, 2, 3.72, 3.9], [0.983, 14, 4, 3.9, 4], [1, 2, 4, 4, 4]],
];
// The preparatory swing eases at its reversals; after that, travel never brakes at a contact.
const DISCUS_WOUND = [0.82, 0.4, 0.42, 0.524];
function discus(m, level, phase, p, foul, style) {
  const keys = DISCUS[level];
  if (phase === "ready") return Object.assign(m, { frame: keys[0][1], flip: !!keys[0][5], dx: keys[0][2] });
  const reverses = style === 1 || (style === 0 && level >= 2);
  if (phase === "release") return track(m, p, [[0, 2, 4], [1, reverses ? 3 : 12, 4]], true);
  if (phase === "follow") {
    finish(m, p, foul, 4);
    // Classic: spinners reverse, let the turn run on low over the right leg, then come back round
    // to watch the flight; a standing or half-turn thrower wraps the arm across and settles. Bouncy: a reverse with a hop on the
    // right foot. Composed: no reverse, the arm wrapping across over planted feet.
    const keys = style === 1 ? [[0, 3, 4], [0.7, 13, 4], [1, 13, 4]]
      : reverses ? [[0, 3, 4], [0.3, 15, 4], [0.7, 16, 4], [1, 16, 4]]
      : [[0, 12, 4], [style === 2 ? 0.85 : 0.6, 13, 4], [1, 13, 4]];
    const dx = m.dx;
    track(m, p, keys, true); m.dx = dx;
    if (style === 1) return hop(m, p, 0.28, 0.52, 5);
    return m;
  }
  track(m, p, keys.map(([t, frame, dx, , , flip = false, dy = 0]) => [t, frame, dx, flip, dy]), true);
  if (p < DISCUS_WOUND[level]) m.blend.t = ease(m.blend.t);
  return m;
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

// Javelin frames: 0 standing with the javelin carried, 1 standing withdrawn (three-step start),
// 4–7 the carry run (left contact, left toe-off, right contact, right toe-off), 8 and 9 the
// withdrawal on a left contact, 10 and 11 the right crossover, 12 the last left contact and 13
// its take-off, 14 the impulse (15 the elite split), 16 the right catch, 17 the left block, 18
// the free arm closing, 19 the hip drive, 20 the elbow-led delivery, 21 the arm whipping down and
// 22 the reverse.
//
// Rhythm, in real time at the meet's 1× speed, from elite biomechanics: carry and crossover
// strides of 215–255 ms, quickening; the long, low penultimate (280–300 ms, the longest stride in
// time and distance); a 150–170 ms block step; 120–150 ms from block to release; and the right
// leg landing in the reverse about 0.3 s after release: da · da · da · da · daa-da-DUM.
const JAV_MS = 2300;
const L = 0, R = 1;
// Compact drill contacts: the ms each shoe lands and the runway x it lands at. Right, left, right (carry),
// left (withdrawal begins), right (cross), left (penultimate take-off), right (catch), then the left
// block. The three-step goes left, right (catch), left block after standing until `stand`. The
// block lands where the catch leg carries it; release is at JAV_MS. Meet approaches prepend
// more carry strides and spread the contacts along the full runway.
const JAV_DRILLS = [
  { start: -58, stand: 1150, land: [1680, 1980, 2150], at: [-46, -30], impulse: 14 },
  { start: -96, land: [475, 730, 980, 1225, 1465, 1705, 1990, 2150], at: [-86, -78, -70, -62, -54, -46, -32], impulse: 14 },
  { start: -96, land: [565, 810, 1045, 1275, 1500, 1730, 2010, 2170], at: [-86, -78, -70, -62, -54, -45, -29], impulse: 14 },
  { start: -96, land: [635, 865, 1090, 1310, 1525, 1740, 2030, 2180], at: [-87, -79, -71, -63, -55, -47, -29], impulse: 15 },
];
const javFootX = (frame, k) => feetOf({ pose: "throw", event: "jav", frame })[k][0];
const javKeys = new Map();
function javelinKeys(level, compactApproach) {
  const cacheKey = `${level}:${compactApproach}`;
  if (javKeys.has(cacheKey)) return javKeys.get(cacheKey);
  const base = JAV_DRILLS[level], extended = JAVELIN_APPROACH[level],
    extra = compactApproach ? 0 : extended.extraSteps, extraMs = extra * extended.stepMs,
    duration = JAV_MS + extraMs,
    plan = compactApproach ? base : { ...base, start: extended.start,
      land: [...Array.from({ length: extra }, (_, i) => base.land[0] + i * extended.stepMs), ...base.land.map(t => t + extraMs)],
      at: [...Array.from({ length: extra }, (_, i) => extended.at[0] - (extra - i) * extended.stepPx), ...extended.at] },
    keys = [];
  // A supporting shoe stays where it landed: place the body so shoe k of the frame is at x.
  const plant = (t, frame, k, x, dy = 0) => keys.push([t / duration, frame, x - 2 * javFootX(frame, k), false, dy]);
  const stride = (t, next, contact, toeOff, k, x, stance = 0.55) => {
    plant(t, contact, k, x);
    plant(t + stance * (next - t), toeOff, k, x);
  };
  const [catchAt, blockAt] = plan.land.slice(-2), last = plan.at.length - 1;
  let takeOff;
  if (level === 0) {
    // Already withdrawn: a settled stance, the weight rolling onto the right foot as the left
    // leg lifts, then left, right, left. No overhead carry run.
    const [contact] = plan.land, start = plan.start + 2 * javFootX(1, L), rear = plan.start + 2 * javFootX(1, R);
    plant(0, 1, L, start);
    plant(plan.stand, 1, L, start);
    plant(contact - 180, 11, R, rear);
    plant(contact, 12, L, plan.at[0]);
    takeOff = contact + 0.45 * (catchAt - contact);
    plant(takeOff, 13, L, plan.at[0]);
  } else {
    // Standing tall, a lean into the first push, then the run.
    const start = plan.start + 2 * javFootX(0, L), [first] = plan.land;
    plant(0, 0, L, start);
    plant(first - 300, 0, L, start);
    plant(first - 170, 4, L, start);
    plant(first - 60, 5, L, start);
    const frames = [...Array.from({ length: extra }, (_, i) => i % 2 ? [4, 5] : [6, 7]),
      [6, 7], [4, 5], [6, 7], [8, 9], [10, 11]];
    frames.forEach(([contact, toeOff], i) => stride(plan.land[i], plan.land[i + 1], contact, toeOff, i % 2 ? L : R, plan.at[i]));
    const contact = plan.land[extra + 5];
    plant(contact, 12, L, plan.at[extra + 5]);
    takeOff = contact + 0.45 * (catchAt - contact);
    plant(takeOff, 13, L, plan.at[extra + 5]);
  }
  // The impulse: low, long and airborne, landing on the right ahead of the leaning-back body.
  const from = keys.at(-1)[2], to = plan.at[last] - 2 * javFootX(16, R), mid = (takeOff + catchAt) / 2;
  keys.push([mid / duration, plan.impulse, (from + to) / 2, false, -2]);
  plant(catchAt, 16, R, plan.at[last]);
  // The left leg reaches into the block over a planted right foot, then everything happens on
  // that braced left leg: free arm, hips, elbow, release.
  plant(blockAt, 17, R, plan.at[last]);
  const block = keys.at(-1)[2] + 2 * javFootX(17, L), quick = duration - blockAt;
  [[0.25, 18], [0.5, 19], [0.78, 20], [1, 2]].forEach(([q, frame]) => plant(blockAt + q * quick, frame, L, block));
  javKeys.set(cacheKey, keys);
  return keys;
}
function javelin(m, level, phase, p, foul, style, flop, compactApproach) {
  const slope = groundRise, keys = javelinKeys(level, compactApproach), [, , release] = keys.at(-1);
  if (phase === "ready") return Object.assign(m, { frame: keys[0][1], dx: keys[0][2], dy: slope(keys[0][2]) });
  if (phase === "release") {
    track(m, p, [[0, 2, release], [1, 21, release]], true); m.dy = slope(release); return m;
  }
  if (phase === "follow" && flop) {
    // Over the block, airborne, flat on the runway, then up onto a knee and standing.
    track(m, p, [[0, 21, release], [0.16, 23, release], [0.32, 24, release + 1], [0.46, 25, release + 1],
      [0.68, 25, release + 1], [0.84, 26, release + 1], [1, 3, release + 2]], true);
    m.dy = slope(m.dx);
    return m;
  }
  if (phase === "follow") {
    const r = finish(m, p, foul, release);
    // Classic: fold over the block, reverse onto the right foot and stand. Bouncy: hop again on
    // the right foot after the reverse. Composed: hold the fold over the block, then rise.
    track(r, p, style === 2 ? [[0, 21, release], [0.65, 3, release], [1, 3, release]]
      : [[0, 21, release], [0.18, 22, release], [style === 1 ? 0.9 : 0.72, 3, release], [1, 3, release]], true);
    r.dx = foul ? lerp(release, 4, p * 1.5) : lerp(release, release + (style === 2 ? 2 : 4), ease(Math.min(1, p / 0.55)));
    r.dy = slope(r.dx);
    return style === 1 ? hop(r, p, 0.46, 0.7, 4) : r;
  }
  const r = track(m, p, keys, true);
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
    [x, y] = implementPointOf({ pose: "throw", event: ev, frame: m.frame, flip: m.flip, blend: m.blend });
  return [m.dx + x * 2, m.dy + y * 2];
}

// Club practice repeats the athlete's technique and finish, with a compact javelin approach to
// fit the training runway. Stride, delivery and release timings stay at real-time speed, then
// a breather before the next attempt. t is in ms; sinceRelease is negative until the implement goes.
export function throwLoopPhases(ev, level) {
  const meet = throwTiming({ event: ev, form: level }, { compactApproach: true });
  return { ready: 500, technique: meet.releaseAt - meet.readyMs, release: meet.releaseMs, follow: 1100, rest: 800 };
}
export const throwLoopMs = (ev, level) => Object.values(throwLoopPhases(ev, level)).reduce((a, b) => a + b, 0);
export function throwLoop(ev, level, t, { style = 0 } = {}) {
  const phases = throwLoopPhases(ev, level), total = throwLoopMs(ev, level);
  let left = ((t % total) + total) % total;
  const at = left;
  let phase = "follow",
    p = 1;
  for (const key of ["ready", "technique", "release", "follow"]) {
    if (left < phases[key]) {
      phase = key;
      p = left / phases[key];
      break;
    }
    left -= phases[key];
  }
  const m = throwMotion(ev, level, phase, p, { style, compactApproach: true });
  m.ghost = false;
  m.sinceRelease = at - phases.ready - phases.technique;
  return m;
}
