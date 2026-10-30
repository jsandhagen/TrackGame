import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { throwMotion, throwReleasePoint, recoveryStyle } from '../src/render/throw-motion.js';
import { throwTiming } from '../src/render/meet-presentation.js';
import { frontFootOf, feetOf, armJointsOf, gripOf, implementPointOf, THROW_FRAME_COUNTS } from '../src/render/sprites.js';

const phases = ['ready', 'technique', 'release', 'follow'];
const sample = (ev, level, phase, n = 40) => Array.from({ length: n + 1 }, (_, i) => throwMotion(ev, level, phase, i / n));
const spriteOptions = (event, m) => ({ pose: m.pose || (m.run ? 'carry' : 'throw'), event, frame: m.frame, flip: m.flip, blend: m.blend });
const carrying = m => [4, 5, 6, 7].includes(m.frame);
const worldFeet = (event, m) => feetOf(spriteOptions(event, m)).map(([x, y]) => [m.dx + 2 * (m.flip ? -3 - x : x), m.dy + 2 * y]);

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
  assert(sample('jav', 2, 'technique', 400).some(m => m.frame === 10 || m.frame === 11));
  assert(sample('jav', 0, 'technique').every(m => !carrying(m)), 'three-step form starts withdrawn instead of copying the full run-up');
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

test('both discus shoes stay planted throughout the full wind, including the changes of facing', () => {
 for (const level of [2, 3]) {
  const feet = m => worldFeet('discus', m).sort((a, b) => a[0] - b[0]);
  const initial = feet(throwMotion('discus', level, 'ready', 0));
  assert(initial[1][0] - initial[0][0] <= 4, 'rear-facing shoulder-width stance projects narrowly along the throwing direction');
  for (let i = 0; i <= 400; i++) {
   const m = throwMotion('discus', level, 'technique', i / 1000);
   const current = feet(m);
   current.forEach((point, k) => point.forEach((v, axis) => assert(Math.abs(v - initial[k][axis]) < 1e-8, `wind moves shoe ${k} at ${i / 1000}`)));
  }
 }
});

test('discus torso and pelvis turn counterclockwise without reversing during the throw', () => {
 for (const level of [1, 2, 3]) {
  const start = [0, 0.4, 0.42, 0.524][level];
  const motion = sample('discus', level, 'technique', 2000).filter((_, i) => i / 2000 >= start);
  for (let i = 1; i < motion.length; i++) {
   assert(motion[i].turn >= motion[i - 1].turn - 1e-10, 'chest heading does not reverse after the wind');
   assert(motion[i].hipTurn >= motion[i - 1].hipTurn - 1e-10, 'pelvis keeps turning in the same direction');
  }
  assert.equal(throwMotion('discus', level, 'technique', 1).turn, (level === 1 ? 2 : 4) * Math.PI);
 }
 // Viewed from the sector's side, the right shoulder crosses from the screen-left side
 // while facing the camera to screen-right while facing away. Both body and depth follow it.
 const front = throwMotion('discus', 2, 'technique', 0.64), back = throwMotion('discus', 2, 'technique', 0.79);
 const f = armJointsOf(spriteOptions('discus', front)), b = armJointsOf(spriteOptions('discus', back));
 assert(f[0][0][0] < f[1][0][0], 'right shoulder is on the left in the front-facing entry');
 assert(b[1][0][0] > b[0][0][0], 'right shoulder moves to the right in the away-facing catch');
});

test('javelin penultimate travels farther than the final block step in every form', () => {
 for (let level = 0; level < 4; level++) {
  const motion = sample('jav', level, 'technique', 4000);
  const first = frame => motion.findIndex(m => m.frame === frame);
  const push = first(12), catchAt = first(16), block = first(17), impulse = first(level === 3 ? 15 : 14);
  assert(push < impulse && impulse < catchAt && catchAt < block, 'left take-off, impulse, right catch, left block');
  const left = worldFeet('jav', motion[push])[0][0], right = worldFeet('jav', motion[catchAt])[1][0], front = worldFeet('jav', motion[block])[0][0];
  assert(right - left > front - right, 'penultimate is the longer stride');
  assert(catchAt - push > 1.5 * (block - catchAt), 'right catch is followed by a quick final left block');
  assert(motion[impulse].dy < Math.round(-motion[impulse].dx * 0.1), 'impulse has a low flight');
  assert(worldFeet('jav', motion[impulse]).every(([, y]) => y < motion[impulse].dy - 2), 'both shoes are clear during the impulse');
 }
});

