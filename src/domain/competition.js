import { LEAGUES, CLUBS } from "../game-content.js";
import { makeClubs } from "./game.js";
import { note } from "./core.js";

export const CIRCUIT_STAGES = ["Open", "Challenger", "Championship"];
export const CIRCUIT_FORMATS = [
  "Three attempts each; the top four earn three more in the final. Two fixtures at home.",
  "Three attempts each; the top four earn three more in the final.",
  "Three attempts each; the top four earn three more in the final. Two fixtures on the road.",
];
export const TITLE_GIFTS = ["scroll", "letter", "elixir"];
export const circuitKey = (tier, stage) => `${tier}:${stage}`;
export const competitionTier = (s) => s.competition?.tier ?? s.league;
export const competitionName = (s) => s.competition?.kind === "duel"
  ? "Duel · " + CLUBS[s.competition.tier][s.competition.rival].name
  : LEAGUES[competitionTier(s)].name + " · " + CIRCUIT_STAGES[s.competition?.stage ?? 2];
export function entryProblem(s, kind, tier, stage = 0, rival = 0) {
  if (s.phase !== "planning" || s.match || s.competition) return "Finish your current competition first.";
  if (s.pendingEvent) return "Resolve the club decision first.";
  if (!["league", "duel"].includes(kind) || !Number.isInteger(tier) || tier < 0 || tier > 4) return "Unknown competition.";
  if (tier > s.league) return "Win the previous level's Championship to earn an invitation.";
  if (kind === "duel") return Number.isInteger(rival) && rival >= 0 && rival < 3 ? null : "Unknown rival.";
  if (!Number.isInteger(stage) || stage < 0 || stage > 2) return "Unknown trophy.";
  if (stage > 0 && !s.circuit.cleared.includes(circuitKey(tier, stage - 1))) return "Win the " + CIRCUIT_STAGES[stage - 1] + " first.";
  return null;
}
export function enterCompetition(s, { kind, tier, stage = 0, rival = 0, preparation = 5, spacing = 7 }) {
  if (entryProblem(s, kind, tier, stage, rival) || ![3, 5, 7, 10].includes(preparation) || ![4, 7, 10].includes(spacing)) return false;
  // Keep the same named athletes when repeating a competition at the same level.
  const strength = kind === "duel" ? 0 : stage;
  s.rivalClubs ??= {};
  s.rivalClubs[s.clubTier]=s.clubs;
  s.clubs=s.rivalClubs[tier] || makeClubs(s,tier,strength);
  s.rivalClubs[tier]=s.clubs;
  // A club keeps its people. New stages develop their existing strengths.
  for(const c of s.clubs) {
    const previous=c.developedStage??(s.clubTier===tier?s.clubStage:strength);
    if(strength>previous) for(const a of c.athletes) {
      a.mastery[a.event]=Math.min(100,a.mastery[a.event]+(strength-previous)*2);
      a.stats=a.stats.map((v,i)=>Math.min(100,v+(strength-previous)*(i===0?2:1.5)));
    }
    c.developedStage=Math.max(previous,strength);
  }
  s.clubTier = tier;
  s.clubStage = strength;
  s.clubs.forEach((c) => { c.points = 0; c.diff = 0; c.played = 0; });
  s.competition = { kind, tier, stage: strength, rival, spacing, startDay: s.day + preparation };
  s.phase = "season";
  s.fixture = 0;
  s.results = [];
  s.champion = false;
  s.lastAwards = null;
  s.finalOpponent = null;
  s.matchDay = s.day + preparation;
  s.sponsorLocked = false;
  note(s, "Booked " + competitionName(s) + " for day " + s.matchDay + ".", "meet");
  return true;
}
export function cancelCompetition(s) {
  if (!s.competition || s.match || s.fixture !== 0 || s.results.length || s.day >= s.matchDay) return false;
  note(s, "Booking cancelled. Your training and club progress stay.", "info");
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
