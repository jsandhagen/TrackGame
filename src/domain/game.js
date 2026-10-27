import {
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  PLANS,
  RANKS,
  RARITY,
  SKILLS,
  ITEMS,
  FACILITIES,
  STADIUM,
  PLOT_COUNT,
  CLUB_PLOT,
  CLUBS,
  CLUB_BIASES,
  SPONSORS,
  SHOP_TIERS,
  CLUB_PALETTES,
  PLOT_ORDER,
  GEAR_SLOTS,
  STAT_NAMES,
} from "../game-content.js";
import {
  clamp,
  random,
  pick,
  note,
  count,
  capOf,
  moodOf,
  MOOD_TRAIN,
  effects,
  grantXp,
  createAthlete,
  learnFree,
  combos,
  facilityLevel,
  rosterCap,
  plotUnlocked,
  plotsOpen,
  eventRating,
  wageOf,
  statTotal,
  addItem,
  takeItem,
  rollRarity,
  shopTier,
  isFacilityAvailable,
  slotsOf,
  hasCombo,
  planFacility,
} from "./core.js";
import { checkGoals, rollStoryEvent, computeAwards } from "./story.js";
import { autoLineup, meetOutcome, entriesOf } from "./meet.js";

import { competitionTier, competitionName, circuitKey, TITLE_GIFTS } from "./competition.js";
export * from "./competition.js";
export * from "./development.js";
export * from "./coaching.js";
export * from "./mastery.js";
import { practiceMastery, masteryOf } from "./mastery.js";
export * from "./facility-duties.js";
export * from "./customize.js";
export * from "./calendar.js";
export * from "./venues.js";
export * from "./invitational.js";
import { invitationDay, closeInvitation, ensureInvitations } from "./invitational.js";
import { ensureCustom } from "./customize.js";
import { WEATHER, weatherToday, weatherTrainFactor, weatherSeedFrom } from "./calendar.js";
import { athleteDuty, dutySite, workFacility, moveDuties, automaticDuties, effectiveDuty } from "./facility-duties.js";
import { planProblem, practiceInsights, INSIGHT_START } from "./coaching.js";
export * from "./core.js";
export * from "./meet.js";
export * from "./story.js";

// Changing the primary event keeps earned mastery, marks and meet entries intact.
export function setAthleteEvent(s, id, event) {
  const a = s.roster.find(a => a.id === id);
  if (!a || !EVENTS[event] || s.match) return false;
  a.event = event;
  a.trainingEvent = event;
  if (planProblem(s, a, a.plan)) a.plan = "balanced";
  return true;
}

export const DEFAULT_SETTINGS = { meetMode: "watch", manualRelease: false, clutch: false, speed: 1, sound: true, reducedMotion: false, highlights: true };

export function newGame(seed = Date.now() >>> 0) {
  const s = {
    v: 8,
    rivalClubs: {},
    facilityDuties: {},
    coaching: { insights: INSIGHT_START, unlocked: [], practiceDays: 0, drills: {} },
    rng: seed >>> 0 || 1,
    weatherSeed: weatherSeedFrom(seed),
    nextId: 1,
    clubName: "Ring & Sector",
    colors: { primary: CLUB_PALETTES[0].primary, secondary: CLUB_PALETTES[0].secondary },
    money: 1500,
    fans: 20,
    day: 1,
    season: 1,
    league: 0,
    fixture: 0,
    entries: null,
    matchDay: null,
    phase: "planning",
    competition: null,
    circuit: { cleared: [], duels: [] },
    clubTier: 0,
    clubStage: 0,
    results: [],
    history: [],
    trophies: [],
    log: [],
    roster: [],
    lineup: {},
    plots: Array(PLOT_COUNT).fill(null),
    stadium: Object.fromEntries(Object.entries(STADIUM).map(([k, d]) => [k, d.start])),
    discovered: [],
    prospects: [],
    match: null,
    sponsor: "bakery",
    sponsorLocked: false,
    welcomed: false,
    bag: { drink: 2, cake: 1, shake: 1 },
    forge: {},
    counters: {},
    goals: [],
    secretsOffered: [],
    secretsSigned: [],
    pendingEvent: null,
    lastEventDay: 1,
    saleDay: 0,
    records: {},
    awardHistory: [],
    lastAwards: null,
    alumni: [],
    rebuildStreak: 0,
    freeScout: false,
    settings: { ...DEFAULT_SETTINGS },
    clubs: [],
  };
  s.plots[CLUB_PLOT] = { type: "club", level: 1 };
  s.plots[10] = { type: "gym", level: 1 };
  const starters = [
    ["shot", "Mara Kowal", "farm", { skin: "#e2b08a", hair: "#8e4c33", style: 2 }],
    ["discus", "Tomas Reyes", "gymnast", { skin: "#c98f66", hair: "#1e1e24", style: 0 }],
    ["hammer", "Noor Haddad", "dancer", { skin: "#a06a48", hair: "#1e1e24", style: 4 }],
    ["jav", "Kofi Mensah", "sprinter", { skin: "#5e3a2a", hair: "#1e1e24", style: 1 }],
  ];
  for (const [event, name, background, look] of starters) {
    const a = createAthlete(s, event, { name, background, look, potential: 62 + Math.round(random(s) * 4) });
    s.roster.push(a);
    s.lineup[event] = a.id;
  }
  s.clubs = makeClubs(s, 0);
  s.rivalClubs[0]=s.clubs;
  autoLineup(s);
  scout(s, true);
  note(s, "Welcome home, Coach! Choose a duel or enter a league from the Meets board.", "story");
  ensureInvitations(s);
  return ensureCustom(s);
}

