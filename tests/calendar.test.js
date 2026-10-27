import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';

test('the calendar starts on Monday 1 March and paydays fall on Sundays', () => {
  assert.equal(G.shortDate(1), 'Mon 1 Mar');
  assert.equal(G.longDate(15), 'Mon 1 April, Year 1');
  assert.equal(G.dateOf(7).weekday, 6);
  assert(G.isPayday(7) && !G.isPayday(8));
  assert.equal(G.dateOf(G.YEAR_DAYS + 1).year, 2);
  assert.deepEqual([1, 43, 85, 127].map(G.seasonOfDay), [0, 1, 2, 3]);
});

test('the clock runs from dawn to night across a training day', () => {
  assert.equal(G.clockLabel(0), '06:00');
  assert.equal(G.clockLabel(0.5), '14:00');
  assert.equal(G.clockLabel(1), '22:00');
  assert.equal(G.clockLabel(-1), '06:00');
  assert(G.nightness(0) > 0.5);
  assert.equal(G.nightness(0.5), 0);
  assert.equal(G.nightness(1), 1);
  assert(G.nightness(0.85) > 0 && G.nightness(0.85) < 1);
});

test('weather is a stable forecast that shapes training, visitors and meet conditions', () => {
  const s = G.newGame(11);
  const forecast = G.forecastDays(s);
  assert.equal(forecast.length, G.FORECAST_DAYS);
  assert.deepEqual(forecast.map((f) => f.weather), forecast.map((f) => G.weatherOn(s, f.day)));
  // Same seed, same skies; snow only falls in winter and heatwaves only in summer.
  const year = Array.from({ length: G.YEAR_DAYS }, (_, i) => G.weatherOn(s, i + 1));
  assert.deepEqual(year, Array.from({ length: G.YEAR_DAYS }, (_, i) => G.weatherOn(G.newGame(11), i + 1)));
  year.forEach((w, i) => {
    if (w === 'snow') assert.equal(G.seasonOfDay(i + 1), 3);
    if (w === 'heat') assert.equal(G.seasonOfDay(i + 1), 1);
  });
  assert.equal(G.weatherTrainFactor('power', 'rain'), 1.1);
  assert.equal(G.weatherTrainFactor('speed', 'rain'), 0.8);
  assert.equal(G.weatherTrainFactor('rest', 'snow'), 1);

  // Find a rainy and a sunny day for the same club and compare visitors and gains.
  const rainy = year.indexOf('rain') + 1, sunny = year.indexOf('sunny') + 1;
  const at = (day) => { const c = G.newGame(11); c.day = day; return c; };
  assert(G.visitorsPerDay(at(rainy)) < G.visitorsPerDay(at(sunny)));
  const run = (day) => {
    const c = at(day - 1), a = c.roster[0];
    a.plan = 'speed'; a.autoRest = false;
    const before = a.stats[2];
    assert(G.advanceDay(c).ok);
    return a.stats[2] - before;
  };
  assert(run(rainy) < run(sunny));

  // Meet day takes the forecast weather; windy days always blow.
  const windy = year.indexOf('windy') + 1;
  const c = at(windy);
  assert(G.enterCompetition(c, { kind: 'duel', tier: 0, rival: 0, preparation: 3 }));
  c.matchDay = c.day;
  assert(G.startMatch(c));
  assert.equal(c.match.weather, 'windy');
  assert.notEqual(c.match.wind, 'calm');
});

test('older saves gain a weather seed on load', async () => {
  const { validateCampaign } = await import('../src/domain/campaign-save.js');
  const s = G.newGame(12);
  delete s.weatherSeed;
  const loaded = validateCampaign(JSON.parse(JSON.stringify(s)));
  assert(Number.isInteger(loaded.weatherSeed));
  assert.equal(loaded.weatherSeed, validateCampaign(JSON.parse(JSON.stringify(s))).weatherSeed);
});
