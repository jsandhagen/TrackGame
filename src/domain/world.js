// The world beyond the club: the elite throwers' marks year by year, a world list per event that
// your athletes join once they're good enough, and a world ranking for everyone else.
import { EVENTS, EVENT_IDS, ELITES } from "../game-content.js";
import { dateOf } from "./calendar.js";
import { worldRecord } from "./core.js";

// A fixed number in [0, 1) for each input: the elites' years are the same in every replay.
const unit = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const idNum = (id) => [...id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) % 9973;
export const yearOf = (s) => dateOf(s.day).year;

// An elite's best this year: their level, a good or bad year of up to ±1.5%, never past the
// world record standing at the time.
export function eliteMark(s, e, year = yearOf(s)) {
  const form = (unit(idNum(e.id) + year * 17) - 0.5) * 0.03;
  return +Math.min(worldRecord(s, e.event) - 0.01, EVENTS[e.event].record * (e.level + form)).toFixed(2);
}
// Where a mark sits in the world: the elites are the top few; below them the field thickens
// fast, so ten per cent off the leader is around 130th and a novice is somewhere in the thousands.
export function worldRank(s, ev, mark, year = yearOf(s)) {
  if (!mark) return null;
  const elites = ELITES.filter((e) => e.event === ev).map((e) => eliteMark(s, e, year)).sort((a, b) => b - a);
  const above = elites.filter((m) => m > mark).length;
  if (above < elites.length) return above + 1;
  const behind = Math.max(0, (elites[0] - mark) / elites[0]);
  return Math.min(50000, Math.max(elites.length + 1, elites.length + Math.round(18000 * behind ** 2.3 + 400 * behind)));
}
// The world list: the elites' marks this year plus any of your athletes in among them.
export function worldList(s, ev, year = yearOf(s), size = 5) {
  const rows = ELITES.filter((e) => e.event === ev).map((e) => ({ elite: e, name: e.name, nation: e.nation, mark: eliteMark(s, e, year) }));
  for (const a of s.roster) if (a.pb?.[ev]) rows.push({ athlete: a, name: a.name, nation: "YOU", mark: a.pb[ev] });
  // Your athletes show their true world rank, which may be far below the elites they're listed under.
  return rows.sort((a, b) => b.mark - a.mark).slice(0, size).map((r, i) => ({ ...r, rank: r.athlete ? worldRank(s, ev, r.mark, year) : i + 1 }));
}
// Your best in each event and how far it is from the top of the world.
export function clubVersusWorld(s, year = yearOf(s)) {
  return EVENT_IDS.map((ev) => {
    const best = [...s.roster].filter((a) => a.pb?.[ev]).sort((a, b) => b.pb[ev] - a.pb[ev])[0];
    const top = worldList(s, ev, year, 1)[0];
    const mark = best?.pb[ev] ?? null;
    return { event: ev, athlete: best || null, mark, rank: mark ? worldRank(s, ev, mark, year) : null, leader: top, gap: mark ? Math.max(0, +(top.mark - mark).toFixed(2)) : null };
  });
}
