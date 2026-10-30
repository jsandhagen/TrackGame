import { LEAGUES, CLUBS } from "../game-content.js";
import { makeClubs } from "./game.js";
import { note, ledgerAdd } from "./core.js";
import { firstMeet } from "./progression.js";

export const CIRCUIT_STAGES = ["Open", "Challenger", "Championship"];
export const CIRCUIT_FORMATS = [
  "Three club duels, then a league championship: qualifying marks required, three preliminary throws and three more for the top six. Two duels at home.",
  "Three club duels, then a league championship: qualifying marks required, three preliminary throws and three more for the top six.",
  "Three club duels, then a league championship: qualifying marks required, three preliminary throws and three more for the top six. Two duels on the road.",
];
export const TITLE_GIFTS = ["scroll", "letter", "elixir"];
export const circuitKey = (tier, stage) => `${tier}:${stage}`;
// One smooth difficulty curve across all fifteen stages, County Open to Diamond Championship:
// the event rating of a typical rival specialist. Each stage asks for about a season's growth
// from a well-run club, so steps are big while athletes improve quickly and small near the top.
export const RIVAL_RATING = [21, 37, 49, 63, 71, 76, 79, 82, 85, 87, 89, 91, 93, 94, 97];
export function rivalMastery(tier, stage) {
  return Math.min(95, 30 + 4.6 * (tier * 3 + stage));
}
// The base stat that, with that mastery, produces the target rating.
export function rivalBase(tier, stage) {
  return RIVAL_RATING[tier * 3 + stage] / (0.6 + 0.004 * rivalMastery(tier, stage)) - 2;
}
export const competitionTier = (s) => s.competition?.tier ?? s.league;
export const competitionName = (s) => s.competition?.kind === "cup"
  ? s.invitations?.offer?.name || "Invitational"
  : s.competition?.kind === "duel"
  ? "Duel · " + CLUBS[s.competition.tier][s.competition.rival].name
  : LEAGUES[competitionTier(s)].name + " · " + CIRCUIT_STAGES[s.competition?.stage ?? 2];
