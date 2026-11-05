import { rect, poly, line, ellipse, hash, px, tone, selOut, CAST } from './pixel.js';
import { text, measure } from './font.js';
import { tree, bench, bush, lamp } from './buildings.js';
import { figure } from './sprites.js';
import { LOTS, baseOf, streetOf, parcelBounds } from './campus-layout.js';
import { withinGround, surface } from './terrain.js';
import { DX, DY, SHADOW, geo, drawBuildingVolume, windowAt, WINDOW, doorAt, steps, crate, barrel, woodpile, laundry, bike, aboard,
  noticeboard, lumber, rack, kettlebells, chair, wateringCan, cylinders, dish, antenna, vine, flowerbed, smoke, chimney, lantern } from './architecture.js';
export { drawBuildingVolume } from './architecture.js';

// Club buildings on the map. Each type belongs to a family with its own vocabulary, so a
// building says what it is before its sign is read:
//   civic       clubhouse, library: symmetric, formal entrance, tall windows, stone paving
//   commercial  café, kit shop: awnings, display windows, menu boards, outdoor seating
//   industrial  strength room, kit works, throws hall, testing: yards, roller doors, sawtooth,
//               barrel or metal roofs, gravel and stored materials
//   science     lab, institute: plaster or curtain glass, flat roofs with plant and dishes
//   home        dorms, scout office, coaching lodge, spa: porches, shutters, chimneys, gardens
// Upgrades change the building, not just a number: level 2 and 3 add wings, towers, dormers,
// porches, pergolas and roof plant particular to each type.
const T = {
  club:      { label: 'CLUB', family: 'civic', main: { dx: 22, w: 60, h: 27, d: 28, wall: '#e5d4b5', roof: '#a95139', material: 'stone', roofKind: 'gable', gable: 9, roofMat: 'tile' }, window: 'tall', door: 'double' },
  library:   { label: 'BOOKS', family: 'civic', main: { dx: 20, w: 62, h: 27, d: 28, wall: '#aa6551', roof: '#4f5866', material: 'brick', roofKind: 'hip', gable: 8, roofMat: 'slate' }, window: 'tall', door: 'double', lit: .55 },
  cafe:      { label: 'CAFE', family: 'commercial', main: { dx: 12, w: 46, h: 23, d: 26, wall: '#ecd8b6', roof: '#a85a3e', material: 'plaster', roofKind: 'gable', gable: 7, roofMat: 'tile' }, window: 'shop', door: 'glass', lit: .8 },
  shop:      { label: 'KIT', family: 'commercial', main: { dx: 16, w: 52, h: 23, d: 25, wall: '#dce4dc', roof: '#6a7478', material: 'plaster', roofKind: 'flat' }, window: 'shop', door: 'glass', lit: .3 },
  gym:       { label: 'GYM', family: 'industrial', main: { dx: 10, w: 60, h: 24, d: 28, wall: '#bd7552', roof: '#7d8a90', material: 'brick', roofKind: 'saw', teeth: 3 }, window: 'works', door: 'roller' },
  workshop:  { label: 'KIT WORKS', family: 'industrial', main: { dx: 12, w: 60, h: 24, d: 28, wall: '#9a7452', roof: '#6a5648', material: 'timber', roofKind: 'gable', gable: 6, roofMat: 'shingle' }, window: 'works', door: 'roller' },
  indoor:    { label: 'THROWS HALL', family: 'industrial', main: { dx: 8, w: 78, h: 24, d: 28, wall: '#a9c1cc', roof: '#5d7f90', material: 'metal', roofKind: 'barrel', crown: 8 }, window: 'works', door: 'roller' },
  testing:   { label: 'TESTING', family: 'industrial', main: { dx: 12, w: 58, h: 25, d: 28, wall: '#c5d9d5', roof: '#4f7f7e', material: 'metal', roofKind: 'flat' }, window: 'works', door: 'roller' },
  lab:       { label: 'LAB', family: 'science', main: { dx: 14, w: 56, h: 24, d: 28, wall: '#dbe5e9', roof: '#8a9aa4', material: 'plaster', roofKind: 'flat' }, window: 'sash', door: 'glass' },
  institute: { label: 'SCIENCE', family: 'science', main: { dx: 12, w: 66, h: 30, d: 28, wall: '#cddce4', roof: '#5d7788', material: 'glass', roofKind: 'flat' }, window: null, door: 'glass' },
  dorm:      { label: 'DORMS', family: 'home', main: { dx: 14, w: 58, h: 29, d: 26, wall: '#c18c6a', roof: '#8c4f3c', material: 'brick', roofKind: 'gable', gable: 8, roofMat: 'tile' }, window: 'shutter', door: 'panel', rows: 2, lit: .35 },
  scout:     { label: 'SCOUT', family: 'home', main: { dx: 14, w: 46, h: 23, d: 24, wall: '#d4cfab', roof: '#65754b', material: 'stone', roofKind: 'hip', gable: 6, roofMat: 'shingle' }, window: 'sash', door: 'panel', lit: .2 },
  lodge:     { label: 'COACH', family: 'home', main: { dx: 18, w: 56, h: 24, d: 28, wall: '#ae906c', roof: '#5e4c3c', material: 'clapboard', roofKind: 'gable', gable: 9, roofMat: 'shingle' }, window: 'shutter', door: 'panel', lit: .7 },
  spa:       { label: 'SPA', family: 'home', main: { dx: 14, w: 44, h: 23, d: 26, wall: '#d7e5df', roof: '#4e8b86', material: 'plaster', roofKind: 'hip', gable: 7, roofMat: 'slate' }, window: 'sash', door: 'glass' },
};
// Extra volumes by level, placed so every one fits its parcel (see tests/neighbourhood.test.js).
// Wings that sit beside the main building's lit side are drawn first, so the main volume
// overlaps them; sheds against the shadow side are drawn after it.
function extensions(type, L, x, b, main) {
  const out = { before: [], after: [] }, add = (list, v) => list.push({ material: main.material, wall: main.wall, roof: main.roof, ...v });
  if (type === 'club' && L >= 2) add(out.before, { x: x + 6, y: b, w: 16, h: 16, d: 22, roofKind: 'hip', gable: 5, roofMat: 'tile' });
  if (type === 'gym' && L >= 2) add(out.after, { x: x + 72, y: b, w: 20, h: 14, d: 22, wall: '#8a9a9c', material: 'metal', roofKind: 'flat', parapet: false, roof: '#6a7478' });
  if (type === 'workshop' && L >= 2) add(out.after, { x: x + 74, y: b, w: 18, h: 13, d: 20, wall: '#8a7a62', roofKind: 'flat', parapet: false, roof: '#5a5048' });
  if (type === 'lab' && L >= 2) add(out.after, { x: x + 78, y: b - 2, w: 16, h: 15, d: 19, roofKind: 'flat' });
  if (type === 'testing' && L >= 2) add(out.after, { x: x + 74, y: b - 2, w: 18, h: 14, d: 20, material: 'plaster', wall: '#d8e2de', roofKind: 'flat' });
  if (type === 'institute' && L >= 2) add(out.after, { x: x + 82, y: b - 4, w: 14, h: 20, d: 16, material: 'plaster', wall: '#e0e8ec', roofKind: 'flat' });
  if (type === 'scout' && L >= 3) add(out.after, { x: x + 80, y: b - 2, w: 12, h: 38, d: 12, wall: '#b8a888', material: 'timber', roofKind: 'hip', gable: 5, roofMat: 'shingle', roof: '#65754b' });
  if (type === 'spa' && L >= 3) add(out.before, { x: x + 82, y: b - 14, w: 14, h: 14, d: 12, material: 'timber', wall: '#a07a52', roofKind: 'gable', gable: 4, roofMat: 'shingle', roof: '#6a5040' });
  if (type === 'library' && L >= 2) add(out.before, { x: x + 4, y: b - 2, w: 14, h: 18, d: 20, roofKind: 'hip', gable: 5, roofMat: 'slate' });
  return out;
}
export function facilityModel(type, level, index) {
  const [x, top] = LOTS[index], L = Math.min(3, level), b = baseOf(index) - 2, bounds = parcelBounds(index), spec = T[type];
  let blocks = [], main = null;
  if (spec) {
    const m = spec.main, grow = type === 'dorm' || type === 'institute' ? 3 : type === 'library' ? 2 : 1;
    main = { ...m, label: spec.label, x: x + m.dx, y: b, h: m.h + 4 + (L - 1) * grow, seed: index * 31 + 7 };
    const ext = extensions(type, L, x, b, main);
    blocks = [...ext.before, main, ...ext.after];
  }
  const door = main ? doorPlan({ family: spec.family }, spec, main) : null,
    entry = main ? [door.x + Math.floor(door.w / 2), b + 2] : [x + 52, b];
  return { type, level, L, index, x, top, b, bounds, blocks, main, family: spec?.family, entry, depth: b + 3, gate: [x + 31, streetOf(index) - 12] };
}
export function projectedFootprint(block) {
  const { x, y, w, d } = block, dx = Math.round(d * DX), dy = Math.round(d * DY);
  return { x, y: y - dy, w: w + dx, h: dy };
}

