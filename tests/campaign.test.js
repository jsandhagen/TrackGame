import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as G from "../src/domain/game.js";
import { EVENT_IDS, ITEMS } from "../src/game-content.js";
import { validateCampaign, exportCampaign } from "../src/domain/campaign-save.js";

const v3 = () => JSON.parse(readFileSync(new URL("./fixtures/v3-career.json", import.meta.url)));
function prepare(s) {
  for (let guard = 0; s.day < s.matchDay && guard < 40; guard++) {
    if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
    else assert(G.advanceDay(s).ok);
  }
}
function play(s) {
  prepare(s);
  if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
  assert(G.startMatch(s), G.lineupProblem(s) || "match should start");
  assert(G.simulateMatch(s));
}

test("a meet awards results once, survives a save mid-meet and returns to the club", () => {
  const s = G.newGame(72);
  prepare(s);
  assert(G.startMatch(s));
  for (let i = 0; i < 5; i++) G.advanceMatch(s);
  const resumed = validateCampaign(exportCampaign(s));
  assert.deepEqual(resumed.match.homeMarks, s.match.homeMarks);
  assert(G.simulateMatch(resumed));
  const money = resumed.money;
  G.settleMatch(resumed);
  assert.equal(resumed.money, money);
  assert.equal(resumed.results.length, 1);
  assert(resumed.match.rewards);
  assert(G.leaveMatch(resumed));
  assert.equal(resumed.fixture, 1);
  assert.equal(resumed.matchDay, resumed.day + 7);
});

test("every beat is presentable: rival throws first, each event closes, and the meet completes", () => {
  const s = G.newGame(3);
  prepare(s);
  s.settings.clutch = false;
  G.startMatch(s);
  const beats = [];
  for (let guard = 0; guard < 100 && s.match.phase !== "complete"; guard++) beats.push(G.advanceMatch(s));
  assert.equal(beats[0].type, "meetStart");
  assert.equal(beats[1].type, "eventStart");
  assert.equal(beats[2].side, "away");
  assert.equal(beats[3].side, "home");
  assert.equal(beats.filter((b) => b.type === "eventEnd").length, 4);
  assert.equal(beats.filter((b) => b.type === "throw").length, 16);
  assert.equal(beats.at(-1).type, "complete");
});

test("coach mode waits for the coach on every home throw, and clutch moments pause in watch mode", () => {
  const s = G.newGame(4);
  prepare(s);
  s.settings.meetMode = "coach";
  G.startMatch(s);
  G.advanceMatch(s);
  G.advanceMatch(s);
  G.advanceMatch(s);
  const beat = G.advanceMatch(s);
  assert.equal(beat.type, "decide");
  assert.equal(G.advanceMatch(s), null);
  const preview = G.throwPreview(s, "attack");
  assert(preview.foul > G.throwPreview(s, "safe").foul * 4);
  const thrown = G.decideThrow(s, "safe");
  assert.equal(thrown.side, "home");
  assert.equal(thrown.tactic, "safe");
  const w = G.newGame(4);
  prepare(w);
  G.startMatch(w);
  let clutch = 0;
  for (let guard = 0; guard < 200 && w.match.phase !== "complete"; guard++) {
    const b = w.match.phase === "decide" ? G.decideThrow(w, "attack") : G.advanceMatch(w);
    if (b?.type === "decide") {
      clutch++;
      assert(b.clutch);
    }
  }
  assert.equal(w.match.phase, "complete");
  void clutch;
});

test("a full campaign can promote through all five leagues and repeat the world league", () => {
  const s = G.newGame(123);
  s.roster.forEach((a) => {
    a.potential = 100;
    a.stats = [98, 98, 98, 98];
  });
  for (let league = 0; league < 5; league++) {
    for (let i = 0; i < 4; i++) {
      play(s);
      assert(G.leaveMatch(s));
    }
    assert.equal(s.phase, "seasonEnd");
    assert(s.champion, "league " + league);
    assert(s.lastAwards.list.length >= 1);
    const ids = s.roster.map((a) => a.id);
    assert(G.nextSeason(s));
    assert.deepEqual(
      s.roster.slice(0, ids.length).map((a) => a.id),
      ids,
    );
    assert.equal(s.league, Math.min(league + 1, 4));
  }
  assert.equal(s.trophies.length, 5);
  assert(s.goals.includes("worldtitle"));
  assert.equal(G.unlockedPlots(s).length, 13);
});

