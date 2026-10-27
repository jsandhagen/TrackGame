import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import * as G from "../src/domain/game.js";
import { EVENT_IDS, EVENTS, PLANS, LEAGUES } from "../src/game-content.js";
const N = Number(process.env.AUDIT_SEEDS || 100);
const avg = (a) => a.reduce((n, v) => n + v, 0) / a.length;
const quantile = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor((s.length - 1) * q)];
};
function equipSkill(s, combat = false) {
  for (const a of s.roster) {
    const priority = combat
      ? ["closer", "steady", "student"]
      : ["student", "steady", "closer"];
    a.skill = priority.find((k) => G.skillUnlocked(a, k)) || null;
  }
}
function invest(s) {
  for (const a of s.roster) {
    for (const item of ["development", "distance", "reactive"])
      if (!a.owned.includes(item) && s.money > 550) G.buyKit(s, a.id, item);
  }
  for (const [type, idx] of [
    ["sprint", 3],
    ["garden", 4],
    ["recovery", 5],
    ["analysis", 6],
    ["workshop", 7],
    ["stands", 8],
  ]) {
    if (
      !s.plots.some((p) => p?.type === type) &&
      !s.plots[idx] &&
      s.money > 1000
    )
      G.build(s, idx, type);
  }
  for (let idx = 0; idx < 9; idx++)
    if (s.plots[idx] && s.plots[idx].level < 3 && s.money > 1200)
      G.upgrade(s, idx);
  for (const a of s.roster)
    for (const item of ["distance", "reactive"])
      if (s.money > 700) G.tuneKit(s, a.id, item);
}
function preWeek(s, policy) {
  for (const a of s.roster) {
    a.autoTaper = policy !== "noTaper";
    a.plan =
      policy === "technique"
        ? "technique"
        : policy === "sharpen"
          ? "sharpen"
          : policy === "recover"
            ? "recover"
            : policy === "specialize"
              ? a.event === "shot"
                ? "power"
                : a.event === "discus"
                  ? "technique"
                  : "speed"
              : "balanced";
  }
  if (["invest", "planned"].includes(policy)) {
    invest(s);
    equipSkill(s, false);
    for (const a of s.roster)
      if (a.owned.includes("development")) G.buyKit(s, a.id, "development");
  }
}
function prepare(s, policy) {
  preWeek(s, policy);
  let peakFatigue = 0,
    injuries = 0;
  while (s.day < s.matchDay) {
    if (policy === "planned" && s.matchDay - s.day <= 4)
      s.roster.forEach((a) => (a.plan = "sharpen"));
    G.advanceDay(s);
    peakFatigue = Math.max(peakFatigue, ...s.roster.map((a) => a.fatigue));
    injuries += s.roster.filter((a) => a.injury).length;
  }
  while (s.roster.some((a) => a.injury)) G.medicalDay(s);
  if (["invest", "planned"].includes(policy)) {
    equipSkill(s, true);
    for (const a of s.roster) {
      if (a.owned.includes("distance")) G.buyKit(s, a.id, "distance");
      if (a.owned.includes("reactive")) G.buyKit(s, a.id, "reactive");
    }
  }
  return { peakFatigue, injuries };
}
function play(s, policy = "baseline", quality = "good") {
  if (!G.startMatch(s))
    throw Error("Cannot start " + s.season + " " + s.fixture);
  let clicks = 2;
  while (s.match.phase !== "complete") {
    const m = s.match;
    if (["intro", "planning"].includes(m.phase)) {
      m.tactic =
        policy === "attack"
          ? "attack"
          : policy === "safe"
            ? "safe"
            : policy === "controlled"
              ? "balanced"
              : policy === "bankAttack"
                ? m.attempt === 0
                  ? "safe"
                  : "attack"
                : m.attempt === 0
                  ? "safe"
                  : "balanced";
      G.beginAttempt(s);
      clicks++;
    }
    if (m.phase === "timing") {
      G.resolveThrow(s, quality);
      clicks++;
    }
    if (m.phase === "result") {
      G.nextAttempt(s);
      clicks++;
    }
  }
  const r = {
    win: s.match.score > s.match.against,
    draw: s.match.score === s.match.against,
    clicks,
  };
  G.leaveMatch(s);
  return r;
}
const policies = [
  "baseline",
  "attack",
  "bankAttack",
  "specialize",
  "technique",
  "sharpen",
  "recover",
  "noTaper",
  "invest",
  "planned",
];
const output = {
  version: JSON.parse(readFileSync(new URL("../package.json", import.meta.url)))
    .version,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  seeds: N,
  method: {
    campaignSeeds: "1..N, same initial seeds per scripted policy",
    campaignLimit: 35,
    tacticalDuelsPerPolicy: N * 10,
    tacticalStats: 40,
    tacticalOpponent:
      "controlled, normal quality, no equipment or form advantage",
    inputFloor:
      "simulated manual actions: start/release/continue and two meet transitions; excludes menus, lineup setup and reading",
  },
  campaigns: {},
};
for (const policy of policies) {
  const runs = [];
  for (let seed = 1; seed <= N; seed++) {
    const s = G.newGame(seed),
      entries = Array(5).fill(null),
      seasons = Array(5).fill(0),
      wins = Array(5).fill(0),
      matches = Array(5).fill(0);
    let peakFatigue = 0,
      injuries = 0,
      clicks = 0,
      firstMark = G.forecast(s, s.roster[0], "shot"),
      firstSeasonCash = null,
      worldCash = null;
    for (
      let season = 0;
      season < 35 && !s.trophies.some((t) => t.league === 4);
      season++
    ) {
      entries[s.league] ??= s.season;
      seasons[s.league]++;
      while (s.phase === "season") {
        const prep = prepare(s, policy);
        peakFatigue = Math.max(peakFatigue, prep.peakFatigue);
        injuries += prep.injuries;
        const tier = s.league,
          r = play(s, policy);
        wins[tier] += r.win;
        matches[tier]++;
        clicks += r.clicks;
      }
      if (s.season === 1) firstSeasonCash = s.money;
      if (s.league === 4) worldCash = s.money;
      G.nextSeason(s);
    }
    runs.push({
      title: s.trophies.some((t) => t.league === 4),
      seasons,
      seasonsTotal: seasons.reduce((a, b) => a + b, 0),
      wins,
      matches,
      peakFatigue,
      injuries,
      clicks,
      firstSeasonCash,
      worldCash,
      finalMark: G.forecast(s, s.roster[0], "shot") / firstMark,
    });
  }
  output.campaigns[policy] = {
    worldTitleRate: runs.filter((r) => r.title).length / N,
    seasonsMedian: quantile(
      runs.map((r) => r.seasonsTotal),
      0.5,
    ),
    seasonsP90: quantile(
      runs.map((r) => r.seasonsTotal),
      0.9,
    ),
    seasonsPerLeague: LEAGUES.map((l, i) => ({
      league: l.name,
      mean: +avg(runs.map((r) => r.seasons[i])).toFixed(2),
      winRate: +(
        runs.reduce((n, r) => n + r.wins[i], 0) /
        runs.reduce((n, r) => n + r.matches[i], 0)
      ).toFixed(3),
    })),
    meanFirstSeasonCash: Math.round(avg(runs.map((r) => r.firstSeasonCash))),
    meanWorldCash: Math.round(avg(runs.map((r) => r.worldCash || 0))),
    maxFatigue: Math.max(...runs.map((r) => r.peakFatigue)),
    injuryDays: runs.reduce((n, r) => n + r.injuries, 0),
    medianInputFloor: quantile(
      runs.map((r) => r.clicks),
      0.5,
    ),
    shotProjectionMultiplier: +avg(runs.map((r) => r.finalMark)).toFixed(2),
  };
}
// Equal-strength duels isolate tactical choices; home has no form/kit advantage.
output.tactics = {};
for (const policy of [
  "safe",
  "controlled",
  "baseline",
  "attack",
  "bankAttack",
]) {
  let wins = 0,
    draws = 0,
    fouls = 0,
    total = 0;
  for (let seed = 1; seed <= N * 10; seed++) {
    const s = G.newGame(seed);
    s.roster.forEach((a) => {
      a.stats = [40, 40, 40, 40];
      a.form = 50;
      a.energy = 100;
      a.fatigue = 0;
      a.trait = "technician";
    });
    s.clubs.forEach((c) =>
      c.athletes.forEach((a) => {
        a.stats = [40, 40, 40, 40];
        a.trait = "technician";
      }),
    );
    s.day = s.matchDay;
    G.startMatch(s);
    while (s.match.phase !== "complete") {
      const m = s.match;
      if (["intro", "planning"].includes(m.phase)) {
        m.tactic =
          policy === "attack"
            ? "attack"
            : policy === "safe"
              ? "safe"
              : policy === "controlled"
                ? "balanced"
                : policy === "bankAttack"
                  ? m.attempt === 0
                    ? "safe"
                    : "attack"
                  : m.attempt === 0
                    ? "safe"
                    : "balanced";
        G.beginAttempt(s);
      }
      if (m.phase === "timing") {
        fouls += G.resolveThrow(s,"good","controlled").mark == null;
        total++;
      }
      if (m.phase === "result") G.nextAttempt(s);
    }
    wins += s.match.score > s.match.against;
    draws += s.match.score === s.match.against;
  }
  output.tactics[policy] = {
    winRate: wins / (N * 10),
    drawRate: draws / (N * 10),
    foulRate: fouls / total,
  };
}
// Paired week with identical random seeds isolates the return on a single upgrade.
output.upgrades = {};
for (const type of ["gym", "rings", "sprint", "garden", "recovery"]) {
  let differences = [];
  for (let seed = 1; seed <= N; seed++) {
    const base = G.newGame(seed),
      changed = structuredClone(base);
    base.matchDay = changed.matchDay = 8;
    let idx = changed.plots.findIndex((p) => p?.type === type);
    if (idx >= 0) G.upgrade(changed, idx);
    else G.build(changed, 3, type);
    for (let day = 0; day < 7; day++) {
      G.advanceDay(base);
      G.advanceDay(changed);
    }
    differences.push({
      mark:
        G.forecast(changed, changed.roster[0], "shot") -
        G.forecast(base, base.roster[0], "shot"),
      rating:
        G.eventRating(changed.roster[0], "shot") -
        G.eventRating(base.roster[0], "shot"),
    });
  }
  output.upgrades[type] = {
    shotMetresAfterWeek: +avg(differences.map((d) => d.mark)).toFixed(4),
    shotRatingAfterWeek: +avg(differences.map((d) => d.rating)).toFixed(4),
  };
}
console.log(JSON.stringify(output, null, 2));