// Ground follows use: formal paving with a border at civic buildings, gravel yards at the
// industrial ones, paving and a terrace at shops, and only a path and doorstep at homes.
export function drawFacilityGround(g, m, season) {
  withinGround(g, m.bounds, () => {
    const paving = season === 3 ? '#dfe4df' : '#c7bba0', gravel = season === 3 ? '#e2e4de' : '#b9b19c', fam = m.family;
    for (const b of m.blocks) {
      const f = projectedFootprint(b);
      if (fam === 'industrial') surface(g, f.x - 6, f.y - 2, f.w + 10, f.h + 12, gravel, 'gravel', m.index);
      else if (fam !== 'home') surface(g, f.x - 3, f.y - 2, f.w + 6, f.h + 6, paving, 'paving', m.index);
      else rect(g, f.x - 1, f.y - 1, f.w + 2, f.h + 3, season === 3 ? '#d8ded8' : '#9fb07c');
      const reach = 8 + Math.round(b.h * .35), dx = Math.round(b.d * DX), dy = Math.round(b.d * DY);
      poly(g, [[b.x + 2, b.y + 3], [b.x + b.w + reach, b.y + 3], [b.x + b.w + dx + reach, b.y - dy + 4], [b.x + dx, b.y - dy]], CAST);
      rect(g, b.x - 1, b.y - 1, b.w + 2, 3, CAST);
    }
    if (fam === 'civic' && m.main) {
      // A formal forecourt, kerbed, with a border in a darker stone.
      const f = projectedFootprint(m.main), y0 = m.b + 2;
      surface(g, f.x - 2, y0, f.w - 6, 8, paving, 'paving', m.index);
      rect(g, f.x - 2, y0 + 8, f.w - 6, 1, tone(paving, -.3)); rect(g, f.x - 2, y0, 1, 8, tone(paving, .2)); rect(g, f.x + f.w - 9, y0, 1, 8, tone(paving, -.26));
    }
    const [ex, ey] = m.entry, [gx, gy] = m.gate, joint = gy - 5, path = fam === 'industrial' ? gravel : paving, mat = fam === 'industrial' ? 'gravel' : 'paving';
    surface(g, ex - 4, ey, 8, Math.max(1, joint - ey + 4), path, mat, m.index);
    surface(g, Math.min(ex, gx) - 4, joint, Math.abs(ex - gx) + 8, 8, path, mat, m.index);
    surface(g, gx - 4, joint, 8, gy - joint + 1, path, mat, m.index);
    if (m.type === 'cafe') surface(g, m.x + 70, m.b - 14, 32, 22, paving, 'paving', m.index);
    if (m.type === 'garden' || m.type === 'fountain' || m.type === 'statue') surface(g, m.x + 12, m.b - 26, 86, 30, paving, 'paving', m.index);
  });
}

