import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { EVENTS, EVENT_IDS, LEAGUES, STADIUM } from '../src/game-content.js';

test('past the record, marks keep rising ever more slowly, with no ceiling', () => {
  for (const ev of EVENT_IDS) {
    const { record } = EVENTS[ev];
    assert.equal(G.realMark(ev, record * 0.8), record * 0.8, 'ordinary marks are untouched');
    let last = 0, step = Infinity;
    for (let raw = record; raw <= record * 4; raw += record * 0.25) {
      const m = G.realMark(ev, raw);
      assert(m > last, ev + ' keeps rising');
      if (last) { assert(m - last < step, ev + ' each step buys less'); step = m - last; }
      last = m;
    }
    assert(G.realMark(ev, record) < record, 'matching the record in raw ability is not enough');
    assert(G.realMark(ev, record * 1.1) > record, 'a big enough edge breaks it');
  }
  assert(G.realMark('jav', 260) > 150 && G.realMark('jav', 120) < 115, '150 m javelin is a very long way off');
});

test('Legends earn stars without end: each lifts the ceiling past 100 and costs more', () => {
  const s = G.newGame(2);
  const a = s.roster[0];
  a.rank = 4; a.potential = 100; a.level = 60; s.money = 1e7;
  const caps = [], costs = [];
  for (let n = 0; n < 5; n++) { caps.push(G.capOf(a)); costs.push(G.promoteCost(a)); assert(G.promote(s, a.id)); }
  assert.equal(a.stars, 5);
  assert.equal(G.rankName(a), 'Legend ★5');
  assert(G.capOf(a) > 100 && caps.every((c, n) => n === 0 || c > caps[n - 1]));
  assert(costs.every((c, n) => n === 0 || c > costs[n - 1]));
  a.level = G.starLevel(a) - 1;
  assert.match(G.promoteProblem(s, a), /Needs level/);
});

test('buildings keep levelling past 3 at a rising price; squad-size and discount buildings stop at 3', () => {
  const s = G.newGame(4);
  s.money = 1e7;
  const gym = s.plots.findIndex((p) => p?.type === 'gym');
  const prices = [];
  while (s.plots[gym].level < 7) { prices.push(G.upgradeCost('gym', s.plots[gym].level)); assert(G.upgrade(s, gym)); }
  assert(prices.every((c, n) => n === 0 || c > prices[n - 1]));
  s.plots[8] = { type: 'dorm', level: 3 };
  assert(!G.upgrade(s, 8));
  const a = s.roster.find((x) => x.event === 'shot');
  assert(G.trainingGains(s, a, 'power')[0] > 0);
});

test('coached sessions keep earning star levels after the named five', () => {
  const s = G.newGame(6);
  s.coaching.drills = { lifting: 25 };
  assert.equal(G.drillLevel(s, 'lifting'), 5);
  s.coaching.drills.lifting = 40;
  assert.equal(G.drillLevel(s, 'lifting'), 6);
  assert.match(G.drillName(s, 'lifting'), /★1$/);
  s.coaching.drills.lifting = 40 + 15 * 10;
  assert.equal(G.drillLevel(s, 'lifting'), 16);
});

test('World Championship rivals throw world-class marks but not world records', () => {
  const s = G.newGame(13);
  for (const c of G.makeClubs(s, 4, 2)) for (const a of c.athletes) assert(G.forecast(s, a, a.event, { club: false }) < EVENTS[a.event].record);
});

test('a world record is kept, rewarded and becomes the next target', () => {
  const s = G.newGame(7);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 0 }));
  s.day = s.matchDay;
  for (const a of s.roster) { a.stats = [100, 100, 100, 100]; for (const ev of EVENT_IDS) a.mastery[ev] = 100; a.buff = 1.6; }
  const money = s.money;
  assert(G.startMatch(s));
  assert(G.simulateMatch(s));
  const broken = s.match.rewards.worldRecords;
  assert(broken.length > 0);
  for (const w of broken) assert(w.mark > EVENTS[w.event].record && G.worldRecord(s, w.event) >= w.mark);
  assert(s.money >= money + 2500);
  assert(s.goals.includes('worldrecord'));
});

test('rival strength rises smoothly through every stage of the circuit', () => {
  const ratings = [];
  for (let tier = 0; tier < 5; tier++) for (let stage = 0; stage < 3; stage++) {
    const s = G.newGame(11);
    const clubs = G.makeClubs(s, tier, stage);
    const specialists = clubs.flatMap((c) => c.athletes.slice(0, 4));
    ratings.push(specialists.reduce((n, a) => n + G.eventRating(a, a.event), 0) / specialists.length);
  }
  for (let i = 1; i < ratings.length; i++) assert(ratings[i] >= ratings[i - 1] - 1, 'stage ' + i + ' is not easier than the one before');
  assert(ratings[2] - ratings[0] > 20, 'Community has a real climb from Open to Championship');
  assert(ratings[5] - ratings[3] > 8, 'so does Regional');
});

