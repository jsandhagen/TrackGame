import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import { EVENT_IDS, DIVISIONS, SKILLS } from '../src/game-content.js';
import { throwResult, isHighlight, celebrates, windReading } from '../src/render/meet-presentation.js';

const reload = (s) => validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));
function prepare(s) {
  for (let guard = 0; s.day < s.matchDay && guard < 80; guard++) {
    if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
    else assert(G.advanceDay(s).ok);
  }
  if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
}
const strong = (s) => { for (const a of s.roster) { a.potential = 100; a.stats = [100, 100, 100, 100]; for (const ev of EVENT_IDS) a.mastery[ev] = 100; } };
const weak = (club) => club.athletes.forEach((a) => { a.stats = [1, 1, 1, 1]; a.skills = []; a.equipped = []; });
function playMeet(s, { dominate = true } = {}) {
  prepare(s);
  if (dominate) { strong(s); weak(G.opponent(s)); }
  G.autoLineup(s);
  assert(G.startMatch(s));
  const beats = [];
  for (let guard = 0; guard < 2000 && s.match.phase !== 'complete'; guard++) {
    const b = s.match.phase === 'decide' ? G.decideThrow(s, G.autoTactic(s, 'home')) : G.advanceMatch(s);
    if (b) beats.push(b);
  }
  assert.equal(s.match.phase, 'complete');
  return beats;
}

test('a division record stands just past the band until a league throw beats it, and pays the club that does', () => {
  const s = G.newGame(301);
  for (const d of DIVISIONS) for (const ev of EVENT_IDS) {
    const r = G.divisionRecord(s, d.index, ev);
    assert(r.mark > d.marks[ev][1] && r.mark < d.marks[ev][1] * 1.05 && r.name === null);
  }
  assert(G.divisionRecordReward(14).money > G.divisionRecordReward(0).money && G.divisionRecordReward(14).fans > G.divisionRecordReward(0).fans);
  // A duel is not a league meet: no division record is at stake.
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  let beats = playMeet(s);
  assert.equal(G.recordDivision(s), null);
  assert(beats.every((b) => !b.divisionRecord));
  assert.deepEqual(s.match.rewards.divisionRecords, []);
  assert.equal(s.divisionRecords, undefined);
  assert(G.leaveMatch(s));

  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  beats = playMeet(s);
  const broke = beats.filter((b) => b.type === 'throw' && b.divisionRecord);
  assert(broke.length >= 4 && broke.every((b) => b.side === 'home' && b.mark > b.previousDivisionRecord));
  // Each successive record in an event has to beat the one before it.
  for (const ev of EVENT_IDS) {
    const marks = broke.filter((b) => b.event === ev).map((b) => b.mark);
    assert(marks.length && marks.every((m, i) => !i || m > marks[i - 1]), ev);
    const held = G.divisionRecord(s, 0, ev);
    assert.equal(held.mark, marks.at(-1));
    assert(held.home && held.club === s.clubName && s.roster.some((a) => a.name === held.name));
  }
  const r = s.match.rewards, prize = G.divisionRecordReward(0);
  assert.equal(r.divisionRecords.length, 4);
  assert(r.divisionRecords.every((d) => d.home && d.division === 0 && d.previous === G.divisionRecord({}, 0, d.event).mark));
  assert.equal(s.counters.divisionRecords, 4);
  assert(r.money >= 4 * prize.money && r.fans >= 4 * prize.fans);
  assert(s.ledger.days.some((d) => d.money['Division records'] === 4 * prize.money));
  assert(s.roster.some((a) => a.career.some((c) => /Community Division record/.test(c.label))));
  assert(s.log.some((l) => /Community Division record!/.test(l.text)));
  const result = throwResult(broke[0]);
  assert.equal(result.headline, 'Division record!');
  assert.match(result.detail, /Record was/);
  assert(isHighlight(broke[0]) && celebrates(broke[0]));
  assert.match(P.meetComplete(s), /Community Division record/);
  assert.match(P.league(s, { leagueTab: 'records' }) + P.league(s, {}), /Community Division/);
  // The record survives a save and has to be beaten again.
  const again = reload(s);
  for (const ev of EVENT_IDS) assert.deepEqual(G.divisionRecord(again, 0, ev), G.divisionRecord(s, 0, ev));
});