// Leagues above County charge entry; duels are always free, so a club can always earn.
export const entryFee = (kind, tier) => (kind === "league" ? LEAGUES[tier]?.entry || 0 : 0);
export function entryProblem(s, kind, tier, stage = 0, rival = 0) {
  if (firstMeet(s) && (kind !== "duel" || tier !== 0 || rival !== 0)) return "Start with your first County duel.";
  if (s.phase !== "planning" || s.match || s.competition) return "Finish your current competition first.";
  if (s.pendingEvent) return "Resolve the club decision first.";
  if (!["league", "duel"].includes(kind) || !Number.isInteger(tier) || tier < 0 || tier > 4) return "Unknown competition.";
  if (tier > s.league) return "Win the previous level's Championship to earn an invitation.";
  if (kind === "duel") return Number.isInteger(rival) && rival >= 0 && rival < CLUBS[tier].length ? null : "Unknown rival.";
  if (!Number.isInteger(stage) || stage < 0 || stage > 2) return "Unknown trophy.";
  if (stage > 0 && !s.circuit.cleared.includes(circuitKey(tier, stage - 1))) return "Win the " + CIRCUIT_STAGES[stage - 1] + " first.";
  if (s.money < entryFee(kind, tier)) return "Entry costs $" + entryFee(kind, tier).toLocaleString() + ".";
  return null;
}
// Bring a level's clubs onto the calendar, keeping every club's people between visits.
// all: the whole pool (duels and invitationals) rather than this season's three opponents.
export function switchTier(s, tier, strength, all) {
  // Keep the same named athletes when repeating a competition at the same level.
  s.rivalClubs ??= {};
  const previousPool = s.rivalClubs[s.clubTier] || [];
  s.rivalClubs[s.clubTier] = [...previousPool.filter(c => !s.clubs.some(active => active.id === c.id)), ...s.clubs].sort((a,b) => a.id-b.id);
  let pool = s.rivalClubs[tier] || [];
  const missing = CLUBS[tier].map((_,i) => i).filter(id => !pool.some(c => c.id === id));
  pool = [...pool, ...makeClubs(s,tier,strength,missing)].sort((a,b) => a.id-b.id);
  s.rivalClubs[tier] = pool;
  const offset = (strength * 2 + Math.floor((s.season-1)/3)) % pool.length;
  s.clubs = all ? pool : Array.from({length:3},(_,i) => pool[(offset+i)%pool.length]);
  // A club keeps its people. New stages develop their existing strengths.
  for(const c of pool) {
    const previous=c.developedStage??(s.clubTier===tier?s.clubStage:strength);
    if(strength>previous) {
      const lift=rivalBase(tier,strength)-rivalBase(tier,previous),practice=rivalMastery(tier,strength)-rivalMastery(tier,previous);
      for(const a of c.athletes) {
        a.mastery[a.event]=Math.min(100,a.mastery[a.event]+practice);
        a.stats=a.stats.map(v=>Math.min(100,v+lift));
      }
    }
    c.developedStage=Math.max(previous,strength);
  }
  s.clubTier = tier;
  s.clubStage = strength;
}
export function enterCompetition(s, { kind, tier, stage = 0, rival = 0, preparation = 5, spacing = 7 }) {
  if (entryProblem(s, kind, tier, stage, rival) || ![3, 5, 7, 10].includes(preparation) || ![4, 7, 10].includes(spacing)) return false;
  const strength = kind === "duel" ? 0 : stage;
  switchTier(s, tier, strength, kind === "duel");
  s.clubs.forEach((c) => { c.points = 0; c.diff = 0; c.played = 0; });
  const fee = entryFee(kind, tier);
  s.money -= fee;
  ledgerAdd(s, "money", "Entry fees", -fee);
  // The opening challenge starts today; daily preparation is learned after it.
  const startDay = firstMeet(s) ? s.day : s.day + preparation;
  s.competition = { kind, tier, stage: strength, rival, spacing, startDay, fee, ...(kind === "league" ? { format: "championship", qualifyingMarks: {} } : {}) };
  s.phase = "season";
  s.fixture = 0;
  s.results = [];
  s.champion = false;
  s.lastAwards = null;
  s.finalOpponent = null;
  s.matchDay = startDay;
  s.sponsorLocked = false;
  note(s, "Booked " + competitionName(s) + " for day " + s.matchDay + ".", "meet");
  return true;
}
export function cancelCompetition(s) {
  if (!s.competition || s.match || s.fixture !== 0 || s.results.length || s.day >= s.matchDay) return false;
  s.money += s.competition.fee || 0;
  ledgerAdd(s, "money", "Entry fees", s.competition.fee || 0);
  note(s, "Booking cancelled" + (s.competition.fee ? " and the $" + s.competition.fee.toLocaleString() + " entry refunded" : "") + ". Your training and club progress stay.", "info");
  s.competition = null;
  s.matchDay = null;
  s.phase = "planning";
  return true;
}
export function nextCircuitEntry(s) {
  for (let tier = 0; tier <= s.league; tier++) for (let stage = 0; stage < 3; stage++) {
    if (!s.circuit.cleared.includes(circuitKey(tier, stage))) return { kind: "league", tier, stage };
  }
  return { kind: "league", tier: 4, stage: 2 };
}
// Booked meet days ahead, for the calendar. Later league fixtures are projected from the spacing.
export function upcomingMeets(s) {
  const c = s.competition;
  if (!c || s.phase !== "season" || s.matchDay == null) return [];
  if (c.kind !== "league") return [{ day: s.matchDay, label: competitionName(s), rival: (c.kind === "duel" ? s.clubs.find((x) => x.id === c.rival) : null)?.name }];
  const out = [];
  for (let f = s.fixture; f < 3; f++) out.push({ day: s.matchDay + (f - s.fixture) * c.spacing, label: "League duel " + (f + 1) + " / 3", rival: s.clubs[f]?.name });
  if (c.format === "championship") {
    out.push({ day: s.matchDay + (3 - s.fixture) * c.spacing, label: "League championship · 3 + 3 throws", rival: "Best throwers from every division club", projected: s.fixture < 3 });
    return out;
  }
  out.push({ day: s.matchDay + (3 - s.fixture) * c.spacing, label: s.fixture === 3 ? "League final" : "League final (top two)", rival: s.fixture === 3 ? s.clubs.find((x) => x.id === s.finalOpponent)?.name : null, projected: s.fixture < 3 });
  return out;
}