// Text on a coloured plate: dark ink on light colours, cream on dark ones.
const ink = c => { const n = parseInt(c.slice(1, 7), 16); return .3 * (n >> 16 & 255) + .59 * (n >> 8 & 255) + .11 * (n & 255) > 150 ? '#2a2420' : '#f7edcf'; };

// Facade layout. Every facade has a sign band under the eave and an openings band below it.
// Civic, science and home buildings are symmetric: the door on the centre line, the nameboard
// centred over it and windows paired either side. Shops put the door at one end under the
// awning with the display window beside it. Works buildings run roller door, side door and a
// row of works windows from the left, with the nameboard over the roller door.
const centred = m => m.family !== 'commercial' && m.family !== 'industrial';
function doorPlan(m, spec, main) {
  if (spec.door === 'roller') return { x: main.x + 28, w: 6, roller: main.x + 5 };
  const w = spec.door === 'double' || spec.door === 'glass' ? 10 : 6;
  if (m.family === 'commercial') return { x: main.x + 5, w: 7 };
  return { x: main.x + Math.round(main.w / 2) - Math.round(w / 2), w };
}
function signRect(m, spec, main) {
  const w = measure(main.label) + 4, rows = spec.rows || 1;
  const x = centred(m) || m.family === 'commercial' ? Math.round(main.x + main.w / 2 - w / 2) : main.x + 5;
  return { x, y: rows === 2 ? main.y - 28 : main.y - main.h + 3, w, h: 10 };
}
// The nameboard takes each family's form and upgrades from plain, to framed, to club colours.
function nameboard(g, m, spec, main, colors) {
  const { L, family } = m, { x, y, w } = signRect(m, spec, main),
    plate = L >= 3 ? colors.primary : family === 'civic' ? tone(main.wall, .25) : family === 'commercial' ? '#3f4a44' : family === 'industrial' ? tone(main.wall, -.42) : family === 'science' ? '#2f3d48' : '#7a5a3e';
  rect(g, x, y, w, 9, plate);
  if (L >= 2) { rect(g, x, y, w, 1, tone(plate, .28)); rect(g, x, y + 8, w, 1, selOut(plate, .45)); rect(g, x + w - 1, y, 1, 9, selOut(plate, .4)); }
  rect(g, x + 1, y + 9, w - 1, 1, SHADOW);
  text(g, main.label, x + 2, y + 1, { color: ink(plate), outline: null });
}
function windowSlots(m, spec, main, door) {
  const kind = spec.window, [ww] = WINDOW[kind], wide = kind === 'shutter' ? 4 : 0, gap = kind === 'shutter' ? 10 : 7, out = [];
  const fits = xx => xx - wide >= main.x + 3 && xx + ww + wide <= main.x + main.w - 3;
  if (centred(m)) {
    const margin = m.family === 'civic' ? (m.L >= 3 ? 11 : 8) : 7;
    for (let k = 0; ; k++) {
      const left = door.x - margin - ww - wide - k * (ww + gap), right = door.x + door.w + margin + wide + k * (ww + gap);
      if (!fits(left) || !fits(right)) break;
      out.push(left, right);
    }
  } else for (let xx = door.x + door.w + (kind === 'shop' ? 4 : 6); fits(xx); xx += ww + (kind === 'shop' ? 5 : 4)) out.push(xx);
  return out;
}
// Windows in their slots, row by row, clear of the nameboard. Only some are lit: warm windows
// are a focal point, not wallpaper.
function windows(g, m, spec, main, door, season) {
  if (!spec.window) return;
  const kind = spec.window, [ww, wh] = WINDOW[kind], rows = spec.rows || 1, sign = signRect(m, spec, main),
    trim = m.family === 'civic' ? '#f2ead6' : m.family === 'industrial' ? tone(main.wall, -.4) : '#efe6cf', lit = spec.lit || .12;
  const slots = windowSlots(m, spec, main, door);
  for (let row = 0; row < rows; row++) {
    const y = m.family === 'commercial' ? main.y - 10 : main.y - 6 - wh - row * (wh + 5);
    // An upper floor also has a window over the door.
    const xs = row && centred(m) ? [...slots, door.x + Math.round(door.w / 2) - Math.round(ww / 2)] : slots;
    for (const xx of xs) {
      // Skip only a window whose frame would actually touch the board or its shadow.
      if (xx - 1 < sign.x + sign.w && xx + ww + 1 > sign.x && y - 1 <= sign.y + 9) continue;
      const on = hash(xx * 13 + row * 7 + m.index) < lit;
      windowAt(g, kind, xx, y, { lit: on, trim, shutter: tone(main.roof, -.05), box: m.type === 'dorm' || (m.type === 'lodge' && row === 0) ? ['#e86a6a', '#f6d04c', '#c890e0'][(xx >> 2) % 3] : null, goods: m.type === 'shop' ? ['#f4efe2', '#e05a4a', '#4a7ab0'] : m.type === 'cafe' ? ['#c88a4a', '#f4e4c0', '#a0603a'] : null, season });
    }
  }
}
// The entrance gets the most detail on each building.
function entrance(g, m, spec, main, colors, door) {
  const { family, L } = m, y = main.y, dx = door.x, dw = door.w;
  if (door.roller != null) {
    doorAt(g, 'roller', door.roller, y, { trim: tone(main.wall, -.35) });
    doorAt(g, 'panel', dx, y, { color: colors.primary, trim: tone(main.wall, -.35) });
    rect(g, dx - 2, y - 14, 10, 2, '#5a6266'); rect(g, dx - 2, y - 14, 10, 1, '#8a9296'); rect(g, dx - 1, y - 12, 8, 1, SHADOW);
    if (L >= 2) lantern(g, dx + 7, y - 11);
    return;
  }
  if (family === 'civic') {
    // A portico: steps, columns and a pediment centred on the door; the top level doubles the
    // columns.
    steps(g, dx - 4, y, dw + 8); steps(g, dx - 2, y - 1, dw + 4);
    doorAt(g, 'double', dx, y - 1, { trim: '#f2ead6', h: 12 });
    const cols = L >= 3 ? [dx - 8, dx - 4, dx + dw + 2, dx + dw + 6] : [dx - 4, dx + dw + 2], l = cols[0] - 2, r = cols.at(-1) + 4, mid = Math.round((l + r) / 2);
    for (const cx of cols) { rect(g, cx, y - 15, 2, 14, '#f0e8d8'); rect(g, cx + 1, y - 15, 1, 14, '#c8bea8'); rect(g, cx - 1, y - 16, 4, 1, '#d8ceb8'); }
    rect(g, l, y - 17, r - l, 2, '#efe6d2'); rect(g, l, y - 17, r - l, 1, '#fff8e8');
    poly(g, [[l, y - 17], [r, y - 17], [mid, y - 21]], '#efe6d2');
    line(g, l, y - 17, mid, y - 21, '#fff8e8'); line(g, mid, y - 21, r, y - 17, '#b8ae98');
    rect(g, l + 1, y - 15, r - l - 2, 1, SHADOW);
    return;
  }
  if (family === 'commercial') { doorAt(g, 'glass', dx, y, { trim: '#3f4a44', w: dw, h: 10 }); steps(g, dx - 1, y, dw + 2); return; }
  if (family === 'science') {
    doorAt(g, 'glass', dx, y, { trim: '#9aa6ac', w: dw });
    rect(g, dx - 5, y - 15, dw + 10, 2, '#e8eef0'); rect(g, dx - 5, y - 13, dw + 10, 1, '#9aa6ac'); rect(g, dx - 4, y - 12, dw + 8, 1, SHADOW);
    steps(g, dx - 2, y, dw + 4, '#d6dcdc');
    return;
  }
  // Homes: a panelled door in the club colour (glass at the spa), a step, a lantern, and a
  // small gabled hood from level 2 (the lodge has its porch instead).
  doorAt(g, spec.door === 'glass' ? 'glass' : 'panel', dx, y, { color: colors.primary, w: dw });
  steps(g, dx - 1, y, dw + 2);
  lantern(g, dx + dw + 1, y - 11);
  if (L >= 2 && m.type !== 'lodge') {
    const mid = dx + Math.round(dw / 2) - 1;
    poly(g, [[dx - 3, y - 12], [dx + dw + 2, y - 12], [mid, y - 17]], tone(main.roof, .05));
    line(g, dx - 3, y - 12, mid, y - 17, tone(main.roof, .3)); line(g, mid, y - 17, dx + dw + 2, y - 12, selOut(main.roof, .5));
    rect(g, dx - 3, y - 12, dw + 5, 1, selOut(main.roof, .5)); rect(g, dx - 2, y - 11, dw + 3, 1, SHADOW);
  }
}

