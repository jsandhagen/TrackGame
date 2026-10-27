import { CUSTOMISE, CUSTOM_IDS, STYLE_DEFAULT } from "../game-content.js";

// Kit and stadium customisation. Options unlock through progress and are then bought once;
// owned options can be switched freely. Kit choices live with the club colours (they travel
// with every sprite); the stadium's look lives in s.stadiumStyle.
const SLOT = { kit: ["colors", "kit"], shorts: ["colors", "shorts"], seats: ["stadiumStyle", "seats"], roof: ["stadiumStyle", "roof"], track: ["stadiumStyle", "track"] };
const DEFAULTS = Object.fromEntries(CUSTOM_IDS.map((cat) => [cat, Object.keys(CUSTOMISE[cat].options)[0]]));

// Fill in anything missing (new careers and older saves) and drop anything unknown.
export function ensureCustom(s) {
  const owned = s.wardrobe && typeof s.wardrobe === "object" ? s.wardrobe : {};
  s.wardrobe = Object.fromEntries(CUSTOM_IDS.map((cat) => {
    const list = Array.isArray(owned[cat]) ? owned[cat].filter((k) => CUSTOMISE[cat].options[k]) : [];
    return [cat, [...new Set([DEFAULTS[cat], ...list])]];
  }));
  s.stadiumStyle = { ...STYLE_DEFAULT, ...(s.stadiumStyle && typeof s.stadiumStyle === "object" ? s.stadiumStyle : {}) };
  s.stadiumStyle.name = cleanName(s.stadiumStyle.name);
  for (const cat of CUSTOM_IDS) {
    const [obj, key] = SLOT[cat];
    if (!s.wardrobe[cat].includes(s[obj][key])) s[obj][key] = DEFAULTS[cat];
  }
  return s;
}
export const selectedCustom = (s, cat) => s[SLOT[cat][0]][SLOT[cat][1]];
export const ownsCustom = (s, cat, key) => s.wardrobe?.[cat]?.includes(key);

const REQ_TEXT = {
  fans: (n) => n.toLocaleString() + " fans",
  league: (n) => ["Community", "County", "Regional", "National", "World"][n] + " League",
  trophies: (n) => n + (n === 1 ? " trophy" : " trophies"),
  stands: (n) => ["", "Bleachers", "a covered main stand", "stands all round", "an Olympic stadium"][n],
  track: (n) => ["", "a gravel track", "a synthetic track", "a championship track"][n],
};
const progress = (s, k) => ({ fans: s.fans, league: s.league, trophies: s.trophies.length, stands: s.stadium.stands, track: s.stadium.track })[k];
// What still stands in the way of an option: unmet requirements first, then money.
export function customLock(s, cat, key) {
  const opt = CUSTOMISE[cat]?.options[key];
  if (!opt) return "Unknown option";
  if (ownsCustom(s, cat, key)) return null;
  const missing = Object.entries(opt.req || {}).filter(([k, n]) => progress(s, k) < n);
  if (missing.length) return "Needs " + missing.map(([k, n]) => REQ_TEXT[k](n)).join(" and ");
  return null;
}
export function customProblem(s, cat, key) {
  const lock = customLock(s, cat, key);
  if (lock || ownsCustom(s, cat, key)) return lock;
  if (s.money < CUSTOMISE[cat].options[key].cost) return "Not enough money";
  return null;
}
export function buyCustom(s, cat, key) {
  if (ownsCustom(s, cat, key) || customProblem(s, cat, key)) return false;
  s.money -= CUSTOMISE[cat].options[key].cost;
  s.wardrobe[cat].push(key);
  return useCustom(s, cat, key);
}
export function useCustom(s, cat, key) {
  if (!ownsCustom(s, cat, key)) return false;
  const [obj, slot] = SLOT[cat];
  s[obj][slot] = key;
  return true;
}
function cleanName(name) {
  return typeof name === "string" ? name.replace(/[^\p{L}\p{N} &'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 24) : "";
}
// Naming the stadium is free; an empty name falls back to the club's name.
export function renameStadium(s, name) {
  s.stadiumStyle.name = cleanName(name);
  return true;
}
