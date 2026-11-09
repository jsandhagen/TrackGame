import { EVENT_IDS, EVENTS } from '../game-content.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const PROFILES={
 consistent:{name:'Steady competitor',desc:'A tighter performance spread in every event.',variance:0.78},
 explosive:{name:'Explosive competitor',desc:'Gets more distance from aggressive attempts.',attackBoost:0.006},
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
// Each meet in an event lifts its practice ceiling. At four or so meets a division this keeps pace
// with rival clubs' mastery (about 30 + 4.6 a division), reaching 100 after 52 meets.
export const MASTERY_PER_MEET=1.25;
export const masteryCap=(a,ev)=>Math.min(100,35+MASTERY_PER_MEET*(a.eventMeets?.[ev]||0));
export function practiceMastery(a,amount,ev=a.trainingEvent||a.event){
 const old=masteryOf(a,ev),transfer=a.profile==='adaptable'&&ev!==a.event?1.35:1;
 a.mastery[ev]=Math.max(old,Math.min(masteryCap(a,ev),old+amount*transfer));
 return a.mastery[ev]-old;
}
export function competeMastery(a,ev,valid){
 a.eventMeets[ev]++;const old=masteryOf(a,ev);
 a.mastery[ev]=Math.max(old,Math.min(masteryCap(a,ev),old+2+Math.min(3,valid)*0.35));
 return a.mastery[ev]-old;
}
// How widely each event's marks scatter.
export const EVENT_SPREAD={shot:0.8,discus:1.15,hammer:1,jav:1.05};
// Wind, as throwers know it. The two implements that fly on their shape feel it; the shot and
// the hammer do not. Using it takes technique, so the effect grows with event mastery:
//   discus   a headwind gives the disc lift, but only a clean release rides it; a tailwind
//            presses every disc down; a crosswind tips it off line.
//   javelin  a tailwind carries the spear; a headwind stalls it unless the thrower can keep the
//            point down; a crosswind drifts it towards the sector line.
// speed is metres a second (4 is a stiff breeze). Meets saved before wind had a speed read as 2.
export const WIND_NAMES={calm:'Calm',headwind:'Headwind',tailwind:'Tailwind',crosswind:'Crosswind'};
export const windFelt=ev=>ev==='discus'||ev==='jav';
export function windEffect(ev,wind='calm',speed=2,mastery=50){
 if(!windFelt(ev)||wind==='calm'||!WIND_NAMES[wind])return 1;
 const w=clamp(speed,0,6)/4,k=clamp(mastery,0,100)/100;
 if(ev==='discus')return 1+w*(wind==='headwind'?-0.01+0.035*k:wind==='tailwind'?-0.02+0.008*k:-0.008);
 return 1+w*(wind==='tailwind'?0.006+0.012*k:wind==='headwind'?-0.022+0.022*k:-0.006);
}
// A crosswind carries the discus and the javelin towards the sector lines.
export const windFoul=(ev,wind='calm',speed=2)=>windFelt(ev)&&wind==='crosswind'?1+0.05*clamp(speed,0,6):1;
// The wind never holds still: each throw gets its own reading around the meet's wind. A fixed
// function of the meet and the attempt, so replaying a save reads the same gauge.
export function gust(seed,speed){
 if(!speed)return 0;
 let x=2166136261;for(const c of String(seed))x=Math.imul(x^c.charCodeAt(0),16777619);
 x=Math.imul(x^(x>>>15),0x2c1b3c6d);x=Math.imul(x^(x>>>12),0x297a2d39);x=(x^(x>>>15))>>>0;
 return +clamp(speed+(x/4294967296-0.5)*2.4,0.1,6).toFixed(1);
}
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
