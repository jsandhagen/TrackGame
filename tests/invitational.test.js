import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/domain/game.js';
import { validateCampaign, exportCampaign } from '../src/domain/campaign-save.js';
import * as P from '../src/ui/pages.js';
import { ITEMS } from '../src/game-content.js';

const reload = (s) => validateCampaign(JSON.parse(JSON.stringify(exportCampaign(s))));
function dayUntil(s, done, limit = 120) {
  for (let i = 0; i < limit && !done(); i++) {
    if (s.pendingEvent) G.resolveEvent(s, G.eventView(s).choices.findIndex((c) => c.ok));
    else assert(G.advanceDay(s).ok);
  }
  assert(done());
}

test('an invitation arrives, is accepted, played against the All-Star Select and pays its prize', () => {
  let s = G.newGame(501);
  assert.equal(G.invitation(s), null);
  dayUntil(s, () => G.invitation(s));
  const offer = G.invitation(s);
  assert(offer.day > s.day && offer.day - s.day <= 16);
  assert(G.INVITE_PRIZES[offer.tier].includes(offer.prize));
  assert(ITEMS[offer.prize] && ITEMS[offer.prize].price == null);
  assert.match(P.league(s, {}), /Accept invitation/);
  assert.match(P.calendar(s), new RegExp(offer.name));

  assert(G.acceptInvitation(s));
  assert.equal(s.competition.kind, 'cup');
  assert.equal(s.matchDay, offer.day);
  assert.equal(G.opponent(s).name, 'All-Star Select');
  assert.equal(G.opponent(s).athletes.length >= 4, true);
  assert(!G.acceptInvitation(s));
  assert(!G.enterCompetition(s, { kind: 'duel', tier: 0 }));
  s = reload(s);
  assert.equal(G.opponent(s).id, G.ALL_STAR_ID);
  assert.equal(G.meetVenue(s).name, offer.venue);

  dayUntil(s, () => s.day >= s.matchDay);
  G.opponent(s).athletes.forEach((a) => { a.stats = [1, 1, 1, 1]; a.skills = []; a.equipped = []; });
  const before = s.bag[offer.prize] || 0;
  assert(G.startMatch(s));
  assert.equal(s.match.kind, 'cup');
  assert(s.match.championship);
  s = reload(s);
  assert(G.simulateMatch(s));
  assert(G.meetOutcome(s.match) > 0);
  assert.equal(s.bag[offer.prize], before + 1);
  assert.equal(s.match.rewards.invitational.won, true);
  assert.match(P.league(s, {}), new RegExp(offer.name));
  assert(G.leaveMatch(s));
  assert.equal(s.phase, 'planning');
  assert.equal(G.invitation(s), null);
  assert.equal(s.invitations.won.length, 1);
  assert(s.invitations.next > s.day + 20);
  assert.equal(reload(s).invitations.won.length, 1);
});

test('a missed invitation lapses, and a busy calendar cannot accept one', () => {
  const s = G.newGame(502);
  dayUntil(s, () => G.invitation(s));
  const offer = G.invitation(s);
  assert(G.enterCompetition(s, { kind: 'duel', tier: 0, rival: 1, preparation: 3 }));
  assert.equal(G.invitationProblem(s), 'Finish your current competition first.');
  assert(G.cancelCompetition(s));
  assert(G.acceptInvitation(s));
  assert(G.cancelCompetition(s));
  assert.equal(G.invitation(s).id, offer.id);
  dayUntil(s, () => s.day > offer.day);
  assert.equal(G.invitation(s), null);
  assert(s.log.some((l) => /went ahead without us/.test(l.text)));
});
