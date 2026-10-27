import { practiceMastery, masteryOf, masteryCap } from "./mastery.js";
import { PLANS, STADIUM, FACILITIES, ITEMS } from "../game-content.js";
import { capOf, facilityLevel, effects, moodOf, MOOD_TRAIN, count, note, random } from "./core.js";

export const INSIGHT_START = 16;
export const DRILLS = {
  indoor: { name: "Indoor technical rehearsal", desc: "Low-load footwork, release positions and drills into a throwing net. Builds the selected event's mastery within its practice ceiling.", needs: [["indoor",1]], cost: 5, energy: 8, gains: [0,0.65,0,0.2], mastery: 0.8 },
  peer: { name: "Coached peer review", desc: "Work with a higher-level teammate training this event. Compare routines and learn together.", needs: [["lodge",1]], cost: 5, energy: 10, gains: [0,0.35,0,0.9], mastery: 0.5, peer: true },
  trial: { name: "Implement fitting & trial", desc: "Trial the athlete's event-specific implement and refine the delivery. Requires matching equipment; builds mastery without bypassing competition experience.", needs: [["testing",1]], cost: 7, energy: 16, gains: [0,1.0,0,0.3], mastery: 1.2, implement: true },
  lifting: { name: "Coached strength session", desc: "Squats, pulls and presses: reinforce force production for the delivery.", needs: [["gym",1]], cost: 6, energy: 22, gains: [1.3,0,0,0] },
  acceleration: { name: "Acceleration & bounds", desc: "Short accelerations and low-volume bounds develop explosive movement for the ring and runway.", needs: [["track",1]], cost: 6, energy: 20, gains: [0.15,0,1.1,0] },
  delivery: { name: "Part-to-whole throwing drills", needs: [["event",1]], cost: 7, energy: 24, gains: [0,1.4,0,0.15] },
  review: { name: "Video & pre-throw routine", desc: "Review one technical cue, visualise the delivery and rehearse a consistent routine.", needs: [["studio",1]], cost: 5, energy: 10, gains: [0,0.25,0,1.0] },
  medicine: { name: "Medicine-ball delivery throws", desc: "Rotational and overhead medicine-ball throws connect force with a fast, coordinated delivery.", needs: [["gym",2],["event",1]], cost: 10, energy: 28, gains: [0.8,0.45,0.65,0] },
};
// Drills level up with use, like a sports-sim training menu: each level has its own name and
// adds 8% to the session's gains. Thresholds are total sessions run with that drill.
export const DRILL_LEVELS = [0, 3, 8, 15, 25];
export const DRILL_NAMES = {
  indoor: ["Indoor technical rehearsal", "Net-release practice", "Footwork & release", "Connected indoor series", "Precision rehearsal"],
  peer: ["Coached peer review", "Partner observations", "Shared technical cues", "Mentored competition prep", "Club coaching masterclass"],
  trial: ["Implement fitting & trial", "Grip & release trial", "Implement comparison", "Delivery matching", "Competition implement fitting"],
  lifting: ["Coached strength session", "Squat & pull complex", "Olympic lifts", "Contrast lifting", "Peak-force block"],
  acceleration: ["Acceleration & bounds", "Hill sprints", "Sled pushes", "Plyometric circuit", "Speed-strength mastery"],
  delivery: ["Part-to-whole throwing drills", "Standing-throw ladder", "Full-approach series", "Heavy–light implements", "Competition simulation"],
  review: ["Video & pre-throw routine", "Frame-by-frame review", "Biomechanics report", "Mental rehearsal", "Champion's routine"],
  medicine: ["Medicine-ball delivery throws", "Rotational wall throws", "Overhead power series", "Reactive med-ball circuit", "Explosive transfer"],
};
// Every athlete in a session gets a rating. Better mood, better odds.
export const QUALITY = {
  good: { name: "Solid", mult: 0.9, color: "#8cc152" },
  great: { name: "Strong!", mult: 1.15, color: "#5aa4c8" },
  excellent: { name: "Bomb!!", mult: 1.5, color: "#f2c94c" },
};
export const MAX_GROUP = 3;
export const drillXp = (s, id) => s.coaching.drills?.[id] || 0;
export const drillLevel = (s, id) => DRILL_LEVELS.filter((n) => drillXp(s, id) >= n).length;
export const drillName = (s, id) => DRILL_NAMES[id][drillLevel(s, id) - 1];
// Training partners: each extra athlete adds 10% to everyone's gains; the group shares one bill.
export const groupBonus = (n) => 1 + 0.1 * (n - 1);
export const groupCost = (id, n) => Math.round(DRILLS[id].cost * (1 + 0.5 * (n - 1)));
export function qualityOdds(a) {
  const mood = moodOf(a);
  return { excellent: 0.05 + 0.025 * mood, great: 0.28 + 0.03 * mood };
}
export const EVENT_DRILLS = {
  shot: "Standing puts, power-position deliveries, then a connected glide or rotational entry with the competition shot.",
  discus: "Standing releases, South African drills and connected turns inside the discus cage.",
  hammer: "Controlled winds, single turns and linked turns inside the hammer cage, keeping rhythm into delivery.",
  jav: "Short-approach throws, crossover rhythm and blocking drills on the javelin runway.",
};
export function facilityProblem(s, a, needs) {
  for (const [key, level] of needs || []) {
    const type = key === "event" ? (a.trainingEvent || a.event) : key;
    if (facilityLevel(s,type) < level) return (STADIUM[type] || FACILITIES[type]).name + " level " + level + " required";
  }
  return null;
}
export function planProblem(s, a, id) {
  const p = PLANS[id];
  if (!p) return "Unknown plan";
  if (!p.course) return null;
  const meets=p.facility === "event" ? (p.cost>=24?4:2) : 0;
  return (p.course && (a.eventMeets?.[a.trainingEvent||a.event]||0)<meets ? "Needs "+meets+" meets in this training event" : null) || facilityProblem(s,a,p.needs) || (!s.coaching.unlocked.includes(id) ? "Unlock for " + p.cost + " Insights" : null);
}
export function unlockPlan(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId), p = PLANS[id];
  if (!a || !p?.course || s.match || s.pendingEvent || !["planning","season"].includes(s.phase) || s.coaching.unlocked.includes(id) || facilityProblem(s,a,p.needs) || (p.facility === "event" && (a.eventMeets?.[a.trainingEvent||a.event]||0)<(p.cost>=24?4:2)) || s.coaching.insights < p.cost) return false;
  s.coaching.insights -= p.cost; s.coaching.unlocked.push(id);
  note(s,"Training plan unlocked: " + p.name + ". Available to athletes with the required facilities.","level");
  return true;
}
export function setTrainingPlan(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a || s.match || planProblem(s,a,id)) return false;
  a.plan = id; return true;
}
export function drillEnergy(s, id) {
  return Math.max(1, Math.round(DRILLS[id].energy * (1 - Math.min(0.18, facilityLevel(s,"spa") * 0.06))));
}
export function drillGains(s, a, id, group = 1) {
  const d = DRILLS[id], fx = effects(s,a,true,"training"), cap = capOf(a);
  if (!d) return [0,0,0,0];
  const site = d.needs[0][0] === "event" ? (a.trainingEvent||a.event) : d.needs[0][0];
  const quality = (1 + 0.12 * (facilityLevel(s,site)-1)) * (1 + 0.08 * (drillLevel(s,id)-1)) * groupBonus(group);
  return d.gains.map((v,i) => Math.max(0,Math.min(cap-a.stats[i],v*quality*fx.gain*fx.train[i]*MOOD_TRAIN[moodOf(a)])));
}
// Everything except the Insight bill, which a group pays once.
export function drillProblem(s,a,id,group = 0) {
  const d = DRILLS[id];
  if (!d || !a) return "Unknown session";
  if (s.match || s.pendingEvent || !["planning","season"].includes(s.phase)) return "Finish the current meet or club decision first";
  if (s.matchDay != null && s.day >= s.matchDay) return "Meet day: save it for the ring";
  if (a.injury) return "Injured: rest up first";
  if (a.coachedDay === s.day) return "Already trained today";
  const event = a.trainingEvent || a.event;
  if(d.peer && !s.roster.some(b => b.id !== a.id && !b.injury && b.level > a.level && (b.trainingEvent || b.event) === event && !["rest","facilities"].includes(b.plan))) return "Needs a higher-level teammate training this event";
  if(d.implement && ITEMS[a.gear.implement]?.event !== event) return "Equip an implement for this training event";
  return facilityProblem(s,a,d.needs) || (!group && s.coaching.insights < d.cost ? "Needs " + d.cost + " Insights" : null) ||
    (a.stamina < drillEnergy(s,id) + 20 ? "Legs too heavy (needs " + (drillEnergy(s,id) + 20) + " stamina)" : null) ||
    (drillGains(s,a,id).every((v) => v <= 0) && !((d.mastery || ["delivery","review"].includes(id)) && masteryOf(a,a.trainingEvent||a.event)<masteryCap(a,a.trainingEvent||a.event)) ? "At their ceiling: a rank-up raises it" : null);
}
export function groupProblem(s, ids, id) {
  if (!DRILLS[id]) return "Unknown session";
  if (!ids.length) return "Pick a training group";
  if (ids.length > MAX_GROUP || new Set(ids).size !== ids.length) return "Up to " + MAX_GROUP + " athletes per session";
  for (const aid of ids) {
    const a = s.roster.find((x) => x.id === aid);
    if (!a) return "Pick who trains";
    const problem = drillProblem(s, a, id, ids.length);
    if (problem) return (ids.length > 1 ? a.name.split(" ")[0] + " · " : "") + problem;
  }
  const cost = groupCost(id, ids.length);
  return s.coaching.insights < cost ? "Needs " + cost + " Insights" : null;
}
// Run one session for up to three athletes. Each rolls a rating that scales their gains.
export function coachGroup(s, ids, id) {
  if (groupProblem(s, ids, id)) return null;
  const d = DRILLS[id], n = ids.length, cost = groupCost(id, n), level = drillLevel(s, id), name = drillName(s, id);
  s.coaching.insights -= cost;
  const results = ids.map((aid) => {
    const a = s.roster.find((x) => x.id === aid), cap = capOf(a), odds = qualityOdds(a), roll = random(s);
    const quality = roll < odds.excellent ? "excellent" : roll < odds.excellent + odds.great ? "great" : "good";
    const gains = drillGains(s, a, id, n).map((g, i) => Math.max(0, Math.min(cap - a.stats[i], g * QUALITY[quality].mult)));
    const energy = drillEnergy(s, id);
    a.stamina -= energy;
    a.coachedDay = s.day;
    a.stats = a.stats.map((v, i) => v + gains[i]);
    const mastery = practiceMastery(a, (d.mastery ?? (id === "delivery" ? 0.9 : id === "review" ? 0.3 : 0)) * QUALITY[quality].mult);
    if (quality === "excellent" && !a.career.some((c) => c.label.startsWith("First bomb in training"))) a.career.unshift({ season: s.season, label: "First bomb in training: " + name });
    count(s, "coachedSessions");
    return { id: aid, gains, mastery, energy, quality };
  });
  s.coaching.drills ??= {};
  s.coaching.drills[id] = drillXp(s, id) + 1;
  const after = drillLevel(s, id);
  note(s, results.map((r) => s.roster.find((a) => a.id === r.id).name.split(" ")[0]).join(", ") + ": " + name + ".", "level");
  if (after > level) note(s, "New session unlocked: " + DRILL_NAMES[id][after - 1] + " (Lv " + after + ").", "level");
  return { drill: id, name, level: after, levelUp: after > level ? DRILL_NAMES[id][after - 1] : null, xp: drillXp(s, id), cost, results };
}
// Single-athlete session (the athlete screen and automation).
export function coachSession(s, athleteId, id) {
  const out = coachGroup(s, [athleteId], id);
  return out && { ...out.results[0], insights: out.cost, session: out };
}
export function practiceInsights(s, trained) {
  if (!trained) return 0;
  s.coaching.practiceDays++;
  const earned = 1 + (facilityLevel(s,"lab") > 0 && s.coaching.practiceDays % 3 === 0 ? 1 : 0);
  s.coaching.insights += earned; return earned;
}
export function meetInsights(s, personalBests) {
  const earned = 4 + Math.min(3,personalBests) + (facilityLevel(s,"studio") > 0 ? 2 : 0);
  s.coaching.insights += earned; return earned;
}
