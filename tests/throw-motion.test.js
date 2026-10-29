import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { throwMotion, throwReleasePoint, recoveryStyle } from '../src/render/throw-motion.js';
import { frontFootOf, gripOf, THROW_FRAME_COUNTS } from '../src/render/sprites.js';

const phases = ['ready', 'technique', 'release', 'follow'];
const sample = (ev, level, phase, n = 40) => Array.from({ length: n + 1 }, (_, i) => throwMotion(ev, level, phase, i / n));

test('every event and form level produces valid frames and stays near the circle or on the runway', () => {
  for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) for (const phase of phases)
    for (const m of sample(ev, level, phase)) {
      assert(Number.isInteger(m.frame) && m.frame >= 0 && m.frame < THROW_FRAME_COUNTS[ev], `${ev}/${level}/${phase} frame ${m.frame}`);
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
  assert(sample('jav', 0, 'technique').every(m=>!m.run), 'three-step form starts withdrawn instead of copying the full run-up');
  // The best throwers blur through their turns.
  assert(throwMotion('discus', 3, 'technique', 0.5).ghost); assert(!throwMotion('discus', 2, 'technique', 0.5).ghost);
});

test('discus South African starts facing the sector and the full throw adds the rear-facing entry',()=>{
 const half=sample('discus',1,'technique',500),full=sample('discus',2,'technique',500);
 const range=list=>Math.max(...list.map(m=>m.dx))-Math.min(...list.map(m=>m.dx));
 assert(!throwMotion('discus',1,'ready',0).flip,'South African starts facing the sector');
 assert(throwMotion('discus',2,'ready',0).flip,'full turn starts facing the rear');
 assert(range(half)>=20 && range(full)>=24,'both techniques drive from the rear into the middle');
 assert(!half.some(m=>[6,17,18,19].includes(m.frame)),'the rear wind and wide left-foot entry belong to the full throw');
 assert(half.some(m=>m.frame===21)&&half.some(m=>m.frame===7&&m.dy<0),'South African steps through and drives low onto the right foot');
 assert(half.findIndex(m=>m.frame===7)<full.findIndex(m=>m.frame===7),'the facing-sector drill omits the extra entry turn');
 assert(full.some(m=>m.frame===7&&m.dy<0),'full throw drives low across the circle');
 for(const list of [half,full]) {
  const frames=list.map(m=>m.frame);
  assert(frames.indexOf(10)<frames.indexOf(9),'right-foot pivot precedes the left-foot plant');
  assert(frames.indexOf(9)<frames.indexOf(11)&&frames.indexOf(11)<frames.indexOf(14),'plant, hips, then the long-arm strike');
 }
});

