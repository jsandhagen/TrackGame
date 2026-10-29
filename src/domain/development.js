import { systemUnlocked } from "./progression.js";
import { clamp, capOf, count, note } from "./core.js";

// Sporting milestones are automatic and finite. No claim buttons or daily chores.
export const DEVELOPMENT = [
  { id: "belong", name: "Part of the club", field: "meets", target: 3, sp: 1, reward: "1 skill point" },
  { id: "steady", name: "Finding a rhythm", field: "clean", target: 20, stat: 3, reward: "+2 Focus" },
  { id: "breakthrough", name: "New horizons", field: "pbs", target: 6, potential: 2, reward: "+2 potential" },
  { id: "winner", name: "A name to remember", field: "wins", target: 10, sp: 2, reward: "2 skill points" },
  { id: "regular", name: "Club mainstay", field: "meets", target: 20, potential: 2, reward: "+2 potential" },
  { id: "craft", name: "Mastering the craft", field: "clean", target: 100, sp: 2, reward: "2 skill points" },
  { id: "veteran", name: "Built here", field: "meets", target: 40, potential: 2, reward: "+2 potential" },
  { id: "great", name: "Club great", field: "wins", target: 40, potential: 2, reward: "+2 potential" },
];
export const developmentProgress = (a, milestone) => Math.min(milestone.target,
  milestone.field === "meets" ? a.meets : a.development?.[milestone.field] || 0);
export function checkDevelopment(s, a) {
  a.development ??= { clean: 0, pbs: 0, wins: 0, claimed: [] };
  const earned = [];
  for (const d of DEVELOPMENT) {
    if (a.development.claimed.includes(d.id) || developmentProgress(a, d) < d.target) continue;
    a.development.claimed.push(d.id);
    a.sp += d.sp || 0;
    a.potential = clamp(a.potential + (d.potential || 0), 1, 100);
    if (d.stat != null) a.stats[d.stat] = Math.min(capOf(a), a.stats[d.stat] + 2);
    a.career.unshift({ season: s.season, label: d.name + " · " + d.reward });
    a.career = a.career.slice(0, 40);
    count(s, "development");
    note(s, a.name + ": " + d.name + "! " + d.reward + ".", "level");
    earned.push({ id: a.id, name: a.name, milestone: d.name, reward: d.reward });
  }
  return earned;
}
export function saveLoadout(s, id, mode) {
  if (!systemUnlocked(s,"skills")) return false;
  const a = s.roster.find((x) => x.id === id);
  if (!a || s.match || !["training", "meet"].includes(mode)) return false;
  a.loadouts ??= { enabled: false, training: null, meet: null };
  a.loadouts[mode] = [...a.equipped];
  return true;
}
export function enableLoadouts(s, id, enabled) {
  if (!systemUnlocked(s,"skills")) return false;
  const a = s.roster.find((x) => x.id === id);
  if (!a || s.match || (enabled && (!a.loadouts?.training || !a.loadouts?.meet))) return false;
  if (a.loadouts) a.loadouts.enabled = !!enabled;
  return true;
}
