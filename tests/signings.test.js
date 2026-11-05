import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/domain/game.js";
import { RARITY_IDS, SKILLS, RANKS } from "../src/game-content.js";

const atDivision = (seed, index) => {
  const s = G.newGame(seed);
  s.onboarding = null;
  const d = G.DIVISIONS[index];
  s.league = d.tier;
  s.circuit.cleared = G.DIVISIONS.slice(0, index).map((x) => x.key);
  return s;
};

test("signings scouted for a later division arrive at that level, placed in its band by rarity", () => {
  for (const index of [7, 12]) {
    const s = atDivision(11, index), d = G.DIVISIONS[index], mark = {}, ovr = {};
    for (const rarity of RARITY_IDS) {
      const a = G.seasonSigning(s, G.createAthlete(s, "jav", { rarity }), d);
      assert(a.level > 1 && a.rank > 0 && a.rank <= 3, "experienced, but never a Legend on arrival");
      assert(G.masteryOf(a, "jav") <= G.masteryCap(a, "jav"), "mastery inside its practice ceiling");
      assert(a.pb.jav > 0, "a circuit PB seeds them");
      const skills = a.skills.filter((k) => SKILLS[k].cat === "meet");
      assert(skills.length >= 1 && skills.every((k) => SKILLS[k].rank <= a.rank), "meet skills they can hold");
      // On the kit a rival of this division carries, they throw at their place in the band.
      assert(Object.values(a.gear).every((g) => g == null), "they arrive without kit");
      a.gear = G.divisionKit(d.tier, "jav");
      mark[rarity] = G.forecast(s, a, "jav", { club: false });
      ovr[rarity] = G.overall(a);
      // Unless the rating scale runs out first, as it does for rivals in the top divisions.
      assert(Math.abs(mark[rarity] - G.signingMark(d, rarity, "jav")) < 0.5 || G.overall(a) >= 99, rarity + " " + mark[rarity]);
    }
    const [low, high] = d.marks.jav;
    assert(mark.common >= low - 0.5 && mark.common < mark.rare && mark.rare < mark.epic && mark.epic <= mark.legend);
    // Epics throw in the upper band, where a championship's mid-table points are; Legends with its stars.
    assert(mark.epic >= low + 0.6 * (high - low) || ovr.epic >= 99, "Epic " + mark.epic);
  }
});

test("opening-division recruits stay raw, and seasoning never weakens anyone", () => {
  const s = atDivision(12, 0), a = G.createAthlete(s, "shot", { rarity: "rare" }), before = JSON.stringify(a);
  G.seasonSigning(s, a, G.DIVISIONS[0]);
  assert.equal(JSON.stringify(a), before);
  const late = atDivision(13, 10), b = G.createAthlete(late, "discus", { rarity: "epic" }), rating = G.overall(b);
  G.seasonSigning(late, b, G.DIVISIONS[10]);
  assert(G.overall(b) > rating);
  // Their rank covers their stats, except a signing past a Star's limit: they keep it and grow on as a Legend.
  assert(b.stats.every((v) => v <= G.capOf(b) + 1e-9) || b.rank === 3, "arrival stats fit their ceiling");
});

test("scouting reports use the club's division, and a headhunter's report holds a Legend", () => {
  const s = atDivision(14, 9);
  G.scout(s, true);
  assert(s.prospects.every((a) => G.overall(a) > 60), "National Division 1 prospects can score");
  G.scout(s, true, { legend: true });
  assert.equal(s.prospects[0].rarity, "legend");
  assert(s.prospects[0].rank < RANKS.length - 1);
});

test("a first title from National Division 3 up brings a Legend prospect", () => {
  const s = atDivision(15, G.HEADHUNTER_DIVISION);
  const d = G.DIVISIONS[G.HEADHUNTER_DIVISION];
  s.competition = { kind: "league", tier: d.tier, stage: d.stage };
  s.phase = "seasonEnd"; s.champion = true; s.lastTitleGift = "scroll";
  assert(G.nextSeason(s));
  assert.equal(s.prospects[0].rarity, "legend");
  const early = atDivision(16, 3), e = G.DIVISIONS[3];
  early.competition = { kind: "league", tier: e.tier, stage: e.stage };
  early.phase = "seasonEnd"; early.champion = true; early.lastTitleGift = "scroll";
  G.nextSeason(early);
  assert(!early.log.some((l) => l.text.includes("headhunter")), "no headhunter before the National divisions");
  assert(s.log.some((l) => l.text.includes("headhunter")));
});

test("a save with seasoned prospects and signings validates", async () => {
  const { validateCampaign } = await import("../src/domain/campaign-save.js");
  const s = atDivision(17, 12);
  G.scout(s, true, { legend: true });
  s.roster.push(s.prospects.shift());
  assert.doesNotThrow(() => validateCampaign(s));
});