test('a rival can take a division record, which is news but pays nothing', () => {
  const s = G.newGame(302);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  prepare(s);
  weak({ athletes: s.roster });
  const club = G.opponent(s);
  for (const a of club.athletes) { a.stats = [100, 100, 100, 100]; for (const ev of EVENT_IDS) a.mastery[ev] = 100; }
  G.autoLineup(s);
  const money = s.money;
  assert(G.startMatch(s)); assert(G.simulateMatch(s));
  const r = s.match.rewards;
  assert(r.divisionRecords.length >= 3 && r.divisionRecords.every((d) => !d.home && d.club === club.name));
  assert(!s.counters.divisionRecords);
  assert.equal(s.money - money, r.money);
  assert(s.log.some((l) => /sets a community division record/.test(l.text)));
  assert(!G.divisionRecord(s, 0, r.divisionRecords[0].event).home);
  assert.match(P.meetComplete(s), /the new mark to beat/);
});

test("a season's best needs an earlier mark this year and resets with the calendar", () => {
  const s = G.newGame(303), a = s.roster[0], ev = a.event;
  assert.equal(G.seasonBest(s, a, ev), 0);
  assert.equal(G.recordSeasonBest(s, a, ev, 10), false, 'the first mark of a year sets it quietly');
  assert.equal(G.seasonBest(s, a, ev), 10);
  assert.equal(G.recordSeasonBest(s, a, ev, 9.5), false);
  assert.equal(G.recordSeasonBest(s, a, ev, 10.4), true);
  assert.equal(G.seasonBest(s, a, ev), 10.4);
  s.day += G.YEAR_DAYS;
  assert.equal(G.seasonBest(s, a, ev), 0, 'a new year starts a new list');
  assert.equal(G.recordSeasonBest(s, a, ev, 9), false);
  assert.equal(G.seasonBest(s, a, ev), 9);
});

