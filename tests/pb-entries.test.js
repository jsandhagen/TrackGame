import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {EVENT_IDS} from '../src/game-content.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

const reload=s=>validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));
function booked(seed=70) {
  const s=G.newGame(seed);
  assert(G.enterCompetition(s,{kind:'duel',tier:0}));
  s.day=s.matchDay;s.settings.clutch=false;
  return s;
}

test('entry picking and automatic lineups prefer proven PBs over hidden ability',()=>{
  const s=booked(),[a,b]=s.roster;
  a.stats=[1,1,1,1];a.pb.shot=16;
  b.stats=[100,100,100,100];b.pb.shot=10;
  assert(G.autoLineup(s));
  assert.equal(s.entries.shot[0],a.id);
  const picker=P.entryPicker(s,'shot',0);
  assert(picker.indexOf(`data-pick="${a.id}"`)<picker.indexOf(`data-pick="${b.id}"`));
  assert.match(picker,/PB 16\.00 m/);
  assert.match(picker,/PB \?\?\?/);
  assert.doesNotMatch(picker,/Forecasts|projected/);
});

test('unmarked entrants retain unknown marks as their attributes improve',()=>{
  const s=booked(),a=s.roster[0];
  a.stats=[100,100,100,100];
  assert.match(P.lobby(s),/Unproven/);
  assert.match(P.squad(s,{athlete:a.id,tab:'stats'}),/Personal best <b>\?\?\?<\/b>/);
  assert.doesNotMatch(P.lobby(s),/\bNaN\b|~[\d.]+ m/);
  assert(G.startMatch(s));s.match.phase='decide';
  const decision=P.decide(s,{});
  assert.doesNotMatch(decision,/projected|[\d.]+ m – [\d.]+ m/);
  assert.match(decision,/foul risk/);
});

test('opening rounds follow PB seeds across clubs and keep their order through reload',()=>{
  let s=booked(71);
  const rival=G.opponent(s);
  for(const [i,a] of [...s.roster,...rival.athletes].entries()) for(const ev of EVENT_IDS) a.pb[ev]=8+i;
  assert(G.startMatch(s));
  const order=s.match.fields[0].startOrder;
  const pb=e=>G.personalBest((e.side==='home'?s.roster:rival.athletes).find(a=>a.id===e.id),'shot');
  assert.deepEqual(order.map(pb),order.map(pb).sort((a,b)=>a-b));
  const expected=order.map(e=>`${e.side}:${e.id}`),seen=[];
  for(let guard=0;seen.length<expected.length && guard<100;guard++) {
    const beat=G.advanceMatch(s);
    if(beat?.type==='throw') seen.push(`${beat.side}:${beat.athleteId}`);
    if(seen.length===1 && beat?.type==='throw') s=reload(s);
  }
  assert.deepEqual(seen,expected);
});

test('rival PBs come from actual meet attempts and survive a later booking',()=>{
  const s=booked(72);assert(G.startMatch(s));assert(G.simulateMatch(s));
  const rivals=G.matchClub(s).athletes;
  for(const [i,ev] of EVENT_IDS.entries()) for(const entry of s.match.fields[i].away) {
    const best=G.best(entry.marks),a=rivals.find(a=>a.id===entry.id);
    if(best!=null) assert.equal(a.pb[ev],best);
  }
  const records=rivals.map(a=>structuredClone(a.pb));
  assert(G.leaveMatch(s));
  assert(G.enterCompetition(s,{kind:'duel',tier:0}));
  assert.deepEqual(G.opponent(s).athletes.map(a=>a.pb),records);
});

test('background league results record real qualifying marks as rival PBs',()=>{
  const s=G.newGame(73);assert(G.enterCompetition(s,{kind:'league',tier:0}));
  const club=G.championshipClubs(s)[0],entries=G.rivalEntries(s,club);
  G.simulateQualifiers(s,club,entries);
  for(const ev of EVENT_IDS) for(const id of entries[ev]) {
    const a=club.athletes.find(a=>a.id===id);
    assert.equal(G.personalBest(a,ev),G.qualifyingMark(s,id,ev));
  }
});

test('championship selections use lifetime PB seeds after earned league eligibility',()=>{
  const s=G.newGame(75);assert(G.enterCompetition(s,{kind:'league',tier:0}));
  const [a,b]=s.roster,standard=G.qualifyingStandard(s,'shot');
  G.recordQualifier(s,a.id,'shot',[standard+2]);
  G.recordQualifier(s,b.id,'shot',[standard+1]);
  a.pb.shot=standard+2;b.pb.shot=standard+5;
  assert(G.seedChampionshipLineup(s));
  assert.equal(s.entries.shot[0],b.id);
  assert(!G.championshipQualified(s,s.roster[2].id,'shot'));
});

test('tampered opening seeds cannot omit or duplicate an entrant',()=>{
  const s=booked(74);assert(G.startMatch(s));
  const broken=structuredClone(s);broken.match.fields[0].startOrder.pop();
  assert.throws(()=>validateCampaign(broken));
  const duplicate=structuredClone(s);duplicate.match.fields[0].startOrder[1]=duplicate.match.fields[0].startOrder[0];
  assert.throws(()=>validateCampaign(duplicate));
});