test('discus accelerates into a short right-left delivery while retaining its centre support', () => {
 for (const level of [1, 2, 3]) {
  const meet = throwTiming({ event: 'discus', form: level }), ms = meet.releaseAt - meet.readyMs;
  const motion = sample('discus', level, 'technique', ms);
  const at = frame => motion.findIndex(m => m.frame === frame);
  assert(at(8) - at(7) < at(9) - at(8), 'a brief flight, then a longer pivot on the right foot');
  assert(at(9) - at(8) <= 300, 'right catch to left plant is still quick');
  assert(ms - at(9) < at(9) - at(8), 'delivery after the left plant is the quickest phase');
  for (const m of motion.filter(m => [8, 10, 9, 1, 11, 14].includes(m.frame)))
   assert(worldFeet('discus', m).some(([x]) => Math.abs(x) < 1e-8), 'the right foot retains its catch position while the other leg plants');
 }
});

test('discus and javelin interpolate their limbs and join phase boundaries without a hand jump', () => {
 for (const event of ['discus', 'jav']) for (let level = 0; level < 4; level++) {
  const hand = m => { const [x, y] = gripOf(spriteOptions(event, m)); return [m.dx + x * 2, m.dy + y * 2]; };
  const motion = sample(event, level, 'technique', 4000);
  assert(motion.some(m => m.blend && m.blend.t > 0.1 && m.blend.t < 0.9), 'in-between joints accompany body travel');
  for (let i = 1; i < motion.length; i++) {
   const a = hand(motion[i - 1]), b = hand(motion[i]);
   assert(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5, `${event}/${level}: hand snaps at ${i / 4000}`);
  }
  for (let i = 0; i < phases.length - 1; i++) {
   const a = hand(throwMotion(event, level, phases[i], 1)), b = hand(throwMotion(event, level, phases[i + 1], 0));
   assert(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-8, `${event}/${level}: hand jumps between ${phases[i]} and ${phases[i + 1]}`);
  }
 }
});

test('javelin three-step and full approaches have different starts, travel and footwork',()=>{
 const short=sample('jav',0,'technique',500),full=sample('jav',1,'technique',500);
 assert(short.every(m=>!carrying(m)),'short approach has three withdrawn steps, without an overhead carry run');
 assert(full.some(carrying),'full approach adds a cyclic overhead-carry run');
 const range=list=>Math.max(...list.map(m=>m.dx))-Math.min(...list.map(m=>m.dx));
 assert(range(full)>1.5*range(short),'full approach covers visibly more runway while both forms have room for a penultimate');
 assert(throwMotion('jav',0,'ready',0).dx-throwMotion('jav',1,'ready',0).dx>=30);
 for(const level of [1,2,3]) {
  const all=sample('jav',level,'technique',1000),steps=all.filter(m=>m.frame>=8&&m.frame<=16);
  assert(range(steps)>=24,'crossovers move down the runway instead of shuffling in place');
  const firstWithdrawal=all.findIndex(m=>m.frame===8);
  assert(all.slice(0,firstWithdrawal).every(m=>m.frame===0||carrying(m)));
  assert(all.slice(firstWithdrawal).every(m=>!carrying(m)),'the javelin stays drawn after withdrawal');
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
      const toe = m.dx + 2 * frontFootOf(spriteOptions('jav', m));
      assert(toe <= -2, `level ${level}/${phase}/${m.frame}: shoe crosses arc at ${toe}`);
      assert(Math.abs(m.dy - Math.round(-m.dx * 0.1)) <= 2, 'feet stay on the runway, with a low impulse');
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
    const m = throwMotion(ev, level, 'release', 0), [x, y] = implementPointOf(spriteOptions(ev, m));
    assert.deepEqual(throwReleasePoint(ev, level), [m.dx + x * 2, m.dy + y * 2]);
  }
});

test('every javelin form has a penultimate before the block and elbow-led delivery', () => {
  for (let level = 0; level < 4; level++) {
    const frames = sample('jav', level, 'technique', 1000).map(m => m.frame);
    assert(frames.indexOf(17) < frames.indexOf(18) && frames.indexOf(18) < frames.indexOf(19) && frames.indexOf(19) < frames.indexOf(20), 'block, free-arm closure, hip drive, then overarm delivery');
    assert(frames.indexOf(13) < frames.indexOf(16) && (frames.includes(14) || frames.includes(15)), 'left toe-off and an airborne penultimate precede the right catch');
    assert.equal(frames.includes(15), level === 3, 'the elite form extends the low impulse');
  }
});