// What each type keeps around it, and what its upgrades add. `back` draws before the building
// (behind or beside it), `front` after it. Planting differs per type rather than repeating the
// same two bushes on every plot.
const DETAILS = {
  club: {
    front(g, c) {
      const { m, main, season, colors, now } = c, fx = m.L >= 2 ? m.x + 100 : m.x + 9, fy = m.b - 2, tip = fy - 24, wave = Math.round(Math.sin(now / 350 + m.index));
      rect(g, fx, tip, 1, 24, '#87958b'); rect(g, fx - 1, fy, 3, 1, '#6a7470');
      poly(g, [[fx + 1, tip], [fx + 11, tip + 3 + wave], [fx + 1, tip + 7]], colors.primary); rect(g, fx + 2, tip + 3, 6, 1, colors.secondary);
      // Clipped bay trees in tubs flank the portico.
      const door = c.door, mid = door.x + Math.round(door.w / 2);
      for (const tx of [mid - 22, mid + 19]) { rect(g, tx, m.b + 1, 4, 3, '#8a6a4a'); rect(g, tx, m.b + 1, 4, 1, tone('#8a6a4a', .25)); ellipse(g, tx + 2, m.b - 2, 3, 3, ['#5f8f4a', '#4d8445', '#8a7a40', '#dfe6e0'][season]); px(g, tx + 1, m.b - 4, tone('#5f8f4a', .3)); }
      noticeboard(g, m.L >= 2 ? m.x + 86 : m.x + 96, m.b + 6, colors.primary);
      if (m.L >= 3) { flowerbed(g, mid - 26, m.b + 10, 14, season, 3); flowerbed(g, mid + 13, m.b + 10, 14, season, 5); }
    },
    roof(g, c) {
      const { main, m, colors, season } = c;
      if (m.L < 3) return;
      // A clock turret astride the ridge, over the door: the civic emblem.
      const { dx, dy } = geo(main), ridgeY = Math.round(main.y - main.h - dy / 2 - main.gable), cx = c.door.x + Math.round(c.door.w / 2) + Math.round(dx / 2) - 5;
      drawBuildingVolume(g, { x: cx, y: ridgeY + 3, w: 10, h: 11, d: 8, wall: main.wall, roof: main.roof, material: 'plaster', roofKind: 'hip', gable: 5, roofMat: 'tile' }, season);
      ellipse(g, cx + 5, ridgeY - 3, 3, 3, '#fffaf0'); px(g, cx + 5, ridgeY - 5, '#2a2420'); px(g, cx + 5, ridgeY - 4, '#2a2420'); px(g, cx + 6, ridgeY - 3, '#2a2420');
      px(g, cx + 5, ridgeY - 6, colors.primary);
    },
  },
  library: {
    back(g, c) { if (c.m.L >= 3) tree(g, c.m.x + 102, c.m.b - 8, .62, c.season, c.m.index); },
    front(g, c) {
      const { m, main, season } = c;
      vine(g, main.x, main.y - main.h + 6, main.y - 1, season, m.index);
      if (m.L >= 2) vine(g, main.x + main.w - 3, main.y - main.h + 10, main.y - 1, season, m.index + 3);
      bench(g, main.x + main.w + 2, m.b + 8);
      if (m.L >= 3) { flowerbed(g, m.x + 6, m.b + 10, 16, season, 11); bush(g, m.x + 100, m.b + 9, season); }
    },
  },
  cafe: {
    facade(g, c) {
      const { main, colors } = c;
      // A striped awning across the shopfront, over the door and display window.
      for (let xx = main.x - 1; xx < main.x + main.w + 1; xx += 4) rect(g, xx, main.y - 15, Math.min(4, main.x + main.w + 1 - xx), 3, Math.floor((xx - main.x + 1) / 4) % 2 ? colors.primary : '#f2e5c6');
      for (let xx = main.x - 1; xx < main.x + main.w + 1; xx += 4) rect(g, xx + 1, main.y - 12, 2, 1, Math.floor((xx - main.x + 1) / 4) % 2 ? colors.primary : '#f2e5c6');
      rect(g, main.x, main.y - 11, main.w, 1, SHADOW);
    },
    front(g, c) {
      const { m, main, season, now } = c, x = m.x;
      if (m.L >= 3) {
        // A pergola with string lights over the terrace.
        for (const px0 of [x + 70, x + 100]) { rect(g, px0, m.b - 20, 1, 20, '#8a6a4a'); rect(g, px0 + 1, m.b - 20, 1, 20, tone('#8a6a4a', -.3)); }
        rect(g, x + 69, m.b - 21, 34, 2, '#a07a52'); rect(g, x + 69, m.b - 21, 34, 1, tone('#a07a52', .2));
        for (let k = 0; k < 8; k++) px(g, x + 72 + k * 4, m.b - 18 + (k % 2), Math.floor(now / 600 + k) % 5 ? '#ffe08a' : '#fff6c8');
      }
      for (const cy of m.L >= 2 ? [m.b - 8, m.b + 2] : [m.b - 3]) {
        chair(g, x + 76, cy - 1, '#c86a4a'); chair(g, x + 88, cy - 1, '#4a8a9a');
        ellipse(g, x + 84, cy + 1, 5, 1, SHADOW); rect(g, x + 83, cy - 2, 2, 3, '#79674e'); ellipse(g, x + 84, cy - 3, 5, 2, '#e6d8b8'); px(g, x + 82, cy - 4, '#fff6e0'); px(g, x + 85, cy - 4, '#f4f0e6');
      }
      aboard(g, c.door.x - 2, m.b + 9);
      for (let n = 0; n < 2; n++) { const p = (now / 1800 + n / 2) % 1; px(g, main.x + 31 + Math.sin(now / 500 + n) * 2, main.y - main.h - 16 - p * 10, `rgba(235,239,227,${.6 * (1 - p)})`); }
      flowerbed(g, main.x + main.w - 14, m.b + 2, 12, season, 2);
    },
    roof(g, c) { chimney(g, c.main.x + 30, c.main.y - c.main.h - 4, '#a07a62', 7); },
  },
  shop: {
    facade(g, c) {
      const { main, colors } = c;
      for (let xx = main.x - 1; xx < main.x + main.w + 1; xx += 4) rect(g, xx, main.y - 15, Math.min(4, main.x + main.w + 1 - xx), 3, Math.floor((xx - main.x + 1) / 4) % 2 ? colors.primary : colors.secondary);
      rect(g, main.x - 1, main.y - 12, main.w + 2, 1, selOut(colors.primary, .4)); rect(g, main.x, main.y - 11, main.w, 1, SHADOW);
    },
    front(g, c) {
      const { m, main, colors } = c;
      crate(g, main.x + main.w + 3, m.b + 4, '#c89a5a'); crate(g, main.x + main.w + 8, m.b + 5, '#a77d4c');
      if (m.L >= 2) rack(g, main.x + main.w + 14, m.b + 8, colors);
      aboard(g, c.door.x + c.door.w + 2, m.b + 9);
    },
    roof(g, c) {
      const { main, m, colors } = c;
      if (m.L < 3) return;
      // The club shirt, larger than life, mounted on the middle of the roof.
      const { dx, dy } = geo(main), sx = main.x + Math.round(main.w / 2) + Math.round(dx / 2) - 8, base = main.y - main.h - Math.round(dy / 2);
      rect(g, sx + 4, base - 4, 1, 4, '#5a5e60'); rect(g, sx + 11, base - 4, 1, 4, '#5a5e60');
      const p = colors.primary, top = base - 18;
      // Body, sleeves angled out from the shoulders, a V neck and a hoop in the second colour.
      rect(g, sx + 3, top + 1, 10, 13, p);
      poly(g, [[sx + 3, top + 1], [sx - 1, top + 5], [sx + 1, top + 8], [sx + 3, top + 6]], p);
      poly(g, [[sx + 13, top + 1], [sx + 17, top + 5], [sx + 15, top + 8], [sx + 13, top + 6]], tone(p, -.12));
      rect(g, sx + 3, top + 7, 10, 2, colors.secondary);
      poly(g, [[sx + 6, top + 1], [sx + 10, top + 1], [sx + 8, top + 4]], tone(p, -.45));
      rect(g, sx + 3, top + 1, 1, 13, tone(p, .25)); rect(g, sx + 12, top + 1, 1, 13, selOut(p, .4)); rect(g, sx + 3, top + 14, 10, 1, selOut(p, .5));
    },
  },
  gym: {
    front(g, c) {
      const { m, main, colors } = c;
      kettlebells(g, main.x + main.w - 14, m.b + 7);
      if (m.L >= 2) { rect(g, m.x + 74, m.b + 4, 20, 6, '#3e4642'); rect(g, m.x + 74, m.b + 4, 20, 1, '#5a6460'); for (let k = 0; k < 4; k++) rect(g, m.x + 76 + k * 5, m.b + 6, 3, 2, '#2e3432'); }
      if (m.L >= 3) { crate(g, m.x + 96, m.b + 9, colors.primary); crate(g, m.x + 101, m.b + 9, colors.primary); crate(g, m.x + 98, m.b + 4, colors.secondary); }
    },
  },
  workshop: {
    back(g, c) { lumber(g, c.m.x + 92, c.m.b - 16, 12); },
    front(g, c) {
      const { m, main } = c;
      crate(g, main.x + main.w - 12, m.b + 6); barrel(g, main.x + main.w - 5, m.b + 7);
      if (m.L >= 2) lumber(g, m.x + 78, m.b + 8, 16);
      if (m.L >= 3) {
        // A workbench out in the yard, with a vice and offcuts.
        rect(g, m.x + 4, m.b + 2, 12, 2, '#a07a52'); rect(g, m.x + 4, m.b + 2, 12, 1, tone('#a07a52', .25)); rect(g, m.x + 5, m.b + 4, 1, 4, '#6a5038'); rect(g, m.x + 14, m.b + 4, 1, 4, '#6a5038');
        rect(g, m.x + 12, m.b, 3, 2, '#5a6266'); px(g, m.x + 6, m.b + 1, '#d8b080');
      }
    },
    roof(g, c) {
      const { main, now, m } = c, cy = main.y - main.h - 6;
      chimney(g, main.x + main.w - 14, cy, '#6a6a66', 9); smoke(g, main.x + main.w - 13, cy - 10, now, m.index);
      if (m.L >= 3) { chimney(g, main.x + 16, cy, '#6a6a66', 8); smoke(g, main.x + 17, cy - 9, now + 1700, m.index + 2); }
    },
  },
  indoor: {
    front(g, c) {
      const { m, main, colors } = c;
      // Hurdles stacked by the side door; banners from the top level.
      for (let k = 0; k < 2; k++) {
        const hx = main.x + main.w - 22 + k * 11, hy = m.b + 7;
        rect(g, hx, hy - 7, 1, 7, '#3a3e42'); rect(g, hx + 8, hy - 7, 1, 7, '#3a3e42'); rect(g, hx - 1, hy, 3, 1, '#3a3e42'); rect(g, hx + 7, hy, 3, 1, '#3a3e42');
        for (let s2 = 0; s2 < 9; s2 += 2) rect(g, hx + s2, hy - 7, 2, 2, s2 % 4 ? '#f4f4f0' : '#2a2a2a');
        rect(g, hx, hy + 1, 10, 1, SHADOW);
      }
      // Banners hang clear of the long nameboard, toward the far corner.
      const sr = signRect(m, T.indoor, main), signEnd = sr.x + sr.w;
      if (m.L >= 3) for (const bx of [Math.max(signEnd + 3, main.x + main.w - 17), main.x + main.w - 7].filter((v, i, a) => !i || v - a[0] >= 6)) {
        const by = main.y - main.h + 3;
        rect(g, bx, by, 4, 12, colors.primary); rect(g, bx, by, 1, 12, tone(colors.primary, .25)); rect(g, bx + 3, by, 1, 12, selOut(colors.primary, .4));
        rect(g, bx, by + 5, 4, 2, colors.secondary); px(g, bx + 1, by + 12, colors.primary); px(g, bx + 2, by + 12, colors.primary);
      }
    },
    roof(g, c) {
      const { main, m } = c, { dx, dy } = geo(main);
      // Roof lights along the crown, more of them at each level.
      for (let n = 0; n < m.L + 1; n++) {
        const sx = main.x + 10 + n * 18, sy = main.y - main.h - Math.round(dy * .4) - 6;
        poly(g, [[sx, sy], [sx + 9, sy], [sx + 10 + Math.round(dx * .2), sy - 3], [sx + 1 + Math.round(dx * .2), sy - 3]], '#4b6b7c'); line(g, sx + 2, sy - 2, sx + 8, sy - 2, '#a9cfd8');
      }
    },
  },
  testing: {
    front(g, c) {
      const { m, main, colors } = c;
      crate(g, main.x + 3, m.b + 7, '#7a8a7a'); crate(g, main.x + 9, m.b + 8, '#8a9a8a');
      if (m.L >= 3) {
        // Launch testing: a speed gun on a tripod, aimed down a row of cones.
        const rx = m.x + 74, ry = m.b + 9;
        line(g, rx + 3, ry - 8, rx, ry, '#3a3e42'); line(g, rx + 3, ry - 8, rx + 6, ry, '#3a3e42'); rect(g, rx + 3, ry - 8, 1, 8, '#5a5e60');
        rect(g, rx + 1, ry - 11, 5, 3, '#2f3d48'); rect(g, rx + 6, ry - 10, 1, 1, '#9cc4cf'); px(g, rx + 1, ry - 11, '#5a6a78');
        rect(g, rx, ry + 1, 8, 1, SHADOW);
        for (let k = 0; k < 3; k++) { const cx = rx + 12 + k * 7; poly(g, [[cx, ry], [cx + 4, ry], [cx + 2, ry - 4]], '#f08a3a'); rect(g, cx + 1, ry - 2, 2, 1, '#f4f4f0'); }
      }
    },
    roof(g, c) { const { main, m } = c; rect(g, main.x + main.w - 16, main.y - main.h - 9, 8, 5, '#9aa3a4'); rect(g, main.x + main.w - 16, main.y - main.h - 9, 8, 1, '#c8d0d0'); if (m.L >= 2) dish(g, main.x + 8, main.y - main.h - 3); },
  },
  lab: {
    front(g, c) { const { m, main } = c; if (m.L >= 2) cylinders(g, main.x + main.w + 2, m.b + 6); if (m.L >= 3) bush(g, m.x + 8, m.b + 8, c.season); },
    roof(g, c) {
      const { main, m } = c;
      // Fume vents from the benches, and a dome at the top level.
      for (const vx of [main.x + 8, main.x + 14]) { rect(g, vx, main.y - main.h - 10, 2, 8, '#a8b0b4'); rect(g, vx - 1, main.y - main.h - 11, 4, 1, '#7a8288'); }
      if (m.L >= 3) { ellipse(g, main.x + main.w - 14, main.y - main.h - 8, 10, 7, '#a8c0cc'); ellipse(g, main.x + main.w - 17, main.y - main.h - 10, 5, 3, '#e0e9eb'); line(g, main.x + main.w - 14, main.y - main.h - 15, main.x + main.w - 14, main.y - main.h - 3, '#7a96a4'); }
    },
  },
  institute: {
    front(g, c) {
      const { m, main, season } = c;
      for (const tx of [main.x - 5, main.x + main.w + 3]) { ellipse(g, tx + 2, m.b + 8, 3, 1, SHADOW); ellipse(g, tx + 2, m.b + 4, 3, 4, ['#5f8f4a', '#4d8445', '#8a7a40', '#dfe6e0'][season]); px(g, tx + 1, m.b + 2, tone('#5f8f4a', .3)); }
      bike(g, main.x + main.w - 14, m.b + 8, '#c8503a'); if (m.L >= 2) bike(g, main.x + main.w - 3, m.b + 9, '#4a7ab0');
    },
    roof(g, c) {
      const { main, m } = c;
      for (let n = 0; n < m.L + 1; n++) { const sx = main.x + 8 + n * 13, sy = main.y - main.h - 6; poly(g, [[sx, sy], [sx + 9, sy], [sx + 12, sy - 5], [sx + 3, sy - 5]], '#3d637d'); line(g, sx + 5, sy, sx + 8, sy - 5, '#a2c0c7'); }
      if (m.L >= 3) dish(g, main.x + main.w - 10, main.y - main.h - 6);
    },
  },
  dorm: {
    back(g, c) { const { m, colors, now } = c; laundry(g, m.x + 86, m.b - 2, 18, [colors.primary, '#f4f0e6', colors.secondary, '#9ab4d0'], now, m.index); },
    front(g, c) { const { m, main } = c; bike(g, main.x + main.w - 16, m.b + 8, '#4a7ab0'); if (m.L >= 2) bike(g, main.x + main.w - 5, m.b + 9, '#d0603a'); if (m.L >= 3) chair(g, main.x + 2, m.b + 7); },
    roof(g, c) {
      const { main, m } = c;
      // Dormers break the long roof from level 2.
      if (m.L >= 2) for (const dx of [main.x + 10, main.x + main.w - 22]) {
        const y = main.y - main.h - 2;
        rect(g, dx, y - 7, 10, 7, main.wall); rect(g, dx, y - 7, 1, 7, tone(main.wall, .2)); rect(g, dx + 9, y - 7, 1, 7, selOut(main.wall, .5));
        rect(g, dx + 2, y - 5, 6, 4, '#3f5a68'); px(g, dx + 6, y - 4, '#a9cfd8'); rect(g, dx + 4, y - 5, 1, 4, '#efe6cf');
        poly(g, [[dx - 1, y - 7], [dx + 11, y - 7], [dx + 5, y - 11]], main.roof); line(g, dx - 1, y - 7, dx + 5, y - 11, tone(main.roof, .3)); line(g, dx + 5, y - 11, dx + 11, y - 7, selOut(main.roof, .5));
      }
      chimney(g, main.x + main.w - 6, main.y - main.h - 8, '#9a5a42', 8);
    },
  },
  scout: {
    front(g, c) { const { m, main, season } = c; noticeboard(g, main.x - 10, m.b + 6); bush(g, main.x + main.w + 6, m.b + 6, season); if (m.L >= 2) wateringCan(g, main.x + main.w - 4, m.b + 6); },
    roof(g, c) { const { main, m, now } = c; if (m.L >= 2) antenna(g, main.x + main.w - 10, main.y - main.h - 8, 16, now); },
  },
  lodge: {
    back(g, c) { const { m } = c; woodpile(g, m.x + 88, m.b - 6, 4); if (m.L >= 3) tree(g, m.x + 104, m.b - 4, .6, c.season, m.index); },
    front(g, c) {
      const { m, main, season } = c;
      // A porch along the front: posts, a rail and chairs facing the street.
      const py = main.y - 16;
      rect(g, main.x - 2, py, main.w + 4, 2, tone(main.roof, .1)); rect(g, main.x - 2, py, main.w + 4, 1, tone(main.roof, .32)); rect(g, main.x, py + 2, main.w, 1, SHADOW);
      const d = c.door;
      for (const px0 of [main.x, d.x - 4, d.x + d.w + 2, main.x + main.w - 2]) { rect(g, px0, py + 2, 1, 14, '#8a6a4a'); rect(g, px0 + 1, py + 2, 1, 14, tone('#8a6a4a', -.3)); }
      rect(g, main.x + 2, main.y - 5, d.x - 6 - main.x, 1, '#a07a52'); rect(g, d.x + d.w + 4, main.y - 5, main.x + main.w - d.x - d.w - 6, 1, '#a07a52');
      if (m.L >= 2) { chair(g, c.door.x - 12, m.b + 3, '#b0703a'); chair(g, c.door.x + c.door.w + 8, m.b + 3, '#6a8a5a'); }

      flowerbed(g, m.x + 6, m.b + 10, 10, season, 7);
    },
    roof(g, c) { const { main, now, m } = c, cy = main.y - main.h - 7; chimney(g, main.x + 10, cy, '#8a7a6a', 9); smoke(g, main.x + 11, cy - 10, now, m.index + 5); },
  },
  spa: {
    back(g, c) {
      const { m, now } = c;
      // The sauna hut's stove vents steam now and then.
      if (m.L >= 3) smoke(g, m.x + 92, m.b - 34, now, m.index + 9);
    },
    front(g, c) {
      const { m, season, now } = c, x = m.x, b = m.b;
      if (m.L >= 3) {
        // The sauna hut: a timber door, a small window and a stovepipe.
        doorAt(g, 'panel', x + 84, b - 14, { color: '#6a4a30', trim: '#4a3424', w: 4, h: 9 });
        windowAt(g, 'small', x + 91, b - 22, { trim: '#4a3424', lit: true });
        rect(g, x + 92, b - 34, 2, 6, '#4a4e52'); rect(g, x + 91, b - 35, 4, 1, '#3a3e42');
      }
      drawBuildingVolume(g, { x: x + 68, y: b - 1, w: 26, h: 4, d: 18, wall: '#b5c4be', roof: '#77b9ca', material: 'stone', parapet: false }, season);
      line(g, x + 72, b - 7, x + 92, b - 7, '#c6eef0'); line(g, x + 76, b - 9, x + 95, b - 9, '#a8e0e4');
      // Steam drifts off the warm pool now and then.
      for (let n = 0; n < 3; n++) { const p = (now / 2600 + n / 3) % 1; if (p < .6) px(g, x + 74 + n * 7 + Math.sin(now / 700 + n) * 1.5, b - 10 - p * 9, `rgba(240,246,244,${(.55 * (1 - p / .6)).toFixed(2)})`); }
      if (m.L >= 2) for (const lx of [x + 70, x + 84]) {
        // Sun loungers along the pool's near edge, backrests raised toward the building.
        const ly = b + 4;
        rect(g, lx, ly - 4, 3, 4, '#e8e8e2'); rect(g, lx, ly - 4, 3, 1, '#ffffff');
        rect(g, lx + 3, ly - 1, 8, 2, '#f4f4f0'); rect(g, lx + 3, ly - 1, 8, 1, '#ffffff'); rect(g, lx + 4, ly - 1, 6, 1, '#7ac0c8');
        rect(g, lx + 1, ly, 1, 2, '#8a969c'); rect(g, lx + 10, ly + 1, 1, 1, '#8a969c'); rect(g, lx, ly + 2, 11, 1, SHADOW);
      }
      bush(g, x + 8, b + 8, season); if (m.L >= 3) flowerbed(g, x + 54, b + 10, 12, season, 9);
    },
  },
};
function ring4(g, x, y, c) { px(g, x, y - 4, c); px(g, x, y + 4, c); px(g, x - 4, y, c); px(g, x + 4, y, c); }

