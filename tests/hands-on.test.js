import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';
import {throwResult} from '../src/render/meet-presentation.js';
import {EVENT_IDS, SKILLS} from '../src/game-content.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('the tactic sets the run-up: none for Bank it, longer and shuffled for All out', () => {
  for (const event of EVENT_IDS) {
    const safe = G.buildPattern(event, 'safe'), ctl = G.buildPattern(event, 'balanced'), all = G.buildPattern(event, 'attack');
    assert.equal(safe.steps.length, 0);
    assert(safe.release.bounce, 'Bank it bounces and has no foul line');
    assert(!ctl.release.bounce && !all.release.bounce);
    assert(all.steps.length > ctl.steps.length && ctl.steps.length > 0);
    assert(Math.max(...all.windows) < Math.max(...ctl.windows), 'All out gives less time per step');
    assert(all.release.sweep < ctl.release.sweep, 'and a faster needle');
    assert(ctl.steps.every((st, i) => i === 0 || st.side !== ctl.steps[i - 1].side), 'Controlled alternates');
  }
  // All out can repeat a side; never with rand always above the shuffle chance.
  const shuffled = G.buildPattern('jav', 'attack', {}, seq(0.9, 0.01));
  assert(shuffled.steps.some((st, i) => i && st.side === shuffled.steps[i - 1].side));
});

test('stats shape the pattern and low stamina tightens it', () => {
  const low = G.buildPattern('jav', 'balanced', { stats: [50, 10, 10, 50] }),
    high = G.buildPattern('jav', 'balanced', { stats: [50, 90, 90, 50] }),
    tired = G.buildPattern('jav', 'balanced', { stats: [50, 90, 90, 50], stamina: 20 });
  assert(high.release.perfect > low.release.perfect && high.release.good > low.release.good, 'Technique widens the gold');
  assert(high.windows[0] > low.windows[0], 'Speed gives more time per step');
  assert(tired.windows[0] < high.windows[0] && tired.release.perfect < high.release.perfect);
  const skilled = G.buildPattern('jav', 'balanced', { stats: [50, 10, 10, 50], perfectSkill: true });
  assert(skilled.release.perfect > low.release.perfect);
});

test('grading: a clean run-up and a gold release is perfect; past the line is a scratch', () => {
  const p = G.buildPattern('jav', 'attack'), full = p.steps.map(() => 1), r = p.release;
  assert.equal(G.gradeThrow(p, full, r.center).quality, 'perfect');
  assert.equal(G.gradeThrow(p, p.steps.map(() => 0), r.center).quality, 'poor', 'a stumbling run-up spoils the release');
  assert.equal(G.gradeThrow(p, full, r.center + r.good * 0.9).quality, 'good');
  assert.equal(G.gradeThrow(p, full, 0.05).quality, 'poor');
  assert.equal(G.gradeThrow(p, full, 1.01).quality, 'scratch');
  const bank = G.buildPattern('jav', 'safe');
  assert.equal(G.gradeThrow(bank, [], bank.release.center).quality, 'perfect');
  assert.notEqual(G.gradeThrow(bank, [], 1).quality, 'scratch', 'Bank it cannot foul by hand');
  assert(G.needleAt(bank.release, bank.release.sweep * 1.5) < 1, 'and its needle bounces back');
  assert.equal(G.stepScore(500, 0, true), 1);
  assert.equal(G.stepScore(500, 100, false), 0);
  assert.equal(G.stepScore(500, 600, true), 0);
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
