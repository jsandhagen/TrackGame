import { masteryOf, competeMastery, disciplineModel } from "./mastery.js";
import { EVENTS, EVENT_IDS, TACTICS, SKILLS, BACKGROUNDS, ITEMS, GEAR_SLOTS, SPONSORS } from "../game-content.js";
import {
  clamp,
  random,
  gauss,
  note,
  count,
  effects,
  forecast,
  forecastRaw,
  realMark,
  worldRecord,
  equippedSkills,
  grantXp,
  xpNeeded,
  addItem,
  rollRarity,
  randomItem,
  fansFactor,
  facilityLevel,
  hasCombo,
} from "./core.js";
import { checkGoals } from "./story.js";
import { competitionTier } from "./competition.js";
import { meetInsights } from "./coaching.js";
import { checkDevelopment } from "./development.js";
import { WEATHER, weatherToday } from "./calendar.js";
import { venueFor } from "./venues.js";
import { invitation, clubById, settleInvitation } from "./invitational.js";
import { introduceAfterMeet, firstMeet } from "./progression.js";

export const isLeagueChampionship = (s) => s.competition?.kind === "league" && s.competition.format === "championship" && s.fixture === 3;
// The active three clubs can have more recent marks than their saved pool copies.
export function championshipClubs(s) {
  const pool = s.rivalClubs?.[competitionTier(s)] || s.clubs;
  return pool.map(c => s.clubs.find(active => active.id === c.id) || c);
}
export function championshipField(s) {
  const clubs = championshipClubs(s);
  return { id: clubs[0].id, name: "League championship", color: "#c9a227", style: "Best throwers from every division club · six attempts each", athletes: clubs.flatMap(c => c.athletes) };
}
export function championshipEntries(s) {
  const out = Object.fromEntries(EVENT_IDS.map(ev => [ev, []]));
  for (const club of championshipClubs(s)) {
    const uses = new Map();
    for (const ev of EVENT_IDS) {
      const athlete = [...club.athletes].filter(a => (uses.get(a.id) || 0) < 2).sort((a,b) => forecast(s,b,ev,{club:false}) - forecast(s,a,ev,{club:false}))[0];
      out[ev].push({ athlete, club });
      uses.set(athlete.id, (uses.get(athlete.id) || 0) + 1);
    }
  }
  return out;
}
export function rivalClubFor(s, id) {
  return s.match?.leagueChampionship || isLeagueChampionship(s)
    ? championshipClubs(s).find(c => c.athletes.some(a => a.id === id))
    : s.match ? matchClub(s) : opponent(s);
}

export const best = (marks) => {
  const valid = marks.filter((x) => x != null);
  return valid.length ? Math.max(...valid) : null;
};
export function opponent(s) {
  if (!s.competition) return null;
  if (s.competition.kind === "cup") return invitation(s)?.club;
  if (s.competition.kind === "duel") return s.clubs.find((c) => c.id === s.competition.rival);
  if (isLeagueChampionship(s)) return championshipField(s);
  if (s.fixture < 3) return s.clubs[s.fixture];
  return s.clubs.find((c) => c.id === s.finalOpponent);
}
export const usesOf = (s, id, lineup = s.lineup) => {
  if (lineup === s.match?.lineup && s.match.fields) return s.match.fields.filter((f) => f.home.some((e) => e.id === id)).length;
  if (lineup === s.lineup && s.entries) return EVENT_IDS.filter((ev) => s.entries[ev].includes(id)).length;
  return EVENT_IDS.filter((ev) => lineup[ev] === id).length;
};
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
  // Match second, then third, entries as a group, so an early choice cannot strand
  // an athlete's spare event capacity and leave the last event short-handed.
  // A deep squad fills all three places per event, as rival clubs do.
  for(const entry of [1,2]) {
    const slots=healthy.flatMap(a=>Array.from({length:2-EVENT_IDS.filter(ev=>entriesOf(s,ev).includes(a.id)).length},()=>a.id));
    const matched=new Map();
    function fill(ev,seen) {
      const choices=slots.map((id,index)=>({id,index,a:healthy.find(a=>a.id===id)})).filter(x=>!entriesOf(s,ev).includes(x.id)).sort((a,b)=>forecast(s,b.a,ev)-forecast(s,a.a,ev));
      for(const slot of choices) {
        if(seen.has(slot.index))continue;seen.add(slot.index);
        if(!matched.has(slot.index)||fill(matched.get(slot.index),seen)){matched.set(slot.index,ev);return true;}
      }
      return false;
    }
    for(const ev of EVENT_IDS)fill(ev,new Set());
    for(const [slot,ev] of matched)assignEntry(s,ev,entriesOf(s,ev).length,slots[slot]);
  }
  return true;
}

