import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';
import {advanceBeatClock, beatDuration, throwOffset, throwTiming, throwPhase, flightPoint, RESULT_MS, HIGHLIGHT_MS, hasCutIn, throwResult} from '../src/render/meet-presentation.js';
import {playbackRate} from '../src/platform/pacing.js';
import {EVENTS,EVENT_IDS} from '../src/game-content.js';

test('sector-foul flights scale with the thrower, stay unscored and survive saving',()=>{
 for(const event of EVENT_IDS) {
  const flights=[];
  for(const ability of [15,95]) {
   const s=G.newGame(31);G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);
   const m=s.match;m.eventIndex=EVENT_IDS.indexOf(event);m.entryIndex=0;m.turnSide='home';m.phase='decide';m.started[m.eventIndex]=true;
   const a=G.homeAthlete(s);a.stats.fill(ability);a.mastery[event]=ability;a.stamina=100;a.condition=100;a.skills=[];a.equipped=[];
   const records=structuredClone(s.worldRecords),pb=structuredClone(a.pb);
   // The first roll is below the minimum foul probability, with the usual distance roll after it.
   s.rng=1972;
   const rngCheck={rng:s.rng};assert(G.random(rngCheck)<0.01);G.gauss(rngCheck);
   const beat=G.decideThrow(s,'attack','poor');
   assert(beat.foul);assert.equal(beat.mark,null);assert(beat.flightDistance>0);
   assert.equal(s.rng,rngCheck.rng,'foul visuals do not consume extra randomness');
   assert.deepEqual(m.fields[m.eventIndex].home[0].marks,[null]);
   assert.equal(G.fieldLeaderboard(s).find(row=>row.side==='home'&&row.id===a.id).points,0);
   assert.deepEqual(a.pb,pb);assert.deepEqual(s.worldRecords,records);
   assert.equal(throwTiming(beat).distance,beat.flightDistance);
   assert.equal(throwResult(beat).headline,'Foul');
   flights.push(beat.flightDistance);
   const copy=validateCampaign(exportCampaign(s));
   assert.deepEqual(copy.match.last,beat);assert.deepEqual(throwTiming(copy.match.last),throwTiming(beat));
   if(event==='shot'&&ability===95) {
    for(const invalid of [-1,201,NaN,Infinity,'20']) {
     const bad=structuredClone(s);bad.match.last.flightDistance=invalid;
     assert.throws(()=>validateCampaign(bad));
    }
    const legacy=structuredClone(s);delete legacy.match.last.flightDistance;
    assert(validateCampaign(legacy),'older saves can omit the visual distance');
    assert(G.simulateMatch(s));assert(G.simulateMatch(copy));assert.deepEqual(copy.match,s.match);
   }
  }
  assert(flights[1]>flights[0]*1.5,`${event}: a stronger thrower sends a sector foul farther`);
  const short=throwTiming({event,mark:null,foul:true,flightDistance:flights[0]}),long=throwTiming({event,mark:null,foul:true,flightDistance:flights[1]});
  assert(long.flightMs>short.flightMs);assert(long.arcHeight>short.arcHeight);
 }
 assert.equal(throwTiming({event:'shot',mark:9,flightDistance:20}).distance,9,'legal marks retain their measured landing');
});

test('deliveries build before release and short marks have shorter, lower flights',()=>{
 for(const [event,content] of Object.entries(EVENTS)) {
  const short=throwTiming({event,mark:content.min}),long=throwTiming({event,mark:content.record});
  assert(short.releaseAt-short.readyMs>=1700,`${event}: wind-up is readable`);
  assert.equal(short.releaseAt,long.releaseAt,'distance never accelerates the thrower');
  assert(short.flightMs<long.flightMs);assert(short.arcHeight<long.arcHeight);
  assert(short.flightMs<2400,`${event}: a novice flight is still brief`);
  assert(long.flightMs<=4500,`${event}: realistic airtime stays bounded at world-record distances`);
  assert.equal(throwPhase(short,short.releaseAt-1)[0],'technique');
  assert.deepEqual(throwPhase(short,short.releaseAt),['release',0]);
  const recovering=throwPhase(short,short.landAt);
  assert.equal(recovering[0],'follow');assert(recovering[1]<=1,'flight does not accelerate the recovery');
  assert.deepEqual(throwPhase(short,short.releaseAt+short.releaseMs+short.recoveryMs),['follow',1]);
  const foul=throwTiming({event,mark:null,foul:true});
  assert(Number.isFinite(foul.landAt));assert(foul.landAt>foul.releaseAt);
 }
 assert(throwTiming({event:'shot',mark:9}).flightMs>=1200 && throwTiming({event:'shot',mark:9}).flightMs<=1500);
 assert(throwTiming({event:'jav',mark:85}).flightMs-throwTiming({event:'jav',mark:60}).flightMs>250,'a big throw hangs noticeably longer');
 assert(throwTiming({event:'hammer'}).releaseAt>throwTiming({event:'shot'}).releaseAt,'hammer winds and turns have more time');
});

test('a 70 m throw has sustained airtime and a high arc instead of a short lob',()=>{
 for (const event of ['discus','hammer','jav']) {
  const short=throwTiming({event,mark:35}),long=throwTiming({event,mark:70});
  assert(long.flightMs>=3100 && long.flightMs<=3800);
  assert(long.flightMs-short.flightMs>=800,'doubling the distance gives the camera time to travel');
  assert(long.arcHeight>230,'the flight rises well above the thrower');
  assert(long.arcHeight>short.arcHeight*1.8 && long.arcHeight<short.arcHeight*2,'long throws rise proportionally higher');
 }
});

test('projectiles leave the hand, follow a falling arc and finish at the measured mark',()=>{
 const start=[20,-40],end=[220,0],height=40;
 assert.deepEqual(flightPoint(start,end,0,height),start);
 assert.deepEqual(flightPoint(start,end,1,height),end);
 const samples=Array.from({length:5},(_,i)=>flightPoint(start,end,i/4,height));
 const steps=samples.slice(1).map((p,i)=>p[1]-samples[i][1]);
 assert(steps.every((v,i)=>!i||v>steps[i-1]),'downward velocity increases toward impact');
 assert.deepEqual(samples.map(p=>p[0]),[20,70,120,170,220]);
});

test('all arrow speeds preserve setup, flight and results without hidden highlight acceleration', () => {
 for (const speed of [1,2,3]) for (const highlights of [false,true]) for (const important of [false,true]) for(const [event,content] of Object.entries(EVENTS)) for(const mark of [null,content.min,content.record]) {
  const beat={type:'throw',event,mark,athleteId:1,attempt:1,activations:['Captain'],newPb:important,previousPb:important?12:0};
  const landing=throwOffset(beat)+throwTiming(beat).landAt, duration=beatDuration(beat);
  let elapsed=0,time=0,landedAt=null;
  while(elapsed<duration) {
   elapsed=advanceBeatClock(beat,elapsed,10,speed,{highlights});time+=10;
   if(landedAt==null && elapsed>=landing)landedAt=time;
  }
  const expected=(important?HIGHLIGHT_MS:RESULT_MS)/playbackRate(speed);
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
