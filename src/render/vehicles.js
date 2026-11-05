// Parked vehicles in side view, for kerbs, bays and loading areas. A few clearly different
// silhouettes (sedan, hatchback, SUV, van, pickup, delivery van) read better at map scale than many
// near-identical cars. x is the rear-left of the footprint, y the ground line; dir 1 faces
// right, -1 faces left. Light comes from the upper left: lit roofs, a darker sill, a cool
// shadow under the body.
import { rect, px, tone, selOut } from './pixel.js';

export const VEHICLES = {
  sedan: { len: 22 }, hatch: { len: 18 }, suv: { len: 24 }, van: { len: 26 }, pickup: { len: 26 }, delivery: { len: 30 },
};
export const vehicleLength = kind => VEHICLES[kind]?.len ?? 22;
const GLASS = '#3f5a68', GLINT = '#a9cfd8', TYRE = '#2a2a2c', HUB = '#9aa0a4';

export function vehicle(g, kind, x, y, color, dir = 1) {
  const L = vehicleLength(kind), X = (a, w = 1) => dir > 0 ? x + a : x + L - a - w;
  const r = (a, b, w, h, c) => rect(g, X(a, w), y + b, w, h, c);
  const lit = tone(color, .22), dark = tone(color, -.28), edge = selOut(color, .5);
  rect(g, x + 1, y, L, 2, 'rgba(26,32,66,.28)');
  const wheel = a => { r(a, -3, 4, 3, TYRE); r(a + 1, -2, 2, 1, HUB); };
  if (kind === 'van' || kind === 'delivery') {
    const box = kind === 'delivery' ? '#eeeae0' : color, H = 13;
    r(0, -H - 1, L - 6, H, box); r(0, -H - 1, L - 6, 1, tone(box, .25)); r(0, -4, L - 6, 2, tone(box, -.25));
    r(L - 6, -10, 6, 8, color); r(L - 6, -10, 5, 1, lit); r(L - 3, -9, 3, 3, GLASS); px(g, X(L - 2), y - 9, GLINT);
    r(L - 6, -4, 6, 2, dark);
    if (kind === 'van') { r(4, -12, 6, 4, GLASS); r(12, -12, 6, 4, GLASS); px(g, X(5), y - 12, GLINT); }
    else { r(2, -9, L - 10, 2, color); r(2, -7, L - 10, 1, tone(color, -.3)); }
    r(0, -H - 1, 1, H, edge); wheel(3); wheel(L - 8);
    return;
  }
  if (kind === 'pickup') {
    r(0, -7, L, 5, color); r(0, -7, L, 1, lit); r(0, -3, L, 1, dark);
    r(9, -12, 9, 5, color); r(9, -12, 9, 1, lit); r(11, -11, 6, 3, GLASS); px(g, X(15), y - 11, GLINT);
    r(1, -8, 7, 1, tone(color, -.35)); r(0, -8, 1, 2, lit);
    wheel(3); wheel(L - 7);
    return;
  }
  const body = kind === 'suv' ? 7 : 5, cabinH = kind === 'suv' ? 5 : 4,
    [c0, c1] = kind === 'hatch' ? [2, 12] : kind === 'suv' ? [2, L - 6] : [5, 16];
  r(0, -2 - body, L, body, color); r(0, -2 - body, L, 1, lit); r(0, -3, L, 1, dark);
  r(c0, -2 - body - cabinH, c1 - c0, cabinH, color); r(c0, -2 - body - cabinH, c1 - c0, 1, lit);
  r(c0 + 1, -1 - body - cabinH, Math.floor((c1 - c0 - 3) / 2), cabinH - 1, GLASS);
  r(c0 + 2 + Math.floor((c1 - c0 - 3) / 2), -1 - body - cabinH, Math.ceil((c1 - c0 - 3) / 2), cabinH - 1, GLASS);
  px(g, X(c1 - 2), y - body - cabinH, GLINT);
  r(L - 1, -1 - body, 1, 2, '#f4e4a0'); r(0, -1 - body, 1, 2, '#c84a3a');
  wheel(2); wheel(L - 6);
}
export const CAR_COLOURS = ['#c84a40', '#4a7ac0', '#e8e4d8', '#5a9a5a', '#e8b040', '#7a7a80', '#2f3a48', '#8a5a9a'];
