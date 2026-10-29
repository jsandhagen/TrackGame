import { EVENTS, EVENT_IDS } from "../game-content.js";
import { realMark, forecast, random } from "./core.js";
import { competitionTier, RIVAL_RATING } from "./competition.js";

export const CHAMPIONSHIP_FINALISTS = 6;
export const CHAMPIONSHIP_POINTS = [10,8,6,5,4,3,2,1];
export const championshipBooking = s => s.competition?.kind === "league" && s.competition.format === "championship";
// Game standards scale with the division. Only marks actually earned during this
// league count; a training forecast or a lifetime PB is not an entry qualification.
export function qualifyingStandard(s, event) {
  const e = EVENTS[event], rating = RIVAL_RATING[competitionTier(s) * 3 + (s.competition?.stage || 0)] * 0.85;
  return +realMark(event, e.min + (e.max-e.min) * (rating/100) ** 1.12).toFixed(2);
}
export const qualifyingMark = (s, id, event) => s.competition?.qualifyingMarks?.[id]?.[event] || 0;
export const championshipQualified = (s, id, event) => qualifyingMark(s,id,event) >= qualifyingStandard(s,event);
export function recordQualifier(s, id, event, marks) {
  const valid = marks.filter(v => v != null);
  if (!valid.length) return;
  const records = s.competition.qualifyingMarks ??= {};
  (records[id] ??= {})[event] = Math.max(qualifyingMark(s,id,event), ...valid);
}
// Other division clubs also compete during the league's duel weeks. Their
// three-attempt series are simulated and recorded rather than awarding a forecast.
export function simulateQualifiers(s, club, entries) {
  for (const ev of EVENT_IDS) for (const id of entries[ev]) {
    const a = club.athletes.find(a => a.id === id), marks = [];
    for (let n=0;n<3;n++) marks.push(random(s)<0.1 ? null : +(forecast(s,a,ev,{club:false}) * (0.94+random(s)*0.09)).toFixed(2));
    recordQualifier(s,id,ev,marks);
  }
}
export function seedChampionshipLineup(s) {
  const entries = Object.fromEntries(EVENT_IDS.map(ev => [ev,[]])), uses = new Map();
  for (let slot=0;slot<3;slot++) for (const ev of EVENT_IDS) {
    const a = s.roster.filter(a => championshipQualified(s,a.id,ev) && !entries[ev].includes(a.id) && (uses.get(a.id)||0)<2)
      .sort((a,b) => (!!a.injury)-(!!b.injury) || qualifyingMark(s,b.id,ev)-qualifyingMark(s,a.id,ev))[0];
    if (a) { entries[ev].push(a.id); uses.set(a.id,(uses.get(a.id)||0)+1); }
  }
  s.entries = entries;
  for (const ev of EVENT_IDS) s.lineup[ev] = entries[ev][0] || null;
  return EVENT_IDS.some(ev => entries[ev].length);
}


// A read-only qualification screen may include measured marks from the current
// league duel. Hide the attempt that the presenter has not landed yet.
export function qualificationProgress(s, event, hide) {
  const match=s.match?.kind==="league" ? s.match : null;
  const index=EVENT_IDS.indexOf(event), field=match?.fields?.[index];
  return s.roster.map(a=>{
    const entry=field?.home.find(e=>e.id===a.id);
    let marks=entry?.marks || [];
    if(hide?.side==="home" && hide.eventIndex===index && field?.home[match.entryIndex]?.id===a.id) marks=marks.slice(0,hide.attempt);
    const mark=Math.max(qualifyingMark(s,a.id,event),0,...marks.filter(v=>v!=null));
    return {id:a.id,name:a.name,mark,standard:qualifyingStandard(s,event),qualified:mark>=qualifyingStandard(s,event),entered:!!entry};
  }).filter(row=>row.mark>0 || row.entered || s.roster.find(a=>a.id===row.id).event===event).sort((a,b)=>b.mark-a.mark);
}
