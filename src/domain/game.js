import {
  EVENTS,
  EVENT_IDS,
  LEAGUES,
  PLANS,
  TRAITS,
  SKILLS,
  KIT,
  FACILITIES,
  COMBOS,
  CLUBS,
  FIRST,
  LAST,
  SKINS,
  HAIRS,
  CLUB_COLORS,
  TACTICS,
} from "../game-content.js";
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const pick = (s, a) => a[Math.floor(random(s) * a.length)];
export function createAthlete(s, event, options = {}) {
  const base = options.base ?? 24,
    stats = Array.from({ length: 4 }, () => base - 3 + random(s) * 6);
  stats[EVENTS[event].weights.indexOf(Math.max(...EVENTS[event].weights))] += 4;
  const id = s.nextId++;
  return {
    id,
    name: options.name || pick(s, FIRST) + " " + pick(s, LAST),
    event,
    stats,
    energy: 100,
    fatigue: 0,
    form: 55,
    level: 1,
    xp: 0,
    talent: options.talent ?? Math.round(78 + random(s) * 17),
    trait: pick(s, Object.keys(TRAITS)),
    plan: "balanced",
    autoTaper: true,
    skin: pick(s, SKINS),
    hair: pick(s, HAIRS),
    hairstyle: id % 3,
    kit: { implement: "standard", shoes: "trainers" },
    owned: ["standard", "trainers"],
    tuning: {},
    sessions: 0,
    meets: 0,
    skill: null,
    pb: {},
    career: [],
    wage: 40 + Math.round(base / 5),
    injury: 0,
  };
}
export function newGame(seed = Date.now() >>> 0) {
  const s = {
    v: 3,
    rng: seed,
    nextId: 1,
    clubName: "Ring & Sector",
    money: 1500,
    fame: 0,
    day: 1,
    season: 1,
    league: 0,
    fixture: 0,
    matchDay: 4,
    phase: "season",
    results: [],
    history: [],
    trophies: [],
    log: [],
    roster: [],
    lineup: {},
    plots: [
      { type: "club", level: 1 },
      { type: "rings", level: 1 },
      { type: "gym", level: 1 },
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    discovered: [],
    prospects: [],
    match: null,
    sponsor: "community",
    sponsorLocked: false,
    welcomed: false,
  };
  for (const [event, name] of [
    ["shot", "Mara Kowal"],
    ["discus", "Tomas Reyes"],
    ["hammer", "Noor Haddad"],
    ["jav", "Kofi Mensah"],
  ]) {
    const a = createAthlete(s, event, { name });
    s.roster.push(a);
    s.lineup[event] = a.id;
  }
  s.clubs = makeClubs(s, 0);
  discover(s);
  scout(s, true);
  note(s, "Welcome home, Coach. Your first club meet is in three days.");
  return s;
}
export function note(s, text) {
  s.log.unshift({ day: s.day, text });
  s.log = s.log.slice(0, 40);
}
export function makeClubs(s, league) {
  return CLUBS[league].map((name, index) => {
    const biases = [
      [2, -1, 0, -2],
      [-1, 3, -1, 0],
      [-2, -1, 2, 2],
    ][index];
    return {
      id: index,
      name,
      color: CLUB_COLORS[index],
      style: [
        "Power-first club · dangerous in shot put",
        "Technical club · discus specialists",
        "Fast-turning squad · hammer & javelin",
      ][index],
      points: 0,
      diff: 0,
      played: 0,
      athletes: EVENT_IDS.map((event, i) => {
        const a = createAthlete(s, event, {
          base: LEAGUES[league].rating + index * 1.6 - 1 + biases[i],
        });
        a.trait = ["powerhouse", "technician", "explosive"][index];
        return a;
      }),
    };
  });
}
export function skillUnlocked(a, id) {
  const k = SKILLS[id];
  return (
    !!k && a.sessions >= k.sessions && a.meets >= k.meets && a.level >= k.level
  );
}
export function combos(s) {
  const out = [];
  for (const c of COMBOS) {
    for (let i = 0; i < 9; i++) {
      if (s.plots[i]?.type !== c.a) continue;
      const around = [
        i % 3 ? i - 1 : -1,
        i % 3 < 2 ? i + 1 : -1,
        i >= 3 ? i - 3 : -1,
        i < 6 ? i + 3 : -1,
      ];
      if (around.some((j) => j >= 0 && s.plots[j]?.type === c.b)) {
        out.push(c);
        break;
      }
    }
  }
  return out;
}
export function discover(s) {
  const fresh = combos(s).filter((c) => !s.discovered.includes(c.key));
  for (const c of fresh) {
    s.discovered.push(c.key);
    s.fame += 3;
    note(s, "Discovery: " + c.name + " — " + c.desc);
  }
  return fresh;
}
export function facilityLevel(s, type) {
  return s.plots
    .filter((p) => p?.type === type)
    .reduce((n, p) => n + p.level, 0);
}
export function weeklyIncome(s) {
  return Math.round(
    ((s.sponsor === "performance" ? 100 : 190) +
      Math.max(0, facilityLevel(s, "club") - 1) * 25 +
      s.fame * 2 +
      facilityLevel(s, "stands") * 50) *
      (combos(s).some((c) => c.key === "fans") ? 1.15 : 1),
  );
}
export function wages(s) {
  return s.roster.reduce((n, a) => n + a.wage, 0);
}
export function readiness(a) {
  return Math.round(
    clamp(a.energy * 0.55 + (100 - a.fatigue) * 0.3 + a.form * 0.15, 0, 100),
  );
}
export function kitEffects(a) {
  let e = { mark: 1, foul: 1, load: 1, gain: 1 };
  for (const slot of ["implement", "shoes"]) {
    const id = a.kit[slot],
      d = KIT[id],
      lv = a.tuning[id] || 0;
    if (!d) continue;
    e.mark *= (d.mark || 1) + (d.cost ? lv * 0.004 : 0);
    e.foul *= d.foul || 1;
    e.load *= d.load || 1;
    e.gain *= d.gain || 1;
  }
  if (skillUnlocked(a, a.skill) && SKILLS[a.skill].gain)
    e.gain *= SKILLS[a.skill].gain;
  return e;
}
export function eventRating(a, event) {
  return (
    a.stats.reduce((v, n, i) => v + n * EVENTS[event].weights[i], 0) *
    (a.event === event ? 1 : 0.89)
  );
}
export function forecast(s, a, event) {
  const e = EVENTS[event],
    kit = kitEffects(a),
    uses = EVENT_IDS.filter((ev) => s.lineup[ev] === a.id).length;
  const factor =
    (0.86 + (0.14 * a.energy) / 100) *
    (1 - a.fatigue * 0.001) *
    (1 + (a.form - 50) * 0.0014) *
    (uses > 1 ? 0.97 : 1);
  return (
    (e.min + (e.max - e.min) * Math.pow(eventRating(a, event) / 100, 1.12)) *
    factor *
    kit.mark
  );
}
export function xp(a, n) {
  a.xp += n;
  while (a.xp >= 45 + a.level * 15) {
    a.xp -= 45 + a.level * 15;
    a.level++;
    a.talent = Math.min(99, a.talent + 0.5);
    a.stats = a.stats.map((v) => Math.min(a.talent, v + 0.7));
  }
}
export function advanceDay(s) {
  if (s.match || s.phase !== "season" || s.day >= s.matchDay)
    return { ok: false };
  s.day++;
  let gained = 0;
  const activeCombos = combos(s),
    recovery =
      facilityLevel(s, "recovery") +
      (activeCombos.some((c) => c.key === "recovery") ? 1 : 0);
  for (const a of s.roster) {
    const taper = a.autoTaper && s.matchDay - s.day < 2,
      p = PLANS[a.plan],
      plan = taper ? PLANS.recover : p,
      k = kitEffects(a);
    if (a.injury) {
      a.injury--;
      a.energy = clamp(a.energy + 20, 0, 100);
      a.fatigue = clamp(a.fatigue - 12 - recovery, 0, 100);
      continue;
    }
    a.energy = clamp(a.energy + 13 - plan.load * 11 * k.load, 0, 100);
    a.fatigue = clamp(
      a.fatigue +
        plan.load * 5 * k.load -
        4 -
        recovery -
        (TRAITS[a.trait].recovery || 0),
      0,
      100,
    );
    a.form = clamp(
      a.form + plan.form + facilityLevel(s, "garden") * 0.3,
      20,
      96,
    );
    for (let i = 0; i < 4; i++) {
      const facility = ["gym", "rings", "sprint", "analysis"][i],
        special = plan.stat === i ? 2.2 : plan.stat == null ? 1 : 0.55;
      const trait = TRAITS[a.trait].stat === i ? 1.12 : 1;
      const combo =
        i === 0 && activeCombos.some((c) => c.key === "power") ? 1.08 : 1;
      const gain =
        0.65 *
        plan.gain *
        special *
        k.gain *
        trait *
        combo *
        (1 + facilityLevel(s, facility) * 0.06) *
        Math.max(0.2, (a.talent - a.stats[i]) / a.talent);
      a.stats[i] = Math.min(a.talent, a.stats[i] + gain);
      gained += gain;
    }
    a.sessions++;
    xp(a, 6);
    if (a.fatigue > 86 && random(s) < 0.08) {
      a.injury = 2;
      a.fatigue = 50;
      note(s, a.name + " needs two days off. Recovery will help.");
    }
  }
  let cash = 0;
  if (s.day % 7 === 0) {
    cash = weeklyIncome(s) - wages(s);
    s.money += cash;
    note(
      s,
      "Weekly budget: " +
        (cash >= 0 ? "+" : "") +
        Math.round(cash) +
        " after wages.",
    );
  }
  if (s.day === s.matchDay)
    note(s, "Meet day! Choose your lineup and take the club to the stadium.");
  return { ok: true, gained, cash };
}
export function table(s) {
  const us = { id: "us", name: s.clubName, points: 0, diff: 0, played: 0 };
  for (const r of s.results) {
    if (r.kind === "league") {
      us.points += r.win ? 3 : r.draw ? 1 : 0;
      us.diff += r.score - r.against;
      us.played++;
    }
  }
  return [us, ...s.clubs.map((c) => ({ ...c }))].sort(
    (a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      String(a.id).localeCompare(String(b.id)),
  );
}
export function opponent(s) {
  if (s.fixture < 3) return s.clubs[s.fixture];
  return s.clubs.find((c) => c.id === s.finalOpponent);
}
export function assign(s, event, id) {
  if (s.match) return false;
  const a = s.roster.find((a) => a.id === id);
  if (
    !a ||
    a.injury ||
    !EVENTS[event] ||
    EVENT_IDS.filter((e) => e !== event && s.lineup[e] === id).length >= 2
  )
    return false;
  s.lineup[event] = id;
  return true;
}
export function startMatch(s) {
  if (s.match || s.phase !== "season" || s.day < s.matchDay) return false;
  for (const ev of EVENT_IDS) {
    const a = s.roster.find((a) => a.id === s.lineup[ev]);
    if (!a || a.injury) return false;
  }
  const rival = opponent(s);
  if (!rival) return false;
  s.sponsorLocked = true;
  s.match = {
    id: s.season + "-" + s.league + "-" + s.fixture,
    kind: s.fixture < 3 ? "league" : "final",
    opponentId: rival.id,
    name: rival.name,
    color: rival.color,
    eventIndex: 0,
    attempt: 0,
    attempts: s.fixture < 3 ? 2 : 3,
    phase: "intro",
    tactic: "safe",
    homeMarks: EVENT_IDS.map(() => []),
    awayMarks: EVENT_IDS.map(() => []),
    lineup: { ...s.lineup },
    score: 0,
    against: 0,
    last: null,
    settled: false,
  };
  return true;
}
export function currentAthlete(s) {
  return s.roster.find(
    (a) => a.id === s.match?.lineup[EVENT_IDS[s.match.eventIndex]],
  );
}
export function currentRival(s) {
  const m = s.match;
  return s.clubs.find((c) => c.id === m.opponentId)?.athletes[m.eventIndex];
}
export const best = (marks) =>
  marks.filter((x) => x != null).length
    ? Math.max(...marks.filter((x) => x != null))
    : null;
export function eventScores(m) {
  return EVENT_IDS.map((ev, i) => {
    const home = best(m.homeMarks[i]),
      away = best(m.awayMarks[i]),
      done = m.homeMarks[i].length === m.attempts;
    let h = 0,
      a = 0;
    if (done) {
      if (home == null && away == null) {
      } else if (away == null || (home != null && home > away + 0.005)) h = 3;
      else if (home == null || away > home + 0.005) a = 3;
      else h = a = 1;
    }
    return { event: ev, home, away, done, h, a };
  });
}
export function beginAttempt(s) {
  const m = s.match;
  if (!m || !["intro", "planning"].includes(m.phase)) return false;
  m.phase = "timing";
  return true;
}
export function rollThrow(s, a, event, tactic, quality, isHome = true) {
  const m = s.match,
    k = kitEffects(a),
    tr = TRAITS[a.trait],
    skill = skillUnlocked(a, a.skill) ? SKILLS[a.skill] : {},
    combo = isHome && combos(s).some((c) => c.key === "precision") ? 0.88 : 1;
  const risk = clamp(
    (0.105 - a.stats[3] * 0.00065) *
      TACTICS[tactic].foul *
      (tr.foul || 1) *
      (skill.foul || 1) *
      k.foul *
      combo *
      (quality === "perfect" ? 0.65 : quality === "poor" ? 1.65 : 1),
    0.004,
    0.25,
  );
  const foul = random(s) < risk;
  const form = isHome
    ? forecast(s, a, event)
    : EVENTS[event].min +
      (EVENTS[event].max - EVENTS[event].min) *
        Math.pow(eventRating(a, event) / 100, 1.12);
  const skillMark = skill.mark && m.attempt === m.attempts - 1 ? skill.mark : 1;
  const mult = quality === "perfect" ? 1.025 : quality === "poor" ? 0.94 : 1;
  const mark = +(
    form *
    (0.97 + random(s) * 0.035) *
    TACTICS[tactic].mark *
    mult *
    skillMark
  ).toFixed(2);
  return {
    mark: foul ? null : mark,
    risk,
    reasons: [
      a.event !== event ? "Cross-event assignment: −11% rating" : null,
      a.fatigue > 35 ? "Fatigue reduced your projection" : null,
      a.form >= 70 ? "Good competition form" : null,
      quality === "perfect"
        ? "Clean release: +2.5%"
        : quality === "poor"
          ? "Release timing cost distance"
          : null,
      skillMark > 1 ? "Last-throw nerve activated" : null,
      k.mark > 1 ? "Competition equipment added distance" : null,
    ].filter(Boolean),
  };
}
export function resolveThrow(s, quality = "good") {
  const m = s.match;
  if (!m || m.phase !== "timing") return null;
  const ev = EVENT_IDS[m.eventIndex],
    a = currentAthlete(s),
    r = currentRival(s),
    home = rollThrow(s, a, ev, m.tactic, quality, true),
    away = rollThrow(s, r, ev, "balanced", "good", false);
  m.homeMarks[m.eventIndex].push(home.mark);
  m.awayMarks[m.eventIndex].push(away.mark);
  const scores = eventScores(m);
  m.score = scores.reduce((n, e) => n + e.h, 0);
  m.against = scores.reduce((n, e) => n + e.a, 0);
  m.last = {
    ...home,
    away: away.mark,
    quality,
    name: a.name,
    event: ev,
    attempt: m.attempt,
  };
  m.phase = "result";
  return m.last;
}
export function nextAttempt(s) {
  const m = s.match;
  if (!m || m.phase !== "result") return false;
  if (m.attempt + 1 < m.attempts) {
    m.attempt++;
    m.phase = "planning";
    m.tactic = best(m.homeMarks[m.eventIndex]) == null ? "safe" : "balanced";
    return true;
  }
  const scores = eventScores(m);
  m.score = scores.reduce((n, e) => n + e.h, 0);
  m.against = scores.reduce((n, e) => n + e.a, 0);
  if (m.eventIndex < 3) {
    m.eventIndex++;
    m.attempt = 0;
    m.tactic = "safe";
    m.phase = "planning";
    return true;
  }
  settleMatch(s);
  return true;
}
export function settleMatch(s) {
  const m = s.match;
  if (!m || m.settled || !eventScores(m).every((e) => e.done)) return;
  if (m.kind === "final" && m.score === m.against) {
    const total = eventScores(m).reduce(
      (n, e) =>
        n +
        (e.home || 0) / EVENTS[e.event].max -
        (e.away || 0) / EVENTS[e.event].max,
      0,
    );
    m.tieBreak = true;
    if (total >= 0) m.score++;
    else m.against++;
  }
  m.settled = true;
  m.phase = "complete";
  const win = m.score > m.against,
    draw = m.score === m.against;
  let prize =
    170 +
    eventScores(m).filter((e) => e.h === 3).length * 45 +
    (win ? 100 : 0) +
    (win && s.sponsor === "performance" ? 120 : 0);
  s.money += prize;
  s.fame += win ? 12 : draw ? 7 : 4;
  for (const ev of EVENT_IDS) {
    const i = EVENT_IDS.indexOf(ev),
      a = s.roster.find((a) => a.id === m.lineup[ev]),
      mark = best(m.homeMarks[i]);
    a.energy = clamp(a.energy - 12, 0, 100);
    a.fatigue = clamp(a.fatigue + 10, 0, 100);
    a.form = clamp(a.form - 4, 20, 96);
    a.meets++;
    xp(a, 24);
    if (mark != null && (!a.pb[ev] || mark > a.pb[ev])) {
      a.pb[ev] = mark;
      a.career.unshift({
        season: s.season,
        label: EVENTS[ev].name + " PB",
        mark,
      });
      a.career = a.career.slice(0, 16);
    }
  }
  const result = {
    id: m.id,
    kind: m.kind,
    name: m.name,
    score: m.score,
    against: m.against,
    win,
    draw,
    prize,
    season: s.season,
    league: s.league,
  };
  s.results.push(result);
  s.history.unshift(result);
  s.history = s.history.slice(0, 50);
  m.prize = prize;
  if (m.kind === "league") {
    const club = s.clubs.find((c) => c.id === m.opponentId);
    club.points += win ? 0 : draw ? 1 : 3;
    club.diff += m.against - m.score;
    club.played++;
    const others = s.clubs.filter((c) => c.id !== m.opponentId);
    const delta =
      others[0].athletes.reduce((n, a) => n + a.stats[0] + a.stats[1], 0) -
      others[1].athletes.reduce((n, a) => n + a.stats[0] + a.stats[1], 0) +
      (random(s) - 0.5) * 80;
    others[delta >= 0 ? 0 : 1].points += 3;
    others[0].diff += delta >= 0 ? 3 : -3;
    others[1].diff += delta >= 0 ? -3 : 3;
    others.forEach((c) => c.played++);
  }
  note(
    s,
    (win
      ? "Club win! "
      : draw
        ? "Honours even. "
        : "A lesson for next time. ") +
      m.score +
      "–" +
      m.against +
      " vs " +
      m.name +
      ". Earned " +
      prize +
      ".",
  );
}
export function leaveMatch(s) {
  const m = s.match;
  if (!m?.settled) return false;
  if (m.kind === "final") {
    s.champion = m.score > m.against;
    s.phase = "seasonEnd";
    if (s.champion) {
      const prize = LEAGUES[s.league].prize;
      s.money += prize;
      s.trophies.push({ league: s.league, season: s.season });
      note(s, LEAGUES[s.league].name + " champions! Bonus " + prize + ".");
    }
  } else {
    s.fixture++;
    s.matchDay = s.day + 7;
    if (s.fixture === 3) {
      const ranking = table(s),
        rank = ranking.findIndex((c) => c.id === "us");
      if (rank < 2) {
        s.finalOpponent = ranking.find((c) => c.id !== "us").id;
        note(
          s,
          "You qualified for the league final! One more week to prepare.",
        );
      } else {
        s.phase = "seasonEnd";
        s.champion = false;
        note(
          s,
          "Season complete. Keep your athletes and build for another run.",
        );
      }
    }
  }
  s.match = null;
  return true;
}
export function nextSeason(s, stay = false) {
  if (s.phase !== "seasonEnd") return false;
  const wasChampion = s.champion,
    promoted = s.champion && !stay && s.league < 4;
  if (promoted) s.league++;
  s.season++;
  s.fixture = 0;
  s.results = [];
  s.phase = "season";
  s.champion = false;
  s.matchDay = s.day + 5;
  s.sponsorLocked = false;
  if (promoted) s.clubs = makeClubs(s, s.league);
  else
    s.clubs.forEach((c) => {
      c.points = 0;
      c.diff = 0;
      c.played = 0;
      if (wasChampion && s.league === 4)
        c.athletes.forEach(
          (a) => (a.stats = a.stats.map((n) => Math.min(90, n + 0.5))),
        );
    });
  s.money += 150;
  s.roster.forEach((a) => {
    a.energy = 100;
    a.fatigue = Math.max(0, a.fatigue - 30);
    a.injury = 0;
  });
  scout(s, true);
  note(
    s,
    promoted
      ? "Welcome to " +
          LEAGUES[s.league].name +
          ". New rivals, new opportunities."
      : "A fresh season. Your club keeps everything it has earned.",
  );
  return true;
}
export function scout(s, free = false) {
  if (!free && s.money < 45) return false;
  if (!free) s.money -= 45;
  s.prospects = Array.from({ length: 3 }, (_, i) =>
    createAthlete(
      s,
      EVENT_IDS[(s.season + i + Math.floor(random(s) * 4)) % 4],
      { base: Math.max(23, LEAGUES[s.league].rating - 1 + random(s) * 5) },
    ),
  );
  return true;
}
export function recruit(s, id) {
  const a = s.prospects.find((a) => a.id === id);
  if (!a || s.roster.length >= 8) return false;
  const cost = 260 + s.league * 90 + Math.round(eventRating(a, a.event) * 3);
  if (s.money < cost) return false;
  s.money -= cost;
  s.roster.push(a);
  s.prospects = s.prospects.filter((p) => p.id !== id);
  note(s, a.name + " joined the club.");
  return true;
}
export function build(s, index, type) {
  const d = FACILITIES[type];
  if (
    !d ||
    index < 0 ||
    index > 8 ||
    s.plots[index] ||
    s.money < d.cost ||
    s.league < d.league ||
    s.plots.some((p) => p?.type === type) ||
    type === "club"
  )
    return false;
  s.money -= d.cost;
  s.plots[index] = { type, level: 1 };
  discover(s);
  note(s, "Built " + d.name + ".");
  return true;
}
export function upgrade(s, index) {
  const p = s.plots[index];
  if (!p || p.level >= 3) return false;
  const cost = Math.round(
    (FACILITIES[p.type].cost || 240) * (0.65 + 0.35 * p.level),
  );
  if (s.money < cost) return false;
  s.money -= cost;
  p.level++;
  note(s, FACILITIES[p.type].name + " reached level " + p.level + ".");
  return true;
}
export function moveFacility(s, from, to) {
  if (from < 1 || from > 8 || to < 1 || to > 8 || !s.plots[from]) return false;
  [s.plots[from], s.plots[to]] = [s.plots[to], s.plots[from]];
  discover(s);
  return true;
}
export function buyKit(s, id, item) {
  const a = s.roster.find((a) => a.id === id),
    d = KIT[item];
  if (!a || !d) return false;
  if (!a.owned.includes(item)) {
    if (s.money < d.cost) return false;
    s.money -= d.cost;
    a.owned.push(item);
  }
  a.kit[d.slot] = item;
  return true;
}
export function tuneKit(s, id, item) {
  const a = s.roster.find((a) => a.id === id),
    d = KIT[item];
  if (
    !a ||
    !d ||
    !d.cost ||
    !a.owned.includes(item) ||
    (a.tuning[item] || 0) >= 2
  )
    return false;
  const cost = Math.round(
    (100 + (a.tuning[item] || 0) * 90) *
      (1 - 0.1 * facilityLevel(s, "workshop")),
  );
  if (s.money < cost) return false;
  s.money -= cost;
  a.tuning[item] = (a.tuning[item] || 0) + 1;
  return true;
}

export function medicalDay(s) {
  if (
    s.match ||
    s.phase !== "season" ||
    s.day < s.matchDay ||
    !s.roster.some((a) => a.injury)
  )
    return false;
  s.matchDay++;
  advanceDay(s);
  note(s, "A medical postponement gives the squad a recovery day.");
  return true;
}

export function releaseAthlete(s, id) {
  if (s.match || s.roster.length <= 4) return false;
  const a = s.roster.find((a) => a.id === id);
  if (!a) return false;
  s.alumni ??= [];
  s.alumni.unshift({
    name: a.name,
    event: a.event,
    career: a.career,
    pb: a.pb,
    season: s.season,
  });
  s.alumni = s.alumni.slice(0, 24);
  s.roster = s.roster.filter((a) => a.id !== id);
  for (const ev of EVENT_IDS) {
    if (s.lineup[ev] !== id) continue;
    const candidates = s.roster
      .filter(
        (a) =>
          EVENT_IDS.filter((e) => e !== ev && s.lineup[e] === a.id).length < 2,
      )
      .sort((a, b) => eventRating(b, ev) - eventRating(a, ev));
    s.lineup[ev] = candidates[0].id;
  }
  note(
    s,
    a.name + " begins a new chapter. Their marks stay in the club’s history.",
  );
  return true;
}
