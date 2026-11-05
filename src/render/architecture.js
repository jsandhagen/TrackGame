// The map's architecture kit: building volumes, roofs, wall materials, windows, doors and the
// small props that say who uses a place. Everything shares one oblique projection (depth runs up
// and to the right), one light from the upper left and the hue-shifted ramps in pixel.js:
// lit tops and fronts warm, shadow sides and undersides cool, outlines taken from the colour
// beside them. Texture is drawn in clusters that follow how the material is built; nothing here
// scatters single random pixels.
import { rect, poly, line, ellipse, hash, px, tone, selOut } from './pixel.js';

export const DX = .4, DY = .5;
export const SHADOW = 'rgba(26,32,66,.28)';
const SNOW = '#edf2ed';
export const geo = b => ({ dx: Math.round(b.d * DX), dy: Math.round(b.d * DY) });
function clipTo(g, points, paint) {
  g.save(); g.beginPath(); g.moveTo(...points[0]); for (const p of points.slice(1)) g.lineTo(...p); g.closePath(); g.clip(); paint(); g.restore();
}
const edges = (g, list) => { for (const [x0, y0, x1, y1, c] of list) line(g, x0, y0, x1, y1, c); };

// ---------------------------------------------------------------- walls
// brick: staggered courses and mortar · stone: irregular blocks of varied size · plaster: smooth
// with a few hairline cracks and a weathered foot · timber: vertical boards with knots ·
// clapboard: horizontal lapped boards, each casting a line of shadow · metal: ribs and rivets ·
// glass: a curtain wall with a dark interior, mullions and clustered reflections.
export function wall(g, b) {
  const { x, y, w, h, wall: c, material = 'plaster', seed = x } = b, top = y - h, joint = tone(c, -.16);
  rect(g, x, top, w, h, c);
  g.save(); g.beginPath(); g.rect(x, top, w, h - 3); g.clip();
  if (material === 'brick') for (let yy = top + 2, row = 0; yy < y - 3; yy += 3, row++) {
    rect(g, x, yy, w, 1, joint);
    for (let xx = x + (row % 2 ? 3 : 0); xx < x + w; xx += 6) {
      rect(g, xx, yy + 1, 1, 2, joint);
      const n = hash(xx * 7 + yy * 13 + seed);
      if (n < .14) rect(g, xx + 1, yy + 1, 5, 2, tone(c, -.08));
      else if (n > .92) rect(g, xx + 1, yy + 1, 5, 1, tone(c, .1));
    }
  } else if (material === 'stone') {
    for (let yy = top + 2, row = 0; yy < y - 3; row++) {
      const course = 4 + (hash(row * 5 + seed) > .5 ? 1 : 0);
      rect(g, x, yy + course - 1, w, 1, joint);
      for (let xx = x - Math.floor(hash(row + seed) * 6), k = 0; xx < x + w; k++) {
        const bw = 6 + Math.floor(hash(row * 31 + k * 7 + seed) * 6);
        rect(g, xx, yy, 1, course - 1, joint);
        rect(g, xx + 1, yy, Math.min(3, bw - 2), 1, tone(c, .12));
        if (hash(row * 17 + k * 3 + seed) > .86) { px(g, xx + 3, yy + 1, tone(c, -.24)); px(g, xx + 4, yy + 2, tone(c, -.24)); }
        xx += bw;
      }
      yy += course;
    }
  } else if (material === 'plaster') {
    rect(g, x, y - 8, w, 5, tone(c, -.05));
    for (let k = 0; k < Math.floor(w / 22); k++) {
      const cx = x + 4 + Math.floor(hash(k * 13 + seed) * (w - 8)), cy = top + 4 + Math.floor(hash(k * 29 + seed) * (h - 10));
      px(g, cx, cy, tone(c, -.18)); px(g, cx + 1, cy + 1, tone(c, -.18)); px(g, cx + 1, cy + 2, tone(c, -.12));
    }
  } else if (material === 'timber') {
    for (let xx = x + 3; xx < x + w; xx += 4) { rect(g, xx, top, 1, h, tone(c, -.24)); rect(g, xx + 1, top, 1, h, tone(c, .07)); }
    for (let k = 0; k < Math.floor(w / 9); k++) {
      const kx = x + 1 + 4 * Math.floor(hash(k * 11 + seed) * (w / 4 - 1)), ky = top + 4 + Math.floor(hash(k * 7 + seed) * (h - 10));
      px(g, kx + 1, ky, tone(c, -.3)); px(g, kx + 1, ky + 1, tone(c, .1));
    }
    rect(g, x, top + 2, w, 1, tone(c, -.3));
  } else if (material === 'clapboard') {
    for (let yy = top + 3; yy < y - 3; yy += 3) { rect(g, x, yy, w, 1, tone(c, -.2)); rect(g, x, yy + 1, w, 1, tone(c, .06)); }
    for (let xx = x + 1 + Math.floor(hash(seed) * 9); xx < x + w; xx += 13) rect(g, xx, top + 3, 1, h - 6, tone(c, -.1));
  } else if (material === 'metal') {
    for (let xx = x + 3; xx < x + w; xx += 5) { rect(g, xx, top + 2, 1, h - 3, tone(c, -.22)); rect(g, xx + 1, top + 2, 1, h - 3, tone(c, .16)); }
    for (let xx = x + 2; xx < x + w; xx += 5) { px(g, xx, top + 3, tone(c, -.3)); px(g, xx, y - 5, tone(c, -.3)); }
  } else if (material === 'glass') {
    rect(g, x, top, w, h, '#3d5866');
    for (let yy = top + 1; yy < y - 3; yy += 7) {
      rect(g, x, yy, w, 2, tone(c, -.05));
      for (let xx = x + 1; xx < x + w; xx += 8) {
        rect(g, xx, yy + 2, 7, 5, '#4a6878');
        rect(g, xx, yy + 2, 7, 1, '#2f4652');
        if (hash(xx * 3 + yy + seed) > .55) { line(g, xx + 3, yy + 6, xx + 6, yy + 3, '#9cc4cf'); px(g, xx + 6, yy + 2 + 1, '#cfe6ea'); }
      }
      for (let xx = x; xx < x + w; xx += 8) rect(g, xx, yy + 2, 1, 5, tone(c, -.2));
    }
  }
  g.restore();
  // A darker plinth and a contact line where the wall meets the ground.
  rect(g, x, y - 3, w, 2, tone(b.plinth || c, -.28)); rect(g, x, y - 1, w, 1, selOut(b.plinth || c, .7));
  if (material !== 'glass') rect(g, x + 1, top, 1, h - 3, tone(c, .18));
}

