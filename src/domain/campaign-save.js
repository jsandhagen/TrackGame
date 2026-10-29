import { initMastery, PROFILES, APPROACHES } from "./mastery.js";
import { ensureCustom } from "./customize.js";
import { newGame, makeClubs, DEFAULT_SETTINGS } from "./game.js";
import { validateSave as validateLegacy } from "./savegame.js";
import { EVENT_IDS, CLUBS, FACILITIES, STADIUM, PLANS, BACKGROUNDS, ITEMS, SKILLS, RARITY, SPONSORS, SECRETS, GEAR_SLOTS, RANKS, PLOT_COUNT, CLUB_PLOT, PLOT_ORDER, PLOTS_BY_LEAGUE, ATHLETE_TYPES } from "../game-content.js";
import { syncMarks } from "./meet.js";
import { statTotal, slotsOf, typeFor, BASE_STAMINA, MAX_STAMINA } from "./core.js";
import { dutySite } from "./facility-duties.js";
import { DEVELOPMENT } from "./development.js";
import { DRILLS, CHEMISTRY } from "./coaching.js";
import { WEATHER, weatherSeedFrom } from "./calendar.js";
import { ALL_STAR_ID, ensureInvitations, clubById } from "./invitational.js";
import { rivalBase, rivalMastery } from "./competition.js";
import { STORY, STORY_RECENT_LIMIT } from "./story.js";

const num = (n, min, max) => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const int = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const word = (x) => typeof x === "string" && x.length > 0 && x.length < 120;
const color = (x) => typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x);
const bad = () => {
  throw Error("This is not a compatible Ring & Sector career save.");
};

const OLD_TRAITS = { technician: "gymnast", powerhouse: "farm", explosive: "sprinter", composed: "poker", resilient: "marathon" };
const OLD_PLANS = { recover: "rest" };
const OLD_KIT = { control: "precision", distance: "competition", development: "weighted", support: "support", reactive: "spikes" };
const OLD_SKILLS = { student: "quickstudy", steady: "icevein", closer: "clutch", rhythm: "metronome", explosive: "gymrat", chain: "highroller", comeback: "secondwind", captain: "captain", limitbreak: null };
const OLD_FACILITY = { analysis: "studio", recovery: "spa" };

// Pre-0.5 grounds → a stadium plus building plots on the streets around it.
function relayout(s, oldPlots, league) {
  s.plots = Array(PLOT_COUNT).fill(null);
  s.stadium = Object.fromEntries(Object.entries(STADIUM).map(([k, d]) => [k, d.start]));
  const open = PLOT_ORDER.slice(0, PLOTS_BY_LEAGUE[league]).filter((i) => i !== CLUB_PLOT);
  for (const p of oldPlots) {
    if (!p) continue;
    const type = OLD_FACILITY[p.type] || p.type,
      L = Math.max(1, Math.min(3, p.level | 0));
    if (type === "club") s.plots[CLUB_PLOT] = { type, level: L };
    else if (type === "rings") {
      s.stadium.shot = Math.max(s.stadium.shot, L);
      s.stadium.jav = Math.max(s.stadium.jav, L - 1);
      s.stadium.discus = Math.max(s.stadium.discus, L - 1);
      s.stadium.hammer = Math.max(s.stadium.hammer, L - 1);
    } else if (type === "sprint") s.stadium.track = Math.max(s.stadium.track, L);
    else if (type === "studio" || type === "stands") s.stadium[type] = Math.max(s.stadium[type], L);
    else if (FACILITIES[type] && open.length && !s.plots.some((q) => q?.type === type)) s.plots[open.shift()] = { type, level: L };
    else if (FACILITIES[type]) s.money += Math.round(FACILITIES[type].cost / 2);
  }
  s.plots[CLUB_PLOT] ??= { type: "club", level: 1 };
}