test('javelin crossovers keep a long withdrawn throwing arm and alternate grounded contacts', () => {
  for (let level = 0; level < 4; level++) {
    const approach = sample('jav', level, 'technique', 1000).filter(m => m.frame >= 8 || m.frame === 1);
    for (const m of approach.filter(m => m.frame >= 9 && m.frame <= 18)) {
      const [shoulder, , hand] = armJointsOf({ pose: 'throw', event: 'jav', frame: m.frame })[1];
      assert(shoulder[0] - hand[0] >= 6 && hand[1] < shoulder[1], 'compact throwing arm stays withdrawn behind and above its shoulder through the block');
    }
    const contacts = approach.filter(m => [8, 9, 10, 11, 12, 13, 16].includes(m.frame));
    assert(contacts.some(m => feetOf({ pose: 'throw', event: 'jav', frame: m.frame })[0][1] === -1), 'left support');
    assert(contacts.some(m => feetOf({ pose: 'throw', event: 'jav', frame: m.frame })[1][1] === -1), 'right support');
    for (const m of contacts) assert(feetOf({ pose: 'throw', event: 'jav', frame: m.frame }).some(([, y]) => y === -1), 'passing steps stay low over a planted foot');
    const frames = approach.map(m => m.frame);
    assert(frames.indexOf(16) < frames.indexOf(17), 'right-foot contact precedes the left block');
    const finalSupport = approach.filter(m => [16, 17, 18].includes(m.frame));
    const rightFoot = finalSupport.map(m => worldFeet('jav', m)[1][0]);
    assert(Math.max(...rightFoot) - Math.min(...rightFoot) <= 1e-6, 'rear foot stays at its catch position while the pelvis advances and the left leg blocks');
  }
});

test('discus and javelin arms keep compact proportions through preparation, delivery and recovery', () => {
  const length = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const event of ['discus', 'jav']) for (let frame = 0; frame < THROW_FRAME_COUNTS[event]; frame++) {
    const o = { pose: 'throw', event, frame };
    for (const [shoulder, elbow, hand] of armJointsOf(o)) {
      assert(length(shoulder, elbow) <= 4.5 && length(elbow, hand) <= 4.5, `${event}/${frame}: compact upper arm and forearm`);
      // Only the javelin carry reaches up to the hairline, and only just past the usual reach.
      const reach = event === 'jav' && [0, 4, 5, 6, 7].includes(frame) && hand[1] < shoulder[1] - 6 ? 8.6 : 8;
      assert(length(shoulder, elbow) + length(elbow, hand) <= reach, `${event}/${frame}: no stretched reach`);
    }
    if (event === 'jav') {
      const hand = armJointsOf(o)[1][2];
      assert.deepEqual(gripOf(o), hand.map(v => v + 1), 'implement follows the hand when the shoulder rotates');
    }
  }
  const shoulderSpan = frame => {
    const arms = armJointsOf({ pose: 'throw', event: 'jav', frame });
    return arms[1][0][0] - arms[0][0][0];
  };
  assert(shoulderSpan(17) < 0 && shoulderSpan(2) > 0, 'throwing shoulder turns from behind the free shoulder to in front during delivery');
});

