import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import { ELITES, EVENTS, EVENT_IDS } from '../src/game-content.js';

test('the elite throwers are invented, four per event, and their marks stay just under the world record', () => {
  const s = G.newGame(3);
  for (const ev of EVENT_IDS) assert.equal(ELITES.filter((e) => e.event === ev).length, 4);
  assert.equal(new Set(ELITES.map((e) => e.name)).size, ELITES.length);
  for (const e of ELITES) for (const year of [1, 2, 7]) {
    const m = G.eliteMark(s, e, year);
    assert(m < G.worldRecord(s, e.event) && m > EVENTS[e.event].record * 0.9, `${e.name} year ${year}: ${m}`);
    assert.equal(G.eliteMark(s, e, year), m, 'the same year every time');
  }
  assert.notEqual(G.eliteMark(s, ELITES[0], 1), G.eliteMark(s, ELITES[0], 2), 'form changes from year to year');
});

test('world rankings: the elites at the top, a novice far down, and your athlete joins the list when good enough', () => {
  const s = G.newGame(4), shot = ELITES.filter((e) => e.event === 'shot').map((e) => G.eliteMark(s, e)).sort((a, b) => b - a);
  assert.equal(G.worldRank(s, 'shot', shot[0]), 1);
  assert.equal(G.worldRank(s, 'shot', shot[0] + 0.5), 1);
  const ranks = [shot[3] - 0.1, 20, 15, 9].map((m) => G.worldRank(s, 'shot', m));
  assert(ranks.every((r, i) => !i || r > ranks[i - 1]), 'further back, lower ranked: ' + ranks);
  assert(G.worldRank(s, 'shot', 9) > 3000 && G.worldRank(s, 'shot', 9) <= 50000, 'a novice is a long way down, but on the map');
  const a = s.roster.find((x) => x.event === 'shot');
  a.pb.shot = shot[1] + 0.01;
  const list = G.worldList(s, 'shot');
  assert.equal(list[1].athlete, a, 'second in the world');assert.equal(list[1].rank, 2);
  const club = G.clubVersusWorld(s).find((r) => r.event === 'shot');
  assert.equal(club.rank, 2); assert(club.gap > 0);
});

test('a meet adds to the year tally, and a new year holds awards night with an MVP and the world teaser', () => {
  const s = G.newGame(12);
  s.settings.clutch = false;
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  s.day = s.matchDay; assert(G.startMatch(s)); assert(G.simulateMatch(s));
  const points = G.eventScores(s.match).reduce((n, e) => n + e.h, 0);
  assert(G.leaveMatch(s));
  const tally = Object.values(s.yearStats.athletes);
  assert.equal(tally.reduce((n, x) => n + x.points, 0), points);
  assert(tally.some((x) => x.meets === 1));
  const mvp = s.roster.find((a) => s.yearStats.athletes[a.id]?.points === Math.max(...tally.map((x) => x.points)));
  const sp = mvp.sp;
  s.day = 168; s.pendingEvent = null;
  if (s.competition) { s.competition = null; s.phase = 'planning'; s.matchDay = null; }
  const r = G.advanceDay(s);
  assert(r.ceremony, 'day 169 opens Year 2');
  assert.equal(s.ceremony.year, 1);
  const top = s.ceremony.list.find((w) => w.mvp);
  assert.equal(top.id, mvp.id); assert.equal(mvp.sp, sp + 1);
  assert.equal(s.ceremony.world.length, 4);
  assert(s.ceremony.world.every((w) => w.leader.name && w.leader.mark > 0));
  assert.equal(s.yearStats.year, 2);
  assert(Object.values(s.yearStats.athletes).every((x) => x.points === 0 && x.meets === 0), 'the tally starts again');
  const steps = P.ceremonySteps(s);
  assert.equal(steps.length, 1 + s.ceremony.list.length + 1);
  assert.match(steps.at(-1).body, /world #/);
  const copy = validateCampaign(exportCampaign(s));
  assert.deepEqual(copy.ceremony, s.ceremony);
  assert.equal(G.advanceDay(s).ceremony, null, 'one ceremony a year');
});

test('accessories add variety without drawing from the game\'s random stream', () => {
  const s = G.newGame(55), copy = structuredClone(s);
  G.makeLook(s);
  for (let i = 0; i < 3; i++) G.random(copy);
  assert.equal(s.rng, copy.rng);
  const looks = Array.from({ length: 300 }, () => G.makeLook(s));
  const worn = looks.filter((l) => l.gear);
  assert(worn.length > 30 && worn.length < 120, worn.length + ' of 300 wear something');
  assert.deepEqual(new Set(worn.map((l) => l.gear)), new Set(['shades', 'band', 'cap']));
});

test('the elites compete for the World League clubs, and older World League saves get them on load', () => {
  const s = G.newGame(21);
  const world = G.makeClubs(s, 4, 0, [0, 1, 2, 3, 4, 5]);
  const seated = world.flatMap((c) => c.athletes.filter((a) => a.elite));
  assert.equal(seated.length, ELITES.length, 'all sixteen have a club');
  for (const e of ELITES) {
    const a = seated.find((x) => x.elite === e.id), club = world.find((c) => c.athletes.includes(a));
    assert.equal(a.name, e.name); assert.equal(a.event, e.event); assert.equal(a.nation, e.nation); assert.equal(club.id, e.club);
  }
  for (const league of [0, 1, 2, 3]) assert(!G.makeClubs(s, league, 0, [0, 1, 2, 3, 4, 5]).some((c) => c.athletes.some((a) => a.elite)), 'only the World League');
  const plain = G.newGame(22);
  plain.rivalClubs[4] = world.map((c) => ({ ...c, athletes: c.athletes.map((a) => { const b = { ...a }; delete b.elite; delete b.nation; return b; }) }));
  const copy = validateCampaign(exportCampaign(plain));
  assert.equal(copy.rivalClubs[4].flatMap((c) => c.athletes.filter((a) => a.elite)).length, ELITES.length);
});