// v3 (0.3–0.4 league careers) → current.
function fromV3(o) {
  const s = newGame(o.rng);
  Object.assign(s, {
    v: 5,
    rng: o.rng >>> 0 || 1,
    nextId: o.nextId,
    clubName: o.clubName,
    money: o.money,
    fans: Math.round(20 + (o.fame || 0) * 4),
    day: o.day,
    season: o.season,
    league: o.league,
    fixture: o.fixture,
    matchDay: o.matchDay,
    phase: o.phase,
    results: o.results || [],
    history: o.history || [],
    trophies: o.trophies || [],
    log: (o.log || []).slice(0, 20).map((l) => ({ day: l.day, season: o.season, text: String(l.text), kind: "info" })),
    champion: o.champion,
    finalOpponent: o.finalOpponent,
    rebuildStreak: o.rebuildStreak || 0,
    welcomed: !!o.welcomed,
    alumni: o.alumni || [],
    match: null,
    bag: { drink: 3, cake: 2 },
    lineup: { ...o.lineup },
  });
  relayout(s, o.plots, o.league);
  s.roster = o.roster.map((a) => {
    const skills = [];
    const map = OLD_SKILLS[a.skill];
    if (map) skills.push(map);
    const gear = { implement: OLD_KIT[a.kit?.implement] || null, shoes: OLD_KIT[a.kit?.shoes] || null, charm: null };
    for (const owned of a.owned || []) if (OLD_KIT[owned] && !Object.values(gear).includes(OLD_KIT[owned])) s.bag[OLD_KIT[owned]] = (s.bag[OLD_KIT[owned]] || 0) + 1;
    const rank = Math.min(4, Math.max(0, ...RANKS.map((r, i) => (a.level >= r.level && !r.title ? i : 0))));
    const out = {
      id: a.id,
      name: a.name,
      event: a.event,
      stats: a.stats.map((v) => Math.max(1, Math.min(100, v))),
      stamina: Math.round(Math.max(10, Math.min(100, a.energy - a.fatigue * 0.3))),
      condition: Math.round(a.form),
      level: a.level,
      xp: 0,
      sp: Math.min(8, Math.floor(a.level / 2) + 1),
      rank,
      potential: Math.min(90, Math.round(a.talent * 0.78)),
      background: OLD_TRAITS[a.trait] || "farm",
      rarity: "common",
      skills,
      equipped: [...skills],
      gear,
      plan: OLD_PLANS[a.plan] || (PLANS[a.plan] ? a.plan : "balanced"),
      autoRest: true,
      autoTaper: a.autoTaper !== false,
      sessions: a.sessions || 0,
      meets: a.meets || 0,
      pb: { ...a.pb },
      career: a.career || [],
      injury: a.injury || 0,
      look: { skin: a.skin, hair: a.hair, style: (a.hairstyle || 0) % 6 },
      secret: null,
      buff: null,
      seasonPoints: 0,
      seasonPbs: 0,
    };
    out.potential = Math.max(out.potential, Math.ceil(Math.max(...out.stats)));
    out.seasonStart = statTotal(out);
    return out;
  });
  for (const a of s.roster)
    for (const ev of EVENT_IDS) if (a.pb[ev] && (!s.records[ev] || a.pb[ev] > s.records[ev].mark)) s.records[ev] = { mark: a.pb[ev], name: a.name, season: s.season };
  s.clubs = makeClubs(s, s.league);
  (o.clubs || []).forEach((c, i) => {
    if (!s.clubs[i]) return;
    Object.assign(s.clubs[i], { points: c.points || 0, diff: c.diff || 0, played: c.played || 0 });
  });
  s.discovered = [];
  s.prospects = [];
  if (s.matchDay < s.day) s.matchDay = s.day;
  // An interrupted v3 meet cannot map onto the new meet engine; replay it from the lobby.
  if (o.match && !o.match.settled) s.matchDay = Math.max(s.day, o.matchDay);
  if (o.match?.settled) {
    if (o.match.kind === "final") {
      s.phase = "seasonEnd";
      s.champion = o.match.score > o.match.against;
    } else {
      s.fixture = Math.min(3, o.fixture + 1);
      s.matchDay = s.day + 7;
    }
  }
  return s;
}
function fromV2(input) {
  const old = validateLegacy(input),
    s = newGame();
  s.money = Math.max(500, old.money);
  s.fans = 20 + Math.round(old.fame * 4);
  for (let i = 0; i < Math.min(old.athletes.length, 4); i++) {
    const prev = old.athletes[i],
      a = s.roster[i];
    a.name = prev.name;
    a.event = prev.evt;
    a.stats = [prev.pow, prev.tec, prev.spd, prev.foc];
    a.level = prev.lv;
    a.potential = Math.max(60, Math.round(prev.talent * 0.78), Math.ceil(Math.max(...a.stats)));
    a.look = { skin: prev.skin || a.look.skin, hair: prev.hair || a.look.hair, style: i % 6 };
    if (prev.pb) a.pb[a.event] = prev.pb;
    a.seasonStart = statTotal(a);
  }
  for (const ev of EVENT_IDS) s.lineup[ev] = (s.roster.find((a) => a.event === ev) || s.roster[EVENT_IDS.indexOf(ev)]).id;
  return s;
}