// ---------------------------------------------------------------- roofs
// Each roof material has its own language: clay tile in scalloped rows with rhythmic highlights,
// cool slate in restrained bands, wood shingle in offset rows with worn patches, metal in
// standing seams with hard highlights, and a flat membrane with ballast inside a parapet.
function roofTexture(g, mat, cap, x0, y0, x1, y1, slant = 0) {
  const row = (yy) => Math.round(slant * (y1 - yy) / Math.max(1, y1 - y0));
  if (mat === 'tile') for (let yy = y0 + 2, r = 0; yy < y1; yy += 3, r++) {
    rect(g, x0, yy, x1 - x0, 1, tone(cap, -.22));
    for (let xx = x0 + (r % 2 ? 2 : 0) + row(yy); xx < x1; xx += 4) { rect(g, xx, yy - 2, 2, 1, tone(cap, .14)); px(g, xx + 3, yy - 1, tone(cap, -.12)); }
  } else if (mat === 'slate') for (let yy = y0 + 2, r = 0; yy < y1; yy += 3, r++) {
    rect(g, x0, yy, x1 - x0, 1, tone(cap, -.16));
    for (let xx = x0 + (r % 2 ? 3 : 0) + row(yy); xx < x1; xx += 7) rect(g, xx, yy - 2, 1, 2, tone(cap, -.1));
    if (r % 3 === 1) rect(g, x0 + 4 + row(yy), yy - 2, Math.min(9, x1 - x0 - 6), 1, tone(cap, .07));
  } else if (mat === 'shingle') for (let yy = y0 + 2, r = 0; yy < y1; yy += 3, r++) {
    rect(g, x0, yy, x1 - x0, 1, tone(cap, -.2));
    for (let xx = x0 + row(yy) + Math.floor(hash(r * 7) * 4); xx < x1; xx += 4 + Math.floor(hash(xx + r) * 3)) rect(g, xx, yy - 2, 1, 2, tone(cap, -.14));
    if (hash(r * 19 + x0) > .5) rect(g, x0 + 3 + Math.floor(hash(r * 3 + x0) * Math.max(1, x1 - x0 - 8)), yy - 2, 3, 1, tone(cap, .1));
  }
}
// b.roofKind: gable (ridge along the facade), hip, flat (parapet), saw (north-light sawtooth),
// barrel (curved metal). b.overhang adds eaves that shade the wall below them.
export function roof(g, b, season) {
  const { x, y, w, h, wall: wc, roof: rc, roofMat = 'slate' } = b, { dx, dy } = geo(b), cap = season === 3 ? SNOW : rc,
    kind = b.roofKind || (b.gable ? 'gable' : 'flat'), capEdge = selOut(cap, .55), wallEdge = selOut(wc, .66), textured = season !== 3;
  if (kind === 'gable' || kind === 'hip') {
    const rise = b.gable || 6, ridgeY = Math.round(y - h - dy / 2 - rise), ridgeX = Math.round(dx / 2), inset = kind === 'hip' ? Math.min(Math.round(w / 4), 8) : 0;
    poly(g, [[x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w + ridgeX - inset, ridgeY], [x + ridgeX + inset, ridgeY]], tone(cap, -.28));
    if (kind === 'gable') poly(g, [[x + w, y - h], [x + w + ridgeX, ridgeY], [x + w + dx, y - h - dy]], tone(wc, -.26));
    const near = [[x - 2, y - h + 1], [x + w + 2, y - h + 1], [x + w + ridgeX + (kind === 'hip' ? -inset : 2), ridgeY], [x + ridgeX + (kind === 'hip' ? inset : -2), ridgeY]];
    poly(g, near, cap);
    if (textured) clipTo(g, near, () => roofTexture(g, roofMat, cap, x - 2, ridgeY, x + w + dx + 3, y - h + 1, ridgeX));
    if (kind === 'hip') {
      // The right hip faces away from the light; the left one catches it.
      poly(g, [[x + w + 2, y - h + 1], [x + w + dx + 1, y - h - dy], [x + w + ridgeX - inset, ridgeY]], tone(cap, -.3));
      poly(g, [[x - 2, y - h + 1], [x + ridgeX + inset, ridgeY], [x + dx - 2, y - h - dy]], tone(cap, .08));
    }
    // Ridge cap, eave fascia and the shadow the overhang throws on the wall.
    line(g, x + ridgeX + (kind === 'hip' ? inset : -2), ridgeY, x + w + ridgeX + (kind === 'hip' ? -inset : 2), ridgeY, tone(cap, .3));
    line(g, x + ridgeX + (kind === 'hip' ? inset : -2), ridgeY + 1, x + w + ridgeX + (kind === 'hip' ? -inset : 2), ridgeY + 1, tone(cap, -.1));
    rect(g, x - 2, y - h + 1, w + 4, 2, tone(rc, -.48));
    rect(g, x, y - h + 3, w, 2, SHADOW);
    edges(g, [
      [x - 2, y - h + 2, x + ridgeX + (kind === 'hip' ? inset : -2), ridgeY, capEdge],
      [x + w + ridgeX + (kind === 'hip' ? -inset : 2), ridgeY, x + w + dx + (kind === 'hip' ? 1 : 0), y - h - dy, capEdge],
    ]);
    return { top: ridgeY, ridgeX, ridgeY };
  }
  if (kind === 'barrel') {
    const crown = b.crown || 7, lift = t => Math.sin(Math.PI * t) * crown, pts = 12, curve = [];
    for (let i = 0; i <= pts; i++) { const t = i / pts; curve.push([x + t * dx, y - h - t * dy - lift(t)]); }
    poly(g, [...curve, ...curve.slice().reverse().map(([cx, cy]) => [cx + w, cy])], cap);
    // End profile on the shadow side, then seams following the curve and a lit band at the crown.
    poly(g, [[x + w, y - h], ...curve.map(([cx, cy]) => [cx + w, cy]), [x + w + dx, y - h - dy]], tone(cap, -.32));
    for (let k = 3; k < w; k += 5) for (let i = 0; i < pts; i++) line(g, curve[i][0] + k, curve[i][1], curve[i + 1][0] + k, curve[i + 1][1], tone(cap, -.18));
    for (let i = 3; i < 6; i++) line(g, curve[i][0], curve[i][1], curve[i][0] + w, curve[i][1], tone(cap, .22));
    for (let i = 8; i < pts; i++) line(g, curve[i][0], curve[i][1] + 1, curve[i][0] + w, curve[i][1] + 1, tone(cap, -.14));
    rect(g, x - 1, y - h, w + 2, 2, tone(rc, -.45));
    rect(g, x, y - h + 2, w, 2, SHADOW);
    edges(g, curve.slice(0, -1).map(([cx, cy], i) => [cx + w, cy, curve[i + 1][0] + w, curve[i + 1][1], capEdge]));
    return { top: Math.min(...curve.map(c => c[1])) };
  }
  // Flat roofs: a membrane inside a parapet. Sawtooth roofs add north-light glazing in rows.
  const top = [[x, y - h], [x + w, y - h], [x + w + dx, y - h - dy], [x + dx, y - h - dy]];
  poly(g, top, cap);
  if (textured) clipTo(g, top, () => {
    for (let k = 0; k < w * dy / 26; k++) { const tx = x + 2 + hash(k * 5 + x) * (w + dx - 4), ty = y - h - 1 - hash(k * 9 + y) * (dy - 2); rect(g, tx, ty, 2, 1, tone(cap, k % 2 ? -.12 : .08)); }
  });
  if (kind === 'saw') {
    const teeth = b.teeth || 3;
    for (let j = 0; j < teeth; j++) {
      const t0 = j / teeth, t1 = (j + 1) / teeth, ox = Math.round(dx * t0), oy = Math.round(dy * t0), ox1 = Math.round(dx * t1), oy1 = Math.round(dy * t1), gh = 4;
      poly(g, [[x + ox, y - h - oy - gh], [x + w + ox, y - h - oy - gh], [x + w + ox1, y - h - oy1], [x + ox1, y - h - oy1]], cap);
      if (textured) for (let k = 3; k < w; k += 4) line(g, x + ox + k, y - h - oy - gh, x + ox1 + k, y - h - oy1, tone(cap, -.16));
      rect(g, x + ox, y - h - oy - gh, w, gh, '#4b6b7c'); rect(g, x + ox, y - h - oy - gh, w, 1, '#9cc4cf');
      for (let k = 6; k < w; k += 7) rect(g, x + ox + k, y - h - oy - gh, 1, gh, tone(wc, -.2));
      poly(g, [[x + w + ox, y - h - oy], [x + w + ox, y - h - oy - gh], [x + w + ox1, y - h - oy1]], tone(wc, -.3));
      line(g, x + w + ox, y - h - oy - gh, x + w + ox1, y - h - oy1, capEdge);
    }
  }
  if (b.parapet !== false && h > 8) {
    rect(g, x, y - h - 2, w, 2, tone(wc, .1)); rect(g, x, y - h - 2, w, 1, tone(wc, .26));
    poly(g, [[x + w, y - h], [x + w, y - h - 2], [x + w + dx, y - h - dy - 2], [x + w + dx, y - h - dy]], tone(wc, -.28));
    line(g, x + dx, y - h - dy - 1, x + w + dx, y - h - dy - 1, tone(wc, -.1));
    line(g, x, y - h - 2, x + dx, y - h - dy - 2, tone(wc, .14));
  } else line(g, x, y - h, x + w, y - h, tone(cap, .3));
  edges(g, [[x + dx, y - h - dy - (b.parapet !== false && h > 8 ? 2 : 0), x + w + dx, y - h - dy - (b.parapet !== false && h > 8 ? 2 : 0), capEdge]]);
  return { top: y - h - dy - 2 };
}

