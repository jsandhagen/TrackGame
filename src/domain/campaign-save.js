import { newGame, normalizeCareer } from "./game.js";
import { validateSave as validateLegacy } from "./savegame.js";
import {
  EVENT_IDS,
  FACILITIES,
  PLANS,
  TRAITS,
  KIT,
  SKILLS,
} from "../game-content.js";
const validNumber = (n, min, max) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const word = (x) => typeof x === "string" && x.length > 0 && x.length < 120;
export function validateCampaign(input) {
  let data = structuredClone(
    input?.format === "ring-sector-save" ? input.state : input,
  );
  if (data?.v === 2) {
    const old = validateLegacy(data),
      s = newGame();
    s.money = Math.max(500, old.money);
    s.fame = old.fame;
    s.clubName = "Ring & Sector";
    for (let i = 0; i < Math.min(old.athletes.length, 8); i++) {
      const prev = old.athletes[i],
        a = s.roster[i] || structuredClone(s.roster[0]);
      a.id = i + 1;
      a.name = prev.name;
      a.event = prev.evt;
      a.stats = [prev.pow, prev.tec, prev.spd, prev.foc];
      a.energy = prev.energy;
      a.fatigue = prev.fatigue || 0;
      a.form = prev.form || 55;
      a.level = prev.lv;
      a.talent = prev.talent;
      a.hair = prev.hair;
      a.skin = prev.skin;
      if (prev.pb) a.pb[a.event] = prev.pb;
      s.roster[i] = a;
    }
    s.nextId = Math.max(s.nextId, ...s.roster.map((a) => a.id + 1));
    for (const ev of EVENT_IDS)
      s.lineup[ev] = (
        s.roster.find((a) => a.event === ev) ||
        s.roster[EVENT_IDS.indexOf(ev) % s.roster.length]
      ).id;
    return normalizeCareer(s);
  }
  const s = data;
  const bad = () => {
    throw Error("This is not a compatible league-career save.");
  };
  if (
    !s ||
    s.v !== 3 ||
    !word(s.clubName) ||
    !Number.isInteger(s.league) ||
    s.league < 0 ||
    s.league > 4 ||
    !Number.isInteger(s.season) ||
    s.season < 1 ||
    !Number.isInteger(s.day) ||
    s.day < 1 ||
    !Number.isInteger(s.matchDay) ||
    s.matchDay < s.day ||
    !validNumber(s.money, -1e9, 1e12) ||
    !validNumber(s.fame, 0, 1e12) ||
    !["season", "seasonEnd"].includes(s.phase)
  )
    bad();
  if (
    !Array.isArray(s.roster) ||
    s.roster.length < 1 ||
    s.roster.length > 8 ||
    !Array.isArray(s.plots) ||
    s.plots.length !== 9 ||
    s.plots[0]?.type !== "club" ||
    !Array.isArray(s.clubs) ||
    s.clubs.length !== 3
  )
    bad();
  const ids = new Set();
  for (const a of s.roster) {
    if (
      !Number.isInteger(a.id) ||
      ids.has(a.id) ||
      !word(a.name) ||
      !EVENT_IDS.includes(a.event) ||
      !Array.isArray(a.stats) ||
      a.stats.length !== 4 ||
      a.stats.some((v) => !validNumber(v, 0, 100)) ||
      !PLANS[a.plan] ||
      !TRAITS[a.trait] ||
      !KIT[a.kit?.implement] ||
      !KIT[a.kit?.shoes] ||
      !Array.isArray(a.owned) ||
      !a.tuning ||
      !a.pb ||
      !Array.isArray(a.career)
    )
      bad();
    for (const key of ["energy", "fatigue", "form"])
      if (!validNumber(a[key], 0, 100)) bad();
    if (
      !validNumber(a.level, 1, 100000) ||
      !validNumber(a.sessions, 0, 1e9) ||
      !validNumber(a.meets, 0, 1e9)
    )
      bad();
    if (a.skill && !SKILLS[a.skill]) bad();
    if(a.masteryTier != null && (!Number.isInteger(a.masteryTier) || a.masteryTier<0 || a.masteryTier>4)) bad();
    if(a.clinics != null && (!Array.isArray(a.clinics) || a.clinics.length>12 || a.clinics.some(c=>!c || !Number.isInteger(c.stat) || c.stat<0 || c.stat>3 || !validNumber(c.gain,0,2)))) bad();
    ids.add(a.id);
  }
  for (const plot of s.plots)
    if (
      plot &&
      (!FACILITIES[plot.type] ||
        !Number.isInteger(plot.level) ||
        plot.level < 1 ||
        plot.level > 3)
    )
      bad();
  for (const key of [
    "results",
    "history",
    "trophies",
    "log",
    "discovered",
    "prospects",
  ])
    if (!Array.isArray(s[key])) bad();
  if (
    !s.lineup ||
    !Number.isInteger(s.fixture) ||
    s.fixture < 0 ||
    s.fixture > 3 ||
    !Number.isInteger(s.rng) ||
    !Number.isInteger(s.nextId)
  )
    bad();
  for (const ev of EVENT_IDS) if (!ids.has(s.lineup[ev])) bad();
  for (const c of s.clubs)
    if (
      !word(c.name) ||
      !Array.isArray(c.athletes) ||
      c.athletes.length !== 4 ||
      !validNumber(c.points, 0, 100) ||
      !validNumber(c.diff, -100, 100)
    )
      bad();
  if (s.match) {
    const m = s.match;
    if (
      !["intro", "planning", "timing", "result", "complete"].includes(
        m.phase,
      ) ||
      !Number.isInteger(m.eventIndex) ||
      m.eventIndex < 0 ||
      m.eventIndex > 3 ||
      !Array.isArray(m.homeMarks) ||
      !Array.isArray(m.awayMarks) ||
      m.homeMarks.length !== 4 ||
      m.awayMarks.length !== 4 ||
      !s.clubs.some((c) => c.id === m.opponentId)
    )
      bad();
    if (
      ![2, 3].includes(m.attempts) ||
      !Number.isInteger(m.attempt) ||
      m.attempt < 0 ||
      m.attempt >= m.attempts
    )
      bad();
    for (const list of [...m.homeMarks, ...m.awayMarks])
      if (
        !Array.isArray(list) ||
        list.length > m.attempts ||
        list.some((n) => n != null && !validNumber(n, 0, 200))
      )
        bad();
    for (const ev of EVENT_IDS) if (!ids.has(m.lineup?.[ev])) bad();
    if (m.phase === "timing") m.phase = "planning";
  }
  return normalizeCareer(s);
}
export const exportCampaign = (state) => ({
  format: "ring-sector-save",
  version: 3,
  exportedAt: new Date().toISOString(),
  state: validateCampaign(state),
});
