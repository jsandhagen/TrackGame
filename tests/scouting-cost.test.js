import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import {validateCampaign,exportCampaign} from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';

const reload=s=>validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));

test('paid searches escalate within the calendar week and book the actual fee',()=>{
  const s=G.newGame(45);s.money=10000;
  const base=G.scoutCost(s);
  for(let n=1;n<=4;n++) {
    const before=s.money;
    assert.equal(G.scoutCost(s),base*n);
    assert(G.scout(s));
    assert.equal(before-s.money,base*n);
  }
  assert.equal(s.ledger.days.at(-1).money.Scouting,-base*10);
  assert.equal(G.weeklySearches(s),4);
  assert.equal(G.scoutCost(reload(s)),base*5);
});

test('Sunday retains the surcharge; Monday resets it without deleting candidates',()=>{
  const s=G.newGame(46),base=G.scoutCost(s);
  assert(G.scout(s));s.day=7;
  assert.equal(G.scoutCost(s),base*2);
  const candidates=structuredClone(s.prospects);
  s.day=8;
  assert.equal(G.scoutCost(s),base);
  assert.equal(G.weeklySearches(s),0);
  assert.deepEqual(s.prospects,candidates);
  assert(G.scout(s));
  assert.equal(G.scoutCost(reload(s)),base*2);
});

test('free reports neither charge money nor consume a paid search, even in debt',()=>{
  const s=G.newGame(47);assert(G.scout(s));
  s.money=-10;
  const price=G.scoutCost(s),searches=G.weeklySearches(s);
  assert(G.scout(s,true));
  assert.equal(s.money,-10);
  assert.equal(G.weeklySearches(s),searches);
  assert.equal(G.scoutCost(s),price);
});

test('an unaffordable search changes neither the price, candidates nor RNG',()=>{
  const s=G.newGame(48);assert(G.scout(s));s.money=G.scoutCost(s)-1;
  const before=structuredClone(s);
  assert(!G.scout(s));
  assert.deepEqual(s,before);
  assert.match(P.recruit(s),/Need \$1 more/);
});

test('Scout Office discounts apply to each step of the weekly price',()=>{
  const s=G.newGame(49);
  s.plots[0]={type:'scout',level:3};s.money=10000;
  assert.equal(G.scoutCost(s),33);
  assert(G.scout(s));
  assert.equal(G.scoutCost(s),66);
  assert.match(P.recruit(s),/next search 2×/);
  assert.match(P.recruit(s),/Resets Mon 8 Mar/);
});

test('older saves start with a base search fee and invalid search counters are rejected',()=>{
  const s=G.newGame(50);delete s.scouting;
  assert.equal(G.weeklySearches(reload(s)),0);
  for(const value of [{week:0,searches:-1},{week:1,searches:0},{week:0,searches:1.5}]) {
    const broken=structuredClone(s);broken.scouting=value;
    assert.throws(()=>validateCampaign(broken));
  }
});