// A whole volume: shaded side, textured front, roof, and a selective outline darkest on the
// shadow side and softest on the lit left.
export function drawBuildingVolume(g, b, season) {
  const { x, y, w, h, wall: wc } = b, { dx, dy } = geo(b);
  const side = [[x + w, y], [x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy]];
  poly(g, side, tone(wc, -.32));
  clipTo(g, side, () => {
    if (b.material !== 'glass' && b.material !== 'plaster') for (let yy = y - h - dy; yy < y; yy += 4) line(g, x + w, yy, x + w + dx, yy - dy, tone(wc, -.4));
    if (b.material === 'glass') for (let yy = y - h - dy + 3; yy < y; yy += 7) line(g, x + w, yy, x + w + dx, yy - dy, '#2f4652');
    line(g, x + w, y - 2, x + w + dx, y - dy - 2, tone(wc, -.44));
  });
  wall(g, b);
  const r = roof(g, b, season), wallEdge = selOut(wc, .66);
  edges(g, [[x + w + dx, y - h - dy, x + w + dx, y - dy, wallEdge], [x + w + dx, y - dy, x + w, y, wallEdge], [x, y - h + 3, x, y - 1, selOut(wc, .42)]]);
  return r;
}

// ---------------------------------------------------------------- windows and doors
// Kinds: sash (four panes), shutter (sash with shutters), tall (arched, formal), small (high
// industrial lights), shop (display window with goods). Glass reads dark with a reflection
// cluster; a lit window glows warm with curtains. Every window has a frame, a recess shadow
// under its head and a sill that shades the wall below it.
export const WINDOW = { sash: [6, 7], shutter: [6, 7], tall: [5, 11], small: [4, 3], shop: [14, 8] };
export function windowAt(g, kind, x, y, { lit = false, trim = '#efe6cf', shutter = '#5f7a66', curtain = '#c8705a', box = null, goods = null, season = 1 } = {}) {
  const [w, h] = WINDOW[kind] || WINDOW.sash, glass = lit ? '#f0c06a' : '#3f5a68';
  rect(g, x - 1, y - 1, w + 2, h + 2, trim);
  rect(g, x, y, w, h, glass);
  rect(g, x, y, w, 1, lit ? '#c4924a' : '#2b3e4a'); rect(g, x, y, 1, h, lit ? '#d4a457' : '#33495a');
  if (lit) { rect(g, x + 1, y + 1, w - 2, h - 2, '#f7d684'); rect(g, x, y + 1, 1, h - 1, curtain); rect(g, x + w - 1, y + 1, 1, h - 1, curtain); }
  else { px(g, x + w - 2, y + 2, '#a9cfd8'); px(g, x + w - 3, y + 3, '#a9cfd8'); if (h > 4) px(g, x + w - 2, y + 3, '#6f97a6'); }
  if (kind === 'shop' && goods) for (let k = 0; k < 3; k++) { rect(g, x + 2 + k * 4, y + h - 4, 3, 3, goods[k % goods.length]); px(g, x + 3 + k * 4, y + h - 5, tone(goods[k % goods.length], .3)); }
  if (kind === 'tall') { px(g, x, y, trim); px(g, x + w - 1, y, trim); rect(g, x + 2, y - 2, 1, 1, tone(trim, -.2)); rect(g, x, y + 5, w, 1, trim); }
  else if (kind !== 'small') { rect(g, x + Math.floor(w / 2), y, 1, h, trim); if (h > 5) rect(g, x, y + Math.floor(h / 2), w, 1, trim); }
  rect(g, x - 2, y + h + 1, w + 4, 1, tone(trim, .12)); rect(g, x - 1, y + h + 2, w + 2, 1, SHADOW);
  if (kind === 'shutter') for (const sx of [x - 4, x + w + 2]) { rect(g, sx, y - 1, 2, h + 2, shutter); for (let yy = y; yy < y + h; yy += 2) rect(g, sx, yy, 2, 1, tone(shutter, -.22)); rect(g, sx, y - 1, 1, h + 2, tone(shutter, .15)); }
  if (box) {
    rect(g, x - 1, y + h + 2, w + 2, 2, '#8a5a3a'); rect(g, x - 1, y + h + 2, w + 2, 1, tone('#8a5a3a', .2));
    if (season !== 3) for (let k = 0; k < w + 1; k += 2) { px(g, x + k - 1, y + h + 1, k % 4 ? box : '#5d8a48'); px(g, x + k, y + h + 1, '#4e7a40'); }
  }
}
// Doors: panelled timber with a handle, glazed double doors, or a roller door for the yards.
export function doorAt(g, kind, x, y, { color = '#6a5040', trim = '#efe6cf', w = kind === 'double' ? 10 : kind === 'roller' ? 18 : 6, h = kind === 'roller' ? 14 : 11 } = {}) {
  rect(g, x - 1, y - h - 1, w + 2, h + 1, trim);
  if (kind === 'roller') {
    rect(g, x, y - h, w, h, '#5d6763');
    for (let yy = y - h + 1; yy < y; yy += 2) { rect(g, x, yy, w, 1, '#89958f'); }
    rect(g, x, y - h, w, 2, '#3f4744'); rect(g, x, y - 2, w, 1, '#3f4744');
    return;
  }
  if (kind === 'double' || kind === 'glass') {
    rect(g, x, y - h, w, h, '#3f5a68');
    rect(g, x + Math.floor(w / 2), y - h, 1, h, trim); px(g, x + w - 3, y - h + 2, '#a9cfd8'); px(g, x + 2, y - h + 3, '#a9cfd8');
    rect(g, x + Math.floor(w / 2) - 2, y - 6, 1, 2, '#d8d0b8'); rect(g, x + Math.floor(w / 2) + 2, y - 6, 1, 2, '#d8d0b8');
    return;
  }
  rect(g, x, y - h, w, h, color);
  rect(g, x + 1, y - h + 1, w - 2, 3, tone(color, -.16)); rect(g, x + 1, y - h + 5, w - 2, 4, tone(color, -.12));
  rect(g, x, y - h, 1, h, tone(color, .18));
  px(g, x + w - 2, y - Math.round(h / 2), '#f2c94c');
}
export function steps(g, x, y, w, c = '#cfc4ab') {
  rect(g, x - 1, y, w + 2, 2, c); rect(g, x - 1, y, w + 2, 1, tone(c, .2)); rect(g, x - 2, y + 2, w + 4, 1, tone(c, -.2));
}

