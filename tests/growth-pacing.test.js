import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/domain/game.js";
import { RANKS } from "../src/game-content.js";

test("each rank has an absolute training limit, so only a Legend reaches 100", () => {
  const s = G.newGame(3), a = s.roster[0];
  a.potential = 100;
  const caps = RANKS.map((_, rank) => G.rankCap(a, rank));
  assert.deepEqual(caps, RANKS.map((r) => r.limit));
  assert.equal(caps.at(-1), 100);
  assert(caps.slice(0, -1).every((c) => c < 100));
  // A low-potential athlete is still held by potential, not the limit.
  a.potential = 55;
  assert.equal(G.rankCap(a, 2), Math.min(RANKS[2].limit, 55 + RANKS[2].cap));
  // Legend stars still lift the ceiling past 100.
  a.potential = 100; a.rank = 4; a.stars = 2;
  assert.equal(G.capOf(a), 100 + 2 * G.STAR_CAP);
});

test("a stat above the current ceiling is never lowered by a raise", () => {
  const s = G.newGame(4), a = s.roster[0];
  a.rank = 0; a.potential = 100;
  a.stats = [95, 40, 40, 40];
  G.raiseStat(a, 0, 2);
  assert.equal(a.stats[0], 95);
  G.raiseStat(a, 1, 2);
  assert.equal(a.stats[1], 42);
  G.raiseStat(a, 2, 500);
  assert.equal(a.stats[2], G.capOf(a));
});

test("the mastery ceiling keeps pace with the ladder, reaching 100 only after many meets", () => {
  const s = G.newGame(5), a = s.roster[0], ev = a.event;
  // About four meets a division: through National Division 3 (eight divisions) the ceiling stays
  // far from 100, and rival mastery at that stage (G.rivalMastery) is in the same range.
  a.eventMeets[ev] = 32;
  assert(G.masteryCap(a, ev) < 80);
  assert(Math.abs(G.masteryCap(a, ev) - G.rivalMastery(2, 1)) < 15);
  a.eventMeets[ev] = 52;
  assert.equal(G.masteryCap(a, ev), 100);
});

test("mastery earned under the old, faster ceiling is kept", () => {
  const s = G.newGame(6), a = s.roster[0], ev = a.event;
  a.eventMeets[ev] = 14; a.mastery[ev] = 100;
  G.competeMastery(a, ev, 3);
  assert.equal(a.mastery[ev], 100);
  G.practiceMastery(a, 5, ev);
  assert.equal(a.mastery[ev], 100);
});
