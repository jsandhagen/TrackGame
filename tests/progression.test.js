import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {validateCampaign} from '../src/domain/campaign-save.js';
function meet(seed=20){const s=G.newGame(seed);s.day=s.matchDay;G.startMatch(s);s.match.phase='planning';return s;}
test('facility clinics survive a save and injury, apply once and improve the next training day',()=>{
 const s=G.newGame(10), a=s.roster[0];a.injury=1;G.upgrade(s,2);
 const restored=validateCampaign(s);assert.equal(restored.roster[0].clinics[0].gain,1.5);
 assert.equal(G.advanceDay(restored).breakthroughs.length,3);
 assert.equal(restored.roster[0].clinics.length,1);
 assert.equal(G.advanceDay(restored).breakthroughs.length,1);
 assert.equal(G.advanceDay(restored).breakthroughs.length,0);
});
test('mastery tiers gate advanced skills and a signature can only be spent once in a meet',()=>{
 const s=meet(),a=G.currentAthlete(s);Object.assign(a,{sessions:100,meets:30,level:20,form:80,skill:'limitbreak'});
 assert(!G.skillUnlocked(a,'limitbreak'));a.masteryTier=4;assert(G.canSignature(s));
 s.match.signatureEnabled=true;G.beginAttempt(s);const r=G.resolveThrow(s,'perfect');
 assert(r.signature);assert(r.activations.includes('SIGNATURE RELEASE +6.5%'));
 G.nextAttempt(s);assert(!G.canSignature(s));assert.equal(s.match.signatureUsed.length,1);
});
test('coach delegation stops at the event result and records PB feedback without settling twice',()=>{
 const s=meet();assert(G.coachEvent(s));assert.equal(s.match.eventIndex,0);assert.equal(s.match.phase,'result');assert.equal(s.match.homeMarks[0].length,2);assert.equal(s.match.homeMarks[1].length,0);
 assert.equal(s.results.length,0);assert.equal(G.coachEvent(s),false);
 G.nextAttempt(s);assert.equal(s.match.eventIndex,1);
 const a=G.currentAthlete(s);a.pb.discus=.01;G.beginAttempt(s);let result=G.resolveThrow(s,'perfect');
 if(result.mark!=null){assert(result.newPb);assert.equal(result.pbDelta,result.mark-.01);}
});
test('a failed season adds a rebuild camp while keeping rivals and equipment',()=>{
 const s=G.newGame(5), before=structuredClone(s.clubs),stats=[...s.roster[0].stats];s.phase='seasonEnd';s.champion=false;
 G.nextSeason(s);assert.deepEqual(s.clubs,before);assert(s.roster[0].stats.some((n,i)=>n>stats[i]));assert.equal(s.rebuildStreak,1);assert.equal(s.roster[0].form,63);
});
test('old v3 saves gain mastery and clinic defaults without losing an active meet',()=>{
 const s=meet();s.league=2;for(const a of s.roster){delete a.masteryTier;delete a.clinics;}
 delete s.match.signatureUsed;delete s.match.signatureEnabled;
 const r=validateCampaign(s);assert.equal(r.roster[0].masteryTier,2);assert.deepEqual(r.roster[0].clinics,[]);assert.equal(r.match.phase,'planning');assert.deepEqual(r.match.signatureUsed,[]);
});
test('risk choices differ and attacking is no longer a near certain victory between equal squads',()=>{
 let wins=0;
 for(let seed=1;seed<=300;seed++){
  const s=meet(seed);for(const a of [...s.roster,...s.clubs.flatMap(c=>c.athletes)])Object.assign(a,{stats:[40,40,40,40],form:50,energy:100,fatigue:0,trait:'technician'});
  assert(G.throwRisk(s,s.roster[0],'attack')>G.throwRisk(s,s.roster[0],'safe')*5);
  while(s.match.phase!=='complete'){
   if(['intro','planning'].includes(s.match.phase)){s.match.tactic='attack';G.beginAttempt(s);}
   if(s.match.phase==='timing')G.resolveThrow(s,'good','controlled');
   if(s.match.phase==='result')G.nextAttempt(s);
  }
  wins+=s.match.score>s.match.against;
 }
 assert(wins/300<.7);assert(wins/300>.2);
});
