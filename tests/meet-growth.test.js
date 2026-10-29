import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from './helpers/developed-club.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';

function meet(seed=23) {
 const s=G.newGame(seed);
 G.enterCompetition(s,{kind:'duel',tier:0});s.day=s.matchDay;
 return s;
}

test('meet progress records exact XP, levels, skill points and capped stats once per entrant',()=>{
 const s=meet(),a=s.roster[0],bench=s.roster[1];
 s.entries={shot:[a.id],discus:[a.id],hammer:[s.roster[2].id],jav:[s.roster[3].id]};
 s.lineup=Object.fromEntries(Object.entries(s.entries).map(([ev,ids])=>[ev,ids[0]||null]));
 a.xp=G.xpNeeded(a.level)-2;a.meets=2;a.stats=a.stats.map(()=>G.capOf(a)-0.1);
 const before=structuredClone(a), xp=21*G.xpMultiplier(s,a);
 assert(G.startMatch(s));assert(G.simulateMatch(s));
 const rows=s.match.rewards.athleteProgress,row=rows.find(p=>p.id===a.id);
 assert.equal(rows.length,3);assert(!rows.some(p=>p.id===bench.id));
 assert.equal(rows.filter(p=>p.id===a.id).length,1);
 assert.equal(row.before.level,before.level);assert.equal(row.after.level,a.level);
 assert.equal(row.after.level,before.level+1);assert(Math.abs(row.xpGained-xp)<1e-8);
 assert.equal(row.after.sp-row.before.sp,2); // One level + third-meet milestone.
 assert.deepEqual(row.before.stats,before.stats);assert.deepEqual(row.after.stats,a.stats);
 assert(row.after.stats.every((v,i)=>v-row.before.stats[i]<0.101));
 assert.equal(s.match.rewards.mastery.filter(p=>p.id===a.id).length,2);
 const saved=validateCampaign(exportCampaign(s));assert.deepEqual(saved.match.rewards.athleteProgress,rows);
 const snapshot=structuredClone(s);G.settleMatch(s);assert.deepEqual(s,snapshot);
 const html=P.meetComplete(s,{resultView:'progress'});
 assert.match(html,/LEVEL UP!/);assert.match(html,/skill points/);assert.match(html,/Part of the club/);
 assert(html.includes('Lv. '+before.level+' →'));assert.match(html,/XP to next level/);
});

test('athletes without a level-up still receive visible XP and mastery progress',()=>{
 const s=meet(24);s.roster.forEach(a=>a.xp=0);
 assert(G.startMatch(s));assert(G.simulateMatch(s));
 const r=s.match.rewards;assert(r.athleteProgress.every(p=>p.after.level===p.before.level));
 const html=P.meetComplete(s,{resultView:'progress'});
 for(const p of r.athleteProgress) {assert(html.includes(p.name));assert(p.xpGained>0);}
 assert.match(html,/Building toward the next level/);assert(!html.includes('LEVEL UP!'));
 assert.match(html,/mastery/);assert(!html.includes('NaN'));assert(!html.includes('undefined'));
});

test('older completed meets show their recorded gains without inventing XP or previous levels',()=>{
 const s=meet(25);G.startMatch(s);G.simulateMatch(s);delete s.match.rewards.athleteProgress;
 const html=P.meetComplete(validateCampaign(exportCampaign(s)),{resultView:'progress'});
 assert.match(html,/older meet has no XP/);assert.match(html,/mastery/);
 assert(!html.includes('XP to next level'));assert(!html.includes('NaN'));
});
