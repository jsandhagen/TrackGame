import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_ROADS, CROSSINGS, SIGNALS, STOP_ARMS, FURNITURE, KERB_CARS, RESIDENTIAL_LOTS } from '../src/render/neighbourhood.js';
import { vehicleLength } from '../src/render/vehicles.js';

const roadRect = r => r.y1 === r.y2 ? { x: r.x1, y: r.y1 - r.width / 2, w: r.x2 - r.x1, h: r.width } : { x: r.x1 - r.width / 2, y: r.y1, w: r.width, h: r.y2 - r.y1 };
const inside = (x, y, b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

test('every road has a rank, and the main roads are the through routes', () => {
  for (const r of CITY_ROADS) assert(['main', 'secondary', 'residential'].includes(r.kind));
  assert(CITY_ROADS.filter(r => r.kind === 'main').length >= 3);
  assert.equal(CITY_ROADS.filter(r => r.kind === 'residential').length, 1, 'one quiet residential lane');
});

test('every junction has a give-way line on its minor arm, and no signal clutter', () => {
  const at = new Set(STOP_ARMS.map(a => `${a.j.x},${a.j.y}`));
  for (const r of CITY_ROADS) for (const s of CITY_ROADS) if (r !== s && r.y1 === r.y2 && s.x1 === s.x2 && s.x1 >= r.x1 && s.x1 <= r.x2 && r.y1 >= s.y1 && r.y1 <= s.y2)
    assert(at.has(`${s.x1},${r.y1}`), `junction ${s.x1},${r.y1} has a stop line`);
  assert.equal(SIGNALS.length, 0, 'a cosy town gives way rather than queueing at lights');
  assert(STOP_ARMS.every(a => !a.signal));
});

test('street furniture stands on the pavement, never in the carriageway', () => {
  for (const [kind, x, y] of FURNITURE) for (const r of CITY_ROADS) assert(!inside(x, y, roadRect(r)), `${kind} at ${x},${y} is in the road`);
});

test('kerb parking lines the residential lane, clear of driveways and crossings', () => {
  const lane = CITY_ROADS.find(r => r.kind === 'residential'), box = roadRect(lane);
  for (const c of KERB_CARS) {
    const L = vehicleLength(c.kind);
    assert(c.x >= box.x && c.x + L <= box.x + box.w && c.y > box.y && c.y <= lane.y1, `${c.kind} parks in the north lane`);
    for (const lot of RESIDENTIAL_LOTS.filter(l => l.y < lane.y1 && l.kind !== 'bakery')) { const d = lot.x + lot.w - 14; assert(c.x + L <= d - 2 || c.x >= d + 12, `${c.kind} blocks a driveway at ${d}`); }
    for (const [x, y] of CROSSINGS) if (y === lane.y1) assert(c.x + L <= x - 8 || c.x >= x + 8, 'clear of the crossing');
  }
});
