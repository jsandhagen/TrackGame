import { canvas, mix } from "./pixel.js";

// Portraits are their own drawing rather than a crop of the field sprite: a 32×32 bust, front on,
// with eyes, brows, ears, a nose and a mouth, the hair and facial hair the look describes, and the
// kit (or a shopkeeper's apron) across the shoulders. Painted at whole-number scale so it stays crisp.
export const BUST = 32;
const GOLD = "#f2c94c";

// How a face is set: which eyes, brows and mouth, and any extra blush, bags or sweat.
export const EXPRESSIONS = {
  smile: { eyes: "open", brows: "level", mouth: "smile" },
  happy: { eyes: "happy", brows: "level", mouth: "happy" },
  grin: { eyes: "happy", brows: "raised", mouth: "grin" },
  smirk: { eyes: "open", brows: "one", mouth: "smirk" },
  determined: { eyes: "narrow", brows: "angry", mouth: "flat" },
  fierce: { eyes: "narrow", brows: "angry", mouth: "teeth" },
  calm: { eyes: "closed", brows: "level", mouth: "smile" },
  cheeky: { eyes: "wink", brows: "one", mouth: "tongue" },
  shy: { eyes: "aside", brows: "worried", mouth: "small", blush: true },
  deadpan: { eyes: "half", brows: "level", mouth: "flat" },
  surprised: { eyes: "wide", brows: "raised", mouth: "o" },
  sad: { eyes: "open", brows: "worried", mouth: "sad" },
  tired: { eyes: "half", brows: "worried", mouth: "small", bags: true, sweat: true },
  strain: { eyes: "narrow", brows: "angry", mouth: "strain" },
  blink: { eyes: "line", brows: "level", mouth: "smile" },
  sleep: { eyes: "line", brows: "level", mouth: "small" },
};
// Each background has two faces it tends to wear; the athlete's id picks one, so a squad of the
// same background still varies.
const PERSONALITY = {
  farm: ["grin", "smile"], lumberjack: ["smile", "determined"], gymnast: ["smile", "determined"], dancer: ["calm", "smile"],
  sprinter: ["determined", "grin"], chess: ["smirk", "deadpan"], poker: ["deadpan", "smirk"], marathon: ["calm", "smile"],
  clown: ["cheeky", "grin"], bloomer: ["shy", "smile"], showboat: ["grin", "cheeky"], prodigy: ["smirk", "grin"],
};
// The face a portrait wears: one asked for, then the character's own, unless they feel awful or low.
export function expressionOf(a, asked) {
  if (asked) return asked;
  const mood = Number.isFinite(a?.condition) ? Math.floor(a.condition / 20) : 2;
  if (mood <= 0) return "sad";
  if (mood === 1) return "tired";
  if (a?.look?.expression) return a.look.expression;
  const pair = PERSONALITY[a?.background];
  return pair ? pair[Math.abs(a.id | 0) % 2] : "smile";
}

