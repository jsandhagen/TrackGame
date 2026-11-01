import { canvas, outlined, shade, mix, OUTLINE } from "./pixel.js";

// Portraits are their own drawing rather than a crop of the field sprite: a 32×32 bust, front on,
// with eyes, brows, ears, a nose and a mouth, the hair and facial hair the look describes, and the
// kit (or a shopkeeper's apron) across the shoulders. Painted at whole-number scale so it stays crisp.
export const BUST = 32;
const EYE = "#2a2028",
  WHITE = "#fbf6ea",
  BLUSH = "#ef8f84",
  GOLD = "#f2c94c",
  LIP = "#8a3a30";

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

// The head: rows y 5–22, [x0, width], centred on x 16.
const HEAD_TOP = 5;
const HEAD = [[11, 10], [9, 14], [8, 16], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [7, 18], [8, 16], [8, 16], [9, 14], [10, 12], [12, 8]];
const KID_HEAD = HEAD.map(([x, w], r) => (r > 12 ? [x - 1, w + 2] : [x, w]));

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
    skinLo = shade(skin, -0.14),
    skinHi = shade(skin, 0.18),
    hair = look.hair || "#3a2a20",
    hairLo = shade(hair, -0.28),
    hairHi = shade(hair, 0.32),
    shirt = o.shirt || "#2f6b52",
    collar = o.collar || "#e2b04a",
    broad = look.build === "broad",
    style = look.style || 0;
  const head = kid ? KID_HEAD : HEAD;
  const rowsOf = (from, to, c, inset = 0) => {
    for (let r = from; r < to; r++) P(head[r][0] + inset, HEAD_TOP + r, head[r][1] - inset * 2, 1, c);
  };

  // Long hair and capes hang behind the shoulders.
  if (rank >= 4 && !role) {
    P(broad ? 2 : 3, 24, broad ? 28 : 26, 8, shade(shirt, -0.4));
    P(broad ? 1 : 2, 27, broad ? 30 : 28, 5, shade(shirt, -0.4));
  }
  if (!fur && !metal) {
    if (style === 5) P(6, 9, 20, 18, hair), P(6, 9, 2, 18, hairLo), P(24, 9, 2, 18, hairLo);
    if (style === 3) P(6, 10, 20, 11, hair);
    if (style === 10) {
      for (const x of [5, 8, 21, 24]) P(x, 12, 3, 16, hair), P(x + 1, 12, 1, 16, hairHi);
      for (const x of [6, 9, 22, 25]) P(x, 27, 1, 2, collar);
    }
    if (style === 7) P(7, 15, 18, 10, hair), P(8, 23, 16, 2, hairLo), P(7, 16, 1, 7, hairLo), P(24, 16, 1, 7, hairLo);
    if (style === 9) P(23, 8, 4, 4, hair), P(24, 12, 4, 9, hair), P(25, 20, 3, 3, hairLo), P(23, 9, 2, 2, collar);
  }

  // Shoulders and chest.
  const sx = broad ? 3 : 5,
    sw = 32 - sx * 2;
  P(sx + 2, 24, sw - 4, 1, shirt);
  P(sx + 1, 25, sw - 2, 1, shirt);
  P(sx, 26, sw, 6, shirt);
  P(sx, 26, 2, 6, shade(shirt, 0.18));
  P(sx + sw - 2, 26, 2, 6, shade(shirt, -0.2));
  // Kit patterns on the chest, in the trim colour.
  const kit = o.kit;
  if (kit === "stripes") for (let x = sx + 3; x < sx + sw - 2; x += 4) P(x, 25, 2, 7, collar);
  else if (kit === "hoops") P(sx, 28, sw, 2, collar);
  else if (kit === "sash") for (let r = 0; r < 8; r++) P(sx + 3 + r * 2, 24 + r, 4, 1, collar);
  else if (kit === "check") for (let y = 24; y < 32; y += 2) for (let x = sx + (y % 4 ? 2 : 0); x < sx + sw; x += 4) P(x, y, 2, 2, shade(shirt, -0.16));
  else if (kit === "halves") P(16, 24, sx + sw - 16, 8, collar), P(16, 24, 1, 8, shade(collar, -0.2));
  // Neck and collar.
  if (!fur) {
    const nx = broad ? 12 : 13, nw = broad ? 8 : 6;
    P(nx, 21, nw, 4, metal ? "#8a96a0" : skinLo);
    P(nx, 21, nw, 1, shade(skinLo, -0.12));
  }
  if (role === "shopkeeper") {
    // Shirt collar, then a bib apron with a pocket and a pencil.
    P(11, 24, 4, 2, collar), P(17, 24, 4, 2, collar);
    P(12, 26, 8, 6, o.apron || "#6a4a32");
    P(12, 26, 1, 6, shade(o.apron || "#6a4a32", 0.15));
    P(9, 24, 2, 4, o.apron || "#6a4a32"), P(21, 24, 2, 4, o.apron || "#6a4a32");
    P(14, 28, 4, 3, shade(o.apron || "#6a4a32", -0.25));
    P(15, 27, 1, 2, "#e8c050"), P(15, 26, 1, 1, "#e07070");
  } else if (role === "helper") {
    // A cardigan over a collared blouse, and a lanyard.
    P(12, 24, 8, 8, collar);
    P(13, 24, 2, 2, WHITE), P(17, 24, 2, 2, WHITE);
    P(15, 26, 2, 6, shade(collar, -0.18));
    P(14, 30, 4, 2, WHITE), P(15, 30, 2, 1, shirt);
  } else {
    // A vest's neckline in the trim colour.
    P(12, 24, 8, 1, collar);
    P(13, 25, 6, 1, collar);
    P(14, 24, 4, 1, metal ? "#8a96a0" : skinLo);
    P(14, 26, 4, 1, shade(collar, -0.2));
    if (rank >= 3) P(15, 28, 3, 3, GOLD), P(16, 29, 1, 1, shade(GOLD, -0.3)), P(14, 26, 1, 2, "#d04a4a"), P(18, 26, 1, 2, "#d04a4a");
    // A competition number pinned to the vest.
    if (o.bib) P(12, 27, 8, 5, WHITE), P(12, 27, 8, 1, "#d8d0c0"), P(13, 29, 2, 2, "#3a3e46"), P(16, 29, 3, 2, "#3a3e46"), P(17, 29, 1, 1, WHITE);
  }

  // Ears, then the face.
  const earY = 13;
  const earsHidden = [3, 5, 10].includes(style);
  if (!fur && !metal && !earsHidden && !kid) {
    P(5, earY, 2, 4, skin), P(25, earY, 2, 4, skin);
    P(6, earY + 1, 1, 2, skinLo), P(25, earY + 1, 1, 2, skinLo);
  }
  if (metal) {
    P(4, 12, 3, 6, "#7a8a96"), P(25, 12, 3, 6, "#7a8a96");
  }
  rowsOf(0, head.length, fur ? hair : skin);
  if (!fur) {
    rowsOf(15, head.length, skinLo);
    P(8, 8, 2, 4, skinHi);
  }

  // Facial hair under the features; a moustache goes over the mouth afterwards.
  const beard = special === "beard" ? "full" : look.facial;
  if (!fur && !metal && beard === "stubble") {
    // A shadow along the jaw and chin, flecked darker.
    const shadow = mix(skin, hair, 0.28);
    for (let r = 12; r < head.length; r++) {
      const [x0, w] = head[r];
      P(x0, HEAD_TOP + r, w, 1, shadow);
      for (let x = x0 + (r % 2); x < x0 + w; x += 3) P(x, HEAD_TOP + r, 1, 1, mix(skin, hair, 0.5));
    }
    P(12, 17, 8, 1, mix(skin, hair, 0.12));
  } else if (!fur && !metal && beard === "full") {
    for (let r = 12; r < head.length; r++) P(head[r][0], HEAD_TOP + r, head[r][1], 1, hair);
    P(head[17][0] + 1, HEAD_TOP + 18, head[17][1] - 2, 1, hair);
    P(head[17][0] + 2, HEAD_TOP + 19, head[17][1] - 4, 1, hairLo);
    P(7, 16, 1, 1, hairLo), P(24, 16, 1, 1, hairLo);
    // The cheeks show through above it.
    P(9, 17, 4, 1, skin), P(19, 17, 4, 1, skin), P(14, 16, 4, 1, skin);
    P(12, 17, 8, 1, hairHi);
  } else if (!fur && !metal && beard === "goatee") {
    P(14, 20, 4, 3, hair), P(15, 22, 2, 1, hairLo);
  }

  // The face itself: eyes, brows, nose, cheeks and mouth as the expression sets them.
  const expr = EXPRESSIONS[o.face] || EXPRESSIONS.smile,
    eyes = [11, 19];
  if (fur) {
    // A face peering out of the fur.
    P(10, 11, 12, 10, look.skin || "#a8c0d8");
    P(9, 12, 14, 8, look.skin || "#a8c0d8");
    P(10, 11, 12, 1, shade(look.skin || "#a8c0d8", 0.2));
    for (const [x, y] of [[4, 9], [5, 6], [26, 8], [27, 12], [4, 15], [26, 17], [9, 3], [15, 2], [21, 3], [6, 21], [25, 21]]) P(x, y, 2, 2, hair);
  }
  if (metal) {
    P(8, 11, 16, 6, "#2a3440");
    P(9, 12, 14, 4, "#4ad0e8");
    P(10, 12, 5, 1, "#c8f8ff");
    if (expr.eyes === "happy" || expr.eyes === "closed") P(9, 14, 14, 2, "#2a3440"), P(11, 13, 3, 1, "#2a3440"), P(18, 13, 3, 1, "#2a3440");
    P(11, 18, 10, 2, "#5a6670");
    for (let x = 12; x < 21; x += 2) P(x, 18, 1, 2, "#9aa6b0");
    P(7, 5, 18, 2, "#7a8a96");
    P(15, 1, 2, 4, "#7a8a96"), P(14, 0, 4, 2, "#e85a50");
  } else {
    const lid = shade(skin, -0.32);
    const eye = (x, kind) => {
      switch (kind) {
        case "happy": P(x - 1, 14, 1, 1, EYE), P(x, 13, 2, 1, EYE), P(x + 2, 14, 1, 1, EYE); break;
        case "closed": P(x - 1, 13, 1, 1, EYE), P(x, 14, 2, 1, EYE), P(x + 2, 13, 1, 1, EYE); break;
        case "line": P(x - 1, 14, 4, 1, EYE); break;
        case "half": P(x - 1, 13, 4, 1, lid), P(x, 14, 2, 2, EYE), P(x - 1, 14, 1, 2, WHITE); break;
        case "narrow": P(x - 1, 13, 4, 1, EYE), P(x, 14, 2, 2, EYE), P(x - 1, 14, 1, 2, WHITE), P(x + 2, 14, 1, 1, WHITE); break;
        case "wide": P(x - 1, 12, 4, 4, WHITE), P(x, 13, 2, 2, EYE), P(x, 13, 1, 1, WHITE); break;
        case "aside": P(x - 1, 12, 3, 4, WHITE), P(x + 1, 13, 2, 3, EYE), P(x + 1, 13, 1, 1, WHITE); break;
        default: P(x, 12, 2, 4, EYE), P(x - 1, 13, 1, 3, WHITE), P(x, 12, 1, 1, WHITE);
      }
    };
    eye(eyes[0], expr.eyes === "wink" ? "happy" : expr.eyes);
    eye(eyes[1], expr.eyes === "wink" ? "open" : expr.eyes);
    if (look.lashes && expr.eyes !== "line") P(eyes[0] - 2, 12, 1, 1, EYE), P(eyes[1] + 2, 12, 1, 1, EYE);
    // Bold eye make-up: a sweep of colour above each eye, out to the corner.
    if (look.shadow && expr.eyes !== "line") P(eyes[0] - 2, 11, 3, 1, look.shadow), P(eyes[1] + 1, 11, 3, 1, look.shadow);
    if (expr.bags) P(eyes[0] - 1, 16, 4, 1, shade(skin, -0.16)), P(eyes[1] - 1, 16, 4, 1, shade(skin, -0.16));
    // Brows, in the hair colour (the Yeti's are slate).
    const brow = fur ? "#6a7a8a" : look.brow || hairLo;
    switch (expr.brows) {
      case "raised": P(9, 9, 4, 1, brow), P(19, 9, 4, 1, brow); break;
      case "one": P(9, 10, 4, 1, brow), P(19, 9, 4, 1, brow), P(22, 10, 1, 1, brow); break;
      case "angry": P(9, 9, 2, 1, brow), P(11, 10, 2, 1, brow), P(19, 10, 2, 1, brow), P(21, 9, 2, 1, brow); break;
      case "worried": P(9, 10, 2, 1, brow), P(11, 9, 2, 1, brow), P(19, 9, 2, 1, brow), P(21, 10, 2, 1, brow); break;
      default: P(9, 10, 4, 1, brow), P(19, 10, 4, 1, brow);
    }
    // Nose and cheeks.
    if (!fur) P(15, 16, 2, 1, skinLo), P(16, 15, 1, 1, skinLo);
    else P(15, 16, 2, 1, "#4a5a6a");
    if (beard !== "full") {
      if (expr.blush) P(8, 16, 4, 2, BLUSH), P(20, 16, 4, 2, BLUSH);
      else P(8, 17, 3, 1, BLUSH), P(21, 17, 3, 1, BLUSH);
    } else P(10, 17, 2, 1, BLUSH), P(20, 17, 2, 1, BLUSH);
    // Mouth.
    const DARK = "#5a2024", TONGUE = "#e07070";
    switch (expr.mouth) {
      case "happy": P(13, 18, 6, 1, LIP), P(14, 19, 4, 1, LIP), P(15, 19, 2, 1, TONGUE); break;
      case "grin": P(12, 17, 1, 1, LIP), P(19, 17, 1, 1, LIP), P(13, 18, 6, 2, DARK), P(13, 18, 6, 1, WHITE), P(14, 20, 4, 1, LIP), P(15, 19, 2, 1, TONGUE); break;
      case "smirk": P(15, 18, 4, 1, LIP), P(19, 17, 1, 1, LIP), P(14, 18, 1, 1, shade(skin, -0.3)); break;
      case "flat": P(14, 18, 4, 1, LIP); break;
      case "teeth": P(13, 17, 6, 1, LIP), P(13, 18, 6, 1, WHITE), P(13, 19, 6, 1, LIP), P(15, 18, 1, 1, "#c8c0b0"), P(17, 18, 1, 1, "#c8c0b0"); break;
      case "tongue": P(14, 18, 4, 1, LIP), P(13, 17, 1, 1, LIP), P(18, 17, 1, 1, LIP), P(16, 19, 2, 2, TONGUE), P(17, 20, 1, 1, shade(TONGUE, -0.2)); break;
      case "small": P(15, 18, 2, 1, LIP); break;
      case "o": P(15, 17, 2, 1, LIP), P(14, 18, 1, 2, LIP), P(17, 18, 1, 2, LIP), P(15, 20, 2, 1, LIP), P(15, 18, 2, 2, DARK); break;
      case "sad": P(14, 19, 4, 1, LIP), P(13, 20, 1, 1, LIP), P(18, 20, 1, 1, LIP); break;
      case "strain": P(13, 18, 6, 2, LIP), P(14, 18, 4, 1, WHITE); break;
      default: P(14, 18, 4, 1, LIP), P(13, 17, 1, 1, LIP), P(18, 17, 1, 1, LIP);
    }
    if (expr.sweat) P(25, 9, 1, 2, "#8ad0f0"), P(24, 11, 3, 2, "#8ad0f0"), P(25, 11, 1, 1, "#e8f8ff");
  }

  if (!fur && !metal && (beard === "moustache" || beard === "walrus")) {
    const w = beard === "walrus" ? 12 : 8, x0 = 16 - w / 2;
    P(x0, 17, w, 1, hair), P(x0 + 1, 16, w - 2, 1, hair), P(x0, 18, 2, 1, hair), P(x0 + w - 2, 18, 2, 1, hair);
    P(x0 + 2, 16, 2, 1, hairHi);
  }

  // Hair over the head.
  const fringe = (cells) => cells.forEach(([x, w, h]) => P(x, 9, w, h, hair));
  if (kid) {
    // A cap in the trim colour, peak forward.
    rowsOf(0, 5, collar);
    P(7, 9, 18, 2, shade(collar, -0.2));
    P(9, 6, 4, 1, shade(collar, 0.3));
    P(6, 11, 3, 4, hair), P(23, 11, 3, 4, hair);
  } else if (!fur && !metal) {
    const base = () => {
      rowsOf(0, 4, hair);
      P(7, 9, 3, 5, hair), P(22, 9, 3, 5, hair);
      P(10, 6, 6, 1, hairHi), P(9, 7, 2, 1, hairHi);
    };
    switch (style) {
      case 1: // spiky crop
        base();
        fringe([[10, 3, 2], [14, 3, 2], [18, 3, 2]]);
        for (const x of [9, 13, 17, 21]) P(x, 3, 2, 2, hair), P(x + 1, 2, 1, 1, hair);
        break;
      case 2: // side ponytail, tied with the trim colour
        base();
        fringe([[10, 7, 2], [10, 4, 3]]);
        P(3, 10, 4, 3, hair), P(2, 13, 4, 7, hair), P(3, 19, 3, 2, hairLo), P(5, 10, 2, 2, collar);
        break;
      case 3: // bob with a full fringe
        rowsOf(0, 5, hair);
        P(7, 9, 4, 11, hair), P(21, 9, 4, 11, hair);
        P(10, 10, 2, 1, hair), P(14, 10, 2, 1, hair), P(18, 10, 3, 1, hair);
        P(10, 6, 8, 1, hairHi);
        break;
      case 4: // big voluminous hair
        P(9, 2, 14, 2, hair), P(6, 3, 20, 3, hair), P(5, 6, 22, 4, hair);
        P(5, 10, 4, 7, hair), P(23, 10, 4, 7, hair);
        P(10, 3, 6, 1, hairHi), P(7, 5, 3, 1, hairHi);
        fringe([[9, 4, 2], [19, 4, 2]]);
        break;
      case 5: // long and loose
        rowsOf(0, 4, hair);
        P(7, 9, 4, 12, hair), P(21, 9, 4, 12, hair);
        fringe([[11, 5, 2], [16, 6, 1]]);
        P(11, 6, 7, 1, hairHi);
        break;
      case 6: // a bun on top
        base();
        P(12, 1, 8, 4, hair), P(13, 0, 6, 1, hair), P(13, 1, 3, 1, hairHi);
        P(12, 4, 8, 1, hairLo);
        fringe([[10, 5, 1], [17, 5, 1]]);
        break;
      case 7: // mullet: short on top, party at the back
        base();
        fringe([[10, 4, 2], [15, 5, 1]]);
        P(6, 11, 2, 9, hair), P(24, 11, 2, 9, hair);
        break;
      case 8: { // buzz cut
        const fuzz = mix(hair, skin, 0.3);
        rowsOf(0, 4, fuzz);
        P(7, 9, 2, 3, fuzz), P(23, 9, 2, 3, fuzz);
        for (let r = 0; r < 4; r++) for (let x = head[r][0] + ((r * 2) % 3); x < head[r][0] + head[r][1]; x += 3) P(x, HEAD_TOP + r, 1, 1, hair);
        P(10, 6, 4, 1, mix(fuzz, "#ffffff", 0.2));
        break;
      }
      case 9: // high ponytail
        base();
        fringe([[10, 6, 1], [18, 3, 2]]);
        break;
      case 10: // long braids
        base();
        P(10, 9, 12, 1, hair);
        for (let x = 11; x < 22; x += 3) P(x, 6, 1, 3, hairLo);
        break;
      case 11: // curls
        rowsOf(0, 4, hair);
        for (const [x, y] of [[9, 3], [12, 2], [16, 2], [20, 3], [6, 6], [24, 6], [6, 10], [24, 10], [10, 9], [14, 9], [18, 9]]) P(x, y, 3, 3, hair), P(x, y, 1, 1, hairHi);
        break;
      case 12: // bald on top, neat at the sides
        P(6, 10, 3, 6, hair), P(23, 10, 3, 6, hair), P(7, 9, 2, 1, hair), P(23, 9, 2, 1, hair);
        P(12, 6, 5, 2, skinHi);
        break;
      default: // short side part
        base();
        fringe([[10, 7, 2], [17, 5, 1], [21, 2, 3]]);
    }
  }

  // Ranks: a headband in the trim colour, gold for Stars and Legends.
  if (rank >= 2 && !metal && !kid && !role && look.gear !== "band") {
    const band = rank >= 3 ? GOLD : collar;
    P(7, 9, 18, 2, band), P(7, 10, 18, 1, shade(band, -0.2));
    P(4, 10, 3, 3, band), P(3, 12, 2, 3, band);
  }

  // Accessories.
  const gear = look.gear,
    gc = look.gearColor || "#e04a3a";
  if (special === "granny" || look.glasses) {
    const frame = look.glassesColor || (special === "granny" ? "#9a8a80" : "#3a3440");
    for (const x of eyes) {
      P(x - 2, 11, 6, 1, frame), P(x - 2, 16, 6, 1, frame), P(x - 2, 11, 1, 6, frame), P(x + 3, 11, 1, 6, frame);
      P(x - 1, 12, 1, 1, "#ffffffaa");
    }
    P(14, 12, 4, 1, frame);
    P(6, 12, 3, 1, frame), P(23, 12, 3, 1, frame);
  }
  if (gear === "shades" && !metal) {
    P(8, 12, 7, 4, "#1c2028"), P(17, 12, 7, 4, "#1c2028"), P(14, 12, 4, 1, "#1c2028");
    P(9, 12, 3, 1, "#5a6a80"), P(18, 12, 3, 1, "#5a6a80");
    P(6, 12, 2, 1, "#1c2028"), P(24, 12, 2, 1, "#1c2028");
  }
  if (gear === "band" && !metal) {
    P(7, 8, 18, 3, gc), P(7, 10, 18, 1, shade(gc, -0.25)), P(9, 8, 5, 1, shade(gc, 0.3));
  }
  if (gear === "cap" && !metal) {
    rowsOf(0, 4, gc);
    P(8, 8, 16, 2, gc);
    P(10, 6, 5, 1, shade(gc, 0.25));
    P(15, 5, 2, 1, shade(gc, -0.3));
    P(6, 9, 20, 2, shade(gc, -0.2));
    P(7, 11, 18, 1, shade(gc, -0.45));
  }
  if (special === "scarf") {
    P(7, 22, 18, 4, collar), P(7, 22, 18, 1, shade(collar, 0.25)), P(18, 25, 4, 7, collar), P(19, 26, 2, 6, shade(collar, -0.2));
  }
}

const cache = new Map();
function bust(o) {
  const key = JSON.stringify([o.look, o.shirt, o.collar, o.kit, o.rank, o.face, o.role, o.apron, o.bib]);
  let c = cache.get(key);
  if (c) return c;
  const base = canvas(BUST, BUST);
  drawBust(base.getContext("2d"), o);
  c = outlined(base, OUTLINE);
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
