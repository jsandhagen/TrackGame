import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/domain/game.js";
import { EVENT_IDS } from "../src/game-content.js";

// Head-to-head duel between identical squads using a fixed home policy.
function duel(seed, policy) {
  const s = G.newGame(seed);
  G.enterCompetition(s, { kind: "duel", tier: 0 });
  s.day = s.matchDay;
  s.settings.meetMode = "coach";
  for (const a of [...s.roster, ...s.clubs[0].athletes]) Object.assign(a, { stats: [45, 45, 45, 45], condition: 50, stamina: 100, background: "bloomer", skills: [], equipped: [], gear: { implement: null, shoes: null, charm: null }, potential: 100 });
  for (const [i, ev] of EVENT_IDS.entries()) s.clubs[0].athletes[i].event = ev;
  s.roster.forEach((a, i) => (a.event = EVENT_IDS[i]));
  G.startMatch(s);
  for (const r of s.clubs[0].athletes) r.condition = 50;
  for (let guard = 0; guard < 200 && s.match.phase !== "complete"; guard++) {
    if (s.match.phase === "decide") {
      const tactic = policy === "smart" ? G.autoTactic(s, "home") : policy;
      G.decideThrow(s, tactic);
    } else G.advanceMatch(s);
  }
  return Math.sign(s.match.score - s.match.against);
}
function rate(policy, n = 400) {
  let w = 0,
    l = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = duel(seed, policy);
    if (r > 0) w++;
    if (r < 0) l++;
  }
  return { win: w / n, loss: l / n };
}

test("no single approach dominates equal squads; reading the situation beats blind policies", () => {
  const attack = rate("attack"),
    safe = rate("safe"),
    balanced = rate("balanced"),
    smart = rate("smart");
  assert(attack.win < 0.62, "all out " + JSON.stringify(attack));
  assert(safe.win < 0.35, "safe " + JSON.stringify(safe));
  assert(balanced.win > 0.2 && balanced.win < 0.6, "controlled " + JSON.stringify(balanced));
  assert(smart.win >= Math.max(attack.win, balanced.win) - 0.05, "smart " + JSON.stringify(smart));
});

test("condition and stamina make a visible difference to the projected mark", () => {
  const s = G.newGame(2),
    a = s.roster[0];
  a.condition = 95;
  const great = G.forecast(s, a, a.event);
  a.condition = 5;
  const awful = G.forecast(s, a, a.event);
  assert(great / awful > 1.08);
  a.condition = 50;
  a.stamina = 100;
  const fresh = G.forecast(s, a, a.event);
  a.stamina = 0;
  assert(fresh / G.forecast(s, a, a.event) > 1.07);
});

test("levelling grants skill points; caps stop growth until a rank-up raises them", () => {
  const s = G.newGame(3),
    a = s.roster[0];
  const sp = a.sp;
  G.grantXp(s, a, 1000);
  assert(a.level > 5);
  assert(a.sp > sp + 4);
  a.stats = a.stats.map(() => G.capOf(a));
  const gains = G.trainingGains(s, a, "power");
  assert(gains.every((g) => g === 0));
  a.level = 6;
  s.money = 1000;
  assert(G.promote(s, a.id));
  assert(G.trainingGains(s, a, "power")[0] > 0);
});

test("the grounds earn money from visitors and visitors grow with fans", () => {
  const s = G.newGame(4);
  s.money = 5000;
  assert(G.build(s, 8, "cafe"));
  const few = G.visitorsPerDay(s);
  s.fans = 2000;
  assert(G.visitorsPerDay(s) > few * 3);
  const before = s.money;
  const r = G.advanceDay(s);
  assert(r.spend.length === 1 && r.spend[0].plot === 8);
  assert(s.money > before);
});