test('auto-pick enters a deep squad three deep in every event', () => {
  const s = G.newGame(5);
  for (let i = 0; i < 4; i++) s.roster.push(G.createAthlete(s, EVENT_IDS[i], {}));
  assert(G.autoLineup(s));
  for (const ev of EVENT_IDS) assert.equal(G.entriesOf(s, ev).length, 3);
  assert.equal(G.lineupProblem(s), null);
});

test('café and merch takings are capped by what the counters can serve', () => {
  const s = G.newGame(3);
  const small = G.counterTakings(s, 'cafe', 1, 20), crowd = G.counterTakings(s, 'cafe', 1, 2000);
  assert(crowd > small);
  assert.equal(crowd, G.counterTakings(s, 'cafe', 1, 5000), 'a full counter earns no more');
  assert(G.counterTakings(s, 'cafe', 3, 5000) > crowd, 'upgrading raises capacity');
  assert(G.counterTakings(s, 'shop', 3, 5000) < 600);
});

test('buildings and stadium upgrades cost upkeep, paid on payday', () => {
  const s = G.newGame(4);
  const before = G.upkeep(s);
  s.money = 5000;
  assert(G.upgradeStadium(s, 'discus'));
  assert(G.upkeep(s) > before);
  assert.equal(G.weeklyNet(s), G.weeklyIncome(s) + G.weeklyTakings(s) - G.wages(s) - G.upkeep(s));
  s.stadium.stands = STADIUM.stands.max;
  assert(G.upkeep(s) > 400, 'an Olympic stadium is expensive to run');
});

test('higher leagues charge entry, refunded on cancel; County and duels stay free', () => {
  const s = G.newGame(9);
  s.league = 1;
  for (let st = 0; st < 3; st++) s.circuit.cleared.push('0:' + st);
  assert.equal(G.entryFee('league', 0), 0);
  assert.equal(G.entryFee('duel', 4), 0);
  s.money = LEAGUES[1].entry - 1;
  assert.match(G.entryProblem(s, 'league', 1, 0), /Entry costs/);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 1, rival: 0 }), 'a broke club can still book a duel');
  assert(G.cancelCompetition(s));
  s.money = 1000;
  assert(G.enterCompetition(s, { kind: 'league', tier: 1, stage: 0 }));
  assert.equal(s.money, 1000 - LEAGUES[1].entry);
  assert(G.cancelCompetition(s));
  assert.equal(s.money, 1000);
});

test('older saves lift their saved rivals onto the new curve once', async () => {
  const { validateCampaign } = await import('../src/domain/campaign-save.js');
  const s = G.newGame(21);
  delete s.balance;
  for (const a of s.clubs[0].athletes) { a.stats = a.stats.map((v) => v - 10); a.gear.charm = 'medal'; }
  const weak = s.clubs[0].athletes[0].stats[0];
  const out = validateCampaign(JSON.parse(JSON.stringify(s)));
  assert.equal(out.balance, 2);
  assert(out.clubs[0].athletes[0].stats[0] > weak + 5);
  assert(out.clubs[0].athletes.every((a) => a.gear.charm !== 'medal'));
  const again = validateCampaign(JSON.parse(JSON.stringify(out)));
  assert.deepEqual(again.clubs[0].athletes[0].stats, out.clubs[0].athletes[0].stats, 'runs only once');
});

test('research buildings produce Coaching Insights every day, fractions carried over', () => {
  const s = G.newGame(3);
  const before = G.insightRate(s);
  s.plots[8] = { type: 'library', level: 2 };
  assert.equal(Math.round((G.insightRate(s) - before) * 100), 100, 'two library levels add a whole Insight a day');
  s.plots[11] = { type: 'institute', level: 1 };
  const withInstitute = G.insightRate(s);
  assert(withInstitute >= before + 2.5);
  s.coaching.spare = 0;
  const start = s.coaching.insights;
  let earned = 0;
  for (let d = 0; d < 10; d++) earned += G.practiceInsights(s, false);
  assert.equal(s.coaching.insights - start, earned);
  assert(Math.abs(earned + s.coaching.spare - withInstitute * 10) < 1e-6, 'nothing is lost to rounding');
});

test('daily plans lean on facilities: a plan with nowhere to train gains far less', () => {
  const s = G.newGame(8);
  const a = s.roster.find((x) => x.event === 'discus');
  a.trainingEvent = 'discus';
  s.stadium.discus = 0;
  const bare = G.trainingGains(s, a, 'technique')[1];
  s.stadium.discus = 3;
  const built = G.trainingGains(s, a, 'technique')[1];
  assert(built > bare * 3.5, 'a competition cage is worth several times an empty field');
});