// ---------------------------------------------------------------- props
// Small clusters that tell who uses a place. Lit tops, cool right sides, a soft contact shadow.
const foot = (g, x, y, w) => rect(g, x, y, w, 1, SHADOW);
export function crate(g, x, y, c = '#a77d4c') {
  foot(g, x + 1, y + 1, 6); rect(g, x, y - 4, 5, 5, c); rect(g, x, y - 4, 5, 1, tone(c, .25)); rect(g, x + 4, y - 3, 1, 4, selOut(c, .4));
  line(g, x, y - 3, x + 4, y, tone(c, -.2));
}
export function barrel(g, x, y, c = '#8a6a4a') {
  foot(g, x, y + 1, 6); rect(g, x, y - 5, 5, 6, c); rect(g, x, y - 5, 5, 1, tone(c, .28)); rect(g, x + 4, y - 4, 1, 5, selOut(c, .45));
  rect(g, x, y - 3, 5, 1, '#5a5a56'); rect(g, x, y - 1, 5, 1, '#5a5a56');
}
export function woodpile(g, x, y, n = 3) {
  foot(g, x, y + 1, n * 3 + 2);
  for (let r = 0; r < 2; r++) for (let k = 0; k < n - r; k++) { const lx = x + k * 3 + r * 1.5, ly = y - 2 - r * 3; rect(g, lx, ly, 3, 3, '#c89a64'); px(g, lx + 1, ly + 1, '#8a6038'); px(g, lx, ly, tone('#c89a64', .25)); }
  rect(g, x - 1, y, n * 3 + 2, 1, '#6a4a30');
}
export function laundry(g, x, y, w, colors, now = 0, seed = 0) {
  for (const px0 of [x, x + w]) { rect(g, px0, y - 13, 1, 13, '#7a6a52'); foot(g, px0 - 1, y + 1, 3); }
  line(g, x, y - 12, x + w, y - 12, '#d8d4c8');
  // The washing lifts now and then in a breeze, not constantly.
  const gust = Math.sin(now / 900 + seed) > .7 ? 1 : 0;
  for (let k = 0, xx = x + 3; xx < x + w - 3; k++, xx += 6) {
    const c = colors[k % colors.length], hh = 4 + (k % 2);
    rect(g, xx + gust, y - 11, 4, hh, c); rect(g, xx + gust, y - 11, 4, 1, tone(c, .25)); rect(g, xx + 3 + gust, y - 10, 1, hh - 1, tone(c, -.25));
  }
}
export function bike(g, x, y, c = '#4a7ab0') {
  foot(g, x, y + 1, 10);
  for (const wx of [x + 2, x + 8]) { ellipse(g, wx, y - 2, 2, 2, '#3a3e42'); px(g, wx, y - 2, '#9aa0a4'); }
  line(g, x + 2, y - 2, x + 5, y - 5, c); line(g, x + 5, y - 5, x + 8, y - 2, c); line(g, x + 4, y - 5, x + 8, y - 5, c); rect(g, x + 4, y - 6, 2, 1, '#2f2f2f');
}
export function aboard(g, x, y) {
  foot(g, x, y + 1, 6); line(g, x, y, x + 2, y - 7, '#6a5040'); line(g, x + 5, y, x + 3, y - 7, '#4e3a2e');
  rect(g, x + 1, y - 6, 4, 5, '#2f3a34'); rect(g, x + 2, y - 5, 2, 1, '#f4ecd0'); rect(g, x + 2, y - 3, 1, 1, '#f2c94c');
}
export function noticeboard(g, x, y, c = '#6a8c84') {
  rect(g, x + 1, y - 8, 1, 8, '#6a5a44'); rect(g, x + 7, y - 8, 1, 8, '#6a5a44'); foot(g, x, y + 1, 9);
  rect(g, x, y - 13, 9, 6, c); rect(g, x, y - 13, 9, 1, tone(c, .25));
  rect(g, x + 1, y - 12, 3, 3, '#f4ecd8'); rect(g, x + 5, y - 11, 3, 3, '#f2d8a0'); px(g, x + 2, y - 12, '#e05a4a');
}
export function lumber(g, x, y, w = 14) {
  foot(g, x, y + 1, w + 2);
  for (let r = 0; r < 3; r++) { rect(g, x + r, y - 2 - r * 2, w - r * 2, 2, r % 2 ? '#c49a62' : '#b58a54'); rect(g, x + r, y - 2 - r * 2, w - r * 2, 1, tone('#c49a62', .2)); }
  rect(g, x + 2, y - 1, 1, 1, '#7a5a38'); rect(g, x + w - 3, y - 1, 1, 1, '#7a5a38');
}
export function rack(g, x, y, colors) {
  rect(g, x, y - 12, 1, 12, '#6a6e72'); rect(g, x + 15, y - 12, 1, 12, '#6a6e72'); rect(g, x, y - 12, 16, 1, '#9aa0a4'); foot(g, x - 1, y + 1, 18);
  for (let k = 0; k < 4; k++) { const c = k % 2 ? colors.secondary : colors.primary, sx = x + 1 + k * 4; rect(g, sx, y - 11, 3, 5, c); px(g, sx, y - 11, tone(c, .3)); rect(g, sx + 2, y - 10, 1, 4, tone(c, -.25)); }
}
export function kettlebells(g, x, y) {
  foot(g, x, y + 1, 12);
  for (let k = 0; k < 3; k++) { const kx = x + k * 4; ellipse(g, kx + 1, y - 1, 2, 2, '#3a3e42'); px(g, kx, y - 2, '#7a8084'); rect(g, kx, y - 4, 3, 1, '#3a3e42'); }
}
export function chair(g, x, y, c = '#c8a064') {
  foot(g, x, y + 1, 5); rect(g, x, y - 3, 4, 1, c); rect(g, x, y - 7, 1, 7, tone(c, -.15)); rect(g, x + 3, y - 2, 1, 2, tone(c, -.3)); rect(g, x, y - 7, 1, 1, tone(c, .2));
}
export function wateringCan(g, x, y) { rect(g, x, y - 3, 3, 3, '#5a8ab0'); px(g, x + 3, y - 3, '#5a8ab0'); px(g, x + 4, y - 4, '#5a8ab0'); px(g, x, y - 3, '#8ab4d0'); }
export function cylinders(g, x, y) {
  foot(g, x, y + 1, 9);
  for (let k = 0; k < 3; k++) { const cx = x + k * 3; rect(g, cx, y - 8, 2, 8, ['#4a8a6a', '#c8c8c0', '#4a6a9a'][k]); px(g, cx, y - 9, '#5a5a56'); px(g, cx, y - 8, '#e8e8e0'); }
}
export function dish(g, x, y) {
  rect(g, x + 3, y - 4, 1, 4, '#7a8084'); ellipse(g, x + 3, y - 7, 4, 3, '#e4e8ea'); ellipse(g, x + 4, y - 7, 2, 2, '#b8c0c4'); px(g, x + 6, y - 9, '#5a6064');
}
export function antenna(g, x, y, h = 18, now = 0) {
  rect(g, x, y - h, 1, h, '#6a7074');
  for (let yy = y - h + 3; yy < y - 2; yy += 5) rect(g, x - 2, yy, 5, 1, '#8a9094');
  px(g, x, y - h - 1, Math.floor(now / 700) % 3 ? '#a03a32' : '#ff6a5a');
}
export function vine(g, x, top, bottom, season, seed = 0) {
  const leaf = ['#5f9a4a', '#4a8a42', '#b0703a', '#8a9a8a'][season], hi = tone(leaf, .22), lo = tone(leaf, -.3);
  for (let yy = bottom - 2, k = 0; yy > top; yy -= 2, k++) {
    const sway = Math.round(Math.sin(k * 1.3 + seed) * 2), wdt = 2 + (hash(k * 7 + seed) > .6 ? 1 : 0);
    rect(g, x + sway, yy, wdt, 2, leaf); px(g, x + sway, yy, hi); if (k % 3 === 2) px(g, x + sway + wdt, yy + 1, lo);
  }
}
export function flowerbed(g, x, y, w, season, seed = 0) {
  rect(g, x, y - 2, w, 3, '#7a5a3e'); rect(g, x, y - 2, w, 1, tone('#7a5a3e', .2));
  if (season === 3) { rect(g, x, y - 3, w, 1, SNOW); return; }
  const cols = ['#e86a6a', '#f6d04c', '#f4f0e6', '#c890e0', '#f0a050'];
  for (let k = 0; k < w; k += 2) { rect(g, x + k, y - 4, 1, 2, '#4e8a48'); px(g, x + k + (k % 4 ? 1 : 0), y - 5, cols[Math.floor(hash(seed + k * 7) * cols.length)]); }
}
// Smoke rises from a chimney and thins as it goes; it only drifts out for part of each cycle.
export function smoke(g, x, y, now, seed = 0) {
  // Baked scenery has no clock: draw no smoke rather than a frozen puff.
  if (!now) return;
  const cycle = (now / 4200 + seed * .37) % 1;
  if (cycle > .7) return;
  for (let n = 0; n < 3; n++) {
    const p = (cycle / .7 + n / 3) % 1, a = (1 - p) * .55;
    ellipse(g, x + 1 + p * 6 + Math.sin(now / 600 + n) , y - 2 - p * 14, 1 + Math.round(p * 2), 1 + Math.round(p * 1.5), `rgba(226,230,226,${a.toFixed(2)})`);
  }
}
export function chimney(g, x, y, c, h = 8) {
  rect(g, x, y - h, 4, h, c); rect(g, x, y - h, 1, h, tone(c, .2)); rect(g, x + 3, y - h, 1, h, selOut(c, .5));
  rect(g, x - 1, y - h - 1, 6, 2, tone(c, -.1)); rect(g, x - 1, y - h - 1, 6, 1, tone(c, .15)); rect(g, x + 1, y - h - 1, 2, 1, '#2e2a28');
}
