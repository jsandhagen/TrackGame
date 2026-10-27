import { EVENTS, EVENT_IDS, TACTICS, SKILLS, BACKGROUNDS, ITEMS, GEAR_SLOTS, SPONSORS } from "../game-content.js";
import {
  clamp,
  random,
  gauss,
  note,
  count,
  effects,
  forecast,
  equippedSkills,
  grantXp,
  addItem,
  rollRarity,
  randomItem,
  fansFactor,
  facilityLevel,
  hasCombo,
} from "./core.js";
import { checkGoals } from "./story.js";
import { competitionTier } from "./competition.js";
import { checkDevelopment } from "./development.js";

export const best = (marks) => {
  const valid = marks.filter((x) => x != null);
  return valid.length ? Math.max(...valid) : null;
};
export function opponent(s) {
  if (!s.competition) return null;
  if (s.competition.kind === "duel") return s.clubs.find((c) => c.id === s.competition.rival);
  if (s.fixture < 3) return s.clubs[s.fixture];
  return s.clubs.find((c) => c.id === s.finalOpponent);
}
export const usesOf = (s, id, lineup = s.lineup) => EVENT_IDS.filter((ev) => lineup[ev] === id).length;
export const entriesOf = (s, ev) => s.entries?.[ev] ?? (s.lineup[ev] ? [s.lineup[ev]] : []);
export function lineupProblem(s) {
  const all = EVENT_IDS.flatMap((ev) => entriesOf(s, ev));
  if (!all.length) return "Enter at least one athlete.";
  for (const ev of EVENT_IDS) {
    const ids = entriesOf(s, ev);
    if (ids.length > 3 || new Set(ids).size !== ids.length) return "Up to three different athletes per event.";
    for (const id of ids) {
      const a = s.roster.find((a) => a.id === id);
      if (!a || a.injury) return "Every entered athlete must be healthy.";
      if (all.filter((x) => x === id).length > 2) return a.name + " can enter at most two events.";
    }
  }
  return null;
}
export function assignEntry(s, event, slot, id) {
  if (s.match || !EVENTS[event] || !Number.isInteger(slot) || slot < 0 || slot > 2) return false;
  const a = s.roster.find((a) => a.id === id);
  if (id && (!a || a.injury)) return false;
  const entries = Object.fromEntries(EVENT_IDS.map((ev) => [ev, [...entriesOf(s, ev)]]));
  const ids = entries[event];
  if (id && (ids.some((x, i) => i !== slot && x === id) || EVENT_IDS.filter((ev) => ev !== event && entries[ev].includes(id)).length >= 2)) return false;
  if (id) ids[slot] = id; else ids.splice(slot, 1);
  entries[event] = ids.filter(Boolean);
  s.entries = entries;
  s.lineup[event] = entries[event][0] || null;
  return true;
}
export const assign = (s, event, id) => assignEntry(s, event, 0, id);
// Greedy best lineup: specialists first, then the strongest healthy cover.
export function autoLineup(s) {
  if (s.match) return false;
  const lineup = {};
  const healthy = s.roster.filter((a) => !a.injury);
  if (!healthy.length) return false;
  const order = [...EVENT_IDS].sort(
    (x, y) => Math.max(...healthy.map((a) => forecast(s, a, y) / EVENTS[y].max)) - Math.max(...healthy.map((a) => forecast(s, a, x) / EVENTS[x].max)),
  );
  for (const ev of order) {
    const options = healthy
      .filter((a) => usesOf(s, a.id, lineup) < (healthy.length >= 4 ? 1 : 2))
      .sort((a, b) => forecast(s, b, ev) - forecast(s, a, ev));
    const fallback = healthy.filter((a) => usesOf(s, a.id, lineup) < 2).sort((a, b) => forecast(s, b, ev) - forecast(s, a, ev));
    const pickA = options[0] || fallback[0];
    if (!pickA) return false;
    lineup[ev] = pickA.id;
  }
  s.lineup = lineup;
  s.entries = Object.fromEntries(EVENT_IDS.map((ev) => [ev, lineup[ev] ? [lineup[ev]] : []]));
  // Fill a second scoring entry using spare event capacity; manual entries can
  // concentrate up to three athletes in an event or leave another event empty.
  for (const ev of EVENT_IDS) {
    const candidates = healthy.filter((a) => !entriesOf(s,ev).includes(a.id) && EVENT_IDS.filter((e) => entriesOf(s,e).includes(a.id)).length < 2)
      .sort((a,b) => forecast(s,b,ev)-forecast(s,a,ev));
    if (candidates[0]) assignEntry(s,ev,1,candidates[0].id);
  }
  return true;
}

