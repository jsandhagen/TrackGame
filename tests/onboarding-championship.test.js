import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import { EVENT_IDS } from '../src/game-content.js';

function established(seed) {
  const s = G.newGame(seed);
  delete s.onboarding;
  return s;
}
function play(s) {
  while (s.day < s.matchDay) {
    if (s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));
    else assert(G.advanceDay(s).ok);
  }
  if (s.pendingEvent) G.resolveEvent(s,G.eventView(s).choices.findIndex(c=>c.ok));
  assert(G.startMatch(s));
  assert(G.simulateMatch(s));
}
function final(seed = 17, stage = 0) {
  const s = established(seed);
  s.circuit.cleared = ['0:0','0:1'];
  assert(G.enterCompetition(s,{kind:'league',tier:0,stage}));
  // Qualified meet fixture: every squad earns standards in sanctioned series.
  for(const a of [...s.roster,...G.championshipClubs(s).flatMap(c=>c.athletes)]) for(const ev of EVENT_IDS) G.recordQualifier(s,a.id,ev,[G.qualifyingStandard(s,ev)+a.id/1000+1]);
  s.fixture = 3;
  s.day = s.matchDay;
  return s;
}

test('new clubs see only the first duel and cannot spend on later systems', () => {
  const s = G.newGame(17), a = s.roster[0];
  assert.equal(G.nextIntroduction(s).id,'plans');
  assert.equal(s.prospects.length,0);
  assert(!G.enterCompetition(s,{kind:'league',tier:0}));
  assert(!G.enterCompetition(s,{kind:'duel',tier:0,rival:1}));
  // Make every purchase/promotion affordable so only the introduction gates block them.
  s.money=100000; a.sp=100; a.level=50;
  const before = structuredClone(s);
  assert(!G.build(s,8,'cafe'));
  assert(!G.upgrade(s,10));
  assert(!G.buyItem(s,'shake'));
  assert(!G.useItem(s,'shake',a.id));
  assert(!G.learnSkill(s,a.id,'gymrat'));
  assert(!G.promote(s,a.id));
  assert(!G.scout(s,true));
  assert(!G.assignDuty(s,'plot:10',a.id));
  assert(!G.coachSession(s,a.id,'visualise'));
  assert.equal(G.chemistryOf(s,s.roster.map(a=>a.id)),null);
  assert(!G.setTrainingPlan(s,a.id,'power'));
  assert.deepEqual(s,before);
  assert.match(P.league(s,{}),/Book your first duel/);
  assert.doesNotMatch(P.league(s,{}),/Schedule options|competition-grid|Challenger/);
  const athlete = P.squad(s,{athlete:a.id,tab:'skills'});
  assert.doesNotMatch(athlete,/data-tab="skills"|data-tab="gear"|Manage skills|Rank up!/);
});

test('waiting or cancelling cannot extend first-duel preparation or farm Insights', () => {
  const s = G.newGame(23), insights = s.coaching.insights;
  for (let i=0;i<3;i++) assert(G.advanceDay(s).ok);
  const ready = structuredClone(s);
  assert.equal(G.advanceDay(s).ok,false);
  assert.deepEqual(s,ready);
  assert.equal(s.coaching.insights,insights);
  assert.equal(G.invitationDay(s),null);
  assert.equal(G.rollStoryEvent(s),null);
  assert(G.enterCompetition(s,{kind:'duel',tier:0,rival:0,preparation:10}));
  assert.equal(s.matchDay,4);
  assert(G.startMatch(s));
  for(let guard=0;s.match.phase!=='complete' && guard<600;guard++) {
    G.advanceMatch(s);
    assert.notEqual(s.match.phase,'decide','the first watch-mode meet runs without coaching interruptions');
  }
  assert.equal(s.match.phase,'complete');
  const early = G.newGame(24);
  assert(G.enterCompetition(early,{kind:'duel',tier:0,rival:0}));
  assert(G.cancelCompetition(early));
  G.advanceDay(early);
  assert(G.enterCompetition(early,{kind:'duel',tier:0,rival:0,preparation:10}));
  assert.equal(early.matchDay,4);
});

test('each completed meet introduces one system, losses count and settlement cannot repeat it', () => {
  let s = G.newGame(33);
  // Losing is a supported learning path.
  s.roster.forEach(a => { a.stats=[1,1,1,1]; a.skills=[]; a.equipped=[]; });
  for (let n=0;n<G.INTRODUCTIONS.length;n++) {
    assert(G.enterCompetition(s,{kind:'duel',tier:0,rival:0,preparation:3}));
    play(s);
    assert.equal(s.match.rewards.introduction,G.INTRODUCTIONS[n].id);
    assert.equal(s.onboarding.meets,n+1);
    assert.equal(G.systemUnlocked(s,G.INTRODUCTIONS[n].id),true);
    if(n+1<G.INTRODUCTIONS.length) assert.equal(G.systemUnlocked(s,G.INTRODUCTIONS[n+1].id),false);
    if(n===0) assert(G.meetOutcome(s.match)<0);
    G.settleMatch(s);
    assert.equal(s.onboarding.meets,n+1);
    s=validateCampaign(exportCampaign(s));
    assert(G.leaveMatch(s));
    if(n===0) {
      assert.match(P.train(s,{}),/Individual daily plans/);
      assert.doesNotMatch(P.train(s,{}),/data-tab="sessions"|data-tab="chemistry"|data-tab="bag"|Insights/);
    }
  }
  assert.equal(G.nextIntroduction(s),null);
  assert(G.scout(s,true));
  assert.equal(s.prospects.length,3);
});