export function makeClubs(s, league, stage = 0, indices = [0, 1, 2]) {
  const meetSkills = Object.keys(SKILLS).filter((k) => SKILLS[k].cat === "meet" && SKILLS[k].rank <= Math.min(2, league));
  return indices.map((index) => {
    const club = CLUBS[league][index], identity = club.identity;
    const bias = { power:[4,-2,3,-3], control:[-2,4,-1,0], speed:[-2,0,2,4], hammer:[0,-2,5,-2], adaptable:[-1,2,0,1], depth:[2,0,0,0], clutch:[-2,-1,2,2] }[identity] || CLUB_BIASES[index % 3];
    return ({
    id: index,
    developedStage: stage,
    name: club.name,
    color: club.color,
    style: club.style,
    points: 0,
    diff: 0,
    played: 0,
    athletes: [...EVENT_IDS,...(league>=2?[EVENT_IDS[index%4],EVENT_IDS[(index+2)%4]]:[])].map((event, i) => {
      const star = bias[EVENT_IDS.indexOf(event)] >= 2;
      const a = createAthlete(s, event, {
        base: LEAGUES[league].rating + stage * 3 + (index % 3) * 1.4 - 1 + bias[EVENT_IDS.indexOf(event)],
        rarity: star && league >= 2 ? "epic" : league >= 1 && star ? "rare" : "common",
        rank: Math.min(4, league),
        sp: 0,
        potential: 100,
      });
      a.potential = 100;
      a.mastery[event]=Math.min(100,[30,56,70,82,90][league]+stage*2+(star?5:0));
      a.eventMeets[event]=Math.max(0,league*4);
      const secondary=EVENT_IDS[(EVENT_IDS.indexOf(event)+3)%4];
      a.mastery[secondary]=Math.min(90,12+league*15);
      a.eventMeets[secondary]=league*3;
      a.profile=identity === "adaptable" ? "adaptable" : identity === "control" ? "consistent" : star ? "explosive" : "durable";
      if(identity === "adaptable" || identity === "depth") a.mastery[secondary] = Math.min(95,a.mastery[secondary]+10);
      if(league>=2 && star) a.stats=a.stats.map((v,j)=>Math.min(100,v+(EVENTS[event].weights[j]>=0.3?4:0)));
      a.skills = [];
      for (let n = 0; n < Math.min(league + (star ? 1 : 0), 3); n++) a.skills.push(pick(s, meetSkills));
      if (league >= 3 && i === 0) a.skills.push("captain");
      if (league >= 4 && star) a.skills.push({ shot: "meteor", discus: "cyclone", hammer: "tempest", jav: "skyspear" }[event]);
      if(league>=1) {
        const style=identity === "power" || identity === "hammer" ?["opener","clutch",star?"highroller":"icevein"]:identity === "control"?["metronome","icevein","clutch"]:["hunter","clutch","bigstage"];
        a.skills=style.slice(0,Math.min(3,league+1));
        if(league>=3&&i===0)a.skills.push("captain");
        if(league>=4&&star)a.skills.push({shot:"meteor",discus:"cyclone",hammer:"tempest",jav:"skyspear"}[event]);
        a.gear.implement=league>=3&&star?"carbon":star?"competition":"precision";
        if(league>=2)a.gear.shoes=index===2?"thunder":"spikes";
        if(league>=3)a.gear.charm=index===1?"chalk":"medal";
        if(index===1)a.mastery[secondary]=Math.min(95,a.mastery[secondary]+8);
      }
      if(league >= 1) {
        const gear = {shot:star && league>=3?"brassshot":"steelshot", discus:star && league>=3?"highrim":"lowrim", hammer:star && league>=3?"competitionhammer":"steelhammer", jav:star && league>=3?"stiffjav":"precision"};
        a.gear.implement = gear[event];
        if(identity === "clutch") {
          a.skills = ["clutch","secondwind","bigstage"].slice(0,Math.min(3,league+1));
          if(league>=3 && i===0) a.skills.push("captain");
          if(league>=4 && star) a.skills.push({shot:"meteor",discus:"cyclone",hammer:"tempest",jav:"skyspear"}[event]);
        }
        if(league >= 3) {
          // Deep squads invest in their supporting event as well as their specialist.
          a.mastery[secondary] = Math.min(95,a.mastery[secondary]+8);
          if(["depth","adaptable","clutch"].includes(identity)) a.gear.implement = "carbon";
        }
        if(league >= 2) a.approaches[event] = "developed";
      }
      a.skills = [...new Set(a.skills)];
      a.equipped = [...a.skills];
      return a;
    }),
  }); });
}