export function startMatch(s) {
  if (s.match || !s.competition || s.phase !== "season" || s.day < s.matchDay || s.pendingEvent || lineupProblem(s)) return false;
  const rival = opponent(s);
  if (!rival) return false;
  s.sponsorLocked = true;
  const kind = s.competition.kind === "duel" ? "duel" : s.fixture < 3 ? "league" : "final";
  for (const r of rival.athletes) r.condition = 35 + Math.round(random(s) * 45);
  s.match = {
    id: s.season + "-" + s.day + "-" + competitionTier(s) + "-" + s.fixture,
    kind,
    home: kind === "duel" || (kind === "league" && (s.competition.stage === 2 ? s.fixture === 2 : s.fixture !== 1)),
    opponentId: rival.id,
    name: rival.name,
    color: rival.color,
    eventIndex: 0,
    attempts: 3,
    championship: kind === "final",
    entryIndex: 0,
    finalRound: false,
    fields: EVENT_IDS.map((ev, i) => ({
      home: entriesOf(s, ev).map((id) => ({ id, marks: [], finalist: false })),
      away: [rival.athletes[i], rival.athletes[(i + 1) % 4]].map((a) => ({ id: a.id, marks: [], finalist: false })),
    })),
    phase: "intro",
    homeMarks: EVENT_IDS.map(() => []),
    awayMarks: EVENT_IDS.map(() => []),
    lineup: { ...s.lineup },
    score: 0,
    against: 0,
    started: [false, false, false, false],
    closed: [false, false, false, false],
    sigUsed: [],
    rivalSig: [],
    settled: false,
    last: null,
    rewards: null,
  };
  return true;
}
export const entrant = (s, side, i = s.match?.eventIndex) => s.match?.fields?.[i]?.[side]?.[s.match.entryIndex || 0];
export const homeAthlete = (s, i = s.match?.eventIndex) => s.roster.find((a) => a.id === (entrant(s, "home", i)?.id ?? s.match?.lineup[EVENT_IDS[i]])) || s.roster[0];
export const rivalAthlete = (s, i = s.match?.eventIndex) => {
  const club = s.clubs.find((c) => c.id === s.match?.opponentId);
  return club?.athletes.find((a) => a.id === entrant(s, "away", i)?.id) || club?.athletes[i];
};
export const currentAthlete = (s) => homeAthlete(s);
export const currentRival = (s) => rivalAthlete(s);
export function syncMarks(s) {
  const m = s.match;
  if (!m?.fields) return;
  const f = m.fields[m.eventIndex];
  m.homeMarks[m.eventIndex] = f.home[m.entryIndex]?.marks || [];
  m.awayMarks[m.eventIndex] = f.away[m.entryIndex]?.marks || [];
}
const ranking = (field) => [...field.home.map((e) => ({ ...e, side: "home" })), ...field.away.map((e) => ({ ...e, side: "away" }))]
  .sort((a, b) => {
    const x = a.marks.filter((n) => n != null).sort((a,b) => b-a), y = b.marks.filter((n) => n != null).sort((a,b) => b-a);
    for (let i = 0; i < Math.max(x.length,y.length); i++) if ((y[i] ?? -1) !== (x[i] ?? -1)) return (y[i] ?? -1) - (x[i] ?? -1);
    return 0;
  });
