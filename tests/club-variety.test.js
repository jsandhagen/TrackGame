import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {ITEMS,EVENT_IDS,CLUBS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';
const reload=s=>validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));
function build(s,type,level=1) {
 s.money=100000;s.league=4;
 const plot=G.unlockedPlots(s).find(i=>!s.plots[i]);
 assert(G.build(s,plot,type));
 for(let n=1;n<level;n++) assert(G.upgrade(s,plot));
 return plot;
}
test('discipline implements apply only to the actual event, including forecasts before a meet',()=>{
 const s=G.newGame(400),a=s.roster[0];
 for(const id of ['steelshot','brassshot','lowrim','highrim','steelhammer','competitionhammer','aluminiumjav','stiffjav']) {
  a.gear.implement=null;
  const baseline=Object.fromEntries(EVENT_IDS.map(ev=>[ev,G.forecast(s,a,ev)]));
  s.bag[id]=1;assert(G.equipItem(s,a.id,id));
  for(const ev of EVENT_IDS) {
   const fx=G.effects(s,a,false,'meet',ev);
   if(ev===ITEMS[id].event) assert(fx.sources.includes(ITEMS[id].name));
   else {assert.equal(G.forecast(s,a,ev),baseline[ev]);assert(!fx.sources.includes(ITEMS[id].name));}
  }
 }
 a.gear.implement='highrim';a.mastery.discus=45;
 const low=G.forecast(s,a,'discus')/G.rawMark(a,'discus');
 a.mastery.discus=85;
 assert(G.forecast(s,a,'discus')/G.rawMark(a,'discus')>low);
 a.gear.implement='aluminiumjav';a.trainingEvent='shot';
 assert.equal(G.effects(s,a,true,'training').gain,1);
 a.trainingEvent='jav';assert.equal(G.effects(s,a,true,'training').gain,1.12);
 const saved=reload(s);assert.equal(saved.roster[0].gear.implement,'aluminiumjav');
});
test('all six division rivals are available without lengthening a tournament; draws preserve club people',()=>{
 const s=G.newGame(401);s.circuit.cleared=['0:0','0:1'];
 const seen=new Set();let names;
 for(let stage=0;stage<3;stage++) {
  assert(G.enterCompetition(s,{kind:'league',tier:0,stage}));
  assert.equal(s.clubs.length,3);s.clubs.forEach(c=>seen.add(c.id));
  names??=s.rivalClubs[0].map(c=>[c.id,c.athletes.map(a=>[a.id,a.name])]);
  assert.deepEqual(s.rivalClubs[0].map(c=>[c.id,c.athletes.map(a=>[a.id,a.name])]),names);
  assert(G.cancelCompetition(s));
 }
 assert.equal(seen.size,6);
 let copy=reload(s);assert(G.enterCompetition(copy,{kind:'duel',tier:0,rival:5}));
 assert.equal(G.opponent(copy).name,CLUBS[0][5].name);
 copy.day=copy.matchDay;assert(G.startMatch(copy));copy=reload(copy);
 assert.equal(G.opponent(copy).id,5);G.simulateMatch(copy);assert(G.leaveMatch(copy));
 assert(G.enterCompetition(copy,{kind:'league',tier:0,stage:2}));
 assert.deepEqual(copy.rivalClubs[0].map(c=>[c.id,c.athletes.map(a=>[a.id,a.name])]),names);
 reload(copy);
 for(const division of CLUBS) assert.equal(division.length,6);
});
test('rival identities affect equipment, skills and secondary-event development',()=>{
 const s=G.newGame(402),clubs=G.makeClubs(s,3,0,[0,1,2,3,4,5]);
 assert(clubs[1].athletes.every(a=>a.profile==='consistent'));
 assert(clubs[2].athletes.every(a=>a.skills.includes('clutch') && a.skills.includes('secondwind')));
 assert(clubs[3].athletes.every(a=>a.profile==='adaptable'));
 assert(clubs[4].athletes.filter(a=>a.event==='hammer').every(a=>a.gear.implement==='competitionhammer'));
});
test('existing three-club active careers resume unchanged, then expand on their next booking',()=>{
 const s=G.newGame(403);assert(G.enterCompetition(s,{kind:'league',tier:0}));
 // Shape of pre-expansion saves: registry and active draw both contain only the first three.
 s.rivalClubs[0]=s.clubs;const ids=s.clubs.map(c=>c.id);s.day=s.matchDay;
 assert(G.startMatch(s));const copy=reload(s);
 assert.deepEqual(copy.clubs.map(c=>c.id),ids);assert.equal(copy.match.opponentId,s.match.opponentId);
 G.simulateMatch(copy);reload(copy);
 for(const modify of [x=>x.clubs[1].id=x.clubs[0].id,x=>x.circuit.duels=['0:6'],x=>x.competition.rival=6]) {
  const bad=structuredClone(copy);modify(bad);assert.throws(()=>validateCampaign(bad));
 }
});
test('specialist buildings support group coaching, practice caps and event-matched equipment',()=>{
 const s=G.newGame(404),a=s.roster[0];s.coaching.insights=1000;
 assert.match(G.drillProblem(s,a,'indoor'),/Indoor Training Hall/);
 const plot=build(s,'indoor');const gains=G.drillGains(s,a,'indoor');
 assert(G.upgrade(s,plot));assert(G.drillGains(s,a,'indoor')[1]>gains[1]);
 a.mastery.shot=34.9;assert(G.coachSession(s,a.id,'indoor'));assert.equal(a.mastery.shot,35);
 assert(!G.coachSession(s,a.id,'indoor'));s.day++;
 build(s,'lodge');assert.match(G.drillProblem(s,a,'peer'),/higher-level/);
 const mentor=s.roster[1];mentor.level=8;mentor.trainingEvent='shot';mentor.plan='technique';
 const withMentor=G.xpMultiplier(s,a);mentor.plan='rest';assert(withMentor>G.xpMultiplier(s,a));mentor.plan='technique';
 assert(G.coachSession(s,a.id,'peer'));s.day++;
 build(s,'testing');assert.match(G.drillProblem(s,a,'trial'),/Equip an implement/);
 a.gear.implement='lowrim';assert.match(G.drillProblem(s,a,'trial'),/Equip an implement/);
 a.gear.implement='brassshot';a.eventMeets.shot=5;
 s.coaching.drills.trial=2;const out=G.coachGroup(s,[a.id],'trial');assert(out);assert.equal(out.level,2);
 assert(out.results[0].mastery>0);reload(s);
 const html=P.train(s,{});assert.match(html,/Indoor technical rehearsal/);assert.match(html,/Implement comparison|Grip &amp; release trial/);
});
