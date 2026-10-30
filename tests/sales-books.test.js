import test from "node:test";
import assert from "node:assert/strict";
import * as G from "./helpers/developed-club.js";
import { validateCampaign } from "../src/domain/campaign-save.js";

const withCafe = (seed) => {
  const s = G.newGame(seed);
  s.money = 5000;
  const i = G.unlockedPlots(s).find((k) => !s.plots[k]);
  assert(G.build(s, i, "cafe"));
  return { s, i };
};

test("a sales building keeps its books: takings, upkeep and what it cost", () => {
  const { s, i } = withCafe(31);
  const before = s.money;
  const start = s.day;
  for (let d = 0; d < 14; d++) G.advanceDay(s);
  const p = s.plots[i], r = G.salesReport(s, i),
    paydays = Array.from({ length: s.day - start }, (_, k) => start + 1 + k).filter((d) => d % 7 === 0).length;
  assert.equal(p.days.length, 7, "a rolling week of daily takings");
  assert(p.earned > 0, "takings booked");
  assert(paydays >= 1 && p.upkeepPaid === paydays * G.upkeepOf("cafe", 1), "each payday's upkeep booked");
  assert.equal(r.spent, 300);
  assert.equal(r.net, p.earned - p.upkeepPaid - 300);
  assert.equal(r.weekly, r.sales + r.staff - r.upkeep);
  assert(r.paidBack > 0 && r.paidBack < 1);
  assert(r.next && r.next.cost === G.upgradeCost("cafe", 1));
  assert(before > 0);
});

test("upgrades add to the cost, older buildings get an estimate, and the books survive moves and saves", () => {
  const { s, i } = withCafe(32);
  G.upgrade(s, i);
  assert.equal(s.plots[i].spent, 300 + G.upgradeCost("cafe", 1));
  const old = { type: "shop", level: 3 };
  assert.equal(G.spentOn(old.type, old.level), 380 + G.upgradeCost("shop", 1) + G.upgradeCost("shop", 2));
  for (let d = 0; d < 3; d++) G.advanceDay(s);
  const to = G.unlockedPlots(s).find((k) => !s.plots[k] && k !== i);
  const earned = s.plots[i].earned;
  assert(G.moveFacility(s, i, to));
  assert.equal(s.plots[to].earned, earned, "the books move with the building");
  const back = validateCampaign(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.plots[to].days, s.plots[to].days);
  assert.equal(G.salesReport(s, to).spent, s.plots[to].spent);
  assert.equal(G.salesReport(s, s.plots.findIndex((p) => p?.type === "club")), null, "only sales buildings report");
});

test("the books say whether visitors or the counter limit today's trade", () => {
  const { s, i } = withCafe(33);
  s.fans = 0;
  assert.equal(G.salesReport(s, i).today.full, false);
  s.fans = 200000;
  const r = G.salesReport(s, i);
  assert.equal(r.today.full, true);
  assert(r.next.gain > 0, "a full counter makes the upgrade worth something");
});
