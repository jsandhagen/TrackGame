import test from 'node:test';
import assert from 'node:assert/strict';
import { tone, selOut } from '../src/render/pixel.js';
import { facilityModel, drawFacilityStructure } from '../src/render/facility-scene.js';

const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

test('scenery ramps shift hue: shadows cool toward blue, highlights warm toward cream', () => {
  for (const c of ['#bd7552', '#8fb76b', '#c7bba0']) {
    const [r, , b] = rgb(c), [sr, , sb] = rgb(tone(c, -0.4)), [hr, , hb] = rgb(tone(c, 0.4));
    assert(sb / Math.max(1, sr) > b / Math.max(1, r), `${c}: the shadow is bluer than the base`);
    assert(hr >= hb, `${c}: the highlight leans warm`);
    assert(rgb(selOut(c)).reduce((a, v) => a + v) < rgb(tone(c, -0.3)).reduce((a, v) => a + v), `${c}: the outline is darker than the shadow face`);
  }
});

// Count what each upgrade level paints, without rasterising.
const context = (count = () => {}) => new Proxy({}, {
  get: (t, k) => k === 'fillRect' || k === 'drawImage' ? count : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k in t ? t[k] : () => {},
  set: (t, k, v) => (t[k] = v, true),
});
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return context(); } };
function painted(type, level) {
  let n = 0;
  const g = context(() => n++);
  drawFacilityStructure(g, facilityModel(type, level, 10), 1, { primary: '#2f6b52', secondary: '#f2c94c' }, 0);
  return n;
}
test('every facility shows its upgrade level on the building itself', () => {
  for (const type of ['gym', 'cafe', 'shop', 'spa', 'dorm', 'scout', 'workshop', 'library', 'lab', 'institute', 'indoor', 'lodge', 'testing', 'club']) {
    const [one, two, three] = [1, 2, 3].map(L => painted(type, L));
    assert(two > one && three > two, `${type}: ${one} → ${two} → ${three}`);
  }
});

test('facility types and houses differ in form, not only colour', async () => {
  const types = ['club', 'library', 'cafe', 'shop', 'gym', 'workshop', 'indoor', 'testing', 'lab', 'institute', 'dorm', 'scout', 'lodge', 'spa'];
  const mains = types.map(t => facilityModel(t, 1, 10).main);
  const kinds = new Set(mains.map(m => m.roofKind)), looks = new Set(mains.map(m => [m.roofKind, m.material, m.roofMat, m.w, m.h].join()));
  assert(kinds.size >= 5, `roof forms: ${[...kinds]}`);
  assert.equal(looks.size, types.length, 'no two building types share a silhouette and material');
  for (const t of types) assert(facilityModel(t, 3, 10).blocks.length >= facilityModel(t, 1, 10).blocks.length, `${t} never loses a wing when upgraded`);
  assert(types.filter(t => facilityModel(t, 3, 10).blocks.length > facilityModel(t, 1, 10).blocks.length).length >= 8, 'most types grow a wing, tower or pavilion');
});
