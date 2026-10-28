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
 s.stadium.shot=2;shot.eventMeets.shot=2;assert(G.unlockPlan(s,shot.id,'technicalblock'));
 assert(G.setTrainingPlan(s,shot.id,'technicalblock'));
 assert(!G.setTrainingPlan(s,discus.id,'technicalblock'));
 s.stadium.discus=2;discus.eventMeets.discus=2;assert(G.setTrainingPlan(s,discus.id,'technicalblock'));
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
 s.roster[0].plan='power';assert(G.advanceDay(s).ok);assert.equal(s.coaching.insights,before+G.PRACTICE_INSIGHTS);
 s.plots[8]={type:'lab',level:1};s.coaching.practiceDays=2;s.coaching.spare=0.5;assert.equal(G.practiceInsights(s,true),G.PRACTICE_INSIGHTS+1);
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
 const copy=validateCampaign(s);assert.equal(copy.v,8);assert.equal(copy.coaching.insights,8);assert.deepEqual(copy.competition,s.competition);assert.deepEqual(copy.roster,s.roster);
 for(const mutate of [s=>s.coaching.insights=-1,s=>s.coaching.unlocked=['rest'],s=>s.coaching.unlocked=['strengthblock','strengthblock'],s=>s.roster[0].coachedDay=-1]){const x=G.newGame(9);mutate(x);assert.throws(()=>validateCampaign(x))}
});
test('training UI presents event-specific coached sessions, Insights costs and facility requirements',()=>{
 const s=G.newGame(10),discus=s.roster[1];const html=P.train(s,{trainees:[discus.id]});
 assert.match(html,/South African/);assert.match(html,/Discus cage level/);assert.match(html,/data-act="coach-session"/);
 const athlete=P.squad(s,{athlete:discus.id,tab:'train'});
 assert.match(athlete,/Insights ready/);assert.match(athlete,/coach-athlete/);assert.match(athlete,/Maximum-strength block/);
});
test('group sessions share one bill, rate every athlete, level the drill up and survive a save',()=>{
 const s=G.newGame(11);s.coaching.insights=200;const [a,b,c]=s.roster;
 assert.equal(G.groupCost('lifting',3),12);assert.equal(G.groupCost('lifting',1),6);
 assert(G.drillGains(s,a,'lifting',3)[0]>G.drillGains(s,a,'lifting',1)[0],'partners add to the gains');
 assert.match(G.groupProblem(s,[a.id,b.id,c.id,s.roster[3].id],'lifting'),/Up to 3/);
 const out=G.coachGroup(s,[a.id,b.id,c.id],'lifting');assert(out);
 assert.equal(s.coaching.insights,188);assert.equal(out.results.length,3);
 for(const r of out.results) assert(G.QUALITY[r.quality]);
 assert.equal(G.drillXp(s,'lifting'),1);assert.equal(G.drillLevel(s,'lifting'),1);
 assert.match(G.groupProblem(s,[a.id],'lifting'),/Already trained today/);
 s.coaching.drills.lifting=2;s.day++;const up=G.coachGroup(s,[a.id],'lifting');
 assert.equal(up.level,2);assert.equal(up.levelUp,G.DRILL_NAMES.lifting[1]);
 const copy=validateCampaign(exportCampaign(s));assert.equal(copy.coaching.drills.lifting,3);
 const old=structuredClone(s);delete old.coaching.drills;assert.deepEqual(validateCampaign(old).coaching.drills,{});
 const broken=structuredClone(s);broken.coaching.drills={nonsense:1};assert.throws(()=>validateCampaign(broken));
 const html=P.train(s,{trainees:[s.roster[3].id]});assert.match(html,/Training group/);assert.match(html,/Squat &amp; pull complex/);
});