export function eventScores(m) {
  return EVENT_IDS.map((event, i) => {
    if (!m.fields) {
      const home = best(m.homeMarks[i]), away = best(m.awayMarks[i]);
      const done = m.homeMarks[i].length === m.attempts && m.awayMarks[i].length === m.attempts;
      return { event, home, away, done, h: done && home != null && (away == null || home > away) ? 3 : 0, a: done && away != null && (home == null || away > home) ? 3 : 0, placings: [] };
    }
    const f = m.fields[i], done = !!m.closed[i];
    const rows = ranking(f), table = [5,3,1];
    let place = 0;
    const placings = rows.map((e, index) => {
      const mark = best(e.marks);
      if (mark == null) return { ...e, mark, place: null, points: 0 };
      // Compare the complete series for countback; share points only for an exact tie.
      const key = (x) => JSON.stringify(x.marks.filter((v) => v != null).sort((a,b) => b-a));
      const tied = rows.filter((x) => best(x.marks) != null && key(x) === key(e));
      const first = rows.findIndex((x) => x === tied[0]);
      place = first + 1;
      const points = tied.reduce((n, _, k) => n + (table[first + k] || 0), 0) / tied.length;
      return { ...e, mark, place, points: done ? points : 0 };
    });
    return { event, home: best(f.home.flatMap((e) => e.marks)), away: best(f.away.flatMap((e) => e.marks)), done, placings,
      h: placings.filter((e) => e.side === "home").reduce((n,e) => n+e.points,0),
      a: placings.filter((e) => e.side === "away").reduce((n,e) => n+e.points,0) };
  });
}
function rescore(m) {
  const sc = eventScores(m);
  m.score = sc.reduce((n, e) => n + e.h, 0);
  m.against = sc.reduce((n, e) => n + e.a, 0);
}

// Situational context for one side's next attempt.
function context(s, side) {
  syncMarks(s);
  const m = s.match,
    i = m.eventIndex,
    own = (side === "home" ? m.homeMarks : m.awayMarks)[i],
    opp = (side === "home" ? m.awayMarks : m.homeMarks)[i],
    athlete = side === "home" ? homeAthlete(s) : rivalAthlete(s);
  return { m, i, ev: EVENT_IDS[i], own, opp, athlete, k: own.length, ownBest: best(own), oppBest: best(opp), left: m.attempts - own.length };
}
function sourceName(a, key) {
  for (const k of equippedSkills(a, "meet")) if (SKILLS[k][key]) return SKILLS[k].name;
  for (const slot of GEAR_SLOTS) if (ITEMS[a.gear?.[slot]]?.[key]) return ITEMS[a.gear[slot]].name;
  if (BACKGROUNDS[a.background]?.[key]) return BACKGROUNDS[a.background].name;
  return null;
}
export function canSignature(s, side = "home") {
  const m = s.match;
  if (!m) return false;
  const c = context(s, side),
    fx = effects(s, c.athlete, side === "home");
  if (!entrant(s, side) && m.fields) return false;
  if (!fx.sig || c.left <= 0) return false;
  return side === "home" ? !m.sigUsed.includes(c.athlete.id) : !m.rivalSig.includes(c.athlete.id);
}
export function projected(s, side = "home") {
  const c = context(s, side);
  return forecast(s, c.athlete, c.ev, { club: side === "home", doubleDuty: side === "home" && usesOf(s, c.athlete.id, s.match.lineup) > 1 });
}
export function autoTactic(s, side = "home") {
  const c = context(s, side),
    P = projected(s, side);
  // Bank a mark first; once one is on the board a foul only costs confidence, so chase.
  if (c.ownBest == null) {
    if (c.left > 1) return "balanced";
    if (c.oppBest != null && c.oppBest > P * 1.015) return "attack";
    if (c.oppBest == null || P * 0.97 > c.oppBest * 1.01) return "safe";
    return "balanced";
  }
  if (c.oppBest != null && c.ownBest > c.oppBest * 1.04 && c.athlete.condition < 45) return "safe";
  return c.left === 1 && c.oppBest != null && c.ownBest <= c.oppBest ? "attack" : "balanced";
}
export function isClutch(s) {
  const c = context(s, "home");
  return c.left === 1 && c.opp.length > c.own.length && (c.ownBest == null || (c.oppBest != null && c.oppBest >= c.ownBest));
}
export function needsDecision(s) {
  const m = s.match;
  if (!m || m.phase !== "live") return false;
  const c = context(s, "home");
  if (m.fields && (!entrant(s, "home") || (m.finalRound && !entrant(s, "home").finalist))) return false;
  if (c.own.length >= m.attempts || c.opp.length <= c.own.length) return false;
  return s.settings.meetMode === "coach" || (s.settings.clutch !== false && isClutch(s));
}

