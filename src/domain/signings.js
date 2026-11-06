// Signings come from the level the club plays at. A prospect scouted for the National divisions has
// competed there: they arrive with the level, rank, event experience, meet skills, form and a
// circuit PB from that division, and their rarity says where they would sit in its field: Common
// signings fill out a squad, Rare ones push for points, Epics score mid-table points and Legends
// contend for the podium. They are placed exactly as rival throwers are, in the division's distance
// band on the kit rivals carry, so a signing kitted out from the shop competes on equal terms.
// Nothing here draws on the club's random stream, so every seeded campaign keeps its other rolls.
import { EVENTS, RANKS, RARITY, RARITY_IDS, SKILLS } from "../game-content.js";
import { clamp, eventRating, statTotal, learnFree, forecast } from "./core.js";
import { rivalMastery, unlockedDivision, ratingForMark, markMultiplier, divisionKit, bandMark } from "./competition.js";
import { MASTERY_PER_MEET } from "./mastery.js";

// Levels a signing has earned by each division: about the pace of a well-run club's own squad.
export const SIGNING_LEVEL_PER_DIVISION = 1.8;
// A signing's circuit PB as a share of what they forecast to throw on arrival.
export const CIRCUIT_PB = 0.98;
// Signings top out at Star. Promoting a Legend is the club's own achievement.
const SIGNING_TOP_RANK = 3;
export const signingLevel = (division) => Math.max(1, Math.round(SIGNING_LEVEL_PER_DIVISION * division));
export const signingRank = (level) => {
  let rank = 0;
  while (rank < SIGNING_TOP_RANK && RANKS[rank + 1].level <= level) rank++;
  return rank;
};
// Skill points an athlete of this level would have collected: one a level, two every fifth.
export const skillPointsAt = (level) => {
  let sp = 1;
  for (let l = 2; l <= level; l++) sp += l % 5 === 0 ? 2 : 1;
  return sp;
};
// The mark a signing of this rarity forecasts in a division on its kit: their place in the band's
// forecast range, the same range rival throwers fill.
export const signingMark = (division, rarity, event) => bandMark(division, event, RARITY[rarity].signing.band);

// The meet skills a signing has picked up on the circuit, as rival athletes have. Chosen from the
// athlete's id, so the same prospect always arrives with the same skills.
export function signingSkills(a, count) {
  const top = Math.min(RARITY_IDS.indexOf(a.rarity), RARITY_IDS.indexOf("epic")),
    hash = (k) => [...k].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0, Math.imul(a.id + 1, 0x9e3779b1) >>> 0),
    pool = Object.keys(SKILLS)
      .filter((k) => SKILLS[k].cat === "meet" && SKILLS[k].rank <= (a.rank || 0) && RARITY_IDS.indexOf(SKILLS[k].rarity) <= top && !a.skills.includes(k))
      .sort((x, y) => hash(x) - hash(y));
  return pool.slice(0, count);
}

// Bring a freshly created athlete up to the division they are scouted for. Only ever improves them:
// in the opening divisions, where a raw recruit is already as good, they are left as they are.
export function seasonSigning(s, a, division = unlockedDivision(s)) {
  const R = RARITY[a.rarity] || RARITY.common,
    event = a.event,
    e = EVENTS[event],
    gear = a.gear;
  // The rating that throws their mark on the division's kit. They arrive without it.
  a.gear = divisionKit(division.tier, event);
  const target = ratingForMark(event, signingMark(division, a.rarity, event), markMultiplier(s, a, event));
  a.gear = gear;
  if (target <= eventRating(a, event)) return a;
  // Rival-level event mastery, or the mastery their mark needs where attributes alone run out of
  // scale (the top divisions): weighted attributes stay at 98 or below.
  const mastery = clamp(Math.max(rivalMastery(division.tier, division.stage) + R.signing.mastery, (target / 98 - 0.6) / 0.004), a.mastery[event], 100);
  a.mastery[event] = mastery;
  // Enough appearances that this mastery sits inside their practice ceiling.
  a.eventMeets[event] = Math.max(a.eventMeets[event], Math.ceil((mastery - 35) / MASTERY_PER_MEET));
  // Keep the athlete's own attribute shape and shift it to the target rating.
  const weighted = target / (0.6 + 0.004 * mastery), stats = [...a.stats];
  let lo = -100, hi = 100;
  for (let i = 0; i < 24; i++) {
    const shift = (lo + hi) / 2, value = stats.reduce((n, v, j) => n + clamp(v + shift, 1, 100) * e.weights[j], 0);
    if (value < weighted) lo = shift;
    else hi = shift;
  }
  a.stats = stats.map((v) => clamp(v + (lo + hi) / 2, 1, 100));
  // Their rank is the one their level has earned, or the one their quality needs (up to Star).
  const top = Math.ceil(Math.max(...a.stats) - 1e-9);
  let needed = 0;
  while (needed < SIGNING_TOP_RANK && (RANKS[needed].limit ?? 100) < top) needed++;
  const rank = Math.max(a.rank || 0, signingRank(Math.max(a.level, signingLevel(division.index))), needed),
    level = Math.max(a.level, signingLevel(division.index), RANKS[rank].level);
  a.level = level;
  a.xp = 0;
  a.rank = rank;
  // Room to keep developing at this rank: their potential covers what they already are.
  a.potential = clamp(Math.max(a.potential, top - RANKS[rank].cap), 1, 100);
  // Experienced athletes arrive with meet skills (paid for from their skill points) and the rest to spend.
  const learned = signingSkills(a, Math.min(R.signing.skills, 1 + rank));
  learned.forEach((k) => learnFree(a, k));
  a.sp = Math.max(1, skillPointsAt(level) - learned.reduce((n, k) => n + SKILLS[k].sp, 0));
  // They have a circuit PB in their event, a little under what they throw now, so entry lists and
  // automatic lineups can seed them. Championship entry still needs a mark made in this league.
  a.pb[event] = Math.max(a.pb[event] || 0, +(forecast(s, a, event, { club: false }) * CIRCUIT_PB).toFixed(2));
  a.seasonStart = statTotal(a);
  return a;
}
