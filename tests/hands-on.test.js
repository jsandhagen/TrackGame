import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';
import {throwResult} from '../src/render/meet-presentation.js';
import {EVENT_IDS, SKILLS} from '../src/game-content.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// A player who taps the lit pad every `gap` ms; `wrong` taps the other pad on those taps instead.
function play(pattern, gap, { wrong = () => false, rand = Math.random } = {}) {
  let now = 0, next = gap, n = 0;
  const st = G.startAttempt(pattern, now);
  while (st.phase === 'runup' && now < 30000) {
    now += 16; G.advanceAttempt(pattern, st, now);
    if (st.phase === 'runup' && now >= next) {
      const side = wrong(n++) ? (st.lit === 'L' ? 'R' : 'L') : st.lit;
      G.tapPad(pattern, st, side, now, rand); next = now + gap;
    }
  }
  return { st, now };
}
// Hold from `at` until the needle reaches `needle`.
function throwAt(pattern, st, at, needle) {
  assert(G.pressThrow(pattern, st, at));
  return G.releaseThrow(pattern, st, at + needle * pattern.release.charge);
}

test('the tactic sets the run-up: none for Bank it, longer and harder for All out', () => {
  for (const event of EVENT_IDS) {
    const safe = G.buildPattern(event, 'safe'), ctl = G.buildPattern(event, 'balanced'), all = G.buildPattern(event, 'attack');
    assert.equal(safe.runup, null);
    assert(safe.release.bounce && safe.release.line === Infinity, 'Bank it has no foul line and no clock');
    assert(!ctl.release.bounce && !all.release.bounce);
    assert(all.runup.ms > ctl.runup.ms && all.runup.decay > ctl.runup.decay && all.runup.reach < ctl.runup.reach);
    assert(all.release.charge < ctl.release.charge && all.release.line < ctl.release.line);
    assert.equal(ctl.runup.shuffle, 0, 'Controlled alternates');
    assert(all.runup.shuffle > 0);
  }
  assert.equal(G.startAttempt(G.buildPattern('jav', 'safe'), 0).phase, 'line', 'Bank it starts at the line');
});

test('quick taps build speed, speed drains, and the run-up reaches the line', () => {
  const p = G.buildPattern('jav', 'balanced', {}, () => 0.9);
  const fast = play(p, 140), slow = play(p, 400), stalled = play(p, 5000);
  for (const r of [fast, slow, stalled]) assert.equal(r.st.phase, 'line');
  assert(G.runupScore(p, fast.st) > p.runup.perfectAt, 'about 7 taps a second is fast enough for a perfect');
  assert(G.runupScore(p, slow.st) < p.runup.perfectAt && G.runupScore(p, slow.st) > 0.2);
  assert(G.runupScore(p, stalled.st) < 0.05);
  assert(fast.now < slow.now && slow.now < stalled.now, 'faster runners reach the line sooner');
  assert(stalled.now < p.runup.ms * 4, 'even a stalled run-up ends');
  // Controlled lights alternate pads.
  const st = G.startAttempt(p, 0), seen = [st.lit];
  for (let t = 100; t < 600; t += 100) { G.tapPad(p, st, st.lit, t); seen.push(st.lit); }
  assert(seen.every((side, i) => !i || side !== seen[i - 1]));
});

test('a wrong pad stumbles and keeps the same pad lit', () => {
  const p = G.buildPattern('jav', 'balanced');
  const st = G.startAttempt(p, 0);
  G.tapPad(p, st, st.lit, 100); G.tapPad(p, st, st.lit, 200);
  const before = st.v, lit = st.lit;
  assert.equal(G.tapPad(p, st, lit === 'L' ? 'R' : 'L', 210), 'stumble');
  assert(st.v < before); assert.equal(st.lit, lit); assert.equal(st.stumbles, 1);
  const careless = play(p, 140, { wrong: (n) => n % 3 === 2 });
  assert(G.runupScore(p, careless.st) < G.runupScore(p, play(p, 140).st));
});

