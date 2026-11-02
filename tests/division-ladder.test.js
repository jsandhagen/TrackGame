import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import { EVENT_IDS, EVENTS } from '../src/game-content.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

const eligible=index=>{
  const s=G.newGame(123);s.money=100000;s.league=Math.floor(index/3);
  s.circuit.cleared=G.DIVISIONS.slice(0,index).map(d=>d.key);
  return s;
};

test('one ordered division ladder owns independent event bands and standards',()=>{
  assert.equal(G.DIVISIONS.length,15);
  assert.equal(new Set(G.DIVISIONS.map(d=>d.name)).size,15);
  for(const d of G.DIVISIONS) {
    assert.equal(G.divisionOf(d.tier,d.stage),d);
    assert.equal(d.key,G.circuitKey(d.tier,d.stage));
    if(d.index)assert(d.titlePrize>G.DIVISIONS[d.index-1].titlePrize,'promotion never lowers the title bonus');
    for(const ev of EVENT_IDS) {
      const [low,high]=d.marks[ev];
      assert(low<high && high<EVENTS[ev].record,'bands rise to world class without promising routine records');
      assert(d.standards[ev]>EVENTS[ev].min && d.standards[ev]<(low+high)/2,'standards require a real mark below the typical median');
      if(d.index) {
        assert(low>G.DIVISIONS[d.index-1].marks[ev][0]);
        assert(d.standards[ev]>G.DIVISIONS[d.index-1].standards[ev]);
      }
    }
  }
});

test('every division books directly with its own name, strength and qualifying standards',()=>{
  for(const d of G.DIVISIONS) {
    const s=eligible(d.index),roster=structuredClone(s.roster);
    assert.equal(G.unlockedDivision(s).index,d.index);
    assert(G.enterCompetition(s,{kind:'league',division:d.index}));
    assert.equal(G.competitionName(s),d.name);
    assert.equal(s.clubTier,d.tier);assert.equal(s.clubStage,d.stage);
    assert.deepEqual(s.roster,roster,'booking never retunes the player’s athletes');
    for(const ev of EVENT_IDS) assert.equal(G.qualifyingStandard(s,ev),d.standards[ev]);
    const copy=validateCampaign(exportCampaign(s));
    assert.deepEqual(copy.competition.standards,d.standards);
    assert.equal(G.competitionName(copy),d.name);
  }
});

test('championship titles advance one rung, and later divisions and duels stay locked',()=>{
  for(const d of G.DIVISIONS.slice(0,-1)) {
    const s=eligible(d.index);
    assert(!G.enterCompetition(s,{kind:'league',division:d.index+1}));
    assert(!G.enterCompetition(s,{kind:'duel',division:d.index+1}));
    assert(G.enterCompetition(s,{kind:'league',division:d.index}));
    s.circuit.cleared.push(d.key);s.champion=true;s.phase='seasonEnd';s.lastTitleGift='scroll';
    s.trophies.push({league:d.tier,stage:d.stage,season:s.season});
    assert(G.nextSeason(s));
    assert.equal(G.unlockedDivision(s).index,d.index+1);
    assert(s.log.some(l=>l.text.includes(G.DIVISIONS[d.index+1].name)));
    assert(G.enterCompetition(s,{kind:'league',division:d.index+1}));
  }
});

test('rival forecasts follow the booked event bands across seeds and every division',()=>{
  let inside=0,total=0;
  const previous={};
  for(const d of G.DIVISIONS) {
    const marks=Object.fromEntries(EVENT_IDS.map(ev=>[ev,[]]));
    for(const seed of [1,11,87]) {
      const s=G.newGame(seed),clubs=G.makeClubs(s,d.tier,d.stage,[0,1,2,3,4,5]);
      for(const a of clubs.flatMap(c=>c.athletes)) {
        const mark=G.forecast(s,a,a.event,{club:false}),[low,high]=d.marks[a.event];
        total++;if(mark>=low-0.05 && mark<=high+0.05)inside++;
        assert(mark<EVENTS[a.event].record);
        marks[a.event].push(mark);
      }
    }
    for(const ev of EVENT_IDS) {
      const sorted=marks[ev].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
      if(d.index)assert(median>previous[ev],`${d.name}/${ev} is a higher distance challenge`);
      previous[ev]=median;
    }
  }
  assert(inside/total>=0.98,`${inside}/${total} forecasts fit the advertised bands`);
});