test('the discus sits below the overhand grip and its launch point mirrors with the sprite', () => {
  for (const frame of [1, 7, 8, 10, 11, 14, 20, 21, 2]) for (const flip of [false, true]) {
    const o = { pose: 'throw', event: 'discus', frame, flip };
    const hand = gripOf(o), disc = implementPointOf(o);
    assert.equal(disc[1] - hand[1], 3, 'palm is above the discus');
    assert.equal(disc[0] - hand[0], flip ? -1 : 1, 'centre offset follows the facing direction');
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
  assert(lean(17) < lean(10), 'block leans further back than the crossover');
  assert(sample('jav', 3, 'technique', 400).some(m => m.frame === 15), 'long elite impulse stride');
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
    assert(frames.indexOf(23) >= 0 && frames.indexOf(23) < frames.indexOf(24) && frames.indexOf(24) < frames.indexOf(18) && frames.indexOf(18) < frames.indexOf(6) && frames.indexOf(6) < frames.indexOf(19), 'planted forward swing, wound backswing, weight over, sweep, knee through');
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
      const end = list.at(-1);
      assert(Math.abs(end.dy - (ev === 'jav' ? Math.round(-end.dx * 0.1) : 0)) < 0.01, `${ev}/${level}/${style}: lands back on the ground`);
      if (ev === 'jav') for (const m of list) assert(m.dx + 2 * frontFootOf(spriteOptions(ev, m)) <= -2 + 1e-9, `jav/${level}/${style}: stays behind the arc`);
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
 const { throwLoop, throwLoopPhases, throwLoopMs } = await import('../src/render/throw-motion.js');
 for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) {
  const THROW_LOOP = throwLoopPhases(ev, level), total = throwLoopMs(ev, level), meet = throwTiming({ event: ev, form: level });
  assert.equal(THROW_LOOP.technique, meet.releaseAt - meet.readyMs, `${ev}: practice runs the technique at meet speed`);
  const at = (t) => throwLoop(ev, level, t, { style: 1 });
  assert.deepEqual(at(THROW_LOOP.ready + THROW_LOOP.technique / 2).frame, throwMotion(ev, level, 'technique', 0.5).frame, `${ev}/${level}: technique matches the meet`);
  assert(at(THROW_LOOP.ready + THROW_LOOP.technique + 1).released, 'released after the technique');
  assert(at(THROW_LOOP.ready + THROW_LOOP.technique - 1).sinceRelease < 0 && at(THROW_LOOP.ready + THROW_LOOP.technique + 10).sinceRelease > 0);
  assert.equal(at(total - 1).frame, throwMotion(ev, level, 'follow', 1, { style: 1 }).frame, 'rests in the finish');
  assert.equal(at(total + 5).frame, at(5).frame, 'loops');
  assert(!at(THROW_LOOP.ready + 400).ghost, 'no afterimages on the map');
 }
});

test('discus and javelin support feet never slide while they carry the body', () => {
 for (const ev of ['discus', 'jav']) for (let level = 0; level < 4; level++) {
  const ground = m => ev === 'jav' ? Math.round(-m.dx * 0.1) : 0;
  const planted = m => worldFeet(ev, m).map(([x, y]) => Math.abs(y - (ground(m) - 2)) < 1e-6 ? x : null);
  let before = planted(throwMotion(ev, level, 'technique', 0));
  for (let i = 1; i <= 2000; i++) {
   const now = planted(throwMotion(ev, level, 'technique', i / 2000));
   now.forEach((x, k) => assert(x === null || before[k] === null || Math.abs(x - before[k]) < 0.05, `${ev}/${level}: ${'LR'[k]} shoe slides at ${i / 2000}`));
   before = now;
  }
 }
});

test('javelin rhythm: even strides, the longest penultimate, a quick block step and a fast delivery', () => {
 for (let level = 0; level < 4; level++) {
  const meet = throwTiming({ event: 'jav', form: level }), ms = meet.releaseAt - meet.readyMs, landings = [];
  let before = null;
  for (let t = 0; t <= ms; t++) {
   const m = throwMotion('jav', level, 'technique', t / ms);
   const down = worldFeet('jav', m).map(([, y]) => Math.abs(y - (Math.round(-m.dx * 0.1) - 2)) < 1e-6);
   if (before) down.forEach((d, k) => d && !before[k] && landings.push([t, k]));
   before = down;
  }
  assert(landings.every(([, k], i) => !i || k !== landings[i - 1][1]), `${level}: feet alternate`);
  const [block, catchAt, last] = landings.slice(-3).reverse();
  assert.equal(block[1], 0); assert.equal(catchAt[1], 1);
  const steps = landings.slice(1).map(([t], i) => t - landings[i][0]), [penultimate, final] = steps.slice(-2);
  for (const step of steps.slice(0, -2)) assert(step >= 200 && step <= 300, `${level}: approach stride of ${step} ms`);
  assert(steps.slice(0, -1).every(step => step <= penultimate), `${level}: the penultimate is the longest stride`);
  assert(final < 0.6 * penultimate, `${level}: the block step is quick`);
  assert(ms - block[0] <= 155, `${level}: block to release in ${ms - block[0]} ms`);
  assert(last[1] === 0, 'the penultimate leaves from the left foot');
  if (level) assert(landings.length >= 8, `${level}: carry run, withdrawal and crossovers`);
 }
});