test('All out shuffles less with Focus and more in a clutch moment', () => {
  const low = G.buildPattern('jav', 'attack', { stats: [50, 50, 50, 10] }), high = G.buildPattern('jav', 'attack', { stats: [50, 50, 50, 90] });
  assert(high.runup.shuffle < low.runup.shuffle);
  assert(G.buildPattern('jav', 'attack', { clutch: true }).runup.shuffle > G.buildPattern('jav', 'attack').runup.shuffle);
  const p = G.buildPattern('jav', 'attack', {}, () => 0.9), st = G.startAttempt(p, 0);
  G.tapPad(p, st, st.lit, 100, () => 0.01);
  const lit = st.lit;
  G.tapPad(p, st, lit, 200, () => 0.01);
  assert.equal(st.lit, lit, 'a shuffled pad can light on the same side again');
});

test('stats shape the pattern and low stamina tightens it', () => {
  const low = G.buildPattern('jav', 'balanced', { stats: [50, 10, 10, 50] }),
    high = G.buildPattern('jav', 'balanced', { stats: [50, 90, 90, 50] }),
    tired = G.buildPattern('jav', 'balanced', { stats: [50, 90, 90, 50], stamina: 20 });
  assert(high.release.perfect > low.release.perfect && high.release.good > low.release.good, 'Technique widens the gold');
  assert(high.runup.gain > low.runup.gain, 'Speed makes each tap count for more');
  assert(tired.runup.decay > high.runup.decay && tired.release.perfect < high.release.perfect);
  assert(G.buildPattern('jav', 'balanced', { stats: [50, 10, 10, 50], perfectSkill: true }).release.perfect > low.release.perfect);
});

test('press and hold, then let go: the gold is perfect, past the red line is a scratch', () => {
  const p = G.buildPattern('jav', 'attack', {}, () => 0.9), r = p.release;
  const run = () => play(p, 110, { rand: () => 0.9 }).st;
  let st = run();
  assert(G.runupScore(p, st) >= p.runup.perfectAt, 'a fast, clean run-up');
  assert.equal(throwAt(p, st, st.lineAt + 200, r.center).quality, 'perfect');
  st = run(); assert.equal(throwAt(p, st, st.lineAt + 200, r.center + r.good * 0.9).quality, 'good');
  st = run(); assert.equal(throwAt(p, st, st.lineAt + 200, 0.1).quality, 'poor');
  // Holding on: the needle crosses the line and the throw fouls by itself.
  st = run(); G.pressThrow(p, st, st.lineAt + 200);
  G.advanceAttempt(p, st, st.lineAt + 200 + r.charge * 1.01);
  assert.equal(st.phase, 'done'); assert.equal(st.result.quality, 'scratch');
  // Not throwing at all: the thrower runs through the line.
  st = run(); G.advanceAttempt(p, st, st.lineAt + r.line + 1);
  assert.equal(st.result.quality, 'scratch'); assert(st.result.late);
  // A slow run-up spoils even a gold release.
  st = play(p, 600).st; assert.equal(throwAt(p, st, st.lineAt + 200, r.center).quality, 'poor');
});

test('Bank it: no run-up, no clock, and its needle swings back instead of fouling', () => {
  const bank = G.buildPattern('shot', 'safe'), r = bank.release;
  let st = G.startAttempt(bank, 0);
  G.advanceAttempt(bank, st, 60000);
  assert.equal(st.phase, 'line', 'it waits for the player');
  assert.equal(throwAt(bank, st, 60000, r.center).quality, 'perfect');
  st = G.startAttempt(bank, 0); G.pressThrow(bank, st, 0);
  G.advanceAttempt(bank, st, r.charge * 1.5);
  assert.equal(st.phase, 'charge', 'holding on never fouls');
  assert(G.needleOf(bank, st, r.charge * 1.5) < 1);
  assert.notEqual(G.releaseThrow(bank, st, r.charge * 1.5).quality, 'scratch');
});