// ── Discovery ─────────────────────────────────────────────────────────
export function discover(s) {
  const fresh = combos(s).filter((c) => !s.discovered.includes(c.key));
  for (const c of fresh) {
    s.discovered.push(c.key);
    s.fans += 5;
    note(s, "Combo discovered: " + c.name + "! " + c.desc, "combo");
  }
  return fresh;
}

// ── Daily simulation ──────────────────────────────────────────────────
export function plannedActivity(s, a, assignments) {
  if (a.injury) return "injured";
  if((athleteDuty(s,a.id) || a.plan === "facilities") && a.stamina<30) return "rest";
  const duty=effectiveDuty(s,a.id,assignments || automaticDuties(s,visitorsPerDay(s)));
  if(duty && dutySite(s,duty)) {
    if(a.stamina<30) return "rest";
    const competing=EVENT_IDS.some(ev=>entriesOf(s,ev).includes(a.id));
    if(!(a.autoTaper && competing && s.matchDay!=null && s.matchDay-s.day<=1)) return "facility";
  }
  const left = s.matchDay == null ? Infinity : s.matchDay - s.day;
  if (a.autoTaper && left <= 1 && (a.plan !== "facilities" || EVENT_IDS.some(ev=>entriesOf(s,ev).includes(a.id)))) return a.stamina < 70 ? "rest" : "sharpen";
  if (a.autoRest && a.stamina < 25) return "rest";
  if(a.plan === "facilities") return "rest";
  return planProblem(s,a,a.plan) ? "balanced" : a.plan;
}
export function visitorsPerDay(s) {
  const lift = 1 + 0.15 * facilityLevel(s, "garden") + 0.15 * facilityLevel(s, "fountain") + 0.15 * facilityLevel(s, "stands") + (hasCombo(s, "picnic") ? 0.2 : 0);
  return Math.round((3 + Math.sqrt(s.fans) * 0.55) * lift * WEATHER[weatherToday(s)].visitors);
}
export function clubCondition(s) {
  return (
    facilityLevel(s, "garden") +
    (facilityLevel(s, "cafe") ? 1 : 0) +
    (facilityLevel(s, "fountain") ? 1 : 0) +
    (facilityLevel(s, "club") - 1) +
    (hasCombo(s, "zen") ? 2 : 0) +
    (hasCombo(s, "teamspirit") ? 1 : 0)
  );
}
export function trainingGains(s, a, planId, fx = effects(s, a)) {
  const plan = PLANS[planId],
    gains = [0, 0, 0, 0];
  if (!plan || planId === "rest" || plan.facilityRole || planProblem(s,a,planId)) return gains;
  const base = 0.38,
    cap = capOf(a),
    mood = MOOD_TRAIN[moodOf(a)];
  for (let i = 0; i < 4; i++) {
    let g;
    if (plan.stat != null) {
      const lvl = facilityLevel(s, planFacility(plan, a));
      g = plan.stat === i ? base * 2 * (plan.rate || 1) * (lvl ? 1 + 0.25 * lvl : 0.8) : base * (plan.secondary?.[0] === i ? plan.secondary[1] : 0.22);
    } else g = base * (planId === "sharpen" ? 0.15 : 0.62);
    const room = clamp((cap - a.stats[i]) / (cap * 0.55), 0.06, 1);
    g *= fx.gain * fx.train[i] * mood * room;
    gains[i] = Math.max(0, Math.min(g, cap - a.stats[i]));
  }
  return gains;
}
export function restAmount(s, a, fx = effects(s, a)) {
  return Math.round((30 + 12 * facilityLevel(s, "spa") + fx.rest) * fx.restMult);
}
export function advanceDay(s) {
  if (s.match || !["planning", "season"].includes(s.phase) || (s.matchDay != null && s.day >= s.matchDay) || s.pendingEvent) return { ok: false };
  s.day++;
  count(s, "days");
  const weather = weatherToday(s),
    sky = WEATHER[weather];
  const report = { weather, duties: [], ok: true, day: s.day, athletes: [], levelUps: [], injuries: [], spend: [], visitors: 0, fans: 0, week: null, discoveries: [], goals: [], event: null };
  const dailyVisitors = visitorsPerDay(s);
  const autoDuties = automaticDuties(s,dailyVisitors);
  const clubCond = clubCondition(s),
    teamCond = s.roster.map((a) => effects(s, a).teamCond),
    injuryRisk = hasCombo(s, "dorms") ? 0.04 : 0.08;
  for (const [index, a] of s.roster.entries()) {
    const fx = effects(s, a),
      activity = plannedActivity(s, a, autoDuties),
      entry = { id: a.id, activity, gains: [0, 0, 0, 0], facility: null };
    const fromOthers = teamCond.reduce((n, v, j) => n + (j === index ? 0 : v), 0);
    if (activity === "injured") {
      a.injury = Math.max(0, a.injury - 1 - (facilityLevel(s, "spa") && random(s) < 0.4 ? 1 : 0));
      a.stamina = clamp(a.stamina + 20, 0, 100);
      entry.facility = facilityLevel(s, "spa") ? "spa" : "club";
    } else if(activity === "facility") {
      const worked=workFacility(s,a,effectiveDuty(s,a.id,autoDuties),dailyVisitors,report);
      entry.facility=worked?.facility || "club";
    } else {
      const plan = PLANS[activity];
      // Rain and snow slow outdoor work and send more effort into the gym and film room.
      const outside = weatherTrainFactor(activity, weather);
      entry.gains = trainingGains(s, a, activity, fx).map((g, i) => Math.max(0, Math.min(g * outside, capOf(a) - a.stats[i])));
      entry.gains.forEach((g, i) => (a.stats[i] += g));
      const technical=plan.facility === "event";
      entry.mastery=practiceMastery(a,technical?(plan.course?0.8:0.5):activity==="balanced"?0.12:activity==="focus"||activity==="filmblock"?0.2:0);
      const where = plan.facility && planFacility(plan, a);
      entry.facility = where && facilityLevel(s, where) ? where : activity === "rest" ? "club" : null;
      if (activity === "rest") a.stamina = clamp(a.stamina + restAmount(s, a, fx), 0, 100);
      else {
        a.stamina = clamp(a.stamina - plan.load * 13 * fx.stamina * (sky.stamina || 1), 0, 100);
        a.sessions++;
      }
      a.stamina = clamp(a.stamina + 4, 0, 100);
      a.condition += plan.cond;
      grantXp(s, a, activity === "rest" ? 2 : activity === "sharpen" ? 4 : 6, report.levelUps);
      if (plan.load > 0.5 && a.stamina < 15 && random(s) < injuryRisk) {
        a.injury = 2 + Math.floor(random(s) * 2);
        report.injuries.push(a.id);
        note(s, a.name + " picked up a knock and needs " + a.injury + " days off.", "warn");
      }
    }
    a.condition += clubCond + fx.cond + fromOthers + (55 - a.condition) * 0.06 + (random(s) - 0.5) * 9;
    a.condition = clamp(a.condition, fx.condFloor, 100);
    report.athletes.push(entry);
  }
  const recovery=report.duties.reduce((n,d)=>n+d.recovery,0);
  if(recovery) for(const entry of report.athletes) if(["rest","injured"].includes(entry.activity)) {
    const a=s.roster.find(a=>a.id===entry.id);a.stamina=clamp(a.stamina+recovery,0,100);
  }
  report.insights = practiceInsights(s,report.athletes.some((e) => e.mastery>0 || e.gains.some((v) => v > 0)));
  // Visitors wander the grounds and spend at the café and merch stand.
  const visitors = dailyVisitors;
  report.visitors = visitors;
  s.plots.forEach((p, i) => {
    if (!p) return;
    const amount =
      p.type === "cafe" ? Math.round(visitors * 0.6 * 2 * p.level) : p.type === "shop" ? Math.round(visitors * 0.5 * 3 * p.level * (hasCombo(s, "matchday") ? 1.5 : 1)) : 0;
    if (amount) {
      s.money += amount;
      report.spend.push({ plot: i, amount });
    }
  });
  const fans = facilityLevel(s, "shop") + 2 * facilityLevel(s, "statue");
  s.fans += fans;
  report.fans = fans;
  if (s.day % 7 === 0) report.week = payWeek(s);
  if (s.day === s.matchDay) note(s, "Meet day! Lineups to the call room.", "meet");
  report.goals = checkGoals(s);
  report.invitation = invitationDay(s);
  report.event = rollStoryEvent(s);
  return report;
}
export function weeklyIncome(s) {
  const sponsor = SPONSORS[s.sponsor] || SPONSORS.bakery;
  return Math.round((sponsor.weekly + 80 + 60 * (facilityLevel(s, "club") - 1) + 70 * facilityLevel(s, "stands")) * (hasCombo(s, "nightfever") ? 1.15 : 1));
}
export const wages = (s) => s.roster.reduce((n, a) => n + wageOf(a), 0);
function payWeek(s) {
  const income = weeklyIncome(s),
    paid = wages(s),
    sponsor = SPONSORS[s.sponsor];
  s.money += income - paid;
  if (sponsor?.gift) addItem(s, sponsor.gift, 2);
  note(s, "Payday: +$" + income + " income, −$" + paid + " wages" + (sponsor?.gift ? ", plus 2 " + ITEMS[sponsor.gift].name + "s" : "") + ".", "money");
  return { income, wages: paid, net: income - paid };
}

