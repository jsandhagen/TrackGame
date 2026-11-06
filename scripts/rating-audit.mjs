// How strong the player's squad is when it enters each division, against the rivals it meets
// and the world record. Run: node scripts/rating-audit.mjs <engaged|managed|shopper> [seeds=6] [seasons=40] [first seed=1]
import * as G from "../src/domain/game.js";
import { EVENT_IDS, EVENTS } from "../src/game-content.js";
import { engaged, fullyManaged, book } from "./balance-audit.mjs";

// A coach who also spends spare money on stat consumables for the meet squad.
function shopper(s) {
  engaged(s);
  const reserve = G.entryFee("league", G.nextCircuitEntry(s).tier) + G.wages(s) + G.upkeep(s) + 300;
  const items = ["shake", "manual", "ladder", "puzzle"];
  for (let guard = 0; guard < 200; guard++) {
    let best = null;
    for (const a of s.roster) for (const [i, id] of items.entries()) {
      if (G.itemProblem(s, id, a.id) || !G.shopStock(s).includes(id)) continue;
      const value = EVENTS[a.event].weights[i] / G.itemPrice(s, id);
      if (!best || value > best.value) best = { a, id, value };
    }
    if (!best || s.money - G.itemPrice(s, best.id) < reserve || !G.buyItem(s, best.id)) break;
    G.useItem(s, best.id, best.a.id);
  }
}
const POLICIES = { engaged, managed: fullyManaged, shopper };
const [name = "engaged", seedArg = "6", seasonArg = "40", firstArg = "1"] = process.argv.slice(2);
const policy = POLICIES[name], seeds = +seedArg, seasons = +seasonArg;
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[(a.length - 1) >> 1] : NaN);
const rows = Array.from({ length: 15 }, () => ({ day: [], top: [], third: [], elite: [], rival: [], rec: [], stat: [], mast: [], level: [], rank: [], cap: [], rivalOvr: [], seasons: [], fixtures: [0, 0], finals: [0, 0] }))
const titles = [];;
for (let seed = +firstArg; seed < +firstArg + seeds; seed++) {
  const s = G.newGame(seed), seen = new Set(), per = Array(15).fill(0);
  let title = null;
  for (let season = 1; season <= seasons && title == null; season++) {
    if (s.phase === "planning") book(s);
    const n = s.competition.tier * 3 + s.competition.stage;
    if (s.competition.kind === "league") per[n]++;
    if (s.competition.kind === "league" && !seen.has(n)) {
      seen.add(n);
      const r = rows[n], ovr = s.roster.map(G.overall).sort((a, b) => b - a);
      r.day.push(s.day); r.top.push(ovr[0]); r.third.push(ovr[2] ?? 0); r.elite.push(ovr.filter((v) => v >= 90).length);
      const rivals = s.clubs.flatMap((c) => c.athletes).map((a) => G.forecast(s, a, a.event, { club: false }) / EVENTS[a.event].record);
      r.rival.push(Math.max(...rivals));
      const best = [...s.roster].sort((a, b) => G.overall(b) - G.overall(a))[0];
      r.stat.push(best.stats.reduce((v, x, i) => v + x * EVENTS[best.event].weights[i], 0)); r.mast.push(G.masteryOf(best, best.event));
      r.level.push(best.level); r.rank.push(best.rank); r.cap.push(G.capOf(best));
      r.rivalOvr.push(Math.max(...s.clubs.flatMap((c) => c.athletes).map(G.overall)));
      r.rec.push(Math.max(...s.roster.map((a) => G.forecast(s, a, a.event) / EVENTS[a.event].record)));
    }
    for (let guard = 0; guard < 400 && s.phase === "season"; guard++) {
      if (s.pendingEvent) { G.resolveEvent(s, Math.max(0, G.eventView(s).choices.findIndex((c) => c.ok))); continue; }
      policy(s);
      if (s.day < s.matchDay) { G.advanceDay(s); continue; }
      if (G.lineupProblem(s)) { if (!G.medicalDay(s)) G.autoLineup(s); continue; }
      const tally = s.fixture === 3 ? rows[n].finals : rows[n].fixtures;
      if (!G.startMatch(s)) break;
      G.simulateMatch(s);
      tally[0] += G.meetOutcome(s.match) > 0 ? 1 : 0; tally[1]++;
      G.leaveMatch(s);
    }
    if (s.champion && n === 14) title = season;
    G.nextSeason(s);
  }
  per.forEach((v, i) => v && rows[i].seasons.push(v));
  titles.push(title ?? Infinity);
}
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "-");
const rate = ([w, n]) => (n ? Math.round((100 * w) / n) + "%" : "-");
console.log("Marks are forecasts as % of the world record; OVR medians over careers on entering each division.");
console.log("division                    day seasons fixt final  best OVR 3rd OVR OVR90+  rival OVR  rival %WR  club %WR  stat mast lvl rank cap");
rows.forEach((r, n) => r.day.length && console.log(
  G.DIVISIONS[n].name.padEnd(27), String(median(r.day)).padStart(4), avg(r.seasons).padStart(7), rate(r.fixtures).padStart(5), rate(r.finals).padStart(5),
  String(median(r.top)).padStart(9), String(median(r.third)).padStart(7), String(median(r.elite)).padStart(6), String(median(r.rivalOvr)).padStart(10),
  (100 * median(r.rival)).toFixed(1).padStart(10), (100 * median(r.rec)).toFixed(1).padStart(9),
  median(r.stat).toFixed(0).padStart(5), median(r.mast).toFixed(0).padStart(4), String(median(r.level)).padStart(3), String(median(r.rank)).padStart(4), String(median(r.cap)).padStart(4)));
console.log("first Diamond title, season:", titles.map((t) => (t === Infinity ? "-" : t)).join(", "), "· median", median(titles));
