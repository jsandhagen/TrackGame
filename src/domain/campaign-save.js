import { newGame, makeClubs, DEFAULT_SETTINGS } from "./game.js";
import { validateSave as validateLegacy } from "./savegame.js";
import { EVENT_IDS, FACILITIES, PLANS, BACKGROUNDS, ITEMS, SKILLS, RARITY, SPONSORS, SECRETS, GEAR_SLOTS, RANKS } from "../game-content.js";
import { statTotal } from "./core.js";

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
const OLD_PLOTS = [0, 1, 2, 4, 5, 6, 8, 9, 10];
const OLD_FACILITY = { analysis: "studio", recovery: "spa" };

// v3 (0.3–0.4 league careers) → v4.
function fromV3(o) {
  const s = newGame(o.rng);
  Object.assign(s, {
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
  s.plots = Array(12).fill(null);
  o.plots.forEach((p, i) => {
    if (!p) return;
    const type = OLD_FACILITY[p.type] || p.type;
    if (FACILITIES[type]) s.plots[OLD_PLOTS[i]] = { type, level: p.level };
  });
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

function checkAthlete(a, ids, rival = false) {
  if (!a || !int(a.id, 1, 1e9) || ids.has(a.id) || !word(a.name) || !EVENT_IDS.includes(a.event)) bad();
  if (!Array.isArray(a.stats) || a.stats.length !== 4 || a.stats.some((v) => !num(v, 0, 100))) bad();
  for (const k of ["stamina", "condition"]) if (!num(a[k], 0, 100)) bad();
  if (!num(a.level, 1, 1e5) || !num(a.xp, 0, 1e9) || !num(a.sp, 0, 1e5) || !int(a.rank, 0, 4) || !num(a.potential, 1, 100)) bad();
  if (!BACKGROUNDS[a.background] || !RARITY[a.rarity] || !PLANS[a.plan]) bad();
  if (!Array.isArray(a.skills) || a.skills.some((k) => !SKILLS[k]) || !Array.isArray(a.equipped) || a.equipped.some((k) => !a.skills.includes(k))) bad();
  if (!a.gear || GEAR_SLOTS.some((slot) => a.gear[slot] != null && ITEMS[a.gear[slot]]?.slot !== slot)) bad();
  if (!a.pb || typeof a.pb !== "object" || Object.entries(a.pb).some(([ev, m]) => !EVENT_IDS.includes(ev) || !num(m, 0, 200))) bad();
  if (!Array.isArray(a.career) || !int(a.injury, 0, 100) || !a.look || !color(a.look.skin) || !color(a.look.hair)) bad();
  if (a.secret != null && !SECRETS[a.secret]) bad();
  if (a.buff != null && !num(a.buff, 1, 1.2)) bad();
  if (!rival && !num(a.sessions, 0, 1e9)) bad();
  a.seasonStart ??= statTotal(a);
  a.seasonPoints ??= 0;
  a.seasonPbs ??= 0;
  ids.add(a.id);
}
function checkMatch(s, ids) {
  const m = s.match;
  if (!["intro", "live", "decide", "complete"].includes(m.phase) || !int(m.eventIndex, 0, 3) || ![2, 3].includes(m.attempts)) bad();
  if (!s.clubs.some((c) => c.id === m.opponentId) || !["league", "final"].includes(m.kind)) bad();
  for (const key of ["homeMarks", "awayMarks"]) {
    if (!Array.isArray(m[key]) || m[key].length !== 4) bad();
    for (const list of m[key]) if (!Array.isArray(list) || list.length > m.attempts || list.some((n) => n != null && !num(n, 0, 200))) bad();
  }
  for (const key of ["started", "closed"]) if (!Array.isArray(m[key]) || m[key].length !== 4) bad();
  for (const ev of EVENT_IDS) if (!ids.has(m.lineup?.[ev])) bad();
  if (!Array.isArray(m.sigUsed) || !Array.isArray(m.rivalSig)) bad();
}

export function validateCampaign(input) {
  let data = structuredClone(input?.format === "ring-sector-save" ? input.state : input);
  if (data?.v === 2) return fromV2(data);
  if (data?.v === 3) {
    if (!Array.isArray(data.roster) || !data.roster.length || !Array.isArray(data.plots) || !int(data.league, 0, 4)) bad();
    data = fromV3(data);
  }
  const s = data;
  if (!s || s.v !== 4 || !word(s.clubName) || !int(s.league, 0, 4) || !int(s.season, 1, 1e6) || !int(s.day, 1, 1e7) || !int(s.matchDay, s.day, s.day + 30)) bad();
  if (!num(s.money, -1e9, 1e12) || !num(s.fans, 0, 1e12) || !["season", "seasonEnd"].includes(s.phase) || !int(s.fixture, 0, 3)) bad();
  if (!Number.isInteger(s.rng) || !int(s.nextId, 1, 1e9)) bad();
  if (!Array.isArray(s.plots) || s.plots.length !== 12 || s.plots[0]?.type !== "club") bad();
  for (const p of s.plots) if (p && (!FACILITIES[p.type] || !int(p.level, 1, 3))) bad();
  const types = s.plots.filter(Boolean).map((p) => p.type);
  if (new Set(types).size !== types.length) bad();
  if (!Array.isArray(s.roster) || s.roster.length < 1 || s.roster.length > 12) bad();
  const ids = new Set();
  for (const a of s.roster) checkAthlete(a, ids);
  for (const ev of EVENT_IDS) if (!ids.has(s.lineup?.[ev])) bad();
  if (!Array.isArray(s.clubs) || s.clubs.length !== 3) bad();
  const rivalIds = new Set();
  for (const c of s.clubs) {
    if (!word(c.name) || !color(c.color) || !Array.isArray(c.athletes) || c.athletes.length !== 4 || !num(c.points, 0, 100) || !num(c.diff, -100, 100)) bad();
    for (const a of c.athletes) checkAthlete(a, rivalIds, true);
  }
  const prospectIds = new Set();
  if (!Array.isArray(s.prospects) || s.prospects.length > 6) bad();
  for (const a of s.prospects) checkAthlete(a, prospectIds, true);
  for (const key of ["results", "history", "trophies", "log", "discovered", "goals", "secretsOffered", "secretsSigned", "awardHistory", "alumni"]) if (!Array.isArray(s[key])) bad();
  if (!s.bag || Object.entries(s.bag).some(([k, n]) => !ITEMS[k] || !int(n, 1, 9999))) bad();
  if (!s.forge || Object.entries(s.forge).some(([k, n]) => !ITEMS[k] || !int(n, 0, 3))) bad();
  if (!s.counters || Object.values(s.counters).some((n) => !num(n, 0, 1e9))) bad();
  if (!s.records || typeof s.records !== "object") bad();
  if (!SPONSORS[s.sponsor] || !s.colors || !color(s.colors.primary) || !color(s.colors.secondary)) bad();
  s.secretsOffered = s.secretsOffered.filter((k) => SECRETS[k]);
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  if (s.pendingEvent && typeof s.pendingEvent.id !== "string") s.pendingEvent = null;
  if (s.match) checkMatch(s, ids);
  return s;
}
export const exportCampaign = (state) => ({
  format: "ring-sector-save",
  version: 4,
  exportedAt: new Date().toISOString(),
  state: validateCampaign(state),
});
