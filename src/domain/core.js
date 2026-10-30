import { initMastery, masteryOf, PROFILES } from "./mastery.js";
import {
  EVENTS,
  EVENT_IDS,
  RANKS,
  RARITY,
  RARITY_IDS,
  BACKGROUNDS,
  ATHLETE_TYPES,
  GROWTH,
  SKILLS,
  ITEMS,
  GEAR_SLOTS,
  FACILITIES,
  STADIUM,
  THROW_SPOTS,
  COMBOS,
  PLOT_COUNT,
  NEIGHBOURS,
  PLOT_ORDER,
  PLOTS_BY_LEAGUE,
  FIRST,
  LAST,
  SKINS,
  HAIRS,
  HAIR_STYLES,
} from "../game-content.js";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function gauss(s) {
  const u = Math.max(1e-9, random(s)),
    v = random(s);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const pick = (s, list) => list[Math.floor(random(s) * list.length)];
export function weighted(s, entries) {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = random(s) * total;
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries.at(-1)[0];
}
// A building's books: the last seven days of takings (counter sales and staff on duty) and
// lifetime totals, so the coach can see whether it pays its way. Kept on the plot itself, so
// they move with the building.
export function recordTakings(s, p, kind, amount) {
  if (!p || !amount) return;
  p.days ??= [];
  if (p.days.at(-1)?.day !== s.day) p.days.push({ day: s.day, sales: 0, staff: 0 });
  p.days.at(-1)[kind] += amount;
  while (p.days.length > 7) p.days.shift();
  p.earned = (p.earned || 0) + amount;
}
export function note(s, text, kind = "info") {
  s.log.unshift({ day: s.day, season: s.season, text, kind });
  s.log = s.log.slice(0, 60);
}
export const count = (s, key, n = 1) => {
  s.counters[key] = (s.counters[key] || 0) + n;
};

// ── Athletes ──────────────────────────────────────────────────────────
export const primaryStat = (event) => {
  const w = EVENTS[event].weights;
  return w.indexOf(Math.max(...w));
};
// Legends keep climbing: each star past Legend lifts the ceiling, without limit.
export const STAR_CAP = 4;
export const capOf = (a) => Math.min(100, a.potential + RANKS[a.rank || 0].cap) + STAR_CAP * (a.stars || 0);
export const rankName = (a) => RANKS[a.rank || 0].name + (a.stars ? " ★" + a.stars : "");
export const moodOf = (a) => clamp(Math.floor(a.condition / 20), 0, 4);
export const MOODS = ["Awful", "Low", "Okay", "Good", "Great"];
export const MOOD_MARK = [0.95, 0.975, 1, 1.02, 1.04];
export const MOOD_TRAIN = [0.8, 0.9, 1, 1.1, 1.2];
export const xpNeeded = (level) => 40 + level * 12;
export const slotsOf = (a) => RANKS[a.rank || 0].slots;
export const wageOf = (a) => RANKS[a.rank || 0].wage + RARITY[a.rarity || "common"].wage + Math.floor(a.level / 4) * 8;
export const statTotal = (a) => a.stats.reduce((n, v) => n + v, 0);

// An athlete's type, chosen from their id rather than the club's random stream so that adding types
// left every seeded campaign unchanged. Half of athletes get a type that suits their event.
export function typeFor(id, event) {
  const h = (n) => {
    let x = Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(n, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  },
    all = Object.keys(ATHLETE_TYPES),
    fits = all.filter((k) => ATHLETE_TYPES[k].fits.includes(event)),
    pool = fits.length && h(1) < 0.5 ? fits : all;
  return pool[Math.floor(h(2) * pool.length)];
}
export const growthOf = (a) => (ATHLETE_TYPES[a.type] || ATHLETE_TYPES.allrounder).growth.map((g) => GROWTH[g]);

// Some athletes wear something: shades, a sweatband or a cap. Read from the generator's state
// without drawing from it, so adding accessories changes no other roll in the game.
const GEAR = ["shades", "band", "cap"], GEAR_COLORS = ["#e04a3a", "#3a7ad0", "#f2c94c", "#2f9a6a", "#f4f4f0", "#2a2a32"];
export function makeLook(s, extra = {}) {
  const look = {
    skin: pick(s, SKINS),
    hair: pick(s, HAIRS),
    style: Math.floor(random(s) * HAIR_STYLES),
  };
  const r = s.rng >>> 0;
  if (r % 100 < 22) Object.assign(look, { gear: GEAR[(r >>> 8) % GEAR.length], gearColor: GEAR_COLORS[(r >>> 12) % GEAR_COLORS.length] });
  return { ...look, ...extra };
}

export function createAthlete(s, event, o = {}) {
  const rarity = o.rarity || "common",
    R = RARITY[rarity],
    base = (o.base ?? 24) + R.bonus;
  const stats = Array.from({ length: 4 }, () => base - 3 + random(s) * 6);
  stats[primaryStat(event)] += 4;
  const potential = o.potential ?? Math.round(R.potential[0] + random(s) * (R.potential[1] - R.potential[0]));
  const backgrounds = Object.keys(BACKGROUNDS).filter((b) => rarity !== "common" || !BACKGROUNDS[b].rare);
  const a = {
    id: s.nextId++,
    name: o.name || pick(s, FIRST) + " " + pick(s, LAST),
    event,
    stats: stats.map((v) => clamp(v, 1, Math.min(100,potential+RANKS[o.rank||0].cap))),
    stamina: 100,
    condition: 55 + Math.round(random(s) * 20),
    level: 1,
    xp: 0,
    sp: o.sp ?? 1,
    rank: o.rank || 0,
    potential,
    background: o.background || pick(s, backgrounds),
    type: null,
    rarity,
    skills: [],
    equipped: [],
    gear: { implement: null, shoes: null, charm: null },
    development: { clean: 0, pbs: 0, wins: 0, claimed: [] },
    loadouts: { enabled: false, training: null, meet: null },
    plan: "balanced",
    autoRest: true,
    autoTaper: true,
    facilityFocus: "balanced",
    coachedDay: 0,
    sessions: 0,
    meets: 0,
    pb: {},
    career: [],
    injury: 0,
    look: o.look || makeLook(s),
    secret: o.secret || null,
    buff: null,
    seasonStart: 0,
    seasonPoints: 0,
    seasonPbs: 0,
  };
  a.type = ATHLETE_TYPES[o.type] ? o.type : typeFor(a.id, event);
  a.seasonStart = statTotal(a);
  if (o.skill) learnFree(a, o.skill);
  else if (rarity !== "common") {
    const pool = Object.keys(SKILLS).filter((k) => ["train", "meet"].includes(SKILLS[k].cat) && SKILLS[k].rank === 0);
    learnFree(a, pick(s, pool));
  }
  return initMastery(a);
}
export function learnFree(a, id) {
  if (!a.skills.includes(id)) a.skills.push(id);
  if (!a.equipped.includes(id) && a.equipped.length < slotsOf(a)) a.equipped.push(id);
}

// ── Grounds ───────────────────────────────────────────────────────────
export const plotsOpen = (s) => PLOTS_BY_LEAGUE[s.league];
export const plotUnlocked = (s, i) => PLOT_ORDER.indexOf(i) < plotsOpen(s);
// Plots side by side on the same street are neighbours.
export const neighbours = (i) => NEIGHBOURS[i] || [];
const STADIUM_RULES = {
  arena: (s) => THROW_SPOTS.every((k) => s.stadium[k] >= 2),
  nightfever: (s) => s.stadium.lights >= 1 && s.stadium.stands >= 2,
};
export function combos(s) {
  return COMBOS.filter((c) =>
    c.stadium ? STADIUM_RULES[c.key](s) : s.plots.some((p, i) => p?.type === c.a && neighbours(i).some((j) => s.plots[j]?.type === c.b)),
  );
}
export const hasCombo = (s, key) => combos(s).some((c) => c.key === key);
// Every fifth level of a building is a landmark: its effects count one level extra.
export const landmarkLevel = (level) => level + Math.floor(level / 5);
export const facilityLevel = (s, type) =>
  STADIUM[type] ? s.stadium?.[type] || 0 : s.plots.reduce((n, p) => n + (p?.type === type ? landmarkLevel(p.level) : 0), 0);
// The facility a training plan uses for this athlete.
export function planFacility(plan, a) {
  return plan.facility === "event" ? (a.trainingEvent || a.event) : plan.facility;
}
export const rosterCap = (s) => 6 + 2 * facilityLevel(s, "dorm");

// ── Effects ───────────────────────────────────────────────────────────
const MULT = ["gain", "stamina", "xp", "foul", "mark", "variance", "final", "first", "last", "afterFoul", "trailing", "leading", "teamTrailing", "captain", "restMult", "mentor"];
const ADD = ["rest", "cond", "teamCond", "crowd", "attackBoost", "streak"];
function blank() {
  const e = { train: [1, 1, 1, 1], condFloor: 0, sig: 0, perfect: false, hype: false, safeFirst: false, sources: [] };
  for (const k of MULT) e[k] = 1;
  for (const k of ADD) e[k] = 0;
  return e;
}
function apply(e, d, label) {
  if (!d) return;
  for (const k of MULT) if (typeof d[k] === "number") e[k] *= d[k];
  for (const k of ADD) if (typeof d[k] === "number") e[k] += d[k];
  for (const t of [d.train, d.train2, d.gainStat]) if (t) e.train[t[0]] *= t[1];
  if (d.condFloor) e.condFloor = Math.max(e.condFloor, d.condFloor);
  if (d.sig) e.sig = Math.max(e.sig, d.sig);
  if (d.perfect) e.perfect = true;
  if (d.hype) e.hype = true;
  if (d.safeFirst) e.safeFirst = true;
  if (label) e.sources.push(label);
}
export const equippedSkills = (a, mode = "training") =>
  (a.loadouts?.enabled && Array.isArray(a.loadouts[mode]) ? a.loadouts[mode] : a.equipped || []).filter((k) => a.skills.includes(k) && SKILLS[k]);
export function effects(s, a, club = true, mode = s.match ? "meet" : "training", event = mode === "training" ? (a.trainingEvent || a.event) : EVENT_IDS[s.match?.eventIndex] || a.event) {
  const e = blank();
  apply(e, BACKGROUNDS[a.background]);
  apply(e,PROFILES[a.profile]);
  for (const [i, g] of growthOf(a).entries()) e.train[i] *= g.mult;
  for (const k of equippedSkills(a, mode)) apply(e, SKILLS[k], SKILLS[k].name);
  for (const slot of GEAR_SLOTS) {
    const id = a.gear?.[slot],
      d = ITEMS[id];
    if (!d || (d.event && d.event !== event)) continue;
    apply(e, d, d.name);
    if (d.masteryMark) {
      const [lo, hi, bonus] = d.masteryMark;
      e.mark *= 1 + bonus * clamp((masteryOf(a,event) - lo) / (hi - lo), 0, 1);
    }
    if (club && s.forge?.[id]) e.mark *= 1 + 0.006 * s.forge[id];
  }
  if (a.buff) e.mark *= a.buff;
  if (!club) return e;
  const has = (k) => hasCombo(s, k);
  if (has("ironworks")) e.train[0] *= 1.1;
  if (has("arena")) e.foul *= 0.88;
  if (has("fuel")) e.stamina *= 0.85;
  if (has("spaday")) e.rest += 10;
  if (has("dorms")) e.rest += 5;
  if (has("science")) e.xp *= 1.15;
  e.xp *= 1 + 0.1 * facilityLevel(s, "lab");
  return e;
}

// ── Performance ───────────────────────────────────────────────────────
export function eventRating(a, event) {
  return a.stats.reduce((v, n, i) => v + n * EVENTS[event].weights[i], 0) * (0.60 + 0.40 * masteryOf(a,event)/100);
}
// Distances follow ability until 92% of the world record. Beyond that the curve flattens to a
// square root: breaking a record takes a fully built club stacking everything it has, and every
// metre after that costs more than the last, without ever stopping. A club that invests for a
// very long time can keep pushing.
export function realMark(event, m) {
  const record = EVENTS[event].record,
    knee = record * 0.92,
    room = record * 0.13;
  return m <= knee ? m : knee + 2 * room * (Math.sqrt(1 + (m - knee) / room) - 1);
}
// The current world record: the real one until a club throw beats it.
export const worldRecord = (s, event) => Math.max(EVENTS[event].record, s.worldRecords?.[event]?.mark || 0);
const baseMark = (a, event) => {
  const e = EVENTS[event];
  return e.min + (e.max - e.min) * Math.pow(Math.max(0, eventRating(a, event)) / 100, 1.12);
};
export const rawMark = (a, event) => realMark(event, baseMark(a, event));
// Unsaturated performance, for throws that stack further bonuses before converting to metres.
export function forecastRaw(s, a, event, o = {}) {
  const fx = o.fx || effects(s, a, o.club !== false, "meet", event);
  return (
    baseMark(a, event) *
    MOOD_MARK[moodOf(a)] *
    (0.92 + (0.08 * clamp(a.stamina, 0, 100)) / 100) *
    fx.mark *
    (o.doubleDuty ? 0.97 : 1)
  );
}
export const forecast = (s, a, event, o = {}) => realMark(event, forecastRaw(s, a, event, o));

export function xpMultiplier(s, a) {
  let m = effects(s, a).xp;
  const mentor = s.roster.some(
    (b) => b.id !== a.id && b.level > a.level && equippedSkills(b, s.match ? "meet" : "training").includes("mentor"),
  );
  const peer = s.roster.some(b => b.id !== a.id && !b.injury && b.level > a.level && (b.trainingEvent || b.event) === (a.trainingEvent || a.event) && !["rest", "facilities"].includes(b.plan));
  const lodge = !s.match && peer ? 1 + 0.08 * facilityLevel(s,"lodge") : 1;
  return m * (mentor ? 1.15 : 1) * lodge;
}
export function grantXp(s, a, n, out = null) {
  a.xp += n * xpMultiplier(s, a);
  let gained = 0;
  while (a.xp >= xpNeeded(a.level)) {
    a.xp -= xpNeeded(a.level);
    a.level++;
    gained++;
    a.sp += a.level % 5 === 0 ? 2 : 1;
    const cap = capOf(a);
    a.stats = a.stats.map((v) => Math.min(Math.max(v, cap), v + 0.3));
  }
  if (gained) {
    count(s, "levels", gained);
    out?.push({ id: a.id, name: a.name, level: a.level });
  }
  return gained;
}

// ── Inventory ─────────────────────────────────────────────────────────
export function addItem(s, id, n = 1) {
  if (!ITEMS[id]) return;
  s.bag[id] = (s.bag[id] || 0) + n;
}
export function takeItem(s, id) {
  if (!s.bag[id]) return false;
  if (--s.bag[id] <= 0) delete s.bag[id];
  return true;
}
export function rollRarity(s, luck = 0) {
  return weighted(
    s,
    RARITY_IDS.map((id, i) => [id, RARITY[id].weight * (i ? 1 + luck * i : Math.max(0.3, 1 - luck))]),
  );
}
export function randomItem(s, rarity, filter = () => true) {
  // Skill books only come from the shop's shelf.
  const pool = Object.keys(ITEMS).filter((k) => ITEMS[k].rarity === rarity && ITEMS[k].kind !== "book" && filter(ITEMS[k]));
  return pool.length ? pick(s, pool) : "drink";
}
export const lineupAthletes = (s, lineup = s.lineup) => EVENT_IDS.map((ev) => s.roster.find((a) => a.id === lineup[ev]));
export const fansFactor = (s) => clamp(s.fans / 2000, 0, 1);
export const shopTier = (s, tiers) => tiers.filter((t) => s.fans >= t).length - 1;
export function isFacilityAvailable(s, type) {
  const d = FACILITIES[type];
  return d && s.league >= d.league && (!d.needsTitle || s.trophies.length > 0);
}
export const overall = (a) => Math.round(eventRating(a, a.event));
