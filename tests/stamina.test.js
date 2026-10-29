import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';

test('athletes start with a 100-point tank and older saves load with one',()=>{
 const s=G.newGame(21),a=s.roster[0];
 assert.equal(G.maxStaminaOf(a),100);assert.equal(a.maxStamina,100);
 const old=structuredClone(exportCampaign(s));for(const b of old.state.roster) delete b.maxStamina;
 const loaded=validateCampaign(old);
 assert(loaded.roster.every(b=>b.maxStamina===100));
 a.maxStamina=130;a.stamina=125;assert.equal(validateCampaign(exportCampaign(s)).roster[0].stamina,125);
 a.stamina=140;assert.throws(()=>validateCampaign(exportCampaign(s)));
});
test('conditioning sessions raise max stamina toward a ceiling, and stamina fills the bigger tank',()=>{
 const s=G.newGame(22),a=s.roster[0];s.coaching.insights=1e5;
 const out=G.coachSession(s,a.id,'conditioning');assert(out);
 assert(out.capacity>0);assert.equal(G.maxStaminaOf(a),100+out.capacity);
 for(let d=0;d<200;d++){a.coachedDay=-1;a.stamina=G.maxStaminaOf(a);G.coachSession(s,a.id,'conditioning');}
 assert.equal(G.maxStaminaOf(a),G.MAX_STAMINA);
 a.stamina=10;G.addStamina(a,500);assert.equal(a.stamina,G.MAX_STAMINA);
 assert.equal(G.drillCapacity(s,a,'conditioning'),0);
});
test('the conditioning plan slowly raises max stamina on a training day',()=>{
 const s=G.newGame(23),a=s.roster[0];
 for(const b of s.roster) b.plan='rest';
 a.plan='conditioning';a.autoRest=false;a.autoTaper=false;s.settings.autoMeetPrep=false;
 const r=G.advanceDay(s);assert(r.ok);
 const entry=r.athletes.find(e=>e.id===a.id);
 assert.equal(entry.activity,'conditioning');assert(entry.capacity>0);assert(G.maxStaminaOf(a)>100);
});
test('stamina above 100 adds distance, so a full trained tank throws further',()=>{
 const s=G.newGame(24),a=s.roster[0];
 a.stamina=100;const fresh=G.forecastRaw(s,a,a.event);
 a.maxStamina=150;a.stamina=150;const engine=G.forecastRaw(s,a,a.event);
 assert(Math.abs(engine/fresh-1.02)<1e-9);
 a.stamina=60;assert(G.forecastRaw(s,a,a.event)<fresh);
});
test('every attempt in a meet costs stamina, so a small tank fades through a series',()=>{
 const s=G.newGame(25);G.enterCompetition(s,{kind:'duel',tier:0,rival:2});s.day=s.matchDay;assert(G.startMatch(s));
 for(const a of s.roster) a.stamina=G.maxStaminaOf(a);
 for(let guard=0;guard<200;guard++){
  const m=s.match;if(m.phase==='complete') break;
  const b=m.phase==='decide'?G.decideThrow(s,'balanced','good',false):G.advanceMatch(s);
  if(b?.type==='throw'&&b.side==='home'){const a=s.roster.find(x=>x.id===b.athleteId);assert(a.stamina<G.maxStaminaOf(a));return;}
 }
 assert.fail('no home throw');
});
