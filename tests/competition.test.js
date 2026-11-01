import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';
import { EVENT_IDS } from "../src/game-content.js";

function finishMeet(s, win = true) {
  for (let guard = 0; s.day < s.matchDay && guard < 50; guard++) {
    if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
    else assert(G.advanceDay(s).ok);
  }
  if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
  if (win) for (const a of s.roster) { a.potential=100; a.stats=[100,100,100,100]; for(const ev of EVENT_IDS) a.mastery[ev]=100; }
  if (win) G.opponent(s).athletes.forEach((a) => { a.stats = [1, 1, 1, 1]; a.skills = []; a.equipped = []; });
  assert(G.startMatch(s));
  assert(G.simulateMatch(s));
  return s.match;
}
function winLeague(s) {
  for (let i = 0; i < 4; i++) { finishMeet(s); assert(G.leaveMatch(s)); }
  assert(s.champion);
}

test('an open calendar trains without tapering and books or cancels without losing progress', () => {
  const s = G.newGame(91), a = s.roster[0];
  assert.equal(s.phase, 'planning');
  assert.equal(G.opponent(s), null);
  assert(!G.startMatch(s));
  a.plan = 'power';
  assert.equal(G.plannedActivity(s, a), 'power');
  assert(G.advanceDay(s).ok);
  const stats = [...a.stats];
  assert(!G.enterCompetition(s, { kind: 'league', tier: 1 }));
  assert(!G.enterCompetition(s, { kind: 'league', tier: 0, stage: 2 }));
  assert(!G.enterCompetition(s, { kind: 'duel', tier: 0, preparation: 0 }));
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 2, preparation: 10 }));
  assert.equal(s.matchDay, s.day + 10);
  assert.equal(G.opponent(s).id, 2);
  assert(!G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  assert(G.cancelCompetition(s));
  assert.deepEqual(a.stats, stats);
  assert.equal(s.matchDay, null);
  assert.equal(validateCampaign(exportCampaign(s)).phase, 'planning');
});

test('duels settle once, retain first-win rewards across reloads, and never promote or fill league standings', () => {
  let s = G.newGame(92);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 1, preparation: 3 }));
  const first = finishMeet(s);
  assert.equal(first.kind, 'duel');
  assert(first.rewards.firstDuel);
  assert(s.bag.scroll >= 1);
  const paid = s.money;
  G.settleMatch(s);
  assert.equal(s.money, paid);
  assert(s.clubs.every((c) => c.points === 0 && c.played === 0));
  s = validateCampaign(exportCampaign(s));
  assert(G.leaveMatch(s));
  assert.equal(s.phase, 'planning');
  assert.equal(s.season, 1);
  assert.equal(s.league, 0);
  assert.equal(s.circuit.cleared.length, 0);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 1 }));
  const second = finishMeet(s);
  assert(!second.rewards.firstDuel);
  assert.equal(s.circuit.duels.length, 1);
  assert(!G.cancelCompetition(s));
  assert(G.leaveMatch(s));
  assert.equal(s.history.length, 2);
  assert.notEqual(s.history[0].id, s.history[1].id);
});

test('league timing, different formats and first-title gifts survive saving and replay', () => {
  let s = G.newGame(93);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0, preparation: 7, spacing: 10 }));
  let m = finishMeet(s);
  assert.equal(m.attempts, 3);
  assert(m.home);
  G.leaveMatch(s);
  assert.equal(s.matchDay, s.day + 10);
  s = validateCampaign(exportCampaign(s));
  for (let i = 0; i < 3; i++) { finishMeet(s); G.leaveMatch(s); }
  assert(s.champion);
  assert.equal(s.lastTitleGift, 'scroll');
  assert.equal(s.circuit.cleared.length, 1);
  G.nextSeason(s);
  assert.equal(s.league, 0, 'Open alone does not unlock Regional');
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 1 }));
  m = finishMeet(s);
  assert.equal(m.attempts, 3);
  assert(G.leaveMatch(s));
  for (let i = 0; i < 3; i++) { finishMeet(s); G.leaveMatch(s); }
  assert.equal(s.lastTitleGift, 'letter');
  G.nextSeason(s);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 2 }));
  m = finishMeet(s);
  assert.equal(m.home, false);
  G.leaveMatch(s);
  for (let i = 0; i < 3; i++) { finishMeet(s); G.leaveMatch(s); }
  assert.equal(s.lastTitleGift, 'elixir');
  G.nextSeason(s);
  assert.equal(s.league, 1);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  winLeague(s);
  assert.equal(s.lastTitleGift, null);
  G.nextSeason(s);
  assert.equal(s.league, 1, 'replays never demote the club');
  assert.equal(s.circuit.cleared.length, 3);
});

