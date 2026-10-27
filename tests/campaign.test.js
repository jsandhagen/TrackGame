import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/domain/game.js";
import { EVENT_IDS, LEAGUES } from "../src/game-content.js";
import {
  validateCampaign,
  exportCampaign,
} from "../src/domain/campaign-save.js";
function prepare(s) {
  while (s.day < s.matchDay) assert(G.advanceDay(s).ok);
}
function finish(s, quality = "good") {
  assert(G.startMatch(s));
  for (let i = 0; i < 50 && s.match.phase !== "complete"; i++) {
    const m = s.match;
    if (["intro", "planning"].includes(m.phase)) G.beginAttempt(s);
    if (m.phase === "timing") G.resolveThrow(s, quality);
    if (m.phase === "result") G.nextAttempt(s);
  }
  assert.equal(s.match.phase, "complete");
}
test("four-event meet awards club results once, resumes safely and preserves roster", () => {
  const s = G.newGame(72);
  prepare(s);
  finish(s);
  const money = s.money,
    xp = s.roster[0].xp;
  G.settleMatch(s);
  assert.equal(s.money, money);
  assert.equal(s.roster[0].xp, xp);
  assert.equal(s.results.length, 1);
  assert(G.eventScores(s.match).every((e) => e.done));
  const restored = validateCampaign(exportCampaign(s));
  assert.equal(restored.match.phase, "complete");
  assert.equal(restored.money, s.money);
  G.leaveMatch(s);
  assert.equal(s.fixture, 1);
  assert.equal(s.matchDay, s.day + 7);
  assert.equal(s.roster.length, 4);
});
test("a full campaign can promote through all five leagues and repeat the world league", () => {
  const s = G.newGame(123);
  s.roster.forEach((a) => (a.stats = [95, 95, 95, 95]));
  for (let league = 0; league < 5; league++) {
    for (let i = 0; i < 4; i++) {
      prepare(s);
      finish(s, "perfect");
      G.leaveMatch(s);
    }
    assert.equal(s.phase, "seasonEnd");
    assert(s.champion);
    assert.equal(s.trophies.length, league + 1);
    const rosterIds = s.roster.map((a) => a.id);
    assert(G.nextSeason(s));
    assert.deepEqual(
      s.roster.map((a) => a.id),
      rosterIds,
    );
    assert.equal(s.league, Math.min(league + 1, 4));
    assert.equal(s.results.length, 0);
  }
  assert.equal(s.league, 4);
  assert.equal(s.season, 6);
});
test("a losing season is repeatable without losing club progress", () => {
  const s = G.newGame(8);
  s.roster.forEach((a) => (a.stats = [1, 1, 1, 1]));
  for (let i = 0; i < 3; i++) {
    prepare(s);
    finish(s);
    G.leaveMatch(s);
  }
  assert.equal(s.phase, "seasonEnd");
  assert.equal(s.champion, false);
  const plots = structuredClone(s.plots),
    money = s.money;
  assert(G.nextSeason(s));
  assert.equal(s.league, 0);
  assert.deepEqual(s.plots, plots);
  assert(s.money >= money);
});
test("lineups cap double duty, unavailable athletes can recover, and placement respects budget", () => {
  const s = G.newGame(9),
    a = s.roster[0];
  assert(G.assign(s, "discus", a.id));
  assert(!G.assign(s, "hammer", a.id));
  const before = s.money;
  assert(G.build(s, 4, "recovery"));
  assert.equal(s.money, before - 340);
  assert(!G.build(s, 4, "garden"));
  assert(!G.build(s, 5, "analysis"));
  assert(G.moveFacility(s, 4, 3));
  assert.equal(s.plots[3].type, "recovery");
  assert(!G.moveFacility(s, 0, 4));
  prepare(s);
  a.injury = 2;
  assert(!G.startMatch(s));
  assert(G.medicalDay(s));
  assert(G.medicalDay(s));
  assert.equal(a.injury, 0);
  assert(G.startMatch(s));
});
test("throw settlement, timing resume, career and sponsor contract are persisted", () => {
  const s = G.newGame(12);
  prepare(s);
  G.startMatch(s);
  G.beginAttempt(s);
  const resumed = validateCampaign(exportCampaign(s));
  assert.equal(resumed.match.phase, "planning");
  const m = s.match;
  assert(G.resolveThrow(s));
  assert.equal(G.resolveThrow(s), null);
  assert.equal(m.homeMarks[0].length, 1);
  assert(s.sponsorLocked);
});
test("moving facilities discovers distinct, active adjacency effects", () => {
  const s = G.newGame(7);
  assert(s.discovered.includes("power"));
  assert(G.combos(s).some((c) => c.key === "power"));
  G.moveFacility(s, 2, 8);
  assert(!G.combos(s).some((c) => c.key === "power"));
  assert(s.discovered.includes("power"));
  const a = s.roster[0];
  s.money = 1000;
  assert(G.buyKit(s, a.id, "control"));
  const cost = s.money;
  assert(G.buyKit(s, a.id, "control"));
  assert.equal(s.money, cost);
  assert(G.kitEffects(a).foul < 1);
});
