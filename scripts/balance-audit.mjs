// Scripted careers for pacing and economy checks. Run: AUDIT_SEEDS=40 node scripts/balance-audit.mjs
// These are bots, not people: they measure whether progress is possible and roughly paced, not fun.
import * as G from "../src/domain/game.js";
import { EVENT_IDS, EVENTS, SKILLS, RANKS, FACILITIES } from "../src/game-content.js";

const N = Number(process.env.AUDIT_SEEDS || 30),
  MAX = Number(process.env.AUDIT_SEASONS || 40);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)];
const pct = (a, q) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
const BUILD = ["sprint", "spa", "cafe", "garden", "studio", "shop", "dorm", "workshop", "scout", "lab", "stands", "fountain"];
const SKILL_PRIORITY = ["gymrat", "formfreak", "fasttwitch", "clutch", "icevein", "quickstudy", "hunter", "secondwind", "momentum", "workhorse", "bigstage", "highroller", "captain", "meteor", "cyclone", "tempest", "skyspear"];

function engaged(s) {
  const plans = ["power", "technique", "speed", "focus"];
  for (const a of s.roster) {
    const w = EVENTS[a.event].weights;
    // Train the most valuable stat that still has room.
    const scores = plans.map((p, i) => (G.capOf(a) - a.stats[i]) * w[i]);
    a.plan = plans[scores.indexOf(Math.max(...scores))];
    while (a.sp > 0) {
      const next = SKILL_PRIORITY.find((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank && (SKILLS[k].cat !== "train" || SKILLS[k].train?.[0] === plans.indexOf(a.plan) || !SKILLS[k].train));
      if (!next || !G.learnSkill(s, a.id, next)) break;
    }
    if (!G.promoteProblem(s, a) && s.money > G.promoteCost(a) + 300) G.promote(s, a.id);
    if (a.stamina < 35 && s.bag.drink) G.useItem(s, "drink", a.id);
    if (a.condition < 35 && s.bag.cake) G.useItem(s, "cake", a.id);
  }
  // Use found stat items and gear.
  for (const id of ["shake", "manual", "ladder", "puzzle", "notebook", "scroll", "elixir", "goldchalk"])
    while (s.bag[id]) {
      const a = [...s.roster].sort((x, y) => y.level - x.level)[0];
      if (!G.useItem(s, id, a.id)) break;
    }
  for (const id of Object.keys(s.bag)) {
    const d = G.effects && id in s.bag ? id : null;
    if (!d) continue;
  }
  for (const [type, i] of BUILD.map((t, n) => [t, n])) {
    const free = G.unlockedPlots(s).find((p) => !s.plots[p]);
    if (free != null && s.money > FACILITIES[type].cost + 400 && G.canBuild(s, free, type)) G.build(s, free, type);
    void i;
  }
  for (let i = 0; i < 12; i++) if (s.plots[i] && s.plots[i].level < 3 && s.money > G.upgradeCost(s.plots[i].type, s.plots[i].level) + 800) G.upgrade(s, i);
  if (s.roster.length < Math.min(6, G.rosterCap(s)) && s.money > 2500) {
    if (!s.prospects.length) G.scout(s);
    const best = [...s.prospects].sort((a, b) => G.eventRating(b, b.event) - G.eventRating(a, a.event))[0];
    if (best && s.money > G.signCost(s, best) + 1500) G.recruit(s, best.id);
  }
  for (const id of ["competition", "spikes", "chalk", "carbon", "thunder", "clover"])
    if (G.shopStock(s).includes(id) && s.money > 2500) G.buyItem(s, id);
  for (const id of Object.keys(s.bag)) {
    const slot = { competition: "implement", carbon: "implement", comet: "implement", spikes: "shoes", thunder: "shoes", hermes: "shoes", chalk: "charm", clover: "charm", medal: "charm", headband: "charm" }[id];
    if (!slot) continue;
    const a = s.roster.find((x) => !x.gear[slot]);
    if (a) G.equipItem(s, a.id, id);
  }
  G.autoLineup(s);
}
function idle(s) {
  G.autoLineup(s);
}

function career(seed, policy) {
  const s = G.newGame(seed);
  const reached = [1, null, null, null, null],
    winsByLeague = [[], [], [], [], []];
  let title = null,
    injuries = 0,
    minMoney = s.money;
  for (let season = 0; season < MAX && !title; season++) {
    for (let guard = 0; guard < 400 && s.phase === "season"; guard++) {
      if (s.pendingEvent) {
        G.resolveEvent(s, Math.max(0, G.eventView(s).choices.findIndex((c) => c.ok)));
        continue;
      }
      if (s.day < s.matchDay) {
        policy(s);
        const r = G.advanceDay(s);
        injuries += r.injuries?.length || 0;
        minMoney = Math.min(minMoney, s.money);
        continue;
      }
      policy(s);
      if (G.lineupProblem(s)) {
        if (!G.medicalDay(s)) G.autoLineup(s);
        continue;
      }
      if (!G.startMatch(s)) break;
      G.simulateMatch(s);
      winsByLeague[s.league].push(s.match.score > s.match.against ? 1 : 0);
      G.leaveMatch(s);
    }
    if (s.champion && s.league === 4) title = s.season;
    const before = s.league;
    G.nextSeason(s);
    if (s.league > before) reached[s.league] = s.season;
  }
  return { title, reached, injuries, minMoney, money: s.money, fans: s.fans, winsByLeague, goals: s.goals.length, levels: s.roster.map((a) => a.level), ranks: s.roster.map((a) => a.rank) };
}

const out = {};
for (const [name, policy] of [
  ["engaged", engaged],
  ["idle", idle],
]) {
  const runs = Array.from({ length: N }, (_, i) => career(i + 1, policy));
  const titles = runs.map((r) => r.title ?? MAX + 1);
  out[name] = {
    worldTitleMedian: median(titles),
    worldTitleP90: pct(titles, 0.9),
    titledWithinCap: runs.filter((r) => r.title).length / N,
    reachLeagueMedian: [1, 2, 3, 4].map((l) => median(runs.map((r) => r.reached[l] ?? MAX + 1))),
    winRateByLeague: [0, 1, 2, 3, 4].map((l) => {
      const all = runs.flatMap((r) => r.winsByLeague[l]);
      return all.length ? +(all.reduce((n, v) => n + v, 0) / all.length).toFixed(2) : null;
    }),
    medianFinalMoney: median(runs.map((r) => r.money)),
    medianFans: median(runs.map((r) => r.fans)),
    lowestMoneySeen: Math.min(...runs.map((r) => r.minMoney)),
    injuriesPerCareer: +(runs.reduce((n, r) => n + r.injuries, 0) / N).toFixed(1),
    goalsMedian: median(runs.map((r) => r.goals)),
    ranksSample: runs[0].ranks,
  };
}
console.log(JSON.stringify(out, null, 2));
void EVENT_IDS;
void RANKS;
