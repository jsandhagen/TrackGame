import test from "node:test";
import assert from "node:assert/strict";
import * as G from "./helpers/developed-club.js";
import { validateCampaign } from "../src/domain/campaign-save.js";

const sum = (s, cur) => s.ledger.days.reduce((n, d) => n + Object.values(d[cur]).reduce((a, b) => a + b, 0), 0);
function season(s) {
  for (let meets = 0; meets < 4 && s.phase !== "seasonEnd"; meets++) {
    if (s.phase === "planning") assert(G.enterCompetition(s, G.nextCircuitEntry(s)));
    for (let guard = 0; s.day < s.matchDay && guard < 40; guard++) {
      if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
      else assert(G.advanceDay(s).ok);
    }
    if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
    assert(G.startMatch(s));
    assert(G.simulateMatch(s));
    G.settleMatch(s);
    G.leaveMatch(s);
  }
}

test("the ledger books every change to money, fans and Insights by what caused it", () => {
  const s = G.newGame(81);
  s.money = 4000;
  G.reconcileLedger(s);
  const start = { money: s.money, fans: s.fans, insights: s.coaching.insights };
  const i = G.unlockedPlots(s).find((k) => !s.plots[k]);
  assert(G.build(s, i, "cafe"));
  season(s);
  G.reconcileLedger(s);
  const days = s.ledger.days.length;
  assert(days > 7 && days <= G.LEDGER_DAYS);
  const cats = (cur) => new Set(s.ledger.days.flatMap((d) => Object.keys(d[cur])));
  for (const c of ["Meet prizes", "Wages", "Sponsor", "Canteen Café sales"]) assert(cats("money").has(c), c);
  assert(cats("fans").has("Meets"));
  assert(cats("insights").has("Meet reviews") || cats("insights").has("Training practice"));
  assert(!cats("money").has("Other"), "every money change has a named source: " + [...cats("money")]);
  // Within the window the books add up to the balance change (the window may have dropped
  // older days, so compare only when it still covers the whole run).
  if (s.ledger.days[0].day <= 2) {
    assert.equal(sum(s, "money"), s.money - start.money);
    assert.equal(sum(s, "fans"), s.fans - start.fans);
    assert.equal(sum(s, "insights"), s.coaching.insights - start.insights);
  }
  const back = validateCampaign(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.ledger, s.ledger, "the ledger saves with the club");
});

test("a change made without a booking is caught as Other, so the books always balance", () => {
  const s = G.newGame(82);
  G.reconcileLedger(s);
  s.money += 123;
  G.reconcileLedger(s);
  assert.equal(s.ledger.days.at(-1).money.Other, 123);
  assert.equal(s.ledger.seen.money, s.money);
});
