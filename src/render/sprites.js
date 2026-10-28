import { canvas, outlined, flipped, shade, line, ellipse } from "./pixel.js";
import { SHORTS_COLORS } from "../game-content.js";

// Chibi figures: a big head, a small body, a crisp outline. Drawn facing right on a
// 44×40 canvas with the feet at (22, 36); cached per look/pose/frame.
export const SPRITE_W = 44,
  SPRITE_H = 40,
  OX = 22,
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
  walk: [
    { feet: [[-5, -1], [2, -1]], hands: [[3, -10], [-4, -10]] },
    { feet: [[-2, -2], [-1, -1]], hands: [[0, -10], [0, -10]], dy: -1 },
    { feet: [[2, -1], [-5, -1]], hands: [[-4, -10], [3, -10]] },
    { feet: [[-1, -1], [-2, -2]], hands: [[0, -10], [0, -10]], dy: -1 },
  ],
  run: [
    { feet: [[-7, -2], [4, -1]], hands: [[5, -13], [-6, -11]], lean: 1 },
    { feet: [[-3, -3], [0, -1]], hands: [[1, -11], [-1, -12]], dy: -1, lean: 1 },
    { feet: [[4, -1], [-7, -2]], hands: [[-6, -11], [5, -13]], lean: 1 },
    { feet: [[0, -1], [-3, -3]], hands: [[-1, -12], [1, -11]], dy: -1, lean: 1 },
  ],
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
  wave: [
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [5, -22]], face: "happy" },
    { feet: [[-4, -1], [1, -1]], hands: [[-5, -10], [7, -21]], face: "happy" },
  ],
  carry: [
    { feet: [[-5, -1], [2, -1]], hands: [[3, -10], [3, -28]], elbows: [[-3, -7], [10, -19]], item: "jav" },
    { feet: [[-2, -2], [-1, -1]], hands: [[0, -10], [3, -28]], elbows: [[-5, -8], [10, -19]], item: "jav", dy: -1 },
    { feet: [[2, -1], [-5, -1]], hands: [[-4, -10], [3, -28]], elbows: [[-7, -7], [10, -19]], item: "jav" },
    { feet: [[-1, -1], [-2, -2]], hands: [[0, -10], [3, -28]], elbows: [[-5, -8], [10, -19]], item: "jav", dy: -1 },
  ],
  jog: null,
};
POSES.jog = POSES.run;
// Event throws: 0–3 ready, wind, release, follow; 4–7 technique; 8–9 recovery.
// Elbows use the same authored coordinates as hands, without the head-clearance adjustment.
const THROWS = {
  shot: [
    { feet: [[-5, -1], [2, -1]], hands: [[-7, -15], [3, -18]], elbows: [[-7, -11], [10, -13]], item: "shot", crouch: 1 },
    { feet: [[-7, -1], [3, -1]], hands: [[-8, -12], [2, -17]], elbows: [[-8, -9], [10, -14]], item: "shot", crouch: 3, lean: -1, face: "strain" },
    { feet: [[-4, -2], [4, -1]], hands: [[-6, -12], [12, -24]], elbows: [[-8, -10], [8, -19]], lean: 2, face: "strain" },
    { feet: [[-4, -4], [4, -1]], hands: [[-6, -16], [10, -18]], elbows: [[-8, -12], [10, -14]], lean: 2 },
    // Back of the circle, bent low with the shot at the neck; the glide; a spin step.
    { feet: [[-6, -1], [3, -1]], hands: [[-7, -12], [-3, -17]], elbows: [[-8, -9], [-10, -12]], item: "shot", crouch: 4, lean: 2, face: "strain" },
    { feet: [[-9, -1], [4, -2]], hands: [[-8, -12], [-3, -17]], elbows: [[-9, -9], [-10, -12]], item: "shot", crouch: 3, lean: 1, face: "strain" },
    { feet: [[-2, -2], [2, -1]], hands: [[-9, -15], [3, -18]], elbows: [[-8, -12], [10, -13]], item: "shot", crouch: 2, dy: -1, face: "strain" },
    { feet: [[2, -1], [-3, -2]], hands: [[-9, -15], [3, -18]], elbows: [[-8, -12], [10, -13]], item: "shot", crouch: 2, face: "strain" },
    // Reverse the feet to brake, then let the throwing arm fold and settle.
    { feet: [[-5, -3], [1, -1]], hands: [[-7, -12], [4, -11]], elbows: [[-8, -9], [9, -10]], crouch: 2, lean: 1 },
    { feet: [[-4, -1], [2, -1]], hands: [[-5, -10], [4, -10]], elbows: [[-6, -9], [6, -9]] },
  ],
  discus: [
    { feet: [[-5, -1], [2, -1]], hands: [[5, -14], [-9, -13]], elbows: [[0, -12], [-3, -13]], item: "disc", crouch: 1 },
    { feet: [[-7, -1], [3, -1]], hands: [[5, -14], [-11, -16]], elbows: [[0, -12], [-4, -15]], item: "disc", crouch: 2, lean: -1, face: "strain" },
    { feet: [[-4, -2], [4, -1]], hands: [[-6, -13], [13, -18]], elbows: [[-8, -10], [8, -16]], lean: 1, face: "strain" },
    { feet: [[-3, -3], [3, -1]], hands: [[-7, -12], [3, -16]], elbows: [[-8, -10], [10, -14]], lean: 2 },
    // Pre-swings back and forward, then two spin steps with the arm long.
    { feet: [[-5, -1], [2, -1]], hands: [[-4, -12], [-11, -14]], elbows: [[-6, -10], [-4, -14]], item: "disc", crouch: 1 },
    { feet: [[-5, -1], [2, -1]], hands: [[-6, -12], [10, -15]], elbows: [[-7, -10], [7, -14]], item: "disc", crouch: 1 },
    { feet: [[-2, -2], [3, -1]], hands: [[-10, -16], [11, -16]], elbows: [[-8, -14], [7, -15]], item: "disc", crouch: 2, dy: -1, face: "strain" },
    { feet: [[1, -1], [-3, -2]], hands: [[-10, -15], [11, -15]], elbows: [[-8, -13], [7, -14]], item: "disc", crouch: 2, face: "strain" },
    { feet: [[-5, -3], [1, -1]], hands: [[-8, -13], [-4, -12]], elbows: [[-8, -10], [5, -9]], crouch: 2, lean: 1 },
    { feet: [[-4, -1], [2, -1]], hands: [[-5, -10], [4, -11]], elbows: [[-6, -9], [6, -9]] },
  ],
  hammer: [
    { feet: [[-5, -1], [2, -1]], hands: [[1, -11], [2, -11]], elbows: [[-3, -10], [4, -10]], crouch: 1 },
    { feet: [[-5, -1], [2, -1]], hands: [[4, -25], [6, -25]], elbows: [[-2, -21], [10, -20]], face: "strain" },
    { feet: [[-4, -2], [3, -1]], hands: [[10, -25], [12, -25]], elbows: [[3, -20], [8, -20]], lean: 1, face: "strain" },
    { feet: [[-3, -3], [3, -1]], hands: [[9, -20], [11, -20]], elbows: [[2, -17], [8, -17]], lean: 1 },
    // Winds dip low in front; turns sit back against the pull with the arms long.
    { feet: [[-5, -1], [2, -1]], hands: [[-1, -10], [0, -10]], elbows: [[-3, -10], [2, -10]], crouch: 2 },
    { feet: [[-2, -2], [3, -1]], hands: [[9, -15], [11, -15]], elbows: [[2, -14], [7, -14]], crouch: 2, lean: -1, face: "strain" },
    { feet: [[2, -1], [-3, -2]], hands: [[9, -15], [11, -15]], elbows: [[2, -14], [7, -14]], crouch: 2, lean: -1, dy: -1, face: "strain" },
    { feet: [[-2, -2], [3, -1]], hands: [[-9, -15], [-11, -15]], elbows: [[-7, -14], [-3, -14]], crouch: 2, lean: 1, face: "strain" },
    { feet: [[-5, -2], [2, -1]], hands: [[3, -15], [5, -15]], elbows: [[-2, -12], [7, -12]], crouch: 2 },
    { feet: [[-4, -1], [2, -1]], hands: [[-2, -10], [3, -10]], elbows: [[-5, -9], [5, -9]] },
  ],
  jav: [
    { feet: [[-5, -1], [2, -1]], hands: [[-3, -11], [3, -28]], elbows: [[-6, -8], [10, -19]], item: "jav" },
    { feet: [[-7, -1], [3, -1]], hands: [[5, -12], [-8, -19]], elbows: [[0, -11], [-5, -16]], item: "javback", crouch: 1, lean: -2, face: "strain" },
    { feet: [[-6, -2], [5, -1]], hands: [[-6, -12], [12, -27]], elbows: [[-8, -10], [9, -21]], lean: 2, face: "strain" },
    { feet: [[-6, -4], [5, -1]], hands: [[-6, -12], [10, -15]], elbows: [[-8, -10], [11, -18]], lean: 3 },
    // Crossover steps with the javelin drawn back, then the block on a straight front leg.
    { feet: [[3, -3], [-5, -1]], hands: [[5, -12], [-8, -19]], elbows: [[0, -11], [-5, -16]], item: "javback", lean: -1, dy: -1 },
    { feet: [[-5, -1], [3, -2]], hands: [[5, -12], [-8, -19]], elbows: [[0, -11], [-5, -16]], item: "javback", lean: -1 },
    { feet: [[-8, -1], [5, -1]], hands: [[5, -14], [-7, -21]], elbows: [[1, -13], [3, -20]], armBehindHead: true, item: "javback", lean: -2, crouch: 1, face: "strain" },
    // Hip drive lifts the elbow first; the hand and spear stay back until release.
    { feet: [[-8, -2], [5, -1]], hands: [[-3, -12], [-4, -25]], elbows: [[-6, -10], [8, -22]], armBehindHead: true, item: "javback", lean: 1, face: "strain" },
    { feet: [[-7, -3], [2, -1]], hands: [[-6, -12], [2, -10]], elbows: [[-7, -9], [8, -12]], crouch: 2, lean: 2 },
    { feet: [[-4, -1], [2, -1]], hands: [[-5, -10], [4, -10]], elbows: [[-6, -9], [6, -9]], lean: 1 },
  ],
};
export const THROW_FRAMES = { ready: 0, wind: 1, release: 2, follow: 3 };