// ── Grounds ───────────────────────────────────────────────────────────
export const upgradeCost = (type, level) => (type === "club" ? 500 * level : Math.round(FACILITIES[type].cost * 0.9 * level));
export function canBuild(s, index, type) {
  const d = FACILITIES[type];
  return (
    !!d &&
    type !== "club" &&
    index >= 0 &&
    index < PLOT_COUNT &&
    plotUnlocked(s, index) &&
    !s.plots[index] &&
    !s.match &&
    isFacilityAvailable(s, type) &&
    (d.decor || !s.plots.some((p) => p?.type === type)) &&
    s.money >= d.cost
  );
}
export function build(s, index, type) {
  if (!canBuild(s, index, type)) return false;
  s.money -= FACILITIES[type].cost;
  s.plots[index] = { type, level: 1 };
  count(s, "built");
  note(s, "Built the " + FACILITIES[type].name + ".", "build");
  const discoveries = discover(s);
  checkGoals(s);
  return { discoveries };
}
export function upgrade(s, index) {
  const p = s.plots[index];
  if (!p || p.level >= 3 || s.match) return false;
  const cost = upgradeCost(p.type, p.level);
  if (s.money < cost) return false;
  s.money -= cost;
  p.level++;
  count(s, "upgrades");
  note(s, FACILITIES[p.type].name + " reached level " + p.level + "!", "build");
  const discoveries = discover(s);
  checkGoals(s);
  return { level: p.level, discoveries };
}
// Stadium installations upgrade in place; level 0 means not yet built.
export function stadiumProblem(s, key) {
  const d = STADIUM[key],
    lvl = s.stadium[key];
  if (!d) return "Unknown";
  if (lvl >= d.max) return "Fully upgraded";
  if (s.league < d.league[lvl]) return "Unlocks in the " + LEAGUES[d.league[lvl]].name;
  if (s.money < d.cost[lvl]) return "Needs $" + d.cost[lvl].toLocaleString();
  if (s.match) return "Not during a meet";
  return null;
}
export function upgradeStadium(s, key) {
  if (stadiumProblem(s, key)) return false;
  const d = STADIUM[key],
    lvl = s.stadium[key];
  s.money -= d.cost[lvl];
  s.stadium[key] = lvl + 1;
  count(s, "upgrades");
  count(s, "stadium");
  note(s, (lvl ? d.name + " upgraded: " : "Built the ") + d.levels[lvl + 1] + "!", "build");
  const discoveries = discover(s);
  checkGoals(s);
  return { level: lvl + 1, discoveries };
}
export function moveFacility(s, from, to) {
  if (s.match || from === to || [from, to].some((i) => i < 0 || i >= PLOT_COUNT || i === CLUB_PLOT || !plotUnlocked(s, i)) || !s.plots[from]) return false;
  [s.plots[from], s.plots[to]] = [s.plots[to], s.plots[from]];
  moveDuties(s,from,to);
  return { discoveries: discover(s) };
}
export function sellFacility(s, index) {
  const p = s.plots[index];
  if (!p || p.type === "club" || s.match) return false;
  const refund = Math.round(FACILITIES[p.type].cost * 0.5);
  s.money += refund;
  s.plots[index] = null;
  if(s.facilityDuties) delete s.facilityDuties["plot:"+index];
  note(s, "Cleared the " + FACILITIES[p.type].name + " plot. +$" + refund + ".", "build");
  return refund;
}

