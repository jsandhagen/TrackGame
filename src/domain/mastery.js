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
 a.approaches??=Object.fromEntries(EVENT_IDS.map(ev=>[ev,'familiar']));
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
export const APPROACHES={
 shot:[{id:'familiar',name:'Familiar delivery',desc:'Repeat your established delivery.'},{id:'developed',name:'Full dynamic delivery',needs:45,desc:'Use a more demanding delivery to transfer more force. Needs established shot mastery.'}],
 discus:[{id:'familiar',name:'Controlled flight',desc:'Keep the release low and repeatable.'},{id:'developed',name:'Ride the airflow',needs:35,desc:'Exploit a headwind; crosswinds make this harder to control.'}],
 hammer:[{id:'familiar',name:'Rhythmic turns',desc:'Preserve balance and a repeatable orbit.'},{id:'developed',name:'Accelerating turns',needs:40,desc:'Build more speed through the turns; mastery controls the extra risk and effort.'}],
 jav:[{id:'familiar',name:'Measured approach',desc:'Keep the approach under control and establish the block.'},{id:'developed',name:'Fast approach',needs:40,desc:'Carry more speed into the block. Technique and javelin mastery must keep up.'}],
};
export function approachProblem(a,ev,id){
 const d=APPROACHES[ev]?.find(x=>x.id===id);
 return !d?'Unknown approach':masteryOf(a,ev)<(d.needs||0)?'Needs '+d.needs+' '+EVENTS[ev].name+' mastery':null;
}
export function disciplineModel(a,ev,wind='calm',override){
 const mastery=masteryOf(a,ev),id=override||a.approaches?.[ev]||'familiar';
 const r={mark:1,foul:1,spread:{shot:0.8,discus:1.15,hammer:1,jav:1.05}[ev],energy:0,approach:APPROACHES[ev][0].name};
 if(id!=='developed'||approachProblem(a,ev,id))return r;
 r.approach=APPROACHES[ev][1].name;
 if(ev==='shot'){r.mark=1.025+mastery*0.0001;r.foul=1.35;r.energy=2;}
 if(ev==='discus'){r.mark=wind==='headwind'?1.035:wind==='crosswind'?0.985:1.012;r.foul=wind==='crosswind'?1.6:1.2;r.energy=1;}
 if(ev==='hammer'){r.mark=1.012+mastery*0.0003;r.foul=1.8-mastery*0.006;r.energy=4;}
 if(ev==='jav'){const control=(a.stats[1]+mastery)/2;r.mark=1+clamp((a.stats[2]+control-110)/1700,-0.02,0.045);r.foul=1.25+Math.max(0,a.stats[2]-control)*0.02;r.energy=3;}
 return r;
}
// Throwing form: how complete a technique an athlete uses in an event, from their technique
// stat and event mastery. It only changes how throws look; distance comes from the rating.
export const FORMS={
 shot:['Standing put','Glide','Power glide','Rotational'],
 discus:['Standing throw','Half turn','One and a half turns','Fast spin'],
 hammer:['Two turns','Three turns','Four turns','Four fast turns'],
 jav:['Short approach','Full approach','Crossover approach','Elite approach'],
};
export const FORM_STEPS=[0,34,50,68];
export const formScore=(a,ev)=>((a.stats?.[1]??20)+masteryOf(a,ev))/2;
export function formOf(a,ev){
 const score=formScore(a,ev);
 let level=0;
 while(level+1<FORM_STEPS.length&&score>=FORM_STEPS[level+1]) level++;
 return level;
}
