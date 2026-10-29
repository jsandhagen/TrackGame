import test from "node:test";
import assert from "node:assert/strict";
import * as G from "./helpers/developed-club.js";
import { SECRETS } from "../src/game-content.js";
import { validateCampaign, exportCampaign } from "../src/domain/campaign-save.js";

const additions = ["friendlyChallenge", "mentoring", "communityClinic", "libraryNotes", "cafeRecipe", "snowSculpture"];

function club(seed = 71) {
  const s = G.newGame(seed);
  s.money = 5000;
  s.fans = 1000;
  s.league = 1;
  s.plots[11] = { type: "library", level: 1 };
  s.plots[12] = { type: "cafe", level: 1 };
  s.roster[0].level = 6;
  for (const a of s.roster) { a.condition = 50; a.stamina = 50; }
  // Isolate story rewards from milestone rewards and special-character offers.
  s.goals = G.GOALS.map((g) => g.id);
  s.secretsOffered = Object.keys(SECRETS);
  s.day = Array.from({ length: 42 }, (_, i) => 127 + i).find((day) => G.weatherOn(s, day) === "snow");
  assert(s.day, "the winter fixture has a snowy day");
  return s;
}

function offer(s, id) {
  assert(G.STORY[id].when(s), id + " is eligible");
  s.pendingEvent = { id, data: G.STORY[id].setup?.(s) || {} };
}

test("new club stories offer two readable choices and both survive saving before a decision", () => {
  for (const id of additions) for (const choice of [0, 1]) {
    const s = club();
    offer(s, id);
    const view = G.eventView(s), rng = s.rng;
    assert.equal(view.choices.length, 2, id);
    assert(!/undefined|null/.test(view.title + view.text + view.choices.map((c) => c.label).join("")), id);
    assert(view.choices.every((c) => c.ok), id);
    assert.deepEqual(G.eventView(s), view, "reading a decision does not reroll it");
    assert.equal(s.rng, rng);
    const resumed = validateCampaign(exportCampaign(s));
    assert.deepEqual(G.eventView(resumed), view);
    assert.equal(G.resolveEvent(resumed, choice), G.resolveEvent(s, choice), id);
    assert.deepEqual(resumed.roster, s.roster, id + " rewards survive a reload");
    const settled = validateCampaign(exportCampaign(resumed));
    const before = structuredClone(settled);
    assert.equal(G.resolveEvent(settled, choice), null, "the reward cannot be claimed twice");
    assert.deepEqual(settled, before);
  }
});

test("stories unlock through club circumstances and choose healthy, distinct athletes", () => {
  const s = G.newGame(72);
  assert(G.STORY.friendlyChallenge.when(s));
  assert(!G.STORY.mentoring.when(s));
  assert(!G.STORY.communityClinic.when(s));
  assert(!G.STORY.libraryNotes.when(s));
  assert(!G.STORY.cafeRecipe.when(s));
  assert(!G.STORY.snowSculpture.when(s));

  const developed = club(72);
  assert(additions.every((id) => G.STORY[id].when(developed)));
  const pair = G.STORY.mentoring.setup(developed);
  assert.notEqual(pair.mentor, pair.learner);
  assert(G.STORY.mentoring.when(developed));
  developed.roster[0].injury = 2;
  assert(!G.STORY.mentoring.when(developed), "an injured veteran cannot lead practice");
  const course = G.STORY.friendlyChallenge.setup(developed);
  assert.notEqual(course.first, course.second);
  assert(![course.first, course.second].includes(developed.roster[0].id));
  for (const a of developed.roster) a.event = "shot";
  assert(!G.STORY.friendlyChallenge.when(developed), "the challenge needs two disciplines");
  for (const a of developed.roster) a.injury = 2;
  for (const id of additions.filter((id) => id !== "cafeRecipe")) assert(!G.STORY[id].when(developed), id);
  developed.day = 1;
  assert(!G.STORY.snowSculpture.when(developed), "snow stories follow the actual forecast");
});

test("new stories have modest rewards and leave mastery, equipment and competition unchanged", () => {
  for (const id of additions) for (const choice of [0, 1]) {
    const s = club();
    offer(s, id);
    const before = structuredClone(s);
    assert(G.resolveEvent(s, choice), id);
    assert(s.money >= before.money && s.money <= before.money + 60, id);
    assert(s.fans >= before.fans && s.fans <= before.fans + 40, id);
    assert.deepEqual(s.bag, before.bag);
    for (const key of ["stadium", "plots", "coaching", "circuit", "competition", "lineup", "entries", "matchDay", "day"]) assert.deepEqual(s[key], before[key], key);
    for (let i = 0; i < s.roster.length; i++) {
      const a = s.roster[i], old = before.roster[i];
      assert(a.stamina >= old.stamina - 10 && a.stamina <= old.stamina, id);
      assert(a.condition >= old.condition && a.condition <= old.condition + 8, id);
      assert(a.xp >= old.xp && a.xp <= old.xp + 40, id);
      for (const key of ["stats", "mastery", "eventMeets", "gear", "plan", "trainingEvent", "skills"]) assert.deepEqual(a[key], old[key], id + "/" + key);
    }
    validateCampaign(s);
  }
});

