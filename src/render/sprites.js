import { canvas, outlined, flipped, shade, mix, line, ellipse, OUTLINE } from "./pixel.js";
import { SHORTS_COLORS } from "../game-content.js";

// Chibi figures: a big head, a small body, a crisp outline. Drawn facing right on a
// 64×40 canvas with the feet at (32, 36), wide enough for a javelin; cached per look/pose/frame.
export const SPRITE_W = 64,
  SPRITE_H = 40,
  OX = 32,
  OY = 36;
const GOLD = "#f2c94c",
  SHOE = "#f4efe2",
  EYE = "#2a2028",
  BLUSH = "#ef8f84";

// feet / hands are [far, near]; far parts are drawn behind the body and slightly darker.
const POSES = {
  idle: [
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [3, -10]] },
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [3, -10]], dy: -1 },
  ],
  walk: null,
  run: null,
  lift: [
    { feet: [[-5, -1], [2, -1]], hands: [[-6, -27], [5, -27]], item: "barbell", face: "strain" },
    { feet: [[-5, -1], [2, -1]], hands: [[-6, -17], [5, -17]], item: "barbell", crouch: 2 },
  ],
  drill: [
    { feet: [[-5, -1], [2, -1]], hands: [[-7, -14], [3, -18]], item: "shot", crouch: 1 },
    { feet: [[-4, -2], [3, -1]], hands: [[-6, -13], [7, -21]], lean: 1 },
  ],
  study: [
    { feet: [[-4, -1], [1, -1]], hands: [[2, -11], [4, -12]], item: "tablet" },
    { feet: [[-4, -1], [1, -1]], hands: [[2, -11], [4, -12]], item: "tablet", face: "blink" },
  ],
  sit: [
    { feet: [[1, -1], [4, -1]], hands: [[1, -7], [4, -7]], crouch: 4, sit: true },
    { feet: [[1, -1], [4, -1]], hands: [[1, -7], [4, -7]], crouch: 4, sit: true, face: "sleep" },
  ],
  cheer: [
    { feet: [[-4, -1], [1, -1]], hands: [[-6, -24], [5, -25]], face: "happy" },
    { feet: [[-4, -3], [1, -3]], hands: [[-7, -25], [6, -26]], dy: -3, face: "happy" },
  ],
  sad: [{ feet: [[-4, -1], [1, -1]], hands: [[-4, -8], [2, -8]], crouch: 1, drop: 1, face: "sad" }],
  // Bending down to pick an implement up off the grass.
  pickup: [{ feet: [[-4, -1], [2, -1]], hands: [[2, -3], [4, -3]], crouch: 3, lean: 3 }],
  wave: [
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [5, -22]], face: "happy" },
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [7, -21]], face: "happy" },
  ],
  jog: null,
};
// Running is drawn side-on, in profile, like a pixel-art run cycle: contact (front foot lands,
// back heel kicked up), down (body sinks over the support leg, the other tucks under), up (push
// off behind, knee driving through), then the same with the legs swapped. The body rides higher
// than standing so the stride shows. Legs are [knee, foot] from the ground; arms are
// [elbow, hand] from the shoulder, swinging against the legs.
const STRIDE = [
  { legs: [[[-1, -3], [-4, -4]], [[2, -4], [3, -1]]], arms: [[[2, 3], [5, 1]], [[-3, 1], [-5, 3]]], y: -2 },
  { legs: [[[2, -4], [-3, -5]], [[1, -3], [0, -1]]], arms: [[[1, 3], [-1, 5]], [[-2, 2], [0, 5]]], y: -1 },
  { legs: [[[3, -5], [2, -3]], [[-1, -3], [-4, -2]]], arms: [[[-3, 1], [-5, 3]], [[2, 3], [5, 1]]], y: -3 },
];
const swap = (f) => ({ ...f, legs: [f.legs[1], f.legs[0]], arms: [f.arms[1], f.arms[0]] });
POSES.run = [...STRIDE, ...STRIDE.map(swap)].map((f) => ({ ...f, lean: 1 }));
POSES.jog = POSES.run;
// Walking, side-on like the run so walkers face the way they go: contact (heel down in front, toe
// behind), then passing (rising over the planted foot as the other swings through), then the same
// with the legs swapped. The planted foot moves back WALK_STRIDE pixels a frame; walkFrame steps
// by distance to keep it still on the ground.
const WALK = [
  { legs: [[[-1, -3], [-3, -1]], [[2, -3], [3, -1]]], arms: [[[1, 3], [2, 5]], [[-1, 3], [-2, 5]]] },
  { legs: [[[1, -4], [0, -2]], [[1, -3], [0, -1]]], arms: [[[0, 3], [0, 5]], [[0, 3], [0, 5]]], y: -1 },
];
POSES.walk = [...WALK, ...WALK.map(swap)];
// Throws, drawn like the runs: jointed and mostly side-on, for a right-handed thrower whose
// throwing arm is the near arm when facing the sector (to the right). Frames a turn passes through
// face the camera ("front") or away ("back"); frames meant to face away from the sector are drawn
// facing right and flipped by the caller, so there the right arm is the far one.
// Frames 0–3 are ready, wind (the power position), release and follow-through; the rest are the
// event's technique: see throw-motion.js.
// Keep the throwing arm extended behind the shoulder from withdrawal through the block.
// The near arm belongs to the throwing hand; the other arm points along the runway.
const JAVELIN_WITHDRAWN = {
  shoulders: [[1, 1], [-2, 0]],
  arms: [[[3, 0], [6, -2]], [[-3, -1], [-7, -2]]],
};
// Carrying the javelin on the run-up: the forearm up behind the ear, palm up under the shaft, the
// javelin level above the shoulder at forehead height, clear of the eyes and pointing well ahead.
const JAVELIN_CARRY = [[-1, -4], [-3, -8]];
const THROWS = {
  shot: [
    // Side-on to the sector, shot tucked under the jaw with the elbow up, left arm reaching out.
    { view: "front", y: -1, lean: -1, legs: [[[-4, -3], [-6, -1]], [[2, -3], [3, -1]]], arms: [[[-3, -1], [-1, -3]], [[3, 0], [6, -1]]], hold: 0, item: "shot" },
    // Power position: sitting deep over the bent right leg, the left leg long toward the toe board,
    // the free arm still wrapped across so the shoulders stay closed.
    { view: "front", y: 2, lean: -2, legs: [[[-3, -2], [-6, -1]], [[2, -2], [4, -1]]], arms: [[[-3, -1], [-1, -3]], [[0, 1], [-3, 1]]], hold: 0, item: "shot", face: "strain" },
    // The put: tall on the toes over a braced left leg, the free arm blocked at the side and the
    // putting arm punched out at about 40°.
    { y: -3, lean: 1, legs: [[[2, -5], [3, -2]], [[0, -4], [-3, -2]]], arms: [[[-2, 2], [0, 3]], [[3, -3], [7, -6]]], face: "strain" },
    // The reverse: feet switch, the right foot stops at the board and the left kicks back.
    { y: 1, lean: 2, legs: [[[-2, -4], [-5, -4]], [[2, -3], [2, -1]]], arms: [[[-3, 0], [-6, 1]], [[1, 3], [3, 4]]] },
    // Glide crouch at the back, facing away: folded over the right leg (far, once flipped) with the
    // left knee tucked in beside it and the free arm hanging loose.
    { y: 2, lean: 3, legs: [[[2, -3], [0, -1]], [[1, -2], [-1, -2]]], arms: [[[1, 1], [3, -1]], [[1, 3], [1, 5]]], hold: 0, item: "shot", face: "strain" },
    // The glide: the left leg kicks low toward the board as the right drives and pulls under.
    { y: 1, lean: 3, legs: [[[1, -2], [-1, -2]], [[-3, -3], [-7, -2]]], arms: [[[1, 1], [3, -1]], [[1, 3], [2, 5]]], hold: 0, item: "shot", face: "strain" },
    // Rotational: pivoting on the bent left leg to face us, the right leg sweeping wide and low,
    // the left arm long…
    { view: "front", y: 1, legs: [[[-5, -3], [-7, -2]], [[2, -2], [3, -1]]], arms: [[[-3, -1], [-1, -3]], [[3, 0], [6, 0]]], hold: 0, item: "shot", face: "strain" },
    // …facing away as the right foot lands in the middle, the left leg kept close…
    { view: "back", y: 1, legs: [[[-3, -3], [-3, -1]], [[2, -3], [3, -2]]], arms: [[[-3, 0], [-6, 0]], [[3, -1], [2, -2]]], hold: 1, item: "shot" },
    // …after a low drive across the circle toward the sector.
    { y: -1, legs: [[[-1, -3], [-4, -2]], [[3, -3], [2, -2]]], arms: [[[2, 0], [5, 0]], [[1, 1], [3, -1]]], hold: 1, item: "shot", face: "strain" },
    // Centre catch: the right foot lands under the hips while the chest still faces the back.
    { y: 2, lean: 2, legs: [[[2, -2], [1, -1]], [[-2, -3], [-5, -1]]], arms: [[[1, 1], [3, -1]], [[2, 1], [4, 2]]], hold: 0, item: "shot", face: "strain" },
    // Leg drive before the strike: the right heel turns up, the hips rise and open and the free arm
    // starts to sweep out, the shot still against the neck.
    { view: "front", y: 0, lean: -1, legs: [[[-3, -3], [-5, -2]], [[3, -3], [4, -1]]], arms: [[[-3, -1], [-1, -3]], [[2, -1], [5, -2]]], hold: 0, item: "shot", face: "strain" },
    // The putting arm follows through and down as the right leg comes off the circle.
    { y: -1, lean: 2, legs: [[[3, -3], [3, -1]], [[-1, -4], [-4, -3]]], arms: [[[-2, 1], [-4, 2]], [[4, 1], [6, 3]]] },
    // Balanced recovery after the reverse, with both shoes back on the ground.
    { y: 0, lean: 1, legs: [[[-2, -3], [-4, -1]], [[2, -3], [2, -1]]], arms: [[[-2, 2], [-3, 4]], [[1, 3], [1, 5]]] },
    // Glide start, facing away: tall on the right leg, left toe touching behind, free arm up.
    { y: -1, legs: [[[0, -4], [0, -1]], [[-2, -3], [-4, -1]]], arms: [[[1, 1], [3, -1]], [[2, -2], [4, -4]]], hold: 0, item: "shot" },
    // Rotational stance at the back, facing away: feet astride, knees soft, free arm up.
    { y: 0, legs: [[[1, -3], [0, -1]], [[1, -3], [2, -1]]], arms: [[[1, 1], [3, -1]], [[2, -1], [5, -2]]], hold: 0, item: "shot" },
    // Rotational wind: the shoulders wind right, round to face away from us, over bent knees.
    { view: "back", y: 1, legs: [[[-4, -3], [-5, -1]], [[3, -3], [4, -1]]], arms: [[[-2, 1], [-3, 2]], [[-1, 0], [-4, 0]]], hold: 1, item: "shot" },
    // A blocked finish without a reverse: still tall over the left leg, the arm following the shot.
    { y: -2, lean: 1, legs: [[[2, -4], [3, -1]], [[0, -3], [-3, -1]]], arms: [[[-2, 2], [0, 3]], [[4, -2], [7, -3]]] },
    // Letting the turn run on after the reverse: away from us on the right foot…
    { view: "back", y: 0, legs: [[[-4, -3], [-5, -2]], [[2, -3], [2, -1]]], arms: [[[-3, 1], [-5, 2]], [[3, 1], [5, 2]]] },
    // …and stopping with the back to the sector, both feet down.
    { y: 0, legs: [[[1, -3], [0, -1]], [[-1, -3], [-3, -1]]], arms: [[[1, 2], [2, 4]], [[1, 3], [1, 5]]] },
  ],
  // Discus. `sling` is [throwing-arm lag behind the right shoulder line, free-arm lead ahead of the
  // left, free-arm reach]; angles in units of π. While the motion supplies chest headings, the arms
  // swing round with the turn from these (see resolvedPose); `arms` give their heights.
  discus: [
    // Side-on, the discus hanging in the right hand.
    { sling: [-0.12, 0.12, 3], view: "front", y: -1, legs: [[[-4, -3], [-5, -1]], [[2, -3], [3, -1]]], arms: [[[-1, 3], [-2, 6]], [[1, 3], [2, 6]]], hold: 0, item: "disc" },
    // Wound up in the power position: sitting over the bent right leg, the arm long and far back at
    // shoulder height, the bent left arm leading before it closes during the hip drive.
    { sling: [0.45, 0.25, 5], view: "front", y: 1, lean: -2, hip: -2, legs: [[[0, -2], [0, -1]], [[3, -3], [4, -1]]], arms: [[[-3, 0], [-6, 0]], [[3, -1], [5, -3]]], hold: 0, item: "disc", face: "strain" },
    // Release: tall over a braced left leg, the right foot pivoting on its toe, the arm long at
    // shoulder height and the free arm tucked in to stop the left side.
    { sling: [-0.3, -0.3, 2], y: -2, lean: 2, hip: 2, shoulders: [[-3, 1], [0, 0]], legs: [[[2, -4], [2, -1]], [[0, -3], [-2, -2]]], arms: [[[-2, 2], [0, 3]], [[3, 0], [6, 1]]], face: "strain" },
    // Follow-through: the arm wraps across and the right foot comes round to the front.
    { sling: [-0.85, -0.3, 3], y: 0, lean: 1, legs: [[[-1, -3], [-3, -2]], [[2, -3], [2, -1]]], arms: [[[-3, 0], [-5, 1]], [[2, 2], [1, 4]]] },
    // Pre-swings at the back of the circle, facing away, knees soft: back behind the right hip…
    { y: 1, legs: [[[1, -3], [-1, -1]], [[2, -3], [2, -1]]], arms: [[[-3, 0], [-6, 0]], [[1, 2], [2, 1]]], hold: 0, item: "disc" },
    // …and forward to the left hand.
    { y: 0, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[2, 1], [4, 1]], [[2, 2], [4, 2]]], hold: 0, item: "disc" },
    // The entry: round to face us on the bent left leg, the right leg sweeping wide and low, the
    // discus arm trailing far behind…
    { sling: [0.3, 0.1, 5], view: "front", y: 2, lean: 1, hip: 2, legs: [[[-5, -3], [-8, -2]], [[0, -2], [-1, -1]]], arms: [[[-3, 0], [-6, 0]], [[3, 0], [6, 0]]], hold: 0, item: "disc", face: "strain" },
    // …a low drive across the circle toward the sector, right knee leading…
    { sling: [0.35, 0.2, 4], y: 0, lean: 1, hip: 2, legs: [[[-2, -3], [-5, -2]], [[4, -3], [2, -2]]], arms: [[[3, -1], [5, -3]], [[-3, 0], [-6, 0]]], hold: 1, item: "disc", face: "strain" },
    // …landing on the ball of the right foot facing away, the left leg close…
    { sling: [0.45, 0.2, 4], view: "back", y: 2, lean: 0, hip: 1, legs: [[[-2, -3], [-3, -3]], [[2, -2], [1, -1]]], arms: [[[-3, -1], [-5, -2]], [[3, 0], [6, 0]]], hold: 1, item: "disc" },
    // …and the left foot down with the back to the sector, the arm still trailing.
    { sling: [0.55, 0.3, 5], y: 1, lean: 1, hip: -1, legs: [[[-1, -2], [-3, -1]], [[-4, -3], [-7, -1]]], arms: [[[-3, 0], [-6, 0]], [[3, -1], [5, -3]]], hold: 0, item: "disc", face: "strain" },
    // Right-foot pivot: the free leg sweeps round while the discus stays behind the hips.
    { sling: [0.5, 0.25, 4], view: "back", y: 2, hip: 1, legs: [[[-4, -3], [-5, -3]], [[2, -2], [1, -1]]], arms: [[[-3, -1], [-5, -2]], [[3, 0], [6, 0]]], hold: 1, item: "disc", face: "strain" },
    // Left foot down, hips opening first and rising; the long throwing arm is still trailing.
    { sling: [0.4, 0, 4], view: "front", y: 0, lean: -1, hip: 2, shoulders: [[-3, 1], [1, 0]], legs: [[[0, -3], [-1, -2]], [[3, -3], [3, -1]]], arms: [[[-3, 0], [-6, 0]], [[2, 1], [0, 2]]], hold: 0, item: "disc", face: "strain" },
    // The shoulders finish their turn and the empty throwing arm wraps across the chest.
    { sling: [-0.85, -0.2, 3], view: "front", y: -1, lean: 1, legs: [[[-3, -4], [-5, -3]], [[2, -3], [2, -1]]], arms: [[[2, 1], [5, 2]], [[-2, 1], [-5, 2]]] },
    // Settle after the reverse instead of holding a one-legged release pose.
    { sling: [-0.5, 0, 3], view: "front", y: 0, legs: [[[-3, -3], [-4, -1]], [[2, -3], [3, -1]]], arms: [[[-1, 3], [-2, 5]], [[1, 3], [2, 5]]] },
    // The strike: hips and chest open to the sector over the braced left leg, the right foot
    // turning on its toe, the throwing arm last, still long behind at shoulder height.
    { sling: [0.15, -0.2, 2.5], y: -1, lean: 1, hip: 2, shoulders: [[-3, 1], [-1, 0]], legs: [[[2, -4], [2, -1]], [[0, -3], [-2, -2]]], arms: [[[-2, 2], [0, 3]], [[-3, 0], [-6, 0]]], hold: 1, item: "disc", face: "strain" },
    // After the reverse the turn carries on, low on the right foot to soak up the speed…
    { sling: [-0.8, 0, 3], view: "back", y: 2, legs: [[[-4, -3], [-5, -2]], [[2, -3], [2, -1]]], arms: [[[-3, 1], [-5, 2]], [[3, 1], [5, 2]]] },
    // …then both feet down inside the circle, turned back to watch the flight.
    { sling: [-0.7, 0, 3], y: 0, legs: [[[1, -3], [0, -1]], [[-1, -3], [-3, -1]]], arms: [[[1, 2], [2, 4]], [[1, 3], [1, 5]]] },
    // The backswing wound right round, the chest turned away from us and the discus far back.
    { view: "back", y: 1, legs: [[[-4, -3], [-5, -1]], [[3, -3], [4, -1]]], arms: [[[2, 1], [3, 1]], [[4, 0], [7, 0]]], hold: 1, item: "disc" },
    // Entry: weight onto the bent left leg, the right foot still pushing from the back.
    { sling: [0.4, 0.1, 5], view: "front", y: 2, lean: 1, hip: 2, legs: [[[-3, -2], [-4, -1]], [[0, -2], [-1, -1]]], arms: [[[-3, 0], [-6, 0]], [[3, 0], [6, 0]]], hold: 0, item: "disc", face: "strain" },
    // The right knee swings through toward the middle as the left leg drives.
    { sling: [0.3, 0.15, 5], view: "front", y: 1, lean: 1, hip: 2, legs: [[[2, -4], [1, -3]], [[0, -2], [-1, -1]]], arms: [[[-3, 0], [-6, 0]], [[3, 0], [5, 1]]], hold: 0, item: "disc", face: "strain" },
    // South African start: facing the sector at the rear, weight over the left support leg,
    // right foot behind. The discus stays drawn back while the free arm leads into the ring.
    { sling: [0.6, 0.3, 5], y: 1, lean: 2, hip: 2, shoulders: [[0, 1], [-2, 1]], legs: [[[2, -2], [2, -1]], [[-3, -3], [-6, -2]]], arms: [[[3, 0], [6, -2]], [[-3, 0], [-6, 0]]], hold: 1, item: "disc" },
    // Step through from that stance: push off the left and drive the right knee to the middle.
    { sling: [0.55, 0.3, 5], y: 1, lean: 2, hip: 2, shoulders: [[0, 1], [-2, 1]], legs: [[[0, -3], [-2, -1]], [[4, -4], [1, -3]]], arms: [[[3, 0], [6, -2]], [[-3, 0], [-6, 0]]], hold: 1, item: "disc", face: "strain" },
    // Full-throw wind: the rear-facing stance and forward swing share exactly the same feet.
    // These are flipped by the motion; the right foot stays behind and the left toward entry.
    { sling: [0.3, 0.3, 3], y: 1, legs: [[[-1, -3], [-1, -2]], [[-1, -3], [-2, -1]]], arms: [[[-3, 1], [-6, 1]], [[2, 1], [4, 1]]], hold: 0, item: "disc" },
    { sling: [-0.8, 0.6, 3], y: 1, legs: [[[-1, -3], [-1, -2]], [[-1, -3], [-2, -1]]], arms: [[[2, 1], [5, 1]], [[2, 1], [5, 1]]], hold: 0, item: "disc" },
    // Maximum backswing: only the upper body winds round; the planted shoes do not swap.
    { sling: [0.55, 0.7, 3], view: "back", y: 1, lean: -1, hip: -2, legs: [[[-1, -3], [-1, -1]], [[-1, -3], [-2, -2]]], arms: [[[1, 0], [2, 1]], [[3, 0], [6, 0]]], hold: 1, item: "disc" },
  ],
  hammer: [
    // Back to the sector, the head resting behind on the right.
    { y: -1, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[-1, 3], [-3, 5]], [[-1, 3], [-3, 5]]], item: "handle" },
    // A wind: hands over the head as the ball passes high behind.
    { y: -1, lean: -1, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[-3, -4], [-4, -8]], [[-3, -4], [-4, -8]]], item: "handle", face: "strain" },
    // Release over the left shoulder: legs and back fully extended, leaning back against the
    // hammer, both hands meeting, with compact elbow-to-hand segments.
    { view: "front", y: -2, lean: -2, legs: [[[-3, -4], [-4, -2]], [[2, -4], [3, -1]]], arms: [[[4, -3], [8, -8]], [[1, -4], [2, -8]]], face: "strain" },
    // Recover on a bent support leg, arms lowered after sweeping across the body.
    { view: "front", y: 0, lean: 1, legs: [[[-3, -3], [-4, -3]], [[2, -3], [2, -1]]], arms: [[[1, 3], [3, 5]], [[-2, 2], [-4, 4]]] },
    // The low point of a wind, arms long in front.
    { y: 0, lean: 1, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[2, 2], [4, 3]], [[2, 2], [4, 3]]], item: "handle" },
    // A recovery turn after release on the left foot, hands empty and low, out for balance. Side-on…
    { y: 0, legs: [[[1, -3], [0, -1]], [[2, -3], [2, -2]]], arms: [[[1, 3], [3, 4]], [[-1, 3], [-2, 5]]] },
    // …facing us…
    { view: "front", y: 0, legs: [[[-4, -3], [-5, -1]], [[2, -3], [3, -2]]], arms: [[[-2, 2], [-4, 4]], [[2, 2], [4, 4]]] },
    // …and facing away.
    { view: "back", y: 0, legs: [[[-4, -3], [-5, -2]], [[2, -3], [3, -1]]], arms: [[[-2, 2], [-4, 4]], [[2, 2], [4, 4]]] },
    // After release the shoulders keep turning and the hands sweep down across the chest.
    { view: "front", y: -1, lean: 1, legs: [[[-3, -3], [-4, -2]], [[2, -3], [2, -1]]], arms: [[[-2, 0], [-4, 2]], [[-4, 0], [-7, 2]]] },
    // Both feet replant after the pivot; the hips settle and the arms fold back toward the chest.
    { view: "front", y: 1, lean: -1, legs: [[[-3, -3], [-4, -1]], [[2, -3], [4, -1]]], arms: [[[1, 2], [3, 4]], [[-2, 2], [-4, 3]]] },
    // Single support: pivot on the left foot while the right foot travels round it.
    { view: "front", y: 1, legs: [[[-3, -3], [-5, -1]], [[2, -4], [4, -3]]], arms: [[[1, 3], [3, 5]], [[-1, 3], [-3, 5]]], item: "handle", face: "strain" },
    { view: "back", y: 1, legs: [[[-3, -3], [-5, -1]], [[2, -4], [4, -3]]], arms: [[[1, 3], [3, 5]], [[-1, 3], [-3, 5]]], item: "handle" },
    // Double support: sit against the pull with two planted feet, then lift into release.
    { y: 1, lean: -2, legs: [[[1, -3], [0, -1]], [[3, -3], [4, -1]]], arms: [[[3, 1], [6, 2]], [[3, 1], [6, 2]]], item: "handle", face: "strain" },
    { view: "front", y: -2, lean: -1, legs: [[[-3, -3], [-4, -1]], [[2, -4], [3, -1]]], arms: [[[4, -3], [8, -8]], [[1, -4], [2, -8]]], item: "handle", face: "strain" },
    // Lateral wind positions between the low swing and the hands passing overhead.
    { y: -1, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[3, -1], [5, -3]], [[3, -1], [5, -3]]], item: "handle" },
    { y: -1, lean: -1, legs: [[[0, -3], [-1, -1]], [[1, -3], [2, -1]]], arms: [[[-3, -1], [-5, -3]], [[-3, -1], [-5, -3]]], item: "handle" },
    // Single support facing the sector as the hammer passes its high point: on the left foot,
    // the right knee wrapping close round it, still sitting back.
    { y: 0, lean: -1, legs: [[[1, -3], [0, -1]], [[3, -3], [1, -3]]], arms: [[[3, 0], [6, 1]], [[3, 0], [6, 1]]], item: "handle", face: "strain" },
    // The right foot lands quickly facing away, starting the next double support low.
    { view: "back", y: 1, legs: [[[-3, -3], [-4, -1]], [[2, -3], [3, -1]]], arms: [[[1, 3], [3, 5]], [[-1, 3], [-3, 5]]], item: "handle" },
  ],
  // Javelin, side-on. Each stride is a contact pose and a toe-off pose; throw-motion.js places
  // the body so that the supporting shoe stays where it landed. Legs are [left, right].
  jav: [
    // Standing at the top of the runway, left foot forward, javelin carried above the shoulder.
    { y: -1, legs: [[[1, -3], [2, -1]], [[0, -3], [-1, -1]]], arms: [[[1, 2], [3, 3]], JAVELIN_CARRY], item: "jav" },
    // Three-step start: already withdrawn and side-on, weight back over the right foot.
    { y: -1, lean: -1, legs: [[[2, -3], [3, -1]], [[0, -3], [-1, -1]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // Overarm release above the braced left leg, the chest already past it; the elbow leads
    // without stretching the arm and the right toe drags behind.
    { y: -2, lean: 2, hip: 2, shoulders: [[-3, 1], [1, -1]], legs: [[[4, -4], [5, -1]], [[0, -3], [-3, -2]]], arms: [[[0, 2], [-1, 3]], [[0, -3], [1, -7]]], face: "strain" },
    // Recover upright over the right foot, safely behind the arc, with the throwing arm down.
    { y: 0, lean: 1, legs: [[[-1, -3], [-3, -2]], [[2, -3], [2, -1]]], arms: [[[-2, 1], [-4, 2]], [[1, 3], [0, 5]]] },
    // Carry run. The javelin stays steady above the shoulder while the free arm pumps against the
    // legs. Left contact just ahead of the hips…
    { y: -1, lean: 1, legs: [[[1, -3], [1, -1]], [[-1, -3], [-3, -3]]], arms: [[[-2, 2], [-3, 4]], JAVELIN_CARRY], item: "jav" },
    // …left toe-off behind as the right knee drives through…
    { y: -2, lean: 1, legs: [[[0, -3], [-1, -1]], [[2, -4], [1, -3]]], arms: [[[2, 1], [4, -1]], JAVELIN_CARRY], item: "jav" },
    // …right contact…
    { y: -1, lean: 1, legs: [[[-1, -3], [-3, -3]], [[1, -3], [1, -1]]], arms: [[[2, 1], [4, 0]], JAVELIN_CARRY], item: "jav" },
    // …and right toe-off as the left knee drives through.
    { y: -2, lean: 1, legs: [[[2, -4], [1, -3]], [[0, -3], [-1, -1]]], arms: [[[-2, 2], [-3, 4]], JAVELIN_CARRY], item: "jav" },
    // Withdrawal begins on a left contact: the hand travels back while the feet keep running.
    { y: -1, lean: 0, shoulders: [[1, 1], [-1, 0]], legs: [[[1, -3], [1, -1]], [[-1, -3], [-3, -3]]], arms: [[[3, 0], [6, -2]], [[-3, -1], [-5, -2]]], item: "javwithdraw" },
    // Left toe-off with the arm long behind and the shoulders turned side-on, still running tall.
    { y: -2, lean: 0, hip: 0, legs: [[[0, -3], [-1, -1]], [[2, -4], [1, -3]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // Crossover: the right foot lands ahead of the hips. The trunk stays nearly upright; the big
    // lean back is saved for the penultimate…
    { y: -1, lean: 0, hip: 1, legs: [[[-1, -3], [-3, -2]], [[2, -3], [2, -1]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // …and pushes off behind as the left knee comes through low.
    { y: -1, lean: 0, hip: 1, legs: [[[2, -3], [1, -2]], [[0, -3], [-1, -1]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // The last left contact, ahead of the hips; the shoulders start to drop back.
    { y: -1, lean: -1, hip: 1, legs: [[[1, -3], [1, -1]], [[-1, -3], [-3, -2]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // Penultimate take-off: a long push from the left toe, the right knee driving low and forward,
    // and the lean back begins.
    { y: -1, lean: -2, hip: 1, legs: [[[-1, -3], [-2, -1]], [[3, -4], [2, -3]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // The impulse stride: low and long, the hips running ahead of the shoulders.
    { y: 0, lean: -3, hip: 1, legs: [[[-2, -3], [-4, -2]], [[3, -3], [4, -2]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // Elite impulse: a visibly longer, lower split.
    { y: 0, lean: -3, hip: 1, legs: [[[-3, -3], [-6, -2]], [[4, -3], [5, -2]]], ...JAVELIN_WITHDRAWN, item: "javback" },
    // Right-foot catch ahead of the hips, the body leaning well back and the left leg already
    // swinging through toward the block.
    { y: 1, lean: -3, hip: 0, legs: [[[2, -3], [3, -2]], [[2, -3], [3, -1]]], ...JAVELIN_WITHDRAWN, item: "javback", face: "strain" },
    // The block: the left leg planted long and straight ahead, the right knee bent under a body
    // leaning well back, the arm still long behind.
    { y: 1, lean: -3, hip: 1, legs: [[[3, -3], [5, -1]], [[0, -2], [-1, -1]]], ...JAVELIN_WITHDRAWN, item: "javback", face: "strain" },
    // Block established: the free elbow pulls down beside the ribs while the throwing hand stays
    // back. The pelvis moves ahead of the chest before the elbow-led strike.
    { y: 0, lean: -2, hip: 2, shoulders: JAVELIN_WITHDRAWN.shoulders, legs: [[[3, -4], [5, -1]], [[1, -3], [-1, -2]]], arms: [[[-2, 2], [0, 3]], JAVELIN_WITHDRAWN.arms[1]], item: "javback", face: "strain" },
    // Hips drive past the planted left leg and the chest arches open before the elbow comes over
    // the shoulder.
    { y: -1, lean: -1, hip: 3, shoulders: [[-3, 1], [0, 0]], legs: [[[4, -4], [5, -1]], [[1, -3], [-1, -2]]], arms: [[[-2, 2], [0, 3]], [[-2, -2], [-3, -5]]], item: "javup", face: "strain" },
    // Delivery: chest and elbow come through over the braced leg, the javelin angled up beside
    // the top of the head.
    { y: -2, lean: 1, hip: 2, shoulders: [[-3, 1], [0, -1]], legs: [[[4, -4], [5, -1]], [[0, -3], [-2, -2]]], arms: [[[0, 2], [-1, 3]], [[0, -3], [1, -7]]], item: "javup", face: "strain" },
    // The arm whips forward and down while the chest folds over the block leg.
    { y: 0, lean: 4, shoulders: [[-3, 1], [1, 1]], legs: [[[4, -3], [5, -1]], [[-1, -4], [-3, -3]]], arms: [[[-2, 1], [-4, 2]], [[3, -1], [6, 1]]] },
    // Reverse: the right leg catches the body, left leg kicks back, arm wraps across the torso.
    { y: 1, lean: 3, legs: [[[-2, -4], [-5, -4]], [[3, -3], [3, -1]]], arms: [[[-2, 0], [-4, 1]], [[2, 3], [-1, 5]]] },
    // The flop, after a big throw: instead of stepping through, the body keeps going over the
    // blocked left leg, the right leg swinging up behind…
    { y: 2, lean: 6, hip: 2, legs: [[[3, -3], [4, -1]], [[-3, -4], [-7, -6]]], arms: [[[3, 2], [5, 4]], [[3, 1], [5, 4]]], face: "strain" },
    // …a dive with both legs off the runway and the hands reaching for it…
    { y: 3, lean: 8, hip: 1, legs: [[[-3, -3], [-6, -4]], [[-4, -4], [-8, -7]]], arms: [[[2, 3], [3, 5]], [[2, 2], [3, 5]]], face: "strain" },
    // …flat out on the runway, hands under the shoulders, still behind the arc…
    { y: 4, lean: 9, hip: 0, legs: [[[-4, -2], [-8, -2]], [[-4, -3], [-8, -4]]], arms: [[[0, 2], [1, 4]], [[1, 2], [1, 4]]], face: "happy" },
    // …and up onto one knee, pulling a fist down in celebration.
    { y: 2, lean: 2, hip: 1, legs: [[[3, -4], [3, -1]], [[-2, -1], [-6, -1]]], arms: [[[1, 2], [3, 4]], [[1, 3], [4, 2]]], face: "happy" },
  ],
};
// Rotational shot shares the discus's contact poses and lower-body mechanics. Its arm stays
// folded at the neck through the turn, then punches upward instead of slinging a long arm.
// Keep the original shot frames intact for standing puts and glides.
export const SHOT_ROTATION_START = THROWS.shot.length;
THROWS.shot.push(...THROWS.discus.map((contact, frame) => {
  const hold = contact.hold ?? 1, tuck = !!contact.item;
  const upper = THROWS.shot[frame === 2 ? 2 : frame === 15 ? 17 : frame === 16 || frame === 13 ? 12 : 11];
  return { ...contact, sling: undefined, hold, tuck, item: tuck ? "shot" : undefined,
    arms: tuck ? (hold === 0 ? THROWS.shot[0].arms : [...THROWS.shot[0].arms].reverse()) : upper.arms };
}));
export const THROW_FRAMES = { ready: 0, wind: 1, release: 2, follow: 3 };
export const THROW_FRAME_COUNTS = Object.fromEntries(Object.entries(THROWS).map(([ev, frames]) => [ev, frames.length]));

function poseData(pose, frame, event) {
  if (pose === "throw") {
    const list = THROWS[event || "shot"];
    return list[frame] || list[frame % 4];
  }
  const list = POSES[pose] || POSES.idle;
  return list[frame % list.length];
}

// Shoulder anchors rotate with the chest, independently of arm length and pelvis travel.
// The same joint positions drive drawing, implement attachments and proportion checks.
function poseArmJoints(p, dy = p.y || 0, lean = p.lean || 0) {
  const side = !p.view || p.view === "side";
  return p.arms.map(([elbow, hand], k) => {
    const [sx, sy] = p.shoulders?.[k] || [side ? -1 : k ? 2 : -4, 1];
    const shoulder = [sx + lean, -10 + dy + sy];
    const at = ([x, y]) => [shoulder[0] + x, shoulder[1] + y];
    return [shoulder, at(elbow), at(hand)];
  });
}

// [tail x, tail y, tip x, tip y] from the hand. Carried, the hand sits back by the ear, so most of
// the shaft reaches out in front of the face. Withdrawn, the hand is far back on the cord, more
// shaft trails behind it and the tip sits by the brow.
const SHAFTS = { jav: [-12, 1, 16, -1], javback: [-16, 6, 15, -6], javwithdraw: [-16, 4, 13, -4], javup: [-14, 10, 9, -6] };
const mixNumber = (a, b, t) => a + (b - a) * t;
const mixPoint = (a, b, t) => a.map((v, i) => mixNumber(v, b[i], t));
function poseHips(p) {
  const h = p.hip ?? Math.round((p.lean || 0) / 2), y = -5 + (p.y || 0);
  return !p.view || p.view === "side" ? [[-1 + h, y], [-1 + h, y]] : [[-3 + h, y], [1 + h, y]];
}
// Interpolate joints, not finished pictures. Keep anatomical left/right identities when a
// turn changes drawing order or facing; otherwise a planted foot would switch to the free leg.
function resolvedPose(o) {
  const a = poseData(o.pose, o.frame || 0, o.event), blend = o.blend;
  if (!blend || !a.legs) return a;
  const b = poseData(blend.pose || o.pose, blend.frame, o.event);
  if (!b.legs) return a;
  const t = Math.max(0, Math.min(1, blend.t)), mirrored = !!o.flip !== !!blend.flip,
    rightA = a.hold ?? 1, rightB = b.hold ?? 1,
    index = k => k === rightA ? rightB : 1 - rightB,
    point = (v, width = 2) => [mirrored ? -width - v[0] : v[0], v[1]],
    scalar = v => mirrored ? -v : v,
    y = mixNumber(a.y || 0, b.y || 0, t), lean = mixNumber(a.lean || 0, scalar(b.lean || 0), t),
    aa = poseArmJoints(a), ba = poseArmJoints(b), ah = poseHips(a), bh = poseHips(b),
    joints = aa.map((arm, k) => arm.map((v, j) => mixPoint(v, point(ba[index(k)][j]), t))),
    chosen = t < 0.5 ? a : b;
  const p = { ...chosen, y, lean, hip: mixNumber(a.hip ?? Math.round((a.lean || 0) / 2), scalar(b.hip ?? Math.round((b.lean || 0) / 2)), t),
    hold: rightA, item: a.item || b.item,
    hips: ah.map((v, k) => mixPoint(v, point(bh[index(k)]), t)),
    legs: a.legs.map((leg, k) => leg.map((v, j) => mixPoint(v, point(b.legs[index(k)][j], j ? 3 : 2), t))),
    shoulders: joints.map(([s]) => [s[0] - lean, s[1] + 10 - y]),
    arms: joints.map(([s, e, h]) => [e, h].map(v => [v[0] - s[0], v[1] - s[1]])) };
  const sa = SHAFTS[a.item], sb = SHAFTS[b.item] || sa;
  if (sa && sb) p.shaft = sa.map((v, i) => mixNumber(v, i % 2 ? sb[i] : scalar(sb[i]), t));
  if ((o.event === "discus" || o.event === "shot") && Number.isFinite(blend.turn)) {
    const turn = blend.turn, hipTurn = blend.hipTurn ?? turn, dir = (blend.basisFlip ?? o.flip) ? -1 : 1,
      towardCamera = -Math.sin(turn), right = p.hold, centre = -1 + lean;
    // Past about 37° from side-on, show the chest or back; the deepest backswing stays side-on.
    p.view = Math.abs(towardCamera) > 0.6 ? towardCamera > 0 ? "front" : "back" : "side";
    p.headFlip = Math.cos(turn) * dir < 0;
    p.near = Math.cos(turn) >= 0 ? right : 1 - right;
    p.shoulders = [0, 1].map(k => {
      const sign = k === right ? 1 : -1;
      return [centre - lean + sign * Math.sin(turn) * dir * 2.5, 1 + sign * Math.cos(turn) * 0.4];
    });
    p.hips = [0, 1].map(k => {
      const sign = k === right ? 1 : -1;
      return [-1 + p.hip + sign * Math.sin(hipTurn) * dir * 1.7, -5 + y + sign * Math.cos(hipTurn) * 0.3];
    });
    // The arms swing round with the chest rather than sliding through it between drawings: the
    // long throwing arm trails `lag` behind the right shoulder line, the free arm leads from the
    // left. Headings project to screen x and depth, and an arm behind the torso is drawn behind it.
    if (a.sling && b.sling) {
      const [lag, lead, reach] = a.sling.map((v, i) => mixNumber(v, b.sling[i], t));
      // Hands stay at or below the shoulder, under the big chin, where the arm reads clearly.
      const arm = (k, angle, len, side) => {
        const hy = Math.max(p.arms[k][1][1], side > 0 ? -1 : 0), hx = Math.cos(angle) * len * dir;
        p.arms[k] = [[hx * 0.5, hy * 0.5 + (len > 4 ? 0.5 : 1.5)], [hx, hy]];
        return side * Math.cos(turn) * 2.5 - Math.sin(angle) * len < 0;
      };
      p.behind = [];
      p.behind[right] = arm(right, turn - Math.PI / 2 - lag * Math.PI, 6, 1);
      p.behind[1 - right] = arm(1 - right, turn + Math.PI / 2 - lead * Math.PI, reach, -1);
    }
    if (o.event === "shot") {
      const loaded = mixNumber(a.tuck ? 1 : 0, b.tuck ? 1 : 0, t),
        outward = Math.sin(turn) * dir,
        neck = [[outward * 3.5, -0.5], [outward * 1.5, -3]],
        reach = Math.cos(turn + Math.PI / 2 - 0.15 * Math.PI) * 5 * dir;
      p.arms[right] = p.arms[right].map((v, j) => mixPoint(v, neck[j], loaded));
      p.arms[1 - right] = p.arms[1 - right].map((v, j) => mixPoint(v, [reach * (j ? 1 : 0.5), 0], loaded));
      if (loaded > 0) {
        p.behind = [];
        p.behind[right] = Math.cos(turn) < 0;
        p.behind[1 - right] = Math.cos(turn) >= 0;
      }
    }
  }
  return p;
}

// Pose tables were authored for a taller body; scale them onto the chibi proportions.
// Raised hands move out beside (or above) the big head so they stay visible.
function handAt([x, y]) {
  const ny = y >= -14 ? Math.round(y * 0.6) : Math.round(-8 + (y + 14) * 1.05);
  let nx = Math.round(x * 0.8);
  if (ny < -10) nx = nx < 1 ? Math.min(nx, -9) : Math.max(nx, 7);
  return [nx, ny];
}
const footAt = ([x, y]) => [Math.round(x * 0.75), Math.max(-3, y)];
// Rounded 12×11 head mask, row by row: [x0, width].
const HEAD = [[2, 8], [1, 10], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [1, 10], [2, 8]];

function drawFigure(g, o) {
  const look = o.look || {},
    special = look.special,
    p = resolvedPose(o);
  const P = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(OX + x), Math.round(OY + y), w, h);
  };
  const fur = special === "yeti",
    metal = special === "robot",
    kid = special === "kid";
  const skin = metal ? "#b8c4cc" : look.skin || "#e2b08a",
    limb = fur ? "#eef0f2" : skin,
    hair = look.hair || "#3a2a20",
    shirt = o.shirt || "#2f6b52",
    collar = o.collar || "#e2b04a",
    shorts = o.shorts || shade(shirt, -0.55),
    rank = o.rank || 0;
  // Jointed poses bend at the knee and elbow and give their offsets in whole pixels. They are
  // drawn side-on (profile, facing right), from the front or from behind.
  const jointed = !!p.legs,
    view = jointed ? p.view || "side" : "front",
    side = view === "side",
    back = view === "back",
    near = p.near ?? 1, farLimb = 1 - near;
  const dy = (jointed ? p.y || 0 : Math.round(((p.dy || 0) + (p.crouch || 0)) * 0.7)) + (kid ? 1 : 0),
    lean = jointed ? p.lean || 0 : Math.round((p.lean || 0) * 0.7),
    hl = jointed ? p.hip ?? Math.round(lean / 2) : lean;
  const tb = -4 + dy, // hip line
    ttop = tb - 6; // top of the shirt
  const hx = -6 + lean,
    hy = ttop - 11 + (p.drop || 0);
  const far = shade(limb, -0.18);
  const hips = p.hips ? p.hips.map(([x, y]) => [x, y + (kid ? 1 : 0)]) : side ? [[-1 + hl, tb - 1], [-1 + hl, tb - 1]] : [[-3 + hl, tb - 1], [1 + hl, tb - 1]],
    arms = jointed ? poseArmJoints(p, dy, lean) : null;
  const feet = jointed ? p.legs.map((l) => l[1]) : p.feet.map(footAt),
    hands = jointed ? arms.map((joints) => joints[2]) : p.hands.map(handAt).map(([x, y]) => [x + Math.round(lean / 2), y + dy]),
    hold = p.hold ?? 1;
  // In profile the far limbs are shaded; from the front or behind both are lit.
  const tone = (k) => (side && k !== near ? far : limb);
  // A bent limb as 2px segments through sprite points.
  const joint = (pts, c) => {
    for (let i = 1; i < pts.length; i++) line(g, OX + pts[i - 1][0] + 0.5, OY + pts[i - 1][1] + 0.5, OX + pts[i][0] + 0.5, OY + pts[i][1] + 0.5, c, 2);
  };
  const leg = (k) => {
    if (jointed) joint([hips[k], p.legs[k][0], [feet[k][0], feet[k][1] - 1]], tone(k));
    else if (k) line(g, OX + 1 + lean / 2, OY + tb, OX + feet[1][0] + 1, OY + feet[1][1] - 1, limb, 2);
    else line(g, OX - 2 + lean / 2, OY + tb, OX + feet[0][0] + 1, OY + feet[0][1] - 1, far, 2);
    P(feet[k][0], feet[k][1], 3, 1, k === near ? SHOE : shade(SHOE, -0.2));
    if (k === near) P(feet[k][0] + 2, feet[k][1], 1, 1, collar);
  };
  const arm = (k, edged) => {
    const pts = jointed && arms[k];
    // An arm raised in front of the big head gets a dark edge, so it reads against the face.
    if (edged && jointed && Math.min(pts[1][1], pts[2][1]) < ttop) {
      for (let i = 1; i < 3; i++) line(g, OX + pts[i - 1][0] + 0.5, OY + pts[i - 1][1] + 0.5, OX + pts[i][0] + 0.5, OY + pts[i][1] + 0.5, OUTLINE, 4);
      P(hands[k][0] - 1, hands[k][1] - 1, 4, 4, OUTLINE);
    }
    if (jointed) joint(pts, tone(k));
    else if (k) {
      line(g, OX + 2 + lean, OY + ttop + 1, OX + hands[1][0] + 1, OY + hands[1][1] + 1, limb, 2);
      P(2 + lean, ttop, 1, 2, shirt);
    } else line(g, OX - 3 + lean, OY + ttop + 1, OX + hands[0][0] + 1, OY + hands[0][1] + 1, far, 2);
    P(hands[k][0], hands[k][1], 2, 2, tone(k));
    if (k === near && rank >= 1) P(hands[k][0], hands[k][1] + 2, 2, 1, collar);
    if (k === hold && !javelin) item(hands[k]);
  };
  // Whatever the athlete holds, drawn with the hand that holds it. A javelin lies in front of
  // everything, face included, with a dark underside so it reads against skin.
  const javelin = p.item?.startsWith("jav"),
    shaft = (x0, y0, x1, y1, [nx, ny]) => {
      line(g, OX + nx + x0, OY + ny + y0 + 1, OX + nx + x1, OY + ny + y1 + 1, "#6a5a40");
      line(g, OX + nx + x0, OY + ny + y0, OX + nx + x1, OY + ny + y1, "#efe6c8");
      P(nx + x1 - 1, ny + y1, 2, 1, "#6a6a70");
      P(nx, ny, 2, 1, "#b0503a");
    };
  const item = ([nx, ny]) => {
    if (o.released) return;
    switch (p.item) {
      case "shot":
        ellipse(g, OX + nx + 2, OY + ny, 2, 2, "#585c66");
        P(nx + 1, ny - 1, 1, 1, "#9aa0aa");
        break;
      case "disc":
        // Palm above the discus, with the fingers curled over its far rim.
        P(nx - 1, ny + 2, 5, 1, "#d8c890");
        P(nx - 1, ny + 3, 5, 1, "#8a7a50");
        P(nx, ny + 1, 3, 1, tone(hold));
        P(nx + 2, ny + 2, 1, 1, tone(hold));
        break;
      case "handle":
        P(nx, ny, 2, 2, "#3a3e46");
        break;
      case "jav":
      case "javback":
      case "javwithdraw":
      case "javup":
        shaft(...(p.shaft || SHAFTS[p.item]), [nx, ny]);
        break;
      case "barbell":
        line(g, OX - 11, OY + ny, OX + 10, OY + ny, "#8a8e96");
        for (const x of [-12, 9]) P(x, ny - 2, 2, 5, "#3a3e46");
        break;
      case "tablet":
        P(nx - 1, ny - 2, 5, 4, "#3a3e4a");
        P(nx, ny - 1, 3, 2, "#6ad0e0");
        break;
    }
  };

  if (rank >= 4) {
    g.fillStyle = shade(shirt, -0.35);
    for (let r = 0; r < 8; r++) g.fillRect(OX - 4 + lean - Math.floor(r / 3), OY + ttop + r, 6 + Math.floor(r / 4), 1);
  }
  if (special === "scarf") {
    const flap = (o.frame || 0) % 2;
    P(-6 + lean, ttop + flap, 3, 2, collar);
    P(-8 + lean, ttop + 1 + flap, 2, 2, collar);
  }
  // Limbs behind the body: the far leg and arm, or from behind both arms.
  leg(farLimb);
  if (p.behind) [0, 1].forEach(k => p.behind[k] && arm(k));
  else if (side || !jointed) arm(farLimb);
  else if (back) arm(0), arm(1);
  leg(near);
  // Shorts and shirt.
  P(-3 + hl, tb - 2, 6, 2, shorts);
  if (p.sit) P(-3 + hl, tb - 1, 7, 2, shorts);
  // Explicit pelvis offsets let the lower body lead a still-closed chest. Connect the shirt
  // to those hips rather than translating the whole athlete into a backward lean.
  const torsoX = (row) => p.hip == null ? lean : Math.round(lean + (hl - lean) * row / 4);
  for (let row = 0; row < 4; row++) {
    const x = torsoX(row);
    P(-3 + x, ttop + row, 6, 1, shirt);
    P(-3 + x, ttop + row, 1, 1, shade(shirt, 0.2));
    P(2 + x, ttop + row, 1, 1, shade(shirt, -0.22));
  }
  // Kit patterns use the trim colour over the shirt.
  const trim = (x, y, w, h, color = collar) => {
    for (let row = y; row < y + h; row++) P(x + torsoX(row), ttop + row, w, 1, color);
  };
  if (o.kit === "stripes") trim(-2, 1, 1, 3), trim(0, 1, 1, 3), trim(2, 1, 1, 3, shade(collar, -0.22));
  else if (o.kit === "hoops") trim(-3, 2, 6, 1);
  else if (o.kit === "sash") trim(-3, 1, 2, 1), trim(-2, 2, 2, 1), trim(-1, 3, 2, 1);
  else if (o.kit === "halves") trim(0, 1, 2, 3), trim(2, 1, 1, 3, shade(collar, -0.22));
  P(-1 + lean, ttop, 3, 1, collar);
  if (rank >= 3) P(torsoX(2), ttop + 2, 1, 1, GOLD);
  if (special === "scarf") trim(-3, 0, 6, 2);

  // Head.
  const H = (x, y, w, h, c) => P(hx + (p.headFlip ? 12 - x - w : x), hy + y, w, h, c);
  const mask = (c, from = 0, to = 11) => {
    for (let r = from; r < to; r++) H(HEAD[r][0], r, HEAD[r][1], 1, c);
  };
  if (fur) {
    mask(hair);
    for (const [x, y] of [[-1, 3], [-1, 6], [12, 4], [12, 7], [3, -1], [7, -1], [4, 11], [8, 11]]) H(x, y, 1, 1, hair);
    H(side ? 4 : 3, 4, 8, 6, skin);
    H(side ? 4 : 3, 4, 8, 1, shade(skin, 0.2));
  } else {
    mask(skin);
    H(1, 9, 10, 1, shade(skin, -0.08));
  }
  const hairHi = shade(hair, 0.3);
  if (metal) {
    mask(hair, 0, 4);
    H(5, -3, 1, 3, "#7a8a96");
    H(5, -4, 1, 1, "#e85a50");
  } else if (kid) {
    mask(collar, 0, 4);
    H(9, 3, 5, 1, shade(collar, -0.2));
    H(0, 3, 2, 3, hair);
  } else if (!fur) {
    const st = look.style || 0;
    if (st === 8) {
      // Buzz cut: a short fuzz over the crown.
      mask(mix(hair, skin, 0.3), 0, 3);
      for (const x of [2, 5, 8]) H(x, 1, 1, 1, hair);
    } else if (st === 12) {
      // Bald on top, neat at the sides.
      H(0, 3, 2, 4, hair);
      H(10, 3, 2, 4, hair);
      H(3, 1, 3, 1, shade(skin, 0.25));
    } else if (st === 4) {
      H(1, -2, 10, 1, hair);
      H(-1, -1, 14, 4, hair);
      H(-1, 3, 3, 5, hair);
      H(2, -2, 3, 1, hairHi);
    } else {
      mask(hair, 0, 3);
      H(0, 3, 3, 5, hair);
      H(3, 3, 3, 1, hair);
      H(7, 3, 1, 1, hair);
      H(11, 3, 1, 2, hair);
      H(3, 1, 4, 1, hairHi);
    }
    if (st === 1) for (const x of [2, 5, 8]) H(x, -1, 2, 1, hair), H(5, -2, 1, 1, hair);
    if (st === 2) {
      H(-3, 3, 3, 6, hair);
      H(-1, 3, 1, 1, collar);
    }
    if (st === 3) {
      H(0, 3, 3, 7, hair);
      H(10, 3, 2, 5, hair);
      H(3, 3, 6, 1, hair);
    }
    if (st === 5) H(-1, 3, 4, 11, hair);
    // A mullet hangs behind the neck; a high ponytail swings off the back of the crown.
    if (st === 7) H(-1, 3, 3, 9, hair), H(11, 4, 2, 7, hair);
    if (st === 9) H(-3, 1, 3, 2, hair), H(-4, 3, 2, 6, hair), H(-2, 1, 1, 1, collar);
    if (st === 10) {
      H(-1, 3, 2, 10, hair), H(11, 3, 2, 10, hair);
      H(-1, 12, 2, 1, collar), H(11, 12, 2, 1, collar);
    }
    if (st === 11) for (const [x, y] of [[1, -1], [4, -2], [7, -2], [10, -1], [-1, 2], [12, 2]]) H(x, y, 2, 2, hair);
    if (st === 6) {
      H(2, -3, 5, 3, hair);
      H(3, -3, 2, 1, hairHi);
    }
  }
  // From behind the hair covers the whole head.
  if (back && !metal) {
    if (kid) mask(collar, 0, 4), mask(hair, 4, 10);
    else mask(hair, 0, 10);
  }
  // In profile the hair covers the back of the head down to an ear.
  if (side && !fur && !metal) {
    H(0, 3, 4, 5, hair);
    H(1, 8, 2, 1, hair);
    H(4, 6, 1, 2, shade(skin, -0.15));
  }
  const facial = special === "beard" ? "full" : look.facial;
  if (facial === "full" && !back) {
    H(5, 8, 7, 3, hair);
    H(6, 8, 5, 1, shade(hair, -0.2));
    if (!side) H(1, 8, 4, 3, hair);
  } else if (facial === "stubble" && !back) H(side ? 5 : 1, 9, side ? 7 : 10, 2, mix(skin, hair, 0.3));
  if (rank >= 2 && !metal && !kid) {
    H(0, 3, 12, 1, rank >= 3 ? GOLD : collar);
    H(-2, 3, 2, 2, rank >= 3 ? GOLD : collar);
  }
  // Face: small dot eyes and rosy cheeks.
  const face = p.face || o.face,
    eyes = side ? [9] : [5, 9],
    mx = side ? 3 : 0;
  if (back);
  else if (metal) {
    H(side ? 6 : 3, 5, side ? 6 : 9, 2, "#4ad0e8");
    H(side ? 8 : 4, 5, 3, 1, "#c8f8ff");
  } else {
    for (const x of eyes) {
      if (face === "blink" || face === "sleep") H(x - 1, 7, 2, 1, EYE);
      else if (face === "happy") {
        H(x - 1, 7, 1, 1, EYE);
        H(x, 6, 1, 1, EYE);
        H(x + 1, 7, 1, 1, EYE);
      } else if (face === "strain") {
        H(x - 1, 7, 2, 1, EYE);
        H(x, 6, 1, 1, EYE);
      } else H(x, 6, 1, 2, EYE);
    }
    if (side) H(7, 8, 2, 1, BLUSH);
    else {
      H(2, 8, 2, 1, BLUSH);
      if (!fur) H(10, 8, 1, 1, BLUSH);
    }
    if (facial !== "full") {
      if (face === "happy") H(6 + mx, 9, 3, 1, "#8a3a30"), H(7 + mx, 10, 1, 1, "#e07070");
      else if (face === "sad") H(6 + mx, 9, 3, 1, shade(skin, -0.35));
      else if (face === "strain") H(6 + mx, 9, 2, 1, "#8a3a30");
      else H(7 + mx, 9, 1, 1, "#a05040");
    }
    if (special === "granny") {
      H(side ? 7 : 3, 5, side ? 5 : 9, 1, "#9a8a80");
      for (const x of side ? [7, 11] : [3, 7, 11]) H(x, 6, 1, 2, "#9a8a80");
    }
  }
  // A moustache sits over the mouth, a goatee under it.
  if (!back && !metal && (facial === "moustache" || facial === "walrus")) H(side ? 6 : 5 + mx, 8, facial === "walrus" ? 5 : 4, 1, hair);
  if (!back && !metal && facial === "goatee") H(side ? 7 : 6, 10, 2, 1, hair);
  if (look.glasses && !back && !metal) {
    const frame = look.glassesColor || "#3a3440";
    if (side) H(8, 5, 3, 1, frame), H(10, 6, 1, 1, frame);
    else H(4, 5, 3, 1, frame), H(8, 5, 3, 1, frame), H(7, 6, 1, 1, frame);
  }
  // Accessories: sunglasses over the eyes, a sweatband or a cap. From behind only the band and cap show.
  const gear = look.gear, gc = look.gearColor || "#e04a3a";
  if (gear === "shades" && !back && !metal) {
    if (side) H(7, 5, 5, 2, "#1c2028"), H(8, 5, 2, 1, "#5a6a80");
    else H(3, 5, 8, 2, "#1c2028"), H(4, 5, 2, 1, "#5a6a80"), H(8, 5, 2, 1, "#5a6a80");
  }
  if (gear === "band" && !metal && !(rank >= 2)) {
    H(0, 3, 12, 1, gc);
    H(0, 4, 12, 1, shade(gc, -0.25));
  }
  if (gear === "cap" && !metal) {
    H(1, -1, 10, 4, gc);
    H(2, -1, 8, 1, shade(gc, 0.25));
    H(5, 0, 2, 1, shade(gc, -0.3));
    if (side) H(10, 2, 4, 1, shade(gc, -0.2));
    else if (!back) H(2, 3, 8, 1, shade(gc, -0.2));
  }
  // Arms in front of the body and head: the near arm, or from the front both.
  if (p.behind) [farLimb, near].forEach(k => !p.behind[k] && arm(k, true));
  else if (side || !jointed) arm(near, true);
  else if (!back) arm(farLimb, true), arm(near, true);
  if (javelin) item(hands[hold]);
}

const cache = new Map();
export function sprite(o) {
  // Bound the moving-pose cache while retaining many in-betweens per contact interval.
  if (o.blend) o = { ...o, blend: { ...o.blend, t: Math.round(o.blend.t * 32) / 32,
    ...(Number.isFinite(o.blend.turn) ? { turn: Math.round(o.blend.turn * 32) / 32, hipTurn: Math.round((o.blend.hipTurn ?? o.blend.turn) * 32) / 32 } : {}) } };
  const key = JSON.stringify([o.look, o.shirt, o.collar, o.shorts, o.kit, o.rank, o.pose, o.frame, o.event, o.flip, o.face, o.released, o.blend]);
  let c = cache.get(key);
  if (c) return c;
  const base = canvas(SPRITE_W, SPRITE_H);
  drawFigure(base.getContext("2d"), o);
  c = outlined(base);
  if (o.flip) c = flipped(c);
  if (cache.size > 900) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}
// The run frame for a runner who has covered `dist` pixels. Each run frame carries the planted
// foot about RUN_STRIDE pixels back, so stepping by distance keeps that foot fixed on the ground;
// frames on a clock let the body outrun the legs and the feet slide forward, like running backwards.
export const RUN_STRIDE = 3.5;
export const runFrame = (dist) => {
  const n = POSES.run.length;
  return ((Math.floor(dist / RUN_STRIDE) % n) + n) % n;
};
export const WALK_STRIDE = 3;
export const walkFrame = (dist) => ((Math.floor(dist / WALK_STRIDE) % 4) + 4) % 4;
// Where a jointed pose's holding hand is, from the feet at scale 1: hammer chains hang from it.
export function gripOf(o) {
  const p = resolvedPose(o);
  if (!p.legs) return [1, -12];
  const [hx, hy] = poseArmJoints(p)[p.hold ?? 1][2], x = hx + 1;
  return [o.flip ? -x : x, hy + 1];
}
// [far, near] arms as [shoulder, elbow, hand], unflipped, from the sprite origin at scale 1.
export function armJointsOf(o) {
  const p = resolvedPose(o);
  return p.legs ? poseArmJoints(p) : null;
}
// The implement's centre can sit below the palm, as with the discus's overhand grip.
export function implementPointOf(o) {
  const [x, y] = gripOf(o);
  return o.event === "discus" ? [x + (o.flip ? -1 : 1), y + 3] : [x, y];
}
// Front edge of the shoes, including their outline, from the sprite origin at scale 1.
// Movement must leave room for the whole foot, rather than only keeping the body behind a line.
export function frontFootOf(o) {
  return Math.max(...feetOf(o).map(([x]) => o.flip ? 1 - x : x + 4));
}
// The shoes of a pose, unflipped, from the sprite origin at scale 1: [left, right] for throws,
// whichever is nearer the camera, so a foot can be followed through a turn; [far, near] otherwise.
export function feetOf(o) {
  const p = resolvedPose(o);
  if (!p.legs) return p.feet.map(footAt);
  const feet = p.legs.map((l) => l[1]);
  return o.pose === "throw" && p.hold === 0 ? feet.reverse() : feet;
}
// Draw a figure with its feet at (x, y). Scale must be an integer to stay crisp.
export function figure(g, o, x, y, scale = 1) {
  const c = sprite(o);
  g.drawImage(c, Math.round(x - OX * scale), Math.round(y - OY * scale), SPRITE_W * scale, SPRITE_H * scale);
}
export function shadow(g, x, y, w = 6) {
  g.fillStyle = "rgba(30,40,30,0.28)";
  g.fillRect(Math.round(x - w), Math.round(y), w * 2, 1);
  g.fillRect(Math.round(x - w + 1), Math.round(y - 1), w * 2 - 2, 1);
}
// Athlete → sprite options.
export function athleteLook(a, colors, extra = {}) {
  const shorts = colors.shorts === "trim" ? shade(colors.secondary, -0.1) : SHORTS_COLORS[colors.shorts];
  return { look: a.look, shirt: colors.primary, collar: colors.secondary, kit: colors.kit, ...(shorts ? { shorts } : {}), rank: a.rank || 0, ...extra };
}
