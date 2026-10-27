import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {PLANS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

test('a coached session spends pooled Insights and athlete stamina, improves targeted stats and cannot repeat that day',()=>{
 const s=G.newGame(2),a=s.roster[0],stats=[...a.stats],energy=a.stamina,points=s.coaching.insights;
 const out=G.coachSession(s,a.id,'delivery'); assert(out);
 assert(a.stats[1]>stats[1]);assert.equal(a.stats[0],stats[0]);
 assert.equal(s.coaching.insights,points-7);assert.equal(a.stamina,energy-out.energy);
 const after=structuredClone(s);assert.equal(G.coachSession(s,a.id,'lifting'),null);assert.deepEqual(s,after);
 const copy=validateCampaign(exportCampaign(s));assert.equal(G.coachSession(copy,a.id,'lifting'),null);
});
test('throwing facilities gate event drills and club-wide plans still require each athlete’s own facility',()=>{
 const s=G.newGame(3),shot=s.roster[0],discus=s.roster[1];s.coaching.insights=100;
 assert.match(G.drillProblem(s,discus,'delivery'),/Discus cage/);
 assert(!G.unlockPlan(s,shot.id,'technicalblock'));
 s.stadium.shot=2;assert(G.unlockPlan(s,shot.id,'technicalblock'));
 assert(G.setTrainingPlan(s,shot.id,'technicalblock'));
 assert(!G.setTrainingPlan(s,discus.id,'technicalblock'));
 s.stadium.discus=2;assert(G.setTrainingPlan(s,discus.id,'technicalblock'));
 const balance=s.coaching.insights;assert(!G.unlockPlan(s,discus.id,'technicalblock'));assert.equal(s.coaching.insights,balance);
 assert.match(G.EVENT_DRILLS.jav,/crossover/);assert.match(G.EVENT_DRILLS.hammer,/winds/);
});
test('facility upgrades improve coached practice and recovery facilities reduce its fatigue',()=>{
 const s=G.newGame(4),a=s.roster[0];const before=G.drillGains(s,a,'lifting')[0],energy=G.drillEnergy(s,'lifting');
 s.plots[10].level=3;assert(G.drillGains(s,a,'lifting')[0]>before);
 s.plots[8]={type:'spa',level:2};assert(G.drillEnergy(s,'lifting')<energy);
});
test('advanced blocks trade additional training load for focused growth and fall back safely without facilities',()=>{
 const s=G.newGame(5),a=s.roster[0];s.coaching.insights=100;s.plots[10].level=2;a.autoTaper=false;
 assert(!G.setTrainingPlan(s,a.id,'strengthblock'));
 assert(G.unlockPlan(s,a.id,'strengthblock'));assert(G.setTrainingPlan(s,a.id,'strengthblock'));
 assert(G.trainingGains(s,a,'strengthblock')[0]>G.trainingGains(s,a,'power')[0]);
 assert(PLANS.strengthblock.load>PLANS.power.load);
 const saved=validateCampaign(exportCampaign(s));assert.equal(saved.roster[0].plan,'strengthblock');
 s.plots[10].level=1;assert.equal(G.plannedActivity(s,a),'balanced');assert(G.trainingGains(s,a,'strengthblock').every(v=>v===0));
});
test('training and meet Insights reward actual development once; facilities support earning',()=>{
 const s=G.newGame(6);s.roster.forEach(a=>{a.plan='rest';a.autoTaper=false});
 const before=s.coaching.insights;assert(G.advanceDay(s).ok);assert.equal(s.coaching.insights,before);
 s.roster[0].plan='power';assert(G.advanceDay(s).ok);assert.equal(s.coaching.insights,before+1);
 s.plots[8]={type:'lab',level:1};s.coaching.practiceDays=2;assert.equal(G.practiceInsights(s,true),2);
 s.stadium.studio=1;assert.equal(G.meetInsights(s,8),9);
 if(s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));
 assert(G.enterCompetition(s,{kind:'duel',tier:0}));s.day=s.matchDay;assert(G.startMatch(s));assert(G.simulateMatch(s));
 const earned=s.coaching.insights;assert(s.match.rewards.insights>=6);G.settleMatch(s);assert.equal(s.coaching.insights,earned);
});
test('injury, meet day, exhaustion and stat caps prevent unsuitable sessions without spending',()=>{
 for(const modify of [s=>{s.roster[0].injury=2},s=>{s.roster[0].stamina=22},s=>{s.coaching.insights=0},s=>{s.roster[0].stats=[100,100,100,100]},s=>{G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay}]){
 const s=G.newGame(7);modify(s);const before=structuredClone(s);assert.equal(G.coachSession(s,s.roster[0].id,'lifting'),null);assert.deepEqual(s,before);
 }
});
test('previous careers receive initial coaching resources without losing active competition or athletes',()=>{
 const s=G.newGame(8);G.enterCompetition(s,{kind:'duel',tier:0});s.v=6;delete s.coaching;
 const copy=validateCampaign(s);assert.equal(copy.v,7);assert.equal(copy.coaching.insights,8);assert.deepEqual(copy.competition,s.competition);assert.deepEqual(copy.roster,s.roster);
 for(const mutate of [s=>s.coaching.insights=-1,s=>s.coaching.unlocked=['rest'],s=>s.coaching.unlocked=['strengthblock','strengthblock'],s=>s.roster[0].coachedDay=-1]){const x=G.newGame(9);mutate(x);assert.throws(()=>validateCampaign(x))}
});
test('training UI presents event-specific coached sessions, Insights costs and facility requirements',()=>{
 const s=G.newGame(10);const html=P.squad(s,{athlete:s.roster[1].id,tab:'train'});
 assert.match(html,/Coaching Insights/);assert.match(html,/South African/);assert.match(html,/Discus cage level/);assert.match(html,/Maximum-strength block/);
});
