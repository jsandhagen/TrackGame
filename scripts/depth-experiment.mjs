// Can a deeper squad win a championship final? Plays scripted careers to a division's final, then
// replays that final many times with the squad as it is and rebuilt as three specialists an event,
// filling the gaps with seasoned signings (Epics, optionally one Legend).
// Run: node scripts/depth-experiment.mjs [division=9] [seeds=4] [replays=200]
import * as G from "../src/domain/game.js";
import { EVENT_IDS } from "../src/game-content.js";
import { engaged, book } from "./balance-audit.mjs";

const [division = 9, seeds = 4, replays = 200] = process.argv.slice(2).map(Number);
const clone = (s) => structuredClone(s);

function reachFinal(seed) {
  const s = G.newGame(seed);
  for (let season = 1; season <= 40; season++) {
    if (s.phase === "planning") book(s);
    const n = s.competition.tier * 3 + s.competition.stage;
    for (let guard = 0; guard < 400 && s.phase === "season"; guard++) {
      if (s.pendingEvent) { G.resolveEvent(s, Math.max(0, G.eventView(s).choices.findIndex((c) => c.ok))); continue; }
      engaged(s);
      if (s.day < s.matchDay) { G.advanceDay(s); continue; }
      if (G.lineupProblem(s)) { if (!G.medicalDay(s)) G.autoLineup(s); continue; }
      if (s.fixture === 3 && n === division) return s;
      if (!G.startMatch(s)) break;
      G.simulateMatch(s);
      G.leaveMatch(s);
    }
    G.nextSeason(s);
  }
  return null;
}
// Three specialists an event: keep the club's own qualified athletes who are at least Epic standard, and
// sign seasoned athletes for the rest (the first of them a Legend, when asked).
function deepen(s, rarities) {
  const d = G.DIVISIONS[division], keep = [], fresh = [];
  for (const ev of EVENT_IDS) {
    // Keep a club athlete only if they are qualified and at least as good as an Epic signing.
    const own = s.roster.filter((a) => a.event === ev && G.championshipQualified(s, a.id, ev) && G.forecast(s, a, ev) >= G.signingMark(d, "epic", ev))
      .sort((a, b) => G.overall(b) - G.overall(a)).slice(0, 3);
    keep.push(...own);
    for (let i = own.length; i < 3; i++) {
      const a = G.seasonSigning(s, G.createAthlete(s, ev, { rarity: rarities.shift() || "epic" }), d);
      a.gear = G.divisionKit(d.tier, ev); // kitted out from the shop, as rivals are
      // As if they had thrown their usual mark in the league duels: qualified when that meets the standard.
      (s.competition.qualifyingMarks[a.id] ??= {})[ev] = G.forecast(s, a, ev);
      fresh.push(a);
    }
  }
  s.roster = [...keep, ...fresh];
  return fresh.length;
}
function winRate(s) {
  let wins = 0, points = 0;
  for (let r = 0; r < replays; r++) {
    const t = clone(s);
    t.rng = (Math.imul(r + 1, 2654435761) ^ 0x5bd1e995) >>> 0;
    G.autoLineup(t);
    if (!G.startMatch(t)) continue;
    G.simulateMatch(t);
    wins += G.meetOutcome(t.match) > 0 ? 1 : 0;
    points += t.match.teamScores.find((x) => x.id === "us").points;
  }
  return { win: Math.round((100 * wins) / replays) + "%", points: (points / replays).toFixed(1) };
}
console.log(`${G.DIVISIONS[division].name} final, ${replays} replays per squad`);
for (let seed = 1; seed <= seeds; seed++) {
  const s = reachFinal(seed);
  if (!s) { console.log("seed", seed, "never reached the final"); continue; }
  const rows = { "as played": winRate(s) };
  const epics = clone(s), signed = deepen(epics, []);
  rows[`+${signed} Epics`] = winRate(epics);
  const legend = clone(s), n = deepen(legend, ["legend"]);
  rows[`+1 Legend, ${n - 1} Epics`] = winRate(legend);
  console.log(`seed ${seed} (season ${s.season}, squad ${s.roster.length}):`, Object.entries(rows).map(([k, v]) => `${k} ${v.win} (${v.points} pts)`).join(" · "));
}