export function drawFacilityStructure(g, m, season, colors, now = 0) {
  const { type, L, x, b } = m, spec = T[type], det = DETAILS[type] || {}, ctx = { m, main: m.main, season, colors, now };
  det.back?.(g, ctx);
  for (const block of m.blocks) {
    drawBuildingVolume(g, block, season);
    if (block === m.main) {
      const main = m.main, door = doorPlan(m, spec, main);
      ctx.door = door;
      det.roof?.(g, ctx);
      windows(g, m, spec, main, door, season);
      det.facade?.(g, ctx);
      entrance(g, m, spec, main, colors, door);
      nameboard(g, m, spec, main, colors);
    } else if (block.material !== 'glass' && block.h > 12) {
      // Annexes get a window or two of the main building's kind.
      const kind = spec.window === 'shop' || spec.window === 'tall' ? 'sash' : spec.window || 'sash', [ww, wh] = WINDOW[kind];
      for (let xx = block.x + 3; xx + ww < block.x + block.w - 2; xx += ww + 6) windowAt(g, kind === 'shutter' ? 'sash' : kind, xx, kind === 'small' ? block.y - block.h + 6 : block.y - 5 - wh, { trim: m.family === 'industrial' ? tone(block.wall, -.4) : '#efe6cf' });
    }
  }
  if (spec) det.front?.(g, ctx);
  else if (type === 'garden') {
    for (const [bx, by] of [[x + 20, b - 13], [x + 56, b - 21]]) {
      drawBuildingVolume(g, { x: bx, y: by, w: 27, h: 3, d: 13, wall: '#9c7c55', roof: '#625c3b', material: 'timber', parapet: false }, season);
      for (let k = 0; k < 8; k++) { const xx = bx + 3 + k * 3; rect(g, xx, by - 6, 1, 3, '#527347'); px(g, xx, by - 7, ['#e6be64', '#e5a68b', '#eeead4'][k % 3]); }
    }
    tree(g, x + 89, b - 7, .65, season, m.index); bench(g, x + 25, b + 1); wateringCan(g, x + 50, b - 8);
    if (L >= 2) woodpile(g, x + 8, b - 18, 2);
  } else if (type === 'fountain') {
    ellipse(g, x + 55, b - 3, 27, 11, CAST);
    ellipse(g, x + 52, b - 8, 26, 10, '#8b9689'); ellipse(g, x + 52, b - 11, 26, 10, '#d4d0b8'); ellipse(g, x + 52, b - 12, 21, 7, '#69a9bf');
    drawBuildingVolume(g, { x: x + 48, y: b - 10, w: 8, h: 15, d: 10, wall: '#bdc7b6', roof: '#e8ddbb', material: 'stone', parapet: false }, season);
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4, p = (now / 900 + n / 8) % 1; px(g, x + 52 + Math.cos(a) * p * 17, b - 29 + p * p * 18, '#c8e9e8'); }
  } else if (type === 'statue') {
    drawBuildingVolume(g, { x: x + 40, y: b, w: 27, h: 7, d: 19, wall: '#a7a38d', roof: '#d6cab0', material: 'stone', parapet: false }, season);
    drawBuildingVolume(g, { x: x + 46, y: b - 7, w: 15, h: 13, d: 12, wall: '#c4b68f', roof: '#e9d6a9', material: 'stone', parapet: false }, season);
    figure(g, { look: { skin: '#cda94f', hair: '#b28d3d', style: 0 }, shirt: '#cda94f', collar: '#f4db88', pose: 'cheer', frame: 0 }, x + 53, b - 23, 1);
    if (L > 1) for (const dx of [25, 82]) bush(g, x + dx, b - 2, season);
  }
}