test('the thrower on the field follows the run-up and the charge', () => {
  const p = G.buildPattern('jav', 'balanced'), st = G.startAttempt(p, 0);
  const at = [G.windupOf(p, st, 0)];
  for (let t = 100; st.phase === 'runup'; t += 100) { G.tapPad(p, st, st.lit, t); G.advanceAttempt(p, st, t + 50); at.push(G.windupOf(p, st, t + 50)); }
  G.pressThrow(p, st, st.lineAt + 300); at.push(G.windupOf(p, st, st.lineAt + 300 + p.release.charge * 0.5));
  assert(at.every((w, i) => !i || w >= at[i - 1]), 'never moves backwards');
  assert(at[0] === 0 && at.at(-1) > 0.9 && at.at(-1) < 1);
});

test('hands-on applies to every decision, or clutch moments only', () => {
  assert(!G.handsOnApplies({ handsOn: 'off' }, { clutch: true }));
  assert(G.handsOnApplies({ handsOn: 'all' }, { clutch: false }));
  assert(G.handsOnApplies({ handsOn: 'big' }, { clutch: true }));
  assert(!G.handsOnApplies({ handsOn: 'big' }, { clutch: false }));
});

function decidingClub(seed = 31) {
  const s = G.newGame(seed); G.enterCompetition(s, { kind: 'duel', tier: 0 }); s.day = s.matchDay; G.startMatch(s);
  const m = s.match; m.eventIndex = 3; m.entryIndex = 0; m.turnSide = 'home'; m.phase = 'decide'; m.started[3] = true;
  const a = G.homeAthlete(s); a.skills = []; a.equipped = []; a.stamina = 100; a.condition = 100;
  return s;
}

test('by hand the dice foul half as often, except for Bank it', () => {
  const s = decidingClub();
  for (const tactic of ['balanced', 'attack']) {
    const dice = G.throwPreview(s, tactic).foul, hand = G.throwPreview(s, tactic, 'good', false, true).foul;
    assert(Math.abs(hand - Math.max(0.01, dice * G.HANDS_ON_DICE)) < 1e-9, tactic);
  }
  assert.equal(G.throwPreview(s, 'safe', 'good', false, true).foul, G.throwPreview(s, 'safe').foul);
});

test('over the line is a foul that keeps the random sequence and survives saving', () => {
  const s = decidingClub(), copy = structuredClone(s);
  const beat = G.decideThrow(s, 'attack', 'scratch', false, { handsOn: true });
  assert(beat.foul && beat.scratch && beat.handsOn); assert.equal(beat.mark, null);
  assert.equal(throwResult(beat).headline, 'Over the line');
  G.decideThrow(copy, 'attack', 'poor', false, { handsOn: true });
  assert.equal(s.rng, copy.rng, 'a scratch rolls the same dice as any other throw');
  assert.deepEqual(validateCampaign(exportCampaign(s)).match.last, beat);
  // Without hands-on, a scratch is just a poor release.
  const plain = decidingClub();
  const b2 = G.decideThrow(plain, 'balanced', 'scratch');
  assert(!b2.scratch && !b2.handsOn); assert.equal(b2.quality, 'poor');
});

test('a skill that rules out fouls turns a scratch into a poor throw', () => {
  const s = decidingClub();
  const a = G.homeAthlete(s);
  // The first throw of an athlete with a safe-first skill can't foul.
  const safeFirst = Object.entries(SKILLS).find(([, k]) => k.safeFirst)[0];
  a.skills = [safeFirst]; a.equipped = [safeFirst];
  assert.equal(G.throwPreview(s, 'attack', 'poor', false, true).foul, 0);
  const beat = G.decideThrow(s, 'attack', 'scratch', false, { handsOn: true });
  assert(!beat.foul && !beat.scratch);
});

test('the old manual release setting becomes hands-on for every throw', () => {
  const s = G.newGame(4);
  s.settings = { ...s.settings, manualRelease: true }; delete s.settings.handsOn;
  const back = validateCampaign(exportCampaign(s));
  assert.equal(back.settings.handsOn, 'all'); assert(!('manualRelease' in back.settings));
  const fresh = validateCampaign(exportCampaign(G.newGame(5)));
  assert.equal(fresh.settings.handsOn, 'off');
  const odd = G.newGame(6); odd.settings.handsOn = 'sometimes';
  assert.equal(validateCampaign(exportCampaign(odd)).settings.handsOn, 'off');
});
