import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';

function squad() {
  const s=G.newGame(52);
  const a=G.createAthlete(s,'shot');s.roster.push(a);
  a.stamina=40;a.pb.shot=16;
  s.roster[0].pb.shot=12;s.roster[1].injury=3;
  s.roster[2].condition=20;
  return s;
}

test('squad filters compose specialty, role and readiness without mutating the roster',()=>{
  const s=squad(),before=structuredClone(s.roster);
  const rows=P.squadAthletes(s,{squadEvent:'shot',squadRole:'bench',squadStatus:'tired'});
  assert.deepEqual(rows.map(a=>a.id),[s.roster.at(-1).id]);
  assert.deepEqual(s.roster,before);
  assert(P.squadAthletes(s,{squadStatus:'ready'}).every(a=>!a.injury && a.stamina>=60 && a.condition>=35));
  assert.deepEqual(P.squadAthletes(s,{squadStatus:'injured'}).map(a=>a.id),[s.roster[1].id]);
  assert(P.squadAthletes(s,{squadStatus:'tired'}).includes(s.roster[2]));
});

test('PB sorting ignores ability and puts an unmarked specialist after recorded marks',()=>{
  const s=squad(),a=G.createAthlete(s,'shot',{base:90});s.roster.push(a);
  const rows=P.squadAthletes(s,{squadEvent:'shot',squadSort:'pb'});
  assert.deepEqual(rows.map(a=>a.pb.shot||0),[16,12,0]);
});

test('upgrade filter includes actionable skills and promotions, not unusable skill points',()=>{
  const s=squad();
  for(const a of s.roster) {a.sp=0;a.level=1;}
  assert.equal(P.squadAthletes(s,{squadStatus:'upgrades'}).length,0);
  s.roster[0].sp=10;
  assert.deepEqual(P.squadAthletes(s,{squadStatus:'upgrades'}).map(a=>a.id),[s.roster[0].id]);
});

test('comparison survives filtering and shows PBs and unknown marks without projections',()=>{
  const s=squad(),[a,b]=s.roster;
  const view={squadCompare:[a.id,b.id],squadCompareOpen:true,squadCompareEvent:'shot',squadRole:'bench'};
  const html=P.squad(s,view);
  assert.match(html,/aria-label="Athlete comparison"/);
  assert.match(html,/12\.00 m/);
  assert.match(html,/\?\?\?/);
  assert(html.includes(a.name) && html.includes(b.name));
  assert.doesNotMatch(html,/Projected|projected|forecast/);
  const empty=P.squad(s,{squadEvent:'jav',squadRole:'bench'});
  assert.match(empty,/No athletes match/);
  assert.match(empty,/Show the whole squad/);
});
