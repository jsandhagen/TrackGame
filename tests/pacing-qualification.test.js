import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import {EVENT_IDS} from '../src/game-content.js';
import {DAY_MS,playbackSpeed} from '../src/platform/pacing.js';
import {advanceBeatClock,beatDuration,throwOffset,LAND_MS} from '../src/render/meet-presentation.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';

function prepare(s) {
  while(s.day<s.matchDay) {
    if(s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));
    else assert(G.advanceDay(s).ok);
  }
  if(s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));
}

test('watching has full preparation, flight and result time even with highlights enabled',()=>{
  const beat={type:'throw',athleteId:1,attempt:0};
  const duration=beatDuration(beat),landing=throwOffset(beat)+LAND_MS;
  assert(duration>=7000);
  for(const highlights of [false,true]) {
    assert.equal(advanceBeatClock(beat,0,1000,1,{highlights}),1000);
    assert.equal(advanceBeatClock(beat,0,1000,2,{highlights}),2000);
    assert(duration-landing>=3000);
  }
  assert.equal(DAY_MS[1],30000);
  assert.equal(DAY_MS[2],15000);
  assert.equal(DAY_MS[3],undefined,'3 is an action, never a clock rate');
  assert.equal(playbackSpeed(3),1);
});

test('Skip preparation stops at the meet or an unresolved real decision and remains resumable',()=>{
  let s=G.newGame(301);
  G.enterCompetition(s,{kind:'duel',tier:0,preparation:3});
  const report=G.skipPreparation(s);
  assert.equal(report.days,3);assert(report.meetReady);assert.equal(s.day,s.matchDay);
  s=validateCampaign(exportCampaign(s));assert(G.startMatch(s));
  assert(G.simulateMatch(s));assert.equal(s.match.phase,'complete');
  const blocked=G.newGame(302);blocked.pendingEvent={id:'bakery',data:{}};
  const before=structuredClone(blocked);assert.equal(G.skipPreparation(blocked).days,0);assert.deepEqual(blocked,before);
});

test('entry qualification requires an earned league mark and is checked by event',()=>{
  const s=G.newGame(303),a=s.roster[0];
  G.enterCompetition(s,{kind:'league',tier:0});
  a.pb.shot=100;
  assert(!G.championshipQualified(s,a.id,'shot'),'a lifetime PB cannot replace this league’s qualifying mark');
  const standard=G.qualifyingStandard(s,'shot');
  G.recordQualifier(s,a.id,'shot',[null,standard-0.01]);assert(!G.championshipQualified(s,a.id,'shot'));
  G.recordQualifier(s,a.id,'shot',[standard]);assert(G.championshipQualified(s,a.id,'shot'));
  assert(!G.championshipQualified(s,a.id,'discus'));
  s.fixture=3;s.day=s.matchDay;
  assert(!G.assignEntry(s,'discus',0,a.id));
  assert(G.seedChampionshipLineup(s));
  assert(G.startMatch(s));
  assert.equal(s.match.fields[0].home[0].id,a.id);
  assert.equal(s.match.fields[1].home.length,0);
  const copy=validateCampaign(exportCampaign(s));assert(G.simulateMatch(copy));
});

test('duels record measured qualifiers for the player and simulated series for other division clubs',()=>{
  const s=G.newGame(304);G.enterCompetition(s,{kind:'league',tier:0,preparation:3});
  prepare(s);G.startMatch(s);G.simulateMatch(s);
  for(const [i,ev] of EVENT_IDS.entries()) for(const entry of s.match.fields[i].home) {
    const best=G.best(entry.marks);
    assert.equal(G.qualifyingMark(s,entry.id,ev),best||0);
  }
  const others=G.championshipClubs(s).filter(c=>c.id!==s.match.opponentId);
  assert(others.every(c=>c.athletes.some(a=>EVENT_IDS.some(ev=>G.qualifyingMark(s,a.id,ev)>0))));
  const copy=validateCampaign(exportCampaign(s));assert.deepEqual(copy.competition.qualifyingMarks,s.competition.qualifyingMarks);
});

test('1×, 2× and 3 Skip controls remain explicit and quiet notifications default on',()=>{
  const s=G.newGame(305);assert.equal(s.settings.speed,1);assert.equal(s.settings.meetSpeed,1);assert(s.settings.quietMode);
  G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;G.startMatch(s);
  const html=P.meetBar(s,{});
  assert.match(html,/>1×</);assert.match(html,/>2×</);assert.match(html,/3 · Skip/);assert.doesNotMatch(html,/>4×</);
  const old=structuredClone(s);old.settings.speed=3;old.settings.meetSpeed=4;
  const copy=validateCampaign(old);assert.equal(copy.settings.speed,1);assert.equal(copy.settings.meetSpeed,1);
});


