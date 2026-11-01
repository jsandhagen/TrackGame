import { LEAGUES, CLUBS, DIVISIONS, EVENTS, EVENT_IDS, CLUB_EVENT_BIASES, CLUB_BIASES } from "../game-content.js";
import { makeClubs } from "./game.js";
import { note, ledgerAdd, forecastRaw, eventRating, clamp } from "./core.js";
import { firstMeet } from "./progression.js";

export { DIVISIONS };
export const TITLE_GIFTS = ["scroll", "letter", "elixir"];
export const circuitKey = (tier, stage) => `${tier}:${stage}`;
export const divisionOf = (tier, stage = 0) => DIVISIONS[tier * 3 + stage];
export const divisionCleared = (s, division) => s.circuit.cleared.includes(division.key);
export function unlockedDivision(s) {
  // Earlier saves can already have earned a later invitation. Never remove that progress.
  let index = Math.min(14, s.league * 3);
  for (const d of DIVISIONS) if (divisionCleared(s,d)) index = Math.max(index, Math.min(14,d.index+1));
  return DIVISIONS[index];
}
export const currentDivision = s => s.competition?.kind === "league"
  ? divisionOf(s.competition.tier,s.competition.stage) : unlockedDivision(s);
export const divisionName = s => currentDivision(s).name;
// Legacy rating curve: retained for old booking standards and pre-balance save migration.
// New competition strength is calibrated from DIVISIONS' independent event distance bands.
export const RIVAL_RATING = [21, 37, 49, 63, 71, 76, 79, 82, 85, 87, 89, 91, 93, 94, 97];
export function rivalMastery(tier, stage) {
  return Math.min(95, 30 + 4.6 * (tier * 3 + stage));
}
// The base stat that, with that mastery, produces the target rating.
export function rivalBase(tier, stage) {
  return RIVAL_RATING[tier * 3 + stage] / (0.6 + 0.004 * rivalMastery(tier, stage)) - 2;
}
export function tuneDivisionRival(s, a, tier, stage, clubId = 0) {
  const d = divisionOf(tier,stage), event = a.event, e = EVENTS[event],
    bias = (CLUB_EVENT_BIASES[CLUBS[tier][clubId].identity] || CLUB_BIASES[clubId%3])[EVENT_IDS.indexOf(event)],
    [low,high] = d.marks[event], fraction = clamp(0.2 + ((Math.imul(a.id,2654435761) >>> 0) / 4294967296) * 0.6 + bias*0.025,0.1,0.9),
    target = low + (high-low)*fraction;
  a.mastery[event] = Math.min(100,rivalMastery(tier,stage)+(a.profile === "explosive" ? 5 : 0));
  const base = e.min + (e.max-e.min)*(Math.max(0,eventRating(a,event))/100)**1.12,
    multiplier = forecastRaw(s,a,event,{club:false})/base,
    knee = e.record*0.92, room = e.record*0.13,
    raw = target <= knee ? target : knee + room*((1+(target-knee)/(2*room))**2-1),
    rating = 100*(Math.max(0,raw/multiplier-e.min)/(e.max-e.min))**(1/1.12),
    weighted = rating/(0.6+0.004*a.mastery[event]), stats = [...a.stats];
  // Preserve the athlete's attribute shape, including club strengths, while accounting for
  // mastery, condition and their actual equipment. The seeded random stream is untouched.
  let min=-100,max=100;
  for(let i=0;i<22;i++) {
    const shift=(min+max)/2, actual=stats.reduce((sum,v,j)=>sum+clamp(v+shift,1,100)*e.weights[j],0);
    if(actual<weighted) min=shift;else max=shift;
  }
  a.stats=stats.map(v=>clamp(v+(min+max)/2,1,100));
}
export const competitionTier = (s) => s.competition?.tier ?? s.league;
export const competitionName = (s) => s.competition?.kind === "cup"
  ? s.invitations?.offer?.name || "Invitational"
  : s.competition?.kind === "duel"
  ? "Duel · " + CLUBS[s.competition.tier][s.competition.rival].name
  : divisionName(s);
// Leagues above County charge entry; duels are always free, so a club can always earn.
export const entryFee = (kind, tier) => (kind === "league" ? LEAGUES[tier]?.entry || 0 : 0);
export function entryProblem(s, kind, tier, stage = 0, rival = 0) {
  if (firstMeet(s) && (kind !== "duel" || tier !== 0 || rival !== 0)) return "Start with your first duel.";
  if (s.phase !== "planning" || s.match || s.competition) return "Finish your current competition first.";
  if (s.pendingEvent) return "Resolve the club decision first.";
  if (!["league", "duel"].includes(kind) || !Number.isInteger(tier) || tier < 0 || tier > 4) return "Unknown competition.";
  if (tier > s.league) return "Win " + DIVISIONS[tier*3-1].name + " to earn promotion.";
  if (!Number.isInteger(stage) || stage < 0 || stage > 2) return "Unknown division.";
  const division = divisionOf(tier,stage);
  if (division.index > unlockedDivision(s).index && !divisionCleared(s,division)) return "Win " + DIVISIONS[division.index-1].name + " to earn promotion.";
  if (kind === "duel") return Number.isInteger(rival) && rival >= 0 && rival < CLUBS[tier].length ? null : "Unknown rival.";
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
  // A club keeps its people; the booked division sets the strength of its entered squad.
  for(const c of pool) {
    for(const a of c.athletes) {
      a.stamina=100;a.injury=0;a.condition=clamp(a.condition,50,75);
      tuneDivisionRival(s,a,tier,strength,c.id);
    }
    c.developedStage=strength;
  }
  s.clubTier = tier;
  s.clubStage = strength;
}
export function enterCompetition(s, { kind, tier, stage = 0, division, rival = 0, preparation = 5, spacing = 7 }) {
  if (division != null) {
    if (!Number.isInteger(division) || !DIVISIONS[division]) return false;
    ({tier,stage}=DIVISIONS[division]);
  }
  if (entryProblem(s, kind, tier, stage, rival) || ![3, 5, 7, 10].includes(preparation) || ![4, 7, 10].includes(spacing)) return false;
  const strength = stage;
  switchTier(s, tier, strength, kind === "duel");
  s.clubs.forEach((c) => { c.points = 0; c.diff = 0; c.played = 0; });
  const fee = entryFee(kind, tier);
  s.money -= fee;
  ledgerAdd(s, "money", "Entry fees", -fee);
  // The opening challenge starts today; daily preparation is learned after it.
  const startDay = firstMeet(s) ? s.day : s.day + preparation;
  s.competition = { kind, tier, stage: strength, rival, spacing, startDay, fee, ...(kind === "league" ? { format: "championship", qualifyingMarks: {}, standards: {...divisionOf(tier,strength).standards} } : {}) };
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
  for (const d of DIVISIONS) if (d.index <= unlockedDivision(s).index && !divisionCleared(s,d)) return {kind:"league",tier:d.tier,stage:d.stage};
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