const DISCUS_AT = (level, frame) => {
 for (let i = 0; i <= 1000; i++) if (throwMotion('discus', level, 'technique', i / 1000).frame === frame) return i / 1000;
 return 1;
};
test('the discus orbits with the chest: trailing on the sector side, swung behind, then slung through', () => {
 for (const level of [1, 2, 3]) {
  const disc = (phase, p) => {
   const m = throwMotion('discus', level, phase, p);
   return implementPointOf(spriteOptions('discus', m))[0];
  };
  const pivot = DISCUS_AT(level, 10), hips = DISCUS_AT(level, 11);
  assert(disc('technique', pivot) > 3, 'trails toward the sector while the right foot pivots');
  assert(disc('technique', hips) < -3, 'swings round behind as the chest comes to face us');
  assert(disc('release', 0) > 5, 'slung through toward the sector at release');
 }
});

test('javelin crossovers run tall; the lean back is saved for the penultimate', () => {
 const shoulder = frame => armJointsOf({ pose: 'throw', event: 'jav', frame })[1][0][0];
 for (const crossover of [9, 10, 11]) assert(shoulder(crossover) - shoulder(14) >= 3, `frame ${crossover} leans back like the impulse`);
 assert(shoulder(12) > shoulder(13) && shoulder(13) > shoulder(14), 'the lean builds from the last left contact into the impulse');
 assert(shoulder(16) <= shoulder(14) && shoulder(17) <= shoulder(14), 'and holds through the catch and block');
});

test('elite Natural Athletes flop forward after a big javelin throw, staying behind the arc', async () => {
 const { flopsForward } = await import('../src/render/throw-motion.js');
 const natural = { type: 'natural' }, big = { mark: 80, newPb: true, ownBest: 80 };
 assert(flopsForward(natural, 'jav', 3, big));
 assert(flopsForward(natural, 'jav', 3, { mark: 80, leading: true, ownBest: 80 }), 'a lead-holding best throw');
 assert(!flopsForward(natural, 'jav', 3, { mark: 70, leading: true, ownBest: 80 }), 'not a weaker throw that only keeps an earlier lead');
 assert(!flopsForward(natural, 'jav', 3, { mark: null, foul: true }), 'not after a foul');
 assert(!flopsForward(natural, 'jav', 2, big), 'only with the elite approach');
 assert(!flopsForward({ type: 'technician' }, 'jav', 3, big), 'only the Natural Athlete type');
 assert(!flopsForward(natural, 'discus', 3, big), 'only in the javelin');
 const flop = sample('jav', 3, 'follow', 200).map((_, i) => throwMotion('jav', 3, 'follow', i / 200, { flop: true }));
 assert(flop.some(m => m.frame === 25), 'flat out on the runway');
 assert.equal(flop[0].dx, throwMotion('jav', 3, 'release', 1).dx, 'no jump on release');
 for (const m of flop) {
  const o = spriteOptions('jav', m), ground = Math.round(-m.dx * 0.1);
  assert(m.dx + 2 * frontFootOf(o) <= -2, 'shoes stay behind the arc');
  for (const [, , [x, y]] of armJointsOf(o)) if (y >= -1) assert(m.dx + 2 * (x + 2) <= -2, 'hands land behind the arc');
  assert.equal(m.dy, ground, 'on the runway');
 }
 assert.equal(flop.at(-1).frame, 3, 'back on their feet for the reaction');
 assert.deepEqual(throwMotion('jav', 3, 'follow', 0.5, { flop: true, foul: true }).frame, throwMotion('jav', 3, 'follow', 0.5, { foul: true }).frame, 'a foul never flops');
});

test('every thrower starts moving within about a second of stepping up', async () => {
 const { SETUP_MS } = await import('../src/render/meet-presentation.js');
 const signature = (ev, m) => JSON.stringify([m.dx, m.dy, feetOf(spriteOptions(ev, m)), gripOf(spriteOptions(ev, m)), m.turn ?? 0, m.ball]);
 for (const ev of ['shot', 'discus', 'hammer', 'jav']) for (let level = 0; level < 4; level++) {
  const timing = throwTiming({ event: ev, form: level }), ms = timing.releaseAt - timing.readyMs;
  const ready = signature(ev, throwMotion(ev, level, 'ready', 0));
  assert.equal(signature(ev, throwMotion(ev, level, 'technique', 0)), ready, `${ev}/${level}: the technique starts from the ready stance`);
  let still = ms;
  for (let t = 0; t <= ms; t += 5) if (signature(ev, throwMotion(ev, level, 'technique', t / ms)) !== ready) { still = t; break; }
  assert(SETUP_MS + timing.readyMs + still <= 1250, `${ev}/${level}: stands still for ${SETUP_MS + timing.readyMs + still} ms`);
 }
});
