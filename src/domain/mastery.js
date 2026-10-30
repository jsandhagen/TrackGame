import { EVENT_IDS, EVENTS } from '../game-content.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const PROFILES={
 consistent:{name:'Steady competitor',desc:'A tighter performance spread in every event.',variance:0.78},
 explosive:{name:'Explosive competitor',desc:'Gets more distance from aggressive attempts.',attackBoost:0.012},
 durable:{name:'Efficient mover',desc:'Uses less stamina in training and competition.',stamina:0.85},
 adaptable:{name:'Quick adapter',desc:'Learns secondary-event technique faster.'},
};
export function initMastery(a,legacy=false){
 a.trainingEvent??=a.event;
 a.profile??=Object.keys(PROFILES)[a.id%4];
 a.mastery??=Object.fromEntries(EVENT_IDS.map(ev=>[ev,ev===a.event?30:8]));
 a.eventMeets??=Object.fromEntries(EVENT_IDS.map(ev=>[ev,legacy?(a.pb?.[ev]?Math.min(12,a.meets||0):ev===a.event?Math.min(8,a.meets||0):0):0]));
 if(legacy) for(const ev of EVENT_IDS) if(a.eventMeets[ev]) a.mastery[ev]=Math.max(a.mastery[ev],Math.min(80,30+a.eventMeets[ev]*3));
 return a;
}
export const masteryOf=(a,ev)=>a.mastery?.[ev]??(a.event===ev?30:8);
export const masteryCap=(a,ev)=>Math.min(100,35+5*(a.eventMeets?.[ev]||0));
export function practiceMastery(a,amount,ev=a.trainingEvent||a.event){
 const old=masteryOf(a,ev),transfer=a.profile==='adaptable'&&ev!==a.event?1.35:1;
 a.mastery[ev]=Math.max(old,Math.min(masteryCap(a,ev),old+amount*transfer));
 return a.mastery[ev]-old;
}
export function competeMastery(a,ev,valid){
 a.eventMeets[ev]++;const old=masteryOf(a,ev);
 a.mastery[ev]=Math.min(masteryCap(a,ev),old+2+Math.min(3,valid)*0.35);
 return a.mastery[ev]-old;
}
// How widely each event's marks scatter, and the discus's one wind effect: a headwind gives the
// disc lift and a crosswind knocks it off line. Applies to every thrower alike.
export const EVENT_SPREAD={shot:0.8,discus:1.15,hammer:1,jav:1.05};
export const windEffect=(ev,wind='calm')=>ev!=='discus'?1:wind==='headwind'?1.015:wind==='crosswind'?0.99:1;
// Throwing form: how complete a technique an athlete uses in an event, from their technique
// stat and event mastery. It only changes how throws look; distance comes from the rating.
export const FORMS={
 shot:['Standing put','Glide','Power glide','Rotational'],
 discus:['Standing throw','Half turn','One and a half turns','Fast spin'],
 hammer:['Two turns','Three turns','Four turns','Four fast turns'],
 jav:['Three-step approach','Full approach','Crossover approach','Elite approach'],
};
export const FORM_STEPS=[0,34,50,68];
export const formScore=(a,ev)=>((a.stats?.[1]??20)+masteryOf(a,ev))/2;
export function formOf(a,ev){
 const score=formScore(a,ev);
 let level=0;
 while(level+1<FORM_STEPS.length&&score>=FORM_STEPS[level+1]) level++;
 return level;
}
