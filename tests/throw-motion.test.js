import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import { throwMotion } from '../src/render/throw-motion.js';
import { frontFootOf, gripOf } from '../src/render/sprites.js';

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
  const crossover = (m) => !m.run && (m.frame === 4 || m.frame === 5);
  assert(sample('jav', 2, 'technique').some(crossover));
  assert(!sample('jav', 0, 'technique').some(crossover));
  // The best throwers blur through their turns.
  assert(throwMotion('discus', 3, 'technique', 0.5).ghost); assert(!throwMotion('discus', 2, 'technique', 0.5).ghost);
});

test('the hammer ball swings round and passes behind the thrower; fouls carry over the front', () => {
  const balls = sample('hammer', 2, 'technique', 200).map((m) => m.ball);
  assert(balls.every(Boolean)); assert(balls.some((b) => b.behind) && balls.some((b) => !b.behind));
  assert(throwMotion('shot', 1, 'follow', 1, { foul: true }).dx > throwMotion('shot', 1, 'follow', 1).dx);
});

test('legal javelin shoes stay behind the arc throughout the delivery and the result reaction', () => {
  for (let level = 0; level < 4; level++) {
    for (const phase of phases) for (const m of sample('jav', level, phase, 400)) {
      const toe = m.dx + 2 * frontFootOf({ pose: m.run ? 'carry' : 'throw', event: 'jav', frame: m.frame, flip: m.flip });
      assert(toe <= -2, `level ${level}/${phase}/${m.frame}: shoe crosses arc at ${toe}`);
      assert(Math.abs(m.dy - Math.round(-m.dx * 0.1)) <= 1, 'feet stay on the runway, with a small crossover bounce');
    }
    const end = throwMotion('jav', level, 'follow', 1);
    for (const pose of ['idle', 'cheer', 'sad']) for (const frame of [0, 1])
      assert(end.dx + 2 * frontFootOf({ pose, frame }) < 0, `${pose} reaction crosses the arc`);
    const foul = throwMotion('jav', level, 'follow', 1, { foul: true });
    assert(foul.dx + 2 * frontFootOf({ pose: 'throw', event: 'jav', frame: foul.frame }) > 0, 'a foul still visibly steps over');
    assert.equal(throwMotion('jav', level, 'release', 1).dx, throwMotion('jav', level, 'follow', 0).dx, 'no body jump on release');
  }
});

test('hammer and javelin follow through with an arm sweep and recovery instead of holding the release', () => {
  for (const ev of ['hammer', 'jav']) for (let level = 0; level < 4; level++) {
    const frames = sample(ev, level, 'follow').map(m => m.frame);
    assert(new Set(frames).size >= (ev === 'jav' || level >= 2 ? 3 : 2), `${ev}/${level} needs a moving follow-through`);
    assert(!frames.includes(2), 'release is not held during follow-through');
    const release = gripOf({ pose: 'throw', event: ev, frame: 2 });
    const recovery = gripOf({ pose: 'throw', event: ev, frame: frames.at(-1) });
    assert(recovery[1] - release[1] >= 8, 'throwing hand sweeps down after release');
    assert(release[1] >= -22 && release[1] <= -17, 'release stays beside the head without an elongated arm');
  }
});

test('skilled hammer follow-through preserves the turning footwork and releases the handle', () => {
  for (const level of [2, 3]) {
    const follow = sample('hammer', level, 'follow', 200);
    assert(follow.some(m => m.frame === 5 && m.flip), 'recovery turns away from the sector');
    assert(follow.some(m => m.frame === 6), 'recovery turns toward the camera');
    assert(follow.some(m => m.frame === 7), 'recovery turns away from the camera');
    assert(follow.every(m => m.released && !m.ball), 'empty hands throughout the recovery turn');
    assert.equal(follow.at(-1).frame, 3, 'plants and settles after the turn');
  }
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
