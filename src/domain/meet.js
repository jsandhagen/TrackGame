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

export const best = (marks) => {
  const valid = marks.filter((x) => x != null);
  return valid.length ? Math.max(...valid) : null;
};
export function opponent(s) {
  if (s.fixture < 3) return s.clubs[s.fixture];
  return s.clubs.find((c) => c.id === s.finalOpponent);
}
export const usesOf = (s, id, lineup = s.lineup) => EVENT_IDS.filter((ev) => lineup[ev] === id).length;
export function lineupProblem(s) {
  for (const ev of EVENT_IDS) {
    const a = s.roster.find((a) => a.id === s.lineup[ev]);
    if (!a) return "Every event needs an athlete.";
    if (a.injury) return a.name + " is injured.";
    if (usesOf(s, a.id) > 2) return a.name + " can cover at most two events.";
  }
  return null;
}
export function assign(s, event, id) {
  if (s.match) return false;
  const a = s.roster.find((a) => a.id === id);
  if (!a || a.injury || !EVENTS[event]) return false;
  if (EVENT_IDS.filter((e) => e !== event && s.lineup[e] === id).length >= 2) return false;
  s.lineup[event] = id;
  return true;
}
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
  return true;
}

export function startMatch(s) {
  if (s.match || s.phase !== "season" || s.day < s.matchDay || s.pendingEvent || lineupProblem(s)) return false;
  const rival = opponent(s);
  if (!rival) return false;
  s.sponsorLocked = true;
  const kind = s.fixture < 3 ? "league" : "final";
  for (const r of rival.athletes) r.condition = 35 + Math.round(random(s) * 45);
  s.match = {
    id: s.season + "-" + s.league + "-" + s.fixture,
    kind,
    home: kind === "league" && s.fixture !== 1,
    opponentId: rival.id,
    name: rival.name,
    color: rival.color,
    eventIndex: 0,
    attempts: kind === "league" ? 2 : 3,
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
export const homeAthlete = (s, i = s.match?.eventIndex) => s.roster.find((a) => a.id === s.match?.lineup[EVENT_IDS[i]]);
export const rivalAthlete = (s, i = s.match?.eventIndex) => s.clubs.find((c) => c.id === s.match?.opponentId)?.athletes[i];
export const currentAthlete = (s) => homeAthlete(s);
export const currentRival = (s) => rivalAthlete(s);

export function eventScores(m) {
  return EVENT_IDS.map((event, i) => {
    const home = best(m.homeMarks[i]),
      away = best(m.awayMarks[i]),
      done = m.homeMarks[i].length === m.attempts && m.awayMarks[i].length === m.attempts;
    let h = 0,
      a = 0;
    if (done && (home != null || away != null)) {
      if (away == null || (home != null && home > away + 0.005)) h = 3;
      else if (home == null || away > home + 0.005) a = 3;
      else h = a = 1;
    }
    return { event, home, away, done, h, a };
  });
}
function rescore(m) {
  const sc = eventScores(m);
  m.score = sc.reduce((n, e) => n + e.h, 0);
  m.against = sc.reduce((n, e) => n + e.a, 0);
}

// Situational context for one side's next attempt.
function context(s, side) {
  const m = s.match,
    i = m.eventIndex,
    own = (side === "home" ? m.homeMarks : m.awayMarks)[i],
    opp = (side === "home" ? m.awayMarks : m.homeMarks)[i],
    athlete = side === "home" ? homeAthlete(s) : rivalAthlete(s);
  return { m, i, ev: EVENT_IDS[i], own, opp, athlete, k: own.length, ownBest: best(own), oppBest: best(opp), left: m.attempts - own.length };
}
function sourceName(a, key) {
  for (const k of equippedSkills(a)) if (SKILLS[k][key]) return SKILLS[k].name;
  for (const slot of GEAR_SLOTS) if (ITEMS[a.gear?.[slot]]?.[key]) return ITEMS[a.gear[slot]].name;
  if (BACKGROUNDS[a.background]?.[key]) return BACKGROUNDS[a.background].name;
  return null;
}
export function canSignature(s, side = "home") {
  const m = s.match;
  if (!m) return false;
  const c = context(s, side),
    fx = effects(s, c.athlete, side === "home");
  if (!fx.sig || c.left <= 0) return false;
  return side === "home" ? !m.sigUsed.includes(c.athlete.id) : !m.rivalSig.includes(c.i);
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
  return "attack";
}
export function isClutch(s) {
  const c = context(s, "home");
  return c.left === 1 && c.opp.length > c.own.length && (c.ownBest == null || (c.oppBest != null && c.oppBest >= c.ownBest));
}
export function needsDecision(s) {
  const m = s.match;
  if (!m || m.phase !== "live") return false;
  const c = context(s, "home");
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
  const captain = squad.find((x) => x && equippedSkills(x).includes("captain"));
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
  if (sig) (side === "home" ? m.sigUsed : m.rivalSig).push(side === "home" ? a.id : c.i);
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
        beat = { type: "complete", win: m.score > m.against, draw: m.score === m.against, score: m.score, against: m.against };
        m.last = beat;
        return beat;
      }
      i = ++m.eventIndex;
    }
    const hm = m.homeMarks[i],
      am = m.awayMarks[i];
    if (!m.started[i]) {
      m.started[i] = true;
      beat = { type: "eventStart", event: EVENT_IDS[i], eventIndex: i, home: homeAthlete(s, i).id, away: rivalAthlete(s, i).id };
    } else if (hm.length === m.attempts && am.length === m.attempts) {
      m.closed[i] = true;
      rescore(m);
      const e = eventScores(m)[i];
      const a = homeAthlete(s, i);
      if (e.h === 3) {
        a.seasonPoints += 3;
        count(s, "eventWins");
        if (effects(s, a).hype) s.roster.forEach((b) => b.id !== a.id && (b.condition = clamp(b.condition + 8, 0, 100)));
      }
      beat = { type: "eventEnd", event: e.event, eventIndex: i, h: e.h, a: e.a, home: e.home, away: e.away, score: m.score, against: m.against };
    } else if (am.length === hm.length) {
      beat = throwFor(s, "away", autoTactic(s, "away"), "good", shouldAutoSig(s, "away"));
    } else if (needsDecision(s)) {
      m.phase = "decide";
      beat = { type: "decide", clutch: isClutch(s), eventIndex: i, recommended: autoTactic(s, "home") };
    } else {
      const a = homeAthlete(s, i);
      beat = throwFor(s, "home", autoTactic(s, "home"), autoQuality(s, a), shouldAutoSig(s, "home"));
    }
  }
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
  for (let guard = 0; m && m.phase !== "complete" && guard < 200; guard++) {
    if (m.phase === "decide") decideThrow(s, autoTactic(s, "home"), "good", shouldAutoSig(s, "home"));
    else advanceMatch(s);
  }
  return m?.phase === "complete";
}

