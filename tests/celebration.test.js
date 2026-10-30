import test from 'node:test';
import assert from 'node:assert/strict';
import { beatDuration, celebrates, CELEBRATION_MS, LANDING_HOLD_MS, RESULT_MS, HIGHLIGHT_MS, throwOffset, throwTiming } from '../src/render/meet-presentation.js';
import { throwingSector, GROUND_SLOPE, groundRise, SCENE_HEIGHT } from '../src/render/meet-geometry.js';

const throwBeat = (extra) => ({ type: 'throw', event: 'shot', side: 'home', mark: 10, attempt: 1, ...extra });

test('your big moments get time to celebrate; routine throws and rivals do not', () => {
  for (const extra of [{ newPb: true, previousPb: 9.5 }, { qualified: true, finalistLimit: 6 }, { madeStandard: true }, { worldRecord: true }, { tookLead: true }])
    assert(celebrates(throwBeat(extra)), JSON.stringify(extra));
  for (const extra of [{}, { newPb: true, previousPb: 0 }, { tookLead: true, attempt: 0 }, { side: 'away', newPb: true, previousPb: 9 }, { mark: null, foul: true, qualified: true }])
    assert(!celebrates(throwBeat(extra)), JSON.stringify(extra));
  const pb = throwBeat({ newPb: true, previousPb: 9.5 }), plain = throwBeat({});
  const after = (b) => beatDuration(b) - throwOffset(b) - throwTiming(b).landAt;
  assert.equal(after(plain), RESULT_MS);
  assert.equal(after(pb), HIGHLIGHT_MS + CELEBRATION_MS);
  assert(after(pb) - LANDING_HOLD_MS - CELEBRATION_MS >= 2500, 'the wide result shot still gets its time after the party');
});

test('the throwing direction runs level with the track, and the sector clears the benches', () => {
  assert.equal(GROUND_SLOPE, 0);
  assert(Object.is(groundRise(40), 0) && Object.is(groundRise(-40), 0), 'never -0');
  for (const event of ['shot', 'discus', 'hammer', 'jav']) {
    const sector = throwingSector(event, 640, 100);
    assert.equal(sector.centerY(sector.origin.x + 300), sector.origin.y);
    for (const [, y] of sector.arc(100)) assert(y > 123 && y < SCENE_HEIGHT - 60, `${event}: sector between the track and the benches`);
    assert(Math.abs((sector.upperY(500) - sector.origin.y) + (sector.lowerY(500) - sector.origin.y)) < 1e-9, 'symmetric about the centre line');
  }
});
