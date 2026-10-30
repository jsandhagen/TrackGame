import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {EVENT_IDS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
function ready(seed=1){const s=G.newGame(seed);G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);return s;}
test('practice has an event-specific ceiling which competition raises even without a winning mark',()=>{
 const s=G.newGame(60),a=s.roster[0];a.trainingEvent='discus';
 G.practiceMastery(a,1000);assert.equal(a.mastery.discus,35);assert.equal(a.mastery.shot,30);
 const before=a.mastery.discus;G.competeMastery(a,'discus',0);assert(a.mastery.discus>before);assert.equal(a.eventMeets.discus,1);assert.equal(G.masteryCap(a,'discus'),40);
});
test('high general attributes do not replace mastery, while trained secondary events become genuinely useful',()=>{
 const s=G.newGame(61),a=s.roster[0];a.stats=[90,90,90,90];a.mastery.shot=90;a.mastery.jav=8;
 const novice=G.forecast(s,a,'jav');assert(G.forecast(s,a,'shot')/24>novice/99);
 a.mastery.jav=80;assert(G.forecast(s,a,'jav')>novice*1.2);
});
test('training a second event uses its throwing area and advanced coaching requires actual experience',()=>{
 const s=G.newGame(62),a=s.roster[0];a.trainingEvent='hammer';a.plan='technique';a.autoTaper=false;s.stadium.hammer=2;s.coaching.insights=100;
 assert.equal(G.planFacility({facility:'event'},a),'hammer');assert(!G.unlockPlan(s,a.id,'technicalblock'));
 a.eventMeets.hammer=2;assert(G.unlockPlan(s,a.id,'technicalblock'));
 const before=a.mastery.hammer;const report=G.advanceDay(s);assert.equal(report.athletes[0].facility,'hammer');assert(a.mastery.hammer>before);assert.equal(a.mastery.shot,30);
});
test('whole-field targets reward passing the actual scoring rival, not the corresponding entry slot',()=>{
 const s=ready(63),m=s.match;m.eventIndex=0;m.entryIndex=0;m.turnSide='home';m.phase='live';
 m.fields[0].home[0].marks=[12];m.fields[0].home[1].marks=[15];m.fields[0].away[0].marks=[11];m.fields[0].away[1].marks=[14];
 const target=G.fieldTarget(s);assert.equal(target.mark,14.01);assert.equal(target.place,2);assert.equal(target.swing,4);
 const a=G.homeAthlete(s);a.skills=['hunter','frontrunner'];a.equipped=[...a.skills];const preview=G.throwPreview(s,'balanced');assert(preview.acts.includes('Rival Hunter'));assert(!preview.acts.includes('Front Runner'));
});
test('attempt order rotates through the entire field before anyone throws again',()=>{
 const s=ready(64);s.settings.clutch=false;const count=s.match.fields[0].home.length+s.match.fields[0].away.length,throws=[];
 while(throws.length<count+1){const beat=G.advanceMatch(s);if(beat?.type==='throw')throws.push(beat);}
 assert(throws.slice(0,count).every(b=>b.attempt===0));assert.equal(throws[count].attempt,1);assert.equal(new Set(throws.slice(0,count).map(b=>b.side+':'+b.athleteId)).size,count);
});
test('Hype Engine raises teammate condition on an individual event win',()=>{
 const s=ready(65),m=s.match,a=s.roster.find(a=>a.id===m.fields[0].home[0].id);a.skills=['hype'];a.equipped=['hype'];
 const other=s.roster.find(b=>b.id!==a.id);other.condition=50;
 m.started[0]=true;m.phase='live';m.fields[0].home.forEach((e,i)=>e.marks=[20-i,19-i,18-i]);m.fields[0].away.forEach((e,i)=>e.marks=[10-i,9-i,8-i]);
 const beat=G.advanceMatch(s);assert.equal(beat.type,'eventEnd');assert.equal(other.condition,58);
});
test('every athlete scatters by event, and only the discus feels the wind',()=>{
 assert(G.EVENT_SPREAD.discus>G.EVENT_SPREAD.shot);
 assert(G.windEffect('discus','headwind')>G.windEffect('discus','calm'));
 assert(G.windEffect('discus','crosswind')<G.windEffect('discus','calm'));
 for(const ev of ['shot','hammer','jav']) assert.equal(G.windEffect(ev,'headwind'),1);
});
test('revisiting a tier or entering a new stage keeps the same rival athletes, including after a save',()=>{
 const s=G.newGame(67);s.circuit.cleared=['0:0','0:1'];const names=s.clubs.map(c=>({id:c.id,names:c.athletes.map(a=>a.name)}));
 G.enterCompetition(s,{kind:'league',tier:0,stage:1});for(const c of names) assert.deepEqual(s.rivalClubs[0].find(r=>r.id===c.id).athletes.map(a=>a.name),c.names);
 G.cancelCompetition(s);s.league=1;G.enterCompetition(s,{kind:'duel',tier:1});G.cancelCompetition(s);
 const copy=validateCampaign(exportCampaign(s));G.enterCompetition(copy,{kind:'duel',tier:0});for(const c of names) assert.deepEqual(copy.clubs.find(r=>r.id===c.id).athletes.map(a=>a.name),c.names);
});
test('mastery and training focus persist, retired delivery choices are dropped, and malformed development cannot be imported',()=>{
 const s=G.newGame(68);s.roster[0].trainingEvent='discus';s.roster[0].mastery.discus=65;s.roster[0].approaches={discus:'developed'};
 const copy=validateCampaign(exportCampaign(s));assert.deepEqual(copy.roster[0].mastery,s.roster[0].mastery);assert.equal(copy.roster[0].trainingEvent,'discus');assert.equal(copy.roster[0].approaches,undefined);
 for(const mutate of [a=>a.mastery.shot=101,a=>a.eventMeets.shot=-1,a=>a.trainingEvent='run',a=>a.profile='fake']){const bad=G.newGame(69);mutate(bad.roster[0]);assert.throws(()=>validateCampaign(bad));}
});