function poseData(pose, frame, event) {
  if (pose === "throw") {
    const list = THROWS[event || "shot"];
    return list[frame] || list[frame % 4];
  }
  const list = POSES[pose] || POSES.idle;
  return list[frame % list.length];
}

// Pose tables were authored for a taller body; scale them onto the chibi proportions.
// Raised hands move out beside (or above) the big head so they stay visible.
function handAt([x, y]) {
  const [sx, ny] = jointAt([x, y]);
  let nx = sx;
  if (ny < -10) nx = nx < 1 ? Math.min(nx, -9) : Math.max(nx, 7);
  return [nx, ny];
}
const jointAt = ([x, y]) => [Math.round(x * 0.8), y >= -14 ? Math.round(y * 0.6) : Math.round(-8 + (y + 14) * 1.05)];
const footAt = ([x, y]) => [Math.round(x * 0.75), Math.max(-3, y)];

// Grip centre relative to the feet, in sprite pixels. Props and flight start at the drawn hand.
export function throwGrip(event, frame, { flip = false, look = {} } = {}) {
  const p = poseData("throw", frame, event),
    [hx, hy] = handAt(p.hands[1]),
    lean = Math.round((p.lean || 0) * 0.7),
    dy = Math.round(((p.dy || 0) + (p.crouch || 0)) * 0.7) + (look.special === "kid" ? 1 : 0),
    x = hx + Math.round(lean / 2) + 1;
  return [flip ? -x : x, hy + dy + 1];
}
// Rounded 12×11 head mask, row by row: [x0, width].
const HEAD = [[2, 8], [1, 10], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [1, 10], [2, 8]];

