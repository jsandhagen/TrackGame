import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import { throwMotion } from '../src/render/throw-motion.js';

const phases = ['ready', 'technique', 'release', 'follow'];
const sample = (ev, level, phase, n = 40) => Array.from({ length: n + 1 }, (_, i) => throwMotion(ev, level, phase, i / n));

test('every event and form level produces valid frames and stays near the circle or on the runway', () => {
  for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) for (const phase of phases)
    for (const m of sample(ev, level, phase)) {
      assert(Number.isInteger(m.frame) && m.frame >= 0 && m.frame < 10, `${ev}/${level}/${phase} frame ${m.frame}`);
      assert(Number.isFinite(m.dx) && Number.isFinite(m.dy));
      if (ev === 'jav') assert(m.dx >= -96 && m.dx <= 12); else assert(Math.abs(m.dx) <= 30, `${ev} leaves the circle: ${m.dx}`);
    }
});

test('better form means a more complete technique', () => {
  const flips = (ev, level) => sample(ev, level, 'technique', 200).reduce((n, m, i, a) => n + (i && m.flip !== a[i - 1].flip ? 1 : 0), 0);
  // Shot: a novice puts from a standing start; a glider starts at the back of the circle facing away.
  assert(sample('shot', 0, 'technique').every((m) => !m.flip && m.dx > -5));
  assert(throwMotion('shot', 1, 'technique', 0.1).flip && throwMotion('shot', 1, 'technique', 0.1).dx < -10);
  // Discus and hammer: more turns as form improves.
  assert(flips('discus', 0) === 0); assert(flips('discus', 2) > flips('discus', 1));
  assert(flips('hammer', 3) > flips('hammer', 0));
  // Javelin: a longer run-up and crossover steps.
  assert(throwMotion('jav', 2, 'ready', 0).dx < throwMotion('jav', 0, 'ready', 0).dx);
  assert(sample('jav', 2, 'technique').some((m) => m.frame === 4 || m.frame === 5));
  assert(!sample('jav', 0, 'technique').some((m) => m.frame === 4 || m.frame === 5));
  // The best throwers blur through their turns.
  assert(throwMotion('discus', 3, 'technique', 0.5).ghost); assert(!throwMotion('discus', 2, 'technique', 0.5).ghost);
});

test('the hammer ball swings round and passes behind the thrower; fouls carry over the front', () => {
  const balls = sample('hammer', 2, 'technique', 200).map((m) => m.ball);
  assert(balls.every(Boolean)); assert(balls.some((b) => b.behind) && balls.some((b) => !b.behind));
  assert(throwMotion('shot', 1, 'follow', 1, { foul: true }).dx > throwMotion('shot', 1, 'follow', 1).dx);
});

test('form grows from standing throws to full technique with technique and mastery', () => {
  const s = G.newGame(50), a = s.roster[0];
  assert.equal(G.formOf(a, 'shot'), 0);
  a.stats[1] = 60; a.mastery.shot = 60; assert.equal(G.formOf(a, 'shot'), 2);
  a.stats[1] = 90; a.mastery.shot = 90; assert.equal(G.formOf(a, 'shot'), 3);
  assert.equal(G.FORMS.shot[3], 'Rotational');
});

test('a session that lifts an athlete into a better form announces the new technique', () => {
  const s = G.newGame(51), a = s.roster[0];
  s.coaching.insights = 100; a.stats[1] = 40; a.mastery.shot = 27.9;
  const before = G.formOf(a, 'shot');
  const out = G.coachGroup(s, [a.id], 'shadow');
  assert(out);
  assert.equal(before, 0); assert.equal(G.formOf(a, 'shot'), 1);
  assert.equal(out.results[0].form.name, 'Glide');
  assert.match(s.log[0].text + s.log[1].text, /glide/);
});