test('a duel saved during a throw resumes with the same opponent and rewards', () => {
  const s = G.newGame(94);
  G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 2 });
  s.day = s.matchDay;
  G.startMatch(s);
  for (let i = 0; i < 4; i++) G.advanceMatch(s);
  const copy = validateCampaign(exportCampaign(s));
  G.simulateMatch(s);
  G.simulateMatch(copy);
  assert.deepEqual(copy.match, s.match);
  assert.equal(copy.money, s.money);
});

test('saved skill setups affect their own context without silently changing the editable setup', () => {
  const s = G.newGame(95), a = s.roster[0];
  a.type = 'allrounder'; // growth ×1, so only skills and background show
  a.skills = ['gymrat', 'opener'];
  a.equipped = ['gymrat'];
  assert(G.saveLoadout(s, a.id, 'training'));
  assert(!G.enableLoadouts(s, a.id, true));
  a.equipped = ['opener'];
  assert(G.saveLoadout(s, a.id, 'meet'));
  assert(G.enableLoadouts(s, a.id, true));
  assert.equal(G.effects(s, a, true, 'training').train[0], 1.15 * 1.25);
  assert.equal(G.effects(s, a, true, 'meet').first, 1.03);
  assert.equal(G.effects(s, a, true, 'meet').train[0], 1.15);
  assert.deepEqual(a.equipped, ['opener']);
  const copy = validateCampaign(exportCampaign(s));
  assert.deepEqual(copy.roster[0].loadouts, a.loadouts);
  G.enterCompetition(s, { kind: 'duel', tier: 0 });
  s.day = s.matchDay; G.startMatch(s);
  assert(!G.saveLoadout(s, a.id, 'meet'));
  assert(!G.enableLoadouts(s, a.id, false));
});

test('career milestones reward once and remain earned after reload', () => {
  const s = G.newGame(96), a = s.roster[0];
  a.meets = 3; a.development.clean = 20; a.development.pbs = 6;
  const before = { sp: a.sp, potential: a.potential, focus: a.stats[3] };
  assert.equal(G.checkDevelopment(s, a).length, 3);
  assert.equal(a.sp, before.sp + 1);
  assert.equal(a.potential, before.potential + 2);
  assert.equal(a.stats[3], before.focus + 2);
  const copy = validateCampaign(exportCampaign(s));
  assert.equal(G.checkDevelopment(copy, copy.roster[0]).length, 0);
  assert(copy.roster[0].career.some((c) => c.label.includes('New horizons')));
});

test('single-choice news never blocks training, but real choices still do', () => {
  let automatic = 0, decisions = 0;
  for (let seed = 1; seed < 300; seed++) {
    const s = G.newGame(seed);
    s.day = 1 + G.STORY_GAP;
    const logs = s.log.length;
    const e = G.rollStoryEvent(s);
    if (e) { decisions++; assert(G.STORY[e.id].choices.length > 1); assert(!G.advanceDay(s).ok); }
    else if (s.log.length > logs) { automatic++; assert.equal(s.pendingEvent, null); }
  }
  assert(automatic > 0);
  assert(decisions > 0);
});