function drawFigure(g, o) {
  const look = o.look || {},
    special = look.special,
    p = poseData(o.pose, o.frame || 0, o.event);
  const P = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(OX + x, OY + y, w, h);
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
  const dy = Math.round(((p.dy || 0) + (p.crouch || 0)) * 0.7) + (kid ? 1 : 0),
    lean = Math.round((p.lean || 0) * 0.7);
  const tb = -4 + dy, // hip line
    ttop = tb - 6; // top of the shirt
  const hx = -6 + lean,
    hy = ttop - 11 + (p.drop || 0);
  const [farFoot, nearFoot] = p.feet.map(footAt),
    [farHand, nearHand] = p.hands.map(handAt).map(([x, y]) => [x + Math.round(lean / 2), y + dy]);
  const elbows = p.elbows?.map(jointAt).map(([x, y]) => [x + Math.round(lean / 2), y + dy]);
  const arm = (near, color) => {
    const hand = near ? nearHand : farHand,
      shoulder = [(near ? 2 : -3) + lean, ttop + 1],
      elbow = elbows?.[near ? 1 : 0];
    if (elbow) {
      line(g, OX + shoulder[0], OY + shoulder[1], OX + elbow[0], OY + elbow[1], color, 2);
      line(g, OX + elbow[0], OY + elbow[1], OX + hand[0] + 1, OY + hand[1] + 1, color, 2);
    } else line(g, OX + shoulder[0], OY + shoulder[1], OX + hand[0] + 1, OY + hand[1] + 1, color, 2);
    P(hand[0], hand[1], 2, 2, color);
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
  // Far leg and arm, slightly darker.
  const far = shade(limb, -0.18);
  line(g, OX - 2 + lean / 2, OY + tb, OX + farFoot[0] + 1, OY + farFoot[1] - 1, far, 2);
  P(farFoot[0], farFoot[1], 3, 1, shade(SHOE, -0.2));
  arm(false, far);
  // Near leg.
  line(g, OX + 1 + lean / 2, OY + tb, OX + nearFoot[0] + 1, OY + nearFoot[1] - 1, limb, 2);
  P(nearFoot[0], nearFoot[1], 3, 1, SHOE);
  P(nearFoot[0] + 2, nearFoot[1], 1, 1, collar);
  // Shorts and shirt.
  P(-3 + lean, tb - 2, 6, 2, shorts);
  if (p.sit) P(-3 + lean, tb - 1, 7, 2, shorts);
  P(-3 + lean, ttop, 6, 4, shirt);
  P(-3 + lean, ttop, 1, 4, shade(shirt, 0.2));
  P(2 + lean, ttop, 1, 4, shade(shirt, -0.22));
  // Kit patterns use the trim colour over the shirt.
  const trim = (x, y, w, h) => P(x + lean, ttop + y, w, h, collar);
  if (o.kit === "stripes") trim(-2, 1, 1, 3), trim(0, 1, 1, 3), P(2 + lean, ttop + 1, 1, 3, shade(collar, -0.22));
  else if (o.kit === "hoops") trim(-3, 2, 6, 1);
  else if (o.kit === "sash") trim(-3, 1, 2, 1), trim(-2, 2, 2, 1), trim(-1, 3, 2, 1);
  else if (o.kit === "halves") trim(0, 1, 2, 3), P(2 + lean, ttop + 1, 1, 3, shade(collar, -0.22));
  P(-1 + lean, ttop, 3, 1, collar);
  if (rank >= 3) P(0 + lean, ttop + 2, 1, 1, GOLD);
  if (special === "scarf") P(-3 + lean, ttop, 6, 2, collar);

  // A cocked javelin forearm passes behind the head, leaving the face readable.
  if (p.armBehindHead) arm(true, limb);
  // Head.
  const H = (x, y, w, h, c) => P(hx + x, hy + y, w, h, c);
  const mask = (c, from = 0, to = 11) => {
    for (let r = from; r < to; r++) H(HEAD[r][0], r, HEAD[r][1], 1, c);
  };
  if (fur) {
    mask(hair);
    for (const [x, y] of [[-1, 3], [-1, 6], [12, 4], [12, 7], [3, -1], [7, -1], [4, 11], [8, 11]]) H(x, y, 1, 1, hair);
    H(3, 4, 8, 6, skin);
    H(3, 4, 8, 1, shade(skin, 0.2));
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
    if (st === 4) {
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
    if (st === 6) {
      H(2, -3, 5, 3, hair);
      H(3, -3, 2, 1, hairHi);
    }
  }
  if (special === "beard") {
    H(5, 8, 7, 3, hair);
    H(6, 8, 5, 1, shade(hair, -0.2));
  }
  if (rank >= 2 && !metal && !kid) {
    H(0, 3, 12, 1, rank >= 3 ? GOLD : collar);
    H(-2, 3, 2, 2, rank >= 3 ? GOLD : collar);
  }
  // Face: small dot eyes and rosy cheeks.
  const face = p.face || o.face,
    eyes = [5, 9];
  if (metal) {
    H(3, 5, 9, 2, "#4ad0e8");
    H(4, 5, 3, 1, "#c8f8ff");
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
    H(2, 8, 2, 1, BLUSH);
    if (!fur) H(10, 8, 1, 1, BLUSH);
    if (special !== "beard") {
      if (face === "happy") H(6, 9, 3, 1, "#8a3a30"), H(7, 10, 1, 1, "#e07070");
      else if (face === "sad") H(6, 9, 3, 1, shade(skin, -0.35));
      else if (face === "strain") H(6, 9, 2, 1, "#8a3a30");
      else H(7, 9, 1, 1, "#a05040");
    }
    if (special === "granny") {
      H(3, 5, 9, 1, "#9a8a80");
      for (const x of [3, 7, 11]) H(x, 6, 1, 2, "#9a8a80");
    }
  }
  // Near arm last, in front of the body.
  if (!p.armBehindHead) arm(true, limb);
  P(2 + lean, ttop, 1, 2, shirt);
  P(nearHand[0], nearHand[1], 2, 2, limb);
  if (rank >= 1) P(nearHand[0], nearHand[1] + 2, 2, 1, collar);
  const [nx, ny] = nearHand;
  switch (p.item) {
    case "shot":
      ellipse(g, OX + nx + 2, OY + ny, 2, 2, "#585c66");
      P(nx + 1, ny - 1, 1, 1, "#9aa0aa");
      break;
    case "disc":
      P(nx - 1, ny - 1, 4, 2, "#d8c890");
      P(nx, ny - 1, 2, 1, "#8a7a50");
      break;
    case "jav":
      line(g, OX + nx - 9, OY + ny + 2, OX + nx + 10, OY + ny - 2, "#efe6c8");
      P(nx + 9, ny - 2, 2, 1, "#6a6a70");
      P(nx, ny, 2, 1, "#b0503a");
      break;
    case "javback":
      line(g, OX + nx - 8, OY + ny + 3, OX + nx + 11, OY + ny - 4, "#efe6c8");
      P(nx + 10, ny - 4, 2, 1, "#6a6a70");
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
}

const cache = new Map();
export function sprite(o) {
  const key = JSON.stringify([o.look, o.shirt, o.collar, o.shorts, o.kit, o.rank, o.pose, o.frame, o.event, o.flip, o.face]);
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
// Portrait: head and shoulders cropped from the idle figure.
export function portrait(cv, a, colors, opts = {}) {
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);
  const c = sprite(athleteLook(a, colors, { pose: opts.pose || "idle", frame: 0, face: opts.face }));
  const sx = OX - 8,
    sy = OY - 24,
    size = 16,
    scale = Math.floor(Math.min(cv.width, cv.height) / size);
  const off = (cv.width - size * scale) / 2;
  g.drawImage(c, sx, sy, size, size, Math.round(off), Math.round(cv.height - size * scale), size * scale, size * scale);
}