// ── Items ─────────────────────────────────────────────────────────────
export const itemPrice = (s, id) => Math.round(ITEMS[id].price * (s.saleDay === s.day ? 0.7 : 1));
export function shopStock(s) {
  const tier = shopTier(s, SHOP_TIERS);
  return Object.keys(ITEMS).filter((k) => ITEMS[k].price != null && ITEMS[k].tier <= tier);
}
export function buyItem(s, id) {
  if (!shopStock(s).includes(id) || s.money < itemPrice(s, id)) return false;
  s.money -= itemPrice(s, id);
  addItem(s, id);
  count(s, "bought");
  return true;
}
// Why a consumable would be wasted on this athlete (or squad), checked before buying or using it.
export function itemProblem(s, id, athleteId) {
  const d = ITEMS[id];
  if (!d || d.kind !== "use") return "Not a consumable";
  if (s.match) return "Not during a meet";
  if (d.team) return s.roster.every((b) => b.condition >= 100 && b.stamina >= 100) ? "The squad is already fresh" : null;
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a) return "Choose an athlete";
  if (d.promote) return a.rank >= 4 ? "Already a Legend" : a.promoteFree ? "Already holds a letter" : null;
  if (d.stat) return a.stats[d.stat[0]] >= capOf(a) - 1e-6 ? STAT_NAMES[d.stat[0]] + " is at the current limit" : null;
  if (d.potential) return a.potential >= 100 ? "Potential is maxed" : null;
  if (d.buff) return (a.buff || 1) >= d.buff ? "Already boosted for the next meet" : null;
  const useful = (d.stamina && a.stamina < 100) || (d.heal && a.injury) || (d.cond && a.condition < 100) || d.xp || d.sp;
  if (!useful) return d.heal ? "Fresh and healthy already" : d.stamina ? "Stamina is already full" : d.cond ? "Already in top condition" : "No effect";
  return null;
}
// What a consumable would change, for previews in the shop and pickers.
export function itemPreview(s, id, athleteId) {
  const d = ITEMS[id],
    a = s.roster.find((x) => x.id === athleteId),
    out = [];
  if (!d || !a) return out;
  if (d.stamina) out.push({ label: "Stamina", from: a.stamina, to: Math.min(100, a.stamina + d.stamina) });
  if (d.heal && a.injury) out.push({ label: "Injury healed" });
  if (d.cond) out.push({ label: "Condition", from: a.condition, to: Math.min(100, a.condition + d.cond) });
  if (d.stat) out.push({ label: STAT_NAMES[d.stat[0]], stat: d.stat[0], from: a.stats[d.stat[0]], to: Math.min(capOf(a), a.stats[d.stat[0]] + d.stat[1]) });
  if (d.xp) out.push({ label: "+" + d.xp + " XP" });
  if (d.sp) out.push({ label: "+" + d.sp + " skill point" });
  if (d.potential) out.push({ label: "Potential", from: a.potential, to: Math.min(100, a.potential + d.potential) });
  if (d.buff) out.push({ label: "+" + Math.round((d.buff - 1) * 100) + "% next meet" });
  if (d.promote) out.push({ label: "Free next rank-up" });
  return out;
}
export function useItem(s, id, athleteId) {
  const d = ITEMS[id];
  if (!d || d.kind !== "use" || !s.bag[id] || itemProblem(s, id, athleteId)) return false;
  const a = s.roster.find((x) => x.id === athleteId);
  takeItem(s, id);
  count(s, "itemsUsed");
  const out = [];
  if (d.team) {
    for (const b of s.roster) {
      b.condition = clamp(b.condition + (d.teamCond || 0), 0, 100);
      b.stamina = clamp(b.stamina + (d.teamStamina || 0), 0, 100);
    }
    out.push("The whole squad feels great");
  } else {
    if (d.stamina) a.stamina = clamp(a.stamina + d.stamina, 0, 100);
    if (d.heal) a.injury = 0;
    if (d.cond) a.condition = clamp(a.condition + d.cond, 0, 100);
    if (d.stat) a.stats[d.stat[0]] = Math.min(capOf(a), a.stats[d.stat[0]] + d.stat[1]);
    if (d.xp) grantXp(s, a, d.xp, out);
    if (d.sp) a.sp += d.sp;
    if (d.buff) a.buff = d.buff;
    if (d.potential) a.potential = Math.min(100, a.potential + d.potential);
    if (d.promote) a.promoteFree = true;
  }
  checkGoals(s);
  return true;
}
export function ownedCount(s, id) {
  return (s.bag[id] || 0) + s.roster.filter((a) => GEAR_SLOTS.some((slot) => a.gear[slot] === id)).length;
}
export function equipItem(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId),
    d = ITEMS[id];
  if (!a || !d || d.kind !== "gear" || s.match || !s.bag[id]) return false;
  takeItem(s, id);
  if (a.gear[d.slot]) addItem(s, a.gear[d.slot]);
  a.gear[d.slot] = id;
  return true;
}
export function unequipItem(s, athleteId, slot) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a || !a.gear[slot] || s.match) return false;
  addItem(s, a.gear[slot]);
  a.gear[slot] = null;
  return true;
}
export function forgeCost(s, id) {
  const lvl = s.forge[id] || 0;
  return Math.round((ITEMS[id].price || 700) * 0.5 * (lvl + 1) * (1 - 0.1 * facilityLevel(s, "workshop")) * (hasCombo(s, "techhub") ? 0.75 : 1));
}
export function forgeItem(s, id) {
  const lvl = s.forge[id] || 0;
  if (!facilityLevel(s, "workshop") || ITEMS[id]?.kind !== "gear" || lvl >= 3 || !ownedCount(s, id) || s.money < forgeCost(s, id)) return false;
  s.money -= forgeCost(s, id);
  s.forge[id] = lvl + 1;
  count(s, "forged");
  return true;
}