test("a throw past the year's best but short of the PB is called a season's best", () => {
  const s = G.newGame(304);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  prepare(s);
  G.autoLineup(s);
  // Everyone has thrown a little this year and much further in the past.
  for (const a of s.roster) { a.pb = Object.fromEntries(EVENT_IDS.map((ev) => [ev, 200])); a.sb = { year: G.yearOf(s), marks: Object.fromEntries(EVENT_IDS.map((ev) => [ev, 1])) }; }
  assert(G.startMatch(s));
  const beats = [];
  for (let guard = 0; guard < 2000 && s.match.phase !== 'complete'; guard++) {
    if (s.match.phase !== 'decide' && beats.length === 12) {
      // Mid-meet the scoreboard already shows the badge.
      const rows = EVENT_IDS.flatMap((_, i) => G.scoreboard(s, i).rows);
      assert(rows.some((r) => r.side === 'home' && r.sb && !r.pb));
      assert(rows.every((r) => r.side === 'home' || !r.sb));
    }
    const b = s.match.phase === 'decide' ? G.decideThrow(s, G.autoTactic(s, 'home')) : G.advanceMatch(s);
    if (b?.type === 'throw') beats.push(b);
  }
  const sbs = beats.filter((b) => b.seasonBest);
  assert(sbs.length && sbs.every((b) => b.side === 'home' && !b.newPb && b.mark != null));
  assert(beats.filter((b) => b.side === 'away').every((b) => !b.seasonBest));
  assert.match(throwResult(sbs.find((b) => !b.tookLead && !b.passedRival && (!b.place || b.place >= (b.previousPlace || 0))) || sbs[0]).detail + throwResult(sbs[0]).headline, /Season's best/);
  const r = s.match.rewards;
  assert(r.sbs.length && r.pbs.length === 0);
  for (const x of r.sbs) assert.equal(G.seasonBest(s, s.roster.find((a) => a.id === x.id), x.event), x.mark);
  assert(EVENT_IDS.flatMap((_, i) => G.scoreboard(s, i).rows).some((row) => row.sb));
  assert.match(P.meetComplete(s), /season's best/);
});

test('championship podiums become medals, and medals and placings pay from the title purse', () => {
  const s = G.newGame(305);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  for (let i = 0; i < 3; i++) {
    playMeet(s);
    assert.deepEqual(s.match.rewards.medals, [], 'league duels award no medals');
    assert.equal(s.match.rewards.medalMoney, undefined);
    assert(G.leaveMatch(s));
  }
  assert(G.isLeagueChampionship(s));
  prepare(s); strong(s);
  for (const c of G.championshipClubs(s)) weak(c);
  assert(G.startMatch(s)); assert(G.simulateMatch(s));
  const r = s.match.rewards, purse = DIVISIONS[0].titlePrize;
  assert(r.medals.length >= 4 && r.medals.filter((m) => m.place === 1).length === 4);
  const five = (n) => Math.round(n / 5) * 5;
  assert.equal(r.medalMoney, r.medals.reduce((n, m) => n + five(purse * G.MEDAL_PRIZE[m.place - 1]), 0));
  assert.equal(r.teamPlace, 1);
  assert.equal(r.podium, undefined, 'the champions take the title prize instead');
  for (const m of r.medals) assert(G.medalsOf(s.roster.find((a) => a.id === m.id))[m.place - 1] >= 1);
  assert.equal(s.roster.reduce((n, a) => n + G.medalsOf(a).reduce((x, y) => x + y, 0), 0), r.medals.length);
  assert.match(P.meetComplete(s), /Medal prizes/);
  const golden = s.roster.find((a) => G.medalsOf(a)[0]);
  const kept = reload(s).roster.find((a) => a.id === golden.id);
  assert.deepEqual(G.medalsOf(kept), G.medalsOf(golden));
});

test('second and third in a championship take a share of the purse', () => {
  const s = G.newGame(400);
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  for (let i = 0; i < 3; i++) { playMeet(s); assert(G.leaveMatch(s)); }
  prepare(s);
  // One rival club is unbeatable, the rest are novices, and the club sits between them.
  const entered = G.championshipEntries(s), clubs = G.championshipClubs(s);
  const top = clubs.find((c) => EVENT_IDS.every((ev) => entered[ev].some((e) => e.club.id === c.id))) || clubs.find((c) => EVENT_IDS.some((ev) => entered[ev].some((e) => e.club.id === c.id)));
  for (const c of clubs) for (const a of c.athletes) { a.stats = c === top ? [100, 100, 100, 100] : [1, 1, 1, 1]; a.skills = []; a.equipped = []; if (c === top) for (const ev of EVENT_IDS) a.mastery[ev] = 100; }
  for (const a of s.roster) { a.stats = [60, 60, 60, 60]; for (const ev of EVENT_IDS) a.mastery[ev] = 60; }
  const money = s.money;
  assert(G.startMatch(s)); assert(G.simulateMatch(s));
  const r = s.match.rewards, place = s.match.teamScores.findIndex((c) => c.id === 'us') + 1;
  assert.equal(place, 2);
  assert.equal(r.teamPlace, 2);
  assert.equal(s.money - money, r.money);
  assert.deepEqual(r.podium, { place: 2, money: Math.round(DIVISIONS[0].titlePrize * G.PODIUM_PRIZE[2] / 5) * 5 });
  assert(G.meetOutcome(s.match) < 0);
  assert(r.medals.length >= 1 && r.medals.every((m) => m.place >= 2 || !entered[m.event].some((e) => e.club.id === top.id)));
  assert(s.ledger.days.some((d) => d.money['Championship placings'] === r.podium.money));
  assert.match(P.meetComplete(s), /Runners-up/);
});

test('throwers who keep meeting become rivals with a head-to-head score', () => {
  const s = G.newGame(306), a = s.roster[0], club = { name: 'Harbor Throws' }, x = { id: 9001, name: 'Dara Okoye' }, y = { id: 9002, name: 'Sam Reed' }, z = { id: 9003, name: 'Lee Park' };
  assert.equal(G.rivalOf(s, a), null);
  G.recordHeadToHead(s, a, x, club, 'shot', false, 0.02);
  assert.equal(G.rivalOf(s, a), null, 'one meeting is not a rivalry');
  G.recordHeadToHead(s, a, y, club, 'shot', true, 0.3);
  G.recordHeadToHead(s, a, x, club, 'shot', true, 0.04);
  let rival = G.rivalOf(s, a);
  assert.equal(rival.id, 9001);
  assert.deepEqual([rival.w, rival.l, rival.name, rival.club, rival.event], [1, 1, 'Dara Okoye', 'Harbor Throws', 'shot']);
  // Wins traded count for more than meetings: a 1-1 rival outranks someone beaten four times.
  for (let i = 0; i < 3; i++) G.recordHeadToHead(s, a, y, club, 'shot', true, 0.3);
  assert.deepEqual([G.headToHead(s, a.id, 9002).w, G.headToHead(s, a.id, 9002).l], [4, 0]);
  assert.equal(G.rivalOf(s, a).id, 9001);
  // Among opponents never lost to, the one who finishes closest is the rival.
  const b = s.roster[1];
  for (let i = 0; i < 3; i++) G.recordHeadToHead(s, b, y, club, 'discus', true, 0.3);
  for (let i = 0; i < 2; i++) G.recordHeadToHead(s, b, z, club, 'discus', true, 0.01);
  assert.equal(G.rivalOf(s, b).id, 9003);
  // Placings: a mark beats no mark, equal places settle nothing, and only the rival is reported.
  const away = (id) => ({ athlete: id === 9001 ? x : y, club });
  const met = G.settleHeadToHeads(s, 'shot', [
    { side: 'home', id: a.id, place: 1, mark: 12 }, { side: 'away', id: 9001, place: 2, mark: 11.4 }, { side: 'away', id: 9002, place: null, mark: null },
  ], away);
  assert.deepEqual(met.map((m) => [m.rivalId, m.won, m.w, m.l]), [[9001, true, 2, 1]]);
  assert.deepEqual([G.headToHead(s, a.id, 9002).w, G.headToHead(s, a.id, 9002).l], [5, 0]);
  assert(Math.abs(G.headToHead(s, a.id, 9001).gap - (0.02 + 0.04 + 0.6 / 12)) < 1e-9);
  assert.deepEqual(G.settleHeadToHeads(s, 'shot', [{ side: 'home', id: a.id, place: 1, mark: 12 }, { side: 'away', id: 9001, place: 1, mark: 12 }], away), []);
  assert.equal(G.headToHead(s, a.id, 9001).w, 2);
  // A record saved before gaps were kept still ranks.
  s.rivalries[b.id] = { 9002: { w: 2, l: 0, name: 'Sam Reed', club: 'Harbor Throws', event: 'discus', last: s.day } };
  assert.equal(G.rivalOf(s, b).id, 9002);
  // A released athlete's record goes with them; it survives a save otherwise.
  assert.deepEqual(reload(s).rivalries[a.id], s.rivalries[a.id]);
  s.roster = s.roster.filter((c) => c.id !== a.id);
  G.pruneRivalries(s);
  assert.equal(s.rivalries[a.id], undefined);
});

test('league meets build rivalries, and beating a rival is a moment with a reward', () => {
  const s = G.newGame(307);
  const champs = () => { prepare(s); strong(s); for (const c of G.championshipClubs(s)) weak(c); G.seedChampionshipLineup(s); };
  const run = () => {
    const beats = [];
    for (let guard = 0; guard < 4000 && s.match.phase !== 'complete'; guard++) {
      const b = s.match.phase === 'decide' ? G.decideThrow(s, G.autoTactic(s, 'home')) : G.advanceMatch(s);
      if (b?.type === 'throw') beats.push(b);
      if (b?.type === 'throw' && s.match.phase !== 'complete') assert.doesNotThrow(() => P.meetBar(s, {}));
    }
    return beats;
  };
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 0 }));
  playMeet(s);
  assert.deepEqual(s.match.rewards.rivalries, [], 'nobody is a rival before the second meeting');
  assert(Object.keys(s.rivalries).length >= 4);
  assert(s.roster.every((a) => !G.rivalOf(s, a)));
  assert(G.leaveMatch(s));
  for (let i = 0; i < 2; i++) { playMeet(s); assert(G.leaveMatch(s)); }
  // The championship brings every club back: the second meeting makes rivals.
  assert(G.isLeagueChampionship(s));
  champs();
  assert(G.startMatch(s)); run();
  assert(s.roster.some((a) => G.rivalOf(s, a)));
  assert(G.leaveMatch(s)); assert(G.nextSeason(s));
  // Next season the same clubs are in the division above, and the rivals are waiting.
  assert(G.enterCompetition(s, { kind: 'league', tier: 0, stage: 1 }));
  for (let i = 0; i < 3; i++) { playMeet(s); assert(G.leaveMatch(s)); }
  champs();
  const lobby = P.lobby(s, {});
  assert.match(lobby, /head-to-head/);
  assert.match(lobby, /wind-forecast/);
  assert(G.startMatch(s));
  const beats = run(), r = s.match.rewards;
  assert(r.rivalries.length >= 1 && r.rivalries.every((x) => x.won && x.w >= 2));
  const passed = beats.filter((b) => b.passedRival);
  assert(passed.length >= 1 && passed.every((b) => b.side === 'home' && isHighlight(b) && celebrates(b)));
  assert.match(throwResult(passed[0]).headline + throwResult(passed[0]).detail, /Past rival/);
  const won = r.rivalries[0], progress = r.athleteProgress.find((p) => p.id === won.id);
  assert(progress.sources.some(([label, xp]) => /^Beat rival /.test(label) && xp === G.MEET_XP.rival));
  assert.match(P.meetComplete(s), /head-to-head now/);
  const a = s.roster.find((x) => x.id === won.id);
  const file = P.squad(s, { athlete: a.id });
  assert.match(file, /rival-fact/);
  assert.match(file, /medal-chip/);
  // A rival not seen for a long time gives way to a fresher one.
  const old = G.rivalOf(s, a);
  s.day += G.RIVALRY_FRESH + 1;
  G.recordHeadToHead(s, a, { id: 9100, name: 'New Face' }, { name: 'Elsewhere' }, a.event, true, 0.1);
  assert.equal(G.rivalOf(s, a).id, old.id, 'one meeting is still not a rivalry');
  G.recordHeadToHead(s, a, { id: 9100, name: 'New Face' }, { name: 'Elsewhere' }, a.event, false, 0.1);
  assert.equal(G.rivalOf(s, a).id, 9100);
});

