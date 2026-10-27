import { FACILITIES, STADIUM } from '../game-content.js';
import { clamp, grantXp, count } from './core.js';

export const DUTIES = {
  club: { name:'Club open day', desc:'Welcome visitors and help with community club sessions.', money:8, fans:1, stamina:6 },
  cafe: { name:'Canteen service', desc:'Serve athletes and visiting supporters. Takings depend on visitors and service capacity.', sales:1.8, stamina:8 },
  shop: { name:'Club kit stall', desc:'Sell club shirts and kit to visitors. More supporters sustain a busier stall.', sales:2.5, stamina:8 },
  gym: { name:'Training partner', desc:'Spot lifts, organise medicine-ball work and record useful coaching observations.', insights:1, stamina:8 },
  lab: { name:'Technique testing assistant', desc:'Help record and compare release and movement data for the coaches.', insights:2, stamina:6 },
  scout: { name:'Community throws clinic', desc:'Help run a local introductory throws session and grow the club following.', fans:3, stamina:8 },
  workshop: { name:'Implement & kit service', desc:'Help inspect, clean and maintain equipment for local clubs.', money:12, stamina:8 },
  spa: { name:'Recovery support', desc:'Help organise mobility and recovery sessions. Resting teammates recover extra stamina.', recovery:2, stamina:6 },
  studio: { name:'Meet film review', desc:'Tag competition footage and collect observations for the coaching staff.', insights:2, stamina:4 },
};
export function dutySite(s,key) {
  if(key==='studio') return s.stadium.studio>0 ? {key,type:'studio',level:s.stadium.studio,name:STADIUM.studio.name} : null;
  if(!/^plot:(?:[0-9]|1[0-2])$/.test(key)) return null;
  const index=Number(key.slice(5)),p=s.plots[index];
  return p && DUTIES[p.type] ? {key,index,type:p.type,level:p.level,name:FACILITIES[p.type].name} : null;
}
export const dutySites = s => [...s.plots.map((_,i)=>dutySite(s,'plot:'+i)),dutySite(s,'studio')].filter(Boolean);
export const athleteDuty = (s,id) => Object.entries(s.facilityDuties||{}).find(([,athlete])=>athlete===id)?.[0] || null;
export function assignDuty(s,key,id) {
  if(s.match || s.pendingEvent || !dutySite(s,key)) return false;
  const a=s.roster.find(a=>a.id===id);
  if(id && (!a || a.injury)) return false;
  s.facilityDuties ??= {};
  if(id) for(const [other,athlete] of Object.entries(s.facilityDuties)) if(athlete===id) delete s.facilityDuties[other];
  if(id) s.facilityDuties[key]=id; else delete s.facilityDuties[key];
  return true;
}
export function dutyYield(s,key,visitors) {
  const site=dutySite(s,key);
  if(!site) return null;
  const d=DUTIES[site.type],level=site.level;
  // Limited service capacity keeps staff revenue tied to an actual audience.
  const customers=Math.min(visitors,8+6*level);
  return { money:Math.round((d.money||0)*level+(d.sales||0)*level*customers), insights:(d.insights||0)*level, fans:(d.fans||0)*level, recovery:(d.recovery||0)*level, stamina:d.stamina };
}
export function workFacility(s,a,key,visitors,report) {
  const site=dutySite(s,key),out=dutyYield(s,key,visitors);
  if(!site || !out) return null;
  a.stamina=clamp(a.stamina-out.stamina,0,100);
  s.money+=out.money;s.coaching.insights+=out.insights;s.fans+=out.fans;
  grantXp(s,a,2,report.levelUps);
  count(s,'facilityDays');count(s,'facilityMoney',out.money);count(s,'facilityInsights',out.insights);count(s,'facilityFans',out.fans);
  const entry={id:a.id,name:a.name,key,facility:site.type,...out};
  report.duties.push(entry);
  return entry;
}
export function moveDuties(s,from,to) {
  const a='plot:'+from,b='plot:'+to,staff=s.facilityDuties||{};
  const x=staff[a],y=staff[b];delete staff[a];delete staff[b];
  if(x) staff[b]=x;if(y) staff[a]=y;
}
