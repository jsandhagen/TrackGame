import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';
import {advanceBeatClock, beatDuration, throwOffset, LAND_MS, RESULT_MS, HIGHLIGHT_MS, ROUTINE_MS, hasCutIn, throwResult} from '../src/render/meet-presentation.js';

test('1× preserves full watching time and 2× speeds up without hidden highlight acceleration', () => {
 for (const speed of [1,2]) for (const highlights of [false,true]) for (const important of [false,true]) {
  const beat={type:'throw',athleteId:1,attempt:1,activations:['Captain'],newPb:important,previousPb:important?12:0};
  const landing=throwOffset(beat)+LAND_MS, duration=beatDuration(beat);
  let elapsed=0,time=0,landedAt=null;
  while(elapsed<duration) {
   elapsed=advanceBeatClock(beat,elapsed,10,speed,{highlights});time+=10;
   if(landedAt==null && elapsed>=landing)landedAt=time;
  }
  const expected=(important?HIGHLIGHT_MS:RESULT_MS)/speed;
  assert(time-landedAt>=expected-10, `${speed}x highlights=${highlights} result lasted ${time-landedAt}ms`);
 }
 assert(!hasCutIn({type:'throw',activations:['Captain'],attempt:0,scoringSwing:5}));
 assert(hasCutIn({type:'throw',activations:['Meteor Put'],signature:true}));
});

test('live results conceal the incoming mark, reveal its consequence and retain the correct throw number', () => {
 const s=G.newGame(31);G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);
 let beat;do {beat=G.advanceMatch(s);}while(beat.type!=='throw');
 const inFlight=P.meetBar(s,{hide:{side:beat.side,eventIndex:beat.eventIndex,attempt:beat.attempt}});
 const setup=inFlight.split('<div class="meet-desk">')[0];
 assert.match(setup,/UP NOW/);assert(!setup.includes('landed'));assert(!setup.includes('team-point swing +5'));
 const landed=P.meetBar(s,{});assert.match(landed,/meet-moment landed/);assert.match(landed,/Throw 1 \/ 3/);
 if(beat.mark!=null)assert(landed.includes(beat.mark.toFixed(2)));
 assert.match(landed,/Pause meet/);assert.match(P.meetBar(s,{meetPaused:true}),/Resume meet/);
});

test('throw consequences match whole-field placings and survive a mid-meet save', () => {
 const s=G.newGame(32);G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);
 let beat;do {beat=G.advanceMatch(s);}while(beat.type!=='throw');
 const own=G.fieldLeaderboard(s).find(row=>row.side===beat.side&&row.id===beat.athleteId);
 assert.equal(beat.place,own.place);assert.equal(beat.previousPlace,null);
 assert.equal(beat.tookLead,own.place===1);
 const copy=validateCampaign(exportCampaign(s));assert.deepEqual(copy.match.last,beat);
 G.simulateMatch(s);G.simulateMatch(copy);assert.deepEqual(copy.match,s.match);
 const html=P.meetComplete(s);assert.match(html,/Your meet highlights/);
 assert.equal((html.match(/class="meet-highlight /g)||[]).length,4);
});

test('fouls explain the banked mark and provisional places never promise qualification', () => {
 const result=throwResult({type:'throw',foul:true,mark:null,ownBest:12.25,place:2,scoringSwing:0});
 assert.equal(result.headline,'Foul');assert.match(result.detail,/12.25 m still counts/);
 const qualified=throwResult({type:'throw',mark:12.3,ownBest:12.3,place:4,qualified:true});
 assert.match(qualified.detail,/Into the top four/);assert(!qualified.detail.includes('qualified'));
});

test('switching primary event preserves progress and survives save round trip', () => {
 const s=G.newGame(12), a=s.roster[0], mastery=structuredClone(a.mastery), pb=structuredClone(a.pb);
 assert(G.setAthleteEvent(s,a.id,'jav'));
 assert.equal(a.event,'jav'); assert.equal(a.trainingEvent,'jav');
 assert.deepEqual(a.mastery,mastery); assert.deepEqual(a.pb,pb);
 assert.equal(validateCampaign(exportCampaign(s)).roster[0].event,'jav');
 assert(!G.setAthleteEvent(s,a.id,'invalid'));
 const html=P.squad(s,{athlete:a.id,tab:'stats'});
 assert.match(html,/Primary event/); assert.match(html,/Power 56%/); assert.match(html,/Manage skills/);
});

test('live and completed meet displays show athletes, marks and club identity', () => {
 const s=G.newGame(17);
 assert(G.enterCompetition(s,{kind:'duel',tier:0})); s.day=s.matchDay;
 assert(G.startMatch(s)); assert(!G.setAthleteEvent(s,s.roster[0].id,'jav'));
 assert.match(P.meetBar(s,{}),/club-tag/);
 assert(G.simulateMatch(s));
 const html=P.meetComplete(s);
 for(const e of G.eventScores(s.match)) for(const row of e.placings) {
  const a=(row.side==='home'?s.roster:s.clubs.find(c=>c.id===s.match.opponentId).athletes).find(a=>a.id===row.id);
  assert(html.includes(a.name));
  if(row.mark!=null) assert(html.includes(row.mark.toFixed(2)));
 }
 assert.match(html,/our-athlete/); assert.match(html,/Throw series/); assert(!html.includes('undefined'));
});

// The selected event filters the scorebook without discarding rewards or marks.
test('results can focus one event while retaining throw series and rewards', () => {
 const s=G.newGame(19); G.enterCompetition(s,{kind:'duel',tier:0}); s.day=s.matchDay; G.startMatch(s); G.simulateMatch(s);
 const html=P.meetComplete(s,{resultEvent:'jav'});
 assert.equal((html.match(/class="event-scorebook"/g)||[]).length,1);
 assert.match(html,/Javelin individual results/); assert(!html.includes('Shot put individual results'));
 assert.match(html,/Meet rewards & development/);
 assert.match(html,/Throw series/);
 const all=P.meetComplete(s,{resultEvent:'invalid'});
 assert.equal((all.match(/class="event-scorebook"/g)||[]).length,4);
});