// Existing careers keep their league, trophies and active fixtures. Their current
// league is treated as a Championship so an update never makes them start over.
function fromV5(s) {
  const cleared = new Set();
  for (let tier = 0; tier < s.league; tier++) for (let stage = 0; stage < 3; stage++) cleared.add(`${tier}:${stage}`);
  for (const t of s.trophies || []) for (let stage = 0; stage < 3; stage++) cleared.add(`${t.league}:${stage}`);
  for (let stage = 0; stage < 2; stage++) cleared.add(`${s.league}:${stage}`);
  s.circuit = { cleared: [...cleared], duels: [] };
  s.competition = { kind: "league", tier: s.league, stage: 2, rival: 0, spacing: 7, startDay: s.matchDay };
  s.clubTier = s.league;
  s.clubStage = 2;
  for (const a of [...(s.roster || []), ...(s.prospects || []), ...(s.clubs || []).flatMap((c) => c.athletes || [])]) {
    a.development = { clean: 0, pbs: 0, wins: 0, claimed: [] };
    a.loadouts = { enabled: false, training: null, meet: null };
  }
  s.v = 6;
  return s;
}

function checkAthlete(a, ids, rival = false) {
  if (!a || !int(a.id, 1, 1e9) || ids.has(a.id) || !word(a.name) || !EVENT_IDS.includes(a.event)) bad();
  if (!Array.isArray(a.stats) || a.stats.length !== 4 || a.stats.some((v) => !num(v, 0, 1e4))) bad();
  if (a.stars != null && (!int(a.stars, 0, 1e4) || (a.stars && a.rank !== 4))) bad();
  // Saves from before trainable max stamina had a 100-point tank.
  a.maxStamina ??= BASE_STAMINA;
  if (!num(a.maxStamina, BASE_STAMINA, MAX_STAMINA) || !num(a.stamina, 0, a.maxStamina) || !num(a.condition, 0, 100)) bad();
  if (!num(a.level, 1, 1e5) || !num(a.xp, 0, 1e9) || !num(a.sp, 0, 1e5) || !int(a.rank, 0, 4) || !num(a.potential, 1, 100)) bad();
  if (!BACKGROUNDS[a.background] || !RARITY[a.rarity] || !PLANS[a.plan]) bad();
  if (!Array.isArray(a.skills) || a.skills.some((k) => !SKILLS[k]) || !Array.isArray(a.equipped) || a.equipped.some((k) => !a.skills.includes(k))) bad();
  if (!a.gear || GEAR_SLOTS.some((slot) => a.gear[slot] != null && ITEMS[a.gear[slot]]?.slot !== slot)) bad();
  if (!a.pb || typeof a.pb !== "object" || Object.entries(a.pb).some(([ev, m]) => !EVENT_IDS.includes(ev) || !num(m, 0, 1e4))) bad();
  if (!Array.isArray(a.career) || !int(a.injury, 0, 100) || !a.look || !color(a.look.skin) || !color(a.look.hair)) bad();
  if (a.secret != null && !SECRETS[a.secret]) bad();
  if (a.buff != null && !num(a.buff, 1, 1.2)) bad();
  if (!rival && !num(a.sessions, 0, 1e9)) bad();
  if (!a.development || !["clean", "pbs", "wins"].every((k) => int(a.development[k], 0, 1e9)) ||
      !Array.isArray(a.development.claimed) || a.development.claimed.some((k) => !DEVELOPMENT.some((d) => d.id === k)) ||
      new Set(a.development.claimed).size !== a.development.claimed.length) bad();
  const presets = a.loadouts;
  if (!presets || typeof presets.enabled !== "boolean") bad();
  for (const mode of ["training", "meet"]) {
    const list = presets[mode];
    if (list !== null && (!Array.isArray(list) || list.length > slotsOf(a) || new Set(list).size !== list.length || list.some((k) => !a.skills.includes(k)))) bad();
    if (presets.enabled && !Array.isArray(list)) bad();
  }
  a.type ??= typeFor(a.id, a.event);
  if(!ATHLETE_TYPES[a.type]) bad();
  if(!EVENT_IDS.includes(a.trainingEvent)||!PROFILES[a.profile]) bad();
  for(const ev of EVENT_IDS) if(!num(a.mastery?.[ev],0,100)||!int(a.eventMeets?.[ev],0,1e7)||!APPROACHES[ev].some(d=>d.id===a.approaches?.[ev])) bad();
  a.facilityFocus ??= "balanced";
  if(!["balanced","money","insights"].includes(a.facilityFocus)) bad();
  a.coachedDay ??= 0;
  if (!int(a.coachedDay,0,1e7)) bad();
  a.seasonStart ??= statTotal(a);
  a.seasonPoints ??= 0;
  a.seasonPbs ??= 0;
  ids.add(a.id);
}
function checkMatch(s, ids) {
  const m = s.match;
  if (!["intro", "live", "decide", "complete"].includes(m.phase) || !int(m.eventIndex, 0, 3) || ![2, 3, 6].includes(m.attempts)) bad();
  if (!clubById(s, m.opponentId) || !["league", "final", "duel", "cup"].includes(m.kind)) bad();
  if ((m.kind === "duel") !== (s.competition?.kind === "duel") || (m.kind === "cup") !== (s.competition?.kind === "cup")) bad();
  for (const key of ["homeMarks", "awayMarks"]) {
    if (!Array.isArray(m[key]) || m[key].length !== 4) bad();
    for (const list of m[key]) if (!Array.isArray(list) || list.length > 6 || list.some((n) => n != null && !num(n, 0, 200))) bad();
  }
  for (const key of ["started", "closed"]) if (!Array.isArray(m[key]) || m[key].length !== 4) bad();
  for (const ev of EVENT_IDS) if (m.lineup?.[ev] != null && !ids.has(m.lineup[ev])) bad();
  if (m.fields) {
    if (!Array.isArray(m.fields) || m.fields.length !== 4 || !int(m.entryIndex,0,2) || typeof m.finalRound !== "boolean") bad();
    const rival = clubById(s, m.opponentId);
    for (const f of m.fields) for (const side of ["home","away"]) {
      if (!Array.isArray(f[side]) || f[side].length > 3 || new Set(f[side].map((e) => e.id)).size !== f[side].length) bad();
      for (const e of f[side]) if (!(side === "home" ? ids.has(e.id) : rival.athletes.some((a) => a.id === e.id)) || !Array.isArray(e.marks) || e.marks.length > 6 || e.marks.some((n) => n != null && !num(n,0,200)) || typeof e.finalist !== "boolean") bad();
    }
    syncMarks(s);
  }
  if (!Array.isArray(m.sigUsed) || !Array.isArray(m.rivalSig)) bad();
  if (m.weather != null && !WEATHER[m.weather]) bad();
}