test('v5 careers retain their current championship and completed invitations', () => {
  const old = G.newGame(97);
  old.v = 5; old.phase = 'season'; old.matchDay = old.day + 3;
  old.league = 2; old.trophies = [{ league: 0, season: 1 }, { league: 1, season: 3 }];
  old.clubs = G.makeClubs(old, 2);
  delete old.circuit; delete old.competition; delete old.clubTier; delete old.clubStage;
  const s = validateCampaign(old);
  assert.equal(s.v, 8);
  assert.equal(s.competition.stage, 2);
  assert.equal(s.competition.tier, 2);
  assert.equal(s.circuit.cleared.length, 8);
  assert.deepEqual(s.clubs.map((c) => c.athletes.map((a) => a.name)), old.clubs.map((c) => c.athletes.map((a) => a.name)));
  assert.deepEqual(s.roster.map((a) => a.stats), old.roster.map((a) => a.stats));
});

test('malformed calendars, loadouts and milestone state cannot be imported', () => {
  for (const mutate of [
    s => { s.matchDay = 3; },
    s => { s.circuit.cleared = ['9:0']; },
    s => { s.circuit.duels = ['0:0', '0:0']; },
    s => { s.roster[0].loadouts = { enabled: true, training: null, meet: [] }; },
    s => { s.roster[0].loadouts.training = ['meteor']; },
    s => { s.roster[0].development.clean = -1; },
    s => { s.roster[0].development.claimed = ['fake']; },
  ]) { const s = G.newGame(98); mutate(s); assert.throws(() => validateCampaign(s)); }
  const s = G.newGame(99);
  G.enterCompetition(s, { kind: 'league', tier: 0 });
  s.competition.spacing = 0;
  assert.throws(() => validateCampaign(s));
});

test('calendar and athlete pages render in planning, booked, completed and migrated careers', () => {
  const s = G.newGame(100), view = {};
  assert.match(P.home(s, view), /Open the meet calendar/);
  assert.match(P.league(s, view), /Book duel/);
  assert.match(P.squad(s, { athlete: s.roster[0].id, tab: 'skills' }), /Saved skill setups/);
  G.enterCompetition(s, { kind: 'league', tier: 0 });
  assert.match(P.home(s, view), /Community Division/);
  winLeague(s);
  assert.match(P.home(s, view), /Choose the next chapter/);
  validateCampaign(s);
});

test('placings reward an event sweep, use countback, share exact ties and exclude all-foul entries', () => {
  const field = (home, away) => ({home:home.map((marks,i)=>({id:i+1,marks})),away:away.map((marks,i)=>({id:i+10,marks}))});
  const m = { fields:[field([[20,19,18],[18,17,16],[16,15,14]],[[15,14,13],[14,13,12],[null,null,null]]),
    field([[10,9,8]],[[10,8,7]]), field([[10,9,8]],[[10,9,8]]),field([[null,null,null]],[[null,null,null]])], closed:[true,true,true,true] };
  const scores=G.eventScores(m);
  assert.equal(scores[0].h,9); assert.equal(scores[0].a,0);
  assert.equal(scores[1].h,5); assert.equal(scores[1].a,3);
  assert.equal(scores[2].h,4); assert.equal(scores[2].a,4);
  assert.equal(scores[3].h,0); assert.equal(scores[3].a,0);
});

test('legacy finals retain qualifying marks and give only the top four three final throws', () => {
  const s=G.newGame(109);
  s.circuit.cleared=['0:0','0:1'];
  G.enterCompetition(s,{kind:'league',tier:0,stage:2});
  delete s.competition.format; // A booked final from an older save keeps its rules.
  s.fixture=3; s.finalOpponent=0; s.day=s.matchDay;
  // Put a third athlete in shot, reducing the other event commitments first.
  s.entries={shot:s.roster.slice(0,3).map(a=>a.id),discus:[],hammer:[],jav:[s.roster[3].id]};
  for(const ev of EVENT_IDS) s.lineup[ev]=s.entries[ev][0]||null;
  assert(G.startMatch(s));
  const saved=validateCampaign(exportCampaign(s));
  assert(G.simulateMatch(saved));
  const f=saved.match.fields[0];
  const all=[...f.home,...f.away];
  assert.equal(all.filter(e=>e.finalist).length,4);
  assert(all.every(e=>e.marks.length===(e.finalist?6:3)));
  assert(G.eventScores(saved.match).every(e=>e.done));
  validateCampaign(exportCampaign(saved));
});