test('established saves keep their systems and old booked finals keep their format', () => {
  const old = established(42);
  assert(G.enterCompetition(old,{kind:'league',tier:0}));
  delete old.competition.format;
  old.fixture=3; old.finalOpponent=0; old.day=old.matchDay;
  const copy=validateCampaign(exportCampaign(old));
  assert(G.systemUnlocked(copy,'office'));
  assert(G.startMatch(copy));
  assert(!copy.match.leagueChampionship);
  assert.equal(copy.match.attempts,3);
});

test('a club missing every championship standard ends its season and can rebuild', () => {
  const s=established(51);
  s.roster.forEach(a=>{a.stats=[1,1,1,1];a.skills=[];a.equipped=[];});
  assert(G.enterCompetition(s,{kind:'league',tier:0,preparation:3,spacing:4}));
  assert.equal(G.upcomingMeets(s).at(-1).label,'League championship · 3 + 3 throws');
  for(let i=0;i<3;i++) {
    play(s);
    assert.equal(s.match.kind,'league');
    assert.equal(s.match.attempts,3);
    assert.equal(s.match.leagueChampionship,undefined);
    assert(G.leaveMatch(s));
  }
  assert.equal(G.table(s).at(-1).id,'us');
  assert.equal(s.phase,'seasonEnd');
  assert.equal(s.champion,false);
  assert.match(s.log.map(l=>l.text).join(' '),/No championship entry standard/);
  assert(G.nextSeason(s));
  assert.equal(s.phase,'planning');
});

test('every stage has a multi-club 3 + 3 championship, carries marks forward and resumes after reload', () => {
  for(const stage of [0,1,2]) {
    let s=final(60+stage,stage);
    const selected=G.championshipEntries(s);
    assert(G.startMatch(s));
    for(const [i,ev] of EVENT_IDS.entries()) {
      assert.equal(s.match.fields[i].away.length,12);
      assert.deepEqual(s.match.fields[i].away.map(e=>e.id),selected[ev].map(e=>e.athlete.id));
      assert.equal(new Set(s.match.fields[i].away.map(e=>e.clubId)).size,6);
    }
    // Save while the sixth rival is up, beyond the old two-club entry indices.
    s.settings.clutch=false;
    for(let guard=0;s.match.entryIndex<5 && guard<100;guard++) G.advanceMatch(s);
    assert.equal(s.match.entryIndex,5);
    const copy=validateCampaign(exportCampaign(s));
    assert(G.simulateMatch(s));
    assert(G.simulateMatch(copy));
    assert.deepEqual(copy.match,s.match);
    for(const f of s.match.fields) {
      const all=[...f.home,...f.away];
      assert.equal(all.filter(e=>e.finalist).length,6);
      for(const entry of all) assert.equal(entry.marks.length,entry.finalist?6:3);
    }
    assert.equal(s.match.teamScores.length,7);
    assert.equal(s.match.against,Math.max(...s.match.teamScores.filter(c=>c.id!=='us').map(c=>c.points)));
    const report=P.meetComplete(s);
    assert.match(report,/League championship standings/);
    assert.doesNotMatch(report,/Unknown athlete/);
    validateCampaign(exportCampaign(s));
  }
});

test('championship points belong to individual clubs rather than a combined opposition', () => {
  const s=final(72);
  G.startMatch(s);
  for(const [i,f] of s.match.fields.entries()) {
    f.home.forEach((e,n)=>{e.marks=Array(6).fill(n===0?20:null);});
    f.away=f.away.filter((e,n,all)=>all.findIndex(r=>r.clubId===e.clubId)===n);
    f.away.forEach((e,n)=>{e.marks=Array(6).fill(n===i?21:2+n/10);});
  }
  s.match.closed=[true,true,true,true];
  G.settleMatch(s);
  assert.equal(s.match.score,32);
  assert(s.match.against<32);
  assert.equal(G.meetOutcome(s.match),1);
  assert.equal(s.match.teamScores.reduce((n,c)=>n+c.points,0),152);
  assert(G.leaveMatch(s));
  assert(s.champion);
});

test('championship fields reject missing clubs, wrong affiliations and invalid onboarding', () => {
  const s=final(81);G.startMatch(s);
  for(const mutate of [
    s=>s.match.clubs.pop(),
    s=>s.match.attempts=6,
    s=>s.match.fields[0].away[0].clubId=99,
    s=>s.match.fields[0].away[0].id=s.match.fields[0].away[1].id,
    s=>s.onboarding={meets:-1},
    s=>s.match.fields[0].finalOrder=[{side:"away",id:999999}],
    s=>s.match.leagueChampionship='yes',
  ]) {const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateCampaign(bad));}
});