test('starter sessions need no buildings: focus work, a recovery session that gives stamina back and a throw-off that needs a group',()=>{
 const s=G.newGame(12);s.coaching.insights=100;const [a,b]=s.roster;
 for(const id of ['visualise','recovery','contest']) assert.equal(G.DRILLS[id].needs.length,0);
 assert(G.drillGains(s,a,'visualise')[3]>G.drillGains(s,a,'visualise')[1]);
 a.stamina=15;const r=G.coachGroup(s,[a.id],'recovery');assert(r);assert.equal(a.stamina,45);
 assert.match(G.groupProblem(s,[b.id],'contest'),/2 or more/);
 const xp=b.xp+b.level*1000,c=s.roster[2],out=G.coachGroup(s,[b.id,c.id],'contest');assert(out);
 assert(b.xp+b.level*1000>xp,'the throw-off awards experience');
});
test('coached sessions outpace a day of the matching daily plan',()=>{
 const s=G.newGame(13),a=s.roster[0];
 assert(G.drillGains(s,a,'lifting')[0]>2*G.trainingGains(s,a,'power')[0]);
});
test('drills climb a five-step ladder: each step costs more, gives more per Insight and the fourth is paid in money',()=>{
 const s=G.newGame(14),a=s.roster[0];s.coaching.insights=500;s.money=100000;
 const step1=G.drillGains(s,a,'lifting')[0],cost1=G.sessionCost(s,'lifting',1).insights;
 s.coaching.drills.lifting=3;assert.equal(G.tierOf(G.drillLevel(s,'lifting')),2);
 const step2=G.drillGains(s,a,'lifting')[0],cost2=G.sessionCost(s,'lifting',1).insights;
 assert(step2>step1&&cost2>cost1);assert(step2/cost2>step1/cost1,'a higher step is better value');
 s.coaching.drills.lifting=8;assert(G.drillGains(s,a,'lifting')[2]>0,'step three also works a second stat');
 s.coaching.drills.lifting=15;const paid=G.sessionCost(s,'lifting',1);assert.equal(paid.insights,0);assert(paid.money>0);
 const money=s.money,insights=s.coaching.insights;const out=G.coachGroup(s,[a.id],'lifting');assert(out);
 assert.equal(s.money,money-paid.money);assert.equal(s.coaching.insights,insights);
 s.day++;s.money=0;assert.match(G.groupProblem(s,[a.id],'lifting'),/\$/);
 s.coaching.drills.lifting=2;s.money=money;s.day++;const up=G.coachGroup(s,[a.id],'lifting');assert(up.tierUp);assert.equal(up.levelUp,G.DRILL_NAMES.lifting[1]);
});
test('training chemistry boosts the right stat, is discovered once and survives a save',()=>{
 const s=G.newGame(15);s.coaching.insights=500;
 const [mara,tomas,noor,kofi]=s.roster;// farm, gymnast, dancer, sprinter
 assert.equal(G.chemistryOf(s,[tomas.id,noor.id]).key,'bodycontrol');
 assert.equal(G.chemistryOf(s,[tomas.id,noor.id,kofi.id]).key,'fasthands','a trio beats a pair');
 assert.equal(G.chemistryOf(s,[mara.id]),null);
 const plain=G.drillGains(s,tomas,'shadow',2)[1],boosted=G.drillGains(s,tomas,'shadow',2,G.chemistryOf(s,[tomas.id,noor.id]))[1];
 assert(Math.abs(boosted/plain-1.3)<1e-9);
 const out=G.coachGroup(s,[tomas.id,noor.id],'shadow');assert(out.chemistry.discovered);assert.deepEqual(s.coaching.chemistry,['bodycontrol']);
 s.day++;const again=G.coachGroup(s,[tomas.id,noor.id],'shadow');assert(!again.chemistry.discovered);
 assert.deepEqual(validateCampaign(exportCampaign(s)).coaching.chemistry,['bodycontrol']);
 const old=structuredClone(s);delete old.coaching.chemistry;assert.deepEqual(validateCampaign(old).coaching.chemistry,[]);
 const bad=structuredClone(s);bad.coaching.chemistry=['nope'];assert.throws(()=>validateCampaign(bad));
 const html=P.train(s,{trainTab:'chemistry'});assert.match(html,/Body Control/);assert.match(html,/\?\?\?/);
});
test('the head coach levels up with athletes coached, and stats near their limit grow more slowly',()=>{
 const s=G.newGame(16),a=s.roster[0];
 assert.equal(G.coachLevel(s),1);const before=G.drillGains(s,a,'lifting')[0];
 s.counters.coachedSessions=G.coachThreshold(1);assert.equal(G.coachLevel(s),2);assert(G.drillGains(s,a,'lifting')[0]>before);
 const fresh=G.drillGains(s,a,'lifting')[0];a.stats[0]=G.capOf(a)-5;assert(G.drillGains(s,a,'lifting')[0]<fresh);
});
