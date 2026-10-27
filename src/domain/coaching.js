import { PLANS, STADIUM, FACILITIES } from "../game-content.js";
import { capOf, facilityLevel, effects, moodOf, MOOD_TRAIN, count, note } from "./core.js";

export const INSIGHT_START = 8;
export const DRILLS = {
  lifting: { name: "Coached strength session", desc: "Squats, pulls and presses: reinforce force production for the delivery.", needs: [["gym",1]], cost: 6, energy: 22, gains: [1.3,0,0,0] },
  acceleration: { name: "Acceleration & bounds", desc: "Short accelerations and low-volume bounds develop explosive movement for the ring and runway.", needs: [["track",1]], cost: 6, energy: 20, gains: [0.15,0,1.1,0] },
  delivery: { name: "Part-to-whole throwing drills", needs: [["event",1]], cost: 7, energy: 24, gains: [0,1.4,0,0.15] },
  review: { name: "Video & pre-throw routine", desc: "Review one technical cue, visualise the delivery and rehearse a consistent routine.", needs: [["studio",1]], cost: 5, energy: 10, gains: [0,0.25,0,1.0] },
  medicine: { name: "Medicine-ball delivery throws", desc: "Rotational and overhead medicine-ball throws connect force with a fast, coordinated delivery.", needs: [["gym",2],["event",1]], cost: 10, energy: 28, gains: [0.8,0.45,0.65,0] },
};
export const EVENT_DRILLS = {
  shot: "Standing puts, power-position deliveries, then a connected glide or rotational entry with the competition shot.",
  discus: "Standing releases, South African drills and connected turns inside the discus cage.",
  hammer: "Controlled winds, single turns and linked turns inside the hammer cage, keeping rhythm into delivery.",
  jav: "Short-approach throws, crossover rhythm and blocking drills on the javelin runway.",
};
export function facilityProblem(s, a, needs) {
  for (const [key, level] of needs || []) {
    const type = key === "event" ? a.event : key;
    if (facilityLevel(s,type) < level) return (STADIUM[type] || FACILITIES[type]).name + " level " + level + " required";
  }
  return null;
}
export function planProblem(s, a, id) {
  const p = PLANS[id];
  if (!p) return "Unknown plan";
  if (!p.course) return null;
  return facilityProblem(s,a,p.needs) || (!s.coaching.unlocked.includes(id) ? "Unlock for " + p.cost + " Insights" : null);
}
export function unlockPlan(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId), p = PLANS[id];
  if (!a || !p?.course || s.match || s.pendingEvent || !["planning","season"].includes(s.phase) || s.coaching.unlocked.includes(id) || facilityProblem(s,a,p.needs) || s.coaching.insights < p.cost) return false;
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
export function drillGains(s, a, id) {
  const d = DRILLS[id], fx = effects(s,a,true,"training"), cap = capOf(a);
  if (!d) return [0,0,0,0];
  const site = d.needs[0][0] === "event" ? a.event : d.needs[0][0];
  const quality = 1 + 0.12 * (facilityLevel(s,site)-1);
  return d.gains.map((v,i) => Math.max(0,Math.min(cap-a.stats[i],v*quality*fx.gain*fx.train[i]*MOOD_TRAIN[moodOf(a)])));
}
export function drillProblem(s,a,id) {
  const d = DRILLS[id];
  if (!d || !a) return "Unknown session";
  if (s.match || s.pendingEvent || !["planning","season"].includes(s.phase)) return "Finish the current meet or club decision first";
  if (s.matchDay != null && s.day >= s.matchDay) return "Meet day: protect the warm-up and competition";
  if (a.injury) return "Recover from injury first";
  if (a.coachedDay === s.day) return "Coached session already completed today";
  return facilityProblem(s,a,d.needs) || (s.coaching.insights < d.cost ? "Needs " + d.cost + " Insights" : null) ||
    (a.stamina < drillEnergy(s,id) + 20 ? "Needs enough stamina to finish with 20 in reserve" : null) ||
    (drillGains(s,a,id).every((v) => v <= 0) ? "Target stats are at their current limit" : null);
}
export function coachSession(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (drillProblem(s,a,id)) return null;
  const gains = drillGains(s,a,id), d = DRILLS[id];
  s.coaching.insights -= d.cost;
  a.stamina -= drillEnergy(s,id);
  a.coachedDay = s.day;
  a.stats = a.stats.map((v,i) => v+gains[i]);
  count(s,"coachedSessions");
  note(s,a.name + ": " + (id === "delivery" ? "coached " + a.event + " delivery drills" : d.name) + ".", "level");
  return { gains, energy:drillEnergy(s,id), insights:d.cost };
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
