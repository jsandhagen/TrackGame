import { athleteDuty } from "./facility-duties.js";
import { practiceMastery, masteryOf, masteryCap } from "./mastery.js";
import { EVENT_IDS, PLANS, STADIUM, FACILITIES, ITEMS } from "../game-content.js";
import { capOf, facilityLevel, effects, moodOf, MOOD_TRAIN, count, note, random, hasCombo, grantXp } from "./core.js";

export const INSIGHT_START = 16;
// Coached sessions are where the big gains come from; daily plans only keep the squad ticking over.
// The first three need nothing but grass: every club can run them from day one.
export const DRILLS = {
  visualise: { family: "focus", broad: 1, name: "Breathing & visualisation", desc: "Slow breathing, then rehearse the perfect throw in your head, cue by cue. No equipment, little effort.", needs: [], cost: 4, energy: 6, gains: [0,0.2,0,1.25] },
  recovery: { family: "recovery", name: "Mobility & recovery", desc: "Foam rollers, hurdle walkovers and an easy stretch. Gives back stamina instead of spending it.", needs: [], cost: 3, energy: 0, recover: 30, gains: [0,0.1,0.25,0.35] },
  contest: { family: "special", name: "Club throw-off", desc: "Everyone throws their own event and the coach scores it. Bragging rights, a little of everything and a lot of experience. Needs two or more athletes.", needs: [], cost: 6, energy: 18, minGroup: 2, xp: 18, gains: [0.4,0.4,0.4,0.4], mastery: 0.4 },
  sandbag: { family: "power", broad: 2, name: "Sandbag carries", desc: "Bear-hug a sandbag across the field and back. Old-school strength that needs no gym.", needs: [], cost: 5, energy: 20, gains: [1.15,0,0.1,0] },
  ladder: { family: "speed", broad: 1, name: "Agility ladder", desc: "Quick feet through a rope ladder laid on the grass: rhythm for the turn and the run-up.", needs: [], cost: 5, energy: 16, gains: [0,0.1,1.1,0] },
  shadow: { family: "technique", broad: 3, name: "Shadow throws", desc: "The whole delivery without an implement, slow then fast, until the positions are automatic.", needs: [], cost: 5, energy: 12, gains: [0,1.1,0,0.15] },
  indoor: { family: "technique", broad: 3, name: "Indoor technical rehearsal", desc: "Low-load footwork, release positions and drills into a throwing net. Builds the selected event's mastery within its practice ceiling.", needs: [["indoor",1]], cost: 5, energy: 8, gains: [0,0.81,0,0.25], mastery: 0.8 },
  peer: { family: "focus", broad: 1, name: "Coached peer review", desc: "Work with a higher-level teammate training this event. Compare routines and learn together.", needs: [["lodge",1]], cost: 5, energy: 10, gains: [0,0.44,0,1.12], mastery: 0.5, peer: true },
  trial: { family: "technique", broad: 0, name: "Implement fitting & trial", desc: "Trial the athlete's event-specific implement and refine the delivery. Requires matching equipment; builds mastery without bypassing competition experience.", needs: [["testing",1]], cost: 7, energy: 16, gains: [0,1.25,0,0.38], mastery: 1.2, implement: true },
  lifting: { family: "power", broad: 2, name: "Coached strength session", desc: "Squats, pulls and presses: reinforce force production for the delivery.", needs: [["gym",1]], cost: 6, energy: 22, gains: [1.62,0,0,0] },
  acceleration: { family: "speed", broad: 0, name: "Acceleration & bounds", desc: "Short accelerations and low-volume bounds develop explosive movement for the ring and runway.", needs: [["track",1]], cost: 6, energy: 20, gains: [0.19,0,1.38,0] },
  delivery: { family: "technique", broad: 0, name: "Part-to-whole throwing drills", needs: [["event",1]], cost: 7, energy: 24, gains: [0,1.75,0,0.19] },
  review: { family: "focus", broad: 1, name: "Video & pre-throw routine", desc: "Review one technical cue, visualise the delivery and rehearse a consistent routine.", needs: [["studio",1]], cost: 5, energy: 10, gains: [0,0.31,0,1.25] },
  medicine: { family: "power", name: "Medicine-ball delivery throws", desc: "Rotational and overhead medicine-ball throws connect force with a fast, coordinated delivery.", needs: [["gym",2],["event",1]], cost: 10, energy: 28, gains: [1,0.56,0.81,0] },
};
// Drills climb a five-step ladder with use, like a sports-sim training menu: each step is a new,
// bigger session with its own name. It costs more, gives more for the Insight, and from the third
// step also works a second stat. Thresholds are total sessions run with that drill.
export const DRILL_LEVELS = [0, 3, 8, 15, 25];
export const TIER_COST = [1, 1.3, 1.7, 2.3, 3.2];
export const TIER_GAIN = [1, 1.5, 2.1, 2.9, 4];
// No step is billed in money: a paid camp drained the club so badly in the balance audit that it
// stalled building (median final funds fell by more than half). Set PAID_TIER to a step to try it again.
export const PAID_TIER = 0;
export const MONEY_PER_INSIGHT = 30;
export const DRILL_FAMILIES = [["power", "Power", 0], ["technique", "Technique", 1], ["speed", "Speed", 2], ["focus", "Focus", 3], ["recovery", "Recovery", null], ["special", "Club", null]];
export const tierOf = (level) => Math.max(1, Math.min(level, TIER_COST.length));
export const DRILL_NAMES = {
  sandbag: ["Sandbag carries", "Tyre flips", "Log press", "Farmer's walk relay", "Strongman day"],
  ladder: ["Agility ladder", "Skips & bounds", "Hurdle hops", "Reactive sprints", "Lightning feet"],
  shadow: ["Shadow throws", "Towel drill", "Mirror rehearsal", "Standing-throw series", "Perfect positions"],
  visualise: ["Breathing & visualisation", "Guided imagery", "Pressure rehearsal", "Flow-state routine", "Ice in the veins"],
  recovery: ["Mobility & recovery", "Yoga flow", "Contrast baths", "Sports massage", "Full reset"],
  contest: ["Club throw-off", "Points ladder", "Handicap challenge", "Club championship", "Grand throw-off"],
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
// Past the five named levels, every 15 more sessions earns a ★ level, without end.
export const drillThreshold = (level) => (level < DRILL_LEVELS.length ? DRILL_LEVELS[level] : DRILL_LEVELS.at(-1) + 15 * (level - DRILL_LEVELS.length + 1));
export const drillLevel = (s, id) => {
  let level = 0;
  while (drillXp(s, id) >= drillThreshold(level)) level++;
  return level;
};
export const drillName = (s, id, level = drillLevel(s, id)) => DRILL_NAMES[id][Math.min(level, DRILL_NAMES[id].length) - 1] + (level > DRILL_NAMES[id].length ? " ★" + (level - DRILL_NAMES[id].length) : "");
// Training partners: each extra athlete adds 10% to everyone's gains; the group shares one bill.
export const groupBonus = (n) => 1 + 0.1 * (n - 1);
export const groupCost = (id, n, tier = 1) => Math.round(DRILLS[id].cost * TIER_COST[tier - 1] * (1 + 0.5 * (n - 1)));
// What a session costs this club now: Insights, or money on the paid step.
export function sessionCost(s, id, n = 1) {
  const tier = tierOf(drillLevel(s, id)), insights = groupCost(id, n, tier);
  return tier === PAID_TIER ? { insights: 0, money: insights * MONEY_PER_INSIGHT } : { insights, money: 0 };
}
export const costProblem = (s, cost) => (s.coaching.insights < cost.insights ? "Needs " + cost.insights + " Insights" : s.money < cost.money ? "Needs $" + cost.money.toLocaleString() : null);

// Training chemistry: some backgrounds click when they train together. The best match in the
// group boosts everyone's gains (they never stack) and is written into the notebook the first time.
export const CHEMISTRY = [
  { key: "graft", name: "Hard Graft", needs: ["farm", "lumberjack", "marathon"], stat: 0, pct: 50 },
  { key: "fasthands", name: "Fast Hands", needs: ["gymnast", "dancer", "sprinter"], stat: 1, pct: 45 },
  { key: "mindgames", name: "Mind Games", needs: ["chess", "poker", "clown"], stat: 3, pct: 50 },
  { key: "allround", name: "All-Rounders", needs: ["farm", "gymnast", "sprinter"], stat: null, pct: 25 },
  { key: "stagecrew", name: "Stage Crew", needs: ["showboat", "clown", "dancer"], stat: null, pct: 25 },
  { key: "country", name: "Country Strength", needs: ["farm", "lumberjack"], stat: 0, pct: 30 },
  { key: "bodycontrol", name: "Body Control", needs: ["gymnast", "dancer"], stat: 1, pct: 30 },
  { key: "lightfeet", name: "Light Feet", needs: ["dancer", "sprinter"], stat: 2, pct: 30 },
  { key: "coolheads", name: "Cool Heads", needs: ["chess", "poker"], stat: 3, pct: 30 },
  { key: "trackrats", name: "Track Rats", needs: ["sprinter", "marathon"], stat: 2, pct: 25 },
  { key: "precision", name: "Precision", needs: ["chess", "gymnast"], stat: 1, pct: 25 },
  { key: "springs", name: "Spring Loaded", needs: ["farm", "sprinter"], stat: 2, pct: 20 },
  { key: "longdays", name: "Long Days", needs: ["farm", "marathon"], stat: 0, pct: 20 },
  { key: "doubleact", name: "Double Act", needs: ["clown", "showboat"], stat: null, pct: 15 },
  { key: "mentor", name: "Mentor & Pupil", needs: ["bloomer", "prodigy"], stat: null, pct: 20 },
];
export function chemistryOf(s, ids) {
  const bgs = ids.map((id) => s.roster.find((a) => a.id === id)?.background);
  return CHEMISTRY.filter((c) => c.needs.every((b) => bgs.includes(b))).sort((x, y) => y.needs.length - x.needs.length || y.pct - x.pct)[0] || null;
}
export const chemistryMult = (c) => [0, 1, 2, 3].map((i) => (c && (c.stat == null || c.stat === i) ? 1 + c.pct / 100 : 1));

// The head coach learns with every athlete coached: each level adds 3% to session gains and a
// little experience for everyone in the group.
export const coachLevel = (s) => {
  const n = s.counters?.coachedSessions || 0;
  let level = 1;
  while (n >= 5 * level * (level + 1)) level++;
  return level;
};
export const coachThreshold = (level) => 5 * level * (level + 1);
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
export function planRequirements(s,a,id) {
  const p=PLANS[id];
  if(!p) return "Unknown plan";
  if(!p.course) return null;
  const meets=p.facility === "event" ? (p.cost>=24?4:2) : 0;
  return ((a.eventMeets?.[a.trainingEvent||a.event]||0)<meets ? "Needs "+meets+" meets in this training event" : null) || facilityProblem(s,a,p.needs);
}
export function planProblem(s, a, id) {
  return planRequirements(s,a,id) || (PLANS[id]?.course && !s.coaching.unlocked.includes(id) ? "Unlock for " + PLANS[id].cost + " Insights" : null);
}
export function unlockPlan(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId), p = PLANS[id];
  if (!a || !p?.course || s.match || s.pendingEvent || !["planning","season"].includes(s.phase) || s.coaching.unlocked.includes(id) || planRequirements(s,a,id) || s.coaching.insights < p.cost) return false;
  s.coaching.insights -= p.cost; s.coaching.unlocked.push(id);
  note(s,"Training plan unlocked: " + p.name + ". Available to athletes with the required facilities.","level");
  return true;
}
export function setTrainingPlan(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a || s.match || planProblem(s,a,id)) return false;
  a.plan = id; return true;
}
export function coachingTargets(s, scope = "entrants", selected = []) {
  if (scope === "squad") return s.roster.map(a=>a.id);
  if (scope === "group") return [...new Set(selected)].filter(id=>s.roster.some(a=>a.id===id));
  return [...new Set(EVENT_IDS.flatMap(ev=>s.entries?.[ev] ?? (s.lineup[ev] ? [s.lineup[ev]] : [])))];
}
export function trainingPlanPreview(s, ids, id) {
  const plan=PLANS[id], eligible=[], skipped=[];
  const locked=!!plan?.course && !s.coaching.unlocked.includes(id);
  if (!plan || !ids.length || s.match || s.pendingEvent || !["planning","season"].includes(s.phase)) return {eligible,skipped,cost:0,problem:"Choose athletes and finish any meet or club decision first."};
  for (const athleteId of [...new Set(ids)]) {
    const a=s.roster.find(a=>a.id===athleteId);
    const problem=!a ? "Not in the squad" : a.injury ? "Recovering from injury" : athleteDuty(s,a.id) ? "Assigned to a facility duty" : locked ? planRequirements(s,a,id) : planProblem(s,a,id);
    if(problem) skipped.push({id:athleteId,name:a?.name||"Unknown athlete",reason:problem}); else eligible.push(athleteId);
  }
  const cost=locked ? plan.cost : 0;
  return {eligible,skipped,cost,problem:!eligible.length ? "No athletes in this group qualify for this plan." : s.coaching.insights<cost ? "Needs "+cost+" Coaching Insights to unlock." : null};
}
export function applyTrainingPlanGroup(s, ids, id) {
  const preview=trainingPlanPreview(s,ids,id);
  if(preview.problem) return {...preview,ok:false,applied:[]};
  if(preview.cost && !unlockPlan(s,preview.eligible[0],id)) return {...preview,ok:false,applied:[]};
  for(const athleteId of preview.eligible) setTrainingPlan(s,athleteId,id);
  return {...preview,ok:true,applied:preview.eligible};
}
export function drillEnergy(s, id) {
  if (!DRILLS[id].energy) return 0;
  return Math.max(1, Math.round(DRILLS[id].energy * (1 - Math.min(0.18, facilityLevel(s,"spa") * 0.06))));
}
export function drillGains(s, a, id, group = 1, chem = null) {
  const d = DRILLS[id], fx = effects(s,a,true,"training"), cap = capOf(a);
  if (!d) return [0,0,0,0];
  const site = d.needs[0]?.[0] === "event" ? (a.trainingEvent||a.event) : d.needs[0]?.[0];
  const level = drillLevel(s,id), tier = tierOf(level), mult = chemistryMult(chem);
  // Past the fifth step, every ★ adds 8%.
  const quality = (1 + (site ? 0.2 * (facilityLevel(s,site)-1) : 0)) * TIER_GAIN[tier-1] * (1 + 0.08 * Math.max(0, level - TIER_GAIN.length)) * groupBonus(group) * (1 + 0.03 * (coachLevel(s) - 1));
  const base = [...d.gains];
  if (tier >= 3 && d.broad != null) base[d.broad] += Math.max(...d.gains) * 0.25;
  return base.map((v,i) => {
    // Like any sports sim, a stat near its limit grows more slowly.
    const room = Math.max(0.5, Math.min(1, (cap - a.stats[i]) / (cap * 0.3)));
    return Math.max(0,Math.min(cap-a.stats[i],v*quality*mult[i]*room*fx.gain*fx.train[i]*MOOD_TRAIN[moodOf(a)]));
  });
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
  return facilityProblem(s,a,d.needs) || (!group ? costProblem(s, sessionCost(s, id, 1)) : null) ||
    (!d.recover && a.stamina < drillEnergy(s,id) + 20 ? "Legs too heavy (needs " + (drillEnergy(s,id) + 20) + " stamina)" : null) ||
    (drillGains(s,a,id).every((v) => v <= 0) && !((d.mastery || ["delivery","review"].includes(id)) && masteryOf(a,a.trainingEvent||a.event)<masteryCap(a,a.trainingEvent||a.event)) ? "At their ceiling: a rank-up raises it" : null);
}
export function groupProblem(s, ids, id) {
  if (!DRILLS[id]) return "Unknown session";
  if (!ids.length) return "Pick a training group";
  if (ids.length > MAX_GROUP || new Set(ids).size !== ids.length) return "Up to " + MAX_GROUP + " athletes per session";
  if (ids.length < (DRILLS[id].minGroup || 1)) return "Needs " + DRILLS[id].minGroup + " or more athletes";
  for (const aid of ids) {
    const a = s.roster.find((x) => x.id === aid);
    if (!a) return "Pick who trains";
    const problem = drillProblem(s, a, id, ids.length);
    if (problem) return (ids.length > 1 ? a.name.split(" ")[0] + " · " : "") + problem;
  }
  return costProblem(s, sessionCost(s, id, ids.length));
}
// Run one session for up to three athletes. Each rolls a rating that scales their gains.
export function coachGroup(s, ids, id) {
  if (groupProblem(s, ids, id)) return null;
  const d = DRILLS[id], n = ids.length, bill = sessionCost(s, id, n), cost = bill.insights, level = drillLevel(s, id), name = drillName(s, id);
  const chem = chemistryOf(s, ids), coachBefore = coachLevel(s);
  s.coaching.insights -= bill.insights;
  s.money -= bill.money;
  s.coaching.chemistry ??= [];
  const discovered = chem && !s.coaching.chemistry.includes(chem.key);
  if (discovered) s.coaching.chemistry.push(chem.key);
  const levelUps = [];
  const results = ids.map((aid) => {
    const a = s.roster.find((x) => x.id === aid), cap = capOf(a), odds = qualityOdds(a), roll = random(s);
    const quality = roll < odds.excellent ? "excellent" : roll < odds.excellent + odds.great ? "great" : "good";
    const gains = drillGains(s, a, id, n, chem).map((g, i) => Math.max(0, Math.min(cap - a.stats[i], g * QUALITY[quality].mult)));
    const energy = drillEnergy(s, id);
    a.stamina = Math.min(100, a.stamina - energy + (d.recover || 0));
    a.coachedDay = s.day;
    a.stats = a.stats.map((v, i) => v + gains[i]);
    const mastery = practiceMastery(a, (d.mastery ?? (id === "delivery" ? 0.9 : id === "review" ? 0.3 : 0)) * QUALITY[quality].mult);
    grantXp(s, a, ((d.xp || 0) + 2 + coachBefore) * QUALITY[quality].mult, levelUps);
    if (quality === "excellent" && !a.career.some((c) => c.label.startsWith("First bomb in training"))) a.career.unshift({ season: s.season, label: "First bomb in training: " + name });
    count(s, "coachedSessions");
    return { id: aid, gains, mastery, energy, quality };
  });
  s.coaching.drills ??= {};
  s.coaching.drills[id] = drillXp(s, id) + 1;
  const after = drillLevel(s, id);
  note(s, results.map((r) => s.roster.find((a) => a.id === r.id).name.split(" ")[0]).join(", ") + ": " + name + ".", "level");
  if (after > level) note(s, "New session unlocked: " + drillName(s, id, after) + " (Lv " + after + ").", "level");
  if (discovered) note(s, "Training chemistry discovered: " + chem.name + ".", "level");
  const coachAfter = coachLevel(s);
  if (coachAfter > coachBefore) note(s, "Head coach reached level " + coachAfter + ": sessions give 3% more.", "level");
  return { drill: id, name, level: after, levelUp: after > level ? drillName(s, id, after) : null, tierUp: tierOf(after) > tierOf(level), xp: drillXp(s, id), cost, money: bill.money, results, levelUps,
    chemistry: chem && { key: chem.key, name: chem.name, stat: chem.stat, pct: chem.pct, discovered }, coachLevel: coachAfter, coachLevelUp: coachAfter > coachBefore };
}
// Single-athlete session (the athlete screen and automation).
export function coachSession(s, athleteId, id) {
  const out = coachGroup(s, [athleteId], id);
  return out && { ...out.results[0], insights: out.cost, session: out };
}
// Buildings that produce Coaching Insights every day, per level (fractions carry over).
export const INSIGHT_RATES = { club: 0.15, gym: 0.1, library: 0.5, lab: 0.6, indoor: 0.3, studio: 0.4, lodge: 0.5, institute: 1.5, testing: 0.6 };
export function insightRate(s) {
  const base = Object.entries(INSIGHT_RATES).reduce((n, [type, rate]) => n + rate * facilityLevel(s, type), 0);
  return base * (hasCombo(s, "thinktank") ? 1.25 : 1);
}
// Three Insights for a day of practice, plus whatever the club's buildings produce.
export const PRACTICE_INSIGHTS = 3;
export function practiceInsights(s, trained) {
  if (trained) s.coaching.practiceDays++;
  const total = (trained ? PRACTICE_INSIGHTS : 0) + insightRate(s) + (s.coaching.spare || 0),
    earned = Math.floor(total + 1e-9);
  s.coaching.spare = Math.round((total - earned) * 1000) / 1000;
  s.coaching.insights += earned; return earned;
}
export function meetInsights(s, personalBests) {
  const earned = 4 + Math.min(3,personalBests) + (facilityLevel(s,"studio") > 0 ? 2 : 0);
  s.coaching.insights += earned; return earned;
}
