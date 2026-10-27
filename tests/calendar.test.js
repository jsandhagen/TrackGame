import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';

test('the calendar starts on Monday 1 March and paydays fall on Sundays', () => {
  assert.equal(G.shortDate(1), 'Mon 1 Mar');
  assert.equal(G.longDate(15), 'Mon 1 April, Year 1');
  assert.equal(G.dateOf(7).weekday, 6);
  assert(G.isPayday(7) && !G.isPayday(8));
  assert.equal(G.dateOf(G.YEAR_DAYS + 1).year, 2);
  assert.deepEqual([1, 43, 85, 127].map(G.seasonOfDay), [0, 1, 2, 3]);
});

test('the clock runs from dawn to night across a training day', () => {
  assert.equal(G.clockLabel(0), '06:00');
  assert.equal(G.clockLabel(0.5), '14:00');
  assert.equal(G.clockLabel(1), '22:00');
  assert.equal(G.clockLabel(-1), '06:00');
  assert(G.nightness(0) > 0.5);
  assert.equal(G.nightness(0.5), 0);
  assert.equal(G.nightness(1), 1);
  assert(G.nightness(0.85) > 0 && G.nightness(0.85) < 1);
});