// ---- Colour: hue-shifted ramps -------------------------------------------------------------
// Pixel artists shift hue along a ramp rather than only darkening: shadows lean cool (skin leans
// warm, toward red), highlights lean toward a warm yellow, or toward blue on near-black hair.
const rgbOf = (c) => {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function hslOf(c) {
  const [r, g, b] = rgbOf(c).map((v) => v / 255),
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn,
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn),
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hexOf(h, s, l) {
  const k = (n) => (n + h / 30) % 12,
    a = s * Math.min(l, 1 - l),
    f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
}
const toward = (h, target, deg) => {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
};
const ramps = new Map();
export function ramp(c, step, shadowHue = 250) {
  const key = c + step + ":" + shadowHue;
  if (ramps.has(key)) return ramps.get(key);
  let [h, s, l] = hslOf(c);
  if (step < 0) {
    h = toward(h, shadowHue, -step * 7);
    s = Math.min(1, s + -step * 0.025);
    l = Math.max(0.05, l + step * 0.105);
  } else {
    h = toward(h, l < 0.2 ? 215 : 48, step * 8);
    s = Math.max(0, s - step * 0.02);
    l = Math.min(0.96, l + step * 0.1);
  }
  const out = hexOf(h, s, l);
  ramps.set(key, out);
  return out;
}
const lightness = (c) => hslOf(c)[2];

// ---- The head ----------------------------------------------------------------------------------
// A round "mochi" face, rows y 5–22, [x0, width], centred between x 15 and 16, with full cheeks.
// The steps along the curve are even (2, 1, 1 at the top, mirrored at the chin) so it reads clean.
const HEAD_TOP = 5;
const HEAD = [[11, 10], [9, 14], [8, 16], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [8, 16], [9, 14], [10, 12], [12, 8]];
const KID_HEAD = HEAD.map(([x, w], r) => (r > 12 && r < 17 ? [x - 1, w + 2] : [x, w]));
// Big eyes, 3×4 at x 11 and x 18, rows 13–16: one eye-width apart and mirrored about the face's
// centre, so they read as a natural pair rather than set too wide. Brows sit at row 11, the mouth
// at row 19 just under the eyes, and the nose is a single shadow pixel.
const EYES = [11, 18],
  EYE_Y = 13,
  MOUTH_Y = 19;

function drawBust(g, o) {
  const look = o.look || {},
    special = look.special,
    fur = special === "yeti",
    metal = special === "robot",
    kid = special === "kid",
    role = o.role,
    rank = o.rank || 0;
  const P = (x, y, w = 1, h = 1, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  const skin = metal ? "#b8c4cc" : look.skin || "#e2b08a",
    skinLo = ramp(skin, -1, 10),
    skinLo2 = ramp(skin, -2, 10),
    skinHi = ramp(skin, 1),
    hair = look.hair || "#3a2a20",
    hairLo = ramp(hair, -1.3),
    hairLo2 = ramp(hair, -2.2),
    hairHi = ramp(hair, 1.4),
    hairHi2 = ramp(hair, 2.4),
    shirt = o.shirt || "#2f6b52",
    collar = o.collar || "#e2b04a",
    broad = look.build === "broad",
    style = look.style || 0;
  // Warm features: a mouth line from the skin's own deep shadow, soft blush, a coloured iris.
  // On deep skin a dark line would vanish, so the mouth goes lighter and rosier and the iris warmer,
  // keeping every feature readable at its smallest size.
  const deep = lightness(skin) < 0.36;
  const MOUTH = deep ? mix(skin, "#f0a0a0", 0.5) : hexOf(...(([h, s2, l]) => [toward(h, 5, 12), Math.min(0.6, s2 + 0.1), Math.max(0.18, l * 0.45)])(hslOf(skin))),
    INSIDE = deep ? "#2a0c14" : "#5a2230",
    TONGUE = "#e8787a",
    BLUSH = mix(skin, "#ff6a78", 0.42),
    iris = look.eyeColor || (lightness(hair) > 0.55 && lightness(skin) > 0.7 ? "#4a78b0" : deep ? "#b07848" : "#7a4a30"),
    irisHi = ramp(iris, 1.6);
  const head = kid ? KID_HEAD : HEAD;
  const rowsOf = (from, to, c, inset = 0) => {
    for (let r = from; r < to; r++) P(head[r][0] + inset, HEAD_TOP + r, head[r][1] - inset * 2, 1, c);
  };
  // Hair drawn as spans per row: [y, [x0, x1], …], inclusive.
  const spans = (rows, c = hair) => rows.forEach(([y, ...runs]) => runs.forEach(([a, b]) => P(a, y, b - a + 1, 1, c)));

  // ---- Behind the head: capes and long hair.
  if (rank >= 4 && !role) {
    const cape = ramp(shirt, -2);
    P(broad ? 2 : 3, 24, broad ? 28 : 26, 8, cape);
    P(broad ? 1 : 2, 27, broad ? 30 : 28, 5, cape);
  }
  if (!fur && !metal) {
    if (style === 5) P(5, 10, 22, 18, hair), P(5, 10, 2, 18, hairHi), P(23, 10, 4, 18, hairLo), P(6, 26, 2, 2, hairLo);
    if (style === 3) P(5, 10, 22, 11, hair), P(22, 10, 5, 11, hairLo);
    if (style === 7) P(7, 15, 18, 11, hair), P(19, 15, 6, 11, hairLo), P(8, 24, 4, 2, hairHi);
    if (style === 9) P(23, 6, 4, 5, hair), P(24, 11, 4, 11, hair), P(26, 11, 2, 11, hairLo), P(25, 21, 3, 2, hairLo2), P(24, 7, 1, 3, hairHi), P(23, 10, 3, 1, collar);
  }

  // ---- Shoulders and chest, lit from the left.
  const sx = broad ? 3 : 5,
    sw = 32 - sx * 2,
    shirtHi = ramp(shirt, 1),
    shirtLo = ramp(shirt, -1.2);
  P(sx + 2, 24, sw - 4, 1, shirt);
  P(sx + 1, 25, sw - 2, 1, shirt);
  P(sx, 26, sw, 6, shirt);
  P(sx + 1, 25, 3, 1, shirtHi), P(sx, 26, 2, 6, shirtHi);
  P(sx + sw - 3, 25, 2, 1, shirtLo), P(sx + sw - 3, 26, 3, 6, shirtLo);
  const kit = o.kit;
  if (kit === "stripes") for (let x = sx + 3; x < sx + sw - 2; x += 4) P(x, 25, 2, 7, collar);
  else if (kit === "hoops") P(sx, 28, sw, 2, collar), P(sx + sw - 3, 28, 3, 2, ramp(collar, -1));
  else if (kit === "sash") for (let r = 0; r < 8; r++) P(sx + 3 + r * 2, 24 + r, 4, 1, collar);
  else if (kit === "check") for (let y = 24; y < 32; y += 2) for (let x = sx + (y % 4 ? 2 : 0); x < sx + sw; x += 4) P(x, y, 2, 2, ramp(shirt, -0.8));
  else if (kit === "halves") P(16, 24, sx + sw - 16, 8, collar), P(sx + sw - 3, 25, 3, 7, ramp(collar, -1));
  // The neck sits in the head's shadow.
  if (!fur) {
    const nx = broad ? 12 : 13, nw = broad ? 8 : 6;
    P(nx, 21, nw, 4, metal ? "#8a96a0" : skinLo);
    P(nx, 21, nw, 1, metal ? "#6a7680" : skinLo2);
  }
  if (role === "shopkeeper") {
    const apron = o.apron || "#6a4a32";
    P(11, 24, 4, 2, collar), P(17, 24, 4, 2, collar), P(18, 24, 3, 2, ramp(collar, -1));
    P(12, 26, 8, 6, apron), P(12, 26, 1, 6, ramp(apron, 1)), P(18, 26, 2, 6, ramp(apron, -1));
    P(9, 24, 2, 4, apron), P(21, 24, 2, 4, apron);
    P(14, 28, 4, 3, ramp(apron, -1.4));
    P(15, 27, 1, 2, "#e8c050"), P(15, 26, 1, 1, "#e07070");
  } else if (role === "helper") {
    // A cardigan over a collared blouse, and a lanyard.
    P(12, 24, 8, 8, collar), P(18, 24, 2, 8, ramp(collar, -1));
    P(13, 24, 2, 2, "#fbf6ea"), P(17, 24, 2, 2, "#fbf6ea");
    P(15, 26, 2, 6, ramp(collar, -1.4));
    P(14, 30, 4, 2, "#fbf6ea"), P(15, 30, 2, 1, shirt);
  } else {
    // A vest's neckline in the trim colour.
    P(12, 24, 8, 1, collar);
    P(13, 25, 6, 1, collar);
    P(14, 24, 4, 1, metal ? "#8a96a0" : skinLo);
    P(14, 26, 4, 1, ramp(collar, -1.2));
    if (rank >= 3) P(15, 28, 3, 3, GOLD), P(15, 28, 1, 1, ramp(GOLD, 1.5)), P(17, 30, 1, 1, ramp(GOLD, -1.5)), P(14, 26, 1, 2, "#d04a4a"), P(18, 26, 1, 2, "#d04a4a");
    // A competition number pinned to the vest.
    if (o.bib) P(12, 27, 8, 5, "#f8f4ea"), P(12, 27, 8, 1, "#d8d0c0"), P(13, 29, 2, 2, "#3a3e56"), P(16, 29, 3, 2, "#3a3e56"), P(17, 29, 1, 1, "#f8f4ea");
  }

  // ---- Ears, then the face: flat skin lit from the top left, shade down the right and under the chin.
  const earsHidden = [3, 5, 10].includes(style);
  if (!fur && !metal && !earsHidden && !kid) {
    P(5, 14, 2, 4, skin), P(25, 14, 2, 4, skinLo);
    P(6, 15, 1, 2, skinLo), P(25, 15, 1, 2, skinLo2);
  }
  if (metal) P(4, 12, 3, 6, "#9aa6b0"), P(25, 12, 3, 6, "#7a8a96");
  rowsOf(0, head.length, fur ? hair : skin);
  if (!fur) {
    rowsOf(head.length - 1, head.length, skinLo);
    P(head[16][0] + 1, HEAD_TOP + 16, head[16][1] - 2, 1, skinLo), P(head[16][0] + 1, HEAD_TOP + 16, 3, 1, skin);
  }

  // ---- Facial hair under the features; a moustache goes over the mouth afterwards.
  const beard = special === "beard" ? "full" : look.facial;
  if (!fur && !metal && beard === "stubble") {
    const shadow = mix(skin, hair, 0.26), fleck = mix(skin, hair, 0.48);
    for (let r = 13; r < head.length; r++) {
      const [x0, w] = head[r];
      P(x0, HEAD_TOP + r, w, 1, shadow);
      for (let x = x0 + (r % 2); x < x0 + w; x += 3) P(x, HEAD_TOP + r, 1, 1, fleck);
    }
  } else if (!fur && !metal && beard === "full") {
    P(7, 13, 2, 5, hair), P(23, 13, 2, 5, hairLo);
    for (let r = 13; r < head.length; r++) P(head[r][0], HEAD_TOP + r, head[r][1], 1, hair);
    P(9, 23, 14, 1, hair), P(11, 24, 10, 1, hairLo);
    for (let r = 13; r < head.length; r++) P(head[r][0] + head[r][1] - 2, HEAD_TOP + r, 2, 1, hairLo);
    P(9, 21, 3, 1, hairHi), P(10, 23, 2, 1, hairHi);
    // The cheeks show above it.
    P(9, 17, 3, 1, skin), P(20, 17, 3, 1, skinLo), P(12, 17, 8, 1, skin);
  } else if (!fur && !metal && beard === "goatee") {
    P(14, 20, 4, 3, hair), P(16, 20, 2, 3, hairLo), P(15, 23, 2, 1, hairLo);
  }

  // ---- The face itself: eyes, nose, cheeks and mouth as the expression sets them.
  const expr = EXPRESSIONS[o.face] || EXPRESSIONS.smile;
  if (fur) {
    const face = look.skin || "#a8c0d8";
    P(10, 11, 12, 11, face), P(9, 12, 14, 9, face);
    P(10, 11, 12, 1, ramp(face, 1)), P(21, 12, 1, 9, ramp(face, -1));
    for (const [x, y] of [[4, 9], [5, 6], [26, 8], [27, 12], [4, 15], [26, 17], [9, 3], [15, 2], [21, 3], [6, 21], [25, 21]]) P(x, y, 2, 2, hair), P(x + 1, y + 1, 1, 1, hairLo);
  }
  if (metal) {
    P(8, 12, 16, 6, "#2a3440");
    P(9, 13, 14, 4, "#4ad0e8");
    P(10, 13, 5, 1, "#c8f8ff"), P(19, 16, 3, 1, "#2aa0c0");
    if (expr.eyes === "happy" || expr.eyes === "closed") P(9, 15, 14, 2, "#2a3440"), P(10, 14, 3, 1, "#2a3440"), P(19, 14, 3, 1, "#2a3440");
    P(11, 19, 10, 2, "#5a6670");
    for (let x = 12; x < 21; x += 2) P(x, 19, 1, 2, "#9aa6b0");
    P(7, 5, 18, 2, "#7a8a96");
    P(15, 1, 2, 4, "#7a8a96"), P(14, 0, 4, 2, "#e85a50"), P(14, 0, 1, 1, "#ffb0a0");
  } else {
    const EYE = "#2a2030",
      SHINE = "#ffffff";
    // Each eye returns the row of its upper lash line, for lashes and make-up.
    const eye = (x, kind) => {
      const y = EYE_Y;
      switch (kind) {
        case "happy": P(x, y + 2, 1, 1, EYE), P(x + 1, y + 1, 1, 1, EYE), P(x + 2, y + 2, 1, 1, EYE); return y + 1;
        case "closed": P(x, y + 1, 1, 1, EYE), P(x + 1, y + 2, 1, 1, EYE), P(x + 2, y + 1, 1, 1, EYE); return y + 1;
        case "line": P(x, y + 2, 3, 1, EYE); return y + 2;
        case "half":
          P(x, y, 3, 1, skinLo2), P(x, y + 1, 3, 2, EYE), P(x, y + 2, 1, 1, SHINE);
          P(x, y + 3, 3, 1, iris), P(x + 1, y + 3, 1, 1, irisHi);
          return y + 1;
        case "narrow":
          P(x, y + 1, 3, 2, EYE), P(x, y + 2, 1, 1, SHINE);
          P(x, y + 3, 3, 1, iris), P(x + 1, y + 3, 1, 1, irisHi);
          return y + 1;
        case "wide":
          P(x, y - 1, 3, 1, EYE), P(x, y, 3, 4, "#f8f4f0"), P(x + 1, y + 1, 1, 2, EYE), P(x + 1, y + 1, 1, 1, SHINE), P(x + 1, y + 2, 1, 1, iris);
          return y - 1;
        case "aside":
          // Glancing down and aside: the dark of the eye pools in the lower corner.
          P(x, y, 3, 1, EYE), P(x, y + 1, 1, 2, "#f8f4f0"), P(x + 1, y + 1, 2, 2, EYE), P(x + 1, y + 1, 1, 1, SHINE);
          P(x, y + 3, 3, 1, iris), P(x + 2, y + 3, 1, 1, irisHi);
          return y;
        default:
          // A dark eye with its shine in the top-left corner (the same corner on both eyes) and
          // the coloured iris catching light along the bottom.
          P(x, y, 3, 3, EYE), P(x, y + 1, 1, 1, SHINE);
          P(x, y + 3, 3, 1, iris), P(x + 1, y + 3, 1, 1, irisHi);
          return y;
      }
    };
    const lashY = [eye(EYES[0], expr.eyes === "wink" ? "happy" : expr.eyes), eye(EYES[1], expr.eyes === "wink" ? "open" : expr.eyes)];
    if (look.lashes && expr.eyes !== "line") P(EYES[0] - 1, lashY[0] - 1, 1, 1, EYE), P(EYES[0] - 1, lashY[0], 1, 1, EYE), P(EYES[1] + 3, lashY[1] - 1, 1, 1, EYE), P(EYES[1] + 3, lashY[1], 1, 1, EYE);
    if (look.shadow && expr.eyes !== "line") P(EYES[0] - 1, lashY[0] - 1, 3, 1, look.shadow), P(EYES[1] + 1, lashY[1] - 1, 3, 1, look.shadow);
    if (expr.bags) P(EYES[0], EYE_Y + 4, 3, 1, skinLo), P(EYES[1], EYE_Y + 4, 3, 1, skinLo);
    // A minimal nose: one shadow pixel on the side away from the light.
    if (!fur) P(16, 17, 1, 1, skinLo);
    else P(15, 17, 2, 1, "#4a5a6a");
    // Cheeks: a soft blush under the outer corner of each eye; shy faces flush with hatching.
    if (beard !== "full") {
      const [bl, br] = [EYES[0] - 2, EYES[1] + 2];
      P(bl, 17, 3, 1, BLUSH), P(br, 17, 3, 1, BLUSH);
      if (expr.blush) P(bl, 18, 3, 1, BLUSH), P(br, 18, 3, 1, BLUSH), P(bl + 1, 17, 1, 1, ramp(BLUSH, -1.5)), P(br + 1, 17, 1, 1, ramp(BLUSH, -1.5));
    } else P(EYES[0] - 1, 17, 2, 1, BLUSH), P(EYES[1] + 2, 17, 2, 1, BLUSH);
    // The mouth, small and tucked under the eyes.
    const y = MOUTH_Y;
    switch (expr.mouth) {
      case "happy": P(13, y - 1, 6, 1, INSIDE), P(14, y, 4, 1, INSIDE), P(15, y, 2, 1, TONGUE); break;
      case "grin": P(12, y - 1, 8, 1, INSIDE), P(13, y - 1, 6, 1, "#fbf6ea"), P(13, y, 6, 1, INSIDE), P(15, y, 2, 1, TONGUE), P(14, y + 1, 4, 1, INSIDE); break;
      case "smirk": P(15, y, 3, 1, MOUTH), P(18, y - 1, 1, 1, MOUTH); break;
      case "flat": P(14, y, 4, 1, MOUTH); break;
      case "teeth": P(13, y - 1, 6, 1, INSIDE), P(13, y, 6, 1, "#fbf6ea"), P(15, y, 1, 1, "#c8c0b8"), P(17, y, 1, 1, "#c8c0b8"), P(13, y + 1, 6, 1, INSIDE); break;
      case "tongue": P(14, y, 4, 1, MOUTH), P(13, y - 1, 1, 1, MOUTH), P(18, y - 1, 1, 1, MOUTH), P(16, y + 1, 2, 1, TONGUE), P(17, y + 1, 1, 1, ramp(TONGUE, -1)); break;
      case "small": P(15, y, 2, 1, MOUTH); break;
      case "o": P(15, y - 1, 2, 1, MOUTH), P(14, y, 1, 1, MOUTH), P(17, y, 1, 1, MOUTH), P(15, y + 1, 2, 1, MOUTH), P(15, y, 2, 1, INSIDE); break;
      case "sad": P(14, y, 4, 1, MOUTH), P(13, y + 1, 1, 1, MOUTH), P(18, y + 1, 1, 1, MOUTH); break;
      case "strain": P(13, y - 1, 6, 2, INSIDE), P(14, y - 1, 4, 1, "#fbf6ea"); break;
      default: P(14, y, 4, 1, MOUTH), P(13, y - 1, 1, 1, MOUTH), P(18, y - 1, 1, 1, MOUTH);
    }
    if (expr.sweat) P(25, 9, 1, 2, "#8ad0f0"), P(24, 11, 3, 2, "#8ad0f0"), P(24, 11, 1, 1, "#e8f8ff");
  }

  if (!fur && !metal && (beard === "moustache" || beard === "walrus")) {
    const w = beard === "walrus" ? 12 : 8, x0 = 16 - w / 2;
    // Under the nose and over the top lip, so the mouth still shows beneath it.
    P(x0 + 1, 16, w - 2, 1, hair), P(x0, 17, w, 1, hair), P(x0, 18, 2, 1, hair), P(x0 + w - 2, 18, 2, 1, hair);
    P(x0 + 2, 16, 2, 1, hairHi), P(x0 + w - 3, 17, 3, 1, hairLo);
  }

  // ---- Hair: a full shape over the head, locks that taper to points, a shine band on the lit side
  // and shade down the far side.
  const crown = () => {
    spans([[4, [10, 21]], [5, [8, 23]], [6, [7, 24]], [7, [6, 25]], [8, [6, 25]], [9, [6, 25]], [10, [6, 8], [23, 25]], [11, [6, 8], [23, 25]], [12, [6, 7], [24, 25]], [13, [6, 7], [24, 25]]]);
    spans([[5, [21, 23]], [6, [22, 24]], [7, [23, 25]], [8, [23, 25]], [9, [24, 25]], [10, [24, 25]], [11, [24, 25]], [12, [25, 25]], [13, [25, 25]]], hairLo);
  };
  const shine = () => {
    spans([[5, [11, 13]], [6, [9, 10], [14, 15]]], hairHi);
    P(11, 5, 1, 1, hairHi2), P(9, 7, 1, 1, hairHi), P(7, 9, 1, 2, hairHi);
  };
  if (kid) {
    // A cap in the trim colour, peak forward.
    rowsOf(0, 5, collar);
    P(19, HEAD_TOP, 6, 5, ramp(collar, -1));
    P(6, 9, 20, 2, ramp(collar, -1.2)), P(6, 9, 6, 1, ramp(collar, -0.4));
    P(10, 6, 4, 1, ramp(collar, 1.4));
    P(6, 11, 3, 4, hair), P(23, 11, 3, 4, hairLo);
  } else if (!fur && !metal) {
    switch (style) {
      case 1: // spiky crop
        crown();
        spans([[1, [10, 10], [15, 15], [20, 20]], [2, [9, 11], [14, 16], [19, 21]], [3, [8, 23]]]);
        spans([[2, [20, 21]], [3, [20, 23]]], hairLo);
        spans([[10, [9, 11], [13, 15], [17, 19], [21, 22]], [11, [10, 10], [14, 14], [18, 18], [22, 22]]]);
        shine();
        break;
      case 2: // swept fringe and a side ponytail tied in the trim colour
        crown();
        spans([[10, [6, 14], [20, 25]], [11, [6, 11], [22, 25]], [12, [6, 9]]]);
        P(2, 10, 4, 4, hair), P(1, 13, 4, 8, hair), P(2, 20, 2, 2, hairLo), P(1, 13, 1, 7, hairHi), P(4, 10, 2, 2, collar);
        shine();
        break;
      case 3: // bob with blunt bangs
        crown();
        spans([[10, [6, 25]], [11, [6, 8], [10, 12], [14, 16], [18, 20], [22, 25]]]);
        spans([[12, [5, 8], [23, 26]], [13, [5, 8], [23, 26]], [14, [5, 7], [24, 26]], [15, [5, 7], [24, 26]], [16, [5, 7], [24, 26]], [17, [5, 7], [24, 26]], [18, [5, 7], [24, 26]], [19, [5, 8], [23, 26]], [20, [6, 8], [23, 25]]]);
        spans([[12, [24, 26]], [16, [24, 26]], [20, [23, 25]]], hairLo);
        shine();
        break;
      case 4: // big, voluminous hair
        spans([[1, [10, 21]], [2, [7, 24]], [3, [5, 26]], [4, [4, 27]], [5, [4, 27]], [6, [3, 28]], [7, [3, 28]], [8, [3, 28]], [9, [3, 28]], [10, [3, 8], [23, 28]], [11, [3, 7], [24, 28]], [12, [3, 7], [24, 28]], [13, [4, 7], [24, 27]], [14, [4, 6], [25, 27]], [15, [4, 6], [25, 27]], [16, [5, 6], [25, 26]]]);
        spans([[2, [21, 24]], [4, [24, 27]], [6, [25, 28]], [8, [25, 28]], [10, [25, 28]], [12, [25, 28]], [14, [25, 27]], [16, [25, 26]]], hairLo);
        spans([[10, [9, 12], [19, 22]], [11, [10, 11], [20, 21]]]);
        spans([[3, [9, 13]], [4, [7, 8]], [5, [6, 6]]], hairHi), P(10, 2, 2, 1, hairHi2);
        break;
      case 5: // long, parted in the middle
        crown();
        spans([[10, [6, 12], [19, 25]], [11, [6, 9], [22, 25]], [12, [6, 8], [23, 25]]]);
        P(15, 4, 1, 3, hairLo2), P(16, 4, 1, 4, hairLo);
        shine();
        break;
      case 6: // a bun on top, swept back
        crown();
        spans([[0, [13, 18]], [1, [12, 19]], [2, [12, 19]], [3, [12, 19]]]);
        spans([[1, [17, 19]], [2, [18, 19]], [3, [12, 19]]], hairLo);
        P(13, 1, 2, 1, hairHi), P(13, 0, 1, 1, hairHi2);
        spans([[10, [6, 7], [24, 25]]]);
        spans([[6, [12, 12], [17, 17]], [7, [11, 11], [18, 18]]], hairLo);
        shine();
        break;
      case 7: // mullet: short and spiky in front, the party at the back
        crown();
        spans([[10, [9, 12], [15, 17], [21, 22]], [11, [10, 11], [16, 16]]]);
        P(5, 12, 2, 8, hair), P(25, 12, 2, 8, hairLo), P(5, 12, 1, 6, hairHi);
        shine();
        break;
      case 8: { // buzz cut: fuzz close to the skull, no fringe
        const fuzz = mix(hair, skin, 0.3), fuzzLo = mix(hairLo, skin, 0.3);
        spans([[5, [11, 20]], [6, [9, 22]], [7, [8, 23]], [8, [7, 24]], [9, [7, 24]], [10, [7, 8], [23, 24]], [11, [7, 7], [24, 24]]], fuzz);
        spans([[6, [20, 22]], [7, [21, 23]], [8, [22, 24]], [9, [23, 24]], [10, [23, 24]], [11, [24, 24]]], fuzzLo);
        for (let y = 5; y < 10; y++) for (let x = 8 + (y % 3); x < 23; x += 3) P(x, y, 1, 1, hair);
        P(11, 6, 3, 1, mix(fuzz, "#ffffff", 0.25));
        break;
      }
      case 9: // high ponytail, swept back
        crown();
        spans([[10, [6, 9], [20, 25]], [11, [6, 7], [23, 25]]]);
        spans([[6, [11, 11], [14, 14]], [7, [10, 10], [13, 13]]], hairLo);
        shine();
        break;
      case 10: // long braids with beads
        crown();
        spans([[10, [6, 25]], [11, [6, 7], [24, 25]]]);
        for (let x = 10; x < 23; x += 3) P(x, 6, 1, 4, hairLo), P(x + 1, 6, 1, 1, hairHi);
        // A thick plait each side, in front of the shoulders, tipped with a bead.
        P(6, 10, 2, 5, hair), P(24, 10, 2, 5, hairLo);
        for (const [x, lo] of [[4, false], [25, true]]) {
          P(x, 12, 3, 15, lo ? hairLo : hair);
          for (let y = 12; y < 27; y += 3) P(x, y, 2, 1, lo ? hair : hairHi), P(x + 1, y + 1, 2, 1, lo ? hairLo2 : hairLo);
          P(x, 27, 3, 2, collar), P(x, 27, 1, 1, ramp(collar, 1.4));
        }
        break;
      case 11: // curls
        crown();
        for (const [x, y] of [[8, 3], [11, 2], [15, 2], [19, 3], [5, 6], [24, 6], [5, 10], [24, 10], [9, 9], [13, 9], [17, 9], [21, 9]]) {
          P(x, y, 3, 3, hair), P(x + 1, y - 1, 1, 1, hair), P(x - 1, y + 1, 1, 1, hair);
          P(x, y, 1, 1, hairHi), P(x + 2, y + 2, 1, 1, hairLo);
        }
        break;
      case 12: // bald on top, neat at the sides
        spans([[10, [6, 8], [23, 25]], [11, [5, 8], [23, 26]], [12, [5, 7], [24, 26]], [13, [5, 7], [24, 26]], [14, [6, 7], [24, 25]]]);
        spans([[11, [25, 26]], [12, [25, 26]], [13, [25, 26]]], hairLo);
        P(10, 6, 4, 1, skinHi), P(9, 7, 2, 1, skinHi), P(11, 5, 2, 1, ramp(skin, 2));
        break;
      default: // short, side-parted fringe swept right
        crown();
        spans([[10, [6, 13], [16, 18], [22, 25]], [11, [7, 10], [17, 17], [23, 25]], [12, [8, 8]]]);
        P(13, 4, 1, 3, hairLo2);
        shine();
    }
    // The fringe casts a one-pixel shadow onto the forehead.
    castShadow(g, skin, skinLo);
  }

  // ---- Brows sit over the hair, in the hair's dark shade, so the expression always reads.
  if (!metal) {
    const brow = fur ? "#6a7a8a" : look.brow || (lightness(hair) > 0.6 ? ramp(hair, -2.4) : hairLo2);
    const [l, r] = [EYES[0], EYES[1]], y = EYE_Y - 2;
    switch (expr.brows) {
      case "raised": P(l, y - 1, 3, 1, brow), P(r, y - 1, 3, 1, brow); break;
      case "one": P(l, y, 3, 1, brow), P(r, y - 1, 3, 1, brow); break;
      case "angry": P(l, y - 1, 2, 1, brow), P(l + 2, y, 1, 1, brow), P(r, y, 1, 1, brow), P(r + 1, y - 1, 2, 1, brow); break;
      case "worried": P(l, y, 2, 1, brow), P(l + 2, y - 1, 1, 1, brow), P(r, y - 1, 1, 1, brow), P(r + 1, y, 2, 1, brow); break;
      default: P(l, y, 3, 1, brow), P(r, y, 3, 1, brow);
    }
  }

  // Ranks: a headband in the trim colour, gold for Stars and Legends.
  if (rank >= 2 && !metal && !kid && !role && look.gear !== "band") {
    const band = rank >= 3 ? GOLD : collar;
    P(6, 8, 20, 2, band), P(6, 8, 6, 1, ramp(band, 1)), P(6, 9, 20, 1, ramp(band, -1)), P(21, 8, 5, 1, ramp(band, -0.6));
    P(3, 9, 3, 3, band), P(2, 11, 2, 3, ramp(band, -1));
  }

  // ---- Accessories.
  const gear = look.gear,
    gc = look.gearColor || "#e04a3a";
  if (special === "granny" || look.glasses) {
    const frame = look.glassesColor || (special === "granny" ? "#9a8a80" : "#3a3440");
    for (const x of EYES) {
      P(x - 1, 12, 5, 1, frame), P(x - 1, 17, 5, 1, frame), P(x - 1, 12, 1, 6, frame), P(x + 3, 12, 1, 6, frame);
      P(x + 2, 13, 1, 1, "#ffffff");
    }
    P(EYES[0] + 4, 14, EYES[1] - EYES[0] - 5, 1, frame);
    P(6, 14, EYES[0] - 7, 1, frame), P(EYES[1] + 4, 14, 26 - EYES[1] - 4, 1, frame);
  }
  if (gear === "shades" && !metal) {
    const lens = "#1c2030";
    // Two lenses mirrored about the centre, a bridge and the arms back to the ears.
    for (const x of EYES) P(x - 1, 13, 5, 4, lens), P(x, 13, 2, 1, "#6a7a98"), P(x, 14, 1, 1, "#4a5a78");
    P(EYES[0] + 4, 13, EYES[1] - EYES[0] - 5, 1, lens);
    P(5, 13, EYES[0] - 6, 1, lens), P(EYES[1] + 4, 13, 27 - EYES[1] - 4, 1, lens);
  }
  if (gear === "band" && !metal) {
    P(6, 7, 20, 3, gc), P(6, 7, 7, 1, ramp(gc, 1.2)), P(6, 9, 20, 1, ramp(gc, -1)), P(21, 7, 5, 2, ramp(gc, -0.6));
  }
  if (gear === "cap" && !metal) {
    spans([[3, [10, 21]], [4, [8, 23]], [5, [7, 24]], [6, [6, 25]], [7, [6, 25]], [8, [6, 25]]], gc);
    spans([[3, [18, 21]], [4, [20, 23]], [5, [21, 24]], [6, [22, 25]], [7, [22, 25]], [8, [22, 25]]], ramp(gc, -1));
    P(10, 5, 4, 1, ramp(gc, 1.2)), P(15, 3, 2, 1, ramp(gc, -1.5));
    P(5, 9, 22, 2, ramp(gc, -0.8)), P(5, 9, 8, 1, ramp(gc, 0.3)), P(6, 11, 20, 1, ramp(gc, -2));
  }
  if (special === "scarf") {
    P(7, 22, 18, 4, collar), P(7, 22, 18, 1, ramp(collar, 1)), P(20, 22, 5, 4, ramp(collar, -1));
    P(18, 25, 4, 7, collar), P(20, 26, 2, 6, ramp(collar, -1.2));
  }
}

// Where the hair's lowest pixel in a column sits over bare skin, that skin falls into shade.
function castShadow(g, skin, skinLo) {
  const data = g.getImageData(0, 0, BUST, BUST),
    d = data.data,
    [sr, sg, sb] = rgbOf(skin),
    [lr, lg, lb] = rgbOf(skinLo),
    isSkin = (i) => d[i + 3] > 200 && d[i] === sr && d[i + 1] === sg && d[i + 2] === sb;
  const hairAbove = new Set();
  for (let y = 5; y < 16; y++)
    for (let x = 6; x < 26; x++) {
      const i = (y * BUST + x) * 4, above = ((y - 1) * BUST + x) * 4;
      if (isSkin(i) && d[above + 3] > 200 && !isSkin(above) && !hairAbove.has(x)) {
        hairAbove.add(x);
        d[i] = lr, d[i + 1] = lg, d[i + 2] = lb;
      }
    }
  g.putImageData(data, 0, 0);
}

// Selective outline: instead of one dark line all round, each edge takes a deep shade of the colour
// it borders, a little lighter on the top and left where the light falls.
function selOut(src) {
  const w = src.width,
    h = src.height,
    d = src.getContext("2d").getImageData(0, 0, w, h).data,
    out = canvas(w, h),
    o = out.getContext("2d");
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  const hex = (x, y) => {
    const i = (y * w + x) * 4;
    return "#" + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      const near = [[x, y + 1, true], [x + 1, y, true], [x - 1, y, false], [x, y - 1, false]].find(([nx, ny]) => solid(nx, ny));
      if (!near) continue;
      const [nx, ny, lit] = near;
      // Keep the bordering colour's family: nudge the hue a little toward violet, deepen it, and
      // cap the lightness so even pale colours get a line that reads.
      const [hh, ss, ll] = hslOf(hex(nx, ny));
      o.fillStyle = hexOf(toward(hh, 275, 18), Math.min(0.55, ss * 0.55 + 0.1), Math.min(lit ? 0.26 : 0.19, ll * (lit ? 0.42 : 0.32)));
      o.fillRect(x, y, 1, 1);
    }
  o.drawImage(src, 0, 0);
  return out;
}

const cache = new Map();
function bust(o) {
  const key = JSON.stringify([o.look, o.shirt, o.collar, o.kit, o.rank, o.face, o.role, o.apron, o.bib]);
  let c = cache.get(key);
  if (c) return c;
  const base = canvas(BUST, BUST);
  drawBust(base.getContext("2d", { willReadFrequently: true }), o);
  c = selOut(base);
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}

// Paint a portrait into a canvas. The canvas is resized to a whole multiple of the bust so each
// pixel stays square; CSS decides how large it shows.
export function portrait(cv, a, colors = {}, opts = {}) {
  const k = Math.max(2, Math.round(Math.max(cv.width, cv.height) / BUST)),
    size = BUST * k;
  if (cv.width !== size) cv.width = size;
  if (cv.height !== size) cv.height = size;
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, size, size);
  g.drawImage(bust({ look: a.look, shirt: colors.primary, collar: colors.secondary, kit: colors.kit, rank: a.rank || 0, face: expressionOf(a, opts.face), role: opts.role, apron: opts.apron, bib: opts.bib }), 0, 0, size, size);
}