// Every number the planning panel needs, without rolling.
export function throwPreview(s, tactic, quality = "good", sig = false) {
  const c = context(s, "home");
  return riskModel(s, c, "home", tactic, quality, sig);
}
function riskModel(s, c, side, tactic, quality, sig) {
  const a = c.athlete,
    fx = effects(s, a, side === "home"),
    T = TACTICS[tactic],
    first = c.k === 0,
    last = c.left === 1,
    afterFoul = c.k > 0 && c.own[c.k - 1] == null,
    trailing = c.oppBest != null && (c.ownBest == null || c.ownBest < c.oppBest),
    leading = c.ownBest != null && (c.oppBest == null || c.ownBest > c.oppBest);
  const acts = [];
  let mult = 1;
  const on = (cond, key, label) => {
    if (cond && fx[key] !== 1) {
      mult *= fx[key];
      acts.push(sourceName(a, key) || label);
    }
  };
  on(first, "first", "Opening Salvo");
  on(last, "last", "Clutch Gene");
  on(afterFoul, "afterFoul", "Second Wind");
  on(trailing, "trailing", "Rival Hunter");
  on(leading, "leading", "Front Runner");
  on(c.m.kind === "final", "final", "Big Stage");
  const teamBehind = side === "home" ? c.m.score < c.m.against : c.m.against < c.m.score;
  on(teamBehind, "teamTrailing", "Anchor");
  if (fx.streak) {
    const valid = c.own.filter((x) => x != null).length;
    if (valid) {
      mult *= 1 + fx.streak * valid;
      acts.push(sourceName(a, "streak") || "Momentum");
    }
  }
  if (fx.crowd && side === "home" && c.m.home) {
    mult *= 1 + fx.crowd * Math.max(0.25, fansFactor(s));
    acts.push(sourceName(a, "crowd") || "Showtime");
  }
  const squad = side === "home" ? EVENT_IDS.map((ev) => s.roster.find((x) => x.id === c.m.lineup[ev])) : s.clubs.find((x) => x.id === c.m.opponentId).athletes;
  const captain = squad.find((x) => x && equippedSkills(x, "meet").includes("captain"));
  if (captain) {
    mult *= SKILLS.captain.captain;
    if (first) acts.push("Captain " + captain.name.split(" ")[0]);
  }
  if (a.buff && side === "home") acts.push("Golden Chalk");
  if (sig) {
    mult *= fx.sig;
    acts.unshift(sourceName(a, "sig"));
  }
  const focus = a.stats[3];
  let foul = (0.11 - focus * 0.0007) * T.foul * fx.foul * (leading && fx.leading !== 1 ? 0.5 : 1) * (afterFoul && fx.afterFoul !== 1 ? 0.7 : 1);
  foul *= quality === "perfect" ? 0.6 : quality === "poor" ? 1.5 : 1;
  foul = clamp(foul, 0.01, 0.5);
  if (sig || (first && fx.safeFirst)) foul = 0;
  const sd = T.sd * fx.variance * (1.25 - focus / 200),
    mean = T.mean + (tactic === "attack" ? fx.attackBoost : 0),
    qm = quality === "perfect" ? 1.02 + (fx.perfect ? 0.01 : 0) : quality === "poor" ? 0.95 : 1;
  const P = forecast(s, a, c.ev, { fx, club: side === "home", doubleDuty: side === "home" && usesOf(s, a.id, c.m.lineup) > 1 });
  const center = P * mean * qm * mult;
  return { foul, sd, center, low: center * (1 - sd * 1.6), high: center * (1 + sd * 1.6), acts, fx, P };
}

