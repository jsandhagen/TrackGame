import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {ATHLETE_TYPES, GROWTH, EVENT_IDS} from '../src/game-content.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

test('every athlete type grows the same total, only in different places', () => {
  for (const [key, t] of Object.entries(ATHLETE_TYPES)) {
    const total = t.growth.reduce((n, g) => n + GROWTH[g].mult, 0);
    assert(Math.abs(total - 4) < 1e-9, key + ' grows ' + total);
    for (const ev of t.fits) assert(EVENT_IDS.includes(ev));
  }
});

test('a type speeds up its fast stats and slows its slow ones in every kind of training', () => {
  const s = G.newGame(4), a = s.roster[0];
  a.stats = [30, 30, 30, 30];
  a.type = 'powerhouse';
  const strong = G.drillGains(s, a, 'sandbag'), daily = G.trainingGains(s, a, 'power');
  a.type = 'mastermind';
  const weak = G.drillGains(s, a, 'sandbag'), dailyWeak = G.trainingGains(s, a, 'power');
  assert(Math.abs(strong[0] / weak[0] - 1.3 / 0.8) < 1e-9);
  assert(Math.abs(daily[0] / dailyWeak[0] - 1.3 / 0.8) < 1e-9);
});

test('types are picked from the athlete id without touching the campaign dice', () => {
  const s = G.newGame(8), rng = s.rng;
  assert.equal(G.typeFor(41, 'jav'), G.typeFor(41, 'jav'));
  assert.equal(s.rng, rng);
  const seen = new Set(Array.from({length: 400}, (_, i) => G.typeFor(i, EVENT_IDS[i % 4])));
  assert.equal(seen.size, Object.keys(ATHLETE_TYPES).length);
  // The starting squad each has a type that suits their event.
  for (const a of G.newGame(1).roster) assert(ATHLETE_TYPES[a.type].fits.includes(a.event), a.name + ' ' + a.type);
});

test('older saves gain a type on load and a type survives a save', () => {
  const s = G.newGame(12), data = exportCampaign(s);
  const old = JSON.parse(JSON.stringify(data));
  for (const a of old.state?.roster || old.roster) delete a.type;
  const loaded = validateCampaign(old), roster = loaded.roster;
  for (const a of roster) assert.equal(a.type, G.typeFor(a.id, a.event));
  assert.deepEqual(validateCampaign(data).roster.map((a) => a.type), s.roster.map((a) => a.type));
  const bad = JSON.parse(JSON.stringify(data));
  (bad.state?.roster || bad.roster)[0].type = 'wizard';
  assert.throws(() => validateCampaign(bad));
});

test('the next stat to train is one the event needs, grows fast and has room left', () => {
  const s = G.newGame(3), a = s.roster.find((x) => x.event === 'shot');
  a.type = 'powerhouse'; a.stats = [30, 30, 30, 30];
  assert.equal(G.trainingFocus(a), 0);
  a.stats[0] = G.capOf(a);
  assert.equal(G.trainingFocus(a), 1);
});

test('the training lineup shows each athlete event, stats and growth, and which sessions suit them', () => {
  const s = G.newGame(5), a = s.roster[0];
  const html = P.train(s, {trainees: [a.id]});
  assert.match(html, /trainee-sheet/);
  assert.match(html, /class="ev-tag"/);
  assert.match(html, /class="growth g\d"/);
  assert.match(html, /sheet-stat key/);
  assert.match(html, /★ Best for/);
  assert.match(P.newcomer(s, a), new RegExp(ATHLETE_TYPES[a.type].name));
  const scout = P.recruit(s);
  for (const b of s.prospects) assert(scout.includes(ATHLETE_TYPES[b.type].name));
  assert.match(scout, /class="growth g\d"/);
});