// ── Skills & ranks ────────────────────────────────────────────────────
export function skillAvailable(a, id) {
  const k = SKILLS[id];
  if (!k || a.skills.includes(id)) return false;
  if (k.cat === "unique") return false;
  if (k.event && masteryOf(a,k.event)<60) return false;
  return true;
}
export function learnSkill(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId),
    k = SKILLS[id];
  if (!a || !skillAvailable(a, id) || a.sp < k.sp || a.rank < k.rank || s.match) return false;
  a.sp -= k.sp;
  learnFree(a, id);
  count(s, "skillsLearned");
  checkGoals(s);
  return true;
}
export function toggleSkill(s, athleteId, id) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a || !a.skills.includes(id) || s.match) return false;
  if (a.equipped.includes(id)) a.equipped = a.equipped.filter((k) => k !== id);
  else if (a.equipped.length < slotsOf(a)) a.equipped.push(id);
  else return false;
  return true;
}
export function promoteCost(a) {
  return a.promoteFree ? 0 : RANKS[a.rank + 1]?.cost ?? Infinity;
}
export function promoteProblem(s, a) {
  const next = RANKS[a.rank + 1];
  if (!next) return "Already a Legend.";
  if (a.level < next.level) return "Needs level " + next.level + ".";
  if (next.title && !s.trophies.length) return "Needs a league title.";
  if (s.money < promoteCost(a)) return "Needs $" + promoteCost(a).toLocaleString() + ".";
  return null;
}
export function promote(s, athleteId) {
  const a = s.roster.find((x) => x.id === athleteId);
  if (!a || s.match || promoteProblem(s, a)) return false;
  s.money -= promoteCost(a);
  a.promoteFree = false;
  a.rank++;
  a.stats = a.stats.map((v) => Math.min(capOf(a), v + 1));
  a.condition = 100;
  a.sp += 1;
  a.career.unshift({ season: s.season, label: "Promoted to " + RANKS[a.rank].name });
  count(s, "promotions");
  note(s, a.name + " is now a " + RANKS[a.rank].name + "! New cap, new skill slot" + (RANKS[a.rank].slots > RANKS[a.rank - 1].slots ? "" : "s") + " and a new look.", "rank");
  checkGoals(s);
  return true;
}