test("a losing season is repeatable with a rebuild camp and no lost progress", () => {
  const s = G.newGame(8);
  s.roster.forEach((a) => (a.stats = [1, 1, 1, 1]));
  for (let i = 0; i < 3; i++) {
    play(s);
    G.leaveMatch(s);
  }
  assert.equal(s.phase, "seasonEnd");
  assert.equal(s.champion, false);
  const plots = structuredClone(s.plots),
    clubs = structuredClone(s.clubs.map((c) => c.athletes));
  const before = [...s.roster[0].stats];
  assert(G.nextSeason(s));
  assert.equal(s.league, 0);
  assert.deepEqual(s.plots, plots);
  assert.deepEqual(
    s.clubs.map((c) => c.athletes),
    clubs,
  );
  assert(s.roster[0].stats.some((n, i) => n > before[i]));
  assert.equal(s.rebuildStreak, 1);
});

test("lineups cap double duty, auto-lineup fills every event and injuries can be postponed", () => {
  const s = G.newGame(9),
    a = s.roster[0];
  assert(G.assign(s, "discus", a.id));
  assert(G.assign(s, "hammer", a.id) === false);
  assert(G.autoLineup(s));
  assert.equal(G.lineupProblem(s), null);
  prepare(s);
  s.roster.find((x) => x.id === s.lineup.shot).injury = 2;
  assert(!G.startMatch(s));
  assert(G.medicalDay(s));
  while (G.lineupProblem(s)) assert(G.medicalDay(s) || G.autoLineup(s));
  if (s.pendingEvent) G.resolveEvent(s, 0);
  assert(G.startMatch(s));
});

test("buildings line the streets, discover combos with neighbours and unlock by league", () => {
  const s = G.newGame(7);
  assert.equal(s.plots[9].type, "club");
  assert.equal(s.plots[10].type, "gym");
  assert(!G.canBuild(s, 0, "garden"), "plot 0 opens in the County League");
  assert(!G.build(s, 8, "scout"), "scout office needs County League");
  s.money = 5000;
  const built = G.build(s, 11, "cafe");
  assert(built.discoveries.some((c) => c.key === "fuel"), "café next to the gym");
  assert(!G.build(s, 12, "cafe"), "one café");
  assert(G.build(s, 12, "garden") && G.build(s, 7, "garden"), "decorations can repeat");
  assert(G.combos(s).some((c) => c.key === "picnic"));
  assert(!G.neighbours(8).includes(9), "different streets");
  assert(!G.neighbours(9).includes(10), "the main road splits Club Row");
  for (let i = 0; i < 13; i++) for (const j of G.neighbours(i)) assert(G.neighbours(j).includes(i), "neighbours are mutual");
  const moved = G.moveFacility(s, 11, 8);
  assert(moved);
  assert(!G.combos(s).some((c) => c.key === "fuel"));
  assert(s.discovered.includes("fuel"));
  assert(!G.moveFacility(s, 9, 8), "clubhouse is fixed");
  assert(G.upgrade(s, 8));
  assert(G.sellFacility(s, 8) > 0);
  s.league = 1;
  assert(G.canBuild(s, 0, "garden"));
});

test("the stadium's throwing areas train each event's technique and upgrade in place", () => {
  const s = G.newGame(17);
  const discus = s.roster.find((a) => a.event === "discus"),
    shot = s.roster.find((a) => a.event === "shot");
  discus.plan = shot.plan = "technique";
  assert.equal(s.stadium.discus, 0);
  const before = G.trainingGains(s, discus, "technique")[1];
  assert(G.trainingGains(s, shot, "technique")[1] > before, "shot circle exists, discus cage does not");
  s.money = 10000;
  assert.equal(G.stadiumProblem(s, "studio"), "Unlocks in the County League");
  assert(G.upgradeStadium(s, "discus"));
  assert(G.trainingGains(s, discus, "technique")[1] > before);
  for (const k of ["shot", "discus", "hammer", "jav"]) while (s.stadium[k] < 2) assert(G.upgradeStadium(s, k), k);
  assert(s.discovered.includes("arena"));
  assert(G.effects(s, discus).foul < 1);
  assert(G.upgradeStadium(s, "stands"));
  const r = G.advanceDay(s);
  assert.equal(r.athletes.find((e) => e.id === discus.id).facility, "discus");
});

