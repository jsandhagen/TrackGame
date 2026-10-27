import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

function day(s){if(s.pendingEvent)G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));return G.advanceDay(s)}
test('facility work replaces training, spends stamina, earns currency and survives reload',()=>{
 const s=G.newGame(12),a=s.roster[0],before=[...a.stats];
 assert(G.assignDuty(s,'plot:10',a.id));assert.equal(G.plannedActivity(s,a),'facility');
 const points=s.coaching.insights,stamina=a.stamina;const report=day(s);
 assert.deepEqual(a.stats,before);assert.equal(report.duties.length,1);assert.equal(report.duties[0].insights,1);
 assert(s.coaching.insights>points);assert(a.stamina<stamina);
 const copy=validateCampaign(exportCampaign(s));assert.equal(G.athleteDuty(copy,a.id),'plot:10');
 assert(G.assignDuty(copy,'plot:10',0));assert.equal(G.plannedActivity(copy,copy.roster[0]),'balanced');
});
test('athletes have one assignment, buildings have one operator and invalid assignments spend nothing',()=>{
 const s=G.newGame(13);assert(G.assignDuty(s,'plot:10',s.roster[0].id));
 assert(G.assignDuty(s,'plot:9',s.roster[0].id));assert.equal(s.facilityDuties['plot:10'],undefined);
 assert(G.assignDuty(s,'plot:9',s.roster[1].id));assert.equal(G.athleteDuty(s,s.roster[0].id),null);
 const copy=structuredClone(s);assert(!G.assignDuty(s,'plot:0',s.roster[0].id));assert(!G.assignDuty(s,'studio',s.roster[0].id));assert.deepEqual(s,copy);
 s.roster[0].injury=2;assert(!G.assignDuty(s,'plot:10',s.roster[0].id));
});
test('bench athletes work through the preparation window while entrants taper and tired staff rest',()=>{
 const s=G.newGame(14),a=s.roster[0];assert(G.assignDuty(s,'plot:10',a.id));
 G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay-1;
 assert.notEqual(G.plannedActivity(s,a),'facility');
 s.entries={shot:[],discus:[s.roster[1].id],hammer:[],jav:[]};s.lineup={shot:null,discus:s.roster[1].id,hammer:null,jav:null};
 assert.equal(G.plannedActivity(s,a),'facility');a.stamina=20;assert.equal(G.plannedActivity(s,a),'rest');
 const report=day(s);assert.equal(report.duties.length,0);assert(a.stamina>20);
});
test('staff assignments follow moved buildings and clear after sales or athlete releases',()=>{
 const s=G.newGame(15);s.money=5000;G.build(s,11,'cafe');G.assignDuty(s,'plot:11',s.roster[0].id);
 assert(G.moveFacility(s,11,8));assert.equal(s.facilityDuties['plot:8'],s.roster[0].id);assert.equal(s.facilityDuties['plot:11'],undefined);
 assert(G.sellFacility(s,8));assert.equal(G.athleteDuty(s,s.roster[0].id),null);
 G.recruit(s,s.prospects[0].id);const a=s.roster.at(-1);G.assignDuty(s,'plot:10',a.id);assert(G.releaseAthlete(s,a.id));assert.equal(G.athleteDuty(s,a.id),null);
 validateCampaign(s);
});
test('commercial duties grow with audience and investment, with bounded service capacity',()=>{
 const s=G.newGame(16);s.money=10000;G.build(s,11,'cafe');
 const low=G.dutyYield(s,'plot:11',5).money,high=G.dutyYield(s,'plot:11',40).money;
 assert(high>low);assert.equal(high,G.dutyYield(s,'plot:11',4000).money);
 s.plots[11].level=3;assert(G.dutyYield(s,'plot:11',40).money>high);
 const newbie=G.wageOf(s.roster[0]);assert(low*6-newbie>0,'a modest audience can cover a common bench athlete’s wages');
});
test('recovery support benefits resting teammates without generating training gains',()=>{
 const s=G.newGame(17);s.money=5000;G.build(s,11,'spa');const worker=s.roster[0],resting=s.roster[1];
 G.assignDuty(s,'plot:11',worker.id);resting.plan='rest';resting.stamina=10;
 const baseline=structuredClone(s);baseline.facilityDuties={};day(s);day(baseline);
 assert(s.roster[1].stamina>baseline.roster[1].stamina);assert.equal(s.counters.facilityDays,1);
});
test('bad staff assignments are rejected and old schema-7 saves gain an empty facility roster',()=>{
 const s=G.newGame(18);delete s.facilityDuties;assert.deepEqual(validateCampaign(s).facilityDuties,{});
 for(const duties of [{'plot:10':999},{'plot:10':1,'plot:9':1},{'plot:0':1},{studio:1},[]]){const bad=G.newGame(19);bad.facilityDuties=duties;assert.throws(()=>validateCampaign(bad))}
});
test('staffing controls explain roles, wages and rewards in squad, building and athlete views',()=>{
 const s=G.newGame(20);assert.match(P.squad(s,{}),/Facility roster/);
 assert.match(P.build(s,{selected:{kind:'plot',index:10}}),/Training partner/);
 assert.match(P.squad(s,{athlete:s.roster[0].id,tab:'stats'}),/Daily role/);
});

test('automatic facility plans share available sites, honour manual staff and persist goals',()=>{
 const s=G.newGame(30);s.money=5000;G.build(s,11,'cafe');
 G.assignDuty(s,'plot:10',s.roster[0].id);
 for(const a of s.roster.slice(1)) { G.setTrainingPlan(s,a.id,'facilities');a.facilityFocus='money'; }
 const allocations=G.automaticDuties(s,G.visitorsPerDay(s));
 assert(!Object.values(allocations).includes('plot:10'));
 assert.equal(new Set(Object.values(allocations)).size,Object.values(allocations).length);
 assert.equal(Object.keys(allocations).length,2,'remaining athletes rest when both available sites are occupied');
 const copy=validateCampaign(exportCampaign(s));assert.equal(copy.roster[1].plan,'facilities');assert.equal(copy.roster[1].facilityFocus,'money');
 const report=day(copy);assert.equal(report.duties.length,3);assert.equal(new Set(report.duties.map(d=>d.key)).size,3);
});
test('automatic priorities steer money or Insights without buying anything or consuming scarce items',()=>{
 const s=G.newGame(31),a=s.roster[0];G.setTrainingPlan(s,a.id,'facilities');
 a.facilityFocus='money';const money=G.automaticDuties(s,5);assert.equal(money[a.id],'plot:9');
 a.facilityFocus='insights';const insight=G.automaticDuties(s,5);assert.equal(insight[a.id],'plot:10');
 a.stamina=29;assert.equal(G.plannedActivity(s,a),'rest');assert.equal(G.automaticDuties(s,5)[a.id],undefined);
 a.stamina=100;a.injury=2;assert.equal(G.plannedActivity(s,a),'injured');
});
test('automatic workers rotate access to scarce facilities and use existing facilities after layout changes',()=>{
 const s=G.newGame(32);s.roster.forEach(a=>G.setTrainingPlan(s,a.id,'facilities'));
 const seen=new Set();
 for(let day=1;day<=4;day++) {s.day=day;for(const id of Object.keys(G.automaticDuties(s,5)))seen.add(Number(id));}
 assert.equal(seen.size,4);
 s.plots[10]=null;assert(Object.values(G.automaticDuties(s,5)).every(key=>key==='plot:9'));
});