// ── People ────────────────────────────────────────────────────────────
export const scoutCost = (s) => Math.round((60 + 25 * s.league) * (1 - 0.15 * facilityLevel(s, "scout")));
export function scout(s, free = false) {
  if (!free && s.money < scoutCost(s)) return false;
  if (!free) s.money -= scoutCost(s);
  const luck = 0.25 * facilityLevel(s, "scout") + (hasCombo(s, "network") ? 0.3 : 0) + 0.05 * s.league;
  s.prospects = Array.from({ length: 3 }, () =>
    createAthlete(s, pick(s, EVENT_IDS), { base: Math.max(22, LEAGUES[s.league].rating - 4 + random(s) * 4), rarity: rollRarity(s, luck) }),
  );
  count(s, "scouted");
  return true;
}
export const signCost = (s, a) => 200 + 110 * s.league + Math.round(eventRating(a, a.event) * 3) + RARITY[a.rarity].fee;
export function recruit(s, id) {
  const a = s.prospects.find((x) => x.id === id);
  if (!a || s.roster.length >= rosterCap(s) || s.money < signCost(s, a) || s.match) return false;
  s.money -= signCost(s, a);
  a.seasonStart = statTotal(a);
  s.roster.push(a);
  s.prospects = s.prospects.filter((x) => x.id !== id);
  count(s, "signed");
  if (a.rarity !== "common") count(s, "rareSigned");
  note(s, a.name + " signed for the club!", "sign");
  checkGoals(s);
  return true;
}
export function releaseAthlete(s, id) {
  if (s.match || s.roster.length <= 4) return false;
  const a = s.roster.find((x) => x.id === id);
  if (!a) return false;
  for (const slot of GEAR_SLOTS) if (a.gear[slot]) addItem(s, a.gear[slot]);
  s.alumni.unshift({ name: a.name, event: a.event, career: a.career, pb: a.pb, season: s.season, rank: a.rank });
  s.alumni = s.alumni.slice(0, 24);
  s.roster = s.roster.filter((x) => x.id !== id);
  for(const [key,athlete] of Object.entries(s.facilityDuties||{})) if(athlete===id) delete s.facilityDuties[key];
  if (s.entries) for (const ev of EVENT_IDS) s.entries[ev] = s.entries[ev].filter((x) => x !== id);
  if (a.secret) s.secretsSigned = s.secretsSigned.filter((k) => k !== a.secret);
  if (EVENT_IDS.some((ev) => s.lineup[ev] === id)) autoLineup(s);
  note(s, a.name + " begins a new chapter. Their marks stay in the club’s history.", "story");
  return true;
}
export function chooseSponsor(s, id) {
  if (s.sponsorLocked || !SPONSORS[id] || s.fans < SPONSORS[id].fans) return false;
  s.sponsor = id;
  return true;
}
export function medicalDay(s) {
  if (s.match || s.pendingEvent || s.phase !== "season" || s.day < s.matchDay || !EVENT_IDS.some((ev) => entriesOf(s, ev).some((id) => s.roster.find((a) => a.id === id)?.injury))) return false;
  s.matchDay++;
  const r = advanceDay(s);
  note(s, "A medical postponement gives the squad a recovery day.", "warn");
  return r;
}