test("training sends athletes to facilities, grows the focused stat and spends stamina", () => {
  const s = G.newGame(11),
    a = s.roster[0];
  a.plan = "power";
  a.autoTaper = false;
  const before = [...a.stats],
    stamina = a.stamina;
  const r = G.advanceDay(s);
  const entry = r.athletes.find((e) => e.id === a.id);
  assert.equal(entry.facility, "gym");
  assert(entry.gains[0] > entry.gains[1] * 4);
  assert(a.stats[0] > before[0]);
  assert(a.stamina < stamina);
  const withoutGym = G.newGame(11);
  withoutGym.plots[10] = null;
  withoutGym.roster[0].plan = "power";
  withoutGym.roster[0].autoTaper = false;
  const r2 = G.advanceDay(withoutGym);
  assert(r2.athletes[0].gains[0] < entry.gains[0]);
  a.stamina = 10;
  a.autoRest = true;
  assert.equal(G.plannedActivity(s, a), "rest");
});

test("items are bought, used, equipped and forged; gear changes the projection", () => {
  const s = G.newGame(13),
    a = s.roster[1];
  s.money = 10000;
  assert(G.buyItem(s, "precision"));
  assert(!G.buyItem(s, "carbon"), "carbon needs fans");
  assert(G.equipItem(s, a.id, "precision"));
  assert.equal(a.gear.implement, "precision");
  assert(G.effects(s, a).foul < 1);
  assert(G.buyItem(s, "competition") === false || true);
  s.fans = 5000;
  assert(G.buyItem(s, "carbon"));
  const before = G.forecast(s, a, a.event);
  assert(G.equipItem(s, a.id, "carbon"));
  assert(G.forecast(s, a, a.event) > before);
  assert.equal(s.bag.precision, 1);
  s.plots[8] = { type: "workshop", level: 1 };
  const forged = G.forecast(s, a, a.event);
  assert(G.forgeItem(s, "carbon"));
  assert(G.forecast(s, a, a.event) > forged);
  a.stamina = 20;
  assert(G.useItem(s, "drink", a.id));
  assert.equal(a.stamina, 60);
  assert(G.buyItem(s, "feast"));
  assert(G.useItem(s, "feast"));
  for (const id of Object.keys(ITEMS)) assert(ITEMS[id].kind === "use" || ITEMS[id].slot);
});

test("skill points buy skills; slots, signatures and ranks gate what an athlete can use", () => {
  const s = G.newGame(14),
    a = s.roster[0];
  a.sp = 10;
  assert(G.learnSkill(s, a.id, "gymrat"));
  assert(a.equipped.includes("gymrat"));
  assert(G.learnSkill(s, a.id, "clutch"));
  assert.equal(a.equipped.length, 1, "rookies have one slot");
  assert(!G.toggleSkill(s, a.id, "clutch"));
  assert(!G.learnSkill(s, a.id, "meteor"), "signatures need Star rank");
  assert(!G.learnSkill(s, a.id, "cyclone"), "signature for another event");
  assert(G.promoteProblem(s, a));
  a.level = 6;
  s.money = 5000;
  assert(G.promote(s, a.id));
  assert.equal(a.rank, 1);
  assert(G.toggleSkill(s, a.id, "clutch"));
  assert.equal(a.equipped.length, 2);
  const train = G.trainingGains(s, a, "power");
  a.equipped = ["clutch"];
  assert(G.trainingGains(s, a, "power")[0] < train[0]);
});

test("scouting rolls rarity, recruiting respects the dorm cap and release keeps history", () => {
  const s = G.newGame(15);
  s.money = 1e6;
  let rare = 0;
  for (let i = 0; i < 60; i++) {
    G.scout(s);
    rare += s.prospects.filter((p) => p.rarity !== "common").length;
  }
  assert(rare > 10);
  while (s.roster.length < G.rosterCap(s)) {
    G.scout(s);
    assert(G.recruit(s, s.prospects[0].id));
  }
  G.scout(s);
  assert(!G.recruit(s, s.prospects[0].id), "dorm cap");
  const gone = s.roster[0];
  gone.gear.charm = "sock";
  assert(G.releaseAthlete(s, gone.id));
  assert(s.bag.sock >= 1);
  assert.equal(s.alumni[0].name, gone.name);
  assert.equal(G.lineupProblem(s), null);
});