export function settleMatch(s) {
  const m = s.match;
  if (!m || m.settled || !eventScores(m).every((e) => e.done)) return;
  rescore(m);
  if (m.kind === "final" && m.score === m.against) {
    const total = eventScores(m).reduce((n, e) => n + (e.home || 0) / EVENTS[e.event].max - (e.away || 0) / EVENTS[e.event].max, 0);
    m.tieBreak = true;
    if (total >= 0) m.score++;
    else m.against++;
  }
  m.settled = true;
  m.phase = "complete";
  const win = m.score > m.against,
    draw = m.score === m.against,
    L = s.league,
    sponsor = SPONSORS[s.sponsor] || {},
    eventWins = eventScores(m).filter((e) => e.h === 3).length;
  let money = 150 + 100 * L + 50 * eventWins + (win ? 120 + 60 * L + (sponsor.winBonus || 0) : 0);
  if (!win && !draw && sponsor.lossPenalty) money -= sponsor.lossPenalty;
  s.money += money;
  let fans = win ? 15 + 10 * L : draw ? 6 + 4 * L : 3 + 2 * L;
  fans *= (sponsor.fanBoost || 1) * (hasCombo(s, "legends") ? 1.25 : 1) * (1 + 0.1 * facilityLevel(s, "statue"));
  const rewards = { money, fans: 0, items: [], levelUps: [], pbs: [], mvp: null, goals: [] };
  let mvpScore = -1;
  for (const [i, ev] of EVENT_IDS.entries()) {
    const a = s.roster.find((x) => x.id === m.lineup[ev]),
      mark = best(m.homeMarks[i]),
      away = best(m.awayMarks[i]);
    if (!a) continue;
    if (mark != null && (!a.pb[ev] || mark > a.pb[ev])) {
      const old = a.pb[ev] || 0;
      a.pb[ev] = mark;
      a.seasonPbs++;
      count(s, "pbs");
      fans += 2;
      rewards.pbs.push({ id: a.id, name: a.name, event: ev, mark, delta: old ? mark - old : 0 });
      a.career.unshift({ season: s.season, label: EVENTS[ev].name + " PB", mark });
      a.career = a.career.slice(0, 20);
      if (!s.records[ev] || mark > s.records[ev].mark) s.records[ev] = { mark, name: a.name, season: s.season };
    }
    const rel = mark == null ? 0 : mark / (away || mark);
    if (rel > mvpScore) {
      mvpScore = rel;
      rewards.mvp = { id: a.id, name: a.name, event: ev };
    }
  }
  for (const id of new Set(Object.values(m.lineup))) {
    const a = s.roster.find((x) => x.id === id);
    if (!a) continue;
    const wins = EVENT_IDS.filter((ev, i) => m.lineup[ev] === id && eventScores(m)[i].h === 3).length;
    a.meets++;
    a.stamina = clamp(a.stamina - 15, 0, 100);
    a.condition = clamp(a.condition + (win ? 8 : draw ? 2 : -6), 0, 100);
    a.buff = null;
    grantXp(s, a, 24 + 12 * wins, rewards.levelUps);
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
  const result = { id: m.id, kind: m.kind, name: m.name, score: m.score, against: m.against, win, draw, prize: money, season: s.season, league: L };
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