test('the final cut uses countback, preserves preliminary marks and includes an exact tie at sixth',()=>{
  const s=G.newGame(306);G.enterCompetition(s,{kind:'league',tier:0});
  for(const a of [...s.roster,...G.championshipClubs(s).flatMap(c=>c.athletes)]) for(const ev of EVENT_IDS) G.recordQualifier(s,a.id,ev,[G.qualifyingStandard(s,ev)+1]);
  s.fixture=3;s.day=s.matchDay;G.seedChampionshipLineup(s);assert(G.startMatch(s));
  s.match.phase='live';s.match.started[0]=true;
  const f=s.match.fields[0],all=[...f.home,...f.away];
  for(const [i,e] of all.entries()) e.marks=i<5?[30-i,20-i,10-i]:i<7?[12,11,10]:[null,null,null];
  const preliminary=new Map(all.map(e=>[e.id,[...e.marks]]));
  const beat=G.advanceMatch(s);
  assert(beat.finals);assert.equal(beat.finalistLimit,6);
  assert.equal(all.filter(e=>e.finalist).length,7,'both identical sixth-place series advance');
  for(const e of all) assert.deepEqual(e.marks,preliminary.get(e.id));
  assert.equal(f.finalOrder.length,7);
  const copy=validateCampaign(exportCampaign(s));assert(G.simulateMatch(copy));
  for(const e of [...copy.match.fields[0].home,...copy.match.fields[0].away]) assert.deepEqual(e.marks.slice(0,3),preliminary.get(e.id));
});

test('qualification screens name qualified athletes, show standards and hide in-flight marks',()=>{
  const s=G.newGame(307);G.enterCompetition(s,{kind:'league',tier:0});s.day=s.matchDay;G.startMatch(s);
  const entry=s.match.fields[0].home[0],standard=G.qualifyingStandard(s,'shot');
  entry.marks=[standard+0.25];
  const hidden=G.qualificationProgress(s,'shot',{side:'home',eventIndex:0,attempt:0}).find(r=>r.id===entry.id);
  assert.equal(hidden.mark,0);assert(!hidden.qualified);
  const shown=G.qualificationProgress(s,'shot').find(r=>r.id===entry.id);
  assert(shown.qualified);assert.equal(shown.mark,standard+0.25);
  assert.equal(G.qualifyingMark(s,entry.id,'shot'),0,'reading live progress does not create a season record');
  const panel=P.qualifications(s);
  assert(panel.includes(shown.name));assert(panel.includes(standard.toFixed(2)));assert.match(panel,/✓ Qualified/);
  assert.match(P.meetBar(s,{meetStandards:true}),/Championship qualification/);
  assert.match(P.meetComplete({...s,match:{...s.match,rewards:{items:[],pbs:[],levelUps:[],goals:[]}}},{resultView:'standards'}),/Championship qualification/);
  assert(G.simulateMatch(s));assert(G.leaveMatch(s));
  assert.match(P.home(s,{}),/Standards & qualified athletes/);
  assert.match(P.league(s,{tabs:{league:'qualification'}}),/Championship qualification/);
});

test('six-person finals and top-ten scoreboards keep full results available in the throw series',()=>{
  const s=G.newGame(308);G.enterCompetition(s,{kind:'league',tier:0});
  for(const a of [...s.roster,...G.championshipClubs(s).flatMap(c=>c.athletes)]) for(const ev of EVENT_IDS) G.recordQualifier(s,a.id,ev,[G.qualifyingStandard(s,ev)+1]);
  s.fixture=3;s.day=s.matchDay;G.seedChampionshipLineup(s);G.startMatch(s);
  const html=P.meetBar(s,{});
  assert.equal((html.match(/class="standing /g)||[]).length,10);assert.match(html,/Top 10 of 14/);
  assert.equal(G.fieldLeaderboard(s).length,14);
  assert(G.simulateMatch(s));
  for(const f of s.match.fields) assert.equal([...f.home,...f.away].filter(e=>e.finalist).length,6);
  const result=P.meetComplete(s);
  assert.equal((result.match(/<table class="placing-table"[\s\S]*?<\/table>/g)||[]).reduce((n,t)=>n+(t.match(/<tr class=/g)||[]).length,0),40);
  assert.match(result,/ico-mvp/);assert.match(result,/All attempts remain in the throw series/);
  assert.match(P.leagueTutorial(),/top six/);assert.match(P.leagueTutorial(),/minimum qualifying mark/);
});