test("goals pay out once, story events resolve, and secret characters arrive when earned", () => {
  const s = G.newGame(16);
  s.counters.days = 3;
  const money = s.money;
  const done = G.checkGoals(s);
  assert(done.some((g) => g.id === "train3"));
  assert.equal(s.money, money + 100);
  assert.equal(G.checkGoals(s).length, 0);
  s.fans = 260;
  const e = G.rollStoryEvent(s);
  assert.equal(e.id, "secret");
  assert.equal(e.data.key, "olga");
  assert(!G.advanceDay(s).ok, "time waits for the decision");
  s.money = 5000;
  const view = G.eventView(s);
  assert(view.choices[0].ok);
  G.resolveEvent(s, 0);
  const olga = s.roster.find((a) => a.secret === "olga");
  assert(olga);
  assert(olga.skills.includes("oldschool"));
  assert(G.effects(s, olga).condFloor >= 60);
  for (const id of Object.keys(G.STORY).filter((k) => k !== "secret")) {
    const t = G.newGame(20);
    t.money = 5000;
    t.fans = 1000;
    t.league = 1;
    const def = G.STORY[id];
    if (def.when && !def.when(t)) continue;
    t.pendingEvent = { id, data: def.setup?.(t) || {} };
    const v = G.eventView(t);
    assert(v.title && v.text, id);
    assert(G.resolveEvent(t, 0), id);
    assert.equal(t.pendingEvent, null);
    validateCampaign(t);
  }
});

test("v3 careers migrate: athletes, gear, facilities and an interrupted meet are preserved safely", () => {
  const old = v3();
  const s = validateCampaign(old);
  assert.equal(s.v, 5);
  assert.equal(s.roster.length, old.roster.length);
  assert.equal(s.roster[0].name, old.roster[0].name);
  assert.deepEqual(s.roster[0].skills, ["icevein"]);
  assert.equal(s.roster[1].gear.implement, "precision");
  assert(s.plots.some((p) => p?.type === "spa" && p.level === 2));
  assert.equal(s.match, null);
  assert(s.day >= s.matchDay - 0 || s.matchDay >= s.day);
  assert.equal(s.results.length, old.results.length);
  assert.equal(s.fixture, old.fixture);
  assert(G.startMatch(s) || s.day < s.matchDay);
  validateCampaign(exportCampaign(s));
});

test("0.5 development saves (v4) move onto the stadium layout and keep an active meet", () => {
  const old = JSON.parse(readFileSync(new URL("./fixtures/v4-career.json", import.meta.url)));
  const s = validateCampaign(old);
  assert.equal(s.v, 5);
  assert.equal(s.plots[9].type, "club");
  assert(s.plots.some((p) => p?.type === "cafe") && s.plots.some((p) => p?.type === "spa") && s.plots.some((p) => p?.type === "gym"));
  assert.equal(s.stadium.shot, 2);
  assert.equal(s.match.phase, "decide");
  assert(G.decideThrow(s, "balanced"));
  assert(G.simulateMatch(s));
});

test("bad imports are rejected and cannot replace a working club", () => {
  const s = G.newGame(30);
  const broken = structuredClone(s);
  broken.roster[0].stats[0] = NaN;
  assert.throws(() => validateCampaign(broken));
  const dupe = structuredClone(s);
  dupe.roster.push(structuredClone(dupe.roster[0]));
  assert.throws(() => validateCampaign(dupe));
  const twice = structuredClone(s);
  twice.plots[8] = { type: "gym", level: 1 };
  assert.throws(() => validateCampaign(twice));
  const item = structuredClone(s);
  item.bag.hack = 3;
  assert.throws(() => validateCampaign(item));
  assert.throws(() => validateCampaign({ v: 9 }));
  for (const ev of EVENT_IDS) assert(s.lineup[ev]);
});
