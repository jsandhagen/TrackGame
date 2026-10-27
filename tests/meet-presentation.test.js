import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import * as P from '../src/ui/pages.js';
import {validateCampaign, exportCampaign} from '../src/domain/campaign-save.js';

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