test("exhausted or departed participants cannot be coached, and a free choice always remains", () => {
  for (const id of additions) {
    const s = club();
    offer(s, id);
    for (const a of s.roster) { a.stamina = 0; a.condition = 99; }
    s.money = -100;
    if (["friendlyChallenge", "mentoring", "communityClinic", "snowSculpture"].includes(id)) {
      assert(!G.eventView(s).choices[0].ok, id);
      const before = structuredClone(s);
      assert.equal(G.resolveEvent(s, 0), null);
      assert.deepEqual(s, before, "a disabled choice has no side effects");
    }
    assert(G.eventView(s).choices[1].ok, id);
    assert(G.resolveEvent(s, 1), id);
    assert(s.roster.every((a) => a.condition <= 100 && a.stamina >= 0));

    const missing = club();
    offer(missing, id);
    // A player may release a participant while a decision is open.
    missing.roster = [];
    if (id !== "cafeRecipe") assert(!G.eventView(missing).choices[0].ok, id);
    assert(G.resolveEvent(missing, 1), id + " can still be dismissed");
  }
});

test("seeded story draws avoid the last three ordinary events, including automatic news and reloads", () => {
  let automatic = 0, decisions = 0;
  const seen = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    let s = club(seed);
    for (let day = 5; day <= 504; day++) {
      s.day = day;
      const previous = [...s.recentStoryEvents];
      const event = G.rollStoryEvent(s);
      if (s.lastEventDay !== day) continue;
      const id = s.recentStoryEvents.at(-1);
      assert(!previous.includes(id), `${id} repeated among ${previous.join(", ")}`);
      assert(s.recentStoryEvents.length <= G.STORY_RECENT_LIMIT);
      assert.equal(new Set(s.recentStoryEvents).size, s.recentStoryEvents.length);
      assert(G.STORY[id].when?.(s) ?? true, id + " matches the club");
      seen.add(id);
      if (event) {
        decisions++;
        assert.equal(event.id, id);
        assert(!G.advanceDay(s).ok, "time waits for a real decision");
        assert(G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok)));
      } else {
        automatic++;
        assert.equal(s.pendingEvent, null, "one-choice news keeps the club running");
      }
      if (seen.size % 5 === 0) s = validateCampaign(exportCampaign(s));
    }
  }
  assert(automatic > 0);
  assert(decisions > 0);
  for (const id of additions) assert(seen.has(id), id + " can appear through the normal draw");
});

test("event cadence, pending decisions, meet days and special visitors retain their rules", () => {
  const s = club();
  offer(s, "mentoring");
  const pending = structuredClone(s);
  assert.equal(G.rollStoryEvent(s), null);
  assert.deepEqual(s, pending, "an open decision is never replaced");
  s.pendingEvent = null;
  s.lastEventDay = s.day - 1;
  const before = structuredClone(s);
  assert.equal(G.rollStoryEvent(s), null);
  assert.deepEqual(s, before, "the two-day minimum gap consumes no RNG");
  s.lastEventDay = s.day - 5;
  s.matchDay = s.day;
  assert.equal(G.rollStoryEvent(s), null, "ordinary stories do not delay meet day");
  s.matchDay = null;
  s.secretsOffered = [];
  s.recentStoryEvents = ["mentoring", "communityClinic", "cafeRecipe"];
  assert.equal(G.rollStoryEvent(s).id, "secret");
  assert.deepEqual(s.recentStoryEvents, ["mentoring", "communityClinic", "cafeRecipe"], "special visitors do not displace ordinary story memory");
});

test("a small eligible pool can repeat safely, and an empty pool cannot strand the club", () => {
  const weights = Object.fromEntries(Object.entries(G.STORY).map(([id, e]) => [id, e.weight]));
  try {
    for (const e of Object.values(G.STORY)) if (e.weight) e.weight = 0;
    G.STORY.bakery.weight = 1;
    const s = club();
    s.recentStoryEvents = ["bakery"];
    s.rng = 0; // The next chance roll is below 24%.
    assert.equal(G.rollStoryEvent(s), null, "the only eligible gift still resolves automatically");
    assert.equal(s.lastEventDay, s.day);
    assert.deepEqual(s.recentStoryEvents, ["bakery"], "fallback draws keep memory unique");
    validateCampaign(s);
    G.STORY.bakery.weight = 0;
    s.day += 2;
    s.rng = 0;
    const lastEventDay = s.lastEventDay;
    assert.equal(G.rollStoryEvent(s), null);
    assert.equal(s.pendingEvent, null);
    assert.equal(s.lastEventDay, lastEventDay);
  } finally {
    for (const [id, weight] of Object.entries(weights)) {
      if (weight == null) delete G.STORY[id].weight;
      else G.STORY[id].weight = weight;
    }
  }
});

test("older careers gain empty story memory; malformed memory is rejected", () => {
  const old = G.newGame(74);
  delete old.recentStoryEvents;
  old.pendingEvent = { id: "journalist", data: { id: old.roster[0].id } };
  const resumed = validateCampaign(exportCampaign(old));
  assert.deepEqual(resumed.recentStoryEvents, []);
  assert.deepEqual(resumed.pendingEvent, old.pendingEvent);
  assert.deepEqual(resumed.roster, old.roster);
  const s = club(74);
  s.recentStoryEvents = ["bakery", "cafeRecipe", "mentoring"];
  assert.deepEqual(validateCampaign(exportCampaign(s)).recentStoryEvents, s.recentStoryEvents);
  for (const history of ["bakery", ["unknown"], ["secret"], ["bakery", "bakery"], ["bakery", "rain", "dog", "wallet"], [4], [{}], ["__proto__"]]) {
    const broken = structuredClone(s);
    broken.recentStoryEvents = history;
    assert.throws(() => validateCampaign(broken), String(history));
  }
});
