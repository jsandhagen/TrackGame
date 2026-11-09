// The things athletics keeps count of beyond the result: season's bests, division records,
// championship medals and the head-to-head record between two throwers who keep meeting.
// Everything here is stored lazily, so older saves pick it up without a migration.
import { DIVISIONS } from "../game-content.js";
import { dateOf } from "./calendar.js";

const yearOf = (s) => dateOf(s.day).year;

// ── Season's best ─────────────────────────────────────────────────────
// An athlete's best this calendar year, per event. The first mark of a year sets it quietly;
// improving it later in the year is a season's best worth calling.
export const seasonBest = (s, a, ev) => (a?.sb?.year === yearOf(s) ? a.sb.marks[ev] || 0 : 0);
export function recordSeasonBest(s, a, ev, mark) {
  const year = yearOf(s);
  if (a.sb?.year !== year) a.sb = { year, marks: {} };
  const old = a.sb.marks[ev] || 0;
  if (mark > old) a.sb.marks[ev] = mark;
  return old > 0 && mark > old;
}

// ── Division records ──────────────────────────────────────────────────
// Each division keeps a record per event, standing a little past the top of its distance band
// until somebody (your thrower or a rival) beats it in a league meet.
export const DIVISION_RECORD_START = 1.03;
export function divisionRecord(s, index, ev) {
  const set = s.divisionRecords?.[index]?.[ev];
  return set || { mark: +(DIVISIONS[index].marks[ev][1] * DIVISION_RECORD_START).toFixed(2), name: null, club: null };
}
// The division a meet's marks count for: league duels and the league championship.
export function recordDivision(s, m = s.match) {
  if (!m || !["league", "final"].includes(m.kind) || s.competition?.kind !== "league") return null;
  return DIVISIONS[s.competition.tier * 3 + (s.competition.stage || 0)]?.index ?? null;
}
export function setDivisionRecord(s, index, ev, entry) {
  ((s.divisionRecords ??= {})[index] ??= {})[ev] = entry;
}
export const divisionRecordReward = (index) => ({ money: Math.round(DIVISIONS[index].titlePrize * 0.2 / 5) * 5, fans: 20 + 8 * index });

// ── Championship medals ───────────────────────────────────────────────
export const medalsOf = (a) => a?.medals || [0, 0, 0];
export function awardMedal(a, place) {
  if (!(place >= 1 && place <= 3)) return false;
  a.medals = [...medalsOf(a)];
  a.medals[place - 1]++;
  return true;
}
export const MEDAL_NAMES = ["Gold", "Silver", "Bronze"];

// ── Head-to-head ──────────────────────────────────────────────────────
// Rival clubs keep their people, so the same two throwers meet again and again. Each event they
// share adds a win or a loss to their head-to-head record. Once they have met RIVALRY_MEETINGS
// times, one of them becomes the athlete's rival: the name in the call room, the peg they look
// for on the field. A rival is someone to be measured against, so the choice goes to the
// opponent who has traded wins with them, and then to the one who keeps finishing closest.
export const RIVALRY_MEETINGS = 2;
export const headToHead = (s, homeId, awayId) => s.rivalries?.[homeId]?.[awayId] || null;
// gap: how far apart their best marks were, as a share of the better one (1 when one had no mark).
export function recordHeadToHead(s, home, away, club, ev, won, gap = 1) {
  const book = ((s.rivalries ??= {})[home.id] ??= {});
  const row = (book[away.id] ??= { w: 0, l: 0, gap: 0, name: away.name, club: club?.name || "", event: ev });
  row[won ? "w" : "l"]++;
  row.gap = (row.gap || 0) + Math.max(0, Math.min(1, gap));
  row.name = away.name;
  row.club = club?.name || row.club;
  row.event = ev;
  row.last = s.day;
  return row;
}
// The rival: the opponent with the most wins traded, then the smallest average gap, then the
// most meetings. A rivalry needs feeding: once the club has moved on to new opponents, a thrower met in the
// last RIVALRY_FRESH days takes over from one who has not been seen since.
export const RIVALRY_FRESH = 90;
export function rivalOf(s, a) {
  const book = s.rivalries?.[a?.id];
  if (!book) return null;
  const all = Object.entries(book).map(([id, r]) => ({ id: +id, ...r })).filter((r) => r.w + r.l >= RIVALRY_MEETINGS);
  if (!all.length) return null;
  const fresh = all.filter((r) => (r.last || 0) >= s.day - RIVALRY_FRESH), rows = fresh.length ? fresh : all;
  const closeness = (r) => (r.gap ?? 0.5 * (r.w + r.l)) / (r.w + r.l);
  return rows.sort((x, y) => Math.min(y.w, y.l) - Math.min(x.w, x.l) || closeness(x) - closeness(y) || y.w + y.l - (x.w + x.l) || x.id - y.id)[0];
}
// Forget athletes who have left the club.
export function pruneRivalries(s) {
  if (!s.rivalries) return;
  const ids = new Set(s.roster.map((a) => String(a.id)));
  for (const id of Object.keys(s.rivalries)) if (!ids.has(id)) delete s.rivalries[id];
}
// An event's placings turned into head-to-head results for every home entrant: a thrower with a
// mark beats one without, level series and two blank cards settle nothing.
export function settleHeadToHeads(s, ev, placings, awayAthlete) {
  const out = [];
  pruneRivalries(s);
  for (const h of placings.filter((r) => r.side === "home")) {
    const a = s.roster.find((x) => x.id === h.id);
    if (!a) continue;
    const rival = rivalOf(s, a);
    for (const r of placings.filter((x) => x.side === "away")) {
      if ((h.place ?? Infinity) === (r.place ?? Infinity)) continue;
      const found = awayAthlete(r.id);
      if (!found?.athlete) continue;
      const won = (h.place ?? Infinity) < (r.place ?? Infinity);
      const gap = h.mark != null && r.mark != null ? Math.abs(h.mark - r.mark) / Math.max(h.mark, r.mark) : 1;
      const row = recordHeadToHead(s, a, found.athlete, found.club, ev, won, gap);
      if (rival?.id === r.id) out.push({ id: a.id, name: a.name, rivalId: r.id, rivalName: row.name, club: row.club, event: ev, won, w: row.w, l: row.l });
    }
  }
  return out;
}
