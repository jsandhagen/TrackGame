import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import { EVENTS, EVENT_IDS, LEAGUES, STADIUM } from '../src/game-content.js';

test('distances approach each world record but never pass it', () => {
  for (const ev of EVENT_IDS) {
    const { record } = EVENTS[ev];
    assert.equal(G.realMark(ev, record * 0.8), record * 0.8, 'ordinary marks are untouched');
    let last = 0;
    for (const raw of [record * 0.95, record, record * 1.1, record * 1.3, record * 3]) {
      const m = G.realMark(ev, raw);
      assert(m < record && m > last, ev + ' stays below the record and keeps rising');
      last = m;
    }
  }
});

test('a maxed athlete with every bonus stays below the world record in a meet', () => {
  const s = G.newGame(7);
  const a = s.roster[0];
  a.stats = [100, 100, 100, 100];
  for (const ev of EVENT_IDS) a.mastery[ev] = 100;
  a.buff = 1.3;
  for (const ev of EVENT_IDS) assert(G.forecast(s, a, ev) < EVENTS[ev].record);
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
  assert(ratings[5] - ratings[3] > 8, 'so does County');
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

test('higher leagues charge entry, refunded on cancel; Community and duels stay free', () => {
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