test('javelin three-step and full approaches have different starts, travel and footwork',()=>{
 const short=sample('jav',0,'technique',500),full=sample('jav',1,'technique',500);
 assert(short.every(m=>!m.run),'short approach has three withdrawn steps, without an overhead carry run');
 assert(full.some(m=>m.run),'full approach adds a cyclic overhead-carry run');
 const range=list=>Math.max(...list.map(m=>m.dx))-Math.min(...list.map(m=>m.dx));
 assert(range(full)>2*range(short),'full approach covers visibly more runway');
 assert(throwMotion('jav',0,'ready',0).dx-throwMotion('jav',1,'ready',0).dx>=30);
 for(const level of [1,2,3]) {
  const all=sample('jav',level,'technique',1000),steps=all.filter(m=>!m.run&&[12,4,5,13,10,14].includes(m.frame));
  assert(range(steps)>=24,'crossovers move down the runway instead of shuffling in place');
  const firstWithdrawal=all.findIndex(m=>!m.run);
  assert(all.slice(0,firstWithdrawal).every(m=>m.run));
  assert(all.slice(firstWithdrawal).every(m=>!m.run),'the javelin stays drawn after withdrawal');
  assert(all.every(m=>!m.flip&&!m.released),'approach stays aimed at the sector and retains the javelin');
 }
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

test('contact timing joins preparation, delivery and recovery without body jumps', () => {
  for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) {
    for (let i = 0; i < phases.length - 1; i++) {
      const a = throwMotion(ev, level, phases[i], 1), b = throwMotion(ev, level, phases[i + 1], 0);
      assert(Math.abs(a.dx - b.dx) < 0.01 && Math.abs(a.dy - b.dy) < 0.01, `${ev}/${level}: ${phases[i]} jumps to ${phases[i + 1]}`);
    }
    const technique = sample(ev, level, 'technique', 1000);
    for (let i = 1; i < technique.length; i++)
      assert(Math.abs(technique[i].dx - technique[i - 1].dx) < 1, `${ev}/${level}: body teleports during approach`);
  }
});

test('the shot and discus drive through planted positions before release, then sweep and settle', () => {
  for (const ev of ['shot', 'discus']) for (let level = 0; level < 4; level++) {
    const technique = sample(ev, level, 'technique', 200), follow = sample(ev, level, 'follow');
    assert(technique.some(m => m.frame === (ev === 'shot' ? 10 : 11)), 'leg drive precedes the strike');
    assert(technique.every(m => !m.released), 'the implement stays held until release');
    assert(follow.every(m => m.released && m.frame !== 2), 'empty arm continues moving after release');
    assert(new Set(follow.map(m => m.frame)).size >= 2, 'sweep and balanced recovery are distinct');
  }
  for (const level of [1, 2, 3]) {
    const frames = sample('shot', level, 'technique', 200).map(m => m.frame);
    assert(frames.indexOf(9) < frames.indexOf(10), 'closed centre catch precedes leg extension');
  }
});

test('hammer turns alternate foot contacts and launch from the hammer head', () => {
  for (let level = 0; level < 4; level++) {
    const turns = sample('hammer', level, 'technique', 400).slice(160);
    assert(turns.some(m => m.frame === 12), 'double support against the pull');
    assert(turns.some(m => m.frame === 10 || m.frame === 11), 'single support while the right foot travels');
    assert(turns.every(m => m.dy === 0), 'the planted foot stays on the circle');
    const last = throwMotion('hammer', level, 'technique', 1);
    assert.deepEqual(throwReleasePoint('hammer', level), [last.dx + last.ball.dx, last.dy + last.ball.dy]);
    const release = throwMotion('hammer', level, 'release', 0);
    assert(release.released && !release.ball, 'only the flight draws the released hammer');
  }
  for (const ev of ['shot', 'discus', 'jav']) for (let level = 0; level < 4; level++) {
    const m = throwMotion(ev, level, 'release', 0), [x, y] = gripOf({ pose: 'throw', event: ev, frame: m.frame });
    assert.deepEqual(throwReleasePoint(ev, level), [m.dx + x * 2, m.dy + y * 2]);
  }
});

test('javelin blocks before the elbow-led delivery and advanced approaches add an impulse stride', () => {
  for (let level = 0; level < 4; level++) {
    const frames = sample('jav', level, 'technique', 400).filter(m => !m.run).map(m => m.frame);
    assert(frames.indexOf(6) < frames.indexOf(11) && frames.indexOf(11) < frames.indexOf(7), 'block, hip drive, then overarm delivery');
    assert.equal(frames.includes(10)||frames.includes(14), level >= 2, 'the long impulse is reserved for developed approaches');
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

test('elite shot technique: the glide starts tall and folds, the rotation winds up first and leaves the ground', () => {
  for (const level of [1, 2]) {
    const frames = sample('shot', level, 'technique', 200).map(m => m.frame);
    assert(frames[0] === 13 && frames.indexOf(13) < frames.indexOf(4) && frames.indexOf(4) < frames.indexOf(5), 'tall start, fold, then drive');
  }
  const spin = sample('shot', 3, 'technique', 400), frames = spin.map(m => m.frame);
  assert(frames.indexOf(15) >= 0 && frames.indexOf(15) < frames.indexOf(6), 'the wind comes before the entry');
  assert(spin.some(m => m.frame === 8 && m.dy < -1), 'a short flight across the circle');
  assert(spin.filter(m => m.frame === 15 || m.frame === 14).length > spin.filter(m => m.frame === 9 || m.frame === 1).length, 'slow preparation, quick finish');
});

test('elite discus drives low with a brief flight after a slower entry', () => {
  for (const level of [2, 3]) {
    const turn = sample('discus', level, 'technique', 400);
    assert(turn.some(m => m.frame === 7 && m.dy < -1), 'off the ground in the drive');
    assert(turn.filter(m => [18, 6, 19].includes(m.frame)).length > 2 * turn.filter(m => m.frame === 7).length, 'entry is slower than the drive');
  }
});

test('hammer turns split between double and single support, starting from the ground', () => {
  assert(throwMotion('hammer', 2, 'ready', 0).ball.dy >= -2, 'the head rests on the ground before the winds');
  for (let level = 0; level < 4; level++) {
    const turns = sample('hammer', level, 'technique', 2000).filter(m => [10, 12, 16, 17].includes(m.frame));
    const double = turns.filter(m => m.frame === 12 || m.frame === 17).length / turns.length;
    assert(double > 0.35 && double < 0.65, `${level}: double support share ${double.toFixed(2)}`);
  }
});

test('javelin leans further back into the block after an impulse stride', () => {
  const lean = (frame) => gripOf({ pose: 'throw', event: 'jav', frame })[0];
  assert(lean(6) < lean(5), 'block leans further back than the crossover');
  assert(sample('jav', 3, 'technique', 400).some(m => m.frame === 14), 'long elite impulse stride');
});

test('hammer stays inside the cage, steepens through the turns and lets go on the rise', () => {
  for (let level = 0; level < 4; level++) {
    for (const m of sample('hammer', level, 'technique', 400)) if (m.ball) assert(m.dx + m.ball.dx >= -39, 'the head stays inside the back of the cage');
    const turns = sample('hammer', level, 'technique', 400).filter(m => m.frame !== 13 && [10, 12, 16, 17].includes(m.frame)),
      low = (list) => Math.max(...list.map(m => m.ball.dy));
    assert(low(turns.slice(-40)) > low(turns.slice(0, 40)), 'the low point drops toward the ground in the later turns');
    const [, y] = throwReleasePoint('hammer', level), top = throwMotion('hammer', level, 'technique', 1);
    assert(y > -40 && top.ball.dy > -40, 'released about head height, before the top of the orbit');
  }
});

test('discus swings back before the entry and keeps turning after the reverse', () => {
  for (const level of [2, 3]) {
    const frames = sample('discus', level, 'technique', 400).map(m => m.frame);
    assert(frames.indexOf(17) < frames.indexOf(18) && frames.indexOf(18) < frames.indexOf(6) && frames.indexOf(6) < frames.indexOf(19), 'wound backswing, weight over, sweep, knee through');
    assert(frames.indexOf(11) < frames.indexOf(14), 'the hips open before the arm strikes');
    const follow = sample('discus', level, 'follow').map(m => m.frame);
    assert(follow.indexOf(3) < follow.indexOf(15) && follow.indexOf(15) < follow.indexOf(16), 'reverse, keep turning, then stop');
  }
});

test('recovery styles give athletes different finishes without breaking the throw', () => {
  for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) {
    const finishes = [0, 1, 2].map(style => sample(ev, level, 'follow', 80).map((_, i) => throwMotion(ev, level, 'follow', i / 80, { style })));
    const key = (list) => list.map(m => `${m.frame}${m.flip ? 'F' : ''}:${Math.round(m.dy)}`).join(',');
    assert.equal(new Set(finishes.map(key)).size, 3, `${ev}/${level}: three distinct recoveries`);
    for (const [style, list] of finishes.entries()) {
      assert(list.every(m => m.released && m.frame !== 2 && Number.isInteger(m.frame) && m.frame < THROW_FRAME_COUNTS[ev]), `${ev}/${level}/${style}: valid empty-handed frames`);
      assert(Math.abs(list[0].dx - throwMotion(ev, level, 'release', 1, { style }).dx) < 0.01, `${ev}/${level}/${style}: no jump on release`);
      assert(Math.abs(list.at(-1).dy - throwMotion(ev, level, 'follow', 1).dy) < 0.01, `${ev}/${level}/${style}: lands back on the ground`);
      if (ev === 'jav') for (const m of list) assert(m.dx + 2 * frontFootOf({ pose: 'throw', event: ev, frame: m.frame }) <= -2, `jav/${level}/${style}: stays behind the arc`);
    }
    const fouls = [0, 1, 2].map(style => key(sample(ev, level, 'follow', 40).map((_, i) => throwMotion(ev, level, 'follow', i / 40, { style, foul: true }))));
    assert.equal(new Set(fouls).size, 1, 'a foul looks the same whoever throws');
  }
});

test('an athlete keeps one recovery style, led by their background', () => {
  assert.equal(recoveryStyle({ id: 4, background: 'dancer' }), 0);
  assert.equal(recoveryStyle({ id: 4, background: 'clown' }), 1);
  assert.equal(recoveryStyle({ id: 4, background: 'chess' }), 2);
  assert.deepEqual([3, 4, 5].map(id => recoveryStyle({ id, background: 'farm' })), [0, 1, 2]);
  assert.equal(recoveryStyle(undefined), 0);
});

test('the club map loops the meet throw: same frames, a release, then a rest before the next', async () => {
 const { throwLoop, THROW_LOOP } = await import('../src/render/throw-motion.js');
 const total = Object.values(THROW_LOOP).reduce((a, b) => a + b, 0);
 for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) {
  const at = (t) => throwLoop(ev, level, t, { style: 1 });
  assert.deepEqual(at(THROW_LOOP.ready + THROW_LOOP.technique / 2).frame, throwMotion(ev, level, 'technique', 0.5).frame, `${ev}/${level}: technique matches the meet`);
  assert(at(THROW_LOOP.ready + THROW_LOOP.technique + 1).released, 'released after the technique');
  assert(at(THROW_LOOP.ready + THROW_LOOP.technique - 1).sinceRelease < 0 && at(THROW_LOOP.ready + THROW_LOOP.technique + 10).sinceRelease > 0);
  assert.equal(at(total - 1).frame, throwMotion(ev, level, 'follow', 1, { style: 1 }).frame, 'rests in the finish');
  assert.equal(at(total + 5).frame, at(5).frame, 'loops');
  assert(!at(THROW_LOOP.ready + 400).ghost, 'no afterimages on the map');
 }
});
