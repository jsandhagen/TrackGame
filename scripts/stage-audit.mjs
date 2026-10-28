// Seasons needed to clear each of the fifteen circuit stages, with fixture and final win rates.
// Run: node scripts/stage-audit.mjs engaged 10 40   (policy: idle | engaged | managed, seeds, season cap)
// A consistent curve shows every stage cleared in roughly one to two seasons by the engaged bot.
import * as G from "../src/domain/game.js";
import { engaged, fullyManaged, book } from "./balance-audit.mjs";

const POLICIES = { idle: (s) => G.autoLineup(s), engaged, managed: fullyManaged };
const [name = "engaged", seedArg = "10", seasonArg = "40"] = process.argv.slice(2);
const policy = POLICIES[name], seeds = +seedArg, seasons = +seasonArg;
if (!policy) throw Error("Unknown policy " + name);

const spent = Array.from({ length: 15 }, () => []),
  wins = Array.from({ length: 15 }, () => ({ fixtures: [0, 0], finals: [0, 0] })),
  titles = [],
  bank = {};
for (let seed = 1; seed <= seeds; seed++) {
  const s = G.newGame(seed),
    per = Array(15).fill(0);
  let title = null;
  for (let season = 1; season <= seasons && title == null; season++) {
    if (s.phase === "planning") book(s);
    const n = s.competition.tier * 3 + s.competition.stage;
    if (s.competition.kind === "league") per[n]++;
    for (let guard = 0; guard < 400 && s.phase === "season"; guard++) {
      if (s.pendingEvent) {
        G.resolveEvent(s, Math.max(0, G.eventView(s).choices.findIndex((c) => c.ok)));
        continue;
      }
      policy(s);
      if (s.day < s.matchDay) {
        G.advanceDay(s);
        continue;
      }
      if (G.lineupProblem(s)) {
        if (!G.medicalDay(s)) G.autoLineup(s);
        continue;
      }
      const tally = s.fixture === 3 ? wins[n].finals : wins[n].fixtures;
      if (!G.startMatch(s)) break;
      G.simulateMatch(s);
      tally[0] += G.meetOutcome(s.match) > 0 ? 1 : 0;
      tally[1]++;
      G.leaveMatch(s);
    }
    (bank[season] ??= []).push(s.money);
    if (s.champion && n === 14) title = season;
    G.nextSeason(s);
  }
  per.forEach((v, i) => v && spent[i].push(v));
  titles.push(title ?? Infinity);
}
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "-");
const rate = ([w, n]) => (n ? (w / n).toFixed(2) : "-");
const median = (a) => [...a].sort((x, y) => x - y)[(a.length - 1) >> 1];
const TIERS = ["Community", "County", "Regional", "National", "World"];
console.log("stage                   clubs seasons fixtures finals");
for (let n = 0; n < 15; n++)
  if (spent[n].length) console.log((TIERS[n / 3 | 0] + " " + G.CIRCUIT_STAGES[n % 3]).padEnd(24), String(spent[n].length).padStart(4), avg(spent[n]).padStart(7), rate(wins[n].fixtures).padStart(8), rate(wins[n].finals).padStart(6));
console.log("first World Championship:", titles.map((t) => (t === Infinity ? "-" : t)).join(", "), "· median", median(titles));
console.log("median bank by season:", Object.entries(bank).filter(([k]) => k % 3 === 1).map(([k, v]) => k + ": $" + median(v)).join(" · "));