// ── Seasons ───────────────────────────────────────────────────────────
export function table(s) {
  const us = { id: "us", name: s.clubName, points: 0, diff: 0, played: 0 };
  for (const r of s.results)
    if (r.kind === "league") {
      us.points += r.win ? 3 : r.draw ? 1 : 0;
      us.diff += r.score - r.against;
      us.played++;
    }
  return [us, ...s.clubs.map((c) => ({ ...c }))].sort((a, b) => b.points - a.points || b.diff - a.diff || String(a.id).localeCompare(String(b.id)));
}
export function leaveMatch(s) {
  const m = s.match;
  if (!m?.settled) return false;
  if (m.kind === "duel" || m.kind === "cup") {
    if (m.kind === "cup") closeInvitation(s);
    s.match = null;
    s.competition = null;
    s.phase = "planning";
    s.matchDay = null;
    s.results = [];
    s.sponsorLocked = false;
    checkGoals(s);
    return true;
  }
  if (m.kind === "final") {
    s.champion = meetOutcome(m) > 0;
    s.phase = "seasonEnd";
    if (s.champion) {
      const tier = competitionTier(s), stage = s.competition?.stage ?? 2;
      const key = circuitKey(tier, stage), first = !s.circuit.cleared.includes(key);
      const prize = Math.round(LEAGUES[tier].prize * (0.5 + stage * 0.25) * (first ? 1 : 0.5));
      if (first) s.circuit.cleared.push(key);
      s.money += prize;
      s.fans += (first ? 100 : 30) * (tier + 1);
      s.trophies.push({ league: tier, stage, season: s.season });
      s.lastTitlePrize = prize;
      s.lastTitleGift = first ? TITLE_GIFTS[stage] : null;
      if (s.lastTitleGift) addItem(s, s.lastTitleGift);
      count(s, "titles");
      note(s, competitionName(s) + " champions! +$" + prize + (first ? ". A new invitation earned!" : ". Title defended!"), "win");
    }
  } else {
    s.fixture++;
    s.matchDay = s.day + (s.competition?.spacing || 7);
    if (s.fixture === 3) {
      const ranking = table(s),
        rank = ranking.findIndex((c) => c.id === "us");
      if (rank < 2) {
        s.finalOpponent = ranking.find((c) => c.id !== "us").id;
        note(s, "We're in the league final! One more week to prepare.", "meet");
      } else {
        s.phase = "seasonEnd";
        s.champion = false;
        note(s, "The season is over for us. Everything we built stays.", "story");
      }
    }
  }
  if (s.phase === "seasonEnd") computeAwards(s);
  s.match = null;
  checkGoals(s);
  return true;
}
export function nextSeason(s) {
  if (s.phase !== "seasonEnd") return false;
  const wasChampion = s.champion, tier = competitionTier(s), stage = s.competition?.stage ?? 2;
  const previousLeague = s.league;
  if (wasChampion && stage === 2) s.league = Math.max(s.league, Math.min(4, tier + 1));
  s.season++;
  s.fixture = 0;
  s.results = [];
  s.phase = "planning";
  s.champion = false;
  s.matchDay = null;
  s.competition = null;
  s.sponsorLocked = false;
  s.clubs.forEach((c) => { c.points = 0; c.diff = 0; c.played = 0; });
  s.money += 150;
  s.rebuildStreak = wasChampion ? 0 : (s.rebuildStreak || 0) + 1;
  const boost = 1 + 0.5 * Math.min(3, s.rebuildStreak);
  for (const a of s.roster) {
    if (!wasChampion) {
      const weakest = a.stats.indexOf(Math.min(...a.stats));
      for (const i of new Set([EVENTS[a.event].weights.indexOf(Math.max(...EVENTS[a.event].weights)), weakest])) a.stats[i] = Math.min(capOf(a), a.stats[i] + boost);
    }
    a.stamina = 100;
    a.condition = clamp(a.condition + 15, 0, 100);
    a.injury = 0;
    a.seasonStart = statTotal(a);
    a.seasonPoints = 0;
    a.seasonPbs = 0;
  }
  scout(s, true);
  note(s, s.league > previousLeague ? "Invited to the " + LEAGUES[s.league].name + "! New grounds and rivals await."
    : wasChampion ? "The trophy stays. Choose your next challenge on the Meets board."
    : "Rebuild camp: key stats improved. Try a duel, keep developing, or enter again.", "story");
  checkGoals(s);
  return true;
}

export const unlockedPlots = (s) => PLOT_ORDER.slice(0, plotsOpen(s));