export function validateCampaign(input) {
  let data = structuredClone(input?.format === "ring-sector-save" ? input.state : input);
  if (data?.v === 2) return fromV2(data);
  if (data?.v === 4 && Array.isArray(data.plots)) {
    // 0.5 development saves: same career model, old 12-plot grounds.
    data.money ??= 0;
    relayout(data, data.plots, data.league);
    data.v = 5;
  }
  if (data?.v === 3) {
    if (!Array.isArray(data.roster) || !data.roster.length || !Array.isArray(data.plots) || !int(data.league, 0, 4)) bad();
    data = fromV3(data);
  }
  if (data?.v === 5) { if (!int(data.league,0,4)) bad(); data = fromV5(data); }
  if (data?.v === 6) {
    data.coaching = { insights: 8, unlocked: [], practiceDays: 0 };
    data.v = 7;
  }
  if(data?.v===7) {
    for(const a of [...(data.roster||[]),...(data.prospects||[]),...(data.clubs||[]).flatMap(c=>c.athletes||[])]) initMastery(a,true);
    for(const c of data.clubs||[]) for(const a of c.athletes||[]) {
      const tier=data.clubTier??data.league;
      a.mastery[a.event]=Math.max(a.mastery[a.event],Math.min(100,[30,56,70,82,90][tier]));
      a.eventMeets[a.event]=Math.max(a.eventMeets[a.event],tier*4);
    }
    data.rivalClubs={};data.v=8;
  }
  const s = data;
  if (!s || s.v !== 8 || !word(s.clubName) || !int(s.league, 0, 4) || !int(s.season, 1, 1e6) || !int(s.day, 1, 1e7)) bad();
  if (!num(s.money, -1e9, 1e12) || !num(s.fans, 0, 1e12) || !["planning", "season", "seasonEnd"].includes(s.phase) || !int(s.fixture, 0, 3)) bad();
  if (s.phase === "planning") {
    if (s.competition !== null || s.matchDay !== null || s.match) bad();
  } else {
    const c = s.competition;
    if (!c || !["duel", "league", "cup"].includes(c.kind) || !int(c.tier, 0, s.league) || !int(c.stage, 0, 2) ||
        !int(c.rival, 0, CLUBS[c.tier].length - 1) || ![4, 7, 10].includes(c.spacing) || !int(c.startDay, 1, s.day + 30) || !int(s.matchDay, s.day, s.day + 30)) bad();
    if (c.kind !== "league" && (s.fixture !== 0 || s.phase === "seasonEnd")) bad();
    if (c.kind === "cup" && (!s.invitations?.offer?.club || s.invitations.offer.tier !== c.tier)) bad();
  }
  if (!int(s.clubTier, 0, 4) || !int(s.clubStage, 0, 2)) bad();
  if (s.competition && (s.clubTier !== s.competition.tier || s.clubStage !== s.competition.stage)) bad();
  if (!s.circuit || !Array.isArray(s.circuit.cleared) || !Array.isArray(s.circuit.duels)) bad();
  for (const [list,max,pattern] of [[s.circuit.cleared,15,/^[0-4]:[0-2]$/],[s.circuit.duels,30,/^[0-4]:[0-5]$/]]) {
    if (list.length > max || new Set(list).size !== list.length || list.some(k => typeof k !== "string" || !pattern.test(k))) bad();
  }
  if (!s.coaching || !int(s.coaching.insights,0,1e9) || !int(s.coaching.practiceDays,0,1e9) || !Array.isArray(s.coaching.unlocked) || new Set(s.coaching.unlocked).size !== s.coaching.unlocked.length || s.coaching.unlocked.some((id) => !PLANS[id]?.course)) bad();
  for (const a of s.roster || []) if (PLANS[a.plan]?.course && !s.coaching.unlocked.includes(a.plan)) bad();
  s.coaching.drills ??= {};
  s.coaching.chemistry ??= [];
  if (!Array.isArray(s.coaching.chemistry) || new Set(s.coaching.chemistry).size !== s.coaching.chemistry.length || s.coaching.chemistry.some((k) => !CHEMISTRY.some((c) => c.key === k))) bad();
  s.coaching.spare ??= 0;
  if (!num(s.coaching.spare, 0, 1)) bad();
  if (typeof s.coaching.drills !== "object" || Array.isArray(s.coaching.drills) || Object.entries(s.coaching.drills).some(([k, n]) => !DRILLS[k] || !int(n, 0, 1e7))) bad();
  if (!Number.isInteger(s.rng) || !int(s.nextId, 1, 1e9)) bad();
  s.weatherSeed ??= weatherSeedFrom(s.rng);
  if (!int(s.weatherSeed, 0, 2 ** 32 - 1)) bad();
  if (!Array.isArray(s.plots) || s.plots.length !== PLOT_COUNT || s.plots[CLUB_PLOT]?.type !== "club") bad();
  for (const p of s.plots) if (p && (!FACILITIES[p.type] || !int(p.level, 1, FACILITIES[p.type].maxLevel ?? 99))) bad();
  const types = s.plots.filter(Boolean).map((p) => p.type).filter((k) => !FACILITIES[k].decor);
  if (new Set(types).size !== types.length) bad();
  if (!s.stadium || Object.keys(STADIUM).some((k) => !int(s.stadium[k], 0, STADIUM[k].max))) bad();
  if (!Array.isArray(s.roster) || s.roster.length < 1 || s.roster.length > 12) bad();
  const ids = new Set();
  for (const a of s.roster) checkAthlete(a, ids);
  s.facilityDuties ??= {};
  if(typeof s.facilityDuties!=="object" || Array.isArray(s.facilityDuties)) bad();
  const assigned=Object.values(s.facilityDuties);
  if(new Set(assigned).size!==assigned.length || Object.entries(s.facilityDuties).some(([key,id])=>!dutySite(s,key)||!ids.has(id))) bad();
  for (const ev of EVENT_IDS) if (s.lineup?.[ev] != null && !ids.has(s.lineup[ev])) bad();
  if (s.entries != null) {
    for (const ev of EVENT_IDS) if (!Array.isArray(s.entries[ev]) || s.entries[ev].length > 3 || new Set(s.entries[ev]).size !== s.entries[ev].length || s.entries[ev].some((id) => !ids.has(id)) || (s.entries[ev][0] || null) !== (s.lineup[ev] || null)) bad();
    const all = EVENT_IDS.flatMap((ev) => s.entries[ev]);
    if (all.some((id) => all.filter((n) => n === id).length > 2)) bad();
  }
  if (!Array.isArray(s.clubs) || ![3,6].includes(s.clubs.length)) bad();
  if(s.competition?.kind === "league" && s.clubs.length !== 3) bad();
  const clubIds = new Set();
  const rivalIds = new Set();
  for (const c of s.clubs) {
    if(!int(c.id,0,5) || clubIds.has(c.id)) bad();
    clubIds.add(c.id);
    if (!word(c.name) || !color(c.color) || !Array.isArray(c.athletes) || (c.athletes.length < 4 || c.athletes.length > 6) || !num(c.points, 0, 100) || !num(c.diff, -1000, 1000)) bad();
    for (const a of c.athletes) checkAthlete(a, rivalIds, true);
  }
  if(!s.rivalClubs || typeof s.rivalClubs!=="object" || Array.isArray(s.rivalClubs) || Object.keys(s.rivalClubs).length>5) bad();
  for(const [tier,clubs] of Object.entries(s.rivalClubs)) {
    if(!/^[0-4]$/.test(tier)||!Array.isArray(clubs)||![3,6].includes(clubs.length)) bad();
    const cacheIds=new Set(), cacheClubs=new Set();
    for(const c of clubs) {
      if(!int(c.id,0,5) || cacheClubs.has(c.id)) bad();
      cacheClubs.add(c.id);
      if(!word(c.name)||!color(c.color)||!Array.isArray(c.athletes)||c.athletes.length<4||c.athletes.length>6) bad();
      for(const a of c.athletes)checkAthlete(a,cacheIds,true);
    }
  }
  // Invitationals: the next one due, a pending offer with its All-Star Select, and wins.
  const inv = ensureInvitations(s);
  if (!int(inv.next, 1, 1e7) || !int(inv.offered, 0, 1e6) || !Array.isArray(inv.won)) bad();
  if (inv.offer) {
    const o = inv.offer;
    if (!word(o.name) || !word(o.venue) || !word(o.backdrop) || !int(o.day, 1, 1e7) || !int(o.tier, 0, s.league) || !ITEMS[o.prize]) bad();
    if (o.club != null) {
      if (o.club.id !== ALL_STAR_ID || !word(o.club.name) || !color(o.club.color) || !Array.isArray(o.club.athletes) || o.club.athletes.length < 4 || o.club.athletes.length > 6) bad();
      const starIds = new Set();
      for (const a of o.club.athletes) checkAthlete(a, starIds, true);
    }
  }
  const prospectIds = new Set();
  if (!Array.isArray(s.prospects) || s.prospects.length > 6) bad();
  for (const a of s.prospects) checkAthlete(a, prospectIds, true);
  for (const key of ["results", "history", "trophies", "log", "discovered", "goals", "secretsOffered", "secretsSigned", "awardHistory", "alumni"]) if (!Array.isArray(s[key])) bad();
  s.recentStoryEvents ??= [];
  if (!Array.isArray(s.recentStoryEvents) || s.recentStoryEvents.length > STORY_RECENT_LIMIT || new Set(s.recentStoryEvents).size !== s.recentStoryEvents.length || s.recentStoryEvents.some((id) => typeof id !== "string" || !STORY[id]?.weight)) bad();
  if (!s.bag || Object.entries(s.bag).some(([k, n]) => !ITEMS[k] || !int(n, 1, 9999))) bad();
  if (!s.forge || Object.entries(s.forge).some(([k, n]) => !ITEMS[k] || !int(n, 0, 999))) bad();
  if (!s.counters || Object.values(s.counters).some((n) => !num(n, 0, 1e9))) bad();
  if (!s.records || typeof s.records !== "object") bad();
  s.worldRecords ??= {};
  if (typeof s.worldRecords !== "object" || Array.isArray(s.worldRecords) || Object.entries(s.worldRecords).some(([ev, r]) => !EVENT_IDS.includes(ev) || !num(r?.mark, 0, 1000) || !word(r.name))) bad();
  if (!SPONSORS[s.sponsor] || !s.colors || !color(s.colors.primary) || !color(s.colors.secondary)) bad();
  ensureCustom(s);
  s.secretsOffered = s.secretsOffered.filter((k) => SECRETS[k]);
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  if (s.pendingEvent && typeof s.pendingEvent.id !== "string") s.pendingEvent = null;
  if (s.match) checkMatch(s, ids);
  rebalanceRivals(s);
  return s;
}
// Balance 2 put every rival on one difficulty curve. Older saves keep their named rivals,
// lifted to the strength their stage now calls for and without the retired finals charm.
export const BALANCE = 2;
function rebalanceRivals(s) {
  if ((s.balance || 1) >= BALANCE) return;
  const pools = [...Object.entries(s.rivalClubs).map(([tier, clubs]) => [+tier, clubs]), [s.clubTier, s.clubs]];
  const seen = new Set();
  for (const [tier, clubs] of pools) for (const c of clubs) {
    if (seen.has(c)) continue;
    seen.add(c);
    const stage = c.developedStage ?? (tier === s.clubTier ? s.clubStage : 0),
      specialists = c.athletes.slice(0, 4),
      mean = specialists.reduce((n, a) => n + a.stats.reduce((t, v) => t + v, 0) / 4, 0) / specialists.length,
      lift = Math.max(0, rivalBase(tier, stage) + 2 - mean);
    for (const a of c.athletes) {
      a.stats = a.stats.map((v) => Math.min(100, v + lift));
      a.mastery[a.event] = Math.max(a.mastery[a.event], rivalMastery(tier, stage));
      if (a.gear?.charm === "medal") a.gear.charm = "chalk";
    }
  }
  s.balance = BALANCE;
}
export const exportCampaign = (state) => ({
  format: "ring-sector-save",
  version: 8,
  exportedAt: new Date().toISOString(),
  state: validateCampaign(state),
});