function rivalEntries(s,rival) {
  const out=Object.fromEntries(EVENT_IDS.map(ev=>[ev,[rival.athletes.find(a=>a.event===ev).id]]));
  for(let pass=0;pass<2;pass++) for(const ev of EVENT_IDS) {
    const candidates=rival.athletes.filter(a=>!out[ev].includes(a.id)&&EVENT_IDS.filter(e=>out[e].includes(a.id)).length<2).sort((a,b)=>forecast(s,b,ev,{club:false})-forecast(s,a,ev,{club:false}));
    if(candidates[0])out[ev].push(candidates[0].id);
  }
  return out;
}
// The kind of the next meet on the books, and whether it's in your own stadium.
// League fixtures alternate grounds; finals are neutral; duels come to you.
export function bookedMeet(s) {
  const c = s.competition;
  if (!c) return null;
  const kind = c.kind === "duel" ? "duel" : c.kind === "cup" ? "cup" : s.fixture < 3 ? "league" : "final";
  return { kind, home: kind === "duel" || (kind === "league" && (c.stage === 2 ? s.fixture === 2 : s.fixture !== 1)) };
}
export function meetVenue(s) {
  const m = s.match, booked = m ? { kind: m.kind, home: m.home } : bookedMeet(s);
  if (!booked) return null;
  return venueFor(s, { ...booked, tier: competitionTier(s), club: m ? matchClub(s) : opponent(s), invitation: s.invitations?.offer });
}
export const matchClub = (s) => s.match?.leagueChampionship ? championshipField(s) : clubById(s, s.match?.opponentId);
export function startMatch(s) {
  if (s.match || !s.competition || s.phase !== "season" || s.day < s.matchDay || s.pendingEvent || lineupProblem(s)) return false;
  const rival = opponent(s);
  if (!rival) return false;
  const leagueChampionship = isLeagueChampionship(s);
  const clubs = leagueChampionship ? championshipClubs(s) : [rival];
  // Each division club sends its strongest available thrower in each event.
  const awayEntries = leagueChampionship ? Object.fromEntries(Object.entries(championshipEntries(s)).map(([ev, entries]) => [ev, entries.map(e => e.athlete.id)])) : rivalEntries(s,rival);
  s.sponsorLocked = true;
  const { kind, home } = bookedMeet(s);
  for (const r of rival.athletes) { r.condition = 35 + Math.round(random(s) * 45); r.stamina=100; }
  s.match = {
    id: s.season + "-" + s.day + "-" + competitionTier(s) + "-" + s.fixture,
    kind,
    home,
    opponentId: rival.id,
    ...(leagueChampionship ? { leagueChampionship: true, clubs: clubs.map(c => ({ id: c.id, name: c.name, color: c.color })) } : {}),
    name: rival.name,
    color: rival.color,
    eventIndex: 0,
    rotation: true,
    // Meet-day weather: the forecast decides the conditions. Windy days always blow.
    weather: weatherToday(s),
    wind: weatherToday(s)==="windy" ? (random(s)<0.5?"headwind":"crosswind") : ["calm","calm","headwind","crosswind"][Math.floor(random(s)*4)],
    attempts: leagueChampionship ? 6 : 3,
    championship: kind === "final" || kind === "cup",
    entryIndex: 0,
    finalRound: leagueChampionship,
    fields: EVENT_IDS.map((ev, i) => ({
      home: entriesOf(s, ev).map((id) => ({ id, marks: [], finalist: leagueChampionship })),
      away: awayEntries[ev].map((id) => ({ id, marks: [], finalist: leagueChampionship, ...(leagueChampionship ? { clubId: clubs.find(c => c.athletes.some(a => a.id === id)).id } : {}) })),
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
  const club = matchClub(s);
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
function scoreField(field,done=true) {
  const rows=ranking(field),table=[5,3,1],out=[];
  for(let i=0;i<rows.length;) {
    const row=rows[i],mark=best(row.marks);
    if(mark==null){out.push({...row,mark:null,place:null,points:0});i++;continue;}
    const key=r=>JSON.stringify(r.marks.filter(v=>v!=null).sort((a,b)=>b-a));
    let end=i+1;while(end<rows.length&&key(rows[end])===key(row))end++;
    let points=0;for(let j=i;j<end;j++)points+=table[j]||0;
    for(let j=i;j<end;j++)out.push({...rows[j],mark:best(rows[j].marks),place:i+1,points:done?points/(end-i):0});
    i=end;
  }
  return out;
}
export function eventScores(m) {
  return EVENT_IDS.map((event,i)=>{
    if(!m.fields){const home=best(m.homeMarks[i]),away=best(m.awayMarks[i]),done=m.homeMarks[i].length===m.attempts&&m.awayMarks[i].length===m.attempts;
      return {event,home,away,done,h:done&&home!=null&&(away==null||home>away)?3:0,a:done&&away!=null&&(home==null||away>home)?3:0,placings:[]};}
    const f=m.fields[i],done=!!m.closed[i],placings=scoreField(f,done);
    return {event,home:best(f.home.flatMap(e=>e.marks)),away:best(f.away.flatMap(e=>e.marks)),done,placings,
      h:placings.filter(e=>e.side==="home").reduce((n,e)=>n+e.points,0),a:m.leagueChampionship
        ? Math.max(0,...m.clubs.map(c => placings.filter(e=>e.side==="away" && e.clubId===c.id).reduce((n,e)=>n+e.points,0)))
        : placings.filter(e=>e.side==="away").reduce((n,e)=>n+e.points,0)};
  });
}
export function rescore(m) {
  const sc = eventScores(m);
  m.score = sc.reduce((n, e) => n + e.h, 0);
  m.against = sc.reduce((n, e) => n + e.a, 0);
  if (m.leagueChampionship) {
    m.teamScores = championshipScores(m);
    const leader = m.teamScores.find(c => c.id !== "us");
    m.against = leader.points;
    m.leadingClub = leader.name;
  }
}

export function championshipScores(m) {
  if (!m.leagueChampionship) return [];
  return [{ id: "us", name: "Your club" }, ...m.clubs].map(club => {
    let points = 0, performance = 0;
    for (const e of eventScores(m)) {
      const rows = e.placings.filter(r => club.id === "us" ? r.side === "home" : r.side === "away" && r.clubId === club.id);
      points += rows.reduce((n,r) => n + r.points, 0);
      if (e.done) performance += Math.max(0, ...rows.map(r => r.mark || 0)) / EVENTS[e.event].max;
    }
    return { ...club, points, performance };
  }).sort((a,b) => b.points - a.points || b.performance - a.performance || String(a.id).localeCompare(String(b.id)));
}

// Meaningful next scoring target across the entire field, including teammates.
export function fieldLeaderboard(s,i=s.match?.eventIndex,hide) {
  if(!s.match?.fields)return [];
  let field=s.match.fields[i];
  if(hide && hide.eventIndex===i) field={home:field.home.map((e,n)=>({...e,marks:hide.side==="home"&&n===s.match.entryIndex?e.marks.slice(0,hide.attempt):e.marks})),away:field.away.map((e,n)=>({...e,marks:hide.side==="away"&&n===s.match.entryIndex?e.marks.slice(0,hide.attempt):e.marks}))};
  return scoreField(field,true);
}
export function fieldTarget(s,side="home") {
  const m=s.match;
  if(!m?.fields)return null;
  const i=m.eventIndex,athlete=side==="home"?homeAthlete(s):rivalAthlete(s),rows=fieldLeaderboard(s,i),own=rows.find(r=>r.side===side&&r.id===athlete.id);
  if(!own)return null;
  const ownTeam = r => m.leagueChampionship && side === "away" ? r.side === "away" && r.clubId === own.clubId : r.side === side;
  const margin=rows.reduce((n,r)=>n+(ownTeam(r)?1:-1)*r.points,0);
  const candidates=[...new Set(rows.filter(r=>r.mark!=null&&(own.mark==null||r.mark>=own.mark)).map(r=>r.mark))].sort((a,b)=>a-b);
  for(const mark of candidates){
    const source=m.fields[i],f={home:source.home.map(e=>({...e,marks:[...e.marks]})),away:source.away.map(e=>({...e,marks:[...e.marks]}))};
    f[side].find(e=>e.id===athlete.id).marks.push(+(mark+0.01).toFixed(2));
    const after=scoreField(f,true);
    const gain=after.reduce((n,r)=>n+(ownTeam(r)?1:-1)*r.points,0)-margin;
    const placing=after.find(r=>r.side===side&&r.id===athlete.id)?.place;
    const qualification=m.championship&&!m.finalRound&&(own.place==null||own.place>4)&&placing<=4;
    if(gain>0||qualification)return {mark:+(mark+0.01).toFixed(2),place:placing,swing:gain,qualification,delta:own.mark==null?null:mark+0.01-own.mark};
  }
  return own.mark==null?{mark:null,place:null,swing:0,legal:true}:null;
}
// Situational context for one side's next attempt.
function context(s, side) {
  syncMarks(s);
  const m = s.match,
    i = m.eventIndex,
    own = (side === "home" ? m.homeMarks : m.awayMarks)[i],
    opp = (side === "home" ? m.awayMarks : m.homeMarks)[i],
    athlete = side === "home" ? homeAthlete(s) : rivalAthlete(s);
  const target=m.rotation?fieldTarget(s,side):null;
  const board=m.rotation?fieldLeaderboard(s,i):[];
  const fieldBest=board.find(r=>!(r.side===side&&r.id===athlete.id)&&r.mark!=null)?.mark;
  return { m, i, ev: EVENT_IDS[i], own, opp, athlete, target, fieldBest, k: own.length, ownBest: best(own), oppBest: m.rotation?(target?.mark??fieldBest??null):best(opp), left: m.attempts - own.length };
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
  if (!fx.sig || c.left <= 0 || !equippedSkills(c.athlete,"meet").some(k=>SKILLS[k].sig && (!SKILLS[k].event || SKILLS[k].event===c.ev))) return false;
  return side === "home" ? !m.sigUsed.includes(c.athlete.id) : !m.rivalSig.includes(c.athlete.id);
}
export function projected(s, side = "home") {
  const c = context(s, side);
  return forecast(s, c.athlete, c.ev, { club: side === "home", doubleDuty: side === "home" ? usesOf(s, c.athlete.id, s.match.lineup) > 1 : (s.match.fields?.filter((f) => f.away.some((e) => e.id === c.athlete.id)).length || 0) > 1 });
}
export function autoTactic(s,side="home") {
  if(s.match?.rotation) {
    const c=context(s,side),actual=c.m.fields[c.i];
    // Build a sound series before optimising the final attempt for team points.
    if(c.left>1)return "balanced";
    const field={home:actual.home.map(e=>({...e,marks:[...e.marks]})),away:actual.away.map(e=>({...e,marks:[...e.marks]}))};
    for(const team of ["home","away"]) for(const e of field[team]) if(!(team===side&&e.id===c.athlete.id)) {
      const a=(team==="home"?s.roster:matchClub(s).athletes).find(a=>a.id===e.id);
      const estimate=forecast(s,a,c.ev,{club:team==="home",doubleDuty:team==="home"?usesOf(s,a.id,c.m.lineup)>1:c.m.fields.filter(f=>f.away.some(r=>r.id===a.id)).length>1});
      if(e.marks.length<c.m.attempts)e.marks.push(estimate*0.995);
    }
    const samples=[[-1.6,0.08],[-0.8,0.24],[0,0.36],[0.8,0.24],[1.6,0.08]];
    const clubId=entrant(s,side)?.clubId;
    const margin=rows=>rows.reduce((n,r)=>n+((c.m.leagueChampionship && side==="away" ? r.side==="away" && r.clubId===clubId : r.side===side)?1:-1)*r.points,0);
    const base=margin(scoreField(field));
    let winner="balanced",bestValue=-Infinity;
    for(const tactic of ["balanced","safe","attack"]) {
      const risk=riskModel(s,c,side,tactic,"good",false);
      let expected=base*risk.foul;
      for(const [z,w] of samples) {
        const f={home:field.home.map(e=>({...e,marks:[...e.marks]})),away:field.away.map(e=>({...e,marks:[...e.marks]}))};
        f[side].find(e=>e.id===c.athlete.id).marks.push(risk.metres(z));
        expected+=(1-risk.foul)*w*margin(scoreField(f));
      }
      // Preserve readiness and confidence when extra risk cannot buy team points.
      const value=expected-risk.foul*0.03-TACTICS[tactic].stamina*0.002;
      if(value>bestValue+1e-8){bestValue=value;winner=tactic;}
    }
    return winner;
  }
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
  if(c.m.rotation) return c.left===1 && c.target && (c.target.legal || c.target.mark<=projected(s)*1.1);
  return c.left === 1 && c.opp.length > c.own.length && (c.ownBest == null || (c.oppBest != null && c.oppBest >= c.ownBest));
}
export function needsDecision(s) {
  const m = s.match;
  if (!m || m.phase !== "live") return false;
  const c = context(s, "home");
  if (m.fields && (!entrant(s, "home") || (m.finalRound && !entrant(s, "home").finalist))) return false;
  if (c.own.length >= m.attempts || (m.rotation ? m.turnSide!=="home" : c.opp.length <= c.own.length)) return false;
  return s.settings.meetMode === "coach" || (!firstMeet(s) && s.settings.clutch !== false && isClutch(s));
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
    // Behind the other club's best in this event (field meets), or the head-to-head rival.
    rivalBest = c.m.rotation ? best(c.m.fields[c.i][side === "home" ? "away" : "home"].flatMap((e) => e.marks)) : c.oppBest,
    trailing = rivalBest != null && (c.ownBest == null || c.ownBest < rivalBest),
    leading = c.ownBest != null && ((c.m.rotation?c.fieldBest:c.oppBest) == null || c.ownBest > (c.m.rotation?c.fieldBest:c.oppBest));
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
  on(c.m.kind === "final" || c.m.kind === "cup", "final", "Big Stage");
  const clubId = side === "home" ? "us" : entrant(s,"away")?.clubId;
  const standings = c.m.leagueChampionship ? championshipScores(c.m) : null;
  const teamBehind = standings ? standings.find(club=>club.id===clubId)?.points < standings[0].points : side === "home" ? c.m.score < c.m.against : c.m.against < c.m.score;
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
  const squad = side === "home" ? (c.m.fields ? [...new Set(c.m.fields.flatMap((f) => f.home.map((e) => e.id)))].map((id) => s.roster.find((x) => x.id === id)) : EVENT_IDS.map((ev) => s.roster.find((x) => x.id === c.m.lineup[ev]))) : rivalClubFor(s,c.athlete.id).athletes;
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
  const focus = a.stats[3], mastery=masteryOf(a,c.ev),discipline=disciplineModel(a,c.ev,c.m.wind);
  const baseFoul={shot:0.075,discus:0.14,hammer:0.125,jav:0.12}[c.ev];
  let foul = Math.max(0.015,baseFoul-mastery*0.00065-focus*0.0002) * discipline.foul * T.foul * fx.foul * (leading && fx.leading !== 1 ? 0.5 : 1) * (afterFoul && fx.afterFoul !== 1 ? 0.7 : 1);
  foul *= quality === "perfect" ? 0.6 : quality === "poor" ? 1.5 : 1;
  foul = clamp(foul, 0.01, 0.5);
  if (sig || (first && fx.safeFirst)) foul = 0;
  const sd = T.sd * fx.variance * discipline.spread * (1.4 - mastery / 200) * (1.1-focus/500),
    mean = T.mean + (tactic === "attack" ? fx.attackBoost : 0),
    qm = quality === "perfect" ? 1.02 + (fx.perfect ? 0.01 : 0) : quality === "poor" ? 0.95 : 1;
  const P = forecastRaw(s, a, c.ev, { fx, club: side === "home", doubleDuty: side === "home" ? usesOf(s, a.id, c.m.lineup) > 1 : (c.m.fields?.filter((f) => f.away.some((e) => e.id === a.id)).length || 0) > 1 });
  const sky = WEATHER[c.m.weather] || {};
  if (sky.foul && !sig && !(first && fx.safeFirst)) foul = clamp(foul * sky.foul, 0.01, 0.5);
  const raw = P * mean * qm * mult * discipline.mark * (sky.mark || 1),
    metres = (z) => realMark(c.ev, raw * (1 + z * sd));
  return { foul, sd, raw, metres, center: metres(0), low: metres(-1.6), high: metres(1.6), acts, fx, P: realMark(c.ev, P), discipline, target:c.target };
}

function throwFor(s, side, tactic, quality, sig) {
  const m = s.match,
    c = context(s, side),
    a = c.athlete;
  if (sig && !canSignature(s, side)) sig = false;
  const r = riskModel(s, c, side, tactic, quality, sig);
  const foul = random(s) < r.foul,
    z = clamp(gauss(s), -2.4, 2.4),
    mark = foul ? null : +r.metres(z).toFixed(2);
  if (sig) (side === "home" ? m.sigUsed : m.rivalSig).push(a.id);
  a.stamina = clamp(a.stamina - (TACTICS[tactic].stamina + r.discipline.energy) * r.fx.stamina * (WEATHER[m.weather]?.stamina || 1), 0, 100);
  // A foul shakes confidence for the rest of the meet; a clean mark steadies it.
  a.condition = clamp(a.condition + (foul ? -8 : 2), 0, 100);
  const beforeBoard = c.m.rotation ? fieldLeaderboard(s,c.i) : [];
  const previousRow = beforeBoard.find(e => e.side === side && e.id === a.id);
  const beforeMargin=beforeBoard.reduce((n,e)=>n+(e.side===side?1:-1)*e.points,0);
  c.own.push(mark);
  const afterBoard = c.m.rotation ? fieldLeaderboard(s,c.i) : [];
  const row = afterBoard.find(e => e.side === side && e.id === a.id);
  const swing=c.m.rotation?afterBoard.reduce((n,e)=>n+(e.side===side?1:-1)*e.points,0)-beforeMargin:0;
  const previousPb = side === "home" ? Math.max(a.pb[c.ev] || 0, c.ownBest || 0) : 0;
  const newPb = side === "home" && mark != null && mark > previousPb && mark > (a.pb[c.ev] || 0);
  // A world record stands from the moment it lands; later throws in the meet must beat it.
  const worldRecordBroken = side === "home" && mark != null && mark > worldRecord(s, c.ev);
  if (worldRecordBroken) {
    const previous = worldRecord(s, c.ev);
    s.worldRecords = { ...s.worldRecords, [c.ev]: { mark, name: a.name, season: s.season, day: s.day, previous } };
    (m.worldRecords ??= []).push({ id: a.id, name: a.name, event: c.ev, mark, previous });
  }
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
    worldRecord: worldRecordBroken,
    previousPb,
    pbDelta: newPb && previousPb ? mark - previousPb : 0,
    ownBest,
    oppBest,
    leading: ownBest != null && ((m.rotation?c.fieldBest:oppBest) == null || ownBest > (m.rotation?c.fieldBest:oppBest)),
    risk: r.foul,
    target: c.target,
    approach: r.discipline.approach,
    scoringSwing: c.m.rotation ? swing : 0,
    previousPlace: previousRow?.place ?? null,
    place: row?.place ?? null,
    tookLead: row?.place === 1 && previousRow?.place !== 1,
    qualified: !!(m.championship && !m.finalRound && row?.place != null && row.place <= 4 && (!previousRow?.place || previousRow.place > 4)),
    improvement: mark != null && c.ownBest != null ? Math.max(0, mark - c.ownBest) : 0,
  };
}
function autoQuality(s, a) {
  return effects(s, a).perfect && random(s) < 0.3 ? "perfect" : "good";
}
function shouldAutoSig(s, side) {
  const c = context(s, side);
  if(!canSignature(s,side))return false;
  if(c.m.rotation) {
    if(c.target?.legal)return c.left===1;
    if(c.target?.mark!=null && c.left<=2 && c.target.mark<=projected(s,side)*effects(s,c.athlete,side==="home").sig*1.08)return true;
    return false;
  }
  return c.left === 1 || (c.oppBest != null && (c.ownBest == null || c.ownBest < c.oppBest) && c.left <= 2);
}

// Advance one presentable beat. Returns null while waiting for the coach.
export function advanceMatch(s) {
  const m = s.match;
  if(m?.rotation)return advanceFieldMatch(s);
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
function selectFieldTurn(s) {
  const m=s.match,f=m.fields[m.eventIndex],queue=[];
  for(let index=0;index<Math.max(f.home.length,f.away.length);index++) for(const side of ["away","home"]) {
    const e=f[side][index];if(e&&(!m.finalRound||e.finalist)&&e.marks.length<m.attempts) queue.push({side,index,attempt:e.marks.length});
  }
  if(!queue.length)return null;
  const round=Math.min(...queue.map(t=>t.attempt));return queue.find(t=>t.attempt===round);
}
function advanceFieldMatch(s) {
  const m=s.match;
  if(["decide","complete"].includes(m.phase))return null;
  if(m.phase==="intro"){m.phase="live";return m.last={type:"meetStart"};}
  if(m.closed[m.eventIndex]) {
    if(m.eventIndex===3){settleMatch(s);return m.last={type:"complete",win:meetOutcome(m)>0,draw:meetOutcome(m)===0,score:m.score,against:m.against};}
    m.eventIndex++;m.entryIndex=0;m.finalRound=!!m.leagueChampionship;m.attempts=m.leagueChampionship?6:3;
  }
  let turn=selectFieldTurn(s);
  if(!turn) {
    if(m.championship&&!m.finalRound) {
      const f=m.fields[m.eventIndex],ranked=ranking(f).filter(e=>best(e.marks)!=null),finalists=ranked.slice(0,4);
      for(const side of ["home","away"]) for(const e of f[side]) e.finalist=finalists.some(r=>r.side===side&&r.id===e.id);
      m.finalRound=true;m.attempts=6;turn=selectFieldTurn(s);
      if(turn){m.entryIndex=turn.index;m.turnSide=turn.side;syncMarks(s);return m.last={type:"eventStart",event:EVENT_IDS[m.eventIndex],eventIndex:m.eventIndex,home:homeAthlete(s).id,away:rivalAthlete(s).id,finals:true};}
    }
    return closeEvent(s,m.eventIndex);
  }
  m.entryIndex=turn.index;m.turnSide=turn.side;syncMarks(s);
  if(!m.started[m.eventIndex]){m.started[m.eventIndex]=true;return m.last={type:"eventStart",event:EVENT_IDS[m.eventIndex],eventIndex:m.eventIndex,home:homeAthlete(s).id,away:rivalAthlete(s).id};}
  if(turn.side==="home"&&needsDecision(s)){m.phase="decide";return m.last={type:"decide",clutch:isClutch(s),eventIndex:m.eventIndex,recommended:autoTactic(s),target:fieldTarget(s)};}
  const a=turn.side==="home"?homeAthlete(s):rivalAthlete(s);
  return m.last=throwFor(s,turn.side,autoTactic(s,turn.side),turn.side==="home"?autoQuality(s,a):"good",shouldAutoSig(s,turn.side));
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
      for(const side of ["home","away"]) {
        const squad=side==="home"?s.roster:matchClub(s).athletes;
        for(const row of e.placings||[]) if(row.side===side&&row.place===1) {
          const winner=squad.find(a=>a.id===row.id);
          const teammates=side==="away" ? rivalClubFor(s,winner.id).athletes : squad;
          if(effects(s,winner,side==="home").hype) for(const a of teammates) if(a.id!==winner.id) a.condition=clamp(a.condition+8,0,100);
        }
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
  if (m.leagueChampionship) {
    const tied = m.teamScores.filter(c => c.points === m.teamScores[0].points);
    if (tied.length > 1) {
      m.tieBreak = true;
      m.tieBreakWinner = m.teamScores[0].id === "us" ? "home" : "away";
    }
  } else if ((m.kind === "final" || m.kind === "cup") && meetOutcome(m) === 0) {
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
  if (m.kind === "cup") money = Math.round(money * 1.5);
  s.money += money;
  let fans = win ? 15 + 10 * L : draw ? 6 + 4 * L : 3 + 2 * L;
  fans *= (sponsor.fanBoost || 1) * (hasCombo(s, "legends") ? 1.25 : 1) * (1 + 0.1 * facilityLevel(s, "statue")) * (win && m.home ? 1 + 0.2 * facilityLevel(s, "lights") : 1);
  const rewards = { athleteProgress: [], mastery: [], money, fans: 0, items: [], levelUps: [], pbs: [], mvp: null, goals: [], development: [] };
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
      const masteryGain=competeMastery(a,ev,entry.marks.filter(v=>v!=null).length);
      rewards.mastery.push({id:a.id,name:a.name,event:ev,gain:masteryGain,mastery:masteryOf(a,ev)});
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
    const before = { level: a.level, xp: a.xp, sp: a.sp, stats: [...a.stats], potential: a.potential };
    a.meets++; a.stamina = clamp(a.stamina-15,0,100); a.condition = clamp(a.condition+(win?8:draw?2:-6),0,100); a.buff=null;
    grantXp(s,a,30*(m.kind === "duel" ? 0.7:1),rewards.levelUps);
    rewards.development.push(...checkDevelopment(s,a));
    const after = { level: a.level, xp: a.xp, sp: a.sp, stats: [...a.stats], potential: a.potential };
    // Include the XP spent crossing level thresholds, and reward each entrant once.
    let xpGained = after.xp - before.xp;
    for (let level = before.level; level < after.level; level++) xpGained += xpNeeded(level);
    rewards.athleteProgress.push({ id: a.id, name: a.name, before, after, xpGained });
  }
  if(m.fields) for(const [i,ev] of EVENT_IDS.entries()) for(const entry of m.fields[i].away) {
    const a=matchClub(s).athletes.find(a=>a.id===entry.id);
    competeMastery(a,ev,entry.marks.filter(v=>v!=null).length);
  }
  // World records: the sport's biggest headline, paid in prize money, fans and Insights.
  rewards.worldRecords = m.worldRecords || [];
  for (const wr of rewards.worldRecords) {
    const a = s.roster.find((x) => x.id === wr.id);
    s.money += 2500; rewards.money += 2500; fans += 400;
    count(s, "worldRecords");
    a?.career.unshift({ season: s.season, label: "WORLD RECORD · " + EVENTS[wr.event].name, mark: wr.mark });
    note(s, "WORLD RECORD! " + wr.name + " throws " + wr.mark.toFixed(2) + " m in the " + EVENTS[wr.event].name.toLowerCase() + ", beating " + wr.previous.toFixed(2) + ".", "win");
  }
  rewards.insights = meetInsights(s,rewards.pbs.length + 3 * rewards.worldRecords.length);
  rewards.fans = Math.round(fans);
  s.fans += rewards.fans;
  if (m.kind === "cup") settleInvitation(s, win, rewards);
  else {
    // A reward chest: wins always drop something, finals drop more.
    const drops = win ? (m.kind === "final" ? 2 : 1) : random(s) < 0.35 ? 1 : 0;
    for (let n = 0; n < drops; n++) {
      const rarity = win ? rollRarity(s, 0.15 * L + (m.kind === "final" ? 0.6 : 0)) : "common";
      const item = randomItem(s, rarity, (d) => win || d.kind === "use");
      addItem(s, item);
      rewards.items.push(item);
    }
  }
  count(s, "meets");
  const introduced = introduceAfterMeet(s);
  if (introduced) {
    rewards.introduction = introduced.id;
    note(s, "New: " + introduced.name + ". " + introduced.desc, "story");
  }
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
    if(win) {
      // A beaten club works on its weakest event rather than replacing its roster.
      const weak=eventScores(m).reduce((a,b)=>a.a<b.a?a:b);
      const specialist=club.athletes.find(a=>a.event===weak.event);
      if(specialist) specialist.mastery[weak.event]=Math.min(100,specialist.mastery[weak.event]+0.8);
    }
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


export const meetOutcome = (m) => m.leagueChampionship && m.teamScores?.length
  ? (m.teamScores[0].id === "us" ? 1 : -1)
  : Math.sign(m.score - m.against) || (m.tieBreakWinner === "home" ? 1 : m.tieBreakWinner === "away" ? -1 : 0);