function throwFor(s, side, tactic, quality, sig) {
  const m = s.match,
    c = context(s, side),
    a = c.athlete;
  if (sig && !canSignature(s, side)) sig = false;
  const r = riskModel(s, c, side, tactic, quality, sig);
  const foul = random(s) < r.foul,
    z = clamp(gauss(s), -2.4, 2.4),
    mark = foul ? null : +(r.center * (1 + z * r.sd)).toFixed(2);
  if (sig) (side === "home" ? m.sigUsed : m.rivalSig).push(a.id);
  if (side === "home") a.stamina = clamp(a.stamina - TACTICS[tactic].stamina, 0, 100);
  // A foul shakes confidence for the rest of the meet; a clean mark steadies it.
  a.condition = clamp(a.condition + (foul ? -8 : 2), 0, 100);
  c.own.push(mark);
  const previousPb = side === "home" ? Math.max(a.pb[c.ev] || 0, c.ownBest || 0) : 0;
  const newPb = side === "home" && mark != null && mark > previousPb && mark > (a.pb[c.ev] || 0);
  const ownBest = best(c.own),
    oppBest = c.oppBest;
  return {
    type: "throw",
    side,
    event: c.ev,
    eventIndex: c.i,
    attempt: c.k,
    athleteId: a.id,
    name: a.name,
    mark,
    foul,
    tactic,
    quality,
    signature: !!sig,
    activations: r.acts.filter(Boolean),
    newPb,
    previousPb,
    pbDelta: newPb && previousPb ? mark - previousPb : 0,
    ownBest,
    oppBest,
    leading: ownBest != null && (oppBest == null || ownBest > oppBest),
    risk: r.foul,
  };
}
function autoQuality(s, a) {
  return effects(s, a).perfect && random(s) < 0.3 ? "perfect" : "good";
}
function shouldAutoSig(s, side) {
  const c = context(s, side);
  return canSignature(s, side) && (c.left === 1 || (c.oppBest != null && (c.ownBest == null || c.ownBest < c.oppBest) && c.left <= 2));
}

// Advance one presentable beat. Returns null while waiting for the coach.
export function advanceMatch(s) {
  const m = s.match;
  syncMarks(s);
  if (!m || m.phase === "decide" || m.phase === "complete") return null;
  let beat;
  if (m.phase === "intro") {
    m.phase = "live";
    beat = { type: "meetStart" };
  } else {
    let i = m.eventIndex;
    if (m.closed[i]) {
      if (i === 3) {
        settleMatch(s);
        beat = { type: "complete", win: meetOutcome(m) > 0, draw: meetOutcome(m) === 0, score: m.score, against: m.against };
        m.last = beat;
        return beat;
      }
      i = ++m.eventIndex;
      m.entryIndex = 0; m.finalRound = false; if (m.fields) m.attempts = 3; syncMarks(s);
    }
    const hm = m.homeMarks[i],
      am = m.awayMarks[i];
    if (!m.started[i]) {
      m.started[i] = true;
      beat = { type: "eventStart", event: EVENT_IDS[i], eventIndex: i, home: homeAthlete(s, i).id, away: rivalAthlete(s, i).id };
    } else if (m.fields && ["home", "away"].every((side) => {
      const e = entrant(s, side); return !e || (m.finalRound && !e.finalist) || e.marks.length >= m.attempts;
    })) {
      const f = m.fields[i];
      if (++m.entryIndex < Math.max(f.home.length, f.away.length)) {
        syncMarks(s);
        beat = { type: "eventStart", event: EVENT_IDS[i], eventIndex: i, home: homeAthlete(s,i).id, away: rivalAthlete(s,i).id };
      } else if (m.championship && !m.finalRound) {
        const ranked = ranking(f).filter((e) => best(e.marks) != null);
        const cutoff = ranked[3];
        for (const side of ["home", "away"]) for (const e of f[side]) e.finalist = !!cutoff && ranked.slice(0,4).some((q) => q.id === e.id && q.side === side);
        // With fewer than four legal marks every athlete with a valid mark advances.
        if (ranked.length < 4) for (const side of ["home", "away"]) for (const e of f[side]) e.finalist = best(e.marks) != null;
        m.entryIndex = 0; m.finalRound = true; m.attempts = 6; syncMarks(s);
        beat = { type: "eventStart", event: EVENT_IDS[i], eventIndex: i, home: homeAthlete(s,i).id, away: rivalAthlete(s,i).id, finals: true };
      } else {
        return closeEvent(s, i);
      }
    } else if (!m.fields && hm.length === m.attempts && am.length === m.attempts) {
      return closeEvent(s, i);
    } else if (m.fields && (!entrant(s,"away") || (m.finalRound && !entrant(s,"away").finalist) || am.length >= m.attempts)) {
      if (needsDecision(s)) { m.phase = "decide"; beat = { type: "decide", clutch: isClutch(s), eventIndex:i, recommended:autoTactic(s) }; }
      else beat = throwFor(s,"home",autoTactic(s),autoQuality(s,homeAthlete(s)),shouldAutoSig(s,"home"));
    } else if ((m.fields && (!entrant(s,"home") || (m.finalRound && !entrant(s,"home").finalist) || hm.length >= m.attempts)) || am.length === hm.length) {
      beat = throwFor(s,"away",autoTactic(s,"away"),"good",shouldAutoSig(s,"away"));
    } else if (needsDecision(s)) {
      m.phase = "decide";
      beat = { type: "decide", clutch: isClutch(s), eventIndex:i, recommended:autoTactic(s) };
    } else beat = throwFor(s,"home",autoTactic(s),autoQuality(s,homeAthlete(s)),shouldAutoSig(s,"home"));
  }
  m.last = beat;
  return beat;
}
function closeEvent(s, i) {
  const m = s.match;
      m.closed[i] = true;
      rescore(m);
      const e = eventScores(m)[i];
      for (const row of e.placings || []) if (row.side === "home") {
        const athlete = s.roster.find((x) => x.id === row.id);
        athlete.seasonPoints += row.points;
        if (row.place === 1) count(s, "eventWins");
      }
      const beat = { type: "eventEnd", event: e.event, eventIndex:i, h:e.h, a:e.a, home:e.home, away:e.away, score:m.score, against:m.against };
      m.last = beat;
      return beat;
}
export function decideThrow(s, tactic = "balanced", quality = "good", sig = false) {
  const m = s.match;
  if (!m || m.phase !== "decide" || !TACTICS[tactic]) return null;
  m.phase = "live";
  const beat = throwFor(s, "home", tactic, quality, sig);
  m.last = beat;
  return beat;
}
// Resolve everything left with the coach's usual calls.
export function simulateMatch(s) {
  const m = s.match;
  for (let guard = 0; m && m.phase !== "complete" && guard < 600; guard++) {
    if (m.phase === "decide") decideThrow(s, autoTactic(s, "home"), "good", shouldAutoSig(s, "home"));
    else advanceMatch(s);
  }
  return m?.phase === "complete";
}