test('replaying an earlier division keeps club identities and uses that division’s distances',()=>{
  const s=eligible(0);
  assert(G.enterCompetition(s,{kind:'league',division:0}));
  const before=s.rivalClubs[0].map(c=>[c.id,c.athletes.map(a=>[a.id,a.name])]);
  assert(G.cancelCompetition(s));s.circuit.cleared.push('0:0');
  assert(G.enterCompetition(s,{kind:'league',division:1}));assert(G.cancelCompetition(s));
  assert(G.enterCompetition(s,{kind:'league',division:0}));
  assert.deepEqual(s.rivalClubs[0].map(c=>[c.id,c.athletes.map(a=>[a.id,a.name])]),before);
  for(const a of s.rivalClubs[0].flatMap(c=>c.athletes)) {
    const mark=G.forecast(s,a,a.event,{club:false}),[low,high]=G.DIVISIONS[0].marks[a.event];
    assert(mark>=low && mark<=high);
  }
});

test('legacy titles and an active booking retain progress, earned qualification and player data',()=>{
  const s=eligible(8);assert(G.enterCompetition(s,{kind:'league',tier:2,stage:2}));
  delete s.competition.standards;
  s.trophies=G.DIVISIONS.slice(0,8).map((d,i)=>({league:d.tier,stage:d.stage,season:i+1}));
  const a=s.roster[0],standard=G.qualifyingStandard(s,'shot');
  G.recordQualifier(s,a.id,'shot',[standard+0.1]);
  const roster=structuredClone(s.roster),copy=validateCampaign(exportCampaign(s));
  assert.equal(G.unlockedDivision(copy).index,8);
  assert.equal(G.competitionName(copy),'National Division 2');
  assert.equal(G.qualifyingStandard(copy,'shot'),standard);
  assert(G.championshipQualified(copy,a.id,'shot'));
  assert.deepEqual(copy.roster,roster);assert.deepEqual(copy.trophies,s.trophies);
  const html=P.league(copy,{tabs:{league:'records'}});
  assert(html.includes('Community Division') && html.includes('National Division 3'));
  assert(!html.includes('Challenger'));
});

test('a booked division freezes its standards while future tuning can change independently',()=>{
  const s=eligible(0),d=G.DIVISIONS[0],old=d.standards.shot;
  assert(G.enterCompetition(s,{kind:'league',division:0}));
  try {
    d.standards.shot+=0.1;
    assert.equal(G.qualifyingStandard(s,'shot'),old);
    const fresh=eligible(0);assert(G.enterCompetition(fresh,{kind:'league',division:0}));
    assert.equal(G.qualifyingStandard(fresh,'shot'),old+0.1);
    assert.equal(validateCampaign(exportCampaign(s)).competition.standards.shot,old);
  } finally {d.standards.shot=old;}
  for(const invalid of [-1,'9',NaN,201]) {
    const bad=structuredClone(s);bad.competition.standards.shot=invalid;
    assert.throws(()=>validateCampaign(bad));
  }
});

test('changing one event band tunes that event without consuming randomness or changing other bands',()=>{
  const s=eligible(3),d=G.DIVISIONS[3],club=G.makeClubs(s,d.tier,d.stage)[0],a=club.athletes.find(a=>a.event==='shot'),
    old=d.marks.shot,before=G.forecast(s,a,'shot',{club:false}),rng=s.rng,
    others=structuredClone(club.athletes.filter(a=>a.event!=='shot'));
  try {
    d.marks.shot=old.map(n=>n+0.5);
    G.tuneDivisionRival(s,a,d.tier,d.stage);
    assert(Math.abs(G.forecast(s,a,'shot',{club:false})-before-0.5)<0.001);
    assert.equal(s.rng,rng);
    assert.deepEqual(club.athletes.filter(a=>a.event!=='shot'),others);
  } finally {d.marks.shot=old;}
});

test('the meet board shows one ladder, event distance ranges and direct division bookings',()=>{
  const s=eligible(1),html=P.league(s,{});
  assert.equal((html.match(/class="card division-card /g)||[]).length,15);
  assert.match(html,/Typical rival marks/);assert.match(html,/Qualify/);
  for(const d of G.DIVISIONS)assert(html.includes(d.name));
  assert.match(html,/data-act="book-league" data-division="1"/);
  assert.doesNotMatch(html,/Challenger|\/ 3 trophies|class="card circuit-tier"/);
});
