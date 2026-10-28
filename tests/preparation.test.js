import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANS} from '../src/game-content.js';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';

function booked() {
 const s=G.newGame(23);assert(G.enterCompetition(s,{kind:'duel',tier:0,preparation:5}));
 const a=s.roster[0];s.entries={shot:[a.id],discus:[],hammer:[],jav:[]};s.lineup={shot:a.id,discus:null,hammer:null,jav:null};
 for(const x of s.roster){x.plan='power';x.autoRest=false;x.autoTaper=false;}
 return s;
}
test('standard prep is optional, uses balanced work and always rests before a meet without changing manual plans',()=>{
 const s=booked(),a=s.roster[0],bench=s.roster[1];assert.equal(s.settings.autoMeetPrep,false);
 assert.equal(G.plannedActivity(s,a),'power');assert(G.setAutoMeetPrep(s,true));
 assert.equal(G.plannedActivity(s,a),'balanced');assert.equal(G.plannedActivity(s,bench),'power');
 s.day=s.matchDay-1;a.stamina=100;assert.equal(G.plannedActivity(s,a),'rest');assert.equal(a.plan,'power');
 s.day=s.matchDay;assert.equal(G.plannedActivity(s,a),'rest');
 assert(G.setAutoMeetPrep(s,false));assert.equal(G.plannedActivity(s,a),'power');
});
test('prep rests tired entrants, respects injuries and follows rescheduled dates and changed entries',()=>{
 const s=booked(),a=s.roster[0];G.setAutoMeetPrep(s,true);a.stamina=39;assert.equal(G.plannedActivity(s,a),'rest');
 a.stamina=40;assert.equal(G.plannedActivity(s,a),'balanced');a.injury=2;assert.equal(G.plannedActivity(s,a),'injured');a.injury=0;
 s.day=s.matchDay-1;assert.equal(G.plannedActivity(s,a),'rest');s.matchDay+=3;assert.equal(G.plannedActivity(s,a),'balanced');
 s.entries.shot=[];s.lineup.shot=null;assert.equal(G.plannedActivity(s,a),'power');
 s.phase='planning';assert.equal(G.autoPrepActivity(s,a),null);
});
test('advancing the calendar implements a real recovery day and auto prep survives save/load without spending',()=>{
 const s=booked(),a=s.roster[0];G.setAutoMeetPrep(s,true);s.day=s.matchDay-3;a.stamina=60;
 const bag=structuredClone(s.bag),courses=[...s.coaching.unlocked],insights=s.coaching.insights;
 let r=G.advanceDay(s);assert(r.ok);assert.equal(r.athletes.find(x=>x.id===a.id).activity,'balanced');
 s.pendingEvent=null;const stamina=a.stamina;r=G.advanceDay(s);assert(r.ok);
 const row=r.athletes.find(x=>x.id===a.id);assert.equal(row.activity,'rest');assert.deepEqual(row.gains,[0,0,0,0]);assert(a.stamina>stamina);
 assert.deepEqual(s.bag,bag);assert.deepEqual(s.coaching.unlocked,courses);assert(s.coaching.insights>=insights);
 const copy=validateCampaign(exportCampaign(s));assert.equal(copy.settings.autoMeetPrep,true);assert.equal(copy.roster[0].plan,'power');
 assert.equal(G.plannedActivity(copy,copy.roster[0]),'rest');
});
test('group plans unlock once, apply to eligible athletes and explain skips without altering staff or injured athletes',()=>{
 const s=G.newGame(25);s.coaching.insights=100;s.plots[10].level=2;s.roster[1].injury=2;
 const ids=s.roster.map(a=>a.id),preview=G.trainingPlanPreview(s,ids,'strengthblock');assert.equal(preview.cost,PLANS.strengthblock.cost);
 const before=s.coaching.insights;const result=G.applyTrainingPlanGroup(s,ids,'strengthblock');assert(result.ok);
 assert.equal(s.coaching.insights,before-preview.cost);assert(!result.applied.includes(s.roster[1].id));assert.match(result.skipped[0].reason,/injury/);
 assert.equal(s.roster[0].plan,'strengthblock');assert.equal(G.applyTrainingPlanGroup(s,ids,'strengthblock').cost,0);
 const failed=G.newGame(26);const snapshot=structuredClone(failed);assert(!G.applyTrainingPlanGroup(failed,ids,'strengthblock').ok);assert.deepEqual(failed,snapshot);
 assert(G.assignDuty(s,'plot:10',s.roster[0].id));
 const staff=G.trainingPlanPreview(s,[s.roster[0].id],'rest');assert.equal(staff.eligible.length,0);assert.match(staff.skipped[0].reason,/facility duty/);
});
test('prep and group changes are blocked during meets, and training exposes group controls before paid sessions',()=>{
 const s=booked();G.setAutoMeetPrep(s,true);s.day=s.matchDay;assert(G.startMatch(s));const snapshot=structuredClone(s);
 assert(!G.setAutoMeetPrep(s,false));assert(!G.applyTrainingPlanGroup(s,[s.roster[0].id],'rest').ok);assert.deepEqual(s,snapshot);
 const fresh=G.newGame(27),html=P.train(fresh,{trainTab:'plans'});assert.match(html,/Meet preparation/);assert.match(html,/Standard auto meet prep/);assert.match(html,/Selected training group/);
 const sessions=P.train(fresh,{});assert.match(sessions,/data-act="pick-drill"/);assert(!sessions.includes('Meet preparation'),'sessions come first, plans live in their own tab');
 const old=G.newGame(28);delete old.settings.autoMeetPrep;assert.equal(validateCampaign(exportCampaign(old)).settings.autoMeetPrep,false);
});

test('course application is atomic without funds and can qualify a technical athlete without qualifying the squad',()=>{
 const s=G.newGame(29),a=s.roster[0];s.stadium.shot=2;a.eventMeets.shot=2;
 const ids=s.roster.map(a=>a.id);s.coaching.insights=0;const before=structuredClone(s);
 assert(!G.applyTrainingPlanGroup(s,ids,'technicalblock').ok);assert.deepEqual(s,before);
 s.coaching.insights=100;const result=G.applyTrainingPlanGroup(s,ids,'technicalblock');
 assert(result.ok);assert.deepEqual(result.applied,[a.id]);assert.equal(result.skipped.length,ids.length-1);
 assert.equal(s.coaching.insights,100-PLANS.technicalblock.cost);assert.equal(a.plan,'technicalblock');
 assert.deepEqual(G.coachingTargets(s,'group',[a.id,a.id,999999]),[a.id]);
});