export function settleMatch(s) {
  const m = s.match;
  if (!m || m.settled || !eventScores(m).every((e) => e.done)) return;
  rescore(m);
  if (m.kind === "final" && meetOutcome(m) === 0) {
    const total = eventScores(m).reduce((n, e) => n + (e.home || 0) / EVENTS[e.event].max - (e.away || 0) / EVENTS[e.event].max, 0);
    m.tieBreak = true;
    m.tieBreakWinner = total >= 0 ? "home" : "away";
  }
  m.settled = true;
  m.phase = "complete";
  const win = meetOutcome(m) > 0,
    draw = meetOutcome(m) === 0,
    L = competitionTier(s),
    sponsor = SPONSORS[s.sponsor] || {},
    eventWins = eventScores(m).filter((e) => e.h > e.a).length;
  let money = 150 + 100 * L + 50 * eventWins + (win ? 120 + 60 * L + (sponsor.winBonus || 0) : 0);
  if (!win && !draw && sponsor.lossPenalty) money -= sponsor.lossPenalty;
  if (m.kind === "duel") money = Math.round(money * 0.6);
  s.money += money;
  let fans = win ? 15 + 10 * L : draw ? 6 + 4 * L : 3 + 2 * L;
  fans *= (sponsor.fanBoost || 1) * (hasCombo(s, "legends") ? 1.25 : 1) * (1 + 0.1 * facilityLevel(s, "statue")) * (win && m.home ? 1 + 0.2 * facilityLevel(s, "lights") : 1);
  const rewards = { money, fans: 0, items: [], levelUps: [], pbs: [], mvp: null, goals: [], development: [] };
  const duelKey = L + ":" + m.opponentId;
  if (m.kind === "duel" && win && !s.circuit.duels.includes(duelKey)) {
    s.circuit.duels.push(duelKey);
    const bonus = 200 + 100 * L;
    s.money += bonus;
    rewards.money += bonus;
    rewards.firstDuel = true;
    fans += 20;
    addItem(s, "scroll");
    rewards.items.push("scroll");
  }
  let mvpScore = -1;
  const participants = new Set();
  for (const [i, ev] of EVENT_IDS.entries()) {
    const field = m.fields?.[i]?.home || [{ id:m.lineup[ev], marks:m.homeMarks[i] }];
    for (const entry of field) {
      const a = s.roster.find((x) => x.id === entry.id);
      if (!a) continue;
      participants.add(a.id);
      const mark = best(entry.marks), old = a.pb[ev] || 0;
      if (mark != null && mark > old) {
        a.pb[ev] = mark; a.seasonPbs++; a.development.pbs++; count(s,"pbs"); fans += 2;
        rewards.pbs.push({ id:a.id, name:a.name, event:ev, mark, delta:old ? mark-old : 0 });
        a.career.unshift({ season:s.season, label:EVENTS[ev].name + " PB", mark });
        a.career = a.career.slice(0,40);
        if (!s.records[ev] || mark > s.records[ev].mark) s.records[ev] = { mark, name:a.name, season:s.season };
      }
      const placing = eventScores(m)[i].placings.find((e) => e.side === "home" && e.id === a.id);
      if (placing?.place === 1) a.development.wins++;
      a.development.clean += entry.marks.filter((v) => v != null).length;
      if (placing && placing.points > mvpScore) { mvpScore = placing.points; rewards.mvp = { id:a.id, name:a.name, event:ev }; }
    }
  }
  for (const id of participants) {
    const a = s.roster.find((x) => x.id === id);
    a.meets++; a.stamina = clamp(a.stamina-15,0,100); a.condition = clamp(a.condition+(win?8:draw?2:-6),0,100); a.buff=null;
    grantXp(s,a,30*(m.kind === "duel" ? 0.7:1),rewards.levelUps);
    rewards.development.push(...checkDevelopment(s,a));
  }
  rewards.fans = Math.round(fans);
  s.fans += rewards.fans;
  // A reward chest: wins always drop something, finals drop more.
  const drops = win ? (m.kind === "final" ? 2 : 1) : random(s) < 0.35 ? 1 : 0;
  for (let n = 0; n < drops; n++) {
    const rarity = win ? rollRarity(s, 0.15 * L + (m.kind === "final" ? 0.6 : 0)) : "common";
    const item = randomItem(s, rarity, (d) => win || d.kind === "use");
    addItem(s, item);
    rewards.items.push(item);
  }
  count(s, "meets");
  if (win) count(s, "meetWins");
  money = rewards.money;
  const result = { id: m.id, kind: m.kind, name: m.name, score: m.score, against: m.against, win, draw, prize: money, season: s.season, league: L, stage: s.competition.stage };
  s.results.push(result);
  s.history.unshift(result);
  s.history = s.history.slice(0, 50);
  if (m.kind === "league") {
    const club = s.clubs.find((c) => c.id === m.opponentId);
    club.points += win ? 0 : draw ? 1 : 3;
    club.diff += m.against - m.score;
    club.played++;
    const others = s.clubs.filter((c) => c.id !== m.opponentId);
    const strength = (c) => c.athletes.reduce((n, a) => n + a.stats.reduce((x, v) => x + v, 0), 0);
    const delta = strength(others[0]) - strength(others[1]) + (random(s) - 0.5) * 60;
    others[delta >= 0 ? 0 : 1].points += 3;
    others[0].diff += delta >= 0 ? 3 : -3;
    others[1].diff += delta >= 0 ? -3 : 3;
    others.forEach((c) => c.played++);
  }
  rewards.goals = checkGoals(s).map((g) => g.id);
  m.rewards = rewards;
  note(s, (win ? "Club win! " : draw ? "Honours even. " : "A lesson for next time. ") + m.score + "–" + m.against + " vs " + m.name + ". +$" + money + ", +" + rewards.fans + " fans.", win ? "win" : "meet");
}


export const meetOutcome = (m) => Math.sign(m.score - m.against) || (m.tieBreakWinner === "home" ? 1 : m.tieBreakWinner === "away" ? -1 : 0);