test('field-aware final throws outperform fixed tactics across varied scoring targets',()=>{
 const totals={smart:0,balanced:0,safe:0,attack:0};
 const scenarios=[{bank:null,away:[.90,.93],mate:1.02},{bank:null,away:[.92,.94],mate:.99},{bank:null,away:[.89,.91],mate:1.01},{bank:.94,away:[.97,.99],mate:1.04},{bank:.98,away:[1.005,1.02],mate:.97},{bank:1.02,away:[1.01,1.04],mate:1.03},{bank:.96,away:[1.025,1.04],mate:1.05},{bank:1.06,away:[.98,1.02],mate:1.04},{bank:1,away:[1.015,1.03],mate:.99}];
 for(let seed=1;seed<=100;seed++)for(const sc of scenarios)for(const policy of Object.keys(totals)){
  const s=ready(seed+200);s.settings.meetMode='coach';const m=s.match;m.phase='decide';m.eventIndex=0;m.entryIndex=0;m.turnSide='home';
  const p=G.projected(s);m.fields[0].home[0].marks=sc.bank==null?[null,null]:[p*sc.bank,p*sc.bank*.99];m.fields[0].home[1].marks=[p*sc.mate,p*sc.mate*.99,p*sc.mate*.98];
  m.fields[0].away.forEach((e,i)=>e.marks=[p*sc.away[i],p*sc.away[i]*.99,p*sc.away[i]*.98]);
  const tactic=policy==='smart'?G.autoTactic(s):policy;G.decideThrow(s,tactic);
  totals[policy]+=G.fieldLeaderboard(s).reduce((n,r)=>n+(r.side==='home'?1:-1)*r.points,0);
 }
 const average=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v/(100*scenarios.length)]));
 console.log('Final-throw team margins',average);
 assert(average.smart>Math.max(average.balanced,average.safe,average.attack)+0.05);
});