test('rival throwers keep to three skill slots, signature and captaincy first', () => {
  const a = { skills: ['hunter', 'clutch', 'highroller', 'captain', 'tempest'] };
  assert.deepEqual(G.rivalLoadout(a), ['captain', 'tempest', 'hunter']);
  assert.deepEqual(G.rivalLoadout({ skills: ['opener', 'clutch'] }), ['opener', 'clutch']);
  const s = G.newGame(308);
  s.league = 4;
  for (const d of DIVISIONS) if (d.index < 14) s.circuit.cleared.push(d.key);
  s.money = 50000;
  assert(G.enterCompetition(s, { kind: 'league', tier: 4, stage: 2 }));
  const all = Object.values(s.rivalClubs).flat().concat(s.clubs).flatMap((c) => c.athletes);
  assert(all.some((x) => x.skills.length > G.RIVAL_SLOTS), 'top stars still know more than they can carry');
  assert(all.every((x) => x.equipped.length <= G.RIVAL_SLOTS && x.equipped.every((k) => x.skills.includes(k) && SKILLS[k])));
  // An older save's overfull loadout is trimmed when the meet starts.
  const star = all.find((x) => x.skills.length > G.RIVAL_SLOTS && G.opponent(s).athletes.includes(x)) || G.opponent(s).athletes[0];
  star.skills = ['hunter', 'clutch', 'highroller', 'captain', 'opener']; star.equipped = [...star.skills];
  prepare(s); G.autoLineup(s);
  assert(G.startMatch(s));
  assert.deepEqual(star.equipped, ['captain', 'hunter', 'clutch']);
});

test('the wind gauge reads in metres a second and the call room explains it', () => {
  assert.equal(windReading('headwind', 2.34), 'Headwind 2.3 m/s');
  assert.equal(windReading('calm', 0), '');
  assert.equal(windReading('tailwind', 0), '');
  const beat = { type: 'throw', side: 'home', mark: 50, ownBest: 50, place: 2, previousPlace: 2, wind: 'tailwind', windSpeed: 3.1, activations: [] };
  assert.match(throwResult(beat).detail, /Tailwind 3\.1 m\/s/);
  assert.doesNotMatch(throwResult({ ...beat, wind: undefined, windSpeed: undefined }).detail, /m\/s/);
  assert.match(P.meetGuide(null), /tailwind/);
  assert.match(P.meetGuide(null), /Division records/);
});
